interface LayoutKey {
  /** Canonical key name (matches src/main/workflow/keyNames.ts /
   *  shared/constants/domKeyCodes.ts) — what a captured combo's entries
   *  actually look like, so this is exactly what a flash has to match
   *  against. Undefined for a purely visual spacer. */
  name?: string
  /** Shorter display text when the canonical name is too long for a key
   *  cap (e.g. "Control" -> "Ctrl"). Defaults to `name`. */
  label?: string
  /** A literal, static Tailwind width class — not computed, so the JIT
   *  compiler can see it in this file's source. */
  width?: string
}

const ROWS: LayoutKey[][] = [
  [
    { name: 'Escape', label: 'Esc', width: 'w-10' },
    ...Array.from({ length: 12 }, (_, i) => ({ name: `F${i + 1}`, width: 'w-7' }))
  ],
  [
    { name: 'Backquote', label: '`', width: 'w-7' },
    ...'1234567890'.split('').map((d) => ({ name: d, width: 'w-7' })),
    { name: 'Minus', label: '-', width: 'w-7' },
    { name: 'Equal', label: '=', width: 'w-7' },
    { name: 'Backspace', label: '⌫', width: 'w-14' }
  ],
  [
    { name: 'Tab', label: 'Tab', width: 'w-10' },
    ...'QWERTYUIOP'.split('').map((k) => ({ name: k, width: 'w-7' })),
    { name: 'BracketLeft', label: '[', width: 'w-7' },
    { name: 'BracketRight', label: ']', width: 'w-7' }
  ],
  [
    { name: 'CapsLock', label: 'Caps', width: 'w-12' },
    ...'ASDFGHJKL'.split('').map((k) => ({ name: k, width: 'w-7' })),
    { name: 'Semicolon', label: ';', width: 'w-7' },
    { name: 'Enter', label: '⏎', width: 'w-14' }
  ],
  [
    { name: 'Shift', label: 'Shift', width: 'w-16' },
    ...'ZXCVBNM'.split('').map((k) => ({ name: k, width: 'w-7' })),
    { name: 'Comma', label: ',', width: 'w-7' },
    { name: 'Period', label: '.', width: 'w-7' },
    { name: 'Shift', label: 'Shift', width: 'w-16' }
  ],
  [
    { name: 'Control', label: 'Ctrl', width: 'w-10' },
    { name: 'Meta', label: 'Win', width: 'w-9' },
    { name: 'Alt', label: 'Alt', width: 'w-9' },
    { name: 'Space', label: '', width: 'w-40' },
    { name: 'Alt', label: 'Alt', width: 'w-9' },
    { name: 'Meta', label: 'Win', width: 'w-9' },
    { name: 'Control', label: 'Ctrl', width: 'w-10' }
  ]
]

const ARROW_ROWS: LayoutKey[][] = [
  [{ width: 'w-7' }, { name: 'ArrowUp', label: '↑', width: 'w-7' }, { width: 'w-7' }],
  [
    { name: 'ArrowLeft', label: '←', width: 'w-7' },
    { name: 'ArrowDown', label: '↓', width: 'w-7' },
    { name: 'ArrowRight', label: '→', width: 'w-7' }
  ]
]

function Key({ layoutKey, isFlashing }: { layoutKey: LayoutKey; isFlashing: boolean }) {
  if (!layoutKey.name) {
    return <div className={`h-7 ${layoutKey.width ?? 'w-7'}`} />
  }
  return (
    <div
      className={`flex h-7 shrink-0 items-center justify-center rounded-md border text-[11px] transition-colors duration-150 ${layoutKey.width ?? 'w-7'} ${
        isFlashing
          ? 'border-accent bg-accent/20 text-accent'
          : 'border-white/5 bg-base-900 text-neutral-600'
      }`}
    >
      {layoutKey.label ?? layoutKey.name}
    </div>
  )
}

interface KeyboardLayoutProps {
  /** Canonical key names currently lit up — see onWorkflowComboCaptured.
   *  Empty by default so this stays purely decorative until a real combo
   *  is captured at least once. */
  flashingKeys?: Set<string>
}

/**
 * A decorative full keyboard layout — the "digital twin" framing for the
 * eventual physical keyboard's base deck. These keys are not interactive
 * (only the 4 contextual controls and the modular slots below actually do
 * anything), but they do react: when workflow monitoring captures a real
 * Ctrl/Alt/Win shortcut, its exact keys flash here for a moment. That's the
 * only thing that ever lights a key — ordinary typing is never captured or
 * reflected here at all (see docs/privacy-and-legal.md); a bare letter
 * never lights up on its own, only as part of an already-privacy-filtered
 * command combo.
 */
export function KeyboardLayout({ flashingKeys = new Set() }: KeyboardLayoutProps) {
  return (
    <div className="mb-6 select-none rounded-2xl border border-white/5 bg-base-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[9px] uppercase tracking-widest text-neutral-700">Standard Keys</div>
        <div className="text-[9px] text-neutral-700">
          Lights up on captured shortcuts — never on ordinary typing
        </div>
      </div>
      <div className="flex items-start justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          {ROWS.map((row, index) => (
            <div key={index} className="flex gap-1.5">
              {row.map((key, keyIndex) => (
                <Key
                  key={`${key.name ?? 'gap'}-${keyIndex}`}
                  layoutKey={key}
                  isFlashing={!!key.name && flashingKeys.has(key.name)}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-1.5">
          {ARROW_ROWS.map((row, index) => (
            <div key={index} className="flex gap-1.5">
              {row.map((key, keyIndex) => (
                <Key
                  key={`${key.name ?? 'gap'}-${keyIndex}`}
                  layoutKey={key}
                  isFlashing={!!key.name && flashingKeys.has(key.name)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
