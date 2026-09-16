import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import AppIcon from '../visuals/AppIcon'
import { appProfiles } from '../../data/appProfiles'

const rowOne = ['vscode', 'chrome', 'claude', 'github', 'figma', 'discord']
const rowTwo = ['terminal', 'spotify', 'photoshop', 'premiere', 'notion', 'slack', 'blender', 'solidworks']

function Chip({ id }: { id: string }) {
  const profile = appProfiles[id]
  return (
    <div
      className="flex shrink-0 items-center gap-2.5 rounded-2xl border px-5 py-3.5"
      style={{ borderColor: `${profile.color}33`, backgroundColor: `${profile.color}10` }}
    >
      <AppIcon id={id} color={profile.color} className="h-5 w-5 shrink-0" />
      <span className="whitespace-nowrap text-sm font-medium text-base-100">{profile.name}</span>
    </div>
  )
}

/** Two rows, drifting opposite directions, each looped by rendering its
 *  list twice back to back and animating exactly -50% — the same technique
 *  `index.css`'s existing (until now unused) `marquee` keyframe was built
 *  for. Real recognizable applications, each in its own real color — the
 *  point is coverage across entirely different domains, not a curated
 *  "integrations" list implying a partnership that doesn't exist. */
export default function Applications() {
  return (
    <Section id="applications" className="overflow-hidden">
      <Reveal>
        <h2 className="text-balance text-center font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold uppercase leading-[1.1] tracking-tight text-base-50">
          Noma works
          <br />
          <span className="text-base-400">where you work.</span>
        </h2>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-14 flex flex-col gap-4" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="flex w-max gap-4 motion-safe:animate-marquee">
            {[...rowOne, ...rowOne].map((id, i) => (
              <Chip key={`${id}-${i}`} id={id} />
            ))}
          </div>
          <div className="flex w-max gap-4 [animation-direction:reverse] motion-safe:animate-marquee">
            {[...rowTwo, ...rowTwo].map((id, i) => (
              <Chip key={`${id}-${i}`} id={id} />
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
