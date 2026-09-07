import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual, { KEYBOARD_OLED_FOCUS } from '../visuals/KeyboardVisual'
import ControlChip from '../ui/ControlChip'
import { usePinnedScroll, stageLocalT, lerp } from '../../hooks/usePinnedScroll'

// See usePinnedScroll's own doc comment for why this is pinned and
// scroll-distance-gated rather than a pure function of scroll position with
// no minimum exposure time.
const SCROLL_VH = 3

// Five stages — see STAGES below for what each is.
const STAGE_BOUNDS = [0, 1 / 5, 2 / 5, 3 / 5, 4 / 5, 1.001]

interface Stage {
  caption: string
  /** Neutral stage 0 is the visitor's own behavior, not Flow talking yet —
   *  every later stage is an actual Flow notification, styled like the
   *  real in-app popup (see PRODUCT.md: Flow's suggestions are a distinct,
   *  violet-coded UI moment, never plain headline copy). */
  isNotification: boolean
  /** A decorative call-to-action rendered inside the popup, e.g. "Pin Debug
   *  to a key." Real feedback was that a *suggestion* needs to look like an
   *  actual feature — something with a button on it — not a sentence
   *  describing that a suggestion exists. Not a real `<button>`: this whole
   *  section is `aria-hidden` and non-interactive by design (autoplay/pin,
   *  not a thing to click), so it's a styled span, not a control. */
  action?: string
  /** The resolution of `action` one stage later — same visual weight, but a
   *  confirmed/quiet style (outline, not filled) instead of a new ask. */
  confirmed?: string
}

const STAGES: Stage[] = [
  { caption: 'You keep doing the same thing.', isNotification: false },
  { caption: 'Flow notices the pattern.', isNotification: true },
  { caption: 'It recognizes the workflow inside the app.', isNotification: true },
  { caption: 'It suggests a shortcut.', isNotification: true, action: 'Pin Debug to a key' },
  { caption: 'Added.', isNotification: true, confirmed: 'Debug pinned to a key' },
]

// The exact three shortcuts named in stage 0's chips — reused as the
// keyboard's own displayed controls for that stage (see the `controls`
// prop below) so the board isn't showing an unrelated, hardcoded default
// while the caption above it is talking about these three specifically.
const REPEATED_KEYS = ['Ctrl+C', 'Alt+Tab', 'Ctrl+V']

// The one app this sequence recognizes a pattern inside — deliberately a
// single app now (see the doc comment below on why the cross-app "switch to
// Chrome" half of the old sequence moved to ProductDemo.tsx, the site's
// flagship app-switching demo).
const APP = { name: 'VS Code', controls: ['Run', 'Debug', 'Terminal', 'Search'], emphasize: ['Run', 'Debug'] }

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

// A scroll-synced "camera" push on the keyboard itself, so the illustration
// visibly leans in while Flow's own noticing/recognizing/suggesting beats
// are on screen — same idiom as ProductDemo.tsx's copy of this comment.
// Stays zoomed all the way through "Added" (rather than pulling back out
// like ProductDemo does) since this section's job ends on that confirmed,
// zoomed-in readout, not on revealing the whole board — that reveal is
// ProductDemo's closing beat, not this section's.
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
]

