interface StatusCardProps {
  label: string
  value: string | number
  hint?: string
}

export function StatusCard({ label, value, hint }: StatusCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-base-900 px-5 py-4">
      <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-neutral-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  )
}
