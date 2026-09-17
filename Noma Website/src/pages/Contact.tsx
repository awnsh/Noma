import Reveal from '../components/ui/Reveal'
import SiteLink from '../components/layout/SiteLink'
import { GLASS } from '../lib/glass'

// A real mailto link, not a fake form with nowhere to submit to. This
// site's only working backend is the waitlist's Formspree endpoint (see
// `data/config.ts`), and inventing a second form with no endpoint behind
// it would be exactly the kind of "fake UI that looks generated" this
// codebase's own conventions avoid elsewhere (see `RealPrototype`-style
// honesty framing on the homepage). A real email address that actually
// reaches someone is more honest than a form that silently goes nowhere.
const REASONS = [
  { label: 'General', subject: 'Hello' },
  { label: 'Press', subject: 'Press inquiry' },
  { label: 'Partnerships', subject: 'Partnership inquiry' },
]

export default function Contact() {
  return (
    <div className="border-t border-base-800 bg-base-950 pb-24 pt-40 sm:pt-48">
      <div className="mx-auto max-w-lg px-6 text-center sm:px-8">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">Contact</p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Talk to us.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-balance text-base text-base-400">
            We&rsquo;re a small team building Noma. A real person reads every email.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className={`mt-12 rounded-3xl px-8 py-12 ${GLASS}`}>
            <a
              href="mailto:hello@noma.build"
              className="text-balance font-display text-xl font-semibold text-base-50 transition-colors hover:text-accent-bright sm:text-2xl"
            >
              hello@noma.build
            </a>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 border-t border-white/10 pt-8">
              {REASONS.map((r) => (
                <a
                  key={r.label}
                  href={`mailto:hello@noma.build?subject=${encodeURIComponent(r.subject)}`}
                  className="rounded-full border border-base-700 px-4 py-2 text-sm font-medium text-base-300 transition-colors hover:border-accent/40 hover:text-base-50"
                >
                  {r.label}
                </a>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-10 text-sm text-base-500">
            Looking to join the waitlist instead?{' '}
            <SiteLink href="#waitlist" className="text-accent-bright transition-colors hover:text-accent">
              Sign up here
            </SiteLink>
            .
          </p>
        </Reveal>
      </div>
    </div>
  )
}
