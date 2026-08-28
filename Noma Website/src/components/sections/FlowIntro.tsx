import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import ControlChip from '../ui/ControlChip'

const steps = [
  {
    label: 'Observe',
    body: (
      <div className="flex flex-wrap justify-center gap-2">
        {['Ctrl+C', 'Alt+Tab', 'Ctrl+V'].map((k) => (
          <ControlChip key={k} size="sm" muted>
            {k}
          </ControlChip>
        ))}
      </div>
    ),
  },
  {
    label: 'Recognize',
    body: (
      <div className="text-center">
        <p className="font-display text-3xl font-semibold text-accent">27&times;</p>
        <p className="mt-1 text-xs text-base-400">repetitions detected</p>
      </div>
    ),
  },
  {
    label: 'Suggest',
    body: (
      <p className="text-center text-sm text-base-200">&ldquo;Turn this workflow into one control?&rdquo;</p>
    ),
  },
  {
    label: 'Adapt',
    body: (
      <div className="flex justify-center">
        <span className="rounded-lg bg-accent px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-wide text-base-950">
          Add to Keyboard
        </span>
      </div>
    ),
  },
]

export default function FlowIntro() {
  return (
    <Section id="flow">
      <Reveal>
        <Kicker index="03" label="Flow" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Noma adapts. <span className="text-base-400">Flow learns.</span>
        </h2>
        <p className="mt-5 max-w-xl text-balance text-base text-base-300">
          Flow observes approved interaction metadata to identify patterns in the way you work &mdash; never what
          you type, only how you work.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-6 sm:grid-cols-4 sm:gap-4">
        {steps.map((step, i) => (
          <Reveal key={step.label} delay={i * 0.1} className="relative">
            <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-base-700 bg-base-850/60 p-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{step.label}</span>
              <div className="flex flex-1 items-center">{step.body}</div>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-base-500 sm:block"
              >
                &rarr;
              </span>
            )}
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
