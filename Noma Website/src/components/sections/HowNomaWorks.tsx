import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import KeyboardVisual from '../visuals/KeyboardVisual'
import { appProfiles } from '../../data/appProfiles'

// Four genuinely different domains — the autoplay loop is meant to read as
// "a workday," not a two-way toggle.
const apps = [appProfiles.vscode, appProfiles.premiere, appProfiles.solidworks, appProfiles.figma]

// The two controls Flow calls out once it recognizes the VS Code frame as a
// debugging session — a real subset of vscode's own control list (never a
// different list swapped in), so "recognized" only ever means "noticed
// among what's already there," not "replaced what's there."
const DEBUGGING_CONTROLS = ['Run', 'Debug']

// How many times the same two apps have to be traded (by a real click, not
// autoplay advancing on its own) before Flow calls it a recognized workflow.
const WORKFLOW_THRESHOLD = 2

// The autoplay "workday" script: which app is active and how long to hold
// before advancing. vscode appears twice — once before Flow has recognized
// anything about it, once after — so the in-app-recognition moment plays out
// on its own before moving to the next app, exactly like a visitor clicking
// through it by hand would see.
const AUTOPLAY_SEQUENCE: { appId: string; recognized: boolean; ms: number }[] = [
  { appId: 'vscode', recognized: false, ms: 2600 },
  { appId: 'vscode', recognized: true, ms: 3200 },
  { appId: 'premiere', recognized: false, ms: 3000 },
  { appId: 'solidworks', recognized: false, ms: 3000 },
  { appId: 'figma', recognized: false, ms: 3000 },
]

/**
 * Merges what used to be two separate sections ("How Noma Works" and
 * "Interactive Demo") into one. Autoplays a short simulated workday on a
 * loop — switching apps and, for VS Code, watching Flow recognize a
 * debugging session — so a visitor who never touches anything still *sees
 * the product in action* rather than a static illustration. The very first
 * click on a tab stops the loop and hands full control to the visitor.
 *
 * Deliberately NOT "notice a pattern, offer to make it a permanent control"
 * (that moment lived here before, and its close cousin — a physical module
 * docking onto the keyboard — lives in WorkflowDemo.tsx). This section is
 * the other half of the pitch: Flow recognizing what you're doing *inside*
 * an app, and recognizing when you keep moving between two apps — both
 * ambient, both true without the visitor accepting or installing anything.
 *
 * Each autoplay transition still announces itself with a transient "New
 * workflow detected" flash — real feedback was that autoplay silently
 * reusing a click's own highlight style made the whole thing read as "a
 * button being pressed," undermining the point that Flow is noticing this
 * on its own, not responding to a click.
 *
 * Autoplay itself is a plain viewport-gated `setTimeout` chain (paused
 * entirely off-screen via `useInView`, skipped entirely under
 * `prefers-reduced-motion`) — not scroll-driven. See noma-website-project
 * memory: a scroll-position-driven version of this exact content was tried
 * and reverted ("scrolling too fast will miss it"); a timed loop that
 * plays out on its own, regardless of scrolling, doesn't have that failure
 * mode at all.
 */
export default function HowNomaWorks() {
  const [activeId, setActiveIdState] = useState('vscode')
  const [recognized, setRecognized] = useState(false)
  const [workflowPair, setWorkflowPair] = useState<[string, string] | null>(null)
  const [autoplay, setAutoplay] = useState(true)
  const [frameIdx, setFrameIdx] = useState(0)
  // A brief "detected" flash, true for a moment at the start of each
  // autoplay frame — named explicitly so the cause of the change reads as
  // Flow noticing something, not a button being pressed.
  const [detected, setDetected] = useState(false)
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { margin: '-20% 0px -20% 0px' })

  const dwellTimer = useRef<number | null>(null)
  const pairCounts = useRef<Record<string, number>>({})
  const announcedPairs = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!autoplay || !inView || reduceMotion) return
    const step = AUTOPLAY_SEQUENCE[frameIdx]
    setActiveIdState(step.appId)
    setRecognized(step.recognized)
    setDetected(true)
    const flashTimer = setTimeout(() => setDetected(false), 1000)
    const advanceTimer = setTimeout(() => setFrameIdx((i) => (i + 1) % AUTOPLAY_SEQUENCE.length), step.ms)
    return () => {
      clearTimeout(flashTimer)
      clearTimeout(advanceTimer)
    }
  }, [autoplay, inView, reduceMotion, frameIdx])

  useEffect(() => {
    return () => {
      if (dwellTimer.current !== null) window.clearTimeout(dwellTimer.current)
    }
  }, [])

  // Any manual interaction stops the loop permanently for this visit —
  // clicking an app mid-autoplay would otherwise fight the next scheduled
  // frame for control of the same state.
  function selectApp(id: string) {
    setAutoplay(false)
    if (dwellTimer.current !== null) window.clearTimeout(dwellTimer.current)
    setRecognized(false)

    setActiveIdState((prev) => {
      if (prev !== id) {
        const key = [prev, id].sort().join('|')
        pairCounts.current[key] = (pairCounts.current[key] ?? 0) + 1
        if (pairCounts.current[key] >= WORKFLOW_THRESHOLD && !announcedPairs.current.has(key)) {
          announcedPairs.current.add(key)
          setWorkflowPair([prev, id])
        }
      }
      return id
    })

    // A real click gets the same "notices after a moment, not instantly"
    // pacing the autoplay script uses — recognition reads as genuine
    // attention, not a lookup table keyed on which tab is open.
    if (id === 'vscode') {
      dwellTimer.current = window.setTimeout(() => setRecognized(true), 1100)
    }
  }

  const active = apps.find((a) => a.id === activeId)!
  const emphasizedLabels = active.id === 'vscode' && recognized ? DEBUGGING_CONTROLS : undefined

  const insight =
    active.id === 'vscode' && recognized
      ? "Pattern recognized — you're debugging"
      : workflowPair
        ? `Workflow recognized — you move between ${appProfiles[workflowPair[0] as keyof typeof appProfiles]?.shortName ?? workflowPair[0]} and ${appProfiles[workflowPair[1] as keyof typeof appProfiles]?.shortName ?? workflowPair[1]}`
        : null

  return (
    <Section id="how">
      <div ref={sectionRef}>
        <Reveal>
          <h2 className="max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            It knows what you're doing.
          </h2>
          <p className="mt-4 text-sm text-base-400">
            Not just which app is open — what you're doing inside it. Click an app below to take the wheel.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mb-4 flex h-6 items-center justify-center">
            <AnimatePresence>
              {autoplay && detected && !reduceMotion && (
                <motion.div
                  key={frameIdx}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-2 rounded-full border border-flow/30 bg-flow/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-flow"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-flow" />
                  New workflow detected
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-base-700 bg-base-850/60">
            <div className="flex border-b border-base-700 p-2">
              {apps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => selectApp(app.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    app.id === activeId && !autoplay ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-100'
                  }`}
                >
                  {app.color && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: app.color }} />}
                  {app.shortName}
                </button>
              ))}
            </div>

            <div className="flex justify-center p-10 sm:p-14">
              <div className="w-full max-w-[200px]">
                <KeyboardVisual appName={active.name} controls={active.controls} emphasizedLabels={emphasizedLabels} oledOnly />
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mx-auto mt-6 max-w-xl">
          <AnimatePresence mode="wait">
            {insight && (
              <motion.div
                key={insight}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-flow/30 bg-flow/[0.05] px-5 py-4 text-center"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-flow" />
                <p className="text-sm text-flow-bright">{insight}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}
