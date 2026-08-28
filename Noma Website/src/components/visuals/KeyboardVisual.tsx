import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import OledIcon from './OledIcon'
import { oledLabel } from '../../data/appProfiles'

interface KeyboardVisualProps {
  appName?: string
  controls?: string[]
  /** Overrides the control grid with a two-line module-recognition readout, e.g. ROTARY 1 / TIMELINE. */
  readout?: { label: string; sub: string } | null
  /** Lights up the right-edge docking rail to show a module is attached there. */
  dockedRight?: boolean
  glow?: boolean
  float?: boolean
  className?: string
}

const VB_W = 1000
const VB_H = 460

// Chassis
const CH_X = 30
const CH_Y = 40
const CH_W = 940
const CH_H = 380
const CH_RX = 34

// Interior working area
const IN_X = CH_X + 40
const IN_Y = CH_Y + 40
const IN_RIGHT = CH_X + CH_W - 40
const IN_BOTTOM = CH_Y + CH_H - 40

// Key field
const KEY_X = IN_X
const KEY_W = 490
const KEY_Y = IN_Y
const ROW_H = 52
const ROW_GAP = 8

// Nav cluster
const NAV_X = KEY_X + KEY_W + 15
const NAV_W = 60

// Control module (OLED + encoders)
const CTRL_X = NAV_X + NAV_W + 15
const CTRL_W = IN_RIGHT - CTRL_X

const OLED_X = CTRL_X
const OLED_Y = IN_Y
const OLED_W = CTRL_W
const OLED_H = 58

const ENC_R = 54
const ENC_CY = OLED_Y + OLED_H + 30 + ENC_R
const ENC_CX_L = CTRL_X + 70
const ENC_CX_R = CTRL_X + CTRL_W - 70

interface KeyRect {
  x: number
  y: number
  w: number
  h: number
}

function buildRow(y: number, offset: number, units: number[], fieldX: number, fieldW: number, gap: number): KeyRect[] {
  const totalUnits = units.reduce((a, b) => a + b, 0)
  const avail = fieldW - offset - gap * (units.length - 1)
  const unitW = avail / totalUnits
  let x = fieldX + offset
  return units.map((u) => {
    const w = u * unitW
    const rect: KeyRect = { x, y, w, h: ROW_H }
    x += w + gap
    return rect
  })
}

