import Section, { Kicker } from '../layout/Section'
import Reveal from '../ui/Reveal'

const socials = [
  { label: 'YouTube', href: '#' },
  { label: 'TikTok', href: '#' },
  { label: 'LinkedIn', href: '#' },
]

const buildTopics = [
  'PCB Design',
  'CAD',
  'Soldering',
  'STM32 Development',
  'Software',
  'Prototypes',
  'Failures',
  'Testing',
]

export default function Founder() {
  return (
    <Section id="founder">
      <Reveal>
        <Kicker index="08" label="Founder" />
        <h2 className="mt-5 max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Built from scratch.
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_1px_1fr]">
        <Reveal delay={0.05}>
          <p className="max-w-md text-balance text-lg leading-relaxed text-base-200">
            Noma is being built by <span className="text-base-50">Ansh Ukani</span>, an electrical engineering
            student at Purdue University.
          </p>
          <p className="mt-4 max-w-md text-balance text-base leading-relaxed text-base-400">
            I&rsquo;ve spent years building electronics, custom PCBs, mechanical keyboards, and software. Noma is
            the next step: building a completely new interface from the ground up.
          </p>

          <div className="mt-8 flex gap-6">
            {socials.map((s) => (
              <a key={s.label} href={s.href} className="text-sm text-base-300 underline decoration-base-600 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent">
                {s.label}
              </a>
            ))}
          </div>
        </Reveal>

        <div className="hidden bg-base-800 lg:block" aria-hidden />

        <Reveal delay={0.1}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Follow the Build</p>
          <p className="mt-4 max-w-md text-balance text-base leading-relaxed text-base-300">
            I&rsquo;m documenting the process of turning Noma from an idea into a physical product &mdash; the wins
            and the failures.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {buildTopics.map((t) => (
              <span key={t} className="rounded-md border border-base-700 px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-base-400">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            <a
              href="#"
              className="inline-flex rounded-lg border border-base-500 px-5 py-2.5 text-sm font-medium text-base-100 transition-colors hover:border-accent hover:text-accent"
            >
              YouTube
            </a>
            <a
              href="#"
              className="inline-flex rounded-lg border border-base-500 px-5 py-2.5 text-sm font-medium text-base-100 transition-colors hover:border-accent hover:text-accent"
            >
              TikTok
            </a>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
