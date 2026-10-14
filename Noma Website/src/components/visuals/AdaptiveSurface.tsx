import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { spaceStyle } from '../../lib/appSpace'
import AppIcon from './AppIcon'
import { appProfiles } from '../../data/appProfiles'

/**
 * Noma, as one object: the application it can see, and the four controls that
 * belong to it.
 *
 * This is the site's whole argument in one component, so it is the one
 * component every section reuses rather than re-illustrating. The point it
 * has to land is not "here is a panel" but "these four things *changed
 * because the application changed*" — so the application's identity and its
 * controls are deliberately bound together in one surface, and the change is
 * animated as a single physical event rather than as four independent fades.
 *
 * The glass is doing real work here: this is the floating Noma layer sitting
 * over whatever the person is actually using, which is exactly what the
 * product is. Elsewhere on the page, surfaces stay solid.
 */

export type SurfaceSize = 'lg' | 'md'

interface AdaptiveSurfaceProps {
  appId: string
  size?: SurfaceSize
  className?: string
  /** Overrides the app's default four, e.g. after a workflow is saved. */
  controls?: string[]
  /** A slot (0-3) to mark as just changed. */
  highlight?: number | null
}

const SIZES = {
  lg: {
    pad: 'p-6 sm:p-8',
    icon: 'h-11 w-11 sm:h-14 sm:w-14',
    iconBox: 'h-16 w-16 sm:h-20 sm:w-20',
    name: 'text-xl sm:text-2xl',
    doing: 'text-sm',
    gap: 'gap-4 sm:gap-5',
    tile: 'h-[64px] sm:h-[76px]',
    tileLabel: 'text-[11px] sm:text-[13px]',
    grid: 'gap-2.5 sm:gap-3',
  },
  md: {
    pad: 'p-5 sm:p-6',
    icon: 'h-8 w-8 sm:h-10 sm:w-10',
    iconBox: 'h-12 w-12 sm:h-14 sm:w-14',
    name: 'text-base sm:text-lg',
    doing: 'text-xs sm:text-sm',
    gap: 'gap-3.5 sm:gap-4',
    tile: 'h-[54px] sm:h-[62px]',
    tileLabel: 'text-[10px] sm:text-xs',
    grid: 'gap-2 sm:gap-2.5',
  },
} as const

/** What the person is doing there — the word that makes the icon mean
 *  something. Kept beside the profile data rather than inside it because it
 *  is a claim this page makes, not a fact the desktop app stores. */
const DOING: Record<string, string> = {
  vscode: 'Writing code',
  chrome: 'Browsing',
  claude: 'Building with Claude Code',
  figma: 'Designing',
  premiere: 'Editing video',
  github: 'Reviewing changes',
  blender: 'Modelling',
  spotify: 'Listening',
  discord: 'Talking',
  terminal: 'In the shell',
  notion: 'Writing',
  photoshop: 'Retouching',
}

export default function AdaptiveSurface({ appId, size = 'lg', className = '', controls, highlight = null }: AdaptiveSurfaceProps) {
  const reduceMotion = useReducedMotion()
  const app = appProfiles[appId]
  const dim = SIZES[size]

  if (!app) return null

  // One shared timing for the identity and the controls, offset per tile, so
  // the surface reads as a single object reconfiguring rather than five
  // elements that happen to change at once.
  const ease = [0.22, 1, 0.36, 1] as const
  const swap = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(6px)' },
    animate: reduceMotion
      ? { opacity: 1, transition: { duration: 0.2, delay: 0 } }
      : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.42, delay, ease } },
    exit: reduceMotion
      ? { opacity: 0, transition: { duration: 0.15 } }
      : { opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.24, ease } },
  })

  return (
    <div
      style={spaceStyle(app.id)}
      className={`space-transition app-glass overflow-hidden rounded-3xl ${dim.pad} ${className}`}
    >

      <div className={`relative flex items-center ${dim.gap}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl bg-space-deep ${dim.iconBox}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={app.id} {...swap(0)} className="flex items-center justify-center">
              <AppIcon id={app.id} color={app.color} className={dim.icon} />
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={app.id} {...swap(0.04)}>
              <p className={`truncate font-display font-semibold tracking-tight text-base-50 ${dim.name}`}>
                {app.shortName}
              </p>
              <p className={`mt-0.5 truncate text-base-400 ${dim.doing}`}>
                {DOING[app.id] ?? 'Active'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className={`relative mt-5 grid grid-cols-4 ${dim.grid}`}>
        {(controls ?? app.controls).map((control, index) => (
          <div
            key={index}
            className={`flex items-center justify-center rounded-xl border px-2 transition-colors duration-500 ${
              highlight === index
                ? 'border-ink/40 bg-ink/[0.1]'
                : 'border-white/[0.09] bg-white/[0.04]'
            } ${dim.tile}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${app.id}-${control}`}
                {...swap(0.06 + index * 0.05)}
                className={`block w-full truncate text-center font-medium tracking-tight text-base-100 ${dim.tileLabel}`}
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
