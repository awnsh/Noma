import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual, { KEYBOARD_OLED_FOCUS } from '../visuals/KeyboardVisual'
import { usePinnedScroll, stageLocalT, lerp } from '../../hooks/usePinnedScroll'

// See SCROLL_VH's twin in WorkflowDemo.tsx for why this is pinned and
// scroll-distance-gated rather than a pure function of scroll position with
// no minimum exposure time — same reasoning applies here, this section
// inherited it directly via `usePinnedScroll`.
const SCROLL_VH = 3

const STAGE_BOUNDS = [0, 1 / 5, 2 / 5, 3 / 5, 4 / 5, 1.001]

interface Scene {
  caption: string
  appName: string
  controls?: string[]
  readout?: { label: string; sub: string } | null
}

// The site's actual centerpiece — brief sections 3 and 4 both specified the
// same mechanic (scroll, app changes, keyboard controls change) with
// slightly different app lists; building both would repeat the identical
// demo twice in a row, which is exactly the "too many sections repeat the
// same thing" failure this project already fixed once (see
// noma-website-project memory). This is the one section that does that job.
const SCENES: Scene[] = [
  { caption: 'One keyboard.', appName: 'Noma', readout: { label: 'READY', sub: 'STANDBY' } },
  { caption: 'Your keyboard knows what you’re using.', appName: 'Premiere', controls: ['Cut', 'Split', 'Ripple Delete', 'Zoom'] },
  { caption: 'Then it adapts.', appName: 'Photoshop', controls: ['Brush', 'Erase', 'Zoom', 'Undo'] },
  { caption: 'Different app. Different controls.', appName: 'VS Code', controls: ['Run', 'Debug', 'Terminal', 'Command Palette'] },
  { caption: 'One keyboard. Every workflow.', appName: 'Noma', readout: { label: 'EVERY', sub: 'WORKFLOW' } },
]

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

// Same camera-push idiom as the adaptive-workflow section further down the
// page (see WorkflowDemo.tsx's own copy of this comment for the full
// reasoning): push in toward the OLED while the app-specific controls are
// the point (scenes 1-3), pull back out to the full board for the closing
// statement — deliberately the same motion language both places use it, not
// a one-off effect invented for this section.
const ZOOM_SCALE = 1.2
const ZOOM_FOCUS = {
  x: KEYBOARD_OLED_FOCUS.xPct * 0.45 + 50 * 0.55,
  y: KEYBOARD_OLED_FOCUS.yPct * 0.45 + 50 * 0.55,
}
const CAMERA_FLAT = { scale: 1, x: 50, y: 50 }
const CAMERA_ZOOMED = { scale: ZOOM_SCALE, x: ZOOM_FOCUS.x, y: ZOOM_FOCUS.y }
const CAMERA_BY_STAGE = [
  { from: CAMERA_FLAT, to: CAMERA_FLAT },
  { from: CAMERA_FLAT, to: CAMERA_ZOOMED },
  { from: CAMERA_ZOOMED, to: CAMERA_ZOOMED },
  { from: CAMERA_ZOOMED, to: CAMERA_ZOOMED },
  { from: CAMERA_ZOOMED, to: CAMERA_FLAT },
]

function cameraFromProgress(progress: number, stage: number) {
  const t = stageLocalT(progress, STAGE_BOUNDS[stage], STAGE_BOUNDS[stage + 1])
  const { from, to } = CAMERA_BY_STAGE[stage]
  return { scale: lerp(from.scale, to.scale, t), x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
}

// Fills the outer content column (`max-w-6xl`, the same standard every
// section on this site uses via `Section.tsx`) rather than capping itself
// narrower — see WorkflowDemo.tsx's identical comment for why: a smaller
// cap here read as small and made the OLED text hard to read.
const KEYBOARD_WRAP_CLASS = 'relative mx-auto mt-8 w-full max-w-6xl'
// One fixed-height slot for the caption regardless of stage — nothing above
// the keyboard should ever push or resize it as copy length changes.
const CAPTION_SLOT_CLASS = 'mx-auto flex h-[140px] max-w-3xl flex-col items-center justify-center px-6 sm:h-[150px] sm:px-8'

function Caption({ stage }: { stage: number }) {
  return (
    <motion.p
      key={stage}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="text-balance font-display text-3xl font-semibold text-base-50 sm:text-5xl"
    >
      {SCENES[stage].caption}
    </motion.p>
  )
}

/**
 * The site's actual opening argument, right after Hero — this is what the
 * brief calls "the most important section of the entire website," and the
 * whole point is that the visitor understands what Noma does by watching it
 * happen, not by reading about it. Five scenes, almost no words per scene:
 * a neutral establishing shot, three real applications each relabeling the
 * same keyboard's controls, and a closing statement once the camera pulls
 * back out. Deliberately lean compared to the adaptive-workflow section
 * further down the page (no code-editor/browser mockup slice here) — that
 * section's job is proving Noma *learns*; this one's only job is proving it
 * *adapts*, and it has to land in the first 10-15 seconds on the page, so it
 * stays to caption + keyboard and nothing else.
 *
 * Pinned via the shared `usePinnedScroll` hook — see its own doc comment
 * for the fixed→absolute technique and the short-viewport fit safety net,
 * both extracted from this exact mechanism as first built for the
 * adaptive-workflow section (formerly the only pinned scene on the site).
 */
export default function ProductDemo() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })

  // Reduced motion: skip pinning/scrubbing and show the resolved closing
  // scene as a plain still — same convention as every other pinned section.
  if (reduceMotion) {
    return (
      <section id="demo" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 text-center sm:px-8">
          <p className="font-display text-3xl font-semibold text-base-50 sm:text-5xl">{SCENES[4].caption}</p>
          <div className={KEYBOARD_WRAP_CLASS}>
            <KeyboardVisual appName={SCENES[4].appName} readout={SCENES[4].readout} glow={false} float={false} />
          </div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const scene = SCENES[stage]
  const camera = cameraFromProgress(progress, stage)

  return (
    <div ref={wrapRef} id="demo" style={{ height: `${SCROLL_VH * 100}vh` }} className="relative border-t border-base-800 bg-base-950">
      <div ref={panelRef} className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        <div
          ref={contentRef}
          className="mx-auto w-full max-w-6xl px-6 text-center sm:px-8"
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 0%' }}
          aria-hidden="true"
        >
          <div className={CAPTION_SLOT_CLASS}>
            <AnimatePresence mode="wait">
              <Caption stage={stage} />
            </AnimatePresence>
          </div>

          <div className={`${KEYBOARD_WRAP_CLASS} overflow-hidden`} style={{ aspectRatio: '1000 / 460' }}>
            <div className="h-full w-full" style={{ transform: `scale(${camera.scale})`, transformOrigin: `${camera.x}% ${camera.y}%` }}>
              <KeyboardVisual appName={scene.appName} controls={scene.controls} readout={scene.readout ?? null} glow={false} float={false} />
            </div>
          </div>

          <p
            className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-base-500 transition-opacity duration-300"
            style={{ opacity: phase === 'pinned' && stage < 4 ? 1 : 0 }}
          >
            Keep scrolling
          </p>
        </div>

        <p className="sr-only">
          Illustration: the same Noma keyboard relabels its controls for whichever application is active — Premiere
          (Cut, Split, Ripple Delete, Zoom), Photoshop (Brush, Erase, Zoom, Undo), and VS Code (Run, Debug, Terminal,
          Command Palette) — then returns to a neutral state. One physical keyboard, controls that change with the
          application in focus.
        </p>
      </div>
    </div>
  )
}
