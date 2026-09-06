import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import KeyboardVisual from '../visuals/KeyboardVisual'
import ControlChip from '../ui/ControlChip'

// The pinned scroll distance is (SCROLL_VH - 1) viewport heights — deliberately
// large. An earlier attempt at this section made content a pure function of
// scroll position with no minimum exposure time, and a fast scroll flick could
// clear the whole thing before it registered ("scrolling too fast will miss
// it" — real user feedback). Pinning the section so the page can't advance
// past it until this much scroll distance has been consumed is the actual
// fix — not a tuning knob on the old approach.
const SCROLL_VH = 3

// Six stages — see STAGES below for what each is.
const STAGE_BOUNDS = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1.001]

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
}

const STAGES: Stage[] = [
  { caption: 'You keep doing the same thing.', isNotification: false },
  { caption: 'Flow notices the pattern.', isNotification: true },
  { caption: 'It recognizes the workflow inside the app.', isNotification: true },
  { caption: 'It suggests a shortcut.', isNotification: true, action: 'Pin Debug to a key' },
  { caption: 'You switch to something else —', isNotification: true },
  { caption: 'and it already adapted.', isNotification: true },
]

// The exact three shortcuts named in stage 0's chips — reused as the
// keyboard's own displayed controls for that stage (see the `controls`
// prop below) so the board isn't showing an unrelated, hardcoded default
// while the caption above it is talking about these three specifically.
// Copy → switch window → paste is deliberately a cross-app motion, not a
// single-app one — it's the same repeated action later stages name as a
// recognized *workflow* between two applications, not just a habit inside
// one of them.
const REPEATED_KEYS = ['Ctrl+C', 'Alt+Tab', 'Ctrl+V']

// The two apps this sequence demonstrates recognizing a switch between —
// VS Code's own controls (Run/Debug) get called out first as the in-app
// half of the story, then the board relabels for Chrome as the cross-app
// half, without any control ever becoming a physical add-on.
const APP_A = { name: 'VS Code', controls: ['Run', 'Debug', 'Terminal', 'Search'], emphasize: ['Run', 'Debug'] }
const APP_B = { name: 'Chrome', controls: ['Back', 'Forward', 'New Tab', 'Close Tab'] }

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

// Fixed and generous — this keyboard is the section's whole point, so it
// gets a real size, not a size squeezed by whatever the caption above it
// needs. Never made conditional on stage/content: the popup card and the
// feature preview both have their own fixed-height slots specifically so
// nothing above the keyboard ever pushes or shrinks it as text length
// changes between stages.
const KEYBOARD_WRAP_CLASS = 'relative mx-auto mt-6 w-full max-w-xl sm:max-w-3xl'
// One fixed-height slot for the popup, sized for its tallest variant
// (caption + chips, or caption + the suggestion button) — every stage's
// content is vertically centered inside the same box instead of resizing it.
const POPUP_SLOT_CLASS = 'mx-auto flex h-[176px] max-w-2xl flex-col items-center justify-center px-6 sm:h-[188px] sm:px-8'
// Same idea for the feature preview below it, sized for its tallest variant
// (the debug view's extra Variables strip).
const FEATURE_SLOT_CLASS = 'mx-auto mt-5 flex h-[150px] w-full max-w-xs items-center justify-center sm:h-[160px] sm:max-w-sm'

function Popup({ stage }: { stage: number }) {
  const { caption, isNotification, action } = STAGES[stage]
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
      <div className="flex items-center gap-2.5">
        {isNotification && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-flow" />}
        <p className={`font-display text-xl font-semibold sm:text-2xl ${isNotification ? 'text-base-50' : 'text-base-200'}`}>{caption}</p>
      </div>

      {stage === 0 && (
        <div className="flex flex-wrap justify-center gap-2.5">
          {REPEATED_KEYS.map((k) => (
            <ControlChip key={k} size="sm" muted>
              {k}
            </ControlChip>
          ))}
        </div>
      )}

      {action && (
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wide text-base-950">
          + {action}
        </span>
      )}
    </motion.div>
  )
}

type FeatureVariant = 'editor' | 'editor-debug' | 'browser'

