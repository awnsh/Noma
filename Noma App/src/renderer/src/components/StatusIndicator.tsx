/**
 * A small, calm "is Noma learning right now" signal — a single dot plus a
 * word, not a banner or a progress-ring costume. `active` gets a slow,
 * subtle breathing opacity (state communicated through motion, not
 * decoration); inactive is a flat, still dot, so the *absence* of motion
 * itself reads as "off." Deliberately not phrased as "Watching" — Noma
 * learns from behavior, it doesn't surveil.
 */
export function StatusIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-[pulse_2.5s_ease-in-out_infinite] rounded-full bg-accent" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            active ? 'bg-accent shadow-[0_0_6px_1px_rgba(99,124,255,0.65)]' : 'bg-neutral-500'
          }`}
        />
      </span>
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  )
}
