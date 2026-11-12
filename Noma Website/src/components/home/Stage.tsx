import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A concept render placed straight onto a .band-dark section: no frame, no
 * card. The renders are shot on the band's own colour (#050505) and fade
 * out at their edges, so they read as part of the page. Callouts are drawn
 * by the page on top, positioned in % of the image, so they stay attached
 * at every width.
 */

/** Published sizes (see design/renders for the full-size originals and crops). */
const IMAGES = {
  profile: { w: 1536, h: 630, sm: 960, sizes: '100vw' },
  layers: { w: 1536, h: 864, sm: 960, sizes: '(min-width: 1200px) 1200px, 100vw' },
  switch: { w: 640, h: 864, sm: 420, sizes: '(min-width: 1024px) 480px, 90vw' },
  fingers: { w: 1536, h: 560, sm: 960, sizes: '(min-width: 1024px) 760px, 100vw' },
} as const

export type Marker = { n: number; x: number; y: number }
/** A callout over a key. The value counts from `from` (default 0) to `mm`. */
export type Depth = { x: number; y: number; mm: number; from?: number; caption?: string; accent?: boolean }

export default function Stage({
  name,
  alt,
  priority = false,
  markers = [],
  depths = [],
  play,
  className = '',
  children,
}: {
  name: keyof typeof IMAGES
  alt: string
  priority?: boolean
  markers?: Marker[]
  depths?: Depth[]
  /** Depth labels count up from 0 when this turns true (or on scroll-in if omitted). */
  play?: boolean
  className?: string
  children?: ReactNode
}) {
  const reduce = useReducedMotion()
  const appear = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.5 },
          transition: { duration: 0.5, delay: 0.3 + i * 0.12, ease: [0.25, 1, 0.5, 1] as const },
        }

  const img = IMAGES[name]

  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: `${img.w} / ${img.h}` }}>
      <img
        src={`/media/noma-${name}.webp`}
        srcSet={`/media/noma-${name}-sm.webp ${img.sm}w, /media/noma-${name}.webp ${img.w}w`}
        sizes={img.sizes}
        alt={alt}
        width={img.w}
        height={img.h}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className="render-fade absolute inset-0 h-full w-full select-none object-contain"
        draggable={false}
      />

      {markers.map((m, i) => (
        <motion.span
          key={m.n}
          {...appear(i)}
          aria-hidden
          className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent bg-[#050505] text-[11px] font-semibold text-ink sm:h-7 sm:w-7 sm:text-[12px]"
          style={{ left: `${m.x}%`, top: `${m.y}%` }}
        >
          {m.n}
        </motion.span>
      ))}

      {depths.map((d, i) => (
        <DepthLabel key={`${d.x}-${d.y}`} d={d} i={i} play={play} />
      ))}

      {children}
    </div>
  )
}

/** A depth callout over a key: the value counts up from 0 to how far it went. */
function DepthLabel({ d, i, play }: { d: Depth; i: number; play?: boolean }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const go = play ?? inView
  const from = d.from ?? 0
  const v = useMotionValue(reduce ? d.mm : from)
  const text = useTransform(v, (x) => `${x.toFixed(1)} mm`)
  useEffect(() => {
    if (reduce) return
    if (!go) {
      v.set(from)
      return
    }
    const c = animate(v, d.mm, { duration: 1.1, delay: 0.35 + i * 0.2, ease: [0.25, 1, 0.5, 1] })
    return () => c.stop()
  }, [go, reduce, d.mm, from, i, v])

  return (
    <span
      ref={ref}
      aria-hidden
      className="absolute flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${d.x}%`, bottom: `${100 - d.y}%` }}
    >
      {d.caption && <span className="label-xs mb-1.5 text-faint">{d.caption}</span>}
      <motion.span
        className={`tnum whitespace-nowrap rounded-full border px-1.5 py-px text-[9px] font-semibold sm:px-2.5 sm:py-0.5 sm:text-[12px] ${
          d.accent ? 'border-accent text-accent' : 'border-line text-ink'
        }`}
      >
        {text}
      </motion.span>
      <span className={`w-px ${d.accent ? 'h-[6vw] max-h-20 bg-accent' : 'h-[3vw] max-h-10 bg-line'}`} />
    </span>
  )
}

/** The numbered key for a Stage's markers. */
export function Legend({
  items,
  className = 'grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4',
}: {
  items: { n: number; title: string; body: string }[]
  className?: string
}) {
  return (
    <ol className={className}>
      {items.map((it) => (
        <li key={it.n} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent text-[11px] font-semibold text-ink">
            {it.n}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">{it.title}</p>
            <p className="mt-1 text-pretty text-[14px] leading-relaxed text-muted">{it.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
