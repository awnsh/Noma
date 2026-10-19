import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SiApple } from 'react-icons/si'
import ProductNotice, { type ProductNoticeStep } from './ProductNotice'
import AppIcon from './AppIcon'
import { appProfiles } from '../../data/appProfiles'
import { journey } from '../../data/journey'

/**
 * Flow, demonstrated on a real-looking desktop (2026-10-06 redesign; grew out
 * of the earlier NoticeDesktop). Someone planning a trip with friends does
 * what they always do when they find a place: screenshot it in Chrome, paste
 * it into the group chat on Discord, paste it into the shared plan in Notion.
 * An everyday sequence on purpose (2026-10-19): Noma is for anyone who's on
 * their computer a lot, not mainly developers or Claude users. The window in
 * front and the keys pressed are shown as they happen (a keycast, the usual
 * screen-recording convention, not Noma UI). On the third run, Noma's notice
 * arrives in the corner, drawn exactly as the app draws it
 * (ProductNotice.tsx) and at the app's own threshold of three.
 *
 * Every step is one Flow really records: a shortcut with Ctrl, Alt or the
 * Windows key, or an app switch. A bare Enter is never recorded, which is
 * why the scene stops at the paste rather than showing a send.
 *
 * Since 2026-10-11 this is the screen of a rendered MacBook, played by
 * scrolling (DemoGlide.tsx): the laptop image has its display cut out and
 * this screen sits behind it, warped onto the display's corners. Drawn at a
 * fixed 960 wide, with the display's own aspect, and warped to fit.
 */

export const SCREEN_W = 960
export const SCREEN_H = Math.round(SCREEN_W / journey.screenAspect)

type WindowId = 'chrome' | 'discord' | 'notion'

const STEPS: { window: WindowId; appId: string; menu: string; keys: string; label: string }[] = [
  { window: 'chrome', appId: 'chrome', menu: 'Google Chrome', keys: 'Win + Shift + S', label: 'Screenshot' },
  { window: 'discord', appId: 'discord', menu: 'Discord', keys: 'Ctrl + V', label: 'Paste' },
  { window: 'notion', appId: 'notion', menu: 'Notion', keys: 'Ctrl + V', label: 'Paste' },
]

const NOTICE_STEPS: ProductNoticeStep[] = [
  { kind: 'action', label: 'Screenshot' },
  { kind: 'app', label: 'Discord', appId: 'discord', color: '#5865f2', action: 'Paste' },
  { kind: 'app', label: 'Notion', appId: 'notion', color: '#f0f0f0', action: 'Paste' },
]

/** The app's own WORKFLOW_NOTIFICATION_THRESHOLD. */
const RUNS = 3

export interface Frame {
  run: number
  step: number | null
  notice: boolean
  ms: number
}

/** The whole loop: three runs (the first slower, so it can be read), then
 *  the notice for about as long as the app keeps it up. */
const TIMELINE: Frame[] = (() => {
  const frames: Frame[] = [{ run: 0, step: null, notice: false, ms: 700 }]
  for (let run = 1; run <= RUNS; run++) {
    STEPS.forEach((_, step) => frames.push({ run, step, notice: false, ms: run === 1 ? 1300 : 750 }))
    frames.push({ run, step: null, notice: false, ms: run === RUNS ? 350 : 600 })
  }
  frames.push({ run: RUNS, step: null, notice: true, ms: 6000 })
  return frames
})()

export const FINAL: Frame = { run: RUNS, step: null, notice: true, ms: 0 }

function TrafficLights() {
  return (
    <div className="flex items-center gap-[7px]">
      <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
      <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
      <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
    </div>
  )
}

