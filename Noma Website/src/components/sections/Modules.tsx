import { useState } from 'react'
import { motion } from 'framer-motion'
import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import ModuleEnclosure, { type ModuleType } from '../visuals/ModuleEnclosure'
import KeyboardVisual, { KEYBOARD_RIGHT_DOCK } from '../visuals/KeyboardVisual'

const modules: { type: ModuleType; name: string; lines: string[] }[] = [
  { type: 'rotary', name: 'Rotary Encoder Module', lines: ['Turn — Timeline Zoom', 'Press — Play / Pause'] },
  { type: 'button', name: 'Button Module', lines: ['Four programmable buttons'] },
  { type: 'slider', name: 'Slider Module', lines: ['Brush Size'] },
]

export default function Modules() {
  const [attached, setAttached] = useState(false)
  const [recognized, setRecognized] = useState(false)

  const toggle = () => {
    if (attached) {
      setAttached(false)
      setRecognized(false)
    } else {
      setAttached(true)
    }
  }

  return (
    <Section id="modules">
      <Reveal>
        <Kicker index="06" label="Modular System" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Your work. Your interface.
        </h2>
        <p className="mt-5 max-w-xl text-balance text-base text-base-300">
          The keyboard, OLED strip, and two encoders are permanent. Separate physical modules attach around them
          and take on whatever role your workflow needs.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {modules.map((m, i) => (
          <Reveal key={m.name} delay={i * 0.06}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full flex-col gap-4 rounded-2xl border border-base-700 bg-base-850/60 p-6"
            >
              <ModuleEnclosure type={m.type} className="h-16 w-20" />
              <div>
                <p className="text-sm font-medium text-base-100">{m.name}</p>
                <div className="mt-2 space-y-0.5">
                  {m.lines.map((l) => (
                    <p key={l} className="font-mono text-[11px] text-base-400">
                      {l}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>

      {/* Adaptive hardware: Flow can suggest new physical modules, not just software controls. */}
      <Reveal delay={0.1}>
        <div className="mx-auto mt-20 max-w-2xl overflow-hidden rounded-2xl border border-accent/30 bg-accent/[0.04] p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Flow noticed something</p>
          <p className="mt-3 text-base text-base-100">&ldquo;You frequently adjust numeric values.&rdquo;</p>
          <p className="mt-1 text-sm text-base-400">Consider adding a rotary encoder.</p>

          <div className="relative mx-auto mt-10 max-w-md pr-10 sm:pr-14">
            <KeyboardVisual
              glow={false}
              float={false}
              readout={recognized ? { label: 'ROTARY 1', sub: 'TIMELINE' } : null}
              dockedRight={recognized}
            />
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${KEYBOARD_RIGHT_DOCK.xPct}%`, top: `${KEYBOARD_RIGHT_DOCK.yPct}%` }}
            >
              <motion.div
                animate={attached ? { x: '0%', rotate: 0, scale: [1, 1.1, 1] } : { x: '85%', rotate: -8, scale: 1 }}
                transition={
                  attached
                    ? { duration: 0.75, times: [0, 0.65, 1], ease: [0.16, 1, 0.3, 1] }
                    : { duration: 0.4, ease: 'easeOut' }
                }
                onAnimationComplete={() => {
                  if (attached) setRecognized(true)
                }}
              >
                <ModuleEnclosure type="rotary" active={recognized} className="w-24 drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)] sm:w-28" />
              </motion.div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-lg border border-base-500 px-5 py-2.5 text-sm font-medium text-base-100 transition-colors hover:border-accent hover:text-accent"
            >
              {recognized ? 'Added to Noma' : 'Add Rotary Encoder'}
            </button>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
