import { motion } from 'framer-motion'
import Button from '../ui/Button'
import KeyboardVisual from '../visuals/KeyboardVisual'

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-40 pb-20 sm:pt-48">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] hero-glow" />

      <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-3"
        >
          <span className="h-px w-8 bg-accent/50" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-base-300">
            Adaptive Computer Interface
          </span>
          <span className="h-px w-8 bg-accent/50" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 text-balance font-display text-[clamp(2.5rem,5.5vw,4rem)] font-semibold leading-[1.08] tracking-tight text-base-50"
        >
          Your computer changes.
          <br />
          <span className="text-accent">Your interface should too.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 max-w-xl text-balance text-lg text-base-300"
        >
          Noma is an adaptive computer interface that learns how you work and changes the controls around you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
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
        transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-20 max-w-4xl px-6 sm:px-8"
      >
        <div aria-hidden className="absolute -inset-x-10 -inset-y-16 -z-10 bg-grid-fade" />
        <KeyboardVisual />
        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-base-400">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Hardware concept &mdash; in development
        </div>
      </motion.div>
    </section>
  )
}
