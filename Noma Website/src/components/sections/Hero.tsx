import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ControlBar from '../visuals/ControlBar'
import SiteLink from '../layout/SiteLink'
import { GLASS_ACCENT } from '../../lib/glass'
import DotField from '../visuals/DotField'
import { SERIF_LINE } from '../../lib/type'
import AppIcon from '../visuals/AppIcon'
import { appProfiles } from '../../data/appProfiles'

/**
 * The claim, and the proof of it, in one screen.
 *
 * The headline is deliberately short enough to read in the time the surface
 * below takes to change once — because the surface is the argument and the
 * words are only the caption. Someone who never reads a line should still
 * understand the product from watching four controls rewrite themselves when
 * the application above them changes.
 */

/** The apps the control bar cycles through. */
const CYCLE = ['chrome', 'spotify', 'discord', 'notion']

/**
 * One timeline for the headline and the control bar (2026-10-06): the end of
 * "adapting to ___" changes on the same beat as the controls, so the
 * headline itself adapts, without adding a second rhythm of motion. It
 * starts on "you" (also what the prerendered HTML and screen readers get),
 * but only briefly: a long hold there kept visitors who scroll on quickly
 * from ever seeing the demo. Then it names what you're doing in each app as
 * the bar switches to it.
 */
const STATES: { app: number; end: string; ms: number }[] = [
  { app: 0, end: 'you', ms: 1800 },
  { app: 0, end: 'your browsing', ms: 2400 },
  { app: 1, end: 'your music', ms: 2400 },
  { app: 2, end: 'your chats', ms: 2400 },
  { app: 3, end: 'your notes', ms: 2400 },
]

/** Each distinct ending, measured once so the slot can glide between widths. */
const ENDINGS = [...new Set(STATES.map((s) => s.end))]

export default function Hero() {
  const reduceMotion = useReducedMotion()
  const [state, setState] = useState(0)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [widths, setWidths] = useState<Record<string, number> | null>(null)
  const [returned, setReturned] = useState(false)

  useEffect(() => {
    if (reduceMotion) return
    const measure = () => {
      const box = measureRef.current
      if (!box) return
      const next: Record<string, number> = {}
      box.querySelectorAll<HTMLElement>('[data-end]').forEach((el) => {
        next[el.dataset.end!] = el.getBoundingClientRect().width
      })
      setWidths(next)
    }
    measure()
    // Re-measure once the serif has loaded and whenever the size steps change.
    document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [reduceMotion])

  useEffect(() => {
    // Reduced motion gets a single, static state ("adapting to you",
    // Chrome's controls) rather than a slower loop.
    if (reduceMotion) return
    const timer = setTimeout(() => setState((s) => (s + 1) % STATES.length), STATES[state].ms)
    return () => clearTimeout(timer)
  }, [state, reduceMotion])

  // The page notices the visitor doing the thing Noma notices (2026-10-07):
  // leave for another tab or app and come back, and the caption says so,
  // while the bar moves on to the next app. None of the sites we compared
  // against react to the visitor; this is the product's idea, done live.
  useEffect(() => {
    let leftAt = 0
    let clear: ReturnType<typeof setTimeout> | undefined
    const onVisibility = () => {
      if (document.hidden) {
        leftAt = Date.now()
        return
      }
      if (!leftAt || Date.now() - leftAt < 800) return
      leftAt = 0
      setReturned(true)
      if (!reduceMotion) {
        setState((s) => {
          let next = (s + 1) % STATES.length
          while (STATES[next].app === STATES[s].app) next = (next + 1) % STATES.length
          return next
        })
      }
      clearTimeout(clear)
      clear = setTimeout(() => setReturned(false), 6000)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(clear)
    }
  }, [reduceMotion])

  const index = STATES[state].app
  const end = STATES[state].end

  return (
    <section id="top" className="relative overflow-hidden">
      <DotField className="absolute inset-0 h-full w-full" />
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[70vh]" />

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-36 sm:px-8 sm:pt-44 md:pb-32">
        <div className="relative mx-auto max-w-3xl text-center">
          {/* A soft dark backing behind the copy, so the dot field never
              sits under the words. Darkening only, no colour. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-24 -inset-y-16 -z-10 bg-[radial-gradient(ellipse_closest-side,rgb(4_5_10/0.82),rgb(4_5_10/0.55)_55%,transparent)]"
          />
          <motion.h1
            aria-label="Your computer, adapting to you."
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-balance font-display text-[2.3rem] font-medium leading-[0.98] tracking-[-0.02em] text-base-50 sm:text-6xl md:text-7xl"
          >
            Your computer,
            <br />
            {/* Two typefaces: Sora for the subject, Instrument Serif italic
                for the promise, in Noma Blue's light tint (the hero only;
                section headlines keep both lines white). */}
            <span aria-hidden className={`${SERIF_LINE} leading-none text-accent-bright`}>
              adapting to{' '}
              {/* Below md the longest endings don't fit beside "adapting
                  to", so there the ending always gets its own line. */}
              <br className="md:hidden" />
              {/* The ending sits in a slot whose width glides from one
                  ending's width to the next, so the centred line slides to
                  its new position instead of jumping (the user disliked the
                  jump). Widths are measured from the hidden copies below,
                  in the real font; until then the slot is just its text. */}
              <motion.span
                initial={false}
                animate={widths ? { width: widths[end] } : undefined}
                transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                className="relative inline-block whitespace-nowrap text-left"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={end}
                    className="inline-block"
                    initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {end}.
                  </motion.span>
                </AnimatePresence>
              </motion.span>
              <span ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0">
                {ENDINGS.map((e) => (
                  <span key={e} data-end={e} className="block w-max whitespace-nowrap">
                    {e}.
                  </span>
                ))}
              </span>
            </span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-base-300 sm:text-lg"
          >
            Noma sees which app you&apos;re in and changes your controls to match. Then it learns the sequences you repeat.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <SiteLink
              href="#beta"
              className={`inline-flex items-center rounded-full px-6 py-3 text-sm font-medium tracking-tight ${GLASS_ACCENT}`}
            >
              Get the beta
            </SiteLink>
            <SiteLink
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full border border-base-600 px-6 py-3 text-sm font-medium tracking-tight text-base-200 transition-colors hover:border-base-400 hover:text-base-50"
            >
              Watch it adapt
              <span aria-hidden className="text-base-400">↓</span>
            </SiteLink>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-14 max-w-3xl sm:mt-16"
        >
          {/* The app in front, as a dock-like row: the visitor sees the app
              change first and the controls follow, which is the product.
              Driven by the same timeline as the headline's last words. */}
          <div className="mb-4 flex items-center justify-center gap-2" aria-hidden>
            {CYCLE.map((id, i) => (
              <span
                key={id}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-500 ${
                  i === index ? 'border-white/15 bg-white/[0.07] opacity-100' : 'border-transparent opacity-35'
                }`}
              >
                <AppIcon id={id} color={appProfiles[id].color} className="h-[18px] w-[18px]" />
              </span>
            ))}
          </div>

          <ControlBar appId={CYCLE[index]} />

          <p className="relative mt-5 text-center text-sm text-base-400" aria-live="polite">
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-20 w-[30rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_closest-side,rgb(4_5_10/0.95),rgb(4_5_10/0.8)_50%,transparent)]"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={returned ? 'returned' : 'idle'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className={`inline-flex items-center gap-2 ${returned ? 'text-accent-bright' : ''}`}
              >
                {returned && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />}
                {returned
                  ? 'You just switched apps. Noma would have switched your controls too.'
                  : 'Switch apps and the controls follow.'}
              </motion.span>
            </AnimatePresence>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
