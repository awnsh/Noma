import Reveal from '../ui/Reveal'
import KeyboardVisual from '../visuals/KeyboardVisual'

/**
 * "This is Noma." — the honesty section. Product brief is explicit that
 * this one matters: no invented footage, no claim that a finished product
 * exists. The same hand-drawn `KeyboardVisual` every other section uses
 * (there's no CAD render or real photography in this repository to swap
 * in — using a different visual language here specifically would be
 * the "fictional product that exists only in renders" problem, not a fix
 * for it), paired with a plain, undecorated "in development" statement
 * instead of a status graphic.
 */
export default function RealPrototype() {
  return (
    <section id="prototype" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-base-700 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-base-400">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            In development
          </span>
          <h2 className="mt-5 text-balance font-display text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-base-50">
            This is Noma.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-balance text-base text-base-400">
            We&rsquo;re building the physical keyboard, the software, and the intelligence that connects them
            &mdash; in that order, for real, right now.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-14 w-full max-w-2xl">
            <KeyboardVisual appName="VS Code" controls={['Run', 'Debug', 'Terminal', 'Search']} glow float={false} showPinConnectors={false} />
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <a
            href="#story"
            className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-accent-bright transition-colors hover:text-accent"
          >
            Follow the build <span aria-hidden>&rarr;</span>
          </a>
        </Reveal>
      </div>
    </section>
  )
}
