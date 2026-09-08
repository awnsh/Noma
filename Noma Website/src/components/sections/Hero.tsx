import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
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
  const sectionRef = useRef<HTMLElement>(null)

  // A genuine scroll-linked parallax (not a one-time reveal-on-enter like
  // every other section uses) — the board drifts up slightly slower than
  // the page and settles as it clears the viewport, so the very first
  // scroll on the site already feels considered, not just a fade-in.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const boardY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -56])
  const boardOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0])

  return (
    <section ref={sectionRef} id="top" className="relative overflow-hidden pt-40 pb-20 sm:pt-48">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] hero-glow" />

      <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-8">
        {/* Pushed noticeably bigger/bolder than before (clamp ceiling
            4rem→5.75rem, tighter leading) — part of a pass modeling this
            site's structure after naya.tech's monumental, product-first
            hero type, built in Noma's own font/color, not a new scale
            borrowed wholesale. */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance font-display text-[clamp(2.75rem,7.5vw,5.75rem)] font-medium leading-[1.03] tracking-tight text-base-50"
        >
          {/* A slight top-to-bottom gradient, not flat `text-accent` — by
              request, the one accent-colored emphasis span on the page
              (the site's only other `text-accent` uses are small hover
              states/badges, not headline emphasis) gets a subtle glossy
              sheen instead of a flat fill. Two existing accent tokens, not
              a new color. */}
          Your keyboard knows{' '}
          <span className="bg-gradient-to-b from-accent-bright to-accent bg-clip-text text-transparent">what you're doing.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 max-w-xl text-balance text-lg text-base-300"
        >
          Noma adapts its controls to the app you're using.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row"
        >
          <Button href="#cta" variant="primary">
            Join the waitlist
          </Button>
          {/* A scroll cue, not a second nav-jump button — brief called this
              out as a "secondary interaction," quieter than the primary CTA,
              so it uses the ghost variant rather than a second bordered
              button competing for the same visual weight. */}
          <Button href="#demo" variant="ghost">
            Scroll to see it work ↓
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-20 max-w-6xl px-6 sm:px-8"
      >
        {/* Widened from max-w-4xl — the illustration reads as the dominant
            product shot now (naya.tech's own hero puts its hardware/software
            renders large and front-and-center), not a smaller supporting
            visual under the headline. */}
        {/* The continuous scroll-linked parallax lives on its own inner
            element, separate from the one-time entrance above — mixing a
            live scroll-bound `style` value with a declarative `animate` on
            the same node fights itself. */}
        <motion.div style={{ y: boardY, opacity: boardOpacity }} className="relative">
          <div aria-hidden className="absolute -inset-x-10 -inset-y-16 -z-10 bg-grid-fade" />
          {/* A random key flashes "pressed" as you scroll past — the same
              scrollYProgress already driving the parallax above, reused
              rather than a second scroll listener. See KeyboardVisual's
              typingProgress doc comment for why this is scroll-driven
              instead of a background timer. */}
          <KeyboardVisual typingProgress={scrollYProgress} />

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
        </motion.div>

        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-base-400">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Hardware concept &mdash; in development
        </div>
      </motion.div>
    </section>
  )
}
