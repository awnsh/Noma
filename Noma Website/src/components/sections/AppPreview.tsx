import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import AppKeyboardGrid from '../visuals/AppKeyboardGrid'
import VirtualControlTile from '../visuals/VirtualControlTile'
import DashboardDemo from '../visuals/DashboardDemo'
import MacroStudioDemo from '../visuals/MacroStudioDemo'
import { appProfiles } from '../../data/appProfiles'
import { controlKeys, formatShortcutCaption } from '../../data/controlActions'

interface AppScreen {
  id: string
  label: string
}

// Every screen here is a faithful, interactive recreation of the real app's
// page — built from the real app's own pure components re-themed onto this
// site's tokens, driven by local state instead of the real IPC bridge (see
// each demo component's own doc comment for exactly what was ported and why).
const screens: AppScreen[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'virtual-keyboard', label: 'Virtual Keyboard' },
  { id: 'macros', label: 'Macro Studio' },
]

const vscode = appProfiles.vscode

/** The one part of this preview you can actually press — press a control,
 *  watch its real shortcut light up on the keyboard below it, exactly like
 *  the app itself does when workflow monitoring captures a combo. */
function VirtualKeyboardDemo() {
  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(new Set())

  const press = (label: string) => {
    const keys = controlKeys[label]
    if (!keys) return
    setFlashingKeys(new Set(keys))
    window.setTimeout(() => setFlashingKeys(new Set()), 500)
  }

  return (
    <div className="p-3 sm:p-8">
      <AppKeyboardGrid flashingKeys={flashingKeys} />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {vscode.controls.map((label, i) => (
          <VirtualControlTile
            key={label}
            slot={i + 1}
            label={label}
            caption={controlKeys[label] && formatShortcutCaption(controlKeys[label])}
            onPress={() => press(label)}
          />
        ))}
      </div>
    </div>
  )
}

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
          Noma runs as a desktop app right now, ahead of the physical keyboard &mdash; switch applications, press a
          control, build a macro below. It&rsquo;s the real interface responding, not a mockup of one.
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

            <div className="relative min-h-[26rem] w-full bg-base-950">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {active.id === 'dashboard' && <DashboardDemo />}
                  {active.id === 'virtual-keyboard' && <VirtualKeyboardDemo />}
                  {active.id === 'macros' && <MacroStudioDemo />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
