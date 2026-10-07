import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkflowNotice as WorkflowNoticeData } from '@shared/types'
import { NOTICE_GLASS } from '../lib/surfaces'
import { workflowChainSteps } from '../lib/workflowChain'
import { WorkflowChain } from './WorkflowChain'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import logo from '../assets/logo.png'
import wordmark from '../assets/noma-wordmark.png'

/**
 * Noma Notice: the card itself.
 *
 * Everything about it is an argument for not being looked at for long. It
 * states who is talking, what was noticed, and what it was, in that order,
 * and then offers exactly one thing to do. There is no headline, no
 * exclamation, no "AI" anywhere, and the only coloured pixel is the accent
 * on the single action. Because the workflow's own application icons are
 * the thing worth seeing, and anything else competing with them is noise.
 *
 * Reviewing expands the same card in place instead of opening a window.
 * Being asked "is this right?" while you are mid-task is only reasonable if
 * answering takes a second and leaves you where you were.
 *
 * The close button is not a verdict on the workflow, and is deliberately not
 * treated as one. Someone shutting a card that appeared over their work is
 * saying "not now, I'm busy" (not "this is a bad idea"). So the suggestion
 * is left exactly where it was, waiting in the app. Rejecting it is what
 * "Not now" under Review is for, and that takes a deliberate second click.
 */

export type NoticeDismissReason = 'timeout' | 'closed' | 'dismissed' | 'reviewed'

export interface WorkflowNoticeProps {
  notice: WorkflowNoticeData
  /** Closes the notice. The reason decides what happens to the workflow.
   *  See WorkflowNotifier.dismiss. */
  onDismiss: (reason: NoticeDismissReason) => void
  /** Accepts the workflow, or opens the app when accepting needs a control
   *  slot picked (which this card deliberately doesn't try to do). */
  onAccept: () => void
  /** Tells the window to take clicks while the pointer is over the card,
   *  and to pass them through to the desktop otherwise. */
  onInteractiveChange?: (interactive: boolean) => void
  /** Overridable so a test doesn't have to wait six real seconds. */
  autoDismissMs?: number
}

/** Long enough to read a three-step chain without hurrying, short enough
 *  that an unread notice is gone before it becomes clutter. */
const AUTO_DISMISS_MS = 6000
const ENTER_MS = 280
const EXIT_MS = 200

export function WorkflowNotice({
  notice,
  onDismiss,
  onAccept,
  onInteractiveChange,
  autoDismissMs = AUTO_DISMISS_MS
}: WorkflowNoticeProps) {
  const reduceMotion = usePrefersReducedMotion()
  const [reviewing, setReviewing] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [paused, setPaused] = useState(false)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { suggestion, occurrenceCount } = notice
  const chain = workflowChainSteps(suggestion)

  /** Plays the exit, then reports it. So the card is never yanked off
   *  screen mid-animation. */
  const close = useCallback(
    (reason: NoticeDismissReason) => {
      setLeaving(true)
      onInteractiveChange?.(false)
      exitTimer.current = setTimeout(() => onDismiss(reason), reduceMotion ? 0 : EXIT_MS)
    },
    [onDismiss, onInteractiveChange, reduceMotion]
  )

  // Hovering pauses the countdown, and opening the review stops it for good:
  // someone who is reading it has told us, by reading it, that it isn't
  // finished with them yet.
  useEffect(() => {
    if (paused || reviewing || leaving) return
    const timer = setTimeout(() => close('timeout'), autoDismissMs)
    return () => clearTimeout(timer)
  }, [paused, reviewing, leaving, autoDismissMs, close])

  useEffect(() => () => void (exitTimer.current && clearTimeout(exitTimer.current)), [])

  const enter = (): void => {
    setPaused(true)
    onInteractiveChange?.(true)
  }
  const leave = (): void => {
    setPaused(false)
    onInteractiveChange?.(false)
  }

  const animation = reduceMotion
    ? undefined
    : `${leaving ? 'noma-notice-out' : 'noma-notice-in'} ${leaving ? EXIT_MS : ENTER_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1) both`

  return (
    // Anchored to the bottom-right of its window, which is itself parked in
    // the corner of the screen. The window is taller than the card on
    // purpose: that spare room above is what the card travels through on the
    // way in, and what the expanded review state grows into.
    <div className="flex h-full w-full items-end justify-end p-3">
      <div
        role="status"
        // polite, not alert: this is an observation, not a problem, and it
        // must never interrupt a screen reader mid-sentence.
        aria-live="polite"
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
        style={{ animation, opacity: reduceMotion && leaving ? 0 : undefined }}
        className={`${NOTICE_GLASS} w-full max-w-[300px] px-3 py-2.5`}
      >
        <div className="flex items-center gap-1.5">
          {/* The real lockup, at the same mark-then-wordmark proportions the
              sidebar uses. Scaled down rather than redrawn, so the identity
              on someone's desktop is the identity in the app. `alt` sits on
              the wordmark only: the two images are one logo, and a screen
              reader saying "Noma" twice would be worse than saying it once. */}
          <img src={logo} alt="" className="h-[18px] w-[26px] object-contain opacity-90" />
          <img src={wordmark} alt="Noma" className="h-[9px] w-auto opacity-75" />
          <span className="ml-auto font-mono text-[10px] text-neutral-600">{occurrenceCount}x</span>
          {/* Quiet until wanted: at rest it reads as part of the chrome, and
              only resolves into a control once the pointer is on the card.
              Given the window is click-through until then, this is exactly
              when it becomes usable. */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => close('closed')}
            className="-mr-0.5 flex h-4 w-4 items-center justify-center rounded transition-colors duration-150 text-neutral-600 hover:bg-white/[0.06] hover:text-neutral-200"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-xs font-medium text-neutral-100">
          {suggestion.isDemo ? 'Demo workflow (simulated, not learned from you)' : 'New workflow detected'}
        </p>

        {chain && (
          <div className="mt-2">
            <WorkflowChain steps={chain} size="sm" />
          </div>
        )}

        {reviewing ? (
          <>
            {/* Capped: the explanation is generated prose and an unusually
                long one would otherwise push the two answers past the
                window's own edge, where they can't be clicked at all. */}
            <p className="mt-2.5 line-clamp-4 text-[11px] leading-relaxed text-neutral-400">
              {suggestion.explanation}
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-accent/90"
              >
                Review steps in Noma
              </button>
              <button
                type="button"
                onClick={() => close('dismissed')}
                className="text-[11px] text-neutral-500 transition-colors duration-150 hover:text-neutral-200"
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="mt-2 flex items-center gap-1 text-[11px] font-medium text-accent transition-colors duration-150 hover:text-accent/80"
          >
            Review
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
