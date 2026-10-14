import nomaMark from '../../assets/noma-mark.png'
import { spaceStyle } from '../../lib/appSpace'
import nomaWordmark from '../../assets/noma-wordmark.png'
import AppIcon from './AppIcon'

/**
 * The workflow notice exactly as the app draws it: a copy of Noma App's
 * WorkflowNotice + WorkflowChain (size "sm") with the same sizes, colours
 * and spacing, checked against a real capture of the app's notice window
 * (2026-10-05). If the app's card changes, change this with it; it is
 * meant to be the product, not an illustration of it.
 *
 * App names in the chain are clipped at the app's own width (box + 16px),
 * so the scene uses names that really fit, like the Claude app's "Claude".
 */

export type ProductNoticeStep =
  | { kind: 'action'; label: string }
  | { kind: 'app'; label: string; appId: string; color?: string; action?: string }

/** WorkflowChain's "sm" size. */
const BOX = 34

export default function ProductNotice({
  steps,
  occurrences,
  className = '',
}: {
  steps: ProductNoticeStep[]
  occurrences: number
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={`Noma notice: new workflow detected, ${steps.map((step) => step.label).join(', then ')}`}
      className={`w-[300px] rounded-[18px] border border-note-edge bg-gradient-to-b from-[rgba(36,30,46,0.98)] to-[rgba(30,27,34,0.98)] px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,250,240,0.05),0_24px_60px_-20px_rgba(0,0,0,0.85)] ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <img src={nomaMark} alt="" className="h-[18px] w-[26px] object-contain opacity-90" />
        <img src={nomaWordmark} alt="" className="h-[9px] w-auto opacity-75" />
        <span className="ml-auto font-mono text-[10px] text-[#7d7871]">{occurrences}×</span>
        <span className="-mr-0.5 flex h-4 w-4 items-center justify-center text-[13px] leading-none text-[#656970]">×</span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#f1ede6]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-note-violet" />
        New workflow detected
      </p>

      <div className="mt-2 flex items-start gap-x-2 pb-1">
        {steps.map((step, index) => (
          <div key={index} className="contents">
            <div className="flex shrink-0 flex-col items-center text-center">
              {step.kind === 'app' ? (
                <>
                  <div
                    className="flex shrink-0 items-center justify-center rounded-[10px] bg-space-deep shadow-[inset_0_1px_0_0_rgba(255,250,240,0.07)]"
                    style={{ width: BOX, height: BOX, ...spaceStyle(step.appId) }}
                  >
                    <AppIcon id={step.appId} color={step.color} className="h-[20px] w-[20px]" />
                  </div>
                  <p
                    className="mt-1 truncate text-left text-[11px] font-medium text-space-ink"
                    style={{ maxWidth: BOX + 16, ...spaceStyle(step.appId) }}
                  >
                    {step.label}
                  </p>
                  {step.action && (
                    <p
                      className="mt-0.5 truncate text-left font-mono text-[10px] text-[#75767e]"
                      style={{ maxWidth: BOX + 16 }}
                    >
                      {step.action}
                    </p>
                  )}
                </>
              ) : (
                <span
                  className="flex items-center rounded-[10px] border border-white/[0.07] bg-gradient-to-b from-[rgba(255,250,240,0.07)] to-[rgba(255,250,240,0.025)] px-1.5 py-0.5 font-mono text-[10px] text-[#d9d4cc]"
                  style={{ height: BOX }}
                >
                  {step.label}
                </span>
              )}
            </div>
            {index < steps.length - 1 && (
              <span aria-hidden className="flex shrink-0 items-center text-[11px] text-white/25" style={{ height: BOX }}>
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] font-medium text-[#d9d4cc]">Review →</p>
    </div>
  )
}
