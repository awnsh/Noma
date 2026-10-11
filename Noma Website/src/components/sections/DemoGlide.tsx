import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import SectionIntro from '../ui/SectionIntro'
import {
  DemoNotice,
  DemoScreen,
  FINAL_MOMENT,
  Keycast,
  playhead,
  SCREEN_H,
  SCREEN_W,
  type Moment,
} from '../visuals/WorkflowDemo'
import { ControlPanel, GlideOverlay, useGlideSwipes } from '../visuals/GlideTopDown'
import { journey } from '../../data/journey'

/**
 * The demo, then Glide, as one pinned piece played by scrolling
 * (2026-10-11, user: "transition this to glide with a scrolling animation").
 *
 *  1. Workflow: a head-on render of a MacBook whose display is cut out
 *     (hole.webp); the HTML demo sits behind it, warped onto the display's
 *     corners, and scrolling moves the pointer through the three runs until
 *     Noma's notice arrives.
 *  2. Transition: a rendered camera move (journey/NN.webp, drawn to a canvas)
 *     swings from the screen down to straight above the trackpad. Its screen
 *     shows the demo's final moment, captured from (1), so the swap is exact.
 *  3. Glide: the last frame, with the zones and the finger drawn over it from
 *     the render's camera (journey.ts), and Claude's controls lighting.
 *
 * Everything after this section follows below it as usual. Reduced motion:
 * nothing pinned; the demo's final moment on the laptop, then Glide's
 * top-down view with the panel.
 */

const [CW, CH] = journey.canvas
const FRAMES = journey.frames
const frameSrc = (i: number) => `/media/journey/${String(i).padStart(2, '0')}.webp`

// Scroll phases, as shares of the pinned scroll. The workflow takes about
// one screen of scrolling (user, 2026-10-11: not too long on this part).
const DEMO = [0.02, 0.30] as const
const MOVE = [0.35, 0.68] as const
const GLIDE_AT = 0.72
/** Where the nav's #glide lands: GLIDE_AT of the pinned scroll. */
const TRACK_VH = 380

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => v * v * (3 - 2 * v)

