interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/**
 * The knob is positioned by flexbox (justify-start/justify-end), not
 * absolute-positioning + transform. The previous version used
 * `absolute` + `translate-x-*`, which depends on the child's
 * un-transformed "static position" being 0 — true in most cases but not
 * guaranteed, and evidently not reliable enough here (this component was
 * "fixed" once already by anchoring that static position explicitly, and
 * it still wasn't right). Flexbox positioning has no such ambiguity: the
 * knob's position is always exactly determined by justify-content, full
 * stop, so there's no static-position edge case left to get wrong.
 */
export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors ${
        checked ? 'justify-end border-accent-muted bg-accent/30' : 'justify-start border-white/15 bg-base-800'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-neutral-500'}`}
      />
    </button>
  )
}
