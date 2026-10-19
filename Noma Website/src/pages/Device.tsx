import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import Reveal from '../components/ui/Reveal'
import SiteLink from '../components/layout/SiteLink'
import WaitlistForm from '../components/ui/WaitlistForm'
import KeyboardVisual from '../components/visuals/KeyboardVisual'
import { appProfiles } from '../data/appProfiles'

/**
 * The hardware's own page (2026-10-06: moved off the homepage at the user's
 * request, which now only says it is coming and links here). Says what it is
 * and that it is coming, and stays honest per PRODUCT.md: in development, not
 * for sale, no date.
 *
 * The board runs the same app cycle as the homepage's surfaces, so its
 * display visibly follows the software rather than demonstrating itself.
 */

const CYCLE = ['chrome', 'spotify', 'discord']
const DWELL_MS = 3000

const POINTS = [
  { title: 'Four keys and a display', detail: 'It sits beside your keyboard. The display shows what each key does right now.' },
  { title: 'Nothing to assign', detail: 'Switch apps and the keys change. Flow decides what goes on them.' },
  { title: 'Same software', detail: 'It runs on the Noma app you can download today.' },
]

export default function Device() {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % CYCLE.length), DWELL_MS)
    return () => clearInterval(timer)
  }, [reduceMotion])

  const app = appProfiles[CYCLE[index]]

  return (
    <div className="border-t border-base-800 bg-base-950 pb-24 pt-40 sm:pt-48">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-sm font-medium text-base-400">Noma Device</p>
            <h1 className="mt-3 text-balance font-display text-[clamp(2.2rem,6vw,4rem)] font-medium leading-[1.04] tracking-[-0.02em] text-base-50">
              Your controls,
              <br />
              as physical keys.
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-base-700 px-4 py-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-sm text-base-300">Coming soon, not for sale yet</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="relative mx-auto mt-16 max-w-3xl">
            <KeyboardVisual appName={app.shortName} controls={app.controls} showPinConnectors={false} glow float />
          </div>
        </Reveal>

        <div className="mx-auto mt-20 grid max-w-4xl gap-10 sm:grid-cols-3 sm:gap-8">
          {POINTS.map((point, i) => (
            <Reveal key={point.title} delay={0.06 * i}>
              <h2 className="font-display text-lg font-semibold tracking-tight text-base-50">{point.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-base-400">{point.detail}</p>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mx-auto mt-24 max-w-md border-t border-base-800 pt-12 text-center">
            <p className="font-display text-xl font-semibold tracking-tight text-base-50">Get an email when it&apos;s ready.</p>
            <div className="mt-6">
              <WaitlistForm submitLabel="Notify me" />
            </div>
            <p className="mt-8 text-sm text-base-400">
              Want it now?{' '}
              <SiteLink href="#beta" className="text-accent-bright transition-colors hover:text-accent">
                Try the software free
              </SiteLink>
              .
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
