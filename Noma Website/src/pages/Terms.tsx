import Reveal from '../components/ui/Reveal'
import LegalSection from '../components/ui/LegalSection'

// Standard, honest starter terms for a pre-launch waitlist site, scoped
// to what actually exists today (a marketing site and an email waitlist,
// no product sold yet, no accounts). Deliberately doesn't invent a
// specific legal entity name, address, or governing jurisdiction, since
// none of those are known here; a real lawyer should fill those in
// (and review the rest) before this is treated as binding.
const LAST_UPDATED = 'September 17, 2026'

export default function Terms() {
  return (
    <div className="border-t border-base-800 bg-base-950 pb-24 pt-40 sm:pt-48">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-base-500">Legal</p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-base-500">Last updated {LAST_UPDATED}</p>
          <p className="mt-6 max-w-lg text-balance text-base leading-relaxed text-base-400">
            These terms cover this website and the waitlist. Noma the product doesn&rsquo;t exist yet, so
            there&rsquo;s nothing here about warranties, shipping, or support for hardware that hasn&rsquo;t
            been built. Those terms will arrive when the product does.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-14">
          <LegalSection title="Using this site">
            <p>
              By using this website you agree to these terms. If you don&rsquo;t agree, the only ask is that
              you not use the site, which is fine, no hard feelings.
            </p>
          </LegalSection>

          <LegalSection title="The waitlist">
            <p>
              Joining the waitlist reserves you a spot to hear from us first. It isn&rsquo;t a purchase, a
              pre-order, or a guarantee of a specific price, ship date, or that Noma ships at all. We&rsquo;ll
              be honest with you about progress rather than promise dates we can&rsquo;t keep.
            </p>
          </LegalSection>

          <LegalSection title="What belongs to us">
            <p>
              The Noma name, logo, and the content of this site (copy, design, illustrations) belong to Noma.
              You&rsquo;re welcome to link to this site and talk about what we&rsquo;re building; please
              don&rsquo;t copy the site itself or use our marks to imply an affiliation that doesn&rsquo;t
              exist.
            </p>
          </LegalSection>

          <LegalSection title="What you agree not to do">
            <ul className="list-disc space-y-2 pl-5">
              <li>Attempt to disrupt, scrape at scale, or reverse-engineer this site.</li>
              <li>Submit false information to the waitlist form on someone else&rsquo;s behalf without consent.</li>
              <li>Use the site for anything illegal or that infringes someone else&rsquo;s rights.</li>
            </ul>
          </LegalSection>

          <LegalSection title="No warranty">
            <p>
              This site is provided as-is, the usual way for an early, pre-launch site: we try to keep it
              accurate and working, but we&rsquo;re not promising it&rsquo;s error-free or available every
              second.
            </p>
          </LegalSection>

          <LegalSection title="Limitation of liability">
            <p>
              To the extent the law allows, Noma isn&rsquo;t liable for indirect or incidental damages arising
              from your use of this site. Nothing here limits liability where the law doesn&rsquo;t allow it
              to be limited.
            </p>
          </LegalSection>

          <LegalSection title="Changes">
            <p>
              We may update these terms as the site and product evolve. We&rsquo;ll update the date at the top
              whenever we do, and material changes will be reflected here before they take effect.
            </p>
          </LegalSection>

          <LegalSection title="Contact">
            <p>
              Questions about these terms: write to{' '}
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
