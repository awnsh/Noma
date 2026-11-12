import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

/**
 * The word "type" in the hero headline, played like four keys: each letter
 * presses down in turn to a different depth, with a thin orange bar under
 * it showing how far it went, then springs back. One letter at a time,
 * then a rest, on a loop. The letters' layout never changes (transform
 * only), so the headline doesn't reflow. Still with reduced motion, and
 * paused when off screen.
 */

const LETTERS = ['t', 'y', 'p', 'e']
/** How deep each letter goes, as a fraction of full travel (a graze to a full press). */
const DEPTHS = [0.35, 0.9, 0.55, 1]
const STEP = 0.32 // seconds between letters
const PRESS = 0.5 // seconds per press
const REST = 1.8 // seconds after the last letter
const CYCLE = (LETTERS.length - 1) * STEP + PRESS + REST

export default function TypeWord() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const play = !reduce && inView

  return (
    <span ref={ref} className="inline-block whitespace-nowrap">
      <span className="sr-only">type</span>
      {LETTERS.map((ch, i) => {
        const depth = DEPTHS[i]
        const delay = 0.9 + i * STEP
        const repeat = { repeat: Infinity, repeatDelay: CYCLE - PRESS, delay }
        return (
          <span key={i} aria-hidden className="relative inline-block">
            <motion.span
              className="inline-block"
              animate={play ? { y: ['0em', `${0.12 * depth}em`, `${0.12 * depth}em`, '0em'] } : { y: '0em' }}
              transition={play ? { duration: PRESS, times: [0, 0.25, 0.55, 1], ease: 'easeInOut', ...repeat } : { duration: 0.2 }}
            >
              {ch}
            </motion.span>
            {/* depth bar under the letter */}
            <motion.span
              className="absolute -bottom-[0.06em] left-[8%] right-[8%] h-[0.045em] origin-left rounded-full bg-accent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={
                play ? { scaleX: [0, depth, depth, 0], opacity: [0, 1, 1, 0] } : { scaleX: 0, opacity: 0 }
              }
              transition={play ? { duration: PRESS, times: [0, 0.25, 0.6, 1], ease: 'easeInOut', ...repeat } : { duration: 0.2 }}
            />
          </span>
        )
      })}
    </span>
  )
}
