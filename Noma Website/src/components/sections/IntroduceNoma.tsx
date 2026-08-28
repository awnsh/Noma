import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import ControlChip from '../ui/ControlChip'
import { appProfiles } from '../../data/appProfiles'

const sequence = [appProfiles.vscode, appProfiles.premiere]

export default function IntroduceNoma() {
  const [index, setIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setIndex((i) => (i + 1) % sequence.length), 3600)
    return () => clearInterval(id)
  }, [reduceMotion])

  const active = sequence[index]

  return (
    <Section id="noma">
      <Reveal>
        <Kicker index="02" label="Meet Noma" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Noma adapts your interface around what you&rsquo;re doing.
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-base-700 bg-base-850/60 p-8">
          <div className="flex flex-col items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">Application</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={active.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="font-display text-lg font-medium text-base-50"
              >
                {active.name}
              </motion.p>
            </AnimatePresence>

            <div className="my-2 h-8 w-px bg-base-600" />

            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">Context</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={active.id + '-ctx'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
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
    </Section>
  )
}
