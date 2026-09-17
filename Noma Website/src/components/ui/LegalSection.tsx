import type { ReactNode } from 'react'

/** Shared heading + prose block for `Privacy.tsx` and `Terms.tsx` — each
 *  repeats this same pattern six-plus times, so it's worth a real
 *  component rather than copy-pasted markup. */
export default function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-base-800 py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-lg font-semibold text-base-50 sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-base-400">{children}</div>
    </section>
  )
}
