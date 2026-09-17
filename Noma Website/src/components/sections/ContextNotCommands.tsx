import Reveal from '../ui/Reveal'

const traditional = ['Command', 'Keyboard', 'Action']
const noma = ['Context', 'Noma', 'Workflow']

function FlowColumn({ steps, lit }: { steps: string[]; lit: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center">
          <span
            className={`rounded-full border px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] ${
              lit ? 'border-accent/40 bg-accent/[0.06] text-accent-bright' : 'border-base-700 text-base-400'
            }`}
          >
            {step}
          </span>
          {i < steps.length - 1 && <span aria-hidden className={`my-2 h-8 w-px ${lit ? 'bg-accent/30' : 'bg-base-700'}`} />}
        </div>
      ))}
    </div>
  )
}

/**
 * "Traditional keyboards wait for commands. / Noma understands context." —
 * deliberately the quietest section on the page: two four-word vertical
 * flows, no animation beyond the standard scroll-in fade every section
 * gets, no diagram explaining itself further. The product brief is
 * explicit that this one should be carried entirely by typography and
 * spacing, right after the two loud, scroll-driven flagship demos above
 * it — a breath, not a third demonstration of the same idea.
 */
export default function ContextNotCommands() {
  return (
    <section id="context" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <Reveal>
          <p className="text-balance font-display text-2xl font-medium leading-snug text-base-400 sm:text-3xl">
            Traditional keyboards wait for commands.
          </p>
          <p className="mt-2 text-balance font-display text-2xl font-semibold leading-snug text-base-50 sm:text-3xl">
            Noma understands context.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-16 sm:grid-cols-2 sm:gap-8">
          <Reveal delay={0.05}>
            <FlowColumn steps={traditional} lit={false} />
          </Reveal>
          <Reveal delay={0.1}>
            <FlowColumn steps={noma} lit />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
