/** Timing constants for the action layer (focus, click replay, process lookup). */

/** How long macOS gets to bring an app forward: activation there is
 *  asynchronous, unlike SetForegroundWindow. */
export const MAC_ACTIVATION_WAIT_MS = 600
export const MAC_ACTIVATION_POLL_MS = 30
/** osascript startup on top of the usual activation wait. */
export const MAC_WORKSPACE_EXTRA_WAIT_MS = 600
/** Limit for the osascript call that activates an app via NSWorkspace. */
export const MAC_WORKSPACE_ACTIVATE_TIMEOUT_MS = 3000

/** How long a named control may take to appear. A replayed step often
 *  follows one that opens something (a menu, a panel, a dialog), and the
 *  app needs a moment to draw it; the search is repeated until then. */
export const FIND_WAIT_MS = 2000
export const FIND_RETRY_MS = 200

/** Pause between the absolute mouse moves of the approach. */
export const APPROACH_STEP_MS = 12
/** Time over the target before pressing: long enough for the app to
 *  register the pointer as hovering it. */
export const HOVER_MS = 80
/** Time the button is held down. */
export const PRESS_MS = 40

/** Limit for the osascript call that finds a running app's pid. */
export const MAC_FIND_APP_TIMEOUT_MS = 5000
