import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import ControlChip from '../ui/ControlChip'
import { appProfiles } from '../../data/appProfiles'

const sequence = [appProfiles.vscode, appProfiles.premiere]

// Observe/Recognize/Suggest are Flow's own cognitive process — tinted flow
// violet. Apply is the resulting interface change, so it stays accent blue
// (and is named "Apply," not "Adapt," so it doesn't just repeat this
// section's own subhead above it).
const flowSteps = [
  {
    label: 'Observe',
    labelClass: 'text-flow',
    body: (
      <div className="flex flex-wrap justify-center gap-2">
        {['Ctrl+C', 'Alt+Tab', 'Ctrl+V'].map((k) => (
          <ControlChip key={k} size="sm" muted>
            {k}
          </ControlChip>
        ))}
      </div>
    ),
  },
  {
    label: 'Recognize',
    labelClass: 'text-flow',
    body: (
      <div className="text-center">
        <p className="font-display text-3xl font-semibold text-flow">27&times;</p>
        <p className="mt-1 text-xs text-base-400">repetitions detected</p>
      </div>
    ),
  },
  {
    label: 'Suggest',
    labelClass: 'text-flow',
    body: <p className="text-center text-sm text-base-200">&ldquo;Turn this workflow into one control?&rdquo;</p>,
  },
  {
    label: 'Apply',
    labelClass: 'text-accent',
    body: (
      <div className="flex justify-center">
        <span className="rounded-lg bg-accent px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wide text-base-950">
          Add to Keyboard
        </span>
      </div>
    ),
  },
]

/**
 * Merges what used to be three separate sections (Meet Noma, Flow, and How
 * It Works) into one — those told the same two mechanisms (controls adapt
 * per-app; Flow learns repeated patterns) four times over between them with
 * different visuals. This tells each mechanism exactly once, back to back,
 * so the "adapt" and "learn" halves of the product read as one idea instead
 * of a scattered tour. See PRODUCT.md/session history for the full audit.
 */
export default function HowNomaWorks() {
  const [index, setIndex] = useState(0)
  const reduceMotion = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, { margin: '-20% 0px -20% 0px' })

  useEffect(() => {
    if (reduceMotion || !inView) return
    const id = setInterval(() => setIndex((i) => (i + 1) % sequence.length), 3600)
    return () => clearInterval(id)
  }, [reduceMotion, inView])

  const active = sequence[index]

  return (
    <Section id="how">
      <Reveal>
        <Kicker index="02" label="How Noma Works" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Two moving parts. One interface.
        </h2>
        <p className="mt-5 max-w-xl text-balance text-base text-base-300">
          Noma reacts to what you&rsquo;re doing right now, and Flow remembers what you keep doing. Together,
          your keyboard becomes yours.
        </p>
      </Reveal>

      {/* Part 1 — controls adapt to context, live. */}
      <Reveal delay={0.1}>
        <p className="mt-16 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">
          Your controls adapt to your context
        </p>
        <div ref={cardRef} className="mx-auto mt-6 max-w-md rounded-2xl border border-base-700 bg-base-850/60 p-8">
          <div className="flex flex-col items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">Application</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2"
              >
                {active.color && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: active.color }} />}
                <p className="font-display text-lg font-medium text-base-50">{active.name}</p>
              </motion.div>
            </AnimatePresence>

            <div className="my-2 h-8 w-px bg-base-600" />

            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">Context</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={active.id + '-ctx'}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono text-xs text-accent"
              >
                {active.id === 'vscode' ? 'Development' : 'Video Editing'}
              </motion.p>
            </AnimatePresence>

            <div className="my-2 h-8 w-px bg-base-600" />

            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">Controls</span>
            <motion.div layout className="mt-1 grid w-full grid-cols-2 gap-2">
              <AnimatePresence mode="popLayout">
                {active.controls.map((c) => (
                  <motion.div
                    key={active.id + c}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ControlChip size="sm" active>
                      {c}
                    </ControlChip>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </Reveal>

      {/* A drawn-in connector — visually ties the two halves together into
          one continuous idea instead of two demos stacked with a gap. */}
      <Reveal delay={0.05} className="mx-auto flex w-px justify-center">
        <motion.span
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'top' }}
          className="my-8 h-12 w-px bg-gradient-to-b from-base-600 to-flow/50"
        />
      </Reveal>

      {/* Part 2 — Flow learns what you repeat. */}
      <Reveal delay={0.1}>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">
          Flow learns what you repeat
        </p>
        <p className="mx-auto mt-3 max-w-lg text-balance text-center text-sm text-base-400">
          Flow watches approved interaction metadata to notice patterns in how you work &mdash; never what you
          type, only how you work.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-4 sm:gap-4">
          {flowSteps.map((step, i) => (
            <Reveal key={step.label} delay={i * 0.1} className="relative">
              <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-base-700 bg-base-850/60 p-6">
                <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${step.labelClass}`}>{step.label}</span>
                <div className="flex flex-1 items-center">{step.body}</div>
              </div>
              {i < flowSteps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-base-500 sm:block"
                >
                  &rarr;
                </span>
              )}
            </Reveal>
          ))}
        </div>
      </Reveal>
    </Section>
  )
}
