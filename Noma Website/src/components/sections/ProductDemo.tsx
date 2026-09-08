import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual, { KEYBOARD_OLED_FOCUS } from '../visuals/KeyboardVisual'
import { usePinnedScroll, stageLocalT, lerp } from '../../hooks/usePinnedScroll'
import { appProfiles } from '../../data/appProfiles'

// See usePinnedScroll's own doc comment for why this is pinned and
// scroll-distance-gated rather than a pure function of scroll position with
// no minimum exposure time. Bumped from 3→4 versus the previous version of
// this section — seven beats now instead of five need a bit more scroll
// distance each to hold the same pacing.
const SCROLL_VH = 4

interface Scene {
  caption: string
  /** Undefined for the payoff beats — "remove most of the surrounding UI,
   *  leave the keyboard" means no app tag or ambient tint there, just the
   *  board and the statement. */
  app?: { name: string; color: string }
  controls?: string[]
  readout?: { label: string; sub: string } | null
  /** Labels (already present in `controls`) Noma is calling out as "the
   *  ones it's noticing" — reuses `KeyboardVisual`'s existing emphasis
   *  mechanism (the same one Flow-notices moments use elsewhere on the
   *  site) rather than inventing a new visual language for the same idea. */
  emphasize?: string[]
}

const VSCODE_CONTROLS = ['Run', 'Debug', 'Terminal', 'Search']
const PREMIERE_CONTROLS = ['Cut', 'Split', 'Ripple Delete', 'Zoom']
const PHOTOSHOP_CONTROLS = ['Brush', 'Erase', 'Zoom', 'Undo']

// Non-null assertions: these three profiles are known (and always have
// been) to carry a `color` — the field is optional on `AppProfile` only
// because a couple of other apps elsewhere (Chrome) don't have one.
const VSCODE = { name: 'VS Code', color: appProfiles.vscode.color! }
const PREMIERE = { name: 'Premiere', color: appProfiles.premiere.color! }
const PHOTOSHOP = { name: 'Photoshop', color: appProfiles.photoshop.color! }

// The site's actual centerpiece, replacing an earlier five-scene version of
// this same section — real feedback was that the story should open on the
// visitor actually *coding* (not a neutral establishing shot), name the
// moment Noma notices a pattern before showing the adapt itself, and land
// on a two-beat payoff with the chrome stripped away. Every beat is real —
// an app tag + a tinted glow "communicate" which app is active without
// building a second app-window mockup (that's AppPreview's job, further
// down); the payoff beats drop both, deliberately, since "leave the
// keyboard" was the explicit ask.
const SCENES: Scene[] = [
  { caption: "You're coding.", app: VSCODE, controls: VSCODE_CONTROLS },
  { caption: 'Noma notices.', app: VSCODE, controls: VSCODE_CONTROLS, emphasize: ['Run', 'Debug'] },
  { caption: 'Your controls adapt.', app: PREMIERE, controls: PREMIERE_CONTROLS },
  { caption: 'Different app.', app: PREMIERE, controls: PREMIERE_CONTROLS },
  { caption: 'Different workflow.', app: PHOTOSHOP, controls: PHOTOSHOP_CONTROLS },
  { caption: 'One keyboard.', readout: { label: 'ONE', sub: 'KEYBOARD' } },
  { caption: 'Every workflow.', readout: { label: 'EVERY', sub: 'WORKFLOW' } },
]

const STAGE_BOUNDS = SCENES.map((_, i) => i / SCENES.length).concat(1.001)

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

// Same camera-push idiom the adaptive-intelligence section further down the
// page uses for its own backdrop (a different effect, same underlying
// "push in on the moment of change" idea): push in as Noma starts noticing
// (stage 1), hold through the app-switching beats where the OLED itself is
// the point, pull back out for the two-line payoff so the whole board is
// what's left once the chrome is gone.
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
  { from: CAMERA_ZOOMED, to: CAMERA_ZOOMED },
  { from: CAMERA_ZOOMED, to: CAMERA_FLAT },
  { from: CAMERA_FLAT, to: CAMERA_FLAT },
]

