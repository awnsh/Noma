/**
 * What Noma knows about applications, so pattern detection can judge whether
 * a chain is a *plausible workflow* rather than just a repeated coincidence.
 * Pure data + pure functions, deliberately closed-vocabulary in the same
 * spirit as keyNames.ts: it only ever claims what it's confident about, and
 * anything unrecognized is treated as neutral (0.5), never as wrong — the
 * learned model (ai/workflowQuality.ts) covers whatever this doesn't.
 *
 * Application ids are the lowercased executable name without ".exe" (see
 * windowsAdapter.ts), e.g. "code", "chrome", "resolve".
 */

export type AppCategory =
  | 'browser'
  | 'editor'
  | 'terminal'
  | 'fileManager'
  | 'vcs'
  | 'ai'
  | 'chat'
  | 'meeting'
  | 'notes'
  | 'office'
  | 'design'
  | 'video'
  | 'capture'
  /** Background apps you glance at mid-task (music players). Never part of
   *  a work chain — see isAmbientApp. */
  | 'ambient'

interface CategoryRule {
  category: AppCategory
  ids: string[]
  /** Substring matches, for families of executables (idea64, pycharm64…). */
  contains?: string[]
}

const CATEGORY_RULES: CategoryRule[] = [
  { category: 'browser', ids: ['chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi', 'arc'] },
  {
    category: 'editor',
    ids: ['code', 'code - insiders', 'cursor', 'windsurf', 'devenv', 'sublime_text', 'notepad++', 'zed'],
    contains: ['idea', 'pycharm', 'webstorm', 'clion', 'rider', 'goland', 'phpstorm']
  },
  {
    category: 'terminal',
    ids: ['windowsterminal', 'wt', 'cmd', 'powershell', 'pwsh', 'conhost', 'mintty', 'alacritty', 'hyper'],
    contains: ['wezterm']
  },
  { category: 'fileManager', ids: ['explorer', 'totalcmd64', 'files'] },
  { category: 'vcs', ids: ['githubdesktop', 'gitkraken', 'sourcetree', 'fork', 'tortoisegitproc', 'git-gui'] },
  { category: 'ai', ids: ['claude', 'chatgpt'], contains: ['claude', 'chatgpt'] },
  { category: 'chat', ids: ['slack', 'discord', 'telegram', 'whatsapp', 'signal', 'teams', 'ms-teams'] },
  { category: 'meeting', ids: ['zoom', 'webex', 'webexmta'] },
  { category: 'notes', ids: ['notion', 'obsidian', 'onenote', 'evernote', 'logseq', 'notepad'] },
  { category: 'office', ids: ['winword', 'excel', 'powerpnt', 'outlook', 'acrobat', 'acrord32', 'soffice'] },
  {
    category: 'design',
    ids: ['photoshop', 'illustrator', 'figma', 'xd', 'indesign', 'blender', 'canva'],
    contains: ['gimp', 'affinity']
  },
  {
    category: 'video',
    ids: ['resolve', 'afterfx', 'obs', 'obs64', 'vegas', 'capcut', 'audacity', 'reaper', 'fl64'],
    contains: ['premiere', 'ableton']
  },
  { category: 'capture', ids: ['snippingtool', 'screenclippinghost', 'sharex', 'snagit32', 'screensketch'] },
  { category: 'ambient', ids: ['spotify', 'itunes', 'musicbee', 'vlc', 'wmplayer', 'tidal'], contains: ['music'] }
]

export function categoryOf(applicationId: string | null): AppCategory | null {
  if (!applicationId) return null
  const id = applicationId.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.ids.includes(id)) return rule.category
    if (rule.contains?.some((fragment) => id.includes(fragment))) return rule.category
  }
  return null
}

/** Apps where on-screen controls routinely carry other people's names or page
 *  content (web pages, message lists, meeting rosters), so click capture is
 *  skipped there entirely rather than trusting a name filter to catch it. */
