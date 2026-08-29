import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import WaitlistForm from '../ui/WaitlistForm'

export default function CTA() {
  return (
    <Section id="cta" className="text-center">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Noma is being built</p>
        <h2 className="mx-auto mt-5 max-w-2xl text-balance font-display text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Be first to try it.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-balance text-base text-base-300">
          Noma doesn&rsquo;t exist as a finished product yet &mdash; it&rsquo;s being built in the open, one
          prototype at a time. Join the waitlist to follow along and get early access.
        </p>

        <div className="mt-10">
          <WaitlistForm />
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <a href="#founder" className="text-base-400 underline decoration-base-600 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent">
            Follow the Build
          </a>
          <a
            href="mailto:hello@noma.build"
            className="text-base-400 underline decoration-base-600 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            Contact
          </a>
        </div>
      </Reveal>
    </Section>
  )
}
