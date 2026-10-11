import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import AppIcon from './AppIcon'
import SectionIntro from '../ui/SectionIntro'
import Reveal from '../ui/Reveal'
import { appProfiles } from '../../data/appProfiles'
import { overlay } from '../../data/glideOverlay'

/**
 * Glide, on a real laptop (2026-10-11): a rendered MacBook deck seen from
 * straight above (Blender, the scene from Marketing/glide-film), with a
 * transparent background so it sits on the page itself. Over it the page
 * draws Glide: the four zones on the trackpad's edges and a finger sliding
 * in from the palm rest, while the control it fires lights in the panel.
 * The zone and finger positions come from the render's own camera
 * (glideOverlay.ts, made by scripts/export_web.py), so they sit exactly on
 * the rendered trackpad at any size.
 *
 * Earlier the same day this was a scroll-scrubbed sequence (the laptop
 * opening, then turning to top-down); the user chose the top-down view alone.
 *
 * It plays through the four zones on its own while on screen, until the
 * visitor picks a control. Reduced motion: no finger, picking still lights.
 */

const APP_ID = 'claude'
const IMAGE_SRC = '/media/glide-top.webp'
const [VW, VH] = overlay.aspect

/** Slot order: upper left 1, upper right 2, lower left 3, lower right 4. */
const ZONES = [
  { key: 'topLeft', where: 'upper left' },
  { key: 'topRight', where: 'upper right' },
  { key: 'bottomLeft', where: 'lower left' },
  { key: 'bottomRight', where: 'lower right' },
] as const

const CYCLE_MS = 2200
/** The finger rests a beat on the palm rest, then slides in. */
const LAND_S = 0.18
const SLIDE_S = 0.42
const FINGER_S = 1.2
/** Glide recognises the swipe partway in (the app's MIN_TRAVEL). */
const FIRE_MS = 480
const LIT_MS = 1500

/** The render's top edge cuts through the lid (seen from above it leans out
 *  of frame); fade it into the page rather than show a straight cut. */
const TOP_FADE = 'linear-gradient(to bottom, transparent 0%, #000 9%)'

type Point = [number, number]
const at = ([x, y]: readonly number[]): Point => [x * VW, y * VH]

export default function GlideTopDown() {
  const reduceMotion = useReducedMotion()
  const app = appProfiles[APP_ID]
  const stage = useRef<HTMLDivElement>(null)
  const inView = useInView(stage, { amount: 0.5 })

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
    if (!inView || taken || reduceMotion) return
    let index = 0
    const first = setTimeout(() => swipe(0), 500)
    const loop = setInterval(() => {
      index = (index + 1) % ZONES.length
      swipe(index)
    }, CYCLE_MS)
    return () => {
      clearTimeout(first)
      clearInterval(loop)
    }
  }, [inView, taken, reduceMotion, swipe])

  const pick = (index: number) => {
    setTaken(true)
    swipe(index)
  }

  const dotR = overlay.padWidth * VW * 0.08
  const active = swiping === null ? null : overlay.zones[ZONES[swiping].key]

  return (
    <section id="glide" className="relative scroll-mt-24 px-3 sm:px-5">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 sm:px-10 sm:py-20 md:px-12 md:py-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          <SectionIntro
            compact
            title="Your four controls, on the trackpad."
            line="Glide puts them at the edges of the trackpad you already have. Swipe in from the palm rest to use one. No extra hardware."
          />
          <Reveal delay={0.08} className="mt-8 hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-base-900/70 p-5 backdrop-blur-xl">
              <ControlPanel app={app} fired={fired} onPick={pick} />
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.04}>
          <div ref={stage} className="relative lg:-mr-[4%]">
            <img
              src={IMAGE_SRC}
              alt="A laptop seen from straight above. A finger on the palm rest slides onto the trackpad from its edge, and the zone it came in through lights up."
              width={VW}
              height={VH}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full select-none"
              style={{ maskImage: TOP_FADE, WebkitMaskImage: TOP_FADE }}
              draggable={false}
            />
            <svg viewBox={`0 0 ${VW} ${VH}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <radialGradient id="glide-finger">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="0.55" stopColor="#eef2ff" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#eef2ff" stopOpacity="0" />
                </radialGradient>
                {/* User-space region: a vertical line has a zero-width box,
                    which would collapse a bounding-box filter region. */}
                <filter id="glide-glow" filterUnits="userSpaceOnUse" x={0} y={0} width={VW} height={VH}>
                  <feGaussianBlur stdDeviation="9" />
                </filter>
              </defs>
              {ZONES.map((zone, index) => {
                const z = overlay.zones[zone.key]
                const [a, b] = [at(z.line[0]), at(z.line[1])]
                const lit = fired === index
                return (
                  <g key={zone.key}>
                    <motion.line
                      x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                      stroke="#4c7eff" strokeWidth={30} strokeLinecap="round" filter="url(#glide-glow)"
                      initial={false}
                      animate={{ opacity: lit ? 0.9 : 0 }}
                      transition={{ duration: lit ? 0.12 : 0.6 }}
                    />
                    <motion.line
                      x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                      stroke={lit ? '#a9c0ff' : '#4c7eff'} strokeWidth={lit ? 10 : 8} strokeLinecap="round"
                      initial={false}
                      animate={{ opacity: lit ? 1 : 0.55 }}
                      transition={{ duration: lit ? 0.12 : 0.6 }}
                    />
                  </g>
                )
              })}
              {active && !reduceMotion && <Finger key={swipeKey} from={at(active.rest)} to={at(active.end)} r={dotR} />}
            </svg>
          </div>
        </Reveal>

        {/* Phones and tablets: the panel under the laptop. */}
        <div className="rounded-2xl border border-white/10 bg-base-900/70 p-3 backdrop-blur-xl sm:p-4 lg:hidden">
          <ControlPanel app={app} fired={fired} onPick={pick} compact />
        </div>
      </div>
    </section>
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

function ControlPanel({
  app,
  fired,
  onPick,
  compact = false,
}: {
  app: (typeof appProfiles)[string]
  fired: number | null
  onPick: (index: number) => void
  compact?: boolean
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <AppIcon id={APP_ID} color={app.color} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight text-base-50">{app.shortName}</p>
          <p className="truncate text-xs text-base-500">Tap a control to see its swipe</p>
        </div>
      </div>
      <div className={`grid grid-cols-2 gap-2 ${compact ? 'mt-3' : 'mt-4'}`}>
        {ZONES.map((zone, index) => {
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
                compact ? 'h-[48px]' : 'h-[60px]'
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
