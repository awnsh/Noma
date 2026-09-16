import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'
import AppPreview from './AppPreview'
import AppIcon from '../visuals/AppIcon'
import { appProfiles } from '../../data/appProfiles'

const chips: { app: string; control: string }[] = [
  { app: 'vscode', control: 'Search' },
  { app: 'claude', control: 'New Chat' },
  { app: 'github', control: 'Commit' },
  { app: 'terminal', control: 'Run' },
]

/**
 * Holo — the free, software-only version of Noma. Deliberately never called
 * a "demo," "trial," or "lite" version anywhere in this copy (per the
 * brief): it's the real product, just without hardware. The interactive
 * `AppPreview` mockup below is Holo's own proof — a visitor can actually
 * click it, not just read about it — so this section carries almost no
 * explanatory copy of its own.
 *
 * Closes with the Holo → Device bridge (brief section 8) as its own beat
 * rather than a separate section: "no hardware" flowing straight into "and
 * when you want something real" reads as one continuous thought, and a
 * whole extra section for a single transitional sentence would be the kind
 * of padding this site is built to avoid.
 */
export default function Holo() {
  return (
    <Section id="holo">
      <Reveal>
        <h2 className="text-balance text-center font-display text-[clamp(2rem,5.5vw,4rem)] font-semibold uppercase leading-[1.05] tracking-tight text-base-50">
          No hardware.
          <br />
          <span className="text-base-400">No problem.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-balance text-center text-base text-base-300">
          Meet Holo &mdash; Noma&rsquo;s software interface for your laptop.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {chips.map((c) => {
            const profile = appProfiles[c.app]
            return (
              <div
                key={c.app}
                className="flex items-center gap-2 rounded-full border px-3.5 py-1.5"
                style={{ borderColor: `${profile.color}40`, backgroundColor: `${profile.color}14` }}
              >
                <AppIcon id={c.app} color={profile.color} className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-base-200">
                  {profile.shortName} &middot; {c.control}
                </span>
              </div>
            )
          })}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-14">
          <AppPreview />
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mx-auto mt-10 flex flex-col items-center gap-6 text-center">
          <p className="text-balance text-lg text-base-100">
            Use Noma for free. <span className="text-base-400">No keyboard required.</span>
          </p>
          <Button href="#cta" variant="primary">
            Try Holo Free
          </Button>
        </div>
      </Reveal>

      {/* Holo → Device bridge — one closing beat, not a second section. */}
      <Reveal delay={0.2}>
        <div className="mx-auto mt-24 max-w-xl border-t border-base-800 pt-16 text-center">
          <h3 className="text-balance font-display text-2xl font-semibold leading-[1.15] text-base-50 sm:text-3xl">
            And when you want something real.
          </h3>
          <p className="mt-4 text-balance text-base text-base-300">
            Everything Noma learns on your laptop can become physical.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4 font-mono text-xs uppercase tracking-[0.15em]">
            <span className="rounded-full border border-base-600 px-4 py-2 text-base-200">Holo</span>
            <span aria-hidden className="text-base-500">
              &rarr;
            </span>
            <span className="rounded-full border border-accent/40 bg-accent/[0.06] px-4 py-2 text-accent-bright">Noma Device</span>
          </div>

          <p className="mt-6 text-sm text-base-400">Same intelligence. Same workflows. Different interface.</p>
        </div>
      </Reveal>
    </Section>
  )
}
