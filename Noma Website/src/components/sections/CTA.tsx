import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import WaitlistForm from '../ui/WaitlistForm'
import Button from '../ui/Button'
import KeyboardVisual from '../visuals/KeyboardVisual'

export default function CTA() {
  return (
    <Section id="cta" className="relative overflow-hidden text-center">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] hero-glow" />

      <Reveal>
        <h2 className="mx-auto max-w-2xl text-balance font-display text-[clamp(2rem,5.5vw,3.75rem)] font-semibold uppercase leading-[1.08] tracking-tight text-base-50">
          Your computer is already
          <br />
          teaching Noma.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-balance text-base text-base-300">
          Join the people building a more personal way to use their computer.
        </p>

        <div className="mt-10">
          <WaitlistForm submitLabel="Join the Noma Waitlist" />
        </div>

        <div className="mt-6">
          <Button href="#holo" variant="ghost">
            Or try Holo free →
          </Button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <a href="#about" className="text-base-400 underline decoration-base-600 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent">
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

      {/* The same hardware image the page opened on in Hero, closing the
          loop rather than ending on text and a form alone. */}
      <Reveal delay={0.1}>
        <div className="mx-auto mt-16 max-w-2xl" aria-hidden>
          <KeyboardVisual float={false} />
        </div>
      </Reveal>
    </Section>
  )
}
