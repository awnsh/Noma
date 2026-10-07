import { useEffect, useState } from 'react'
import type { HoloTouchCheckSummary } from '@shared/types'
import { TOUCH_CHECK_STEPS, useGlideStore } from '../stores/glideStore'

const STEP_INSTRUCTIONS: Record<'left' | 'right' | 'normal', string> = {
  left: 'Swipe in from the LEFT side: start your finger on the palm rest left of the trackpad and flick it onto the trackpad. About 8 times, at different heights.',
  right: 'Now from the RIGHT side: start on the palm rest right of the trackpad and flick onto it. About 8 times, at different heights.',
  normal: 'Now use the trackpad normally, without swiping in: move the pointer, click, scroll. Use the edges too, the way you usually would.'
}

/**
 * The touch check: under a minute of guided swiping and ordinary use,
 * replayed against Glide's rules, so you can see whether this trackpad
 * reports swipe-ins the way Glide expects. Optional diagnostics, never a
 * required calibration: Glide works without it. Nothing fires meanwhile;
 * the finger positions are saved only on this computer.
 */
export function GlideTouchCheck() {
  const { touchCheck, touchCheckResult, touchCheckDoneAt, touchCheckError, startTouchCheck, cancelTouchCheck } =
    useGlideStore()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!touchCheck) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [touchCheck])

  if (touchCheck) {
    const step = TOUCH_CHECK_STEPS[touchCheck.step]
    const secondsLeft = Math.max(0, Math.ceil((touchCheck.endsAt - now) / 1000))
    return (
      <div className="rounded-lg border border-accent/40 px-4 py-3 text-xs text-holo-muted" aria-live="polite">
        <div className="mb-1 flex items-center gap-2 text-holo-text">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden />
          Step {touchCheck.step + 1} of {TOUCH_CHECK_STEPS.length} · {secondsLeft}s left · nothing runs meanwhile
        </div>
        <p className="mb-3 max-w-xl text-sm text-holo-text">{STEP_INSTRUCTIONS[step.kind]}</p>
        <button type="button" onClick={cancelTouchCheck} className="text-[11px] underline underline-offset-2 hover:text-holo-text">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="text-xs text-holo-muted">
      <p className="max-w-xl">
        Optional. If swipe-ins are often missed, or fire when you didn&apos;t mean them to, run this: swipe in from each
        side for 15 seconds, then use the trackpad normally for 20. Steps move on by themselves. You&apos;ll see how
        many swipes Glide would have caught.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void startTouchCheck()}
          className="rounded-full border border-holo-border px-3 py-1 text-[11px] text-holo-text hover:border-holo-text/30"
        >
          {touchCheckDoneAt ? 'Run touch check again' : 'Run touch check'}
        </button>
        {touchCheckDoneAt && (
          <span>
            Last run {new Date(touchCheckDoneAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
          </span>
        )}
        <button
          type="button"
          onClick={() => void window.flow.openHoloRecordings()}
          className="text-[11px] underline underline-offset-2 hover:text-holo-text"
        >
          Open folder
        </button>
      </div>
      {touchCheckError && <p className="mt-2 text-error">{touchCheckError}</p>}
      {touchCheckResult && <TouchCheckResult summary={touchCheckResult.summary} />}
    </div>
  )
}

function TouchCheckResult({ summary }: { summary: HoloTouchCheckSummary }) {
  return (
    <ul className="mt-3 space-y-1 text-[12px] text-holo-text/90">
      {summary.phases.map((phase) => (
        <li key={phase.kind}>
          {phase.kind === 'normal' ? (
            <>
              Normal use: {phase.touches} touches, {phase.fires === 0 ? 'none' : phase.fires} would have fired by
              accident.
            </>
          ) : (
            <>
              From the {phase.kind}: {phase.firesOnSide} of about {phase.startedAtEdge} swipe-ins caught
              {phase.fires > phase.firesOnSide ? ` (${phase.fires - phase.firesOnSide} on the wrong side)` : ''}.
              {Object.keys(phase.misses).length > 0 &&
                ` Missed: ${Object.entries(phase.misses)
                  .map(([reason, count]) => `${reason.replace('-', ' ')} ${count}`)
                  .join(', ')}.`}
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
