const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
]

/**
 * A purely decorative QWERTY layout — the "digital twin" framing for the
 * eventual physical keyboard. These keys are not interactive; only the 4
 * contextual controls and the modular slots below actually do anything.
 * Standard typing is never routed through Flow (see docs/privacy-and-legal.md).
 */
export function KeyboardLayout() {
  return (
    <div className="mb-6 select-none rounded-2xl border border-white/5 bg-base-950/60 p-4">
      <div className="mb-3 text-[9px] uppercase tracking-widest text-neutral-700">
        Standard Keys
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {ROWS.map((row, index) => (
          <div key={index} className="flex gap-1.5">
            {row.map((key) => (
              <div
                key={key}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/5 bg-base-900 text-[11px] text-neutral-600"
              >
                {key}
              </div>
            ))}
          </div>
        ))}
        <div className="mt-1 h-7 w-44 rounded-md border border-white/5 bg-base-900" />
      </div>
    </div>
  )
}
