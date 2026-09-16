import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import KeyboardVisual from '../visuals/KeyboardVisual'
import ModuleEnclosure, { type ModuleType } from '../visuals/ModuleEnclosure'

// Four hotspots, each pointing at one of the four features below — Pin-
// Connector Docking gets gold, matching the real lit-pin color elsewhere in
// this same illustration; the other three stay accent blue (interface, not
// physical contact).
const hotspots = [
  { x: 45.5, y: 50, gold: false },
  { x: 90, y: 43.5, gold: false },
  { x: 90, y: 72, gold: false },
  { x: 96, y: 43.5, gold: true },
]

// Only what actually exists or is genuinely planned — no invented specs.
const legend = [
  { label: 'Adaptive Controls', body: "Noma's interface changes with what you're doing.", gold: false },
  { label: 'OLED Display', body: 'See the controls Noma thinks are useful right now.', gold: false },
  { label: 'Physical Input', body: 'Press, turn, interact — real mechanical switches.', gold: false },
  { label: 'Magnetic Modules', body: 'Expand the interface when your workflow demands it.', gold: true },
]

const modules: { type: ModuleType; name: string; line: string }[] = [
  { type: 'rotary', name: 'Rotary Encoder', line: 'Zoom, scroll, play / pause' },
  { type: 'button', name: 'Button Pad', line: 'Four programmable buttons' },
  { type: 'slider', name: 'Slider', line: 'Brush size, volume, any range' },
]

/**
 * Noma Device's own full-page moment — the physical half of the Holo →
 * Device bridge Holo.tsx just closed on. Four features only, each one a
 * real hotspot on the illustration below (no invented specs): the roadmap
 * that used to close this section moved to `BuildingInPublic.tsx`, since
 * "how far along is this" is a build-in-public claim, not a product feature.
 */
export default function Hardware() {
  return (
    <Section id="device">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Noma Device</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h2 className="max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Your workflows. At your fingertips.
          </h2>
          <span className="rounded-md border border-base-600 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-base-400">
            In Development
          </span>
        </div>
      </Reveal>

      <div className="relative mx-auto mt-16 max-w-3xl">
        <Reveal delay={0.1}>
          <KeyboardVisual glow={false} />
        </Reveal>

        {/* Hotspots animate into focus one at a time rather than all at
            once — individual hardware components, not a single simultaneous
            batch. Each dot's outer `span` carries the actual `left`/`top`
            positioning; the `Reveal` inside just handles that one hotspot's
            own fade-in timing. */}
        {hotspots.map((h, i) => (
          <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${h.x}%`, top: `${h.y}%` }} aria-hidden>
            <Reveal delay={0.3 + i * 0.15} y={0} as="span">
              <span className={`absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full ${h.gold ? 'bg-gold/60' : 'bg-accent/60'}`} />
              <span className={`relative block h-2.5 w-2.5 rounded-full ${h.gold ? 'bg-gold' : 'bg-accent'}`} />
            </Reveal>
          </span>
        ))}
      </div>

      <div className="mt-16 grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {legend.map((item, i) => (
          <Reveal key={item.label} delay={i * 0.05}>
            <div className="flex gap-3">
              <span className={`font-mono text-xs ${item.gold ? 'text-gold' : 'text-accent'}`}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-sm font-medium text-base-100">{item.label}</p>
                <p className="mt-1 text-sm text-base-400">{item.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15}>
        <p className="mt-20 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">
          Magnetic modules that snap into the dock
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {modules.map((m) => (
            <div key={m.name} className="flex flex-col items-center gap-3 rounded-2xl border border-base-700 bg-base-850/60 p-6 text-center">
              <ModuleEnclosure type={m.type} className="h-16 w-20" />
              <div>
                <p className="text-sm font-medium text-base-100">{m.name}</p>
                <p className="mt-1 font-mono text-[11px] text-base-400">{m.line}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  )
}
