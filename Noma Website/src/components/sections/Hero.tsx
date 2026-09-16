import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import Button from '../ui/Button'
import KeyboardVisual from '../visuals/KeyboardVisual'
import AppIcon from '../visuals/AppIcon'
import { appProfiles } from '../../data/appProfiles'

// Reuses the same three features the Device section explains in full — this
// is the teaser, not a second copy of the writing. Positioned as percentages
// of the keyboard illustration's own box, left/right chosen so none of the
// three leader lines cross.
const callouts: { x: number; y: number; side: 'left' | 'right'; label: string }[] = [
  { x: 24, y: 80, side: 'left', label: 'Core Input' },
  { x: 89, y: 26, side: 'right', label: 'Vertical OLED Strip' },
  { x: 97, y: 55, side: 'right', label: 'Pin-Connector Docking' },
]

// The apps orbiting the hero visual on the way in — the ones the rest of the
// site's demos actually use (vscode/chrome/claude/github/terminal), so this
// isn't a promise of integrations that appear nowhere else on the page. Each
// starts at its own offset and converges toward the keyboard as the visitor
// scrolls, ending scaled to nothing right around where the board's own
// parallax fade finishes — visually "becoming" the controls already lit up
// on its screen, rather than two unrelated animations racing each other.
const ORBIT_APPS: { id: string; from: { x: number; y: number; rotate: number } }[] = [
  { id: 'vscode', from: { x: -230, y: -70, rotate: -12 } },
  { id: 'chrome', from: { x: 220, y: -90, rotate: 10 } },
  { id: 'claude', from: { x: -250, y: 90, rotate: 8 } },
  { id: 'github', from: { x: 250, y: 80, rotate: -8 } },
  { id: 'terminal', from: { x: 0, y: -150, rotate: 0 } },
]

function OrbitIcon({
  id,
  from,
  progress,
  reduceMotion,
}: {
  id: string
  from: { x: number; y: number; rotate: number }
  progress: MotionValue<number>
  reduceMotion: boolean | null
}) {
  const profile = appProfiles[id]
  // Every value driven here is transform-based (x/y/scale/rotate), never a
  // bare `opacity` in a `style` object — see noma-website-project memory: a
  // Framer Motion value bound declaratively to `style.opacity` alone doesn't
  // update the DOM in this project's exact React/Framer versions, while
  // transform-ish keys do. Scaling to 0 achieves the same "disappears" effect
  // without touching the broken path at all.
  const x = useTransform(progress, [0, 0.42], [from.x, 0])
  const y = useTransform(progress, [0, 0.42], [from.y, 0])
  const rotate = useTransform(progress, [0, 0.42], [from.rotate, 0])
  const scale = useTransform(progress, [0, 0.32, 0.44], [1, 1, 0])

  if (reduceMotion) return null

  return (
    <motion.div
      style={{ x, y, rotate, scale }}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-2xl border backdrop-blur-sm sm:h-12 sm:w-12"
        style={{ borderColor: `${profile.color}40`, backgroundColor: `${profile.color}14` }}
      >
        <AppIcon id={id} color={profile.color} className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </motion.div>
  )
}

export default function Hero() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  // A genuine scroll-linked parallax (not a one-time reveal-on-enter like
  // every other section uses) — the board drifts up slightly slower than
  // the page and settles as it clears the viewport, so the very first
  // scroll on the site already feels considered, not just a fade-in. The
  // orbiting app icons below reuse this exact same progress value rather
  // than a second scroll listener.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const boardY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -56])
  const boardOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0])

  return (
    <section ref={sectionRef} id="top" className="relative overflow-hidden pt-40 pb-20 sm:pt-48">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] hero-glow" />

      <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance font-display text-[clamp(2.5rem,7.5vw,5.5rem)] font-medium leading-[1.02] tracking-tight text-base-50"
        >
          Your computer should learn
          <br />
          <span className="bg-gradient-to-b from-accent-bright to-accent bg-clip-text text-transparent">how you work.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 max-w-xl text-balance text-lg text-base-300"
        >
          Noma watches the way you use your computer, learns the workflows you repeat, and builds an interface
          around you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row"
        >
          <Button href="#holo" variant="primary">
            Try Noma Free
          </Button>
          <Button href="#device" variant="ghost">
            Meet Noma Device →
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-20 max-w-6xl px-6 sm:px-8"
      >
        {/* The continuous scroll-linked parallax lives on its own inner
            element, separate from the one-time entrance above — mixing a
            live scroll-bound `style` value with a declarative `animate` on
            the same node fights itself. */}
        <motion.div style={{ y: boardY, opacity: boardOpacity }} className="relative">
          <div aria-hidden className="absolute -inset-x-10 -inset-y-16 -z-10 bg-grid-fade" />

          {/* App icons orbiting in and converging toward the board as you
              scroll — the visual argument for the headline: every one of
              these becomes a control on the same physical keyboard. Sits
              behind the board (`-z-10`) so it reads as arriving at it, not
              floating in front of the illustration. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden sm:block">
            {ORBIT_APPS.map((o) => (
              <OrbitIcon key={o.id} id={o.id} from={o.from} progress={scrollYProgress} reduceMotion={reduceMotion} />
            ))}
          </div>

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
          Noma Device &mdash; in development
        </div>
      </motion.div>
    </section>
  )
}
