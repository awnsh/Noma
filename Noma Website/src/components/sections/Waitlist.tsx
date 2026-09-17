import Reveal from '../ui/Reveal'
import WaitlistForm from '../ui/WaitlistForm'

/**
 * The second and last bright section on the page, deliberately minimal —
 * no keyboard illustration, no chain, just the ask. `WaitlistForm` is the
 * real, working Formspree-backed form used everywhere else on this site;
 * its own dark input pill sitting on this light section is an intentional
 * high-contrast beat, not a mismatch to fix.
 */
export default function Waitlist() {
  return (
    <section id="waitlist" className="relative bg-base-50 py-24 sm:py-32">
      <div className="mx-auto max-w-lg px-6 text-center sm:px-8">
        <Reveal>
          <h2 className="text-balance font-display text-[clamp(1.9rem,4.5vw,3rem)] font-semibold leading-[1.1] tracking-tight text-base-950">
            Be part of the first Noma.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-balance text-base text-base-500">
            We&rsquo;re building Noma with our first users.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-9">
            <WaitlistForm submitLabel="Join the Waitlist" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
