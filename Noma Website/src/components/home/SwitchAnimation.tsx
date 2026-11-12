import { useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionStyle,
} from 'framer-motion'

/**
 * The exploded switch render (public/media/noma-switch.webp, a 640x864 crop
 * of design/renders/noma-concept-switch.png) cut into its parts with
 * clip-path and animated like a real press: keycap and stem travel down,
 * the spring compresses from its base, and the magnet closes in on the
 * sensor while a readout counts the depth. Three presses per loop: a light
 * graze that doesn't register, a full press, a half press. Every slice uses
 * the same image on the same #050505, so nothing shows a seam.
 *
 * Slice bounds are % of the image height, measured from the render.
 */
const SLICES = {
  cap: [0, 19.7],
  stem: [19.7, 41.2],
  spring: [41.2, 55],
  housing: [55, 83.3],
  sensor: [83.3, 100],
} as const
/** How far keycap + stem move at full travel, in % of the image height. */
const TRAVEL = 5.5
const SPRING_H = SLICES.spring[1] - SLICES.spring[0]
const TRAVEL_MM = 4
/** The dashed magnet-to-sensor line runs from the stem's base to the sensor top. */
const GAP_TOP = SLICES.stem[1] - 1.5
const GAP_BOTTOM = 86
const GAP_H = GAP_BOTTOM - GAP_TOP
const ACTUATION_MM = 1.4
const ACT_PCT = `${(ACTUATION_MM / TRAVEL_MM) * 100}%`

// press amount 0..1 across one loop: graze, full press, half press
const KEYS = [0, 0.25, 0.25, 0, 0, 0.95, 0.95, 0, 0, 0.55, 0.55, 0, 0]
const TIMES = [0, 0.06, 0.12, 0.2, 0.3, 0.38, 0.48, 0.56, 0.66, 0.73, 0.83, 0.9, 1]

function clip([top, bottom]: readonly [number, number]) {
  return `inset(${top}% 0 ${100 - bottom}% 0)`
}

export default function SwitchAnimation({ active = true }: { active?: boolean } = {}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const press = useMotionValue(reduce ? 0.6 : 0)

  useEffect(() => {
    if (reduce || !inView || !active) return
    const controls = animate(press, KEYS, { duration: 8, times: TIMES, ease: 'easeInOut', repeat: Infinity })
    return () => controls.stop()
  }, [reduce, inView, active, press])

  const moveY = useTransform(press, (p) => `${p * TRAVEL}%`)
  const springScale = useTransform(press, (p) => 1 - (p * TRAVEL) / SPRING_H)
  const gapScale = useTransform(press, (p) => 1 - (p * TRAVEL) / GAP_H)
  const fieldOpacity = useTransform(press, (p) => 0.25 + p * 0.75)
  const mm = useTransform(press, (p) => (p * TRAVEL_MM).toFixed(2))
  const markerY = useTransform(press, (p) => `${p * 100}%`)

  const [registered, setRegistered] = useState(false)
  useMotionValueEvent(press, 'change', (p) => {
    const on = p * TRAVEL_MM >= ACTUATION_MM
    if (on !== registered) setRegistered(on)
  })

  const src = '/media/noma-switch.webp'
  const img = (style: MotionStyle, className = '') => (
    <motion.img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={`absolute inset-0 h-full w-full select-none will-change-transform ${className}`}
      style={style}
    />
  )

  return (
    <div
      ref={ref}
      className="relative mx-auto grid w-full max-w-[min(520px,52vh)] grid-cols-[1fr_auto] items-center gap-4 sm:gap-8"
      role="img"
      aria-label="Animation: one Noma switch pressing down. The magnet in the stem moves toward the sensor below, and the depth readout counts from 0 to 4 millimetres."
    >
      <div className="relative aspect-[640/864] w-full">
        {/* static parts */}
        {img({ clipPath: clip(SLICES.housing) })}
        {img({ clipPath: clip(SLICES.sensor) })}
        {/* moving parts */}
        {img({ clipPath: clip(SLICES.spring), scaleY: springScale, transformOrigin: `50% ${SLICES.spring[1]}%` })}
        {img({ clipPath: clip(SLICES.stem), y: moveY })}
        {img({ clipPath: clip(SLICES.cap), y: moveY })}

        {/* magnet-to-sensor distance */}
        <motion.span
          aria-hidden
          className="absolute left-[49.8%] w-0 border-l border-dashed border-accent mix-blend-screen"
          style={{ top: `${GAP_TOP}%`, bottom: `${100 - GAP_BOTTOM}%`, opacity: fieldOpacity, scaleY: gapScale, transformOrigin: '50% 100%' }}
        />
      </div>

      {/* travel gauge */}
      <div className="relative self-stretch py-[14%] pr-16">
        <div className="relative h-full w-[2px] rounded-full bg-line">
          <span
            aria-hidden
            className="absolute -left-[5px] h-[2px] w-3 bg-accent"
            style={{ top: ACT_PCT }}
          />
          <span
            className="absolute left-4 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-accent"
            style={{ top: ACT_PCT }}
          >
            registers
          </span>
          <span className="absolute left-4 top-0 -translate-y-1/2 whitespace-nowrap text-[11px] text-faint">0 mm</span>
          <span className="absolute bottom-0 left-4 translate-y-1/2 whitespace-nowrap text-[11px] text-faint">4 mm</span>
          {/* full-height carrier, so y in % is a fraction of travel */}
          <motion.span aria-hidden className="absolute inset-x-0 top-0 h-full" style={{ y: markerY }}>
            <span className="absolute -left-[4px] -top-[5px] h-[10px] w-[10px] rounded-full bg-ink" />
          </motion.span>
        </div>
      </div>

      <div className="col-span-2 flex items-end justify-center gap-6 border-t border-line pt-5">
        <div>
          <p className="label-xs text-faint">Key depth</p>
          <p className="tnum mt-1 text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none tracking-[-0.02em] text-ink">
            <motion.span>{mm}</motion.span>
            <span className="ml-1 text-[14px] font-medium text-faint">mm</span>
          </p>
        </div>
        <p
          className={`mb-1 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors duration-150 ${
            registered ? 'border-accent text-accent' : 'border-line text-faint'
          }`}
        >
          {registered ? 'Registered' : 'Not yet'}
        </p>
      </div>
    </div>
  )
}
