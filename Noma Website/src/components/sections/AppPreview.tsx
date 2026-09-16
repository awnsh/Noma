import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import WindowDots from '../ui/WindowDots'
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

/**
 * The real, interactive Noma software — Holo's own proof, not a screenshot
 * or a purpose-built mockup. This used to be its own standalone section
 * ("Your keyboard has software now"); folded into `Holo.tsx` instead, since
 * "no hardware, no problem" is a stronger, truer home for "this is literally
 * software you can click" than a generic mid-page product tour was. No
 * `Section`/heading of its own — the caller supplies both, matching however
 * that section wants to frame it.
 */
export default function AppPreview() {
  const [activeId, setActiveId] = useState(screens[0].id)
  const active = screens.find((s) => s.id === activeId)!

  return (
    <div className="mx-auto max-w-3xl">
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
          <WindowDots />
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-base-500">Holo &mdash; {active.label}</span>
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
  )
}
