import { Fragment } from 'react'
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

// `icon` is a couple px under `box` — just enough that the icon's own
// element doesn't literally touch the chip's rounded corners, not the old
// "68% of whatever `size` is" inset. `AppIcon`'s `fill` prop (added for
// exactly this call site) is what makes that possible: without it, `bare`
// always draws its content at 68%/58% of `size`, so no `size` could ever
// make the icon visually fill a same-size box — it'd either float in a
// visible ring of empty space (small `size`) or overflow the chip
// (`size` large enough to compensate). `fill` removes that inset (and the
// small inner background that came with it) so `icon` can sit almost flush
// with `box`.
//
// `lg`'s numbers are capped by a real ceiling, not a design choice: a real
// OS icon (`iconService.ts`'s `app.getFileIcon(path, { size: 'large' })`)
// comes back as a 48x48 raster on this machine — confirmed by hand, not
// assumed — regardless of how large the source .exe's own icon resource
// is; Electron's `FileIconOptions` only goes up to `'large'`, there's no
// bigger tier to ask for. `lg` previously rendered its icon at ~63px
// (0.92 * 68), well past that 48px ceiling, so every real icon was being
// upscaled ~1.3x and came out visibly soft/blocky — "tacky," and rightly
// so. 50 keeps the rendered icon (`0.92 * icon`) at 46px, just under the
// real ceiling, so it's shown at its native resolution or smaller, never
// stretched past it. `md` was already safe (44px rendered) and is untouched.
const SIZES = {
  md: { box: 52, icon: 48, name: 'text-sm', action: 'text-[11px]', gap: 'gap-x-3' },
  lg: { box: 58, icon: 50, name: 'text-base', action: 'text-xs', gap: 'gap-x-5' }
} as const

/** Solid graphite chip, same material as the app's shared `CARD` recipe
 *  (see `lib/surfaces.ts`) — not glass, and no hover state: these nodes
 *  aren't interactive, so a hover glow here would be decoration with
 *  nothing behind it to justify it. The real application icon inside is
 *  what's supposed to earn the eye's attention, not the chip around it. */
const ICON_BOX = 'flex shrink-0 items-center justify-center rounded-2xl border border-base-700 bg-base-850 shadow-[0_6px_16px_-10px_rgba(0,0,0,0.5)]'

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
      {nodes.map((node, index) => (
        // The arrow is now a real sibling flex item, a separate array
        // entry from the node column it follows — not nested inside that
        // column. Nesting it there (an earlier version did) meant the
        // column's own `width` had to cover the icon box *and* the arrow,
        // and it didn't, so the arrow silently overflowed the column's
        // right edge into the next node's space — real feedback was "the
        // box is being cut off ... to the right." A plain sibling never
        // fights the column for the same pixels.
        <Fragment key={node.key}>
          <div
            className="flex shrink-0 flex-col items-center text-center"
            style={{ animation: reduceMotion ? undefined : `noma-node-in 200ms ease-out ${index * 80}ms both` }}
          >
            {node.kind === 'app' ? (
              <div className={ICON_BOX} style={{ width: dim.box, height: dim.box }}>
                <AppIcon applicationId={node.applicationId} name={node.label} size={dim.icon} variant="bare" fill />
              </div>
            ) : (
              <span
                className={`flex items-center rounded-md border border-base-700 px-2.5 py-1 font-mono text-neutral-300 ${
                  size === 'lg' ? 'text-xs' : 'text-[11px]'
                }`}
                style={{ height: dim.box }}
              >
                {node.label}
              </span>
            )}

            {node.kind === 'app' && (
              <>
                {/* `text-left`, deliberately overriding the column's own
                    `text-center`: centered text inside a `truncate`d,
                    narrower-than-content box clips from *both* edges (the
                    browser lays the centered text out past both sides of
                    the box, then the ellipsis only marks the end) — a real
                    bug hit here, where "Command Palette" silently rendered
                    as "ommand Pale…", missing its own first letter with no
                    visual indication anything was cut from the start.
                    Left-aligned text only ever overflows (and correctly
                    ellipsizes) on the one edge `truncate` actually handles. */}
                <p className={`mt-2 truncate text-left font-medium text-neutral-100 ${dim.name}`} style={{ maxWidth: dim.box + 28 }}>
                  {node.label}
                </p>
                {node.action && (
                  <p className={`mt-0.5 truncate text-left font-mono text-neutral-500 ${dim.action}`} style={{ maxWidth: dim.box + 28 }}>
                    {node.action}
                  </p>
                )}
              </>
            )}
          </div>

          {index < nodes.length - 1 && (
            // Its own fixed-height box (matching the icon box, not the
            // taller icon+text column) is what actually centers the glyph
            // on the icon's vertical middle — the same technique the
            // now-removed nested version used, just as a standalone item
            // instead of a child fighting the column for width.
            <span
              aria-hidden
              className={`flex shrink-0 items-center text-white/25 ${size === 'lg' ? 'text-lg' : 'text-sm'}`}
              style={{ height: dim.box }}
            >
              →
            </span>
          )}
        </Fragment>
      ))}
    </div>
  )
}
