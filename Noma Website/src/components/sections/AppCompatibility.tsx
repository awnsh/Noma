import Reveal from '../ui/Reveal'
import AppIcon from '../visuals/AppIcon'
import { appProfiles } from '../../data/appProfiles'

// Two rows, each its own real category rather than one long undifferentiated
// strip: the top row is the four-app cast the rest of the page already
// leans on plus two more everyday tools, the bottom row is the wider
// "and also this" breadth (a terminal, creative and CAD tools, chat apps).
// Splitting it this way, with the rows drifting opposite directions, reads
// as "there's a lot here" at a glance without asking anyone to actually
// read fourteen names in a row.
const ROW_A = ['vscode', 'chrome', 'claude', 'github', 'figma', 'discord']
const ROW_B = ['terminal', 'spotify', 'photoshop', 'premiere', 'notion', 'slack', 'blender', 'solidworks']

/** Rendered twice back to back so the CSS animation's own -50% translate
 *  loops seamlessly (see `--animate-marquee`/`-reverse` in index.css) —
 *  the standard trick for an infinite marquee without any JS measuring the
 *  row's own width. `aria-hidden` on the whole strip: the real list of
 *  supported apps is spoken once via the section's own `sr-only` text
 *  below, not fourteen times as this repeats and drifts. */
function MarqueeRow({ ids, reverse }: { ids: string[]; reverse?: boolean }) {
  const items = [...ids, ...ids]
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <div className={`flex w-max items-center gap-3 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {items.map((id, i) => {
          const profile = appProfiles[id]
          return (
            <div
              key={`${id}-${i}`}
              className="flex shrink-0 items-center gap-2.5 rounded-full border border-base-700 bg-base-900 px-4 py-2.5"
            >
              <AppIcon id={id} color={profile.color} className="h-4 w-4" />
              <span className="text-sm font-medium text-base-300">{profile.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * "Noma works where you work." — the site's single consolidated answer to
 * "which apps does this support," so the smaller app-icon rows sprinkled
 * through the earlier demo sections don't each need to also carry that
 * message. Two infinite marquee rows drifting opposite directions, real
 * brand marks throughout (see `AppIcon.tsx`), no claim that this list is
 * exhaustive — Noma reads whatever application currently has focus, it
 * isn't a fixed integration list, and the closing line under the rows
 * says so.
 */
export default function AppCompatibility() {
  return (
    <section id="compatibility" className="relative overflow-hidden border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <Reveal>
          <h2 className="text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Noma works
            <br />
            <span className="text-base-400">where you work.</span>
          </h2>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div className="mt-14 flex flex-col gap-4">
          <MarqueeRow ids={ROW_A} />
          <MarqueeRow ids={ROW_B} reverse />
        </div>
      </Reveal>

      <p className="sr-only">
        Works with Visual Studio Code, Chrome, Claude, GitHub, Figma, Discord, Terminal, Spotify, Photoshop, Adobe
        Premiere, Notion, Slack, Blender, SolidWorks, and any other application, since Noma reads whatever already
        has focus rather than requiring a per-app integration.
      </p>
    </section>
  )
}
