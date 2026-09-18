import { useState } from 'react'
import KeyboardVisual from '../visuals/KeyboardVisual'
import Reveal from '../ui/Reveal'
import { GLASS_TOGGLE, GLASS_TOGGLE_ACTIVE } from '../../lib/glass'

interface AppContext {
  id: string
  appName: string
  /** Real sub-workflows *within* this one piece of software, not a
   *  high-level domain label standing in for the whole app — VS Code
   *  doesn't have one "coding" workflow, it has several distinct ones
   *  (committing, debugging, coding itself, reviewing), and Noma tells
   *  them apart from each other the same way it tells apps apart. */
  workflows: string[]
}

const CONTEXTS: AppContext[] = [
  { id: 'vscode', appName: 'VS Code', workflows: ['Commit', 'Coding', 'Debug', 'Review'] },
  { id: 'premiere', appName: 'Premiere', workflows: ['Cut', 'Grade', 'Keyframe', 'Export'] },
  { id: 'figma', appName: 'Figma', workflows: ['Wireframe', 'Prototype', 'Comment', 'Handoff'] },
  { id: 'chrome', appName: 'Chrome', workflows: ['Search', 'Screenshot', 'Tabs', 'Bookmark'] },
  { id: 'photoshop', appName: 'Photoshop', workflows: ['Mask', 'Retouch', 'Composite', 'Export'] },
  { id: 'blender', appName: 'Blender', workflows: ['Model', 'Sculpt', 'Render', 'Rig'] },
  { id: 'notion', appName: 'Notion', workflows: ['Draft', 'Database', 'Comment', 'Share'] },
]

/**
 * "Your workflow. Right where you need it." — a close-up on the one part
 * of the physical product that actually changes: the OLED strip.
 * `oledOnly` crops the illustration down to just the screen (chassis and
 * keys omitted, not shrunk offscreen), enlarged, so it reads as a real
 * product close-up rather than a small detail on a full keyboard shot
 * already shown twice above. Two levels of real interactivity: pick the
 * app context (VS Code vs. Premiere), then press one of that app's own
 * four workflows to see it read as "just pressed" — the same distinction
 * every other section makes between apps, applied one level deeper, to
 * the different real workflows a single app actually has.
 */
export default function KeyboardCloseup() {
  const [contextId, setContextId] = useState(CONTEXTS[0].id)
  const context = CONTEXTS.find((c) => c.id === contextId)!
  const [active, setActive] = useState(context.workflows[0])

  const selectContext = (id: string) => {
    setContextId(id)
    setActive(CONTEXTS.find((c) => c.id === id)!.workflows[0])
  }

  return (
    <section id="closeup" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <Reveal>
          <h2 className="text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Your workflow.
            <br />
            <span className="text-base-400">Right where you need it.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
            {CONTEXTS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectContext(c.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${contextId === c.id ? GLASS_TOGGLE_ACTIVE : GLASS_TOGGLE}`}
              >
                {c.appName}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <div className="relative mx-auto mt-8 max-w-[220px]">
            <KeyboardVisual
              appName={context.appName}
              controls={context.workflows}
              emphasizedLabels={[active]}
              onControlClick={setActive}
              oledOnly
              glow
              float={false}
            />
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-base-500">Press a control</p>
          <p className="mx-auto mt-2 max-w-xs text-balance text-sm text-base-400">
            {context.appName} has four different workflows. One press runs the {active.toLowerCase()} one.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
