import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AppControlTile from '../visuals/AppControlTile'
import WindowDots from '../ui/WindowDots'
import { usePinnedScroll, stageLocalT, lerp } from '../../hooks/usePinnedScroll'
import { controlKeys, formatShortcutCaption } from '../../data/controlActions'

const SCROLL_VH = 3.3

// The first slice of the scroll is a one-time entrance, not a content
// stage: the white backdrop starts exactly matching the window's own
// measured footprint and grows out from there to (almost) fill the panel —
// it never grows past FULL_INSET's own margin, so it stays a visibly
// rounded card rather than a sharp-cornered full-bleed rectangle even once
// "expanded."
const INTRO_END = 0.15
const FULL_INSET = 3

const STAGE_BOUNDS = [0, 1 / 5, 2 / 5, 3 / 5, 4 / 5, 1.001]
const STAGE_COUNT = STAGE_BOUNDS.length - 1

const BASE_CONTROLS = ['Run', 'Debug', 'Terminal', 'Search']
const ADAPTED_CONTROLS = ['Run', 'Debug', 'Terminal', 'Command Palette']

// The same pattern DashboardDemo's own (click-driven) suggestion card uses —
// deliberately the identical story, not a new one, so a visitor who tried
// the real software tab above recognizes it here rather than learning a
// second unrelated example.
const SUGGESTION = {
  title: 'Add Command Palette to your controls',
  explanation: "You've opened Command Palette right before Git Commit 27 times this week.",
  confidence: 92,
}

const CAPTIONS = [
  'You keep doing this.',
  'Flow notices the pattern.',
  'It suggests adding a control.',
  'You accept it.',
  'Now it’s part of your keyboard.',
]

function stageFromProgress(p: number) {
  for (let i = 0; i < STAGE_BOUNDS.length - 1; i++) {
    if (p < STAGE_BOUNDS[i + 1]) return i
  }
  return STAGE_BOUNDS.length - 2
}

// Wide enough that the window keeps its original single-column width (the
// same ~830px it had before this section grew a side caption column)
// instead of the two columns splitting one narrower box in half — real
// feedback was that giving the caption an equal-ish column shrank the
// window noticeably. The caption gets a slim, mostly-fixed sidebar instead
// of a real fraction of the grid.
const WRAP_CLASS = 'relative mx-auto w-full max-w-7xl px-6 sm:px-8'
const GRID_CLASS = 'grid items-center gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14'

// A bright white panel, not another dark section — the one deliberate
// break from base-950 on the whole page, by request. The dark `Window`
// mockup sits on top of it as a floating card (its own colors untouched),
// the same "product photographed on a plain studio backdrop" convention a
// lot of premium hardware marketing uses. Everything that sits directly on
// this backdrop (the caption, the progress bar, the scroll hint) needed
// its own dark-on-light colors — see their own classes below — since every
// other token on this site was tuned for light-on-dark.
const BACKDROP_BG = '#f5f5f7'

/**
 * The site's proof that Noma learns, not just adapts per app — deliberately
 * built to look nothing like ProductDemo.tsx or the flagship demo above it,
 * per real feedback that an earlier version of this section (a keyboard
 * illustration + a big centered caption, functionally the same recipe as
 * the flagship demo) read as a repeated section rather than a different
 * one. The differences here are structural, not decorative: the subject is
 * a realistic Noma *software* window (reusing `AppControlTile`, the real
 * Dashboard's own component, and the exact suggestion story DashboardDemo's
 * interactive tab already tells) instead of the keyboard SVG; the copy sits
 * beside the window in its own column instead of stacked above it; the
 * section itself washes to a navy backdrop instead of staying base-950;
 * and the story is "the same app noticing a repeated in-app action," not
 * "different apps, different controls" — ProductDemo's job, not this
 * section's.
 *
 * Still pinned via the shared `usePinnedScroll` hook — scroll-scrubbed
 * software state is exactly spacefs.com's own technique (a real app window
 * whose content advances as you scroll), so reusing the site's pin
 * mechanism here isn't the part that read as repetitive; the keyboard-and-
 * headline visual recipe was.
 */
