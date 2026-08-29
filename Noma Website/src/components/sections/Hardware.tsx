import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import KeyboardVisual from '../visuals/KeyboardVisual'

// Pin-Connector Docking gets gold, matching the real lit-pin color elsewhere
// in this same illustration — the other two stay accent blue (interface).
const hotspots = [
  { x: 45.5, y: 50, gold: false },
  { x: 90, y: 43.5, gold: false },
  { x: 96, y: 43.5, gold: true },
]

const legend = [
  { label: 'Core Input', body: 'A regular compact 65% key field for everyday typing — nothing unusual to relearn.' },
  { label: 'Vertical OLED Strip', body: 'Built into the key field beside the arrow keys — a dynamic, touch-style control panel, not a status screen.' },
  { label: 'Pin-Connector Docking', body: 'Visible magnetic contacts on the sides and top edge where separate physical modules snap into place.' },
]

export default function Hardware() {
  return (
    <Section id="hardware">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Kicker index="06" label="Hardware" />
          <span className="rounded-md border border-base-600 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-base-400">
            In Development
          </span>
        </div>
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Built to become physical.
        </h2>
        <p className="mt-5 max-w-xl text-balance text-base text-base-300">
          The software is only the beginning. Every part of Noma is designed with a future physical keyboard in
          mind.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="relative mx-auto mt-16 max-w-3xl">
          <KeyboardVisual glow={false} />
          {hotspots.map((h, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              aria-hidden
            >
              <span className={`absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full ${h.gold ? 'bg-gold/60' : 'bg-accent/60'}`} />
              <span className={`relative block h-2.5 w-2.5 rounded-full ${h.gold ? 'bg-gold' : 'bg-accent'}`} />
            </span>
          ))}
        </div>
      </Reveal>

      <div className="mt-16 grid gap-x-8 gap-y-6 sm:grid-cols-3">
        {legend.map((item, i) => (
          <Reveal key={item.label} delay={i * 0.05}>
            <div className="flex gap-3">
              <span className={`font-mono text-xs ${i === 2 ? 'text-gold' : 'text-accent'}`}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-sm font-medium text-base-100">{item.label}</p>
                <p className="mt-1 text-sm text-base-400">{item.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
