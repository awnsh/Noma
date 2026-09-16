import type { WorkflowChainStep } from '../lib/workflowChain'
import { AppIcon } from './AppIcon'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

/**
 * Visual "node" language for a workflow — real feedback was that the
 * original inline-chip version ("Google Chrome → explorer → electron")
 * read as a sentence you had to parse, not a workflow you could recognize
 * at a glance, even once the icons inside it were real. The fix is
 * structural, not decorative: an application step becomes its own large
 * icon-first node (icon → name → the action that happened there, in that
 * hierarchy), and only a bare action with no application context (a
 * leading shortcut before any app switch, or a single-shortcut suggestion
 * with no chain at all) stays a small secondary pill. Consecutive steps
 * are grouped here, not in `lib/workflowChain.ts` — this is a pure
 * rendering concern (how to *lay out* an already-correct step list), not a
 * change to what data a workflow chain carries.
 *
 * `AppIcon` itself is untouched — every node still resolves a real OS icon
 * with the exact same tiered fallback it always has (see AppIcon.tsx's own
 * doc comment). Only the container around it changed: `variant="bare"` at
 * a much larger `size`, centered inside a purpose-built "premium chip"
 * container (see `ICON_BOX` below) rather than AppIcon's own small
 * `'tile'` treatment, which was sized for a 16-22px inline icon, not a
 * 40-56px hero one.
 */

interface WorkflowNode {
  key: string
  kind: 'app' | 'action'
  label: string
  applicationId?: string
  /** A shortcut step immediately following this app step — folded into
   *  the same node as its "what happened here" line (e.g. "Chrome" /
   *  "Search") rather than shown as its own separate pill, since a
   *  captured shortcut step's own applicationId (dropped upstream in
   *  `lib/workflowChain.ts`, see that file's `workflowStep`) is, in
   *  practice, always the app that was just switched into. */
  action?: string
}

/** Turns the flat, alternating step list into the nodes this component
 *  actually renders — an `app` step absorbs one immediately-following
 *  `shortcut` step as its own action line; every other step (a leading
 *  shortcut with no preceding app, or a pure app-switch chain with no
 *  shortcuts at all) stays its own node. Never drops a step. */
function groupIntoNodes(steps: WorkflowChainStep[]): WorkflowNode[] {
  const nodes: WorkflowNode[] = []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.kind === 'app') {
      const next = steps[i + 1]
      if (next && next.kind === 'shortcut') {
        nodes.push({ key: `${i}`, kind: 'app', label: step.label, applicationId: step.applicationId, action: next.label })
        i++
        continue
      }
      nodes.push({ key: `${i}`, kind: 'app', label: step.label, applicationId: step.applicationId })
    } else {
      nodes.push({ key: `${i}`, kind: 'action', label: step.label })
    }
  }
  return nodes
}

// `icon` is deliberately close to `box`, not a small glyph floating in a
// big empty frame — AppIcon's own `'bare'` variant already insets its
// content (real icon or fallback glyph) to ~68%/58% of whatever size it's
// given, so passing `box - 8` here is what actually produces an icon that
// reads as filling the chip, matching the "icon is the hero, not the
// container" ask.
const SIZES = {
  md: { box: 52, icon: 44, name: 'text-sm', action: 'text-[11px]', gap: 'gap-x-3' },
  lg: { box: 72, icon: 64, name: 'text-base', action: 'text-xs', gap: 'gap-x-5' }
} as const

/** The "premium chip" container spec: dark glass square, exact values
 *  rather than the app's shared `GLASS_CARD` recipe — deliberately more
 *  restrained (no backdrop-blur, no heavy shadow) since a workflow can
 *  render many of these in a row and a full glass treatment on each would
 *  compete with itself. */
const ICON_BOX =
  'flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-colors duration-150 hover:border-white/[0.16] hover:bg-white/[0.06]'

export function WorkflowChain({ steps, size = 'md' }: { steps: WorkflowChainStep[]; size?: 'md' | 'lg' }) {
  const reduceMotion = usePrefersReducedMotion()
  const nodes = groupIntoNodes(steps)
  const dim = SIZES[size]
  // Many-node chains (a pure app-switch sequence can run long — see this
  // component's own history) stay large and real rather than shrinking
  // the icons: tighten the gap instead, and let the row scroll
  // horizontally past the card's own edge if it still doesn't fit.
  const compact = nodes.length > 5

  return (
    <div className={`flex items-start overflow-x-auto overflow-y-hidden pb-1 ${compact ? 'gap-x-2' : dim.gap}`}>
      {nodes.map((node, index) => {
        const arrow = index < nodes.length - 1 && (
          <span
            aria-hidden
            className={`mx-1.5 shrink-0 text-white/25 ${size === 'lg' ? 'text-lg' : 'text-sm'}`}
          >
            →
          </span>
        )

        return (
          <div
            key={node.key}
            className="flex shrink-0 flex-col items-center text-center"
            style={{
              width: node.kind === 'app' ? dim.box + 8 : undefined,
              animation: reduceMotion ? undefined : `noma-node-in 200ms ease-out ${index * 80}ms both`
            }}
          >
            {/* The icon (or pill) and the arrow that follows it share one
                row so the arrow lines up with the icon's own vertical
                center, never the taller icon+name+action column below —
                that's the whole point of keeping this row separate from
                the row that holds the text. A fixed row height (matching
                the icon box, even for a shorter action pill) keeps every
                node's icon/pill vertically centered against every other
                node's, regardless of which kind sits next to which. */}
            <div className="flex items-center" style={{ height: dim.box }}>
              {node.kind === 'app' ? (
                <div className={ICON_BOX} style={{ width: dim.box, height: dim.box }}>
                  <AppIcon applicationId={node.applicationId} name={node.label} size={dim.icon} variant="bare" />
                </div>
              ) : (
                <span
                  className={`rounded-md border border-base-700 px-2.5 py-1 font-mono text-neutral-300 ${
                    size === 'lg' ? 'text-xs' : 'text-[11px]'
                  }`}
                >
                  {node.label}
                </span>
              )}
              {arrow}
            </div>

            {node.kind === 'app' && (
              <>
                <p className={`mt-2 truncate font-medium text-neutral-100 ${dim.name}`} style={{ maxWidth: dim.box + 24 }}>
                  {node.label}
                </p>
                {node.action && (
                  <p className={`mt-0.5 truncate font-mono text-neutral-500 ${dim.action}`} style={{ maxWidth: dim.box + 24 }}>
                    {node.action}
                  </p>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
