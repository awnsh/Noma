import Reveal from '../ui/Reveal'
import AppPreview from './AppPreview'

/**
 * "One brain. Every workflow." — the real Noma software, not a marketing
 * card describing it. `AppPreview` is a faithful, interactive recreation
 * of the actual desktop app's Dashboard / Virtual Keyboard / Macro Studio
 * screens (see that file's own doc comment), kept in sync with the real
 * app's current v4 visual system by hand across this codebase — reused
 * here wholesale rather than building a second, unrelated dashboard mockup
 * just for this page.
 */
export default function SoftwareShowcase() {
  return (
    <section id="software" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">Noma Software</p>
          <h2 className="mt-3 text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            One brain. Every workflow.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-balance text-base text-base-400">
            The desktop app that watches, learns, and builds your keyboard&rsquo;s interface &mdash; real screens,
            not a mockup.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="mt-14">
          <AppPreview />
        </div>
      </Reveal>
    </section>
  )
}
