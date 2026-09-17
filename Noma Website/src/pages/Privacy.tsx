import Reveal from '../components/ui/Reveal'
import LegalSection from '../components/ui/LegalSection'

// Genuinely scoped to what this site actually does today, verified before
// writing this — checked the codebase for any analytics/tracking/cookie
// usage (there is none) and confirmed the waitlist form's only backend is
// a Formspree endpoint (see `data/config.ts`). This isn't filler text;
// every claim here is accurate to the real, current implementation. It's
// still starter content, not legal advice — worth a real lawyer's review
// before Noma treats it as binding, especially once the hardware and its
// own software start collecting anything beyond a waitlist email.
const LAST_UPDATED = 'September 17, 2026'

export default function Privacy() {
  return (
    <div className="border-t border-base-800 bg-base-950 pb-24 pt-40 sm:pt-48">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">Legal</p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-base-500">Last updated {LAST_UPDATED}</p>
          <p className="mt-6 max-w-lg text-balance text-base leading-relaxed text-base-400">
            Noma is pre-launch: there&rsquo;s no hardware shipping yet and no account system, so there&rsquo;s
            very little of yours to collect. This page explains exactly what this website does gather, and
            what it doesn&rsquo;t.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-14">
          <LegalSection title="What we collect">
            <p>
              The only personal information this site collects is the email address you voluntarily submit
              through the waitlist form. We don&rsquo;t require an account, we don&rsquo;t use cookies, and we
              don&rsquo;t run analytics or advertising trackers of any kind.
            </p>
          </LegalSection>

          <LegalSection title="How we use it">
            <p>
              Your email is used only to send you updates about Noma: progress on the hardware, software,
              and when access opens up. We won&rsquo;t sell it, rent it, or use it to send you anything
              unrelated to Noma.
            </p>
          </LegalSection>

          <LegalSection title="Who processes it">
            <p>
              Waitlist submissions are handled by{' '}
              <a
                href="https://formspree.io/legal/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-accent-bright transition-colors hover:text-accent"
              >
                Formspree
              </a>
              , a third-party form backend. We don&rsquo;t run our own database of waitlist emails outside of
              what Formspree stores on our behalf.
            </p>
          </LegalSection>

          <LegalSection title="How long we keep it">
            <p>
              We keep waitlist emails until either Noma ships and the waitlist is no longer needed, or you ask
              us to delete yours, whichever comes first.
            </p>
          </LegalSection>

          <LegalSection title="Your choices">
            <p>
              Email{' '}
              <a href="mailto:hello@noma.build" className="text-accent-bright transition-colors hover:text-accent">
                hello@noma.build
              </a>{' '}
              at any time to see what we have, correct it, or have it deleted. We&rsquo;ll handle it directly,
              no automated flow to navigate.
            </p>
          </LegalSection>

          <LegalSection title="Children">
            <p>This site isn&rsquo;t directed at children under 13, and we don&rsquo;t knowingly collect information from them.</p>
          </LegalSection>

          <LegalSection title="Changes to this policy">
            <p>
              This policy will change as the product does, particularly once the physical keyboard and its
              companion software exist and have their own data practices to describe. We&rsquo;ll update the
              date at the top of this page whenever we do.
            </p>
          </LegalSection>

          <LegalSection title="Contact">
            <p>
              Questions about this policy or your data: write to{' '}
              <a href="mailto:hello@noma.build" className="text-accent-bright transition-colors hover:text-accent">
                hello@noma.build
              </a>
              .
            </p>
          </LegalSection>
        </Reveal>
      </div>
    </div>
  )
}
