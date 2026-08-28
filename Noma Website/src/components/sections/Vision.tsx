import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'

const timeline = [
  { label: 'Today', body: 'Software prototype', current: true },
  { label: 'Next', body: 'Physical STM32 prototype', current: false },
  { label: 'Then', body: 'Modular Noma keyboard', current: false },
  { label: 'Eventually', body: 'An ecosystem of adaptive interfaces', current: false },
]

export default function Vision() {
  return (
    <Section id="vision">
      <Reveal>
        <Kicker index="08" label="Vision" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          A new kind of computer interface.
        </h2>
      </Reveal>

      <div className="mt-16 max-w-xl">
        {timeline.map((stop, i) => (
          <Reveal key={stop.label} delay={i * 0.08}>
            <div className="relative flex gap-6 pb-10 last:pb-0">
              {i < timeline.length - 1 && (
                <span className="absolute left-[5px] top-4 h-full w-px bg-base-700" aria-hidden />
              )}
              <span
                className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  stop.current ? 'bg-accent' : 'bg-base-600'
                }`}
                aria-hidden
              />
              <div>
                <p className={`font-mono text-xs uppercase tracking-[0.2em] ${stop.current ? 'text-accent' : 'text-base-500'}`}>
                  {stop.label}
                </p>
                <p className="mt-1.5 text-lg text-base-100">{stop.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
