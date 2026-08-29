import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ControlChipProps {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  muted?: boolean
  onClick?: () => void
}

const sizes: Record<string, string> = {
  sm: 'px-3 py-2 text-[11px]',
  md: 'px-4 py-3 text-xs',
  lg: 'px-5 py-4 text-sm',
}

/** A pill that reads as a physical keyboard control — reused across every section that shows controls. */
export default function ControlChip({ children, size = 'md', active = false, muted = false, onClick }: ControlChipProps) {
  const Tag = onClick ? motion.button : motion.div

  return (
    <Tag
      layout
      onClick={onClick}
      className={[
        'rounded-lg border font-mono font-medium uppercase tracking-wide',
        sizes[size],
        onClick ? 'cursor-pointer' : '',
        active
          ? 'border-accent/60 bg-accent/10 text-accent shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_15%,transparent),0_0_24px_color-mix(in_oklab,var(--color-accent)_12%,transparent)]'
          : muted
            ? 'border-base-700 bg-base-900/60 text-base-500'
            : 'border-base-600 bg-base-850 text-base-100 hover:border-base-400',
      ].join(' ')}
      whileTap={onClick ? { scale: 0.96 } : undefined}
    >
      {children}
    </Tag>
  )
}
