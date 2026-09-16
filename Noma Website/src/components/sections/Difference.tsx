import Section from '../layout/Section'
import Reveal from '../ui/Reveal'

const traditional = ['You', 'Configure', 'Buttons']
const noma = ['You', 'Use your computer', 'Noma learns', 'Your interface']

function FlowColumn({ steps, muted }: { steps: string[]; muted: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center">
          <span
            className={`rounded-full border px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] ${
              muted ? 'border-base-700 text-base-400' : 'border-accent/40 bg-accent/[0.06] text-accent-bright'
            }`}
          >
            {step}
          </span>
          {i < steps.length - 1 && <span aria-hidden className={`my-2 h-8 w-px ${muted ? 'bg-base-700' : 'bg-accent/30'}`} />}
        </div>
      ))}
    </div>
  )
}

/**
 * Deliberately not a competitor comparison table — two short vertical flows,
 * side by side, one muted and one lit. The whole argument is four words on
 * each side; anything more would be the "wall of text" this site is built
 * to avoid.
 */
export default function Difference() {
  return (
    <Section id="difference">
      <Reveal>
        <h2 className="mx-auto max-w-xl text-balance text-center font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          The difference.
        </h2>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-16 sm:grid-cols-2 sm:gap-8">
        <Reveal delay={0.05}>
          <p className="mb-8 text-center text-base text-base-400">Most interfaces wait for you to configure them.</p>
          <FlowColumn steps={traditional} muted />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mb-8 text-center text-base text-base-100">Noma learns what you repeat.</p>
          <FlowColumn steps={noma} muted={false} />
        </Reveal>
      </div>
    </Section>
  )
}