export default function AdaptiveIntelligence() {
  const { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass } = usePinnedScroll({ scrollVh: SCROLL_VH })

  // Where the backdrop's expansion actually originates from — the window's
  // own measured position within the panel, not a guess, so the backdrop
  // reads as growing out of the application itself rather than an
  // unrelated box in the middle of the screen. Measured once on mount and
  // on resize, not every scroll frame — the window's position within the
  // panel only changes when the viewport width changes, never from
  // scrolling itself (the panel is always exactly viewport-sized regardless
  // of pin phase; see usePinnedScroll's own doc comment).
  const windowColRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState({ top: 20, right: 10, bottom: 20, left: 45 })

  useLayoutEffect(() => {
    function measure() {
      const panel = panelRef.current
      const win = windowColRef.current
      if (!panel || !win) return
      const p = panel.getBoundingClientRect()
      const w = win.getBoundingClientRect()
      if (p.width === 0 || p.height === 0) return
      setOrigin({
        top: ((w.top - p.top) / p.height) * 100,
        right: ((p.right - w.right) / p.width) * 100,
        bottom: ((p.bottom - w.bottom) / p.height) * 100,
        left: ((w.left - p.left) / p.width) * 100,
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (reduceMotion) {
    return (
      <section id="adaptive" className="relative border-t border-base-800 py-24 sm:py-32">
        <div className="absolute inset-3 rounded-[2rem] sm:inset-6" style={{ background: BACKDROP_BG }} />
        <div className={`${WRAP_CLASS} relative ${GRID_CLASS}`}>
          <div>
            <p className="text-2xl font-medium text-base-950 sm:text-3xl">{CAPTIONS[4]}</p>
            <ProgressBar contentProgress={1} />
          </div>
          <Window
            controls={ADAPTED_CONTROLS}
            justAddedSlot={4}
            showCounter={false}
            showSuggestion={false}
            accepted
            count={27}
            flowStatus="Flow is noticing patterns."
          />
        </div>
      </section>
    )
  }

  // The intro (see INTRO_END's comment) consumes the first slice of
  // `progress`; everything content-related below is driven by
  // `contentProgress`, which stays at 0 through the whole intro and then
  // maps the remaining scroll distance back onto the full 0-1 range the
  // five stages already expect.
  const contentProgress = Math.min(1, Math.max(0, (progress - INTRO_END) / (1 - INTRO_END)))
  const introT = stageLocalT(progress, 0, INTRO_END)
  // Each side eases from the window's own measured offset down to
  // `FULL_INSET` (not all the way to 0 — see its own comment) — `clip-path`
  // rather than a `scale` transform, since scaling a full-bleed layer up
  // from its own center pushes its edges past the viewport instead of
  // growing outward from a contained box.
  const backdropTop = lerp(origin.top, FULL_INSET, introT)
  const backdropRight = lerp(origin.right, FULL_INSET, introT)
  const backdropBottom = lerp(origin.bottom, FULL_INSET, introT)
  const backdropLeft = lerp(origin.left, FULL_INSET, introT)
  // Invisible at the very start rather than trusting the clip-path to land
  // exactly on the window's own edge pixel-for-pixel — a shadow, a border
  // radius that doesn't quite match, or simple measurement rounding could
  // otherwise leave a sliver of white peeking past the window before any
  // growth was meant to be visible. Fully opaque well before the box has
  // grown enough to matter.
  const backdropOpacity = Math.min(1, introT / 0.3)

  const stage = stageFromProgress(contentProgress)
  const count = Math.round(stageLocalT(contentProgress, STAGE_BOUNDS[1], STAGE_BOUNDS[2]) * 27)
  const controls = stage >= 4 ? ADAPTED_CONTROLS : BASE_CONTROLS
  const showCounter = stage >= 1 && stage < 4
  const showSuggestion = stage >= 2 && stage < 4
  const accepted = stage >= 3
  const flowStatus = stage === 0 ? "Flow isn't noticing anything yet." : stage < 4 ? 'Flow noticed something — see below.' : 'Flow is noticing patterns.'

  return (
    <div ref={wrapRef} id="adaptive" className="relative border-t border-base-800 bg-base-950" style={{ height: `${SCROLL_VH * 100}vh` }}>
      {/* Top-anchored with real clearance, not vertically centered — see
          usePinnedScroll's doc comment / WorkflowDemo.tsx's own history:
          centering a pinned panel's content risks its top edge landing
          inside the floating nav pill's footprint on shorter viewports. */}
      <div ref={panelRef} className={`${panelPositionClass} flex flex-col items-center justify-start pt-28 pb-10 sm:pt-32`}>
        {/* The expanding backdrop — starts exactly matching the window's
            own footprint and grows out to (almost) fill the panel via
            `clip-path: inset()`. Sits behind `contentRef` in its own paint
            layer (`z-0` vs `z-10`), not before it in source order, since an
            absolutely-positioned box with no z-index would otherwise paint
            above static content regardless of DOM order. */}
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            background: BACKDROP_BG,
            clipPath: `inset(${backdropTop}% ${backdropRight}% ${backdropBottom}% ${backdropLeft}% round 2rem)`,
            opacity: backdropOpacity,
          }}
        />

        <div
          ref={contentRef}
          className={`${WRAP_CLASS} relative z-10 ${GRID_CLASS}`}
          style={{ transform: `scale(${contentScale})`, transformOrigin: '50% 0%' }}
          aria-hidden="true"
        >
          <div style={{ opacity: introT }}>
            <div className="flex h-[96px] items-start sm:h-[76px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="text-2xl font-medium text-base-950 sm:text-3xl"
                >
                  {CAPTIONS[stage]}
                </motion.p>
              </AnimatePresence>
            </div>

            <ProgressBar contentProgress={contentProgress} />

            <p
              className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-base-500/70 transition-opacity duration-300"
              style={{ opacity: phase === 'pinned' && stage < 4 ? 1 : 0 }}
            >
              Keep scrolling
            </p>
          </div>

          <div ref={windowColRef}>
            <Window
              controls={controls}
              justAddedSlot={stage >= 4 ? 4 : null}
              showCounter={showCounter}
              showSuggestion={showSuggestion}
              accepted={accepted}
              count={count}
              flowStatus={flowStatus}
            />
          </div>
        </div>

        <p className="sr-only">
          Illustration: the Noma dashboard notices you've opened Command Palette right before Git Commit 27 times
          this week, suggests adding Command Palette to your controls, and — once accepted — the control appears
          among your keyboard's current controls, replacing Search.
        </p>
      </div>
    </div>
  )
}

/** Five segments, one per stage — each fills left-to-right as that stage
 *  plays, not a single continuous bar, so "how far through" also reads as
 *  "which beat am I on" at a glance (the `stage` prop isn't read directly;
 *  each segment derives its own fill purely from `contentProgress`, so it
 *  stays correct even if a future stage count changes). */
function ProgressBar({ contentProgress }: { contentProgress: number }) {
  return (
    <div className="mt-6 flex gap-1.5">
      {Array.from({ length: STAGE_COUNT }).map((_, i) => {
        const segT = stageLocalT(contentProgress, STAGE_BOUNDS[i], STAGE_BOUNDS[i + 1])
        return (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${segT * 100}%` }} />
          </div>
        )
      })}
    </div>
  )
}

function Window({
  controls,
  justAddedSlot,
  showCounter,
  showSuggestion,
  accepted,
  count,
  flowStatus,
}: {
  controls: string[]
  justAddedSlot: number | null
  showCounter: boolean
  showSuggestion: boolean
  accepted: boolean
  count: number
  flowStatus: string
}) {
  return (
    // Opaque (`bg-base-900`, not the site's usual translucent `/60`) —
    // real feedback was that a see-through window let the navy backdrop
    // wash out the labels inside it. A real application window isn't
    // translucent either, so this reads as more of a genuine app, not less.
    <div className="overflow-hidden rounded-2xl border border-base-700 bg-base-900 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-base-700 bg-base-900/60 px-4 py-3">
        <WindowDots />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-base-500">Noma — Dashboard</span>
      </div>

      <div className="p-6 sm:p-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-base-500">Current Application</div>
          <div className="mt-1.5 text-2xl font-semibold text-base-100">Visual Studio Code</div>
        </div>

        <div className="mt-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-base-500">Current Controls</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((slot) => {
              const label = controls[slot - 1]
              const keys = controlKeys[label]
              return (
                <div key={slot} className="relative">
                  <AppControlTile slot={slot} label={label} caption={keys && formatShortcutCaption(keys)} />
                  {justAddedSlot === slot && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-flow px-1.5 py-0.5 text-[9px] font-medium text-base-950">Added</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex h-5 items-center gap-2 font-mono text-xs text-base-500">
          {showCounter && (
            <>
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-flow" />
              Command Palette → Git Commit: {count}&times; this week
            </>
          )}
        </div>

        {/* A fixed-height slot, always present, regardless of whether the
            card inside is showing — real feedback was that the whole
            window appeared to resize continuously while scrolling; the
            actual cause was this card's `mt-6` section only existing in
            the DOM while `showSuggestion` was true, so the window's own
            height changed every time it mounted/unmounted. Reserving the
            space up front means the window's height is a true constant
            across every stage — the only thing that ever moves is the
            backdrop expanding behind it. */}
        <div className="mt-6 min-h-[150px] sm:min-h-[134px]">
          <AnimatePresence>
            {showSuggestion && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-flow/30 bg-flow/[0.05] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-base-100">{SUGGESTION.title}</div>
                    <p className="mt-1 text-sm text-base-400">{SUGGESTION.explanation}</p>
                  </div>
                  <div className="shrink-0 rounded-full border border-base-600 px-2 py-0.5 text-[10px] uppercase tracking-widest text-base-500">
                    {SUGGESTION.confidence}%
                  </div>
                </div>

                <div className="mt-3">
                  {/* Fixed `h-7` rather than letting padding size it — the
                      "✓" glyph's line metrics render a couple px taller
                      than plain text in this font, which was enough to
                      nudge the whole window's height between the "Accept"
                      and "✓ Accepted" states despite the slot above. */}
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-flow-dim bg-flow/10 px-3 text-xs font-medium leading-none text-flow">
                    {accepted ? '✓ Accepted' : 'Accept'}
                  </span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-base-700 bg-base-900/60 px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-base-500">Flow Status</div>
            <div className="mt-1.5 text-sm text-base-300">{flowStatus}</div>
          </div>
          <span className="shrink-0 text-xs text-base-500">Settings</span>
        </div>
      </div>
    </div>
  )
}
