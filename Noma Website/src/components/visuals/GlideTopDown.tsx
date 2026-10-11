import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import AppIcon from './AppIcon'
import { appProfiles } from '../../data/appProfiles'

/**
 * Glide, drawn over a top-down render of the laptop (2026-10-11): the four
 * zones on the trackpad's edges and a finger sliding in from the palm rest,
 * while the control it fires lights in the panel. Positions come from the
 * render's own camera (journey.ts), so they sit exactly on the rendered
 * trackpad at any size. Used by DemoGlide, the pinned demo -> Glide section.
 */

export const GLIDE_APP_ID = 'claude'

/** Slot order: upper left 1, upper right 2, lower left 3, lower right 4. */
export const GLIDE_ZONES = [
  { key: 'topLeft', where: 'upper left' },
  { key: 'topRight', where: 'upper right' },
  { key: 'bottomLeft', where: 'lower left' },
  { key: 'bottomRight', where: 'lower right' },
] as const

type ZoneKey = (typeof GLIDE_ZONES)[number]['key']
type Point = [number, number]
export interface ZoneGeometry {
  line: readonly (readonly number[])[]
  rest: readonly number[]
  end: readonly number[]
}

const CYCLE_MS = 2200
/** The finger rests a beat on the palm rest, then slides in. */
const LAND_S = 0.18
const SLIDE_S = 0.42
const FINGER_S = 1.2
/** Glide recognises the swipe partway in (the app's MIN_TRAVEL). */
const FIRE_MS = 480
const LIT_MS = 1500

/** Plays through the four zones while `running`, until the visitor picks one. */
export function useGlideSwipes(running: boolean, reduceMotion: boolean) {
  const [swiping, setSwiping] = useState<number | null>(null)
  const [fired, setFired] = useState<number | null>(null)
  const [swipeKey, setSwipeKey] = useState(0)
  const [taken, setTaken] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const swipe = useCallback(
    (index: number) => {
      clearTimers()
      setFired(null)
      if (reduceMotion) {
        setFired(index)
        timers.current.push(setTimeout(() => setFired(null), LIT_MS))
        return
      }
      setSwiping(index)
      setSwipeKey((key) => key + 1)
      timers.current.push(setTimeout(() => setFired(index), FIRE_MS))
      timers.current.push(setTimeout(() => setSwiping(null), FINGER_S * 1000 + 100))
      timers.current.push(setTimeout(() => setFired(null), FIRE_MS + LIT_MS))
    },
    [reduceMotion],
  )

  useEffect(() => {
    if (!running || taken || reduceMotion) return
    let index = 0
    const first = setTimeout(() => swipe(0), 400)
    const loop = setInterval(() => {
      index = (index + 1) % GLIDE_ZONES.length
      swipe(index)
    }, CYCLE_MS)
    return () => {
      clearTimeout(first)
      clearInterval(loop)
    }
  }, [running, taken, reduceMotion, swipe])

  // Leaving the view resets it, so the visitor can come back to the loop.
  useEffect(() => {
    if (!running) {
      clearTimers()
      setSwiping(null)
      setFired(null)
    }
  }, [running])

  const pick = (index: number) => {
    setTaken(true)
    swipe(index)
  }

  return { swiping, fired, swipeKey, pick }
}

