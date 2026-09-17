import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Reveal from '../ui/Reveal'

const STEPS = ['Idea', 'Prototype', 'Logitech', 'Rethink', 'Noma']

/**
 * "Noma wasn't supposed to look like this." — the founder story, told as
 * a short timeline rather than a wall of text. Kept tasteful on purpose:
 * this names what happened without attacking a competitor — Logitech
 * shipping something close to the original idea is the plot point, not
 * the villain. The connecting line draws in via a scroll-linked `scaleX`
 * transform (never `width`/`opacity` directly — see this site's own
 * notes on the framer-motion opacity-in-style bug this avoids).
 */
export default function FounderStory() {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.6'] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="story" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <Reveal className="text-center">
          <h2 className="text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Noma wasn&rsquo;t supposed to look like this.
          </h2>
        </Reveal>

        <div ref={ref} className="relative mx-auto mt-16 max-w-lg">
          <div aria-hidden className="absolute left-0 right-0 top-[11px] hidden h-px bg-base-700 sm:block" />
          {!reduceMotion && (
            <motion.div
              aria-hidden
              style={{ scaleX: lineScale }}
              className="absolute left-0 right-0 top-[11px] hidden h-px origin-left bg-accent sm:block"
            />
          )}
          <div className="grid grid-cols-5 gap-x-2">
            {STEPS.map((step, i) => (
              <Reveal key={step} delay={i * 0.08}>
                <div className="flex flex-col items-center text-center">
                  <span className="relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-accent/40 bg-base-950 font-mono text-[10px] text-accent">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-base-300 sm:text-xs">{step}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.15}>
          <div className="mx-auto mt-16 max-w-md space-y-4 text-center text-base leading-relaxed text-base-400">
            <p>We started by building a new kind of productivity keyboard.</p>
            <p>Then Logitech released a product surprisingly close to what we were building.</p>
            <p>So we went back to the drawing board.</p>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mx-auto mt-14 max-w-md border-t border-base-800 pt-10 text-center">
            <p className="text-balance font-display text-xl font-medium leading-snug text-base-400 sm:text-2xl">
              The keyboard wasn&rsquo;t the idea.
            </p>
            <p className="mt-1 text-balance font-display text-xl font-semibold leading-snug text-base-50 sm:text-2xl">
              The intelligence was.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
