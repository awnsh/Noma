import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import Stage, { Legend } from './Stage'
import SwitchAnimation from './SwitchAnimation'


/**
 * Why Noma is different, in three visual beats (2026-11-12). The hero's side
 * render already shows the point (every key knows how far it went); these
 * show how:
 *   1. a magnet and a sensor under every key (exploded render)
 *   2. the sensor reads the whole press (animated switch built from the render)
 *   3. then it tunes every key to the way you type (close-up render, each key's
 *      actuation point counting from the 2.0 mm default to where you press it).
 *      Per key, not per finger: it never knows which finger pressed a key,
 *      only how that key gets pressed (the user's call, 2026-11-12).
 *
 * On large screens the section pins and scroll moves through the beats,
 * crossfading copy and visual together. On phones and tablets (and before
 * hydration) the beats simply stack, which is sturdier than pinning there.
 */

const INSIDE = [
  { n: 1, title: 'Keycaps', body: 'Legend-free, one orange key.' },
  { n: 2, title: 'Magnetic switches', body: 'A small magnet rides in every key.' },
  { n: 3, title: 'A sensor per key', body: 'Reads that magnet the whole way down.' },
  { n: 4, title: 'Aluminium case', body: 'A solid, quiet base.' },
]

type Beat = { eyebrow: string; title: string; body: ReactNode; extra?: ReactNode }

const BEATS: Beat[] = [
  {
    eyebrow: '01 · Inside',
    title: 'A magnet and a sensor under every key.',
    body: 'Ordinary keyboards only know whether a key is down. Every Noma key carries a small magnet, with a sensor underneath that reads it.',
    extra: <Legend items={INSIDE} className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4" />,
  },
  {
    eyebrow: '02 · Sensing',
    title: 'The sensor reads the whole press.',
    body: 'As a key goes down, its magnet closes in on the sensor. Noma tracks every fraction of a millimetre, not just on or off.',
  },
  {
    eyebrow: '03 · Learning',
    title: 'Then it tunes every key to the way you type.',
    body: (
      <>
        It learns how you actually press each key, whichever finger you use, and moves that key’s actuation point to match.{' '}
        <span className="text-ink">Fewer missed keys. Fewer accidental ones.</span> Nothing to set up.
      </>
    ),
  },
]

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(min-width: 1024px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function useIsLarge() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => false,
  )
}

function Visual({ i, active }: { i: number; active: boolean }) {
  if (i === 0)
    return (
      <Stage
        name="layers"
        alt="Concept render, exploded view of the Noma keyboard: keycaps, a plate of magnetic switches, a circuit board with a sensor under every switch, and the aluminium case."
        markers={[
          { n: 1, x: 80.5, y: 21 },
          { n: 2, x: 77.5, y: 41.5 },
          { n: 3, x: 80, y: 59 },
          { n: 4, x: 80.5, y: 78 },
        ]}
      />
    )
  if (i === 1) return <SwitchAnimation active={active} />
  return (
    <div>
      <Stage
        name="fingers"
        play={active}
        alt="Concept render, close-up of four keycaps side by side. Above each, its actuation point moves from the shared 2.0 mm default to a depth tuned to how that key is actually pressed."
        depths={[
          { x: 15.6, y: 24, from: 2, mm: 1.0, caption: 'A', accent: true },
          { x: 38.8, y: 26.5, from: 2, mm: 1.2, caption: 'S' },
          { x: 61.8, y: 30.5, from: 2, mm: 1.4, caption: 'D' },
          { x: 84.8, y: 34.5, from: 2, mm: 1.5, caption: 'F' },
        ]}
      />
      <p className="mt-2 text-center text-[13px] text-faint">Every key starts at 2.0 mm. Each one settles where you actually press it.</p>
    </div>
  )
}

function Copy({ beat, index }: { beat: Beat; index: number }) {
  return (
    <div>
      <p className="label-xs text-accent">{beat.eyebrow}</p>
      <h2 className="font-wide mt-4 max-w-[14ch] text-balance text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-ink">
        {beat.title}
      </h2>
      <p className="mt-5 max-w-[38ch] text-pretty text-[17px] leading-relaxed text-muted">{beat.body}</p>
      {beat.extra}
      <span className="sr-only">Step {index + 1} of {BEATS.length}</span>
    </div>
  )
}

/**
 * One beat in the pinned stack. The crossfade is a plain CSS transition on
 * the active beat (scroll picks which beat is active). An earlier version
 * mapped scroll progress straight onto opacity, but framer's accelerated
 * scroll animations left stale beats visible.
 */
function PinnedBeat({ i, active }: { i: number; active: boolean }) {
  return (
    <div
      // outgoing beat leaves quickly; incoming waits for it, so copy never overlaps
      className={`absolute inset-0 grid items-center gap-12 transition-opacity ease-out lg:grid-cols-[0.8fr_1.2fr] ${
        active ? 'opacity-100 delay-200 duration-500' : 'pointer-events-none opacity-0 delay-0 duration-200'
      }`}
      aria-hidden={!active}
    >
      <div
        className={`transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${active ? 'translate-y-0' : 'translate-y-4'}`}
      >
        <Copy beat={BEATS[i]} index={i} />
      </div>
      <div className="min-w-0">
        <Visual i={i} active={active} />
      </div>
    </div>
  )
}

export default function Explainer() {
  const large = useIsLarge()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [active, setActive] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const i = Math.min(BEATS.length - 1, Math.floor(p * BEATS.length))
    if (i !== active) setActive(i)
  })
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1])

  if (!large) {
    return (
      <section id="how" ref={ref} className="scroll-mt-20">
        {BEATS.map((beat, i) => (
          <div key={i} className={`mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24 ${i ? 'border-t border-line' : ''}`}>
            <Copy beat={beat} index={i} />
            <div className="mt-10">
              <Visual i={i} active />
            </div>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section id="how" ref={ref} className="relative scroll-mt-0" style={{ height: `${BEATS.length * 150}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden pt-16">
        <div className="relative mx-auto h-[min(78vh,720px)] w-full max-w-6xl px-8">
          {BEATS.map((_, i) => (
            <PinnedBeat key={i} i={i} active={active === i} />
          ))}
        </div>

        {/* progress through the three beats */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4">
          {BEATS.map((b, i) => (
            <span
              key={i}
              className={`label-xs transition-colors duration-300 ${active === i ? 'text-ink' : 'text-faint'}`}
            >
              {b.eyebrow.split(' · ')[1]}
            </span>
          ))}
          <span className="relative ml-2 h-px w-24 bg-line">
            <motion.span className="absolute inset-0 origin-left bg-accent" style={{ scaleX: bar }} />
          </span>
        </div>
      </div>
    </section>
  )
}
