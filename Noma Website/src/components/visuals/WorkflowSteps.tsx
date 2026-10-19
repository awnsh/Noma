import { Fragment } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import AppIcon from './AppIcon'
import Arrow from './Arrow'
import { appProfiles } from '../../data/appProfiles'

/**
 * A sequence the person actually performed, drawn as objects rather than
 * written as a sentence.
 *
 * "Screenshot → Discord → Paste → Notion" reads as prose you have to parse.
 * The same thing as icon-led nodes reads as a shape you recognise, which is
 * the entire reason Flow is worth showing: you are supposed to look at it and
 * think *I do that*.
 *
 * A step is either an application (real mark, its own colour) or an action
 * taken inside one (set in mono, no icon) — the same two-kind distinction the
 * desktop app draws, so the site is describing the product rather than
 * inventing a nicer version of it.
 */

export interface WorkflowStep {
  kind: 'app' | 'action'
  label: string
  /** For `app` steps — resolves the real brand mark and colour. */
  appId?: string
}

interface WorkflowStepsProps {
  steps: WorkflowStep[]
  /** Staggers the steps in as the block scrolls into view. */
  animate?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const SIZES = {
  sm: { box: 'h-11 w-11', icon: 'h-5 w-5', label: 'text-[10px]', action: 'text-[10px]', gap: 'gap-2' },
  md: { box: 'h-16 w-16', icon: 'h-7 w-7', label: 'text-xs', action: 'text-[11px]', gap: 'gap-3 sm:gap-4' },
} as const

export default function WorkflowSteps({ steps, animate = true, size = 'md', className = '' }: WorkflowStepsProps) {
  const reduceMotion = useReducedMotion()
  const dim = SIZES[size]

  const node = (index: number) =>
    !animate || reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-15% 0px' },
          transition: { duration: 0.45, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] as const },
        }

  return (
    <div className={`flex flex-wrap items-start ${dim.gap} ${className}`}>
      {steps.map((step, index) => {
        const app = step.appId ? appProfiles[step.appId] : undefined
        return (
          <Fragment key={`${step.label}-${index}`}>
            <motion.div {...node(index)} className="flex shrink-0 flex-col items-center">
              {/* An application is a place you went, so it gets a mark and its
                  name underneath. An action is a thing you did, so it is just
                  the thing, set in mono — naming it twice (once in the box,
                  once below) says nothing the first one didn't. The two kinds
                  are drawn the same way in the desktop app, for the same
                  reason. */}
              {step.kind === 'app' ? (
                <>
                  <span
                    className={`flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] ${dim.box}`}
                  >
                    <AppIcon id={step.appId ?? ''} color={app?.color} className={dim.icon} />
                  </span>
                  <span
                    className={`mt-2 max-w-[86px] truncate text-center font-medium tracking-tight text-base-300 ${dim.label}`}
                  >
                    {app?.shortName ?? step.label}
                  </span>
                </>
              ) : (
                <span
                  className={`flex items-center justify-center whitespace-nowrap rounded-2xl border border-base-700 bg-base-900 px-3 font-mono text-base-300 ${dim.box} ${dim.action}`}
                >
                  {step.label}
                </span>
              )}
            </motion.div>

            {index < steps.length - 1 && (
              // Its own box, matching the node's height rather than the taller
              // node-plus-label column, so the arrow sits on the icons' centre
              // line instead of drifting toward the captions.
              <motion.span
                {...node(index)}
                className={`flex shrink-0 items-center justify-center text-base-500 ${dim.box}`}
              >
                <Arrow className="w-5" />
              </motion.span>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
