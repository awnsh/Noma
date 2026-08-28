import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'

// NOTE: no waitlist backend exists yet. When one is ready, add a third
// primary action here — [ Join the Waitlist ] — wired to a real endpoint.
export default function CTA() {
  return (
    <Section id="cta" className="text-center">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Noma is being built</p>
        <h2 className="mx-auto mt-5 max-w-2xl text-balance font-display text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Follow the build.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-balance text-base text-base-300">
          Noma doesn&rsquo;t exist as a finished product yet &mdash; it&rsquo;s being built in the open, one
          prototype at a time.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button href="#founder" variant="primary">
            Follow the Build
          </Button>
          <Button href="mailto:hello@noma.build" variant="secondary">
            Contact
          </Button>
        </div>
      </Reveal>
    </Section>
  )
}
