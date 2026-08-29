import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type ModuleType = 'rotary' | 'button' | 'slider'

interface ModuleEnclosureProps {
  type: ModuleType
  active?: boolean
  className?: string
}

/**
 * A small premium enclosure sharing the base keyboard's material and corner
 * language — used for the standalone, separately-purchased modules. Each type
 * visibly communicates its own physical control.
 */
export default function ModuleEnclosure({ type, active = false, className = '' }: ModuleEnclosureProps) {
  const uid = useId()
  const reduceMotion = useReducedMotion()
  const accent = active ? '#5b86e0' : '#3a3a41'
  // The literal magnetic contacts get their own color — gold, not the blue used for
  // "this module is selected" — so a pin reads as hardware making contact, distinct
  // from any software/UI active-state.
  const pinColor = active ? '#cda15a' : '#3a3a41'
  const colorTransition = { duration: reduceMotion ? 0.01 : 0.4, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <svg viewBox="0 0 160 120" className={className} fill="none">
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1c21" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id={`${uid}-knob`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#232328" />
          <stop offset="55%" stopColor="#151518" />
          <stop offset="100%" stopColor="#0a0a0c" />
        </radialGradient>
      </defs>

      {/* enclosure — stroke transitions in as the module goes live, rather than
          cutting straight to the active look */}
      <motion.rect
        x="8"
        y="8"
        width="144"
        height="104"
        rx="16"
        fill={`url(#${uid}-body)`}
        strokeWidth="1.5"
        initial={false}
        animate={{ stroke: active ? '#5b86e0' : '#232328', strokeOpacity: active ? 0.5 : 1 }}
        transition={colorTransition}
      />
      <rect x="9" y="9" width="142" height="1.5" rx="0.75" fill="#4a4a52" opacity="0.4" />

      {/* magnetic contact edge (bottom — the side that docks to the keyboard) —
          gold carries through to the matching pins on the keyboard's edge */}
      <rect x="60" y="106" width="40" height="4" rx="2" fill="#000" opacity="0.35" />
      <motion.circle cx="70" cy="108" r="1.6" initial={false} animate={{ fill: pinColor }} transition={colorTransition} />
      <motion.circle cx="90" cy="108" r="1.6" initial={false} animate={{ fill: pinColor }} transition={colorTransition} />

      {type === 'rotary' && (
        <g>
          <circle cx="80" cy="58" r="34" fill={`url(#${uid}-knob)`} stroke="#2c2c32" strokeWidth="1.5" />
          {Array.from({ length: 22 }).map((_, t) => {
            const a = (t / 22) * Math.PI * 2
            const r1 = 31
            const r2 = 34
            return (
              <line
                key={t}
                x1={80 + r1 * Math.cos(a)}
                y1={58 + r1 * Math.sin(a)}
                x2={80 + r2 * Math.cos(a)}
                y2={58 + r2 * Math.sin(a)}
                stroke="#3a3a41"
                strokeWidth="1.25"
              />
            )
          })}
          <motion.line
            x1="80"
            y1="58"
            x2="80"
            y2="34"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={false}
            animate={{ stroke: accent }}
            transition={colorTransition}
          />
          <circle cx="80" cy="58" r="4" fill="#0a0a0c" stroke="#3a3a41" strokeWidth="1" />
        </g>
      )}

      {type === 'button' && (
        <g>
          {[
            [50, 34],
            [86, 34],
            [50, 70],
            [86, 70],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="24" height="24" rx="6" fill="#141417" stroke={accent} strokeOpacity={active ? 0.6 : 0.5} strokeWidth="1.25" />
          ))}
        </g>
      )}

      {type === 'slider' && (
        <g>
          <rect x="75" y="26" width="10" height="66" rx="5" fill="#0e0e11" stroke="#2c2c32" strokeWidth="1.25" />
          <rect x="68" y="56" width="24" height="14" rx="4" fill="#1c1c21" stroke={accent} strokeWidth="1.5" />
          <line x1="80" y1="60" x2="80" y2="66" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
