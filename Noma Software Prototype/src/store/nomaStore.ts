import { create } from 'zustand'
import { appProfiles, appOrder, type AppId } from '../data/appProfiles'
import { detectActivity, type DetectedActivity } from '../lib/detectActivity'
import { logEvent, startSession, submitSurvey } from '../lib/analytics'

export type View = 'workspace' | 'compare' | 'customize' | 'why' | 'feedback'
export type TransitionPhase = 'idle' | 'switching' | 'adapting'

interface Customization {
  pinned: string[]
  removed: string[]
}

/** A recognized cross-app pattern — "you move between these two workflows
 *  a lot" — the other half of the core selling point alongside intra-app
 *  activity recognition (detectActivity.ts). Purely observational: unlike
 *  the earlier suggestion/pin mechanic, nothing needs to be accepted for
 *  this to be true or to show up. */
export interface RecognizedWorkflow {
  a: AppId
  b: AppId
  recognizedAt: number
}

/** How many presses of an app's on-deck controls are kept as "recent" —
 *  the window detectActivity.ts reads from. Short enough that switching
 *  topics within an app is reflected quickly, long enough that a single
 *  press can't look like a pattern. */
const RECENT_PRESSES_WINDOW = 6
/** Same idea for cross-app switching: how many times the same two apps
 *  have to be traded between before Noma calls it a recognized workflow. */
const WORKFLOW_SWITCH_THRESHOLD = 3

/** Session-only state resets naturally on reload — the intended way to
 *  hand this prototype to the next test participant. Only analytics
 *  events/sessions/survey responses (lib/analytics.ts, localStorage)
 *  accumulate across reloads, which is the point of Validation Mode. */

function emptyCustomization(): Record<AppId, Customization> {
  const result = {} as Record<AppId, Customization>
  for (const id of appOrder) result[id] = { pinned: [], removed: [] }
  return result
}

function emptyRecentPresses(): Record<AppId, string[]> {
  const result = {} as Record<AppId, string[]>
  for (const id of appOrder) result[id] = []
  return result
}

/** Guards selectApp's queued setTimeouts against a rapid second switch —
 *  without this, clicking through several apps quickly could let a stale
 *  callback from an earlier switch stomp the transition phase of a switch
 *  that started after it. Plain module state, not store state: it's an
 *  internal sequencing guard, not something any component should render
 *  off of. */
let transitionToken = 0

interface NomaState {
  sessionId: string
  view: View
  currentAppId: AppId
  transitionPhase: TransitionPhase
  customization: Record<AppId, Customization>
  recentPresses: Record<AppId, string[]>
  detectedActivity: DetectedActivity | null
  appSwitchHistory: AppId[]
  pairSwitchCounts: Record<string, number>
  recognizedWorkflow: RecognizedWorkflow | null
  recognizedWorkflowPairs: Set<string>
  appsVisited: Set<AppId>
  surveySubmitted: boolean
  feedbackNudgeShown: boolean
  feedbackNudgeVisible: boolean
  analyticsOpen: boolean

  setView: (view: View) => void
  selectApp: (appId: AppId) => void
  pressControl: (appId: AppId, controlId: string, label: string) => void
  pinControl: (appId: AppId, controlId: string) => void
  unpinControl: (appId: AppId, controlId: string) => void
  removeControl: (appId: AppId, controlId: string) => void
  restoreControl: (appId: AppId, controlId: string) => void
  reorderPinned: (appId: AppId, fromIndex: number, toIndex: number) => void
  resetCustomization: (appId: AppId) => void
  dismissFeedbackNudge: () => void
  submitSurveyResponse: (fields: { replace: string; worth: string; adaptTo: string; missing: string }) => void
  toggleAnalytics: () => void
}

/** Effective on-deck order for an app: pinned controls first (in the order
 *  they were pinned), then the rest of the app's base control order, minus
 *  anything removed. */
export function getEffectiveOrder(appId: AppId, customization: Record<AppId, Customization>): string[] {
  const base = appProfiles[appId].controls.map((c) => c.id)
  const { pinned, removed } = customization[appId]
  const rest = base.filter((id) => !pinned.includes(id) && !removed.includes(id))
  return [...pinned.filter((id) => !removed.includes(id)), ...rest]
}

