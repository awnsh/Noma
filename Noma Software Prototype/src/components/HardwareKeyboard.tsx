import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { appProfiles, type AppId, type ControlDef } from '../data/appProfiles'
import { GLASS_PANEL, KEYCAP_SHADOW } from '../lib/surfaces'
import { parseShortcutToKeyNames } from '../lib/parseShortcut'
import { ControlIcon } from './ControlIcon'
import type { TransitionPhase } from '../store/nomaStore'

/**
 * The hero of the whole prototype: one physical keyboard, rendered as
 * software. Not a dashboard with a decorative keyboard graphic bolted on
 * top of it — every key here, static or adaptive, is the same size, same
 * material, same chassis. The only thing that's "app UI" is the thin
 * embedded screen; everything else is meant to read as hardware.
 *
 * Layout mirrors a real compact (TKL) board: the alpha block on the left
 * never changes. On the right, where a real TKL keyboard has its nav
 * cluster (Home/End/PgUp/PgDn/Insert/Delete) and arrow keys, this one has
 * Noma's adaptive module instead — same keycap size class as a real macro
 * pad attachment, not a bigger "app icon" tile. Everything here scales off
 * one `--key` CSS variable (see KEY_CSS below) so it stays proportional at
 * any size instead of the static/adaptive halves drifting apart.
 *
 * A violet ring on a key means the currently recognized activity is about
 * that control (see PatternRecognition.tsx / lib/detectActivity.ts) —
 * this is the payoff shot: Noma names what it noticed, and this is where
 * that becomes a visible change to the interface, not just a sentence.
 */

const KEY_CSS = { '--key': 'clamp(26px, 3.4vw, 58px)' } as CSSProperties
const EASE = [0.16, 1, 0.3, 1] as const

interface StaticKey {
  label: string
  units: number
  flashName?: string
  spacer?: boolean
}

const FUNCTION_ROW: StaticKey[] = [
  { label: 'esc', units: 1.4, flashName: 'Escape' },
  { label: '', units: 0.6, spacer: true },
  ...Array.from({ length: 12 }, (_, i) => ({ label: `F${i + 1}`, units: 1, flashName: `F${i + 1}` })),
]

const NUMBER_ROW: StaticKey[] = [
  { label: '`', units: 1, flashName: 'Backquote' },
  ...'1234567890'.split('').map((d) => ({ label: d, units: 1, flashName: d })),
  { label: '-', units: 1, flashName: 'Minus' },
  { label: '=', units: 1, flashName: 'Equal' },
  { label: '⌫', units: 2, flashName: 'Backspace' },
]

const TAB_ROW: StaticKey[] = [
  { label: 'tab', units: 1.5, flashName: 'Tab' },
  ...'QWERTYUIOP'.split('').map((k) => ({ label: k, units: 1, flashName: k })),
  { label: '[', units: 1, flashName: 'BracketLeft' },
  { label: ']', units: 1, flashName: 'BracketRight' },
]

const CAPS_ROW: StaticKey[] = [
  { label: 'caps', units: 1.75, flashName: 'CapsLock' },
  ...'ASDFGHJKL'.split('').map((k) => ({ label: k, units: 1, flashName: k })),
  { label: ';', units: 1, flashName: 'Semicolon' },
  { label: '⏎', units: 2.25, flashName: 'Enter' },
]

const SHIFT_ROW: StaticKey[] = [
  { label: 'shift', units: 2.25, flashName: 'Shift' },
  ...'ZXCVBNM'.split('').map((k) => ({ label: k, units: 1, flashName: k })),
  { label: ',', units: 1, flashName: 'Comma' },
  { label: '.', units: 1, flashName: 'Period' },
  { label: 'shift', units: 2.75, flashName: 'Shift' },
]

const BOTTOM_ROW: StaticKey[] = [
  { label: 'ctrl', units: 1.25, flashName: 'Control' },
  { label: 'win', units: 1.25, flashName: 'Meta' },
  { label: 'alt', units: 1.25, flashName: 'Alt' },
  { label: '', units: 6.25, flashName: 'Space' },
  { label: 'alt', units: 1.25, flashName: 'Alt' },
  { label: 'win', units: 1.25, flashName: 'Meta' },
  { label: 'ctrl', units: 1.25, flashName: 'Control' },
]

const ALPHA_ROWS = [FUNCTION_ROW, NUMBER_ROW, TAB_ROW, CAPS_ROW, SHIFT_ROW, BOTTOM_ROW]

function StaticKeyCap({ k, flashing }: { k: StaticKey; flashing: boolean }) {
  if (k.spacer) {
    return <div style={{ width: `calc(var(--key) * ${k.units})`, height: 'var(--key)' }} />
  }
  return (
    <div
      style={{ width: `calc(var(--key) * ${k.units})`, height: 'var(--key)' }}
      className={`flex shrink-0 items-center justify-center rounded-[0.22em] border text-[max(9px,0.32em)] font-medium transition-colors duration-200 ${KEYCAP_SHADOW} ${
        flashing
          ? 'border-accent bg-accent/20 text-accent'
          : 'border-white/[0.06] bg-gradient-to-b from-base-800 to-base-900 text-base-500'
      }`}
    >
      {k.label}
    </div>
  )
}

interface AdaptiveKeyProps {
  control: ControlDef | undefined
  emphasized: boolean
  dimmed: boolean
  index: number
  onPress: (control: ControlDef) => void
}

