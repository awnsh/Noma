import Section from '../layout/Section'
import Reveal from '../ui/Reveal'

// Grounded in the real implementation, not a generic security pitch — Noma's
// pattern detection works on application context, shortcut/action sequences,
// and their frequency, never on typed content or screen contents.
const learns = ['Application context', 'Shortcut patterns', 'Workflow frequency', 'Repeated sequences']
const doesntNeed = ['The words you type', 'Your private messages', 'Your documents']

/**
 * Deliberately calm, not a security-marketing section — no shield icons, no
 * "military-grade" language, no big claims. Just what the pattern-detection
 * system actually looks at versus what it has no reason to.
 */
export default function Privacy() {
  return (
    <Section id="privacy">
      <Reveal>
        <h2 className="mx-auto max-w-xl text-balance text-center font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Noma learns from patterns,
          <br />
          <span className="text-base-400">not the content you type.</span>
        </h2>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-3xl gap-x-12 gap-y-12 sm:grid-cols-2">
        <Reveal delay={0.05}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">What Noma learns</p>
          <ul className="mt-5 flex flex-col gap-3">
            {learns.map((item) => (
              <li key={item} className="flex items-center gap-3 text-base text-base-200">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">What Noma doesn&rsquo;t need</p>
          <ul className="mt-5 flex flex-col gap-3">
            {doesntNeed.map((item) => (
              <li key={item} className="flex items-center gap-3 text-base text-base-500">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-base-700" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  )
}
