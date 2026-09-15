interface InsightCardProps {
  /** The insight itself, in plain language — "You use SEARCH 31 times this
   *  week," never a raw stat tile. */
  text: string
  /** An optional secondary line — the reasoning or extra context behind
   *  the insight, kept visually quieter than `text`. */
  hint?: string
  /** An optional single recommended action — never more than one; this is
   *  a suggestion to consider, not a menu. */
  action?: { label: string; onClick: () => void }
}

/**
 * One large behavioral observation on the Learning page — a plain
 * sentence, not a metric tile. A thin rule separates rows; nothing here is
 * boxed into a card.
 */
export function InsightCard({ text, hint, action }: InsightCardProps) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-base-700 py-5 transition-colors last:border-b-0 hover:bg-base-800/60">
      <div className="min-w-0">
        <p className="text-base leading-snug text-neutral-100">{text}</p>
        {hint && <p className="mt-1.5 text-sm text-neutral-600">{hint}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
