import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Section from '../layout/Section'
import SectionIntro from '../ui/SectionIntro'
import { MoveScene, NoticeScene, StepWindow, WorkScene, ZoneScene } from '../visuals/StepScenes'
import AppIcon from '../visuals/AppIcon'
import nomaMark from '../../assets/noma-mark.png'

/**
 * Each step's mark, instead of a 1-2-3-4 counter (2026-10-07: numbered step
 * lists were on most of the YC sites we compared against). It shows what
 * the step is about: the app you're in, Noma, the four zones, switching.
 */
function StepGlyph({ step }: { step: number }) {
  if (step === 0) return <AppIcon id="chrome" color="#4c8bf5" className="h-4 w-4 text-[11px]" />
  if (step === 1) return <img src={nomaMark} alt="" className="h-3.5 w-auto" />
  if (step === 2)
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="1.2" />
      </svg>
    )
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3" />
    </svg>
  )
}

/**
 * How it works, played by scrolling (2026-10-06, after raisedhand.ai): on
 * wide screens the four steps scroll past on the left while a Noma window
 * stays pinned on the right and plays whichever step is in the middle of
 * the screen. On phones each step simply has its own window under it.
 * Pinning is CSS sticky, which needs html/body to use overflow-x: clip,
 * not hidden (see index.css).
 */

const STEPS = [
  { title: 'Work normally', body: 'Use your computer the way you already do.', window: 'Your apps', Scene: WorkScene },
  { title: 'Noma notices', body: 'Which shortcuts, in which app, in what order. Never what you type.', window: 'Noma', Scene: NoticeScene },
  { title: 'Make it yours', body: 'Turn a repeated workflow into one press, on the zone you choose.', window: 'Noma', Scene: ZoneScene },
  { title: 'Keep moving', body: 'Your controls follow you from app to app, and change as you do.', window: 'Noma', Scene: MoveScene },
]

export default function HowItWorks() {
  const [active, setActive] = useState(0)
  const Current = STEPS[active]

  return (
    <Section id="how" bare>
      <SectionIntro title="How it works." />

      <div className="mt-10 grid grid-cols-1 gap-10 lg:mt-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <ol>
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              onViewportEnter={() => setActive(index)}
              viewport={{ margin: '-45% 0px -45% 0px' }}
              className="flex flex-col justify-center py-8 lg:min-h-[62vh] lg:py-0"
            >
              <div className={`flex gap-5 transition-opacity duration-500 ${index === active ? 'lg:opacity-100' : 'lg:opacity-35'}`}>
                <span
                  className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border transition-colors duration-500 ${
                    index === active ? 'border-accent/60 bg-accent/15 text-accent-bright' : 'border-base-600 bg-base-850 text-base-400'
                  }`}
                >
                  <StepGlyph step={index} />
                </span>
                <div>
                  <h3 className="font-display text-2xl font-medium tracking-[-0.02em] text-base-50 sm:text-3xl">{step.title}</h3>
                  <p className="mt-3 max-w-sm text-base leading-relaxed text-base-300">{step.body}</p>
                </div>
              </div>
              {/* Phones and tablets: the step's own window, right under it. */}
              <div className="mt-6 lg:hidden">
                <StepWindow title={step.window}>
                  <step.Scene />
                </StepWindow>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="hidden lg:block">
          <div className="sticky top-[calc(50vh-200px)]">
            <StepWindow title={Current.window}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex w-full justify-center"
                >
                  <Current.Scene />
                </motion.div>
              </AnimatePresence>
            </StepWindow>
          </div>
        </div>
      </div>
    </Section>
  )
}
