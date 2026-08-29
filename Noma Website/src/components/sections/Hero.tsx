import { motion, useReducedMotion } from 'framer-motion'
import Button from '../ui/Button'
import KeyboardVisual from '../visuals/KeyboardVisual'

// Reuses the same three features the Hardware section explains in full — this
// is the teaser, not a second copy of the writing. Positioned as percentages
// of the keyboard illustration's own box, left/right chosen so none of the
// three leader lines cross.
const callouts: { x: number; y: number; side: 'left' | 'right'; label: string }[] = [
  { x: 24, y: 80, side: 'left', label: 'Core Input' },
  { x: 89, y: 26, side: 'right', label: 'Vertical OLED Strip' },
  { x: 97, y: 55, side: 'right', label: 'Pin-Connector Docking' },
]

export default function Hero() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="top" className="relative overflow-hidden pt-40 pb-20 sm:pt-48">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] hero-glow" />

      <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance font-display text-[clamp(2.75rem,6vw,4.5rem)] font-medium leading-[1.08] tracking-tight text-base-50"
        >
          Your interface should adapt to <span className="text-accent">you.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 max-w-xl text-balance text-lg text-base-300"
        >
          Noma is an adaptive computer interface that learns how you work and evolves around your workflow.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button href="#demo" variant="primary">
            Explore Noma
          </Button>
          <Button href="#how" variant="secondary">
            See How It Works
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-20 max-w-4xl px-6 sm:px-8"
      >
        <div aria-hidden className="absolute -inset-x-10 -inset-y-16 -z-10 bg-grid-fade" />
        <KeyboardVisual />

        {/* Scroll-revealed callouts — the moment you scroll past the board, it
            gets annotated like a spec sheet, one label at a time. */}
        <div aria-hidden className="pointer-events-none absolute inset-6 hidden sm:inset-8 lg:block">
          {callouts.map((c, i) => (
            <div key={c.label} className="absolute" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
              <span className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
              {!reduceMotion && (
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.7 }}
                  viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
                  transition={{ duration: 0.01, delay: 0.3 + i * 0.18 }}
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-accent"
                />
              )}
              <motion.div
                initial={{ opacity: 0, x: reduceMotion ? 0 : c.side === 'left' ? 6 : -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
                transition={{ duration: reduceMotion ? 0.01 : 0.5, delay: 0.3 + i * 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute flex items-center gap-2 whitespace-nowrap ${
                  c.side === 'right' ? 'left-2' : 'right-2 flex-row-reverse'
                }`}
                style={{ top: 0, transform: 'translateY(-50%)' }}
              >
                <span className="h-px w-6 bg-accent/40" />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-base-300">[{c.label}]</span>
              </motion.div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-base-400">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Hardware concept &mdash; in development
        </div>
      </motion.div>
    </section>
  )
}