export const useNomaStore = create<NomaState>((set, get) => ({
  sessionId: startSession().id,
  view: 'workspace',
  currentAppId: 'vscode',
  transitionPhase: 'idle',
  customization: emptyCustomization(),
  recentPresses: emptyRecentPresses(),
  detectedActivity: null,
  appSwitchHistory: ['vscode'],
  pairSwitchCounts: {},
  recognizedWorkflow: null,
  recognizedWorkflowPairs: new Set(),
  appsVisited: new Set(['vscode']),
  surveySubmitted: false,
  feedbackNudgeShown: false,
  feedbackNudgeVisible: false,
  analyticsOpen: false,

  setView: (view) => set({ view }),

  selectApp: (appId) => {
    const { currentAppId, sessionId, appSwitchHistory, pairSwitchCounts, recognizedWorkflowPairs, appsVisited, recentPresses } = get()
    if (appId === currentAppId) return

    logEvent(sessionId, 'app_select', { appId })

    const nextHistory = [...appSwitchHistory, appId].slice(-8)
    const pairKey = [currentAppId, appId].sort().join('|')
    const nextPairCounts = { ...pairSwitchCounts, [pairKey]: (pairSwitchCounts[pairKey] ?? 0) + 1 }
    const nextVisited = new Set(appsVisited)
    nextVisited.add(appId)

    // Cross-app pattern: repeatedly trading the same two apps is a
    // workflow in its own right, independent of anything happening inside
    // either one — the other half of "pattern recognition across
    // workflows," alongside detectActivity's intra-app half below.
    let nextWorkflow = get().recognizedWorkflow
    let nextWorkflowPairs = recognizedWorkflowPairs
    if (nextPairCounts[pairKey] === WORKFLOW_SWITCH_THRESHOLD && !recognizedWorkflowPairs.has(pairKey)) {
      nextWorkflow = { a: currentAppId, b: appId, recognizedAt: Date.now() }
      nextWorkflowPairs = new Set(recognizedWorkflowPairs)
      nextWorkflowPairs.add(pairKey)
      logEvent(sessionId, 'pattern_recognized', {
        detail: `Workflow: ${appProfiles[currentAppId].shortName} + ${appProfiles[appId].shortName}`,
      })
    }

    // The header/base keyboard switch to the new app immediately — only the
    // contextual control grid lags behind, showing "Switching context…" /
    // "Adapting controls…" before revealing the new controls. See
    // HardwareKeyboard.tsx: it keys off `transitionPhase`, not `currentAppId`, to
    // decide whether to show the placeholder or the real grid.
    set({
      currentAppId: appId,
      transitionPhase: 'switching',
      appSwitchHistory: nextHistory,
      pairSwitchCounts: nextPairCounts,
      appsVisited: nextVisited,
      recognizedWorkflow: nextWorkflow,
      recognizedWorkflowPairs: nextWorkflowPairs,
      // Re-detect immediately using whatever history this app already has
      // from earlier in the session — switching back to an app you were
      // just debugging in should still read as "debugging," not reset.
      detectedActivity: detectActivity(appProfiles[appId].activities, recentPresses[appId]),
    })

    const token = ++transitionToken
    window.setTimeout(() => {
      if (transitionToken !== token) return
      set({ transitionPhase: 'adapting' })
    }, 300)
    window.setTimeout(() => {
      if (transitionToken !== token) return
      set({ transitionPhase: 'idle' })
    }, 700)
  },

  pressControl: (appId, controlId, label) => {
    const { sessionId, recentPresses, detectedActivity } = get()

    logEvent(sessionId, 'control_press', { appId, controlId, controlLabel: label })

    const nextWindow = [...recentPresses[appId], controlId].slice(-RECENT_PRESSES_WINDOW)
    const nextActivity = detectActivity(appProfiles[appId].activities, nextWindow)

    set({ recentPresses: { ...recentPresses, [appId]: nextWindow }, detectedActivity: nextActivity })

    // Only log the moment recognition actually changes — not on every
    // subsequent press that continues to match the same activity.
    if (nextActivity && nextActivity.id !== detectedActivity?.id) {
      logEvent(sessionId, 'pattern_recognized', {
        appId,
        detail: `${nextActivity.label} · ${appProfiles[appId].shortName}`,
      })
    }
  },

  pinControl: (appId, controlId) => {
    const { customization, sessionId } = get()
    const current = customization[appId]
    if (current.pinned.includes(controlId)) return
    logEvent(sessionId, 'customize_pin', { appId, controlId })
    set({
      customization: {
        ...customization,
        [appId]: { ...current, pinned: [...current.pinned, controlId], removed: current.removed.filter((id) => id !== controlId) },
      },
    })
  },

  unpinControl: (appId, controlId) => {
    const { customization } = get()
    const current = customization[appId]
    set({
      customization: {
        ...customization,
        [appId]: { ...current, pinned: current.pinned.filter((id) => id !== controlId) },
      },
    })
  },

  removeControl: (appId, controlId) => {
    const { customization, sessionId } = get()
    const current = customization[appId]
    logEvent(sessionId, 'customize_remove', { appId, controlId })
    set({
      customization: {
        ...customization,
        [appId]: {
          pinned: current.pinned.filter((id) => id !== controlId),
          removed: [...current.removed, controlId],
        },
      },
    })
  },

  restoreControl: (appId, controlId) => {
    const { customization, sessionId } = get()
    const current = customization[appId]
    logEvent(sessionId, 'customize_restore', { appId, controlId })
    set({
      customization: {
        ...customization,
        [appId]: { ...current, removed: current.removed.filter((id) => id !== controlId) },
      },
    })
  },

  reorderPinned: (appId, fromIndex, toIndex) => {
    const { customization, sessionId } = get()
    const current = customization[appId]
    const pinned = [...current.pinned]
    const [moved] = pinned.splice(fromIndex, 1)
    if (moved === undefined) return
    pinned.splice(toIndex, 0, moved)
    logEvent(sessionId, 'customize_reorder', { appId, controlId: moved })
    set({ customization: { ...customization, [appId]: { ...current, pinned } } })
  },

  resetCustomization: (appId) => {
    const { customization, sessionId } = get()
    logEvent(sessionId, 'customize_reset', { appId })
    set({ customization: { ...customization, [appId]: { pinned: [], removed: [] } } })
  },

  dismissFeedbackNudge: () => set({ feedbackNudgeVisible: false }),

  submitSurveyResponse: (fields) => {
    const { sessionId } = get()
    submitSurvey({ sessionId, ...fields })
    logEvent(sessionId, 'survey_submit', {})
    set({ surveySubmitted: true })
  },

  toggleAnalytics: () => set((s) => ({ analyticsOpen: !s.analyticsOpen })),
}))

/** Trips the feedback nudge once per session, after the visitor has shown
 *  real engagement (visited 3+ apps) rather than on a blind timer — see
 *  Workspace.tsx's effect that calls this. */
export function maybeShowFeedbackNudge(): void {
  const state = useNomaStore.getState()
  if (state.feedbackNudgeShown || state.surveySubmitted) return
  if (state.appsVisited.size >= 3) {
    useNomaStore.setState({ feedbackNudgeShown: true, feedbackNudgeVisible: true })
  }
}
