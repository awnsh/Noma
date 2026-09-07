import Section from '../layout/Section'
import Reveal from '../ui/Reveal'

// First-draft copy — the nav spec (this session's redesign brief) asked for
// an FAQ link with no actual questions/answers provided. Every answer below
// is grounded only in facts already stated elsewhere on this site (the
// roadmap in Hardware.tsx, the "no spam" line in WaitlistForm.tsx, "built in
// the open" from Founder.tsx) rather than invented — but it's still a first
// draft. Flagged in the site's own README "Before shipping" list alongside
// the other known placeholders; review before shipping.
const faqs = [
  {
    q: 'Is Noma a real product yet?',
    a: 'The software runs today. The physical, modular keyboard is next on the roadmap.',
  },
  {
    q: 'Which apps does Noma already adapt to?',
    a: 'VS Code, Premiere, Photoshop, and more — every control shown on this page is real, not a mockup.',
  },
  {
    q: 'Does Noma replace my current keyboard?',
    a: 'Not yet. Today it runs as software alongside your existing setup; the physical keyboard is the next step.',
  },
  {
    q: 'What does joining the waitlist get me?',
    a: 'Early access and real updates as the hardware comes together — no spam.',
  },
  {
    q: 'When does the physical keyboard ship?',
    a: "There's no fixed date yet — it's being built in the open, one prototype at a time.",
  },
]

/** Plain compact Q&A, not an accordion — every answer is one sentence, so
 *  the extra click-to-expand interaction would add weight without adding
 *  clarity (see the brief's own "never use a large paragraph when an
 *  animation can communicate the idea" rule; the inverse holds here too —
 *  don't add interaction where a plain list already reads instantly). */
export default function FAQ() {
  return (
    <Section id="faq">
      <Reveal>
        <h2 className="max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Questions.
        </h2>
      </Reveal>

      <div className="mx-auto mt-12 grid max-w-3xl gap-x-12 gap-y-8 sm:grid-cols-2">
        {faqs.map((item, i) => (
          <Reveal key={item.q} delay={i * 0.05}>
            <p className="text-sm font-medium text-base-100">{item.q}</p>
            <p className="mt-1.5 text-sm text-base-400">{item.a}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
