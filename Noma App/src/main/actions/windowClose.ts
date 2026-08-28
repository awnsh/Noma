import { IsWindow, PostMessage, WM_CLOSE } from './win32'

/**
 * Posts WM_CLOSE directly to a window handle — the exact same message a
 * title bar's X button sends — instead of simulating a keypress. No focus
 * needed at all (PostMessage can target any window regardless of what's
 * currently focused), so none of windowFocus.ts's concerns apply here,
 * and never a forceful termination: the target application decides how to
 * respond, including raising an "unsaved changes" prompt, exactly as it
 * would for a real click on X.
 *
 * Returns whether the message was successfully queued, not whether the
 * window actually closed — that's the app's call, same as a real click.
 */
export function closeWindowGracefully(targetHwnd: number): boolean {
  if (!IsWindow(targetHwnd)) return false
  return PostMessage(targetHwnd, WM_CLOSE, 0, 0)
}
