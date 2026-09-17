import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import KeyboardVisual from '../visuals/KeyboardVisual'
import DemoWorkflowChain, { type DemoChainStep } from '../visuals/DemoWorkflowChain'
import Reveal from '../ui/Reveal'
import { GLASS_TOGGLE, GLASS_TOGGLE_ACTIVE } from '../../lib/glass'

interface Category {
  id: string
  label: string
  chain: DemoChainStep[]
  controls: string[]
}

// Four plausible, real workflows — not the same coding example the site
// has already shown twice by this point. Each one's `controls` is what
// the keyboard would actually end up with, matching its own chain.
const CATEGORIES: Category[] = [
  {
    id: 'coding',
    label: 'Coding',
    chain: [
      { kind: 'shortcut', label: 'Screenshot' },
      { kind: 'app', appId: 'claude', label: 'Claude' },
      { kind: 'shortcut', label: 'Paste' },
      { kind: 'app', appId: 'github', label: 'GitHub' },
    ],
    controls: ['Screenshot', 'Paste', 'Run', 'Commit'],
  },
  {
    id: 'design',
    label: 'Design',
    chain: [
      { kind: 'app', appId: 'figma', label: 'Figma' },
      { kind: 'shortcut', label: 'Comment' },
      { kind: 'app', appId: 'chrome', label: 'Chrome' },
      { kind: 'shortcut', label: 'Send' },
    ],
    controls: ['Comment', 'Frame', 'Component', 'Share'],
  },
  {
    id: 'video',
    label: 'Video',
    chain: [
      { kind: 'app', appId: 'premiere', label: 'Premiere' },
      { kind: 'shortcut', label: 'Export' },
      { kind: 'app', appId: 'youtube', label: 'YouTube' },
      { kind: 'shortcut', label: 'Publish' },
    ],
    controls: ['Cut', 'Export', 'Thumbnail', 'Publish'],
  },
  {
    id: 'research',
    label: 'Research',
    chain: [
      { kind: 'app', appId: 'chrome', label: 'Chrome' },
      { kind: 'shortcut', label: 'Screenshot' },
      { kind: 'app', appId: 'claude', label: 'Claude' },
      { kind: 'app', appId: 'notion', label: 'Notion' },
    ],
    controls: ['Screenshot', 'Prompt', 'New Page', 'Save'],
  },
]

/**
 * "Build the way you work." — the one section on the page that hands the
 * concept to the visitor directly instead of showing it to them. Pick a
 * category, watch a real workflow assemble, watch the keyboard pick up
 * the resulting controls — the same real-icon workflow-chain and keyboard
 * components every other section uses, just click-driven instead of
 * scroll-driven, since the point here is "try it yourself," not another
 * choreographed reveal.
 */
export default function WorkflowBuilder() {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id)
  const active = CATEGORIES.find((c) => c.id === activeId)!

  return (
    <section id="builder" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
        <Reveal>
          <h2 className="text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Build the way you work.
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`rounded-full px-5 py-2.5 text-sm font-medium ${activeId === c.id ? GLASS_TOGGLE_ACTIVE : GLASS_TOGGLE}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 flex min-h-[132px] items-start justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <DemoWorkflowChain steps={active.chain} size="lg" />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative mx-auto mt-8 w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div key={activeId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <KeyboardVisual appName={active.label} controls={active.controls} emphasizedLabels={active.controls} glow={false} float={false} showPinConnectors={false} />
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
