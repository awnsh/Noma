import { type CSSProperties, Fragment } from 'react'
import type { WorkflowChainStep } from '../lib/workflowChain'
import { spaceStyle } from '../lib/appSpace'
import { AppIcon } from './AppIcon'
import { KeyboardIcon } from './icons'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

/**
 * Visual "node" language for a workflow. Real feedback was that the
 * original inline-chip version ("Google Chrome → explorer → electron")
 * read as a sentence you had to parse, not a workflow you could recognize
 * at a glance, even once the icons inside it were real. The fix is
 * structural, not decorative: an application step becomes its own large
 * icon-first node (icon → name → the action that happened there, in that
 * hierarchy), and only a bare action with no application context (a
 * leading shortcut before any app switch, or a single-shortcut suggestion
 * with no chain at all) stays a small secondary pill. Consecutive steps
 * are grouped here, not in `lib/workflowChain.ts`. This is a pure
 * rendering concern (how to *lay out* an already-correct step list), not a
 * change to what data a workflow chain carries.
 *
 * `AppIcon` itself is untouched. Every node still resolves a real OS icon
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
  /** For a keystroke node: its keys, shown under its name. */
  keys?: string
  applicationId?: string
  /** A shortcut step immediately following this app step. Folded into
   *  the same node as its "what happened here" line (e.g. "Chrome" /
   *  "Search") rather than shown as its own separate pill, since a
   *  captured shortcut step's own applicationId (dropped upstream in
   *  `lib/workflowChain.ts`, see that file's `workflowStep`) is, in
   *  practice, always the app that was just switched into. */
  action?: string
  /** The keys of that folded shortcut, when it has any. */
  actionKeys?: string
}

/** Turns the flat, alternating step list into the nodes this component
 *  actually renders. An `app` step absorbs one immediately-following
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
        nodes.push({ key: `${i}`, kind: 'app', label: step.label, applicationId: step.applicationId, action: next.label, actionKeys: next.keys })
        i++
        continue
      }
      nodes.push({ key: `${i}`, kind: 'app', label: step.label, applicationId: step.applicationId })
    } else {
      nodes.push({ key: `${i}`, kind: 'action', label: step.label, keys: step.keys })
    }
  }
  return nodes
}

// `icon` is a couple px under `box`. Just enough that the icon's own
// element doesn't literally touch the chip's rounded corners, not the old
// "68% of whatever `size` is" inset. `AppIcon`'s `fill` prop (added for
// exactly this call site) is what makes that possible: without it, `bare`
// always draws its content at 68%/58% of `size`, so no `size` could ever
// make the icon visually fill a same-size box. It'd either float in a
// visible ring of empty space (small `size`) or overflow the chip
// (`size` large enough to compensate). `fill` removes that inset (and the
// small inner background that came with it) so `icon` can sit almost flush
// with `box`.
//
// `lg`'s numbers are capped by a real ceiling, not a design choice: a real
// OS icon (`iconService.ts`'s `app.getFileIcon(path, { size: 'large' })`)
// comes back as a 48x48 raster on this machine. Confirmed by hand, not
// assumed. Regardless of how large the source .exe's own icon resource
// is; Electron's `FileIconOptions` only goes up to `'large'`, there's no
// bigger tier to ask for. `lg` previously rendered its icon at ~63px
// (0.92 * 68), well past that 48px ceiling, so every real icon was being
// upscaled ~1.3x and came out visibly soft/blocky. "Tacky," and rightly
// so. 50 keeps the rendered icon (`0.92 * icon`) at 46px, just under the
// real ceiling, so it's shown at its native resolution or smaller, never
// stretched past it. `md` was already safe (44px rendered) and is untouched.
// `sm` exists for Noma Notice, which sits in a corner of the user's desktop
// rather than in the app. At that size the chain has to be readable at a
// glance and take almost no room. Its rendered icon (0.92 * 34 = 31px) is
// well under the 48px real-icon ceiling described above, so it is shown
// below native resolution rather than stretched past it.
const SIZES = {
  sm: { box: 34, icon: 32, name: 'text-[11px]', action: 'text-[10px]', gap: 'gap-x-1.5' },
  md: { box: 52, icon: 48, name: 'text-sm', action: 'text-[11px]', gap: 'gap-x-3' },
  lg: { box: 58, icon: 50, name: 'text-base', action: 'text-xs', gap: 'gap-x-5' }
} as const

/** Solid graphite chip, same material as the app's shared `CARD` recipe
 *  (see `lib/surfaces.ts`). Not glass, and no hover state: these nodes
 *  aren't interactive, so a hover glow here would be decoration with
 *  nothing behind it to justify it. The real application icon inside is
 *  what's supposed to earn the eye's attention, not the chip around it. */