/** CSS matrix3d mapping a w x h box onto the quad tl, tr, br, bl (px). */
function quadTransform(w: number, h: number, q: [number, number][]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = den ? (dx3 * dy2 - dx2 * dy3) / den : 0
  const hh = den ? (dx1 * dy3 - dx3 * dy1) / den : 0
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${c},${f},0,1)`
}

function useIsWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

export default function DemoGlide() {
  const reduceMotion = !!useReducedMotion()
  const wide = useIsWide()
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const images = useRef<(HTMLImageElement | null)[]>(Array(FRAMES).fill(null))
  const frameIndex = useRef(0)

  const [width, setWidth] = useState(0)
  const [p, setP] = useState(0)
  const [moment, setMoment] = useState<Moment>(() => playhead(0))

  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    const update = () => setWidth(element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // ---- the camera move: an image sequence on a canvas ----------------------
  const draw = useCallback((index: number) => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    let image: HTMLImageElement | null = null
    for (let d = 0; d < FRAMES && !image; d++) image = images.current[index - d] ?? images.current[index + d] ?? null
    if (!image) return
    ctx.clearRect(0, 0, el.width, el.height)
    ctx.drawImage(image, 0, 0, el.width, el.height)
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    let started = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return
        started = true
        const order = reduceMotion
          ? [FRAMES - 1]
          : [0, FRAMES - 1, ...Array.from({ length: FRAMES - 2 }, (_, i) => i + 1)]
        for (const index of order) {
          const image = new Image()
          image.decoding = 'async'
          image.onload = () => {
            images.current[index] = image
            if (Math.abs(index - frameIndex.current) <= 2 || index === FRAMES - 1) draw(frameIndex.current)
          }
          image.src = frameSrc(index)
        }
      },
      { rootMargin: '1500px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [draw, reduceMotion])

  // ---- scroll drives everything --------------------------------------------
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (reduceMotion) return
    setP(value)
    setMoment(playhead((value - DEMO[0]) / (DEMO[1] - DEMO[0])))
    const index = Math.round(clamp01((value - MOVE[0]) / (MOVE[1] - MOVE[0])) * (FRAMES - 1))
    if (index !== frameIndex.current) {
      frameIndex.current = index
      requestAnimationFrame(() => draw(index))
    }
  })

  useEffect(() => {
    if (reduceMotion) {
      frameIndex.current = FRAMES - 1
      draw(FRAMES - 1)
    }
  }, [reduceMotion, draw])

  const inDemo = !reduceMotion && p < MOVE[0]
  const glideOn = reduceMotion || p >= GLIDE_AT
  const t = reduceMotion ? 1 : smooth(clamp01((p - MOVE[0]) / (MOVE[1] - MOVE[0])))
  const { swiping, fired, swipeKey, pick } = useGlideSwipes(glideOn && !reduceMotion, reduceMotion)

  // The stage's size and the screen warp.
  const height = width * (CH / CW)
  const quad = (['tl', 'tr', 'br', 'bl'] as const).map(
    (k) => [journey.screen[k][0] * width, journey.screen[k][1] * height] as [number, number],
  )
  const scale = width ? (quad[1][0] - quad[0][0]) / SCREEN_W : 0
  const compact = scale > 0 && scale < 0.6
  const shown = inDemo ? moment : FINAL_MOMENT

  // Wide screens: during the move the laptop slides right and shrinks a
  // little, making room for Glide's words and panel on the left.
  const shift = wide ? t : 0
  const demoText = reduceMotion ? 1 : 1 - smooth(clamp01((p - MOVE[0]) / 0.06))
  const glideText = reduceMotion ? 1 : smooth(clamp01((p - (MOVE[1] - 0.04)) / 0.06))

  if (reduceMotion) {
    return (
      <section id="demo" className="relative px-3 sm:px-5">
        <span id="glide" className="absolute" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-10 md:px-12">
          <SectionIntro center title="Here’s Noma catching a workflow." />
          <div className="mx-auto mt-8 max-w-4xl">
            <div className="flex justify-center"><DemoScreenStill /></div>
          </div>
          <div className="mt-20 grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <SectionIntro compact title="Your four controls, on the trackpad." line={GLIDE_LINE} />
              <div className="mt-6 rounded-2xl border border-white/10 bg-base-900/70 p-5"><ControlPanel fired={fired} onPick={pick} /></div>
            </div>
            <div className="relative">
              <canvas ref={canvas} width={CW} height={CH} className="block aspect-[4/3] w-full" />
              <GlideOverlay width={CW} height={CH} zones={journey.zones} padWidth={journey.padWidth}
                fired={fired} swiping={swiping} swipeKey={swipeKey} reduceMotion />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="demo" className="relative scroll-mt-0 px-3 sm:px-5">
      {/* The nav's Glide link lands where the Glide part is on screen. */}
      <span id="glide" className="pointer-events-none absolute left-0" style={{ top: `${GLIDE_AT * (TRACK_VH - 100)}vh` }} aria-hidden />
      <div ref={track} className="relative" style={{ height: `${TRACK_VH}vh` }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="relative mx-auto h-full max-w-6xl px-5 sm:px-10 md:px-12">
            {/* 1. The demo's words, above the laptop. */}
            <motion.div
              className="absolute inset-x-5 top-[88px] sm:inset-x-10 md:inset-x-12"
              style={{ opacity: demoText, pointerEvents: demoText > 0.5 ? 'auto' : 'none' }}
            >
              <SectionIntro
                center
                title="Here’s Noma catching a workflow."
                line="Screenshot the bug, paste it into Claude, commit the fix. The third time, Noma recognizes the sequence and offers to save it."
              />
            </motion.div>

            {/* 3. Glide's words and panel: left on wide screens, above and
                below the laptop on phones. */}
            <motion.div
              className="absolute inset-x-5 top-[88px] sm:inset-x-10 md:inset-x-12 lg:right-auto lg:top-1/2 lg:w-[38%] lg:-translate-y-1/2"
              style={{ opacity: glideText, pointerEvents: glideText > 0.5 ? 'auto' : 'none' }}
            >
              <SectionIntro compact title="Your four controls, on the trackpad." line={GLIDE_LINE} />
              <div className="mt-6 hidden rounded-2xl border border-white/10 bg-base-900/70 p-5 backdrop-blur-xl lg:block">
                <ControlPanel fired={fired} onPick={pick} />
              </div>
            </motion.div>
            <motion.div
              className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-base-900/70 p-3 backdrop-blur-xl sm:inset-x-10 lg:hidden"
              style={{ opacity: glideText, pointerEvents: glideText > 0.5 ? 'auto' : 'none' }}
            >
              <ControlPanel fired={fired} onPick={pick} compact />
            </motion.div>

            {/* The laptop. */}
            <div
              ref={stage}
              className="absolute left-1/2 top-[calc(50%+100px)] w-[min(100%,calc((100svh-380px)*4/3),1040px)]"
              style={{
                height: height || undefined,
                transform: `translate(calc(-50% + ${shift * 21}%), calc(-50% - ${t * 50}px)) scale(${1 - shift * 0.06})`,
                // The head-on frame ends in a strip of keyboard; fade it into
                // the page, easing off as the view swings to top-down.
                maskImage: `linear-gradient(to bottom, #000 ${66 + 30 * t}%, transparent 100%)`,
                WebkitMaskImage: `linear-gradient(to bottom, #000 ${66 + 30 * t}%, transparent 100%)`,
              }}
            >
              {/* 1. The screen, behind the cut-out laptop. */}
              {inDemo && width > 0 && (
                <div
                  className="absolute left-0 top-0"
                  style={{ transform: quadTransform(SCREEN_W, SCREEN_H, quad), transformOrigin: '0 0' }}
                >
                  <DemoScreen moment={shown} compact={compact} />
                </div>
              )}
              {inDemo && (
                <img
                  src="/media/journey/hole.webp"
                  alt=""
                  width={CW}
                  height={CH}
                  decoding="async"
                  className="pointer-events-none absolute inset-0 block h-full w-full select-none"
                  draggable={false}
                />
              )}
              {/* 2-3. The camera move, then Glide's view. */}
              <canvas
                ref={canvas}
                width={CW}
                height={CH}
                className="absolute inset-0 block h-full w-full"
                style={{ visibility: inDemo ? 'hidden' : 'visible' }}
                role="img"
                aria-label="A laptop playing the demo turns until the view is straight above its trackpad. A finger on the palm rest slides onto the trackpad from its edge, and the zone it came in through lights up."
              />
              <motion.div className="absolute inset-0" animate={{ opacity: glideOn ? 1 : 0 }} transition={{ duration: 0.4 }}>
                <GlideOverlay
                  width={CW}
                  height={CH}
                  zones={journey.zones}
                  padWidth={journey.padWidth}
                  fired={fired}
                  swiping={swiping}
                  swipeKey={swipeKey}
                  reduceMotion={false}
                />
              </motion.div>
            </div>

            {/* Phones: the keycast and notice under the laptop, readable.
                (Outside the stage, whose fade mask would hide them.) */}
            {compact && inDemo && (
              <div
                className="absolute inset-x-5 flex flex-col items-center gap-3"
                style={{ top: `calc(50% + 100px + ${height * 0.3}px)` }}
              >
                <Keycast frame={shown.frame} />
                <DemoNotice show={shown.frame.notice} compact animate />
              </div>
            )}

            <motion.p
              className="absolute inset-x-0 bottom-4 hidden text-center text-xs text-base-500 sm:block"
              style={{ opacity: demoText }}
            >
              Recreated for this page. The notice is drawn the way the app shows it.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  )
}

const GLIDE_LINE =
  'Glide puts them at the edges of the trackpad you already have. Swipe in from the palm rest to use one. No extra hardware.'

/** Reduced motion: the demo's final moment, scaled to fit. */
function DemoScreenStill() {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const update = () => setW(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const s = w / SCREEN_W
  return (
    <div ref={box} className="w-full overflow-hidden rounded-[14px] border border-white/10" style={{ height: SCREEN_H * s }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: 'top left' }}>
        <DemoScreen moment={FINAL_MOMENT} animate={false} />
      </div>
    </div>
  )
}
