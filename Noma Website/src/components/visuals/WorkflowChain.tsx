import AppIcon from './AppIcon'
import { appProfiles } from '../../data/appProfiles'

export interface ChainStep {
  /** An `appProfiles` id — renders that app's real icon, tinted its own color. */
  app?: string
  /** A plain action word (Screenshot, Paste, Enter) — no app owns this step. */
  label?: string
}

/**
 * One repeated workflow, rendered exactly as the Problem section's brief
 * calls for: real application icons and plain action words, chained by thin
 * arrows — "Screenshot → Claude → Paste → Enter," not a paragraph describing
 * that workflow. Every `app` id must exist in `appProfiles` (its color and
 * name come from there, so a chain never drifts from the rest of the site's
 * app data). Horizontally scrollable rather than wrapping, so a five-step
 * chain never breaks its own left-to-right reading order on a narrow phone.
 */
export default function WorkflowChain({ steps }: { steps: ChainStep[] }) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {steps.map((step, i) => {
        const profile = step.app ? appProfiles[step.app] : undefined
        return (
          <div key={i} className="flex shrink-0 items-center gap-2.5">
            {i > 0 && <span aria-hidden className="h-px w-4 shrink-0 bg-base-600" />}
            <div
              className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5"
              style={
                profile?.color
                  ? { borderColor: `${profile.color}40`, backgroundColor: `${profile.color}14` }
                  : { borderColor: 'var(--color-base-700)', backgroundColor: 'var(--color-base-850)' }
              }
            >
              {profile && <AppIcon id={profile.id} color={profile.color} className="h-3.5 w-3.5 shrink-0" />}
              <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.1em] text-base-200">
                {step.label ?? profile?.shortName}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
