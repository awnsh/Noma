/**
 * The shared "nothing here yet" treatment; reused everywhere Noma hasn't
 * learned something yet. Optimistic, not clinical: no data isn't a bug,
 * it's an honest starting state. Plain text, no icon, no dashed box.
 * Whitespace alone marks it as a quiet moment on the page.
 */
export function EmptyState({ title, hint }: { title?: string; hint: string }) {
  return (
    <div className="py-2">
      {title && <p className="text-base font-medium text-neutral-100">{title}</p>}
      <p className={`${title ? 'mt-1.5 ' : ''}max-w-md text-sm leading-relaxed text-neutral-600`}>{hint}</p>
    </div>
  )
}
