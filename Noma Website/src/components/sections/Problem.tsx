import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import ControlChip from '../ui/ControlChip'
import { appProfiles } from '../../data/appProfiles'

const environments = [appProfiles.vscode, appProfiles.premiere, appProfiles.solidworks]

export default function Problem() {
  return (
    <Section id="problem">
      <Reveal>
        <Kicker index="01" label="The Problem" />
        <h2 className="mt-5 max-w-3xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Every application has different controls.
          <br />
          <span className="text-base-400">Your keyboard doesn&rsquo;t.</span>
        </h2>
      </Reveal>

      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {environments.map((env, i) => (
          <Reveal key={env.id} delay={i * 0.08}>
            <div className="h-full rounded-2xl border border-base-700 bg-base-850/60 p-6">
              <div className="flex items-center gap-2">
                {env.color && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: env.color }} />}
                <p className="font-display text-base font-medium text-base-100">{env.name}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {env.controls.map((c) => (
                  <ControlChip key={c} size="sm" muted>
                    {c}
                  </ControlChip>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15}>
        <p className="mt-16 text-balance font-display text-xl font-medium text-base-200 sm:text-2xl">
          Why should your interface stay the same when your work changes?
        </p>
      </Reveal>
    </Section>
  )
}
