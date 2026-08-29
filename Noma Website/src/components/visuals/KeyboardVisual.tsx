import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import OledIcon from './OledIcon'
import { oledLabel } from '../../data/appProfiles'

interface KeyboardVisualProps {
  appName?: string
  controls?: string[]
  /** Overrides the control stack with a two-line module-recognition readout, e.g. ROTARY 1 / TIMELINE. */
  readout?: { label: string; sub: string } | null
  /** Lights up the right-edge pin connector to show a module is docked there. */
  dockedRight?: boolean
  glow?: boolean
  float?: boolean
  className?: string
}

const VB_W = 1000
const VB_H = 460

// Chassis — a regular compact 65%-style board, not a wide accessory slab.
const CH_X = 30
const CH_Y = 50
const CH_W = 940
const CH_H = 360
const CH_RX = 30

// Interior working area
const IN_X = CH_X + 34
const IN_Y = CH_Y + 34
const IN_RIGHT = CH_X + CH_W - 34
const IN_BOTTOM = CH_Y + CH_H - 34

const ROW_H = 52
const ROW_GAP = 8

// Vertical screen: narrow, ~1 key wide, 4 keys tall — sits where the nav
// cluster normally would, immediately right of the main block, ending flush
// above the arrow keys.
const SCR_W = 70
const SCR_X = IN_RIGHT - SCR_W
const SCR_Y = IN_Y
const SCR_H = ROW_H * 4 + ROW_GAP * 3

const KEY_X = IN_X
const KEY_Y = IN_Y
const KEY_W = SCR_X - 16 - KEY_X

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

// Arrow cluster: occupies exactly the row-height directly below the screen,
// laid out as a compact inverted-T within that single row band.
const AW_TOP = SCR_Y + SCR_H + ROW_GAP
const AW_SUB_GAP = 4
const AW_TOP_H = 24
const AW_BOTTOM_H = IN_BOTTOM - AW_TOP - AW_TOP_H - AW_SUB_GAP
const AW_KEY_W = (SCR_W - 2 * AW_SUB_GAP) / 3
const AW_BOTTOM_Y = AW_TOP + AW_TOP_H + AW_SUB_GAP
const arrowBottomKeys = [0, 1, 2].map((i) => ({ x: SCR_X + i * (AW_KEY_W + AW_SUB_GAP), y: AW_BOTTOM_Y, w: AW_KEY_W, h: AW_BOTTOM_H }))
const arrowUpKey = { x: arrowBottomKeys[1].x, y: AW_TOP, w: AW_KEY_W, h: AW_TOP_H }

// Screen content cells (4, stacked vertically)
const SCR_CELL_GAP = 4
const SCR_CELL_H = (SCR_H - SCR_CELL_GAP * 3) / 4
const screenCells = [0, 1, 2, 3].map((i) => ({ y: SCR_Y + i * (SCR_CELL_H + SCR_CELL_GAP), h: SCR_CELL_H }))

// Pin-connector docking points — visible magnetic contacts, not hidden grooves.
const rightPinX = CH_X + CH_W - 8
const leftPinX = CH_X + 8
const dockCenterY = SCR_Y + SCR_H / 2
const pinOffsets = [-30, -10, 10, 30]
const topPinY = CH_Y + 8
const topPinCenterX = CH_X + CH_W / 2
const topPinOffsets = [-36, -18, 0, 18, 36]

export const KEYBOARD_RIGHT_DOCK = { xPct: (rightPinX / VB_W) * 100, yPct: (dockCenterY / VB_H) * 100 }

function PinStrip({ x, y, w, h, pins, lit }: { x: number; y: number; w: number; h: number; pins: { x: number; y: number }[]; lit: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2.4} fill="#050506" stroke="#232328" strokeWidth="1" />
      {pins.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.6"
          fill={lit ? '#5b86e0' : '#1c1c21'}
          stroke={lit ? '#5b86e0' : '#45454c'}
          strokeWidth="1"
        />
      ))}
    </g>
  )
}

