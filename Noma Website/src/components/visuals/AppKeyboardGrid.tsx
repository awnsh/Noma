// Ported from the real app's KeyboardLayout.tsx (src/renderer/src/components) —
// same row/key data, re-themed onto this project's own color tokens instead of
// the app's. Kept a straight port rather than a redesign so this stays a
// faithful copy of the actual UI, not a reinterpretation of it.
//
// Every key width is a responsive pair ("mobile sm:desktop") rather than one
// fixed size — a real 65% key field is ~500px wide at full size, which never
// fits a phone screen. Shrinking every key ~30% and stacking the arrow
// cluster below the main rows (instead of beside them) on mobile keeps the
// whole board inside a phone viewport with no horizontal scroll; `sm:` and up
// restores the exact original desktop sizing untouched.

interface LayoutKey {
  name?: string
  label?: string
  /** A literal, static Tailwind width class pair ("mobile sm:desktop") — not
   *  computed, so the JIT compiler can see both halves in this file's source. */
  width?: string
}

const ROWS: LayoutKey[][] = [
  [
    { name: 'Escape', label: 'Esc', width: 'w-6 sm:w-10' },
    ...Array.from({ length: 12 }, (_, i) => ({ name: `F${i + 1}`, width: 'w-4 sm:w-7' })),
  ],
  [
    { name: 'Backquote', label: '`', width: 'w-4 sm:w-7' },
    ...'1234567890'.split('').map((d) => ({ name: d, width: 'w-4 sm:w-7' })),
    { name: 'Minus', label: '-', width: 'w-4 sm:w-7' },
    { name: 'Equal', label: '=', width: 'w-4 sm:w-7' },
    { name: 'Backspace', label: '⌫', width: 'w-8 sm:w-14' },
  ],
  [
    { name: 'Tab', label: 'Tab', width: 'w-6 sm:w-10' },
    ...'QWERTYUIOP'.split('').map((k) => ({ name: k, width: 'w-4 sm:w-7' })),
    { name: 'BracketLeft', label: '[', width: 'w-4 sm:w-7' },
    { name: 'BracketRight', label: ']', width: 'w-4 sm:w-7' },
  ],
  [
    { name: 'CapsLock', label: 'Caps', width: 'w-8 sm:w-12' },
    ...'ASDFGHJKL'.split('').map((k) => ({ name: k, width: 'w-4 sm:w-7' })),
    { name: 'Semicolon', label: ';', width: 'w-4 sm:w-7' },
    { name: 'Enter', label: '⏎', width: 'w-8 sm:w-14' },
  ],
  [
    { name: 'Shift', label: 'Shift', width: 'w-10 sm:w-16' },
    ...'ZXCVBNM'.split('').map((k) => ({ name: k, width: 'w-4 sm:w-7' })),
    { name: 'Comma', label: ',', width: 'w-4 sm:w-7' },
    { name: 'Period', label: '.', width: 'w-4 sm:w-7' },
    { name: 'Shift', label: 'Shift', width: 'w-10 sm:w-16' },
  ],
  [
    { name: 'Control', label: 'Ctrl', width: 'w-6 sm:w-10' },
    { name: 'Meta', label: 'Win', width: 'w-5 sm:w-9' },
    { name: 'Alt', label: 'Alt', width: 'w-5 sm:w-9' },
    { name: 'Space', label: '', width: 'w-24 sm:w-40' },
    { name: 'Alt', label: 'Alt', width: 'w-5 sm:w-9' },
    { name: 'Meta', label: 'Win', width: 'w-5 sm:w-9' },
    { name: 'Control', label: 'Ctrl', width: 'w-6 sm:w-10' },
  ],
]

const ARROW_ROWS: LayoutKey[][] = [
  [{ width: 'w-4 sm:w-7' }, { name: 'ArrowUp', label: '↑', width: 'w-4 sm:w-7' }, { width: 'w-4 sm:w-7' }],
  [
    { name: 'ArrowLeft', label: '←', width: 'w-4 sm:w-7' },
    { name: 'ArrowDown', label: '↓', width: 'w-4 sm:w-7' },
    { name: 'ArrowRight', label: '→', width: 'w-4 sm:w-7' },
  ],
]

function Key({ layoutKey, isFlashing }: { layoutKey: LayoutKey; isFlashing: boolean }) {
  if (!layoutKey.name) {
    return <div className={`h-4 sm:h-7 ${layoutKey.width ?? 'w-4 sm:w-7'}`} />
  }
  return (
    <div
      className={`flex h-4 shrink-0 items-center justify-center rounded-[3px] border text-[6.5px] leading-none transition-colors duration-150 sm:h-7 sm:rounded-md sm:text-[11px] ${layoutKey.width ?? 'w-4 sm:w-7'} ${
        isFlashing ? 'border-accent bg-accent/20 text-accent' : 'border-base-700 bg-base-900 text-base-500'
      }`}
    >
      {layoutKey.label ?? layoutKey.name}
    </div>
  )
}

interface AppKeyboardGridProps {
  /** Canonical key names currently lit up. Empty by default so this stays
   *  purely decorative until a control tile presses one. */
  flashingKeys?: Set<string>
}

/**
 * The decorative full keyboard the real app's Virtual Keyboard page frames
 * its 4 contextual control tiles with — not interactive on its own, but it
 * reacts: keys flash briefly when a control tile fires (see AppPreview.tsx).
 */
export default function AppKeyboardGrid({ flashingKeys = new Set() }: AppKeyboardGridProps) {
  return (
    <div className="select-none rounded-2xl border border-base-700 bg-base-950/60 p-2 sm:p-4">
      <div className="mb-2 flex flex-col gap-1 sm:mb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-mono text-[9px] uppercase tracking-widest text-base-500">Standard Keys</div>
        <div className="font-mono text-[9px] text-base-500">Lights up when a control below is pressed</div>
      </div>
      {/* Arrow cluster stacks below the main rows on mobile (fits a phone
          width with no scroll) and sits beside them from `sm:` up, exactly
          as before. Key gaps are tighter than the row-stacking gap on mobile
          — every pixel of horizontal gap gets multiplied by ~13 keys/row. */}
      <div className="flex flex-col items-center gap-2 overflow-x-auto sm:flex-row sm:items-start sm:justify-center sm:gap-4">
        <div className="flex flex-col items-center gap-0.5 sm:gap-1.5">
          {ROWS.map((row, index) => (
            <div key={index} className="flex gap-0.5 sm:gap-1.5">
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
        <div className="flex flex-col gap-0.5 sm:mt-auto sm:gap-1.5">
          {ARROW_ROWS.map((row, index) => (
            <div key={index} className="flex justify-center gap-0.5 sm:gap-1.5">
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
