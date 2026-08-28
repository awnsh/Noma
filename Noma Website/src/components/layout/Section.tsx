import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  children: ReactNode
  className?: string
  bordered?: boolean
}

/** Consistent full-bleed section shell: id anchor, spacing rhythm, top hairline. */
export default function Section({ id, children, className = '', bordered = true }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative ${bordered ? 'border-t border-base-800' : ''} ${className}`}
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-8 md:py-32">{children}</div>
    </section>
  )
}

export function Kicker({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">
      <span className="text-base-500">{index}</span>
      <span className="h-px w-6 bg-accent-dim" />
      <span>{label}</span>
    </div>
  )
}
