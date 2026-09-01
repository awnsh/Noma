import { motion } from 'framer-motion'
import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import ModuleEnclosure, { type ModuleType } from '../visuals/ModuleEnclosure'

const modules: { type: ModuleType; name: string; lines: string[] }[] = [
  { type: 'rotary', name: 'Rotary Encoder Module', lines: ['Turn — Timeline Zoom', 'Press — Play / Pause'] },
  { type: 'button', name: 'Button Module', lines: ['Four programmable buttons'] },
  { type: 'slider', name: 'Slider Module', lines: ['Brush Size'] },
]

export default function Modules() {
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

      {/* One line, not a second full "Flow noticed something" demo — that
          moment is already told in full in the How Noma Works section
          above. The new information here is narrow: Flow's suggestions
          aren't limited to software controls, they can reach for a
          physical module too. */}
      <Reveal delay={0.1}>
        <div className="mx-auto mt-14 flex max-w-2xl items-start gap-3 rounded-2xl border border-flow/30 bg-flow/[0.05] px-6 py-4">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flow" aria-hidden />
          <p className="text-sm text-base-200">
            Flow&rsquo;s suggestions aren&rsquo;t limited to software controls.{' '}
            <span className="text-base-400">
              &ldquo;You keep adjusting numeric values &mdash; consider a rotary encoder.&rdquo;
            </span>
          </p>
        </div>
      </Reveal>
    </Section>
  )
}
