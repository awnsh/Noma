import KeyOutcomes from './KeyOutcomes'
import Reveal from '../ui/Reveal'

/**
 * The closing section (2026-11-12, second version): what all of it adds up
 * to. The payoff, shown on the renders (KeyOutcomes: a missed key caught
 * and a brushed key ignored), then the product in four lines and the
 * one-line teaser. Replaced a numbered beauty shot of the whole board.
 */

const POINTS = [
  { title: 'Every key, measured', body: 'A magnet and a sensor under each key read the whole press.' },
  { title: 'Tuned to how you type', body: 'Each key’s actuation point moves to where you actually press it.' },
  { title: 'Just a keyboard', body: 'Plug it in and type on any computer. No app needed.' },
  { title: 'Yours, and private', body: 'It learns on the keyboard. No account, no subscription.' },
]

export default function Overview() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="label-xs text-accent">The result</p>
          <h2 className="font-wide mx-auto mt-4 max-w-[16ch] text-balance text-[clamp(1.9rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-ink">
            Fewer missed keys. Fewer accidental ones.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-pretty text-[clamp(1rem,1.3vw,1.15rem)] leading-relaxed text-muted">
            The same press can be right for one key and wrong for another. Tuned key by key, your keyboard stops
            guessing.
          </p>
        </Reveal>

        <Reveal className="mt-10 sm:mt-20">
          <KeyOutcomes />
        </Reveal>

        <Reveal className="mt-14 border-t border-line pt-8 sm:mt-28 sm:pt-10">
          <ul className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
            {POINTS.map((p) => (
              <li key={p.title}>
                <p className="text-[15px] font-semibold text-ink">{p.title}</p>
                <p className="mt-1 text-pretty text-[14px] leading-relaxed text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:mt-20">
          <span className="label-xs text-accent">Coming next</span>
          <span className="text-[clamp(1.1rem,2vw,1.4rem)] font-medium text-ink">It’s learning to fix your mistakes.</span>
        </Reveal>
      </div>
    </section>
  )
}
