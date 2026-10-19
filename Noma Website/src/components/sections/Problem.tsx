import Section from '../layout/Section'
import SectionIntro from '../ui/SectionIntro'
import Reveal from '../ui/Reveal'

/**
 * The problem, said plainly: the same small actions, over and over, in the
 * same apps. Typography only. No counts (2026-10-07): made-up "41x" stats
 * read as invented, even labelled as an example.
 */
const REPEATS = [
  { what: 'Reopened the tab you just closed', detail: 'Ctrl + Shift + T' },
  { what: 'Switched to Spotify to skip a song, then back', detail: 'Spotify' },
  { what: 'Copied something from a page into your notes', detail: 'Chrome, Notion' },
  { what: 'Screenshot, paste it to a friend, save it', detail: 'Three apps' },
]

export default function Problem() {
  return (
    <Section id="problem" bare>
      <SectionIntro title="You shouldn’t have to work" second="around your computer." />

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
        <Reveal delay={0.06}>
          <p className="max-w-md text-base leading-relaxed text-base-300 sm:text-lg">
            Every app has its own shortcuts, its own buttons, its own steps. You learn them, then repeat them all
            day.
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-base-50 sm:text-lg">Noma adapts the interface instead.</p>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-sm text-base-400">Things you probably did today, more than once</p>
          </div>
          <ul className="border-t border-base-800">
            {REPEATS.map((row) => (
              <li key={row.what} className="flex items-baseline gap-4 border-b border-base-800 py-4">
                <span className="text-base text-base-100 sm:text-lg">{row.what}</span>
                <span className="ml-auto hidden shrink-0 text-sm text-base-500 sm:inline">{row.detail}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  )
}