function cameraFromProgress(progress: number, stage: number) {
  const t = stageLocalT(progress, STAGE_BOUNDS[stage], STAGE_BOUNDS[stage + 1])
  const { from, to } = CAMERA_BY_STAGE[stage]
  return { scale: lerp(from.scale, to.scale, t), x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
}

// Fixed and generous — this keyboard is the section's whole point, so it
// gets a real size, not a size squeezed by whatever the caption above it
// needs. Fills the outer content column (`max-w-6xl`, the site-wide
// standard via `Section.tsx`) rather than capping itself narrower.
const KEYBOARD_WRAP_CLASS = 'relative mx-auto mt-8 w-full max-w-6xl'
// One fixed-height slot for the popup, sized for its tallest variant —
// every stage's content is vertically centered inside the same box instead
// of resizing it.
const POPUP_SLOT_CLASS = 'mx-auto flex h-[210px] max-w-3xl flex-col items-center justify-center px-6 sm:h-[220px] sm:px-8'
// Same idea for the feature preview below it, sized for its tallest variant
// (the debug view's extra Variables strip).
const FEATURE_SLOT_CLASS = 'mx-auto mt-5 flex h-[150px] w-full max-w-xs items-center justify-center sm:h-[160px] sm:max-w-sm'

function Popup({ stage }: { stage: number }) {
  const { caption, isNotification, action, confirmed } = STAGES[stage]
  return (
    <motion.div
      key={stage}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex w-full flex-col items-center gap-3 rounded-2xl border px-6 py-5 text-center sm:px-8 sm:py-6 ${
        isNotification ? 'border-flow/30 bg-flow/[0.06] shadow-[0_20px_45px_-20px_rgba(167,139,209,0.35)]' : 'border-base-700 bg-base-850/60'
      }`}
    >
      <div className="flex items-center gap-3">
        {isNotification && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-flow" />}
        <p className={`text-balance font-display text-2xl font-semibold sm:text-4xl ${isNotification ? 'text-base-50' : 'text-base-200'}`}>{caption}</p>
      </div>

      {stage === 0 && (
        <div className="flex flex-wrap justify-center gap-2.5">
          {REPEATED_KEYS.map((k) => (
            <ControlChip key={k} size="lg" muted>
              {k}
            </ControlChip>
          ))}
        </div>
      )}

      {action && (
        <span className="mt-1 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-mono text-sm font-medium uppercase tracking-wide text-base-950">
          + {action}
        </span>
      )}

      {confirmed && (
        <span className="mt-1 inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-5 py-2.5 font-mono text-sm font-medium uppercase tracking-wide text-accent">
          ✓ {confirmed}
        </span>
      )}
    </motion.div>
  )
}

/**
 * A small, recognizable slice of the real application's own UI — not the
 * keyboard, not a caption, an actual feature (a code pane, a breakpoint and
 * its variables) so "it knows what you're doing" has something concrete to
 * point at. Reuses the same window-chrome (dots + title bar) already
 * established in AppPreview.tsx so this reads as the same kind of real-app-
 * window convention, not a one-off graphic. Single app, single variant
 * family now (editor / editor-debug) — the cross-app "switch to Chrome"
 * variant moved to ProductDemo.tsx along with the rest of that story.
 */
function FeaturePreview({ debug }: { debug: boolean }) {
  return (
    <motion.div
      key={debug ? 'debug' : 'editor'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full overflow-hidden rounded-xl border border-base-700 bg-base-900/80 shadow-lg shadow-black/30"
    >
      <div className="flex items-center gap-1.5 border-b border-base-700 bg-base-850 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-base-600" />
        <span className="h-2 w-2 rounded-full bg-base-600" />
        <span className="h-2 w-2 rounded-full bg-base-600" />
        <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-base-500">{APP.name}</span>
      </div>

      <div className="p-3.5">
        <div className="space-y-1.5">
          {[62, 88, 40, 72, 55].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              {debug && i === 2 && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-error" />}
              <div className={`h-2 rounded-full ${i % 2 ? 'bg-accent/25' : 'bg-base-700'}`} style={{ width: `${w}%` }} />
            </div>
          ))}
          {debug && (
            <div className="mt-2 rounded-md border border-flow/20 bg-flow/[0.06] px-2.5 py-1.5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-flow">Variables</p>
              <p className="mt-0.5 font-mono text-xs text-base-300">count = 27</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * The site's proof that Noma learns, not just adapts — Flow noticing a
 * repeated shortcut, recognizing the workflow it belongs to, suggesting a
 * dedicated key for it, and confirming once that key is pinned. Positioned
 * after the "Noma software" section (not right after Hero anymore — that
 * flagship spot now belongs to ProductDemo.tsx's app-switching demo, which
 * proves the more fundamental "adapts per app" claim first). This section's
 * old final two stages (switching to Chrome, the keyboard relabeling for
 * it) were cut, not just moved — that exact beat, generalized across three
 * real applications instead of one hand-off, is what ProductDemo.tsx now
 * opens the site with; keeping both would repeat the same demonstration
 * twice (see noma-website-project memory on why that was already a
 * problem once). What's left is the half of the old story ProductDemo
 * doesn't tell: Flow *learning* a pattern well enough to suggest fixing it
 * permanently, not just relabeling controls per app. Never uses generic AI
 * marketing language ("powered by AI") — every beat is a specific, visible
 * mechanism (a counter, a recognized pair of controls, a suggested key, a
 * confirmed pin).
 *
 * Flow's own moments render as the same popup-card notification the real
 * app uses rather than bare headline text, and a real feature slice (a code
 * pane with a live breakpoint) sits below it — real feedback was that an
 * earlier draft of this sequence read as text describing the product
 * rather than the product itself.
 *
 * Pinned via the shared `usePinnedScroll` hook — see its doc comment for
 * the fixed→absolute technique and the short-viewport fit safety net.
 */
export default function WorkflowDemo() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })

  // Reduced motion: skip pinning and scroll-scrubbing entirely and just show
  // the resolved end-state as a plain still illustration — this section's
  // job is demonstration, and the labeled keyboard alone shows the outcome
  // without needing motion to carry it.
  if (reduceMotion) {
    return (
      <section className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
          <p className="font-display text-2xl font-semibold text-base-50 sm:text-3xl">{STAGES[4].caption}</p>
          <div className="mx-auto mt-5 max-w-xs sm:max-w-sm">
            <FeaturePreview debug />
          </div>
          <div className={KEYBOARD_WRAP_CLASS}>
            <KeyboardVisual appName={APP.name} controls={APP.controls} readout={{ label: 'DEBUG', sub: 'PINNED' }} glow={false} float={false} />
          </div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const recognizeFraction = stageLocalT(progress, STAGE_BOUNDS[1], STAGE_BOUNDS[2])
  const count = Math.round(recognizeFraction * 27)

  // Every stage drives its own keyboard content — no generic fallback
  // that's disconnected from the caption above it.
  const readout =
    stage === 1
      ? { label: `${count}×`, sub: 'REPETITIONS' }
      : stage === 3
        ? { label: 'DEBUG?', sub: 'SUGGESTED' }
        : stage === 4
          ? { label: 'DEBUG', sub: 'PINNED' }
          : null

  const camera = cameraFromProgress(progress, stage)

  return (
    <div ref={wrapRef} className="relative border-t border-base-800 bg-base-950" style={{ height: `${SCROLL_VH * 100}vh` }}>
      {/* Top-anchored with real clearance, not vertically centered in the raw
          100vh panel — see usePinnedScroll's doc comment for why. */}
      <div ref={panelRef} className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        <div
          ref={contentRef}
          className="mx-auto w-full max-w-6xl px-6 text-center sm:px-8"
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 0%' }}
          aria-hidden="true"
        >
          <div className={POPUP_SLOT_CLASS}>
            <AnimatePresence mode="wait">
              <Popup stage={stage} />
            </AnimatePresence>
          </div>

          <div className={FEATURE_SLOT_CLASS}>
            <AnimatePresence mode="wait">
              <FeaturePreview debug={stage >= 2} />
            </AnimatePresence>
          </div>

          <div className={`${KEYBOARD_WRAP_CLASS} overflow-hidden`} style={{ aspectRatio: '1000 / 460' }}>
            <div className="h-full w-full" style={{ transform: `scale(${camera.scale})`, transformOrigin: `${camera.x}% ${camera.y}%` }}>
              <KeyboardVisual
                appName={APP.name}
                controls={stage === 0 ? REPEATED_KEYS : APP.controls}
                readout={readout}
                emphasizedLabels={stage === 2 || stage === 3 ? APP.emphasize : undefined}
                glow={false}
                float={false}
              />
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
          Illustration: Flow notices you repeating the same three shortcuts, counts 27 repetitions, and recognizes
          that you're actively using Run and Debug inside VS Code — shown alongside a live code editor with a
          breakpoint and its variables. It suggests pinning Debug to a dedicated key, then confirms once that key is
          pinned — nothing here is installed or made permanent without that confirmation, the interface simply keeps
          up with what you're doing and offers to make it permanent when a pattern is clear.
        </p>
      </div>
    </div>
  )
}
