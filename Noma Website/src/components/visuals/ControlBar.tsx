import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AppIcon from './AppIcon'
import { appProfiles } from '../../data/appProfiles'
import { spaceStyle } from '../../lib/appSpace'

/**
 * The hero's version of Noma: one slim bar, the app in front on the left and
 * its four controls in a row. Same idea as AdaptiveSurface (the app changes,
 * the controls follow) in a deliberately different shape, so the hero, the
 * Flow section and the app picker don't show three near-identical cards
 * (2026-10-06). On phones the controls drop under the app.
 */
export default function ControlBar({
  appId,
  className = '',
  controls,
  highlight = null,
  compact = false,
}: {
  appId: string
  className?: string
  /** Overrides the app's default four, e.g. after a workflow is saved. */
  controls?: string[]
  /** A slot (0-3) to mark, e.g. the one a workflow was saved to. */
  highlight?: number | null
  /** Stack the app above its controls at every width, for tight spaces
   *  like the How it works window, so labels aren't cut off. */
  compact?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const app = appProfiles[appId]
  if (!app) return null

  const ease = [0.22, 1, 0.36, 1] as const
  const swap = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(5px)' },
    animate: reduceMotion
      ? { opacity: 1, transition: { duration: 0.2 } }
      : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, delay, ease } },
    exit: reduceMotion
      ? { opacity: 0, transition: { duration: 0.15 } }
      : { opacity: 0, y: -6, filter: 'blur(5px)', transition: { duration: 0.22, ease } },
  })

  return (
    // Wears the app's own colour (lib/appSpace.ts), sliding to the next
    // app's when the app changes, as the Noma app does.
    <div
      style={spaceStyle(app.id)}
      className={`space-transition app-glass flex flex-col gap-3 rounded-[22px] p-3 ${
        compact ? '' : 'sm:flex-row sm:items-center sm:gap-4 sm:rounded-full sm:p-2.5 sm:pl-3'
      } ${className}`}
    >
      <div className={`flex min-w-0 items-center gap-3 px-1 ${compact ? '' : 'sm:w-44 sm:shrink-0'}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-space-deep">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={app.id} {...swap(0)} className="flex">
              <AppIcon id={app.id} color={app.color} className="h-5 w-5" />
            </motion.span>
          </AnimatePresence>
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={app.id} {...swap(0.03)} className="truncate font-display text-base font-semibold tracking-tight text-base-50">
            {app.shortName}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="grid flex-1 grid-cols-4 gap-2">
        {(controls ?? app.controls).map((control, index) => (
          <div
            key={index}
            className={`flex h-11 items-center justify-center rounded-full border px-2 transition-colors duration-500 ${
              highlight === index ? 'border-ink/40 bg-ink/[0.1]' : 'border-white/[0.08] bg-white/[0.04]'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${app.id}-${control}`}
                {...swap(0.05 + index * 0.05)}
                className="block w-full truncate text-center text-xs font-medium tracking-tight text-base-100 sm:text-[13px]"
              >
                {control}
              </motion.span>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
