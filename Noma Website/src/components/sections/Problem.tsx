import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import AppOrbit from '../visuals/AppOrbit'
import WorkflowChain, { type ChainStep } from '../visuals/WorkflowChain'
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

// Three real, recognizable chains — the concrete answer to "too many
// workflows," made of actual application icons and plain action words
// rather than a paragraph describing the problem in the abstract.
const chains: ChainStep[][] = [
  [{ label: 'Screenshot' }, { app: 'claude' }, { label: 'Paste' }, { label: 'Enter' }],
  [{ label: 'Copy' }, { label: 'Switch app' }, { label: 'Paste' }, { app: 'notion' }],
  [{ app: 'github' }, { label: 'Commit' }, { label: 'Push' }, { label: 'Deploy' }],
]

export default function Problem() {
  return (
    <Section id="problem">
      <Reveal>
        <h2 className="text-balance font-display text-[clamp(2rem,5.5vw,4rem)] font-semibold uppercase leading-[1.05] tracking-tight text-base-50">
          You already have
          <br />
          <span className="text-base-400">too many workflows.</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid items-center gap-16 lg:grid-cols-2 lg:gap-8">
        <div>
          <Reveal delay={0.05}>
            <p className="max-w-md text-balance font-display text-xl font-medium text-base-200">
              You repeat the same handful of steps, in the same apps, dozens of times a day. You just don&rsquo;t
              call it a workflow.
            </p>
          </Reveal>

          <div className="mt-8 flex flex-col gap-3">
            {chains.map((chain, i) => (
              <Reveal key={i} delay={0.1 + i * 0.06}>
                <WorkflowChain steps={chain} />
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1} y={0}>
          <AppOrbit apps={environments} />
        </Reveal>
      </div>
    </Section>
  )
}