/**
 * A small, recognizable slice of the real application's own UI — not the
 * keyboard, not a caption, an actual feature (a code pane, a breakpoint and
 * its variables, a browser's tab strip) so "it knows what you're doing"
 * has something concrete to point at. Reuses the same window-chrome
 * (dots + title bar) already established in AppPreview.tsx so this reads
 * as the same kind of real-app-window convention, not a one-off graphic.
 */
function FeaturePreview({ variant, label }: { variant: FeatureVariant; label: string }) {
  return (
    <motion.div
      key={variant}
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
        <span className="ml-2 font-mono text-[9px] uppercase tracking-wide text-base-500">{label}</span>
      </div>

      <div className="p-3.5">
        {variant === 'browser' ? (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <div className="h-5 flex-1 rounded-md bg-base-800" />
              <div className="h-5 w-12 rounded-md border border-accent/40 bg-accent/10" />
            </div>
            <div className="h-16 rounded-md bg-base-800/60" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {[62, 88, 40, 72, 55].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                {variant === 'editor-debug' && i === 2 && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-error" />}
                <div className={`h-2 rounded-full ${i % 2 ? 'bg-accent/25' : 'bg-base-700'}`} style={{ width: `${w}%` }} />
              </div>
            ))}
            {variant === 'editor-debug' && (
              <div className="mt-2 rounded-md border border-flow/20 bg-flow/[0.06] px-2.5 py-1.5">
                <p className="font-mono text-[8px] uppercase tracking-wide text-flow">Variables</p>
                <p className="mt-0.5 font-mono text-[9px] text-base-300">count = 27</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

const endState = <KeyboardVisual appName={APP_B.name} controls={APP_B.controls} readout={{ label: 'WORKFLOW', sub: 'VS CODE ↔ CHROME' }} glow={false} float={false} />

/**
 * The site's one flagship "show don't tell" moment — the two mechanisms the
 * product is actually about (Flow recognizing what you're doing inside an
 * app, and recognizing when you keep moving between two apps) fused into
 * one continuous sequence instead of two separate sections told with
 * paragraphs. Flow's own moments render as the same popup-card notification
 * the real app uses rather than bare headline text, and a real feature from
 * each application (a code pane with a live breakpoint, a browser's tab
 * strip) sits below it — real feedback was that the sequence read as text
 * describing the product rather than the product itself; the fix is
 * showing an actual recognizable slice of each application's own UI at
 * every stage, not just the keyboard and a caption.
 *
 * Deliberately not about a physical module docking onto the keyboard —
 * every stage here is the same keyboard, the same controls, just noticed
 * and re-emphasized. The hardware section further down the page is the
 * honest place for the physical modular story; this section is the
 * software recognition story, which is the part that has to land first.
 *
 * The keyboard's own wrapper, the popup's slot, and the feature preview's
 * slot are all fixed-size regardless of stage — real user feedback was
 * that the keyboard appeared to change size as captions of different
 * lengths reflowed the content above it.
 *
 * Pinned via `position: fixed` + an `absolute` hand-off at the crossover
 * point, not CSS `position: sticky` — Lenis's root scroll mode breaks
 * native sticky (see noma-website-project memory). See SCROLL_VH's comment
 * for why this is pinned and scroll-distance-gated rather than the earlier,
 * reverted approach of making content a pure function of scroll position
 * with no minimum exposure time.
 */
export default function WorkflowDemo() {
  const reduceMotion = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'before' | 'pinned' | 'after'>('before')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    let ticking = false
    const update = () => {
      ticking = false
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const total = rect.height - vh
      if (rect.top > 0) {
        setPhase('before')
        setProgress(0)
      } else if (rect.top <= -total) {
        setPhase('after')
        setProgress(1)
      } else {
        setPhase('pinned')
        setProgress(total > 0 ? -rect.top / total : 1)
      }
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduceMotion])

  // Reduced motion: skip pinning and scroll-scrubbing entirely and just show
  // the resolved end-state as a plain still illustration — this section's
  // job is demonstration, and the labeled keyboard alone shows the outcome
  // without needing motion to carry it.
  if (reduceMotion) {
    return (
      <section className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
          <p className="font-display text-2xl font-semibold text-base-50 sm:text-3xl">{STAGES[5].caption}</p>
          <div className="mx-auto mt-5 max-w-xs sm:max-w-sm">
            <FeaturePreview variant="browser" label="Chrome" />
          </div>
          <div className={KEYBOARD_WRAP_CLASS}>{endState}</div>
        </div>
      </section>
    )
  }

  const stage = stageFromProgress(progress)
  const recognizeFraction = Math.min(1, Math.max(0, (progress - STAGE_BOUNDS[1]) / (STAGE_BOUNDS[2] - STAGE_BOUNDS[1])))
  const count = Math.round(recognizeFraction * 27)
  const onAppB = stage >= 4

  // Every stage now drives its own keyboard content — no generic fallback
  // that's disconnected from the caption above it. Stage 0 shows the exact
  // shortcuts named in its chips (via `controls`, below) rather than an
  // unrelated default; every other stage has its own `readout` or emphasis.
  const readout =
    stage === 1
      ? { label: `${count}×`, sub: 'REPETITIONS' }
      : stage === 3
        ? { label: 'DEBUG?', sub: 'SUGGESTED' }
        : stage === 4
          ? { label: 'CHROME', sub: 'NOW IN FOCUS' }
          : stage >= 5
            ? { label: 'WORKFLOW', sub: 'VS CODE ↔ CHROME' }
            : null

  const featureVariant: FeatureVariant = stage <= 1 ? 'editor' : stage <= 3 ? 'editor-debug' : 'browser'
  const featureLabel = onAppB ? APP_B.name : APP_A.name

  const panelPositionClass =
    phase === 'pinned' ? 'fixed inset-x-0 top-0 h-screen' : phase === 'after' ? 'absolute inset-x-0 bottom-0 h-screen' : 'absolute inset-x-0 top-0 h-screen'

  return (
    <div ref={wrapRef} style={{ height: `${SCROLL_VH * 100}vh` }} className="relative border-t border-base-800 bg-base-950">
      {/* Top-anchored with real clearance, not vertically centered in the raw
          100vh panel — centering here meant this section's own content (tall
          enough on some stages that its centered top edge landed within the
          floating nav pill's ~90px footprint) rendered underneath the nav
          instead of below it. Every other section gets this clearance for
          free from `Section`'s own py-24/32 padding; this one needs it
          explicitly since it bypasses `Section` for its custom pinned
          wrapper. */}
      <div className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        <div className="mx-auto w-full max-w-3xl px-6 text-center sm:px-8" aria-hidden="true">
          <div className={POPUP_SLOT_CLASS}>
            <AnimatePresence mode="wait">
              <Popup stage={stage} />
            </AnimatePresence>
          </div>

          <div className={FEATURE_SLOT_CLASS}>
            <AnimatePresence mode="wait">
              <FeaturePreview variant={featureVariant} label={featureLabel} />
            </AnimatePresence>
          </div>

          <div className={KEYBOARD_WRAP_CLASS}>
            <KeyboardVisual
              appName={onAppB ? APP_B.name : APP_A.name}
              controls={stage === 0 ? REPEATED_KEYS : onAppB ? APP_B.controls : APP_A.controls}
              readout={readout}
              emphasizedLabels={stage === 2 || stage === 3 ? APP_A.emphasize : undefined}
              glow={false}
              float={false}
            />
          </div>

          <p
            className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-base-500 transition-opacity duration-300"
            style={{ opacity: phase === 'pinned' && stage < 5 ? 1 : 0 }}
          >
            Keep scrolling
          </p>
        </div>

        <p className="sr-only">
          Illustration: Flow notices you repeating the same three shortcuts, counts 27 repetitions, and recognizes
          that you're actively using Run and Debug inside VS Code — shown alongside a live code editor with a
          breakpoint and its variables. It suggests pinning Debug to a dedicated key. When you switch to Chrome, the
          preview becomes the browser's own tab strip, the keyboard's controls relabel for Chrome, and Flow names the
          two apps as a recognized workflow — nothing here is installed or made permanent, the interface simply
          keeps up with what you're doing.
        </p>
      </div>
    </div>
  )
}
