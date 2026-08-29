import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'

interface AppScreen {
  id: string
  label: string
  /** A real screenshot of the desktop app, dropped in as it's captured — see
   *  the placeholder note below for the ones not wired up yet. Swap the file
   *  and nothing else needs to change here. */
  image?: string
}

const screens: AppScreen[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'virtual-keyboard', label: 'Virtual Keyboard' },
  { id: 'macros', label: 'Macro Studio' },
]

export default function AppPreview() {
  const [activeId, setActiveId] = useState(screens[0].id)
  const active = screens.find((s) => s.id === activeId)!

  return (
    <Section id="app">
      <Reveal>
        <Kicker index="03" label="The App" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          The companion software, today.
        </h2>
        <p className="mt-5 max-w-xl text-balance text-base text-base-300">
          Noma runs as a desktop app right now, ahead of the physical keyboard &mdash; this is the real interface,
          not a mockup of one.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-16 max-w-3xl">
          {/* screen switcher */}
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {screens.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  s.id === activeId ? 'bg-accent/10 text-accent' : 'text-base-400 hover:text-base-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* window chrome */}
          <div className="overflow-hidden rounded-2xl border border-base-700 bg-base-850/60 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-base-700 bg-base-900/60 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-base-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-base-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-base-600" />
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-base-500">
                Noma &mdash; {active.label}
              </span>
            </div>

            <div className="relative aspect-[16/10] w-full bg-base-950">
              <AnimatePresence mode="wait">
                {active.image ? (
                  <motion.img
                    key={active.id}
                    src={active.image}
                    alt={`Noma app — ${active.label} screen`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                ) : (
                  <motion.div
                    key={active.id + '-placeholder'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">
                      Screenshot coming soon
                    </span>
                    <p className="max-w-xs text-sm text-base-400">
                      The {active.label} screen is live in the app &mdash; captured here as soon as it's ready.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
