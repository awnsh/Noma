import { useState, type PointerEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { AppProfile } from '../../data/appProfiles'

interface AppOrbitProps {
  apps: AppProfile[]
}

// A snappy overshoot spring — the "pop" feel (settles past its target and
// eases back, not a linear tween) rather than a mechanical resize.
const POP_SPRING = { type: 'spring', stiffness: 380, damping: 24, mass: 0.7 } as const

/**
 * A ring of application cards, each tinted in that app's own color, orbiting
 * slowly around a center point — the Problem section's answer to "every
 * application is different," made legible as color instead of just copy.
 * Hovering a card pauses the whole ring and pops that card open with a
 * spring (framer-motion `layout`, not a linear CSS transition) to reveal
 * the 4 real controls Noma would show for it, each chip landing with its
 * own small stagger — the "satisfying macOS snap," not a flat resize.
 *
 * Two animation systems doing two different jobs, deliberately not merged
 * into one: the ring's spin/pause is plain CSS `@keyframes` (index.css)
 * because `animation-play-state: paused` freezes/resumes an infinite loop
 * from its exact current frame with zero jump; the card's own pop-open is
 * framer-motion because that's what spring physics needs. Each card sits
 * at a fixed angle on the ring (placed via
 * `rotate(angle) translate(radius) rotate(-angle)`, the standard "point on
 * a circle, upright" transform, using a `cqw` container-query unit for the
 * radius so it scales with the ring's own size at every breakpoint with no
 * JS measuring), then counter-spins at the ring's own speed to cancel that
 * rotation out so its content stays upright while its position still orbits.
 *
 * Mobile: there's no real `:hover` on touch, so every card also toggles on
 * `onClick`/tap (tapping the already-open card, or another one, closes/
 * switches it — no separate close button needed). That used to fight the
 * hover handlers on touch specifically: a tap also fires a synthetic
 * `mouseenter`, which opened the card, immediately followed by the `click`
 * toggling it back shut again (the "pops and immediately un-pops" glitch on
 * mobile). Fixed by moving the hover handlers to `onPointerEnter`/
 * `onPointerLeave` gated to `e.pointerType === 'mouse'`, so touch only ever
 * drives `hoveredId` through the one `onClick` toggle — no more double-up.
 * Both the ring's own size and each card's collapsed/expanded width are
 * `clamp()`ed in `cqw` units rather than fixed breakpoint values, so a card
 * can never grow wider than the ring has room for, on a 320px phone or a
 * wide desktop alike.
 */
export default function AppOrbit({ apps }: AppOrbitProps) {
  const reduceMotion = useReducedMotion()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const step = 360 / apps.length
  const isPaused = hoveredId !== null

  const toggle = (id: string): void => setHoveredId((current) => (current === id ? null : id))

  // Mouse-only hover — touch drives `hoveredId` solely through onClick below
  // (see the doc comment above for why mixing the two glitches on tap).
  const makePointerHandlers = (id: string) => ({
    onPointerEnter: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') setHoveredId(id)
    },
    onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') setHoveredId((current) => (current === id ? null : current))
    },
  })

  return (
    <div
      // w-72 (288px), not smaller — 8 cards at the collapsed clamp floor
      // (4.5rem/72px each) need at least ~270px of ring diameter to avoid
      // overlapping their neighbors; this keeps a safety margin under that.
      className="relative mx-auto aspect-square w-72 sm:w-96 lg:w-[28rem]"
      style={{ containerType: 'size' }}
      role="img"
      aria-label={`Applications with entirely different controls: ${apps.map((a) => a.name).join(', ')}.`}
    >
      {/* A faint ring guide — without it the cards read as scattered points, not an orbit. */}
      <div aria-hidden className="absolute inset-[16%] rounded-full border border-base-700/60" />
      <div aria-hidden className="absolute inset-0 rounded-full bg-accent/[0.03]" />

      <div
        aria-hidden
        className={`absolute inset-0 ${reduceMotion ? '' : 'animate-orbit-spin'}`}
        style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
      >
        {apps.map((app, i) => {
          const angle = step * i
          const isHovered = hoveredId === app.id
          const pointerHandlers = makePointerHandlers(app.id)

          return (
            <div
              key={app.id}
              className={`absolute left-1/2 top-1/2 ${isHovered ? 'z-20' : 'z-0'}`}
              style={{ transform: `rotate(${angle}deg) translateX(34cqw) rotate(${-angle}deg) translate(-50%, -50%)` }}
            >
              <div
                className={reduceMotion ? '' : 'animate-orbit-counter-spin'}
                style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
              >
                {/* Purely decorative (the container above already carries one
                    consolidated aria-label) — pointer/touch only (hover and
                    click/tap), no keyboard focus target, so it doesn't fight
                    the role="img" summary above it with a second, conflicting
                    way to read the same information. */}
                <motion.div
                  layout
                  transition={reduceMotion ? { duration: 0.01 } : POP_SPRING}
                  {...pointerHandlers}
                  onClick={() => toggle(app.id)}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border p-3 text-center backdrop-blur-sm"
                  style={{
                    // clamp(), not a fixed rem value or a breakpoint jump —
                    // a card can only ever be as wide as the ring itself
                    // has room for, whether the ring is 256px (a small
                    // phone) or 448px (desktop).
                    width: isHovered ? 'clamp(9rem, 58cqw, 15.5rem)' : 'clamp(4.5rem, 20cqw, 6rem)',
                    borderColor: `${app.color}55`,
                    backgroundColor: `${app.color}14`,
                    boxShadow: isHovered
                      ? `0 24px 48px -14px ${app.color}b3, inset 0 1px 0 0 ${app.color}33`
                      : `0 10px 24px -12px ${app.color}80`,
                  }}
                >
                  <motion.div layout="position" className="flex flex-col items-center gap-2 py-1">
                    <motion.span
                      layout
                      className="shrink-0 rounded-full"
                      style={{ backgroundColor: app.color }}
                      animate={{ width: isHovered ? 10 : 8, height: isHovered ? 10 : 8 }}
                      transition={reduceMotion ? { duration: 0.01 } : POP_SPRING}
                    />
                    <span
                      className={`font-medium leading-tight text-base-100 transition-[font-size] duration-200 ${
                        isHovered ? 'text-sm' : 'text-[11px]'
                      }`}
                    >
                      {isHovered ? app.name : app.shortName}
                    </span>
                  </motion.div>

                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        key="controls"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={reduceMotion ? { duration: 0.01 } : { duration: 0.2 }}
                        className="w-full overflow-hidden"
                      >
                        {/* A quiet title-bar/content divider — the same beat
                            a real app window has, without literally drawing
                            traffic-light dots. */}
                        <div className="mx-1 mb-2.5 h-px" style={{ backgroundColor: `${app.color}33` }} />
                        <div className="grid grid-cols-2 gap-1.5 px-0.5 pb-1">
                          {app.controls.map((c, ci) => (
                            <motion.span
                              key={c}
                              initial={{ opacity: 0, scale: 0.6, y: 8 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={
                                reduceMotion
                                  ? { duration: 0.01 }
                                  : { type: 'spring', stiffness: 420, damping: 20, delay: 0.05 + ci * 0.045 }
                              }
                              className="truncate rounded-lg border px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-base-100"
                              style={{ borderColor: `${app.color}55`, backgroundColor: `${app.color}22` }}
                            >
                              {c}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