const ICON_BOX = 'flex shrink-0 items-center justify-center'

export function WorkflowChain({
  steps,
  size = 'md',
  centered = false
}: {
  steps: WorkflowChainStep[]
  size?: 'sm' | 'md' | 'lg'
  /** Centers the chain in its container; a chain wider than the container still scrolls. */
  centered?: boolean
}) {
  const reduceMotion = usePrefersReducedMotion()
  const nodes = groupIntoNodes(steps)
  const dim = SIZES[size]
  // Many-node chains (a pure app-switch sequence can run long; see this
  // component's own history) stay large and real rather than shrinking
  // the icons: tighten the gap instead, and let the row scroll
  // horizontally past the card's own edge if it still doesn't fit.
  const compact = nodes.length > 5

  return (
    <div
      className={`flex items-start overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? 'gap-x-2' : dim.gap} ${
        centered ? 'mx-auto w-fit max-w-full' : ''
      }`}
    >
      {nodes.map((node, index) => (
        // The arrow is now a real sibling flex item, a separate array
        // entry from the node column it follows. Not nested inside that
        // column. Nesting it there (an earlier version did) meant the
        // column's own `width` had to cover the icon box *and* the arrow,
        // and it didn't, so the arrow silently overflowed the column's
        // right edge into the next node's space. Real feedback was "the
        // box is being cut off ... to the right." A plain sibling never
        // fights the column for the same pixels.
        <Fragment key={node.key}>
          <div
            className="flex shrink-0 flex-col items-center text-center"
            style={{ animation: reduceMotion ? undefined : `noma-node-in 200ms ease-out ${index * 80}ms both` }}
          >
            {node.kind === 'app' ? (
              // Each app step sits on that app's own colour: the chain shows
              // where each step happens (lib/appSpace.ts).
              <div
                className={`${ICON_BOX} rounded-md`}
                style={{ width: dim.box, height: dim.box, ...(spaceStyle(node.applicationId) as CSSProperties) }}
              >
                <AppIcon applicationId={node.applicationId} name={node.label} size={Math.round(dim.icon * 0.72)} variant="bare" fill />
              </div>
            ) : (
              // A keystroke: a key tile at the same size as the app tiles,
              // its name underneath like theirs, so every step lines up.
              <div
                className={`${ICON_BOX} rounded-md border border-white/[0.08] bg-white/[0.04] text-neutral-300`}
                style={{ width: dim.box, height: dim.box }}
              >
                <KeyboardIcon className={size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'} />
              </div>
            )}

            {node.kind === 'action' && (
              <p
                className={`${size === 'sm' ? 'mt-1 max-w-[5rem] leading-tight' : 'mt-2 max-w-[9rem]'} break-words text-center font-medium text-neutral-100 ${dim.name}`}
              >
                {node.label}
              </p>
            )}
            {node.kind === 'action' && node.keys && (
              <p className={`mt-0.5 ${size === 'sm' ? 'max-w-[5rem]' : 'max-w-[9rem]'} break-words text-center font-mono text-neutral-500 ${dim.action}`}>
                {node.keys}
              </p>
            )}

            {node.kind === 'app' && (
              <>
                {/* Names are never truncated: a cut-off "Google C..." tells you nothing.
                    They wrap under the icon instead, centered. */}
                <p
                  className={`${size === 'sm' ? 'max-w-[5rem] leading-tight' : 'max-w-[9rem]'} break-words text-center font-medium text-neutral-100 ${size === 'sm' ? 'mt-1' : 'mt-2'} ${dim.name}`}
                  style={spaceStyle(node.applicationId) as CSSProperties}
                >
                  {node.label}
                </p>
                {node.action && (
                  <p className={`mt-0.5 ${size === 'sm' ? 'max-w-[5rem]' : 'max-w-[9rem]'} break-words text-center font-mono text-neutral-500 ${dim.action}`}>
                    {node.action}
                  </p>
                )}
              </>
            )}
          </div>

          {index < nodes.length - 1 && (
            // Its own fixed-height box (matching the icon box, not the
            // taller icon+text column) is what actually centers the glyph
            // on the icon's vertical middle. The same technique the
            // now-removed nested version used, just as a standalone item
            // instead of a child fighting the column for width.
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 text-white/25 ${
                size === 'lg' ? 'w-5' : size === 'sm' ? 'w-3.5' : 'w-4'
              }`}
              style={{ height: dim.box }}
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </Fragment>
      ))}
    </div>
  )
}

/** A shortcut drawn as the keys you press ("Win+Shift+S" → three keys). */
export function Keys({ keys }: { keys: string }) {
  const parts = keys.split(/\+(?=.)/)
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {parts.map((part, index) => (
        <kbd
          key={index}
          className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] border border-white/[0.12] border-b-[2px] border-b-white/[0.2] bg-white/[0.06] px-1.5 font-sans text-[11px] font-medium leading-none text-neutral-100"
        >
          {part}
        </kbd>
      ))}
    </span>
  )
}

/**
 * The workflow as numbered steps, the way an automation editor lays them
 * out: one card per step, edged in the colour of the app it happens in,
 * with the app's real icon and the keys pressed there. For the suggestion
 * on Home and Workflows, where the steps are the whole point.
 */
export function WorkflowSteps({ steps, fallbackAppId }: { steps: WorkflowChainStep[]; fallbackAppId?: string | null }) {
  const reduceMotion = usePrefersReducedMotion()
  const nodes = groupIntoNodes(steps)
  return (
    <ol className="flex items-stretch overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {nodes.map((node, index) => {
        const appId = node.kind === 'app' ? node.applicationId : fallbackAppId
        const detail = node.kind === 'app' ? node.action ?? 'Switch to this app' : undefined
        const keys = node.kind === 'app' ? node.actionKeys : node.keys
        return (
          <Fragment key={node.key}>
            <li
              style={{
                ...(spaceStyle(appId) as CSSProperties),
                animation: reduceMotion ? undefined : `noma-node-in 200ms ease-out ${index * 70}ms both`
              }}
              className="flex w-[176px] shrink-0 flex-col rounded-md border border-white/[0.07] border-t-space bg-space/[0.06] px-3 pb-3 pt-2.5 [border-top-width:2px]"
            >
              <div className="flex items-center gap-2">
                {node.kind === 'app' ? (
                  <AppIcon applicationId={node.applicationId} name={node.label} size={22} fill />
                ) : (
                  <span className="flex h-[22px] w-[22px] items-center justify-center text-neutral-300">
                    <KeyboardIcon className="h-4 w-4" />
                  </span>
                )}
                <span className="ml-auto text-[11px] tabular-nums text-neutral-500">{index + 1}</span>
              </div>
              <p className="mt-2 break-words text-[13px] font-semibold leading-snug text-neutral-50">{node.label}</p>
              {detail && <p className="mt-0.5 text-[12px] text-neutral-300">{detail}</p>}
              {keys && (
                <div className="mt-auto pt-2">
                  <Keys keys={keys} />
                </div>
              )}
            </li>
            {index < nodes.length - 1 && (
              <li aria-hidden className="flex w-6 shrink-0 items-center justify-center text-neutral-500">
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
                </svg>
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
