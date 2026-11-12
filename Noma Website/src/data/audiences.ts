import type { WorkflowStep } from '../components/visuals/WorkflowSteps'

/**
 * The audience landing pages (2026-11-03): one template
 * (pages/AudiencePage.tsx), one entry here per audience. They exist to send
 * ad traffic to and compare, so every email signup records which one it
 * came from (lib/attribution.ts). The main ask is the beta download
 * (2026-11-03, the user's call, as on the homepage). Copy rules: only what
 * Flow does today, never what you type, the device is a prototype.
 *
 * Every routine below is shortcuts and app switches only, because that is
 * all Flow records and replays.
 */

export type AudienceSlug = 'editors' | 'developers' | 'designers'

export interface DemoApp {
  appId: string
  /** Replaces the app's default four (appProfiles.ts) for this audience. */
  controls?: string[]
  doing?: string
}

export interface Audience {
  slug: AudienceSlug
  /** <title> and description, also written into the prerendered HTML. */
  title: string
  description: string
  eyebrow: string
  /** Two lines; the second is set in the hero's serif, as on the homepage. */
  headline: [string, string]
  subhead: string
  demo: DemoApp[]
  /** The demo app the three "how it works" steps use as their example. */
  howApp: number
  how: [string, string, string]
  routine: { line: string; steps: WorkflowStep[] }
}

export const audiences: Record<AudienceSlug, Audience> = {
  editors: {
    slug: 'editors',
    title: 'Noma for video editors',
    description:
      'Timeline, file browser, export settings, back to the timeline. Noma sees which app you’re in and keeps what you need for it one press away.',
    eyebrow: 'Noma for video editors',
    headline: ['Your edit,', 'without the back-and-forth.'],
    subhead:
      'Timeline, file browser, export settings, back to the timeline. Noma sees which app you’re in and keeps what you need for it one press away.',
    demo: [
      { appId: 'premiere' },
      { appId: 'resolve' },
      { appId: 'aftereffects', controls: ['Keyframe', 'Preview', 'Trim', 'Render'] },
      { appId: 'explorer' },
    ],
    howApp: 3,
    how: [
      'You jump from Premiere to File Explorer to find last night’s render.',
      'It knows you’re in File Explorer now. It notes which shortcuts you use there, never what you type.',
      'New Folder, Rename, Search. Back in Premiere, Cut and Ripple are there again.',
    ],
    routine: {
      line: 'You finish a cut. Save, export, switch to File Explorer, search for the render. Noma notices you do this every time and asks if you’d like it as one press.',
      steps: [
        { kind: 'app', label: 'Premiere', appId: 'premiere' },
        { kind: 'action', label: 'Save' },
        { kind: 'action', label: 'Export' },
        { kind: 'app', label: 'File Explorer', appId: 'explorer' },
        { kind: 'action', label: 'Search' },
      ],
    },
  },

  developers: {
    slug: 'developers',
    title: 'Noma for developers',
    description:
      'You switch between VS Code, a terminal and a browser hundreds of times a day. Noma follows you between them.',
    eyebrow: 'Noma for developers',
    headline: ['Editor, terminal, browser.', 'In step.'],
    subhead:
      'You switch between VS Code, a terminal and a browser hundreds of times a day. Noma follows you between them, including the terminal where Claude Code is running next to your editor.',
    demo: [
      { appId: 'vscode' },
      { appId: 'terminal', controls: ['Run', 'Clear', 'History', 'Stop'], doing: 'Running Claude Code' },
      { appId: 'chrome', controls: ['Reload', 'Hard Reload', 'DevTools', 'Find'], doing: 'Testing your change' },
    ],
    howApp: 1,
    how: [
      'You save in VS Code and switch to the terminal.',
      'It knows you’re in the terminal now. It notes which shortcuts you use there, never what you type.',
      'Run, Clear and History move into reach. Back in VS Code, Debug and Search return.',
    ],
    routine: {
      line: 'Save, switch to the browser, hard reload, open DevTools. Noma notices the loop and offers to make it one press. It asks first, every time.',
      steps: [
        { kind: 'app', label: 'VS Code', appId: 'vscode' },
        { kind: 'action', label: 'Save' },
        { kind: 'app', label: 'Chrome', appId: 'chrome' },
        { kind: 'action', label: 'Hard Reload' },
        { kind: 'action', label: 'DevTools' },
      ],
    },
  },

  designers: {
    slug: 'designers',
    title: 'Noma for designers',
    description:
      'Figma, the browser, the handoff thread. Noma sees which one you’re in and keeps the right shortcuts within reach.',
    eyebrow: 'Noma for designers',
    headline: ['Stay in the design,', 'not the tab bar.'],
    subhead:
      'Figma, the browser, the handoff thread. Noma sees which one you’re in and keeps the right shortcuts within reach.',
    demo: [
      // Not "Component": one word too wide for a tile on a phone.
      { appId: 'figma', controls: ['Frame', 'Comment', 'Zoom', 'Export'] },
      { appId: 'chrome', doing: 'Checking references' },
      { appId: 'slack', doing: 'Handing off' },
    ],
    howApp: 2,
    how: [
      'You leave Figma to answer a question in the handoff thread.',
      'It knows you’re in Slack now. It notes which shortcuts you use there, never what you type.',
      'Reply and Search are already there. Back in Figma, Frame and Export return.',
    ],
    routine: {
      line: 'Copy a link to the frame, switch to Slack, paste it into the thread. Noma notices you do this for every handoff and asks if it should be one press.',
      steps: [
        { kind: 'app', label: 'Figma', appId: 'figma' },
        { kind: 'action', label: 'Copy Link' },
        { kind: 'app', label: 'Slack', appId: 'slack' },
        { kind: 'action', label: 'Paste' },
      ],
    },
  },
}

export const AUDIENCE_SLUGS = Object.keys(audiences) as AudienceSlug[]

/** The audience a path belongs to, e.g. '/editors' → 'editors'. */
export function audienceForPath(pathname: string): AudienceSlug | null {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  return (AUDIENCE_SLUGS as string[]).includes(slug) ? (slug as AudienceSlug) : null
}
