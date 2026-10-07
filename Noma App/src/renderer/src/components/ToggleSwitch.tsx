interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/**
 * The knob starts at the left edge of the track's content box and slides by
 * a transform so the move animates. Travel is the content width (44px track
 * minus 2px border and 4px padding = 38px) minus the 16px knob = 22px.
 */
export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 ${
        checked ? 'justify-start border-accent-muted bg-accent/30' : 'justify-start border-white/15 bg-base-800'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full transition-[transform,background-color] duration-200 ease-out ${checked ? 'translate-x-[22px] bg-accent' : 'translate-x-0 bg-neutral-500'}`}
      />
    </button>
  )
}
