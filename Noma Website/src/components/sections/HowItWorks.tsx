import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import ControlChip from '../ui/ControlChip'
import { vscodeDefaultControls, vscodeLearnedControls } from '../../data/appProfiles'

const steps = [
  { n: '01', title: 'Context', body: 'Noma understands what you’re using.' },
  { n: '02', title: 'Adapt', body: 'Your controls change.' },
  { n: '03', title: 'Learn', body: 'Flow identifies patterns.' },
  { n: '04', title: 'Evolve', body: 'Your interface becomes personalized.' },
]

export default function HowItWorks() {
  return (
    <Section id="how">
      <Reveal>
        <Kicker index="07" label="How It Works" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Four steps. One interface.
        </h2>
      </Reveal>

      <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {steps.map((step, i) => (
          <Reveal key={step.n} delay={i * 0.08}>
            <p className="font-display text-4xl font-semibold text-base-700">{step.n}</p>
            <p className="mt-3 text-base font-medium text-base-50">{step.title}</p>
            <p className="mt-1 text-sm text-base-400">{step.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15}>
        <div className="mt-24 rounded-2xl border border-base-700 bg-base-850/60 p-8 sm:p-10">
          <h3 className="text-balance font-display text-xl font-semibold text-base-50 sm:text-2xl">
            It becomes your interface.
          </h3>
          <p className="mt-2 max-w-md text-sm text-base-400">
            The longer you use Noma, the more it becomes yours.
          </p>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <div className="w-full max-w-[220px]">
              <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-base-500">Default</p>
              <div className="grid grid-cols-2 gap-2">
                {vscodeDefaultControls.map((c) => (
                  <ControlChip key={c} size="sm" muted>
                    {c}
                  </ControlChip>
                ))}
              </div>
            </div>

            <span className="rotate-90 font-mono text-base-500 sm:rotate-0">&rarr;</span>

            <div className="w-full max-w-[220px]">
              <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Your Noma</p>
              <div className="grid grid-cols-2 gap-2">
                {vscodeLearnedControls.map((c) => (
                  <ControlChip key={c} size="sm" active>
                    {c}
                  </ControlChip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
