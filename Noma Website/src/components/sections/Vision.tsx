import Reveal from '../ui/Reveal'
import nomaMark from '../../assets/noma-mark.png'

/**
 * The slow moment. Product brief calls this out specifically: everything
 * else on the page stops, huge whitespace, almost no UI. Two short lines
 * with a real pause between them (a `Reveal` delay long enough to read as
 * a beat, not just stagger), then the mark itself — no headline
 * following it, no CTA here. This section's only job is to be remembered,
 * not to convert.
 */
export default function Vision() {
  return (
    <section id="vision" className="relative border-t border-base-800 bg-base-950 py-40 sm:py-56">
      <div className="mx-auto max-w-2xl px-6 text-center sm:px-8">
        <Reveal>
          <p className="text-balance font-display text-[clamp(1.75rem,4.5vw,3rem)] font-medium leading-[1.2] text-base-300">
            Your computer knows what you&rsquo;re doing.
          </p>
        </Reveal>
        <Reveal delay={0.7}>
          <p className="mt-6 text-balance font-display text-[clamp(1.75rem,4.5vw,3rem)] font-semibold leading-[1.2] text-base-50">
            Why shouldn&rsquo;t your keyboard?
          </p>
        </Reveal>
        <Reveal delay={1.5}>
          <img src={nomaMark} alt="Noma" className="mx-auto mt-20 h-10 w-auto opacity-90 sm:h-12" />
        </Reveal>
      </div>
    </section>
  )
}
