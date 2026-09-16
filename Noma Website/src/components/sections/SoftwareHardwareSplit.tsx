import Section from '../layout/Section'
import Reveal from '../ui/Reveal'

const software = ['Learns', 'Analyzes', 'Adapts']
const hardware = ['Displays', 'Controls', 'Executes']

/**
 * The one section on the page that says the quiet part out loud: the
 * hardware isn't the product, the intelligence is — the device is just how
 * you interact with it. A split screen, not a paragraph making that
 * argument. Software gets flow violet (Noma noticing/deciding something);
 * Device gets gold (real, physical contact) — the same two semantic colors
 * everywhere else on the site, reused meaningfully rather than introduced
 * just for this section.
 */
export default function SoftwareHardwareSplit() {
  return (
    <Section id="split" className="overflow-hidden">
      <div className="relative grid grid-cols-1 gap-16 sm:grid-cols-[1fr_auto_1fr] sm:gap-10">
        <Reveal className="flex flex-col items-center text-center sm:items-end sm:text-right">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-flow">Noma Software</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:items-end">
            {software.map((word) => (
              <p key={word} className="font-display text-2xl font-semibold text-flow-bright sm:text-3xl">
                {word}
              </p>
            ))}
          </div>
        </Reveal>

        <div className="relative flex items-center justify-center">
          <div aria-hidden className="hidden h-full w-px bg-base-700 sm:block" />
          <span className="absolute inset-0 m-auto h-fit w-fit rounded-full border border-base-700 bg-base-950 px-5 py-2 font-display text-sm font-semibold uppercase tracking-[0.15em] text-base-50 sm:px-6 sm:py-2.5">
            Noma
          </span>
        </div>

        <Reveal delay={0.05} className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Noma Device</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:items-start">
            {hardware.map((word) => (
              <p key={word} className="font-display text-2xl font-semibold text-gold-bright sm:text-3xl">
                {word}
              </p>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