function AdaptiveKey({ control, emphasized, dimmed, index, onPress }: AdaptiveKeyProps) {
  const [pressed, setPressed] = useState(false)
  const usable = !!control && !dimmed

  return (
    <motion.button
      type="button"
      disabled={!usable}
      onClick={() => {
        if (!control) return
        onPress(control)
        setPressed(true)
        window.setTimeout(() => setPressed(false), 160)
      }}
      style={{ width: 'calc(var(--key) * 2.05)', height: 'calc(var(--key) * 1.3)' }}
      animate={{
        opacity: dimmed ? 0.32 : 1,
        scale: dimmed ? 0.96 : pressed ? 0.96 : 1,
        filter: dimmed ? 'blur(2px)' : 'blur(0px)',
      }}
      transition={{ duration: 0.4, ease: EASE, delay: dimmed ? 0 : index * 0.025 }}
      className={`relative flex shrink-0 flex-col items-center justify-center gap-[0.1em] rounded-[0.24em] border transition-colors duration-200 ${KEYCAP_SHADOW} ${
        !control
          ? 'border-white/[0.04] bg-base-900/30'
          : emphasized
            ? 'border-flow bg-gradient-to-b from-base-800 to-base-900 shadow-[0_0_0_1px_rgba(167,139,209,0.55),0_0_22px_-4px_rgba(167,139,209,0.55)]'
            : 'border-white/[0.08] bg-gradient-to-b from-base-800 to-base-900 hover:border-accent-dim'
      } ${pressed ? '!border-accent shadow-[0_0_0_1px_rgba(76,126,255,0.55),0_6px_18px_-6px_rgba(76,126,255,0.55)]' : ''}`}
    >
      {control && !dimmed && (
        <>
          <ControlIcon
            label={control.label}
            className={`h-[max(13px,0.5em)] w-[max(13px,0.5em)] shrink-0 ${emphasized ? 'text-flow-bright' : 'text-base-400'}`}
          />
          <span className={`max-w-[85%] truncate text-[max(10px,0.19em)] leading-tight ${emphasized ? 'text-base-50' : 'text-base-200'}`}>
            {control.label}
          </span>
        </>
      )}
    </motion.button>
  )
}

interface HardwareKeyboardProps {
  appId: AppId
  order: string[]
  emphasizedControlIds: string[]
  transitionPhase: TransitionPhase
  onPress: (control: ControlDef) => void
}

export function HardwareKeyboard({ appId, order, emphasizedControlIds, transitionPhase, onPress }: HardwareKeyboardProps) {
  const app = appProfiles[appId]
  const controls = order.map((id) => app.controls.find((c) => c.id === id)).filter((c): c is ControlDef => !!c)

  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(new Set())
  const [statusLine, setStatusLine] = useState<string | null>(null)

  useEffect(() => setStatusLine(null), [appId])

  const handlePress = (control: ControlDef): void => {
    onPress(control)
    setFlashingKeys(new Set(parseShortcutToKeyNames(control.shortcut)))
    setStatusLine(`${control.label} · pressed`)
    window.setTimeout(() => setFlashingKeys(new Set()), 280)
    window.setTimeout(() => setStatusLine((current) => (current === `${control.label} · pressed` ? null : current)), 1200)
  }

  const dimmed = transitionPhase !== 'idle'
  const rows: (ControlDef | undefined)[][] = []
  for (let i = 0; i < Math.max(controls.length, 6); i += 2) {
    rows.push([controls[i], controls[i + 1]])
  }

  return (
    <div className={`relative mx-auto w-fit max-w-full overflow-x-auto p-7 sm:p-10 ${GLASS_PANEL}`}>
      <span className="pointer-events-none absolute left-8 top-6 text-[10px] font-medium uppercase tracking-[0.35em] text-base-700 sm:left-10 sm:top-7">
        noma
      </span>

      <div style={KEY_CSS} className="flex w-fit items-start gap-[calc(var(--key)*0.35)] pt-6">
        {/* The static half — never changes, regardless of app context. */}
        <div className="flex flex-col gap-[calc(var(--key)*0.12)]">
          {ALPHA_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-[calc(var(--key)*0.12)]">
              {row.map((k, keyIndex) => (
                <StaticKeyCap key={`${k.label}-${keyIndex}`} k={k} flashing={!!k.flashName && flashingKeys.has(k.flashName)} />
              ))}
            </div>
          ))}
        </div>

        {/* The adaptive module — same chassis, same key material, occupying
            exactly the footprint a nav cluster / numpad attachment would.
            This is the part that changes. */}
        <div className="flex flex-col gap-[calc(var(--key)*0.12)]">
          <div
            style={{ width: 'calc(var(--key) * 4.22)', height: 'calc(var(--key) * 0.95)' }}
            className="relative flex flex-col items-center justify-center overflow-hidden rounded-[0.2em] border border-accent/25 bg-black/70 px-[0.3em]"
          >
            <span className="font-mono text-[max(9px,0.22em)] uppercase tracking-[0.18em] text-accent">
              {app.shortName}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={
                  transitionPhase === 'switching'
                    ? 'switching'
                    : transitionPhase === 'adapting'
                      ? 'adapting'
                      : (statusLine ?? app.contextLine)
                }
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-[0.06em] max-w-full truncate font-mono text-[max(8px,0.19em)] text-base-300"
              >
                {transitionPhase === 'switching'
                  ? 'Switching context…'
                  : transitionPhase === 'adapting'
                    ? 'Adapting controls…'
                    : (statusLine ?? app.contextLine)}
              </motion.span>
            </AnimatePresence>
          </div>

          {rows.map((pair, rowIndex) => (
            <div key={rowIndex} className="flex gap-[calc(var(--key)*0.12)]">
              {pair.map((control, colIndex) => (
                <AdaptiveKey
                  key={control?.id ?? `empty-${rowIndex}-${colIndex}`}
                  control={control}
                  emphasized={!!control && emphasizedControlIds.includes(control.id)}
                  dimmed={dimmed}
                  index={rowIndex * 2 + colIndex}
                  onPress={handlePress}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
