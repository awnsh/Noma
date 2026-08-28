import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import KeyboardVisual from '../visuals/KeyboardVisual'
import { appProfiles, vscodeLearnedControls } from '../../data/appProfiles'

const apps = [appProfiles.vscode, appProfiles.chrome, appProfiles.premiere]

export default function InteractiveDemo() {
  const [activeId, setActiveId] = useState('vscode')
  const [learned, setLearned] = useState(false)

  const active = apps.find((a) => a.id === activeId)!
  const controls = active.id === 'vscode' && learned ? vscodeLearnedControls : active.controls
  const showFlowPrompt = active.id === 'vscode' && !learned

  return (
    <Section id="demo">
      <Reveal>
        <Kicker index="04" label="Interactive Demo" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Try Noma.
        </h2>
        <p className="mt-5 max-w-xl text-balance text-base text-base-300">
          Switch applications below — no install required. Watch the controls change with you.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-base-700 bg-base-850/60">
          <div className="flex border-b border-base-700 p-2">
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => setActiveId(app.id)}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  app.id === activeId ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-100'
                }`}
              >
                {app.shortName}
              </button>
            ))}
          </div>

          <div className="p-8 sm:p-10">
            <KeyboardVisual appName={active.name} controls={controls} glow={false} float={false} />
          </div>
        </div>
      </Reveal>

      <div className="mx-auto mt-6 max-w-xl">
        <AnimatePresence mode="wait">
          {showFlowPrompt ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-6 text-center"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Flow noticed something</p>
              <p className="mt-3 text-base text-base-100">
                You&rsquo;ve repeated <span className="text-base-50">Command Palette</span> and{' '}
                <span className="text-base-50">Git Commit</span> 27 times this week.
              </p>
              <p className="mt-1 text-sm text-base-400">Would you like to turn this workflow into one control?</p>
              <button
                onClick={() => setLearned(true)}
                className="mt-5 inline-flex rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-base-950 transition-colors hover:bg-accent-bright"
              >
                Add to Keyboard
              </button>
            </motion.div>
          ) : active.id === 'vscode' ? (
            <motion.div
              key="adapted"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-base-700 bg-base-850/40 p-5 text-center"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <p className="text-sm text-base-300">This is now your Noma &mdash; adapted from what Flow learned.</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Section>
  )
}
