import Reveal from '../ui/Reveal'

/**
 * "Why it tunes itself" (2026-11-13): answers what self-adjusting
 * actuation is actually for, after the Overview has shown the two
 * outcomes. Three reasons a learned setting beats a manual one, who it
 * helps most, and the honest note that the share of mistakes it can fix
 * is being measured in public before any number gets claimed.
 */

const REASONS = [
  {
    n: '01',
    title: 'No numbers to guess',
    body: 'Magnetic keyboards already let you set every key by hand. Almost nobody does, because there’s no way to know the right depth for your pinky. Noma works it out from how you type.',
  },
  {
    n: '02',
    title: 'It keeps up with you',
    body: 'You type differently when you’re tired, at a new desk, or on new keycaps. A setting you picked once goes stale. Noma keeps learning, so the tuning follows you.',
  },
  {
    n: '03',
    title: 'Weak fingers, covered',
    body: 'A light pinky press on A or P still counts, and every other key stays as calm as you need it. One fixed point can’t do both.',
  },
]

const FOR = [
  { title: 'Fast typists', body: 'Fewer stray letters, fewer trips to Backspace.' },
  { title: 'Laptop switchers', body: 'Light, shallow presses still land.' },
  { title: 'Unsteady hands', body: 'Accidental brushes get tuned out, key by key.' },
  { title: 'Gamers', body: 'Typing and games each get their own tuning.' },
]

export default function WhyItTunes() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="label-xs text-accent">Why it tunes itself</p>
          <h2 className="font-wide mx-auto mt-4 max-w-[18ch] text-balance text-[clamp(1.9rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-ink">
            The right setting is different for every key.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-pretty text-[clamp(1rem,1.3vw,1.15rem)] leading-relaxed text-muted">
            And for every person. So instead of asking you to set it, Noma learns it.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-8 sm:mt-20 md:grid-cols-3 md:gap-10">
          {REASONS.map((r, i) => (
            <Reveal key={r.n} delay={i * 0.06} className="border-t border-line pt-6">
              <p className="tnum label-xs text-accent">{r.n}</p>
              <h3 className="font-wide mt-3 text-[18px] font-semibold tracking-[-0.02em] text-ink sm:text-[20px]">
                {r.title}
              </h3>
              <p className="mt-2 text-pretty text-[14px] leading-relaxed text-muted sm:text-[15px]">{r.body}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 border-t border-line pt-8 sm:mt-28 sm:pt-10">
          <p className="label-xs text-faint">Made for</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
            {FOR.map((p) => (
              <li key={p.title}>
                <p className="text-[15px] font-semibold text-ink">{p.title}</p>
                <p className="mt-1 text-pretty text-[14px] leading-relaxed text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-2xl text-center sm:mt-20">
          <p className="text-pretty text-[clamp(1.05rem,1.6vw,1.25rem)] font-medium leading-snug text-ink">
            How many mistakes does it actually fix? We’re measuring it first.
          </p>
          <p className="mx-auto mt-3 max-w-[48ch] text-pretty text-[15px] leading-relaxed text-muted">
            Before claiming a number, Noma is logging real everyday typing to count how many mistakes come from missed
            and stray presses. The result gets shared, whatever it is.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
