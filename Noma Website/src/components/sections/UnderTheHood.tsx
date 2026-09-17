import Reveal from '../ui/Reveal'

const PIPELINE = ['Desktop', 'Context Detection', 'Workflow Engine', 'Noma Keyboard']

const DETAILS = [
  { label: 'Context detection', body: 'Watches which application has focus and what you repeat within it.' },
  { label: 'Workflow learning', body: 'Recognizes a sequence once it repeats, not on the first try.' },
  { label: 'Local processing', body: 'Runs on your machine — nothing about how you work leaves your desktop.' },
  { label: 'Profiles', body: 'One control set per application, built automatically as it learns.' },
  { label: 'Integrations', body: 'Reads application context and window state, not your keystrokes or screen contents.' },
]

/**
 * "Under the hood." — the one deliberately technical section on the page,
 * signaled by switching to monospace for its own headline and pipeline
 * (the same convention JetBrains Mono already carries everywhere else on
 * this site for "technical value," not just here). Five short facts, not
 * an engineering writeup — the product brief is explicit that this
 * should read as "a premium product revealing how it works," not
 * documentation.
 */
export default function UnderTheHood() {
  return (
    <section id="under-the-hood" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <Reveal className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">System</p>
          <h2 className="mt-3 font-mono text-2xl font-medium text-base-50 sm:text-3xl">Under the hood.</h2>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-14 flex flex-col items-center gap-0 sm:flex-row sm:justify-center sm:gap-0">
            {PIPELINE.map((step, i) => (
              <div key={step} className="flex flex-col items-center sm:flex-row">
                <span className="rounded-md border border-base-700 bg-base-900 px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-base-200">
                  {step}
                </span>
                {i < PIPELINE.length - 1 && (
                  <span aria-hidden className="my-2 h-6 w-px bg-base-700 sm:my-0 sm:mx-3 sm:h-px sm:w-8" />
                )}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <dl className="mt-16 grid gap-x-10 gap-y-8 border-t border-base-800 pt-10 sm:grid-cols-2">
            {DETAILS.map((d) => (
              <div key={d.label}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-bright">{d.label}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-base-400">{d.body}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
