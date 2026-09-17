import { Fragment } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import DemoAppIcon from './appGlyphIcons'

export type DemoChainStep = { kind: 'app'; appId: string; label: string } | { kind: 'shortcut'; label: string }

/**
 * Ported from the real app's `components/WorkflowChain.tsx` — updated
 * 2026-09-17 for that component's own visual overhaul: real feedback there
 * was that a row of tiny icons embedded in a text sentence ("Google Chrome
 * → explorer → electron") had to be read, not recognized at a glance, even
 * once the icons themselves were real. The fix is the same one ported here:
 * an application step becomes its own large icon-first node (icon → name →
 * the action that happened there), and only a bare action with no
 * application context stays a small secondary pill. Distinct from this
 * site's own marketing `WorkflowChain.tsx` (Problem section), which is a
 * different component for a different job — don't confuse the two.
 */

interface WorkflowNode {
  key: string
  kind: 'app' | 'action'
  label: string
  appId?: string
  /** A shortcut step immediately following this app step, folded into the
   *  same node as its "what happened here" line — same convention the real
   *  app's `WorkflowChain.tsx` uses. */
  action?: string
}

function groupIntoNodes(steps: DemoChainStep[]): WorkflowNode[] {
  const nodes: WorkflowNode[] = []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.kind === 'app') {
      const next = steps[i + 1]
      if (next && next.kind === 'shortcut') {
        nodes.push({ key: `${i}`, kind: 'app', label: step.label, appId: step.appId, action: next.label })
        i++
        continue
      }
      nodes.push({ key: `${i}`, kind: 'app', label: step.label, appId: step.appId })
    } else {
      nodes.push({ key: `${i}`, kind: 'action', label: step.label })
    }
  }
  return nodes
}

// `icon` sits a couple px under `box` — `DemoAppIcon`'s `fill` prop (see
// that file) is what makes the icon actually reach that close to `box`
// without overflowing it, by dropping the default ~60% inset. `lg` matches
// the real app's `WorkflowChain.tsx` size-for-size — that file's own
// comment explains why 58/50, not 72/68: the real app's OS-extracted icons
// are a 48x48 raster (a real ceiling, not a style choice), and displaying
// one any larger upscales it into visible pixelation. This preview's own
// icons are vector (real brand marks / letterform badges — see
// `appGlyphIcons.tsx`) and wouldn't actually pixelate at 72/68, but it
// stays sized identically to the app on purpose: this component's whole
// job is looking like the real thing, not just avoiding its bugs.
const SIZES = {
  md: { box: 52, icon: 48, name: 'text-sm', action: 'text-[11px]', gap: 'gap-x-3' },
  lg: { box: 58, icon: 50, name: 'text-base', action: 'text-xs', gap: 'gap-x-5' }
} as const

const ICON_BOX = 'flex shrink-0 items-center justify-center rounded-2xl border border-base-600 bg-base-850 shadow-[0_6px_16px_-10px_rgba(0,0,0,0.5)]'

export default function DemoWorkflowChain({ steps, size = 'md' }: { steps: DemoChainStep[]; size?: 'md' | 'lg' }) {
  const reduceMotion = useReducedMotion()
  const nodes = groupIntoNodes(steps)
  const dim = SIZES[size]
  const compact = nodes.length > 5

  return (
    <div className={`flex items-start overflow-x-auto overflow-y-hidden pb-1 ${compact ? 'gap-x-2' : dim.gap}`}>
      {nodes.map((node, index) => (
        // The arrow is a real sibling flex item, a separate array entry
        // from the node column it follows — not nested inside that column
        // (an earlier version nested it, and the column's own `width`
        // didn't account for the arrow's, so it silently overflowed the
        // column's right edge — see the real app's `WorkflowChain.tsx` for
        // the same bug and fix).
        <Fragment key={node.key}>
          <motion.div
            className="flex shrink-0 flex-col items-center text-center"
            initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            {node.kind === 'app' ? (
              <div className={ICON_BOX} style={{ width: dim.box, height: dim.box }}>
                <DemoAppIcon appId={node.appId} name={node.label} size={dim.icon} variant="bare" fill />
              </div>
            ) : (
              <span
                className={`flex items-center rounded-md border border-base-700 px-2.5 py-1 font-mono text-base-100 ${
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
                    `text-center` — see the real app's `WorkflowChain.tsx`
                    for the bug this avoids: centered text inside a
                    `truncate`d, narrower-than-content box clips from both
                    edges, silently dropping the string's own first letter
                    with no ellipsis marking it. */}
                <p className={`mt-2 truncate text-left font-medium text-base-100 ${dim.name}`} style={{ maxWidth: dim.box + 28 }}>
                  {node.label}
                </p>
                {node.action && (
                  <p className={`mt-0.5 truncate text-left font-mono text-base-500 ${dim.action}`} style={{ maxWidth: dim.box + 28 }}>
                    {node.action}
                  </p>
                )}
              </>
            )}
          </motion.div>

          {index < nodes.length - 1 && (
            <span
              aria-hidden
              className={`flex shrink-0 items-center text-base-100/25 ${size === 'lg' ? 'text-lg' : 'text-sm'}`}
              style={{ height: dim.box }}
            >
              &rarr;
            </span>
          )}
        </Fragment>
      ))}
    </div>
  )
}
