import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Explainer from '../components/home/Explainer'
import Overview from '../components/home/Overview'
import Stage from '../components/home/Stage'
import TypeWord from '../components/home/TypeWord'
import Reveal from '../components/ui/Reveal'
import WaitlistForm from '../components/ui/WaitlistForm'
import SiteLink from '../components/layout/SiteLink'
import { BUILD_LINKS } from '../data/config'

/**
 * 2026-11-12, focused pass: four sections, all on the renders' own #050505.
 *
 *   Hero       what it is: the claim, the waitlist, and the side render with
 *              each key labelled by how far it went (the point, in one image)
 *   Explainer  why it's different, pinned and scroll-driven (Explainer.tsx):
 *              magnet + sensor per key, the switch pressing, per-key tuning
 *   Overview   the payoff on the renders (a missed key caught, a brushed key
 *              ignored), the product in four lines,
 *              and the one-line teaser
 *   Waitlist   signup + built in public
 *
 * Kept off the page: how mistake-fixing works, specs, prices, dates,
 * competitors, any investor badge. Renders are labelled as concepts.
 */

const EASE = [0.25, 1, 0.5, 1] as const

function HeroIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}


export default function Home() {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  // the product eases back as you scroll on into the explainer
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.9])
  const fade = useTransform(scrollYProgress, [0.4, 1], [1, reduce ? 1 : 0.2])

  return (
    <div className="band-dark">
      {/* HERO */}
      <section id="top" ref={heroRef} className="relative mx-auto max-w-6xl px-4 pt-32 sm:px-8 sm:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <HeroIn>
            <h1 className="font-wide mx-auto max-w-[14ch] text-balance text-[clamp(2.9rem,8vw,6.25rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-ink">
              A keyboard that learns how you <TypeWord />.
            </h1>
          </HeroIn>
          <HeroIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-[44ch] text-pretty text-[clamp(1.05rem,1.5vw,1.25rem)] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Types what you meant.</span> Every key knows how far you pressed it,
              and Noma tunes each one to the way you type. Fewer mistakes, nothing to set up.
            </p>
          </HeroIn>
          <HeroIn delay={0.18} className="mt-8 flex justify-center">
            <WaitlistForm center />
          </HeroIn>
        </div>

        <HeroIn delay={0.3} className="-mx-4 sm:-mx-8">
          <motion.div className="overflow-hidden" style={{ scale, opacity: fade }}>
            <Stage
              name="profile"
              className="-ml-[22%] w-[175%] sm:ml-0 sm:w-full"
              priority
              alt="Concept render, side view of the Noma keyboard with keys pressed to different depths, each labelled with how far it travelled."
              depths={[
                { x: 14.5, y: 20, mm: 0 },
                { x: 32.1, y: 24, mm: 0.8 },
                { x: 48.3, y: 27, mm: 2.1 },
                { x: 56.4, y: 29.2, mm: 3.9, accent: true },
              ]}
            />
          </motion.div>
        </HeroIn>
        <p className="-mt-2 pb-4 text-center text-[12px] text-faint sm:-mt-6">
          Concept render. Every key reports how far it went.
        </p>
      </section>

      {/* WHY IT'S DIFFERENT */}
      <Explainer />

      {/* IN ONE LOOK: the closing summary of what it is */}
      <Overview />

      {/* WAITLIST + BUILD */}
      <section id="waitlist" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8 sm:py-36">
          <Reveal>
            <h2 className="font-wide mx-auto max-w-[13ch] text-balance text-[clamp(2.6rem,6.5vw,5rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-ink">
              Be one of the first to type on it.
            </h2>
            <p className="mx-auto mt-5 max-w-[40ch] text-pretty text-[17px] leading-relaxed text-muted">
              Join the waitlist for build updates and a first look when it’s ready.
            </p>
            <div className="mt-8 flex justify-center">
              <WaitlistForm center />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div id="build" className="mx-auto mt-20 max-w-2xl scroll-mt-24 border-t border-line pt-10">
              <p className="label-xs text-faint">Built in public</p>
              <p className="mx-auto mt-3 max-w-[44ch] text-pretty text-[17px] leading-relaxed text-muted">
                Noma is designed by one person, in the open. Every test and every wrong turn gets shared as it happens.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {BUILD_LINKS.map((l) =>
                  l.href ? (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center rounded-full border border-ink px-5 text-[15px] font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <span
                      key={l.label}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-[15px] text-faint"
                    >
                      {l.label}
                      <span className="text-[11px] uppercase tracking-[0.08em]">soon</span>
                    </span>
                  ),
                )}
              </div>
              <SiteLink
                href="/contact"
                className="mt-6 inline-block text-[15px] text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink"
              >
                Say hello
              </SiteLink>
            </div>
          </Reveal>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-10 text-center text-[13px] text-faint sm:px-8">
          Product images are concept renders. Drawings and numbers illustrate how tuning works; they are not measurements
          or specifications.
        </p>
      </section>
    </div>
  )
}
