import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import WaitlistForm from '../ui/WaitlistForm'
import KeyboardVisual from '../visuals/KeyboardVisual'

export default function CTA() {
  return (
    <Section id="cta" className="text-center">
      <Reveal>
        <h2 className="mx-auto max-w-2xl text-balance font-display text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Stop reaching for shortcuts.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-balance text-base text-base-300">Make your keyboard adapt to you.</p>

        <div className="mt-10">
          <WaitlistForm submitLabel="Join the Noma Beta" />
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

      {/* The same hardware image the page opened on in Hero, closing the
          loop rather than ending on text and a form alone — final hero
          state, per the brief. */}
      <Reveal delay={0.1}>
        <div className="mx-auto mt-16 max-w-2xl" aria-hidden>
          <KeyboardVisual float={false} />
        </div>
      </Reveal>
    </Section>
  )
}