/** A window that dims when it isn't the one in front. */
function Win({ focused, z, className, children }: { focused: boolean; z: number; className: string; children: ReactNode }) {
  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-[10px] border border-white/10 transition-[filter] duration-300 ${className}`}
      style={{ zIndex: focused ? 30 : z, filter: focused ? 'none' : 'brightness(0.62)' }}
    >
      {children}
    </div>
  )
}

/** The listing's photo: a lake at dusk, drawn rather than a stock image. */
const PHOTO =
  'linear-gradient(180deg, #f3b37a 0%, #e98b6d 34%, #7b6f9c 58%, #2f4f6b 59%, #375d78 74%, #1f3a2c 75%, #16291f 100%)'

function ChromeWindow({ focused }: { focused: boolean }) {
  return (
    <Win focused={focused} z={10} className="left-[34px] top-[52px] h-[430px] w-[650px] bg-[#f6f7f9] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.75)]">
      <div className="flex h-[34px] shrink-0 items-end gap-2 bg-[#202124] px-3">
        <div className="mb-[11px]">
          <TrafficLights />
        </div>
        <span className="ml-2 flex h-[26px] w-[190px] items-center gap-2 rounded-t-[8px] bg-[#35363a] px-3 text-[11px] text-[#e8eaed]">
          <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#5aa469]" />
          <span className="truncate">Lakeside cabin · Brown County</span>
        </span>
        <span className="flex h-[26px] items-center px-3 text-[11px] text-[#9aa0a6]">Bus tickets</span>
      </div>
      <div className="flex h-[30px] shrink-0 items-center gap-3 bg-[#35363a] px-3">
        <span className="text-[12px] text-[#9aa0a6]">←  →  ↻</span>
        <span className="flex-1 rounded-full bg-[#202124] px-3 py-[3px] text-[11px] text-[#bdc1c6]">pinehollowstays.com/cabins/lakeside</span>
      </div>
      <div className="flex min-h-0 flex-1 gap-5 p-5 text-[#1f2328]">
        <div className="h-[250px] w-[330px] shrink-0 rounded-[10px]" style={{ background: PHOTO }} />
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-semibold leading-tight">Lakeside cabin with a dock</p>
          <p className="mt-1 text-[12px] text-[#59636e]">Brown County, Indiana · sleeps 6</p>
          <p className="mt-3 text-[12px]">
            <span className="font-semibold">★ 4.9</span> <span className="text-[#59636e]">· 212 reviews</span>
          </p>
          <div className="mt-4 space-y-1.5 text-[12px] text-[#3d444d]">
            <p>3 bedrooms · 2 baths</p>
            <p>Hot tub, fire pit, kayaks</p>
            <p>45 min from Bloomington</p>
          </div>
          <p className="mt-5 text-[20px] font-semibold">
            $142 <span className="text-[12px] font-normal text-[#59636e]">night</span>
          </p>
          <div className="mt-3 rounded-[8px] bg-[#d9534f] py-2 text-center text-[12px] font-semibold text-white">Check availability</div>
        </div>
      </div>
    </Win>
  )
}

const CHAT: { who: string; color: string; text: string }[] = [
  { who: 'maya', color: '#f0b232', text: 'ok we need a place by friday' },
  { who: 'jordan', color: '#57f287', text: 'under $150 a night or i’m out' },
  { who: 'you', color: '#ffffff', text: 'found one ↓' },
]

function DiscordWindow({ focused }: { focused: boolean }) {
  return (
    <Win focused={focused} z={12} className="left-[430px] top-[226px] h-[300px] w-[470px] bg-[#313338] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)]">
      <div className="relative flex h-[28px] shrink-0 items-center border-b border-black/40 bg-[#1e1f22] px-3">
        <TrafficLights />
        <span className="absolute inset-x-0 text-center text-[11px] text-[#b5bac1]">Discord</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[46px] shrink-0 flex-col items-center gap-2 bg-[#1e1f22] pt-2">
          {['#5865f2', '#3ba55d', '#eb459e'].map((color) => (
            <span key={color} className="h-[30px] w-[30px] rounded-[10px]" style={{ background: color }} />
          ))}
        </div>
        <div className="w-[110px] shrink-0 bg-[#2b2d31] px-2 py-2 text-[11px] text-[#949ba4]">
          <p className="mb-2 px-1 text-[11px] font-semibold text-[#f2f3f5]">spring break</p>
          {['general', 'trip-planning', 'carpool'].map((channel) => (
            <p key={channel} className={`truncate rounded-[4px] px-1.5 py-[3px] ${channel === 'trip-planning' ? 'bg-[#404249] text-white' : ''}`}>
              # {channel}
            </p>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[26px] shrink-0 items-center border-b border-black/30 px-3 text-[11px] font-semibold text-[#f2f3f5]"># trip-planning</div>
          <div className="flex-1 space-y-2 overflow-hidden px-3 py-2 text-[11px] leading-[15px]">
            {CHAT.map((line) => (
              <p key={line.who} className="text-[#dbdee1]">
                <span className="font-semibold" style={{ color: line.color }}>
                  {line.who}
                </span>{' '}
                {line.text}
              </p>
            ))}
          </div>
          <div className="m-2 flex items-center gap-2 rounded-[8px] bg-[#383a40] px-2 py-1.5">
            <span className="h-[34px] w-[48px] shrink-0 rounded-[4px]" style={{ background: PHOTO }} />
            <span className="text-[10px] text-[#949ba4]">image.png</span>
          </div>
        </div>
      </div>
    </Win>
  )
}

const TASKS: [string, boolean][] = [
  ['Pick a place', true],
  ['Book the bus', false],
  ['Split costs', false],
]

function NotionWindow({ focused }: { focused: boolean }) {
  return (
    <Win focused={focused} z={11} className="left-[560px] top-[70px] h-[270px] w-[370px] bg-[#191919] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)]">
      <div className="relative flex h-[28px] shrink-0 items-center border-b border-black/50 bg-[#202020] px-3">
        <TrafficLights />
        <span className="absolute inset-x-0 text-center text-[11px] text-[#9b9b9b]">Notion</span>
      </div>
      <div className="flex-1 px-6 py-4 text-[11px] text-[#d4d4d4]">
        <p className="text-[17px] font-semibold text-white">Spring break plan</p>
        <p className="mt-3 text-[12px] font-semibold text-white">Places to stay</p>
        <div className="mt-2 flex gap-2">
          <span className="h-[54px] w-[84px] rounded-[4px]" style={{ background: PHOTO }} />
          <span className="h-[54px] w-[84px] rounded-[4px] bg-[linear-gradient(160deg,#c9d6df,#7d8f9c)]" />
        </div>
        <p className="mt-3 text-[12px] font-semibold text-white">To do</p>
        {TASKS.map(([task, done]) => (
          <p key={task} className="mt-1 flex items-center gap-2">
            <span className={`h-[11px] w-[11px] rounded-[2px] border ${done ? 'border-[#2383e2] bg-[#2383e2]' : 'border-[#6b6b6b]'}`} />
            <span className={done ? 'text-[#7f7f7f] line-through' : ''}>{task}</span>
          </p>
        ))}
      </div>
    </Win>
  )
}

/** The keys being pressed, the way a screen recording shows them. */
export function Keycast({ frame }: { frame: Frame }) {
  const step = frame.step === null ? null : STEPS[frame.step]
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md">
      <AnimatePresence mode="wait" initial={false}>
        {step ? (
          <motion.div
            key={`${frame.run}-${frame.step}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2.5"
          >
            <AppIcon id={step.appId} color={appProfiles[step.appId]?.color} className="h-[15px] w-[15px]" />
            <span className="rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white">{step.keys}</span>
            <span className="text-[12px] text-white/70">{step.label}</span>
          </motion.div>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] text-white/60">
            {frame.notice ? 'Noma noticed' : 'Working…'}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="ml-1 border-l border-white/10 pl-3 font-mono text-[11px] text-white/50">
        {frame.run > 0 ? `${frame.run}×` : '0×'}
      </span>
    </div>
  )
}

