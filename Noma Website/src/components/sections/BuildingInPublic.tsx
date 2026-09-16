import Section from '../layout/Section'
import Reveal from '../ui/Reveal'
import Button from '../ui/Button'

const socials = [
  { label: 'YouTube', href: '#' },
  { label: 'TikTok', href: '#' },
  { label: 'LinkedIn', href: '#' },
]

const buildTopics = ['PCB Design', 'CAD', 'Soldering', 'STM32 Development', 'Software', 'Prototypes', 'Failures', 'Testing']

// Honest, not a finished-product pretense — this is the whole point of a
// "built in public" section (brief section 14): credibility from showing
// exactly how far along things really are, not from claiming more.
const status: { label: string; body: string; done: boolean }[] = [
  { label: 'Software', body: 'Pattern detection, learning, adaptive controls', done: true },
  { label: 'Holo', body: 'Free software interface, no hardware required', done: true },
  { label: 'Workflow learning', body: 'Recognizing repeated sequences across apps', done: true },
  { label: 'Physical prototype', body: 'STM32 hardware — in progress', done: false },
]

export default function BuildingInPublic() {
  return (
    <Section id="about">
      <Reveal>
        <h2 className="max-w-2xl text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
          Built in public.
        </h2>
        <p className="mt-4 max-w-lg text-balance text-base text-base-400">
          We&rsquo;re building Noma from Purdue, one workflow at a time.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {status.map((s) => (
            <div key={s.label} className="rounded-2xl border border-base-700 bg-base-850/60 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-base-100">{s.label}</p>
                <span className={`font-mono text-xs ${s.done ? 'text-accent' : 'text-base-500'}`}>{s.done ? '✓' : 'Building'}</span>
              </div>
              <p className="mt-2 text-sm text-base-400">{s.body}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1px_1fr]">
        <Reveal delay={0.1}>
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
              <a
                key={s.label}
                href={s.href}
                className="text-sm text-base-300 underline decoration-base-600 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {s.label}
              </a>
            ))}
          </div>
        </Reveal>

        <div className="hidden bg-base-800 lg:block" aria-hidden />

        <Reveal delay={0.15}>
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

          <div className="mt-8">
            <Button href="#cta" variant="secondary">
              Join the waitlist
            </Button>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