const CLICK_CAPTURE_EXCLUDED: AppCategory[] = ['browser', 'chat', 'meeting', 'ai']

export function isClickCaptureExcluded(applicationId: string | null): boolean {
  const category = categoryOf(applicationId)
  return category !== null && CLICK_CAPTURE_EXCLUDED.includes(category)
}

/** Music players and the like: switching to one mid-task to skip a song
 *  isn't a step of any workflow, so chains are built as if the hop never
 *  happened (patternDetection.buildWorkflowSteps). */
export function isAmbientApp(applicationId: string | null): boolean {
  return categoryOf(applicationId) === 'ambient'
}

// ---------------------------------------------------------------------------
// Realistic cross-app workflows
// ---------------------------------------------------------------------------

export interface RealisticWorkflow {
  name: string
  /** Category chain, in order. Matched as a contiguous run of the pattern's
   *  own (consecutive-duplicates-collapsed) category chain. */
  chain: AppCategory[]
}

/** Things people genuinely do, longest/most specific first so a full match
 *  wins over a shorter one it contains. */
export const REALISTIC_WORKFLOWS: RealisticWorkflow[] = [
  { name: 'Run and preview', chain: ['editor', 'terminal', 'browser'] },
  { name: 'Commit changes', chain: ['editor', 'terminal', 'vcs'] },
  { name: 'Screenshot to AI', chain: ['capture', 'ai'] },
  { name: 'Screenshot to editor', chain: ['capture', 'editor'] },
  { name: 'Share a screenshot', chain: ['capture', 'chat'] },
  { name: 'Save a screenshot to notes', chain: ['capture', 'notes'] },
  { name: 'Ask AI, then code', chain: ['ai', 'editor'] },
  { name: 'Code, then ask AI', chain: ['editor', 'ai'] },
  { name: 'Run code', chain: ['editor', 'terminal'] },
  { name: 'Check the result in the browser', chain: ['editor', 'browser'] },
  { name: 'Review and commit', chain: ['editor', 'vcs'] },
  { name: 'Commit from the terminal', chain: ['terminal', 'vcs'] },
  { name: 'Look something up while coding', chain: ['browser', 'editor'] },
  { name: 'Research into notes', chain: ['browser', 'notes'] },
  { name: 'Share a link', chain: ['browser', 'chat'] },
  { name: 'Research into a document', chain: ['browser', 'office'] },
  { name: 'Bring in assets', chain: ['fileManager', 'video'] },
  { name: 'Import artwork', chain: ['fileManager', 'design'] },
  { name: 'Export and find the file', chain: ['video', 'fileManager'] },
  { name: 'Design to video', chain: ['design', 'video'] },
  { name: 'Share a design', chain: ['design', 'chat'] },
  { name: 'Attach a file', chain: ['fileManager', 'chat'] },
  { name: 'Attach a file to an email', chain: ['fileManager', 'office'] },
  { name: 'Meeting notes', chain: ['meeting', 'notes'] },
  { name: 'Chat to notes', chain: ['chat', 'notes'] },
  { name: 'Chat to a document', chain: ['chat', 'office'] }
]

function collapseCategories(applicationIds: Array<string | null>): AppCategory[] | null {
  const chain: AppCategory[] = []
  for (const id of applicationIds) {
    const category = categoryOf(id)
    if (!category) return null
    if (chain[chain.length - 1] !== category) chain.push(category)
  }
  return chain
}

/** The realistic workflow this app chain matches, if any. Returns null when
 *  any app is unrecognized (nothing can be claimed) or nothing matches. */