/**
 * A conceptual, abstract representation of the Noma hardware — not a render of a
 * finished product. A regular compact 65% key field with one addition: a narrow
 * vertical OLED strip, about four keys tall, set where the nav cluster would
 * normally sit — flush with the top row, ending right above the arrow keys.
 * Visible pin-connector strips on the left, right, and top edges are where
 * separate physical modules dock magnetically. Replace with real CAD renders
 * once they exist.
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
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-auto w-full" role="img" aria-label="Conceptual illustration of the Noma keyboard: a regular compact key field with a narrow vertical OLED strip beside the arrow keys and magnetic pin connectors on its edges">
          <defs>
            <linearGradient id={`${uid}-chassis`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c1c21" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>
            <linearGradient id={`${uid}-key`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18181c" />
              <stop offset="100%" stopColor="#111114" />
            </linearGradient>
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

          {/* recessed control deck */}
          <rect x={IN_X - 14} y={IN_Y - 14} width={IN_RIGHT - IN_X + 28} height={IN_BOTTOM - IN_Y + 28} rx="16" fill="#000" opacity="0.16" />

          {/* key field */}
          {keyRows.flat().map((k, i) => (
            <rect key={`k${i}`} x={k.x} y={k.y} width={k.w} height={k.h} rx="6" fill={`url(#${uid}-key)`} stroke="#242429" strokeWidth="1" />
          ))}


          {/* arrow cluster */}
          <rect x={arrowUpKey.x} y={arrowUpKey.y} width={arrowUpKey.w} height={arrowUpKey.h} rx="4" fill={`url(#${uid}-key)`} stroke="#242429" strokeWidth="1" />
          {arrowBottomKeys.map((k, i) => (
            <rect key={`a${i}`} x={k.x} y={k.y} width={k.w} height={k.h} rx="4" fill={`url(#${uid}-key)`} stroke="#242429" strokeWidth="1" />
          ))}

          {/* vertical OLED strip */}
          <rect x={SCR_X} y={SCR_Y} width={SCR_W} height={SCR_H} rx="9" fill="#050506" stroke="#5b86e0" strokeOpacity="0.3" strokeWidth="1.25" />
          <circle cx={SCR_X + SCR_W - 10} cy={SCR_Y + 10} r="2.3" fill="#5b86e0" />

          {readout ? (
            <g>
              <text
                x={SCR_X + SCR_W / 2}
                y={SCR_Y + SCR_H / 2 - 4}
                textAnchor="middle"
                fontFamily="'Space Grotesk', sans-serif"
                fontSize="11.5"
                fontWeight="600"
                fill="#8aaaec"
              >
                {readout.label}
              </text>
              <text
                x={SCR_X + SCR_W / 2}
                y={SCR_Y + SCR_H / 2 + 12}
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="7"
                letterSpacing="1"
                fill="#3b5590"
              >
                {readout.sub}
              </text>
            </g>
          ) : (
            <g>
              {screenCells.map((cell, i) => {
                const label = controls[i]
                if (!label) return null
                return (
                  <g key={label + i}>
                    {i > 0 && <line x1={SCR_X + 8} y1={cell.y} x2={SCR_X + SCR_W - 8} y2={cell.y} stroke="#1c1c21" strokeWidth="1" />}
                    <foreignObject x={SCR_X} y={cell.y} width={SCR_W} height={cell.h}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%', color: '#8aaaec' }}>
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

          {/* app context label, etched just above the screen */}
          <text x={SCR_X + SCR_W / 2} y={SCR_Y - 8} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="7.5" letterSpacing="1" fill="#3a3a41">
            {appName.toUpperCase()}
          </text>

          {/* pin-connector docking strips */}
          <PinStrip
            x={leftPinX - 5}
            y={dockCenterY - 45}
            w={10}
            h={90}
            pins={pinOffsets.map((o) => ({ x: leftPinX, y: dockCenterY + o }))}
            lit={false}
          />
          <PinStrip
            x={rightPinX - 5}
            y={dockCenterY - 45}
            w={10}
            h={90}
            pins={pinOffsets.map((o) => ({ x: rightPinX, y: dockCenterY + o }))}
            lit={dockedRight}
          />
          <PinStrip
            x={topPinCenterX - 55}
            y={topPinY - 5}
            w={110}
            h={10}
            pins={topPinOffsets.map((o) => ({ x: topPinCenterX + o, y: topPinY }))}
            lit={false}
          />
        </svg>
      </motion.div>
    </div>
  )
}
