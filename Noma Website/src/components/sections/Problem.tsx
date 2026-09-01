import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'
import AppOrbit from '../visuals/AppOrbit'
import { appProfiles } from '../../data/appProfiles'

// Eight domains, eight colors, on purpose — code, video, CAD, design, 3D,
// chat, music, photo have nothing in common except that they all live on
// the same four physical keys today. Color carries "every app is
// different" at a glance, faster than reading eight names would.
const environments = [
  appProfiles.vscode,
  appProfiles.figma,
  appProfiles.discord,
  appProfiles.blender,
  appProfiles.solidworks,
  appProfiles.spotify,
  appProfiles.premiere,
  appProfiles.photoshop,
]

export default function Problem() {
  return (
    <Section id="problem">
      <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-8">
        <Reveal>
          <Kicker index="01" label="The Problem" />
          <h2 className="mt-5 text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Every application has different controls.
            <br />
            <span className="text-base-400">Your keyboard doesn&rsquo;t.</span>
          </h2>
          <p className="mt-6 max-w-md text-balance font-display text-xl font-medium text-base-200">
            Why should your interface stay the same when your work changes?
          </p>
        </Reveal>

        <Reveal delay={0.1} y={0}>
          <AppOrbit apps={environments} />
        </Reveal>
      </div>
    </Section>
  )
}