export function matchRealisticWorkflow(applicationIds: Array<string | null>): RealisticWorkflow | null {
  const chain = collapseCategories(applicationIds)
  if (!chain || chain.length < 2) return null
  for (const workflow of REALISTIC_WORKFLOWS) {
    for (let start = 0; start + workflow.chain.length <= chain.length; start++) {
      if (workflow.chain.every((category, offset) => chain[start + offset] === category)) return workflow
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Transition plausibility
// ---------------------------------------------------------------------------

/** Hops that are reasonable but not a named workflow above. Anything
 *  categorized and not listed (or a hop to/from an ambient app) is treated
 *  as unlikely. Symmetric. */
const PLAUSIBLE_PAIRS: Array<[AppCategory, AppCategory, number]> = [
  ['editor', 'terminal', 0.95],
  ['editor', 'browser', 0.9],
  ['editor', 'vcs', 0.9],
  ['editor', 'ai', 0.9],
  ['editor', 'fileManager', 0.7],
  ['terminal', 'browser', 0.8],
  ['terminal', 'vcs', 0.9],
  ['terminal', 'ai', 0.85],
  ['terminal', 'fileManager', 0.6],
  ['browser', 'ai', 0.9],
  ['browser', 'notes', 0.9],
  ['browser', 'chat', 0.85],
  ['browser', 'office', 0.85],
  ['browser', 'design', 0.8],
  ['browser', 'vcs', 0.8],
  ['browser', 'fileManager', 0.7],
  ['browser', 'video', 0.6],
  ['capture', 'ai', 0.95],
  ['capture', 'chat', 0.9],
  ['capture', 'notes', 0.9],
  ['capture', 'editor', 0.85],
  ['capture', 'design', 0.8],
  ['capture', 'office', 0.8],
  ['capture', 'browser', 0.7],
  ['chat', 'notes', 0.8],
  ['chat', 'meeting', 0.85],
  ['chat', 'office', 0.8],
  ['chat', 'fileManager', 0.75],
  ['chat', 'ai', 0.7],
  ['meeting', 'notes', 0.9],
  ['notes', 'office', 0.8],
  ['notes', 'ai', 0.8],
  ['office', 'ai', 0.8],
  ['office', 'fileManager', 0.8],
  ['design', 'video', 0.9],
  ['design', 'fileManager', 0.85],
  ['design', 'chat', 0.8],
  ['video', 'fileManager', 0.9],
  ['video', 'chat', 0.5]
]

const PAIR_SCORES = new Map<string, number>(
  PLAUSIBLE_PAIRS.map(([a, b, score]) => [pairKey(a, b), score])
)

function pairKey(a: AppCategory, b: AppCategory): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Score of a categorized pair not listed above: real but unusual. */
const UNLIKELY_PAIR = 0.15
/** Two different apps of the same kind (Photoshop → Illustrator). */
const SAME_CATEGORY = 0.7
const NEUTRAL = 0.5

/** How reasonable one hop between two apps is, 0-1. 0.5 when either app
 *  isn't recognized — no claim either way. */
export function pairPlausibility(fromId: string | null, toId: string | null): number {
  const from = categoryOf(fromId)
  const to = categoryOf(toId)
  if (!from || !to) return NEUTRAL
  if (from === 'ambient' || to === 'ambient') return 0.05
  if (from === to) return SAME_CATEGORY
  return PAIR_SCORES.get(pairKey(from, to)) ?? UNLIKELY_PAIR
}

/**
 * How reasonable a whole chain of apps is, 0-1, or null when it has no
 * cross-app hop to judge (a single app). A chain matching a named realistic
 * workflow scores at least 0.9; otherwise it blends the average hop with the
 * weakest one, so one absurd hop (Spotify → Explorer → Terminal's first leg)
 * can't hide behind a plausible rest.
 */
export function chainPlausibility(applicationIds: Array<string | null>): number | null {
  const hops: number[] = []
  for (let i = 1; i < applicationIds.length; i++) {
    if (applicationIds[i] === applicationIds[i - 1]) continue
    hops.push(pairPlausibility(applicationIds[i - 1], applicationIds[i]))
  }
  if (hops.length === 0) return null

  const mean = hops.reduce((sum, hop) => sum + hop, 0) / hops.length
  const score = 0.5 * mean + 0.5 * Math.min(...hops)
  return matchRealisticWorkflow(applicationIds) ? Math.max(score, 0.9) : score
}

// ---------------------------------------------------------------------------
// In-app knowledge
// ---------------------------------------------------------------------------

interface InAppProfile {
  ids: string[]
  contains?: string[]
  /** group name -> { "Control+B": "Blade" }. Two different shortcuts from the
   *  same group are a coherent in-app step pair (Duplicate layer → Free
   *  transform); shortcuts from different groups aren't obviously related. */
  groups: Record<string, Record<string, string>>
}

/** Only shortcuts confidently known — see the note at the top. Bare keys
 *  (Delete, Backspace, single letters) never appear: the capture policy
 *  (captureFilter.ts) never records them, so they couldn't be matched. */
const IN_APP_PROFILES: InAppProfile[] = [
  {
    ids: ['resolve'],
    groups: { edit: { 'Control+B': 'Blade', 'Control+Z': 'Undo', 'Control+Shift+Z': 'Redo' } }
  },
  {
    ids: [],
    contains: ['premiere'],
    groups: {
      edit: { 'Control+K': 'Add edit', 'Control+Shift+K': 'Add edit to all tracks', 'Control+Z': 'Undo' },
      project: { 'Control+I': 'Import', 'Control+M': 'Export media' }
    }
  },
  {
    ids: ['photoshop'],
    groups: {
      layers: {
        'Control+J': 'Duplicate layer',
        'Control+Shift+N': 'New layer',
        'Control+E': 'Merge down',
        'Control+T': 'Free transform',
        'Control+D': 'Deselect',
        'Control+Shift+I': 'Invert selection'
      }
    }
  },
  {
    ids: ['code', 'code - insiders', 'cursor'],
    groups: {
      navigate: {
        'Control+P': 'Quick open',
        'Control+Shift+P': 'Command palette',
        'Control+Shift+F': 'Search in files',
        'Control+Shift+E': 'Explorer'
      }
    }
  },
  {
    ids: ['chrome', 'msedge', 'firefox', 'brave'],
    groups: {
      tabs: {
        'Control+T': 'New tab',
        'Control+W': 'Close tab',
        'Control+Shift+T': 'Reopen closed tab',
        'Control+L': 'Address bar'
      }
    }
  },
  { ids: ['explorer'], groups: { files: { 'Control+Shift+N': 'New folder' } } }
]

function profileFor(applicationId: string | null): InAppProfile | null {
  if (!applicationId) return null
  const id = applicationId.toLowerCase()
  return (
    IN_APP_PROFILES.find((profile) => profile.ids.includes(id) || profile.contains?.some((f) => id.includes(f))) ??
    null
  )
}

function findGroup(profile: InAppProfile, combo: string): { group: string; label: string } | null {
  for (const [group, actions] of Object.entries(profile.groups)) {
    if (actions[combo]) return { group, label: actions[combo] }
  }
  return null
}

/** The app-specific name of a shortcut ("Blade" for Ctrl+B in Resolve), or
 *  null when Noma doesn't know it for this app. */
export function inAppLabel(applicationId: string | null, comboKeys: string[]): string | null {
  const profile = profileFor(applicationId)
  return profile ? (findGroup(profile, comboKeys.join('+'))?.label ?? null) : null
}

/**
 * How coherent a two-shortcut sequence is *inside one app*, 0-1: two known
 * actions from the same group (Duplicate layer → Free transform) are a real
 * step pair; known actions from different groups less so; one known and one
 * generic in between; two generic shortcuts get no opinion (0.5).
 */
export function inAppCoherence(applicationId: string | null, comboA: string, comboB: string): number {
  const profile = profileFor(applicationId)
  if (!profile) return NEUTRAL
  const a = findGroup(profile, comboA)
  const b = findGroup(profile, comboB)
  if (a && b) return a.group === b.group ? 0.9 : 0.4
  if (a || b) return 0.6
  return NEUTRAL
}