/** The zones and the finger, as an SVG over a W x H image. */
export function GlideOverlay({
  width,
  height,
  zones,
  padWidth,
  fired,
  swiping,
  swipeKey,
  reduceMotion,
}: {
  width: number
  height: number
  zones: Record<ZoneKey, ZoneGeometry>
  padWidth: number
  fired: number | null
  swiping: number | null
  swipeKey: number
  reduceMotion: boolean
}) {
  const at = ([x, y]: readonly number[]): Point => [x * width, y * height]
  const dotR = padWidth * width * 0.08
  const active = swiping === null ? null : zones[GLIDE_ZONES[swiping].key]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="glide-finger">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#eef2ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#eef2ff" stopOpacity="0" />
        </radialGradient>
        {/* User-space region: a vertical line has a zero-width box, which
            would collapse a bounding-box filter region. */}
        <filter id="glide-glow" filterUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {GLIDE_ZONES.map((zone, index) => {
        const z = zones[zone.key]
        const [a, b] = [at(z.line[0]), at(z.line[1])]
        const lit = fired === index
        return (
          <g key={zone.key}>
            <motion.line
              x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
              stroke="#4c7eff" strokeWidth={26} strokeLinecap="round" filter="url(#glide-glow)"
              initial={false}
              animate={{ opacity: lit ? 0.9 : 0 }}
              transition={{ duration: lit ? 0.12 : 0.6 }}
            />
            <motion.line
              x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
              stroke={lit ? '#a9c0ff' : '#4c7eff'} strokeWidth={lit ? 8 : 6.5} strokeLinecap="round"
              initial={false}
              animate={{ opacity: lit ? 1 : 0.55 }}
              transition={{ duration: lit ? 0.12 : 0.6 }}
            />
          </g>
        )
      })}
      {active && !reduceMotion && <Finger key={swipeKey} from={at(active.rest)} to={at(active.end)} r={dotR} />}
    </svg>
  )
}

/** The fingertip: lands on the palm rest, slides in across the trackpad's
 *  edge, lifts. Web Animations on a transform. */
function Finger({ from, to, r }: { from: Point; to: Point; r: number }) {
  const ref = useRef<SVGCircleElement>(null)
  const dx = to[0] - from[0]
  useEffect(() => {
    const animation = ref.current?.animate(
      [
        { transform: 'translateX(0px)', opacity: 0, offset: 0 },
        // The slide: an easing on the keyframe that starts it.
        { transform: 'translateX(0px)', opacity: 1, offset: LAND_S / FINGER_S, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' },
        { transform: `translateX(${dx}px)`, opacity: 1, offset: (LAND_S + SLIDE_S) / FINGER_S },
        { transform: `translateX(${dx}px)`, opacity: 0, offset: 1 },
      ],
      { duration: FINGER_S * 1000, fill: 'forwards' },
    )
    return () => animation?.cancel()
  }, [dx])
  return <circle ref={ref} cx={from[0]} cy={from[1]} r={r} fill="url(#glide-finger)" opacity={0} />
}

/** Claude's four controls, lit as their swipe lands; picking one replays it. */
export function ControlPanel({
  fired,
  onPick,
  compact = false,
}: {
  fired: number | null
  onPick: (index: number) => void
  compact?: boolean
}) {
  const app = appProfiles[GLIDE_APP_ID]
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <AppIcon id={GLIDE_APP_ID} color={app.color} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight text-base-50">{app.shortName}</p>
          <p className="truncate text-xs text-base-500">Tap a control to see its swipe</p>
        </div>
      </div>
      <div className={`grid grid-cols-2 gap-2 ${compact ? 'mt-3' : 'mt-4'}`}>
        {GLIDE_ZONES.map((zone, index) => {
          const control = app.controls[index]
          const isFired = fired === index
          return (
            <motion.button
              key={control}
              type="button"
              onClick={() => onPick(index)}
              aria-label={`${control}: swipe in from the ${zone.where} of the trackpad`}
              animate={{ scale: isFired ? 0.96 : 1 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={`flex flex-col items-center justify-center rounded-xl border px-2 text-center transition-colors duration-200 ${
                compact ? 'h-[46px]' : 'h-[60px]'
              } ${
                isFired
                  ? 'border-accent/60 bg-accent/15 text-base-50'
                  : 'border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.015] text-base-100 hover:border-white/20'
              }`}
            >
              <span className="block w-full truncate text-xs font-medium tracking-tight">{control}</span>
              <span className={`mt-0.5 block text-[10px] ${isFired ? 'text-accent-bright' : 'text-base-500'}`}>{zone.where}</span>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}
