interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? 'border-accent-muted bg-accent/30' : 'border-white/15 bg-base-800'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
          checked ? 'translate-x-6 bg-accent' : 'translate-x-0.5 bg-neutral-500'
        }`}
      />
    </button>
  )
}