function cameraFromProgress(progress: number, stage: number) {
  const t = stageLocalT(progress, STAGE_BOUNDS[stage], STAGE_BOUNDS[stage + 1])
  const { from, to } = CAMERA_BY_STAGE[stage]
  return { scale: lerp(from.scale, to.scale, t), x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
}

// Fills the outer content column (`max-w-6xl`, the same standard every
// section on this site uses via `Section.tsx`) rather than capping itself
// narrower — a smaller cap here previously read as small and made the OLED
// text hard to read.
const KEYBOARD_WRAP_CLASS = 'relative mx-auto mt-8 w-full max-w-6xl'
// One fixed-height slot for the caption (+ app tag) regardless of stage —
// nothing above the keyboard should ever push or resize it as copy length
// or the tag's presence/absence changes between stages.
const CAPTION_SLOT_CLASS = 'mx-auto flex h-[168px] max-w-3xl flex-col items-center justify-center gap-3 px-6 sm:h-[176px] sm:px-8'

/** A colored dot + name — the same small "which app" tag convention
 *  Problem's orbit and the Dashboard's own app switcher already use
 *  elsewhere on this site — plus a soft tinted glow behind the keyboard.
 *  This is deliberately the *only* surrounding UI during the app-switching
 *  beats (no second app-window mockup here — that's AppPreview's job
 *  further down the page) and it's absent entirely on the payoff beats,
 *  where "remove most of the surrounding UI, leave the keyboard" applies. */
function AppTag({ app }: { app?: { name: string; color: string } }) {
  return (
    <div className="flex h-6 items-center gap-2 font-mono text-xs uppercase tracking-[0.15em] text-base-400" style={{ opacity: app ? 1 : 0 }}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: app?.color ?? 'transparent' }} />
      {app?.name}
    </div>
  )
}

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
 * The site's opening argument, right after Hero — the most important
 * section on the homepage, and the whole point is that the visitor
 * understands what Noma does by watching it happen, not by reading about
 * it. Seven beats, almost no words per beat: you're coding, Noma notices,
 * your controls adapt, a different app, a different workflow, then the
 * chrome falls away for a two-line payoff. Deliberately lean — no code-
 * editor mockup, no dashboard, no carousel — a colored app tag and a
 * tinted glow are the only "surrounding UI," and even those disappear for
 * the payoff. This has to land in the first 10-15 seconds on the page, so
 * every beat is the keyboard and (at most) one line of text reacting to
 * scroll, nothing else.
 *
 * Replaces an earlier five-scene version of this same section (Neutral →
 * Premiere → Photoshop → VS Code → payoff) — real feedback was that this
 * story needed to open on an actual coding moment, name the noticing beat
 * explicitly before the adapt, and strip the UI down further for the
 * close. Superseded, not layered on top of: there is exactly one flagship
 * "watch the keyboard adapt" sequence on this page, not two.
 *
 * Pinned via the shared `usePinnedScroll` hook — see its own doc comment
 * for the fixed→absolute technique and the short-viewport fit safety net.
 */
export default function ProductDemo() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })

  const last = SCENES.length - 1

  // Reduced motion: skip pinning/scrubbing and show the resolved closing
  // scene as a plain still — same convention as every other pinned section.
  if (reduceMotion) {
    return (
      <section id="demo" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 text-center sm:px-8">
          <p className="font-display text-3xl font-semibold text-base-50 sm:text-5xl">{SCENES[last].caption}</p>
          <div className={KEYBOARD_WRAP_CLASS}>
            <KeyboardVisual appName="Noma" readout={SCENES[last].readout} glow={false} float={false} />
          </div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const scene = SCENES[stage]
  const camera = cameraFromProgress(progress, stage)
  const glowColor = scene.app?.color

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
            <AppTag app={scene.app} />
          </div>

          <div className={`${KEYBOARD_WRAP_CLASS} overflow-hidden`} style={{ aspectRatio: '1000 / 460' }}>
            {/* The one ambient "lighting" cue naming which app is active —
                a soft radial tint in that app's own brand color, crossfading
                via a plain CSS transition (not a Framer Motion style binding
                — see noma-website-project memory on why raw color values
                go through plain DOM styles here, not motion values). Absent
                entirely on the payoff beats. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background: glowColor ? `radial-gradient(60% 60% at 82% 45%, ${glowColor}26, transparent)` : 'transparent',
                transition: 'background 0.5s ease',
              }}
            />
            <div className="h-full w-full" style={{ transform: `scale(${camera.scale})`, transformOrigin: `${camera.x}% ${camera.y}%` }}>
              <KeyboardVisual
                appName={scene.app?.name ?? 'Noma'}
                controls={scene.controls}
                readout={scene.readout ?? null}
                emphasizedLabels={scene.emphasize}
                glow={false}
                float={false}
              />
            </div>
          </div>

          <p
            className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-base-500 transition-opacity duration-300"
            style={{ opacity: phase === 'pinned' && stage < last ? 1 : 0 }}
          >
            Keep scrolling
          </p>
        </div>

        <p className="sr-only">
          Illustration: while coding in VS Code, Noma notices a pattern and the same physical keyboard relabels its
          controls for Premiere (Cut, Split, Ripple Delete, Zoom), then Photoshop (Brush, Erase, Zoom, Undo) — one
          keyboard, controls that change with whatever application is in focus.
        </p>
      </div>
    </div>
  )
}
