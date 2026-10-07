import { spawn, type ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import type { Application } from '@shared/types'
import type { PlatformOSAdapter } from './types'

interface RawFrontmostApp {
  processId: number
  name: string
  executable: string
  bundleId: string | null
  bundlePath: string | null
}

const POLL_INTERVAL_S = 0.4
/** The helper exits after this many polls (~1 hour) and is started again,
 *  so a long-running script can't slowly accumulate memory. */
const POLLS_PER_HELPER = 9000
const RESTART_DELAY_MS = 1000

/**
 * The macOS counterpart of windowsAdapter.ts: one long-lived helper that
 * prints a JSON line whenever the frontmost application changes. Here the
 * helper is a JavaScript for Automation script (built into macOS, no
 * install), reading NSWorkspace.frontmostApplication. That needs no
 * permission at all, so app detection works even before the user grants
 * Accessibility.
 *
 * The run loop is spun between polls (rather than `delay`) because
 * NSWorkspace only updates frontmostApplication while its notifications get
 * delivered. The script exits on its own once Noma's process is gone, and
 * after POLLS_PER_HELPER polls, in which case this class starts a new one.
 *
 * Noma's own process is excluded, for the same reason as on Windows: using
 * Noma's window must never make Noma the "active application".
 *
 * There are no window handles on macOS. The "handle" this adapter reports
 * (getLastKnownWindowHandle) is the target app's pid, and every action that
 * takes a handle (windowFocus.ts, windowClose.ts, click.ts) treats it that
 * way on macOS.
 */
const WATCH_SCRIPT = `
ObjC.import('AppKit');
function out(text) {
  $.NSFileHandle.fileHandleWithStandardOutput.writeData($(text + '\\n').dataUsingEncoding($.NSUTF8StringEncoding));
}
function str(value) {
  if (!value || value.isNil()) return null;
  return ObjC.unwrap(value);
}
function run(argv) {
  var self = parseInt(argv[0], 10);
  var interval = parseFloat(argv[1]);
  var polls = parseInt(argv[2], 10);
  var workspace = $.NSWorkspace.sharedWorkspace;
  var last = -1;
  var sawSelf = false;
  for (var i = 0; i < polls; i++) {
    var me = $.NSRunningApplication.runningApplicationWithProcessIdentifier(self);
    var alive = !me.isNil() && !me.isTerminated;
    if (alive) sawSelf = true;
    else if (sawSelf) return;
    var app = workspace.frontmostApplication;
    if (!app.isNil()) {
      var pid = app.processIdentifier;
      if (pid !== self && pid !== last) {
        var exe = app.executableURL.isNil() ? '' : str(app.executableURL.lastPathComponent);
        out(JSON.stringify({
          processId: pid,
          name: str(app.localizedName) || exe,
          executable: exe || '',
          bundleId: str(app.bundleIdentifier),
          bundlePath: app.bundleURL.isNil() ? null : str(app.bundleURL.path)
        }));
        last = pid;
      }
    }
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(interval));
  }
}
`

/**
 * macOS apps mapped onto the ids Noma already uses on Windows (the
 * lowercased .exe name), so seeded profiles, app categories (appKnowledge.ts)
 * and learned workflows mean the same thing on both. Anything not listed
 * uses its lowercased executable name.
 */
const BUNDLE_ID_TO_APP_ID: Record<string, string> = {
  'com.google.chrome': 'chrome',
  'com.microsoft.edgemac': 'msedge',
  'org.mozilla.firefox': 'firefox',
  'com.brave.browser': 'brave',
  'company.thebrowser.browser': 'arc',
  'com.vivaldi.vivaldi': 'vivaldi',
  'com.apple.safari': 'safari',
  'com.microsoft.vscode': 'code',
  'com.microsoft.vscodeinsiders': 'code - insiders',
  'com.todesktop.230313mzl4w4u92': 'cursor',
  'com.exafunction.windsurf': 'windsurf',
  'dev.zed.zed': 'zed',
  'com.sublimetext.4': 'sublime_text',
  'com.apple.terminal': 'terminal',
  'com.googlecode.iterm2': 'iterm2',
  'dev.warp.warp-stable': 'warp',
  'com.mitchellh.ghostty': 'ghostty',
  'com.apple.finder': 'finder',
  'com.github.githubclient': 'githubdesktop',
  'com.axosoft.gitkraken': 'gitkraken',
  'com.torusknot.sourcetreenotmas': 'sourcetree',
  'com.anthropic.claudefordesktop': 'claude',
  'com.openai.chat': 'chatgpt',
  'com.tinyspeck.slackmacgap': 'slack',
  'com.hnc.discord': 'discord',
  'com.microsoft.teams2': 'teams',
  'us.zoom.xos': 'zoom',
  'notion.id': 'notion',
  'md.obsidian': 'obsidian',
  'com.apple.notes': 'notes',
  'com.microsoft.word': 'winword',
  'com.microsoft.excel': 'excel',
  'com.microsoft.powerpoint': 'powerpnt',
  'com.microsoft.outlook': 'outlook',
  'com.figma.desktop': 'figma',
  'com.blackmagic-design.davinciresolve': 'resolve',
  'com.obsproject.obs-studio': 'obs',
  'com.apple.screenshot.launcher': 'screenshot',
  'com.spotify.client': 'spotify',
  'com.apple.music': 'music'
}

export function macApplicationId(bundleId: string | null, executable: string): string {
  const alias = bundleId ? BUNDLE_ID_TO_APP_ID[bundleId.toLowerCase()] : undefined
  return alias ?? executable.trim().toLowerCase()
}

export function toMacApplication(raw: RawFrontmostApp): Application {
  const executable = raw.executable || raw.name
  return {
    id: macApplicationId(raw.bundleId, executable),
    name: raw.name || executable,
    // The executable name, matching what processNameForPid (macos.ts)
    // reports for a pid; click replay compares the two.
    processName: executable,
    // The .app bundle: iconService reads the app's real icon from it (macAppIcon.ts).
    executablePath: raw.bundlePath ?? undefined
  }
}

export class MacOSAdapter implements PlatformOSAdapter {
  private child: ChildProcess | null = null
  private current: Application | null = null
  private lastKnownPid: number | null = null
  private disposed = false
  private readonly listeners = new Set<(app: Application | null) => void>()

  async getActiveApplication(): Promise<Application | null> {
    this.ensureWatcherStarted()
    return this.current
  }

  onActiveApplicationChanged(callback: (app: Application | null) => void): () => void {
    this.ensureWatcherStarted()
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /** The pid of the most recent real (non-Noma) frontmost app. */
  getLastKnownWindowHandle(): number | null {
    return this.lastKnownPid
  }

  dispose(): void {
    this.disposed = true
    this.child?.kill()
    this.child = null
    this.listeners.clear()
  }

  private ensureWatcherStarted(): void {
    if (this.child || this.disposed) return

    let child: ChildProcess
    try {
      child = spawn(
        'osascript',
        ['-l', 'JavaScript', '-e', WATCH_SCRIPT, String(process.pid), String(POLL_INTERVAL_S), String(POLLS_PER_HELPER)],
        { stdio: ['ignore', 'pipe', 'ignore'] }
      )
    } catch {
      return
    }
    this.child = child

    if (child.stdout) {
      createInterface({ input: child.stdout }).on('line', (line) => {
        const trimmed = line.trim()
        if (!trimmed) return
        try {
          const raw = JSON.parse(trimmed) as RawFrontmostApp
          // A restarted helper re-reports whatever is in front; that's not
          // a switch.
          if (raw.processId === this.lastKnownPid && this.current) return
          const application = toMacApplication(raw)
          this.current = application
          this.lastKnownPid = raw.processId
          for (const listener of this.listeners) listener(application)
        } catch {
          // Malformed/partial line; ignore, the next one resyncs.
        }
      })
    }

    const restart = (): void => {
      if (this.child !== child) return
      this.child = null
      if (!this.disposed) setTimeout(() => this.ensureWatcherStarted(), RESTART_DELAY_MS)
    }
    child.on('exit', restart)
    child.on('error', restart)
  }
}
