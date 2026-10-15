import Section from '../layout/Section'
import SectionIntro from '../ui/SectionIntro'
import Reveal from '../ui/Reveal'
import SiteLink from '../layout/SiteLink'

/**
 * What Noma sees, and what it doesn't (2026-10-07). Replaced the homepage's
 * hardware teaser (the device still has its own page, /device): for an app
 * that watches how you work, saying exactly what it records does more for
 * trust than a product that doesn't exist yet. Every line here is a claim
 * the privacy policy (pages/Privacy.tsx) makes in full; keep them in step.
 */
const RECORDS = [
  'Which app is in front, and when you switch',
  'Shortcuts like Ctrl + S: which keys, in which app, in what order',
  'That you highlighted something, and a Delete right after it, but never what',
  'In a browser, which tab, as a scrambled code instead of its title',
  'Command buttons you click, like Export, if you turn that on',
]

const NEVER = [
  'What you type',
  'Your screen or your clipboard',
  'Page titles, web addresses or file names',
  'Buttons in chat, meeting or AI apps',
]

const FACTS = [
  { title: 'Off until you turn it on', body: 'Flow starts learning only when you switch it on, and stops when you switch it off.' },
  { title: 'Stays on your computer', body: 'Nothing Noma learns is sent anywhere. There is no account and no analytics.' },
  { title: 'Yours to delete', body: 'Clear what Noma has learned, or reset it completely, from Settings.' },
]

function List({ heading, items, mark }: { heading: string; items: string[]; mark: '+' | '-' }) {
  return (
    <div>
      <p className="text-sm text-base-400">{heading}</p>
      <ul className="mt-3 border-t border-base-800">
        {items.map((item) => (
          <li key={item} className="flex items-baseline gap-3 border-b border-base-800 py-3.5">
            <span
              aria-hidden
              className={`w-3 shrink-0 font-mono text-sm ${mark === '+' ? 'text-accent-bright' : 'text-base-500'}`}
            >
              {mark === '+' ? '+' : '×'}
            </span>
            <span className={`text-base ${mark === '+' ? 'text-base-100' : 'text-base-300'}`}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Privacy() {
  return (
    <Section id="privacy">
      <SectionIntro
        title="What Noma sees, and what it doesn’t."
        line="Noma learns the shape of how you work, not the content. Here is exactly what it records."
      />

      <Reveal delay={0.06}>
        <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
          <List heading="Noma records" items={RECORDS} mark="+" />
          <List heading="Noma never records" items={NEVER} mark="-" />
        </div>
      </Reveal>

      <div className="mt-14 grid gap-8 sm:grid-cols-3">
        {FACTS.map((fact, index) => (
          <Reveal key={fact.title} delay={index * 0.06}>
            <h3 className="font-display text-base font-semibold tracking-tight text-base-50">{fact.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-base-400">{fact.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-12 text-sm text-base-400">
          The full details are in the{' '}
          <SiteLink href="/privacy" className="text-accent-bright transition-colors hover:text-accent">
            privacy policy
          </SiteLink>
          .
        </p>
      </Reveal>
    </Section>
  )
}
