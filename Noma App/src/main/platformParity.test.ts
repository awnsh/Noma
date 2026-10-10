import Database from 'better-sqlite3'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { UiohookKey } from 'uiohook-napi'

/**
 * Flow's whole loop, run once as Windows and once as macOS in the same
 * `npm test`, on whichever machine runs it. Each case is written once with
 * `mod` standing for the command modifier (Ctrl on Windows, Cmd on a Mac)
 * and played with that OS's real keys: capture, the "makes sense" rules,
 * detection, the suggestion's wording, saving it to a Glide zone, and the
 * keys a swipe actually sends. A change made and tested on Windows that
 * breaks the Mac version fails here, without a Mac.
 *
 * The code under test reads the OS from main/platform.ts when a module is
 * first loaded, so each OS gets a fresh copy of every module (resetModules)
 * with platform.ts answering for that OS. Real OS calls (window focus,
 * finding a window, tab titles, screenshots, clicks) are stubbed: they have
 * their own tests on the real OS, and CI runs those on both.
 */

// Loading the modules a second time (as the other OS) would declare
// win32.ts's named native types again, which koffi refuses: hand back the
// type it already has instead.
vi.mock('koffi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('koffi') & { default?: typeof import('koffi') }>()
  const koffi = (actual.default ?? actual) as unknown as Record<string, unknown>
  const declared = new Map<string, unknown>()
  const once =
    (kind: string) =>
    (name: unknown, ...rest: unknown[]): unknown => {
      const declare = koffi[kind] as (...args: unknown[]) => unknown
      if (typeof name !== 'string') return declare(name, ...rest)
      const key = `${kind}:${name}`
      if (!declared.has(key)) declared.set(key, declare(name, ...rest))
      return declared.get(key)
    }
  const overrides: Record<string, unknown> = { struct: once('struct'), union: once('union'), proto: once('proto') }
  const wrapped = new Proxy(koffi, { get: (target, key: string) => overrides[key] ?? target[key] })
  return { ...actual, ...overrides, default: wrapped }
})
vi.mock('uiohook-napi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('uiohook-napi')>()
  return { ...actual, uIOhook: { ...actual.uIOhook, keyTap: vi.fn() } }
})
vi.mock('./actions/processWindow', () => ({ findMainWindowHandleForProcess: vi.fn(async () => 4242) }))
vi.mock('./actions/windowFocus', () => ({ focusWindowAndVerify: vi.fn(async () => true) }))
vi.mock('./actions/click', () => ({ executeClick: vi.fn() }))
vi.mock('./actions/uiaControlFinder', () => ({ uiaControlFinder: { warmUp: vi.fn(), find: vi.fn() } }))
vi.mock('./actions/screenshot', () => ({ runScreenshotStep: vi.fn(async () => ({ ok: true })) }))
vi.mock('./workflow/tabFingerprint', () => ({ currentTabFingerprint: vi.fn(() => null) }))

type OS = 'win32' | 'darwin'

async function loadAs(os: OS) {
  vi.resetModules()
  vi.doMock('./platform', () => ({ isWindows: os === 'win32', isMac: os === 'darwin' }))
  return {
    db: await import('./database/db'),
    seed: await import('./database/seed'),
    events: await import('./database/repositories/workflowEventsRepository'),
    suggestions: await import('./database/repositories/suggestionsRepository'),
    profiles: await import('./database/repositories/profileRepository'),
    macros: await import('./database/repositories/macrosRepository'),
    engine: await import('./ai/suggestionEngine'),
    provider: await import('./ai/localProvider'),
    resolution: await import('./applications/suggestionResolution'),
    executor: await import('./actions/actionExecutor'),
    capture: await import('./workflow/captureFilter'),
    sense: await import('./workflow/workflowSense'),
    hook: await import('uiohook-napi')
  }
}

