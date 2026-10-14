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
        checked
          ? 'justify-start border-transparent bg-accent'
          : 'justify-start border-white/[0.08] bg-base-950 shadow-[0_1px_2px_0_rgba(0,0,0,0.5)_inset]'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-[transform,background-color] duration-200 ease-out ${checked ? 'translate-x-[22px] bg-base-950' : 'translate-x-0 bg-neutral-400'}`}
      />
    </button>
  )
}
