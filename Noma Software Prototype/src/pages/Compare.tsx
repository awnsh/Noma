import { GLASS_CARD } from '../lib/surfaces'

const normalPoints = ['Static shortcuts', 'Same controls, every app', 'Manual configuration']
const nomaPoints = ['Adapts to your workflow', 'Surfaces relevant controls', 'Learns what you use']

/** Brief section 6 — a 15-second, concise comparison. Not a feature grid. */
export function Compare() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-balance text-center font-display text-2xl font-semibold text-base-50 sm:text-3xl">
        Your keyboard shouldn't stay the same.
      </h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className={`p-6 ${GLASS_CARD}`}>
          <div className="text-xs font-semibold uppercase tracking-widest text-base-500">Normal Keyboard</div>
          <ul className="mt-4 space-y-3">
            {normalPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-base-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-base-600" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden p-6 rounded-2xl border border-accent-dim bg-accent/[0.04] shadow-[0_8px_24px_-10px_rgba(76,126,255,0.25),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">Noma</div>
          <ul className="relative mt-4 space-y-3">
            {nomaPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-base-100">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-base-500">
        Same physical keyboard. Different controls, every time the context changes.
      </p>
    </div>
  )
}
