import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

/**
 * "Fewer missed keys. Fewer accidental ones." drawn on the renders
 * (2026-11-12). Each panel is one keycap cut from the close-up render
 * (design/renders/noma-concept-fingers.png), resting where that press
 * stopped. Actuation points are lines in space at their true height
 * against the key: a line the key has passed means the key typed, a line
 * it never reached means it didn't. When the panel comes into view the
 * orange "yours" line slides from the shared default to the tuned point,
 * and the verdict flips with it.
 *
 * Geometry: in the source render a key at rest would sit at y 307.7 px and
 * 1 mm of travel is 31.4 px (fitted to the two keys' tops: 1.6 mm and
 * 2.3 mm). Each crop is x+340, y 250..600 of that image.
 */

const REST_Y = 307.7
const PX_PER_MM = 31.4
const CROP_TOP = 250
const CROP_H = 350
const pct = (mm: number) => ((REST_Y + mm * PX_PER_MM - CROP_TOP) / CROP_H) * 100

type Case = {
  name: 'key-light' | 'key-brush'
  title: string
  body: string
  peak: number
  def: { mm: number; verdict: string }
  yours: { mm: number; verdict: string }
}

const CASES: Case[] = [
  {
    name: 'key-light',
    title: 'Missed key, caught',
    body: 'A light press stops at 1.6 mm, short of the usual 2.0 mm, and the letter never appears. Tuned to how you press that key, it types.',
    peak: 1.6,
    def: { mm: 2.0, verdict: 'Missed' },
    yours: { mm: 1.2, verdict: 'Types' },
  },
  {
    name: 'key-brush',
    title: 'Accidental key, ignored',
    body: 'A finger brushes the key next door, 2.3 mm deep. At 2.0 mm that’s a stray letter. Tuned deeper for that key, it stays quiet.',
    peak: 2.3,
    def: { mm: 2.0, verdict: 'Stray letter' },
    yours: { mm: 2.8, verdict: 'Ignored' },
  },
]

function Panel({ c, i }: { c: Case; i: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const tuned = reduce || inView
  const delay = 0.5 + i * 0.25
  const from = pct(c.def.mm)
  const to = pct(c.yours.mm)

  return (
    <figure ref={ref} className="min-w-0">
      <div className="relative mx-auto aspect-[340/350] w-full max-w-[460px]">
        <img
          src={`/media/noma-${c.name}.webp`}
          srcSet={`/media/noma-${c.name}-sm.webp 400w, /media/noma-${c.name}.webp 680w`}
          sizes="(min-width: 768px) 460px, 90vw"
          alt=""
          width={680}
          height={700}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="key-fade absolute inset-0 h-full w-full select-none object-cover"
        />

        {/* 0 mm: where the key sits at rest */}
        <Line top={pct(0)} className="border-t border-line" label="0 mm, at rest" side="left" muted />

        {/* the usual fixed point */}
        <Line top={from} className="border-t border-dashed border-faint" label={`Default ${c.def.mm.toFixed(1)}`} side="right" muted />

        {/* the tuned point slides from the default to its own depth */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-0 h-full"
          initial={false}
          animate={{ y: `${tuned ? to : from}%` }}
          transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : delay, ease: [0.25, 1, 0.5, 1] }}
        >
          <span className="absolute inset-x-0 top-0 h-[2px] -translate-y-1/2 bg-accent" />
          <span className="tnum absolute right-0 top-0 -translate-y-[calc(100%+4px)] text-[11px] font-semibold text-accent sm:text-[12px]">
            Yours {c.yours.mm.toFixed(1)}
          </span>
        </motion.div>
      </div>

      <p className="tnum mx-auto mt-4 max-w-[460px] text-[13px] text-muted">
        This press stopped at <span className="text-ink">{c.peak.toFixed(1)} mm</span>, where the key sits.
      </p>
      <div className="mx-auto mt-3 grid max-w-[460px] grid-cols-2 border-y border-line text-[13px]">
        <p className="flex items-center gap-2 border-r border-line py-3">
          <span aria-hidden className="w-4 border-t border-dashed border-faint" />
          <span className="text-faint">Default:</span>
          <span className="text-ink">{c.def.verdict}</span>
        </p>
        <p className="flex items-center gap-2 py-3 pl-4">
          <span aria-hidden className="h-[2px] w-4 bg-accent" />
          <span className="text-faint">Yours:</span>
          <motion.span
            className="font-semibold text-accent"
            initial={false}
            animate={{ opacity: tuned ? 1 : 0.3 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : delay + 0.8 }}
          >
            {c.yours.verdict}
          </motion.span>
        </p>
      </div>

      <figcaption className="mx-auto mt-5 max-w-[460px]">
        <h3 className="font-wide text-[20px] font-semibold tracking-[-0.02em] text-ink">{c.title}</h3>
        <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted">{c.body}</p>
      </figcaption>
    </figure>
  )
}

function Line({
  top,
  className,
  label,
  side,
  muted = false,
}: {
  top: number
  className: string
  label: string
  side: 'left' | 'right'
  muted?: boolean
}) {
  return (
    <div aria-hidden className="absolute inset-x-0" style={{ top: `${top}%` }}>
      <div className={className} />
      <span
        className={`tnum absolute bottom-full mb-1 whitespace-nowrap text-[11px] sm:text-[12px] ${
          side === 'left' ? 'left-0' : 'right-0'
        } ${muted ? 'text-faint' : 'text-ink'}`}
      >
        {label}
      </span>
    </div>
  )
}

export default function KeyOutcomes() {
  return (
    <div className="grid gap-14 md:grid-cols-2 md:gap-10">
      {CASES.map((c, i) => (
        <Panel key={c.name} c={c} i={i} />
      ))}
    </div>
  )
}