for (const os of ['win32', 'darwin'] as const) {
  const mac = os === 'darwin'
  /** The command modifier: Ctrl+S on Windows is Cmd+S on a Mac. */
  const mod = mac ? 'Meta' : 'Control'
  const modCode = mac ? UiohookKey.Meta : UiohookKey.Ctrl

  describe(`Flow parity: ${mac ? 'macOS' : 'Windows'}`, () => {
    let m: Awaited<ReturnType<typeof loadAs>>

    beforeAll(async () => {
      m = await loadAs(os)
    })

    beforeEach(() => {
      const db = new Database(':memory:')
      m.db.runMigrations(db)
      m.db.__setDatabaseForTesting(db)
      m.seed.seedDefaultProfiles(db)
      db.prepare('INSERT INTO applications (id, name, process_name) VALUES (?, ?, ?)').run(
        'claude',
        'Claude',
        mac ? 'Claude' : 'Claude.exe'
      )
      vi.mocked(m.hook.uIOhook.keyTap).mockClear()
    })

    function record(applicationId: string, at: number, comboKeys?: string[]): void {
      m.events.insertWorkflowEvent(
        comboKeys
          ? { applicationId, eventType: 'shortcut', comboKeys, timestamp: at }
          : { applicationId, eventType: 'appSwitch', timestamp: at }
      )
    }

    async function refresh() {
      await new m.engine.SuggestionEngine(new m.provider.LocalRuleBasedProvider()).refresh()
      return m.suggestions.getPendingSuggestions()
    }

    describe('capture', () => {
      it.each([
        [[mod, 'S'], true],
        [[mod, 'Shift', 'P'], true],
        [['Shift', 'A'], false],
        [['A'], false]
      ])('%j captured: %s', (keys, expected) => {
        expect(m.capture.shouldCaptureKeyCombo(keys)).toBe(expected)
      })

      it('treats Alt/Option + a letter as typing only on a Mac', () => {
        // Option+E types an accent on a Mac; Alt+E opens a menu on Windows.
        expect(m.capture.shouldCaptureKeyCombo(['Alt', 'E'])).toBe(!mac)
        expect(m.capture.shouldCaptureKeyCombo(['Alt', 'F4'])).toBe(true)
      })
    })

    describe('shortcut roles', () => {
      it.each([
        [[mod, 'C'], 'copy'],
        [[mod, 'V'], 'paste'],
        [[mod, 'A'], 'selectAll'],
        [[mod, 'Z'], 'undo'],
        [[mod, 'Shift', 'Z'], 'redo'],
        [[mod, 'Shift', 'T'], 'action']
      ])('%j is %s', (keys, role) => {
        expect(m.sense.shortcutRole(keys)).toBe(role)
      })

      it("leaves out this OS's own window-management shortcuts", () => {
        const noise = mac ? [['Meta', 'Space'], ['Meta', 'H'], ['Meta', 'M']] : [['Meta', 'D'], ['Control', 'Y']]
        for (const keys of noise) expect(m.sense.isNoiseShortcut(keys)).toBe(true)
        // Cmd+D is Bookmark on a Mac, not Show desktop.
        expect(m.sense.isNoiseShortcut(['Meta', 'D'])).toBe(!mac)
      })
    })

    it('seeds starter actions with this OS’s keys', () => {
      const chrome = m.profiles.getProfileForApplicationId('chrome')
      const newTab = chrome?.controls.find((control) => control.label === 'NEW TAB')
      expect(newTab?.action).toEqual({ type: 'shortcut', keys: [mod, 'T'] })
    })

    it('copy in Chrome, paste in Claude, three times: suggested, saved to a zone, and replayed with this OS’s keys', async () => {
      const start = Date.now()
      for (let round = 0; round < 3; round++) {
        const t = start + round * 20_000
        record('chrome', t)
        record('chrome', t + 300, [mod, 'A'])
        record('chrome', t + 500, [mod, 'C'])
        record('claude', t + 900)
        record('claude', t + 1_100, [mod, 'V'])
      }

      const pending = await refresh()
      const suggestion = pending.find((s) => s.action?.kind === 'createWorkflowMacroAndAssignToControl')
      expect(suggestion, JSON.stringify(pending.map((s) => s.explanation))).toBeDefined()
      // Named by what each step does, never as raw key codes.
      expect(suggestion!.explanation).toContain('Select all → Copy')
      expect(suggestion!.explanation).toMatch(/claude → Paste/i)
      expect(suggestion!.explanation).not.toMatch(/Meta|Control|Ctrl|Cmd/)

      const saved = m.resolution.assignSuggestionToControl(suggestion!.id, 4)
      expect(saved).not.toBeNull()
      const zone = m.profiles.getProfileForApplicationId('chrome')!.controls.find((control) => control.slot === 4)!
      expect(zone.action.type).toBe('macro')
      const macro = m.macros.getMacroById((zone.action as { macroId: string }).macroId)!
      expect(macro.actions.filter((step) => step.type !== 'delay')).toEqual([
        { type: 'focusApplication', applicationId: 'chrome' },
        { type: 'shortcut', keys: [mod, 'A'] },
        { type: 'shortcut', keys: [mod, 'C'] },
        { type: 'focusApplication', applicationId: 'claude' },
        { type: 'shortcut', keys: [mod, 'V'] },
        // A workflow ending in a paste sends what was pasted.
        { type: 'shortcut', keys: ['Enter'] }
      ])

      const result = await m.executor.executeControlAction(zone.action, null)
      expect(result).toEqual({ ok: true })
      expect(vi.mocked(m.hook.uIOhook.keyTap).mock.calls).toEqual([
        [UiohookKey.A, [modCode]],
        [UiohookKey.C, [modCode]],
        [UiohookKey.V, [modCode]],
        [UiohookKey.Enter, []]
      ])
    })

    it('two app shortcuts in a row, three times (Bookmark then Close tab): suggested with this OS’s keys', async () => {
      const start = Date.now()
      for (let round = 0; round < 3; round++) {
        const t = start + round * 20_000
        record('chrome', t, [mod, 'D'])
        record('chrome', t + 1_000, [mod, 'W'])
      }
      const pending = await refresh()
      expect(pending.length).toBeGreaterThan(0)
      expect(JSON.stringify(pending.map((s) => s.action))).toContain(`"${mod}+D","${mod}+W"`)
    })

    it('Select all, Copy, Paste in one app suggests nothing: nothing moves between apps', async () => {
      const start = Date.now()
      for (let round = 0; round < 5; round++) {
        const t = start + round * 2_000
        record('chrome', t, [mod, 'A'])
        record('chrome', t + 300, [mod, 'C'])
        record('chrome', t + 600, [mod, 'V'])
      }
      expect(await refresh()).toEqual([])
    })

    it("never sends this OS's quit or close-window shortcuts", async () => {
      const quits = mac ? [['Meta', 'Q'], ['Meta', 'Alt', 'W'], ['Meta', 'Shift', 'W']] : [['Alt', 'F4'], ['Control', 'Q'], ['Control', 'Shift', 'W']]
      for (const keys of quits) {
        const result = await m.executor.executeControlAction({ type: 'shortcut', keys }, null)
        expect(result.ok, keys.join('+')).toBe(false)
      }
      // Close tab stays allowed on both.
      expect(await m.executor.executeControlAction({ type: 'shortcut', keys: [mod, 'W'] }, null)).toEqual({ ok: true })
      expect(vi.mocked(m.hook.uIOhook.keyTap).mock.calls).toEqual([[UiohookKey.W, [modCode]]])
    })
  })
}