/** Where the pointer goes for each moment, in screen pixels: into the
 *  window the step happens in, then over the notice's button. */
const POINTER: Record<WindowId | 'rest' | 'notice', [number, number]> = {
  rest: [480, 330],
  chrome: [300, 262],
  discord: [610, 500],
  notion: [742, 250],
  notice: [688, SCREEN_H - 36],
}

function targetOf(frame: Frame): [number, number] {
  if (frame.notice) return POINTER.notice
  if (frame.step === null) return POINTER.rest
  return POINTER[STEPS[frame.step].window]
}

const TOTAL_MS = TIMELINE.reduce((sum, frame) => sum + frame.ms, 0)

export interface Moment {
  frame: Frame
  pointer: [number, number]
  pressed: boolean
}

/** The demo at progress p (0..1): which moment, and where the pointer is.
 *  The pointer travels in the first 45% of each moment, then rests and
 *  clicks. p = 1 is the final state, notice up. */
export function playhead(p: number): Moment {
  const t = Math.min(1, Math.max(0, p)) * TOTAL_MS
  let start = 0
  for (let index = 0; index < TIMELINE.length; index++) {
    const frame = TIMELINE[index]
    if (t < start + frame.ms || index === TIMELINE.length - 1) {
      const into = Math.min(1, (t - start) / frame.ms)
      const from = index === 0 ? POINTER.rest : targetOf(TIMELINE[index - 1])
      const to = targetOf(frame)
      const k = Math.min(1, into / 0.45)
      const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      return {
        frame,
        pointer: [from[0] + (to[0] - from[0]) * ease, from[1] + (to[1] - from[1]) * ease],
        pressed: frame.step !== null && into > 0.45 && into < 0.62,
      }
    }
    start += frame.ms
  }
  return { frame: FINAL, pointer: POINTER.notice, pressed: false }
}