const rowDefs = [
  { offset: 0, units: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { offset: 10, units: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { offset: 16, units: [1.2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.3] },
  { offset: 6, units: [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.8] },
  { offset: 0, units: [1.3, 1.3, 1.3, 6.4, 1.3, 1.3] },
]

const keyRows: KeyRect[][] = rowDefs.map((row, i) => buildRow(KEY_Y + i * (ROW_H + ROW_GAP), row.offset, row.units, KEY_X, KEY_W, 6))

const navRows: KeyRect[][] = [0, 1, 2].map((i) => {
  const y = KEY_Y + i * (ROW_H + ROW_GAP)
  const cellW = (NAV_W - 8) / 2
  return [0, 1].map((c) => ({ x: NAV_X + c * (cellW + 8), y, w: cellW, h: ROW_H }))
})

const oledControlCells = (() => {
  const pad = 9
  const gap = 6
  const w = (OLED_W - pad * 2 - gap * 3) / 4
  return [0, 1, 2, 3].map((i) => ({ x: OLED_X + pad + i * (w + gap), w }))
})()

const rightRailY = ENC_CY
const rightRailX = CH_X + CH_W - 6

export const KEYBOARD_RIGHT_DOCK = { xPct: (rightRailX / VB_W) * 100, yPct: (rightRailY / VB_H) * 100 }

/**
 * A conceptual, abstract representation of the Noma hardware — not a render of a
 * finished product. A compact ~65% key field, a permanently integrated widescreen
 * OLED control strip, and two built-in rotary encoders form the fixed "control
 * center." Subtle docking rails on the outer edges hint at the magnetic module
 * system. Replace with real CAD renders once they exist.
 */
export default function KeyboardVisual({
  appName = 'VS Code',
  controls = ['Run', 'Debug', 'Terminal', 'Search'],
  readout = null,
  dockedRight = false,
  glow = true,
  float = true,
  className = '',
}: KeyboardVisualProps) {
  const reduceMotion = useReducedMotion()
  const shouldFloat = float && !reduceMotion
  const uid = useId()

  return (
    <div className={`relative ${className}`}>
      {glow && <div aria-hidden className="absolute inset-0 -z-10 rounded-[40%] bg-accent/20 blur-[100px]" />}
      <motion.div
        style={{ transformPerspective: 1400, rotateX: 8 }}
        animate={shouldFloat ? { y: [0, -8, 0] } : undefined}
        transition={shouldFloat ? { duration: 7, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Conceptual illustration of the Noma keyboard: a compact mechanical key field with an integrated widescreen OLED control strip and two rotary encoders">
          <defs>
            <linearGradient id={`${uid}-chassis`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c1c21" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>
            <linearGradient id={`${uid}-key`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18181c" />
              <stop offset="100%" stopColor="#111114" />
            </linearGradient>
            <radialGradient id={`${uid}-knob`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#232328" />
              <stop offset="55%" stopColor="#151518" />
              <stop offset="100%" stopColor="#0a0a0c" />
            </radialGradient>
            <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3c3c44" stopOpacity="0" />
              <stop offset="50%" stopColor="#6b6b74" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3c3c44" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ambient contact shadow */}
          <ellipse cx={VB_W / 2} cy={CH_Y + CH_H + 14} rx={CH_W / 2.1} ry="16" fill="#000" opacity="0.35" />

          {/* unibody chassis */}
          <rect x={CH_X} y={CH_Y} width={CH_W} height={CH_H} rx={CH_RX} fill={`url(#${uid}-chassis)`} stroke="#232328" strokeWidth="1.5" />
          <rect x={CH_X + 1} y={CH_Y + 1} width={CH_W - 2} height="2" rx="1" fill={`url(#${uid}-edge)`} />

          {/* recessed key well */}
          <rect x={KEY_X - 14} y={KEY_Y - 14} width={KEY_W + 28} height={CH_Y + CH_H - 40 - KEY_Y + 14} rx="18" fill="#000" opacity="0.18" />

          {/* key field */}
          {keyRows.flat().map((k, i) => (
            <rect key={`k${i}`} x={k.x} y={k.y} width={k.w} height={k.h} rx="6" fill={`url(#${uid}-key)`} stroke="#242429" strokeWidth="1" />
          ))}

          {/* nav cluster */}
          {navRows.flat().map((k, i) => (
            <rect key={`n${i}`} x={k.x} y={k.y} width={k.w} height={k.h} rx="6" fill={`url(#${uid}-key)`} stroke="#242429" strokeWidth="1" />
          ))}

          {/* divider between key field and control module */}
          <line x1={NAV_X - 8} y1={IN_Y} x2={NAV_X - 8} y2={IN_BOTTOM} stroke="#202024" strokeWidth="1" />

          {/* OLED control strip */}
          <rect x={OLED_X} y={OLED_Y} width={OLED_W} height={OLED_H} rx="10" fill="#050506" stroke="#7dd3c0" strokeOpacity="0.3" strokeWidth="1.25" />

          {readout ? (
            <g>
              <text x={OLED_X + OLED_W / 2} y={OLED_Y + 27} textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="15" fontWeight="600" fill="#9ee6d6">
                {readout.label}
              </text>
              <text x={OLED_X + OLED_W / 2} y={OLED_Y + 44} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="9" letterSpacing="1.5" fill="#4d7a70">
                {readout.sub}
              </text>
            </g>
          ) : (
            <g>
              <circle cx={OLED_X + 12} cy={OLED_Y + 13} r="2.5" fill="#7dd3c0" />
              <text x={OLED_X + 22} y={OLED_Y + 17} fontFamily="'JetBrains Mono', monospace" fontSize="9.5" letterSpacing="1.5" fill="#98989f">
                {appName.toUpperCase()}
              </text>
              <line x1={OLED_X + 9} y1={OLED_Y + 26} x2={OLED_X + OLED_W - 9} y2={OLED_Y + 26} stroke="#1c1c21" strokeWidth="1" />

              {controls.slice(0, 4).map((label, i) => {
                const cell = oledControlCells[i]
                if (!cell) return null
                const top = OLED_Y + 31
                return (
                  <g key={label + i}>
                    {i > 0 && <line x1={cell.x - 3} y1={top} x2={cell.x - 3} y2={OLED_Y + OLED_H - 7} stroke="#1c1c21" strokeWidth="1" />}
                    <foreignObject x={cell.x} y={top} width={cell.w} height={OLED_H - (top - OLED_Y) - 6}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 2, height: '100%', color: '#9ee6d6' }}>
                        <OledIcon label={label} className="h-3 w-3" />
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 6.5,
                            letterSpacing: 0.4,
                            color: '#c2c2c8',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {oledLabel(label)}
                        </span>
                      </div>
                    </foreignObject>
                  </g>
                )
              })}
            </g>
          )}

          {/* rotary encoders */}
          {[ENC_CX_L, ENC_CX_R].map((cx, i) => (
            <g key={cx}>
              <circle cx={cx} cy={ENC_CY} r={ENC_R} fill={`url(#${uid}-knob)`} stroke="#2c2c32" strokeWidth="1.5" />
              {Array.from({ length: 28 }).map((_, t) => {
                const a = (t / 28) * Math.PI * 2
                const r1 = ENC_R - 3
                const r2 = ENC_R
                return (
                  <line
                    key={t}
                    x1={cx + r1 * Math.cos(a)}
                    y1={ENC_CY + r1 * Math.sin(a)}
                    x2={cx + r2 * Math.cos(a)}
                    y2={ENC_CY + r2 * Math.sin(a)}
                    stroke="#3a3a41"
                    strokeWidth="1.5"
                  />
                )
              })}
              <circle cx={cx} cy={ENC_CY} r={ENC_R - 14} fill="none" stroke="#2c2c32" strokeWidth="1" />
              <line
                x1={cx}
                y1={ENC_CY}
                x2={cx + (ENC_R - 14) * Math.cos((-100 + i * 30) * (Math.PI / 180))}
                y2={ENC_CY + (ENC_R - 14) * Math.sin((-100 + i * 30) * (Math.PI / 180))}
                stroke="#9ee6d6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={ENC_CY} r="5" fill="#0a0a0c" stroke="#3a3a41" strokeWidth="1" />
            </g>
          ))}

          {/* subtle etched wordmark */}
          <text x={CTRL_X + CTRL_W / 2} y={IN_BOTTOM - 14} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="9" letterSpacing="3" fill="#232328">
            NOMA
          </text>

          {/* docking rails */}
          {/* left */}
          <rect x={CH_X + 4} y={170} width="7" height="110" rx="3.5" fill="#000" opacity="0.3" />
          {[195, 225, 255].map((y) => (
            <circle key={`l${y}`} cx={CH_X + 7.5} cy={y} r="2.5" fill="none" stroke="#3a3a41" strokeWidth="1" />
          ))}
          {/* back */}
          <rect x={VB_W / 2 - 90} y={CH_Y + 4} width="180" height="6" rx="3" fill="#000" opacity="0.3" />
          {/* right */}
          <rect x={CH_X + CH_W - 11} y={170} width="7" height="110" rx="3.5" fill="#000" opacity={dockedRight ? '0.5' : '0.3'} />
          {[195, 225, 255].map((y) => (
            <circle
              key={`r${y}`}
              cx={CH_X + CH_W - 7.5}
              cy={y}
              r="2.5"
              fill={dockedRight ? '#7dd3c0' : 'none'}
              stroke={dockedRight ? '#7dd3c0' : '#3a3a41'}
              strokeWidth="1"
            />
          ))}
        </svg>
      </motion.div>
    </div>
  )
}
