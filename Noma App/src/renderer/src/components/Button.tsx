import type { ReactNode } from 'react'

interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

/** Low-emphasis text button (Cancel / Discard). */
export function GhostButton({ onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300"
    >
      {children}
    </button>
  )
}

const PRIMARY =
  'rounded-md border border-accent-muted bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97]'
const PRIMARY_DIM = 'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'

/** Accent-outlined confirm button (Save / Create). `dimDisabled={false}` keeps the disabled state unstyled. */
export function PrimaryButton({
  onClick,
  disabled,
  dimDisabled = true,
  children
}: ButtonProps & { dimDisabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={dimDisabled ? `${PRIMARY} ${PRIMARY_DIM}` : PRIMARY}
    >
      {children}
    </button>
  )
}
