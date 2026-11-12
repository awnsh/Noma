import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  as?: 'div' | 'span' | 'li'
}

/**
 * Fades + rises content into place the first time it scrolls into view.
 *
 * Triggers a little BEFORE the element reaches the screen (the positive
 * bottom margin), so content is already settled by the time it's read;
 * an earlier version waited until it was 10% inside the screen, which left
 * items near the bottom edge (e.g. a fourth column) still faded. With
 * prefers-reduced-motion, content is simply there: no fade, no movement.
 */
export default function Reveal({ children, className, delay = 0, y = 14, as = 'div' }: RevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: Math.min(delay, 0.2), ease: [0.16, 1, 0.3, 1] },
    },
  }

  const MotionTag = motion[as]

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0, margin: '0px 0px 12% 0px' }}
      variants={variants}
    >
      {children}
    </MotionTag>
  )
}
