import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Section from '../layout/Section'
import Reveal from '../ui/Reveal'

const steps = [
  { label: 'Observe', body: 'Noma sees the patterns you repeat.' },
  { label: 'Learn', body: 'Noma identifies useful workflows.' },
  { label: 'Adapt', body: 'Your interface changes around you.' },
  { label: 'Execute', body: 'One action instead of five.' },
]

/**
 * A compact recap, not a fourth retelling — Watch/Learn (`AdaptiveIntelligence`)
 * and Adapt (`ProductDemo`) already demonstrated each of these beats in full;
 * this is the one-line diagram that names the whole loop at a glance and
 * hands off to "so where does Execute actually happen" (Holo, then Device).
 * The connecting line draws in via a scroll-linked `scaleX` (a transform key,
 * confirmed safe for live scroll binding — see noma-website-project memory on
 * the framer-motion opacity-in-style bug this deliberately avoids) rather
 * than pinning: missing part of a line mid-scroll costs nothing, unlike the
 * flagship demos where the content itself is the point.
 */
export default function NomaLoop() {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.6'] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <Section id="loop">
      <Reveal>
        <h2 className="mx-auto max-w-xl text-balance text-center font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          The Noma loop.
        </h2>
      </Reveal>

      <div ref={ref} className="relative mx-auto mt-16 max-w-4xl">
        <div aria-hidden className="absolute left-0 right-0 top-[15px] hidden h-px bg-base-700 sm:block" />
        {!reduceMotion && (
          <motion.div
            aria-hidden
            style={{ scaleX: lineScale }}
            className="absolute left-0 right-0 top-[15px] hidden h-px origin-left bg-accent sm:block"
          />
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8">
          {steps.map((step, i) => (
            <Reveal key={step.label} delay={i * 0.1}>
              <div className="flex flex-col items-start sm:items-center sm:text-center">
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-base-950 font-mono text-xs text-accent">
                  {i + 1}
                </span>
                <p className="mt-4 font-display text-lg font-semibold text-base-50">{step.label}</p>
                <p className="mt-1.5 max-w-[16ch] text-sm text-base-400">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
