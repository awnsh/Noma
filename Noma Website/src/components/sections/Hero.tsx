import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import KeyboardVisual from '../visuals/KeyboardVisual'
import { GLASS_ACCENT } from '../../lib/glass'

/**
 * 2026 ground-up redesign — the opening cinematic moment, not a hero packed
 * with two CTAs and a headline competing with a device shot. One claim, one
 * action, and the product itself doing the rest of the talking:
 *
 *  1. Page opens dark and quiet — no immediate flash of content.
 *  2. The keyboard fades in first, alone, before any copy — it's the
 *     subject of the sentence that hasn't been said yet.
 *  3. The screen "powers on" a beat later (real component state, not a
 *     video loop): `controls` starts empty, then fills with VS Code's real
 *     controls via `KeyboardVisual`'s own scan-line transition — the exact
 *     mechanic every other section already uses to show Noma reacting,
 *     reused here as "it just turned on" instead of "it just adapted."
 *  4. The headline and supporting line settle in last, once there's
 *     something worth reading them next to.
 *
 * Parallax is a single, slow, small translateY tied to scroll — "very slow
 * camera movement," not a layered 3D scene. No pin-connector strips
 * (`showPinConnectors={false}`): modular hardware isn't part of this story.
 */
const HEADLINE_DELAY_MS = 900
const POWER_ON_DELAY_MS = 1500

export default function Hero() {
  const reduceMotion = useReducedMotion()
  const [poweredOn, setPoweredOn] = useState(reduceMotion ?? false)
  const [showCopy, setShowCopy] = useState(reduceMotion ?? false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const keyboardY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 90])
  const keyboardOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2])

  useEffect(() => {
    if (reduceMotion) return
    const powerTimer = setTimeout(() => setPoweredOn(true), POWER_ON_DELAY_MS)
    const copyTimer = setTimeout(() => setShowCopy(true), HEADLINE_DELAY_MS)
    return () => {
      clearTimeout(powerTimer)
      clearTimeout(copyTimer)
    }
  }, [reduceMotion])

  return (
    <div id="top" ref={sectionRef} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-base-950 pt-32 sm:pt-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] hero-glow" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 text-center sm:px-8">
        <motion.h1
          initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
          animate={showCopy ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance font-display text-[clamp(2.25rem,6vw,4.25rem)] font-semibold leading-[1.05] tracking-tight text-base-50"
        >
          A keyboard that understands
          <br className="hidden sm:block" /> what you&rsquo;re doing.
        </motion.h1>

        <motion.p
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={showCopy ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-xl text-balance text-base text-base-300 sm:text-lg"
        >
          Noma adapts to the apps, workflows, and tasks you&rsquo;re working on, giving you the right controls
          when you need them.
        </motion.p>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={showCopy ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9"
        >
          <a href="#waitlist" className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium ${GLASS_ACCENT}`}>
            Join the Waitlist <span aria-hidden>&rarr;</span>
          </a>
        </motion.div>
      </div>

      <motion.div
        style={{ y: keyboardY, opacity: reduceMotion ? 1 : keyboardOpacity }}
        initial={reduceMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto mt-16 w-full max-w-4xl px-6 pb-20 sm:px-10"
      >
        <KeyboardVisual
          appName="VS Code"
          controls={poweredOn ? ['Run', 'Debug', 'Terminal', 'Search'] : []}
          glow
          float
          showPinConnectors={false}
        />
      </motion.div>

      <Reveal delay={reduceMotion ? 0 : 1.6} className="relative z-10 mx-auto mb-10 hidden text-xs text-base-500 sm:block">
        Scroll to see it work &darr;
      </Reveal>
    </div>
  )
}

// A tiny inline variant of ui/Reveal.tsx that fires once on mount (not on
// scroll-into-view) — this line is already in the first viewport, so
// "reveal on scroll" would never fire without the visitor scrolling first,
// which defeats the point of a scroll *hint*.
function Reveal({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay }}
      className={className}
    >
      {children}
    </motion.p>
  )
}