export const FINAL_MOMENT: Moment = { frame: FINAL, pointer: POINTER.notice, pressed: false }

/** The macOS pointer. */
function Pointer({ at, pressed }: { at: [number, number]; pressed: boolean }) {
  return (
    <svg
      viewBox="0 0 20 28"
      className="pointer-events-none absolute z-[60] h-[24px] w-[17px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
      style={{ left: at[0], top: at[1], transform: `scale(${pressed ? 0.86 : 1})`, transformOrigin: 'top left', transition: 'transform 120ms' }}
      aria-hidden
    >
      <path d="M1.5 1.5 L1.5 22 L6.6 17.2 L10 25.4 L13.4 24 L10 16 L17 16 Z" fill="#000" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/** Noma's notice, as the app shows it (enter 280 ms, exit 200 ms). */
export function DemoNotice({ show, compact, animate }: { show: boolean; compact: boolean; animate: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={compact ? 'flex justify-center' : 'absolute bottom-[20px] right-[20px] z-40'}
          initial={animate ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <ProductNotice steps={NOTICE_STEPS} occurrences={RUNS} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** The whole screen at one moment, SCREEN_W x SCREEN_H, unscaled. In
 *  compact layouts the keycast and notice are drawn outside it instead. */
export function DemoScreen({ moment, compact = false, animate = true }: { moment: Moment; compact?: boolean; animate?: boolean }) {
  const { frame } = moment
  const focusedWindow: WindowId = frame.step === null ? (frame.run === 0 ? 'chrome' : 'notion') : STEPS[frame.step].window
  const menu = STEPS.find((step) => step.window === focusedWindow)?.menu ?? 'Google Chrome'
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: SCREEN_W,
        height: SCREEN_H,
        background:
          'radial-gradient(ellipse 80% 70% at 70% 20%, #1a2236 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 15% 90%, #17151f 0%, transparent 60%), #0c0e14',
      }}
    >
      <div className="relative z-50 flex h-[26px] items-center gap-[18px] bg-black/35 px-4 text-[12px] text-white/90 backdrop-blur-xl">
        <SiApple className="h-[13px] w-[13px]" />
        <span className="font-semibold">{menu}</span>
        {['File', 'Edit', 'View', 'Window', 'Help'].map((item) => (
          <span key={item} className="text-white/85">
            {item}
          </span>
        ))}
        <span className="ml-auto text-white/85">Mon 9:21 AM</span>
      </div>

      <ChromeWindow focused={focusedWindow === 'chrome'} />
      <NotionWindow focused={focusedWindow === 'notion'} />
      <DiscordWindow focused={focusedWindow === 'discord'} />

      {!compact && (
        <div className="absolute bottom-[20px] left-[20px] z-40">
          <Keycast frame={frame} />
        </div>
      )}
      {!compact && <DemoNotice show={frame.notice} compact={false} animate={animate} />}
      <Pointer at={moment.pointer} pressed={moment.pressed} />
    </div>
  )
}
