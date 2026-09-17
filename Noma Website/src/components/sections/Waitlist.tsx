import Reveal from '../ui/Reveal'
import WaitlistForm from '../ui/WaitlistForm'
import { GLASS } from '../../lib/glass'

/**
 * The last conversion section, deliberately minimal — no keyboard
 * illustration, no chain, just the ask. Used to be a flat all-white
 * section (the only other light break on the page besides
 * `EditorialContrast`); now a dark section like everything else, with a
 * single glass card holding the ask, matching the nav pill and button
 * material rather than breaking the page's own color language with a
 * second light block. `WaitlistForm` is the real, working Formspree-backed
 * form used nowhere else on this site.
 */
export default function Waitlist() {
  return (
    <section id="waitlist" className="relative overflow-hidden border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] hero-glow" />

      <div className="relative mx-auto max-w-3xl px-6 sm:px-8">
        <Reveal>
          <div className={`rounded-3xl px-8 py-14 text-center sm:px-14 sm:py-16 ${GLASS}`}>
            <h2 className="text-balance font-display text-[clamp(1.9rem,4.5vw,3rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
              Be part of the first Noma.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-balance text-base text-base-400">
              We&rsquo;re building Noma with our first users.
            </p>

            <div className="mt-9">
              <WaitlistForm submitLabel="Join the Waitlist" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
