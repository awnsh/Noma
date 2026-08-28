import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
  href?: string
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium tracking-tight transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const variants: Record<string, string> = {
  primary: 'bg-accent text-base-950 hover:bg-accent-bright',
  secondary: 'border border-base-500 text-base-100 hover:border-accent hover:text-accent',
  ghost: 'text-base-300 hover:text-base-50',
}

export default function Button({ variant = 'primary', className = '', children, href, ...props }: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${className}`

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
