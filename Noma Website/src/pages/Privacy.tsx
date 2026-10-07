import Reveal from '../components/ui/Reveal'
import LegalSection from '../components/ui/LegalSection'

// Rewritten 2026-10-06 for the downloadable beta. Every claim about the app
// is checked against its code and `Noma App/docs/privacy-and-legal.md`
// (capture filter, click-target rules, Glide, updater, diagnostics), and
// every claim about the site against this repo (no cookies, storage or
// analytics; GitHub for downloads and the version label; Formspree for the
// email form and the /feedback issue form; Cloudflare hosting). Not legal advice: worth a lawyer's
// review before Noma leaves beta.
const LAST_UPDATED = 'October 7, 2026'

const EMAIL = 'hello@nomashift.com'
const LINK = 'text-accent-bright transition-colors hover:text-accent'

export default function Privacy() {
  return (
    <div className="border-t border-base-800 bg-base-950 pb-24 pt-40 sm:pt-48">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <Reveal>
          <p className="text-sm font-medium text-base-400">Legal</p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.1] tracking-[-0.02em] text-base-50">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-base-500">Last updated {LAST_UPDATED}</p>
          <p className="mt-6 max-w-lg text-balance text-base leading-relaxed text-base-400">
            This covers the Noma app (currently in beta), this website, and our email list. The short version:
            what the app learns stays on your computer. We never see it.
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-14">
          <LegalSection title="What the app records">
            <p>
              Noma learns from how you use your computer only while Flow is turned on. Flow is off until you turn
              it on, and you can turn it off at any time. While it&rsquo;s on, it records:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Which app is in front, and when you switch to another one.</li>
              <li>
                Shortcuts that use Ctrl, Alt, or the Windows or Command key, such as Ctrl + S: which keys, in
                which app, and when.
              </li>
            </ul>
            <p>It never records:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>What you type. Single keys and Shift combinations are ignored before anything is saved.</li>
              <li>Your screen, your clipboard, window titles, web addresses, or file names.</li>
            </ul>
          </LegalSection>

          <LegalSection title="On-screen buttons (optional)">
            <p>
              A second setting, also off by default, lets Flow learn from buttons you click. It saves only the
              name of a command button (one to three plain words, like &ldquo;Cut&rdquo;) or a rough position in
              the window. It never records clicks in text fields, documents, lists or links, and it skips
              browsers, chat apps, meeting apps and AI chat apps entirely, because their buttons can contain
              people&rsquo;s names or page content.
            </p>
          </LegalSection>

          <LegalSection title="Glide">
            <p>
              While Glide is on, Noma reads where your fingers are on the trackpad so it can recognise a swipe
              in from the palm rest. Those positions are used in the moment and thrown away; nothing is saved.
              It also notices <em>that</em> a key was pressed (never which one), so a hand coming off the
              keyboard isn&rsquo;t mistaken for a swipe.
            </p>
            <p>
              The one exception is the touch check, which you start yourself: it saves under a minute of finger
              positions to a file on your computer, so Glide can be tuned to your trackpad. You can delete that
              file at any time.
            </p>
          </LegalSection>

          <LegalSection title="Where it's kept">
            <p>
              Everything above is stored only on your computer, in Noma&rsquo;s own data folder. It isn&rsquo;t
              sent to us or to anyone else. The app has no account and no analytics.
            </p>
          </LegalSection>

          <LegalSection title="When the app goes online">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-base-200">Updates.</span> Noma checks GitHub for a newer version at launch
                and every few hours, and downloads it from there. GitHub sees that request the way it sees any
                download.
              </li>
              <li>
                <span className="text-base-200">Reporting a problem.</span> This opens the report form on this
                website in your browser. Nothing is filled in or sent for you. If you choose to include technical details,
                Noma shows you all of them first so you can read them before copying.
              </li>
            </ul>
          </LegalSection>

          <LegalSection title="Deleting your data">
            <p>
              In the app, Settings has <span className="text-base-200">Clear Learning Data</span> (removes what
              Flow has noticed) and <span className="text-base-200">Delete All Data</span> (resets Noma to a
              fresh install). Uninstalling Noma doesn&rsquo;t remove its data folder on its own, so use Delete All
              Data first if you want it gone.
            </p>
          </LegalSection>

          <LegalSection title="Shared and work computers">
            <p>
              Only turn Flow on for a computer that&rsquo;s yours, or where you have permission. If other people
              use it, their app switches and shortcuts would be recorded too. On a work computer, your
              employer&rsquo;s rules apply.
            </p>
          </LegalSection>

          <LegalSection title="This website">
            <p>
              The site uses no cookies, no analytics, and no advertising trackers. It&rsquo;s hosted by
              Cloudflare, which handles basic request information (such as your IP address and browser) to
              deliver pages and protect against abuse. The download buttons and the version number come from
              GitHub, which sees those requests.
            </p>
          </LegalSection>

          <LegalSection title="Our email list and issue reports">
            <p>
              If you sign up for updates, we keep your email address and use it only to tell you about Noma: new
              versions, the device, and when things change. Sign-ups are handled by{' '}
              <a href="https://formspree.io/legal/privacy-policy" target="_blank" rel="noreferrer" className={LINK}>
                Formspree
              </a>
              . We never sell or share your address. We keep it until you ask us to remove it.
            </p>
            <p>
              If you report an issue on our feedback page, we get only what you write and pick there: what happened,
              your computer type and Noma version if you give them, and your email if you leave one so we can reply.
              Nothing else about your browser or computer is attached. Reports are also handled by Formspree. We use
              them only to fix Noma, and a report&rsquo;s email address isn&rsquo;t added to the update list.
            </p>
          </LegalSection>

          <LegalSection title="Your choices">
            <p>
              Email{' '}
              <a href={`mailto:${EMAIL}`} className={LINK}>
                {EMAIL}
              </a>{' '}
              to see, correct, or delete anything we hold about you. Since the app&rsquo;s data never leaves your
              computer, we don&rsquo;t have it; you can delete it yourself as described above.
            </p>
          </LegalSection>

          <LegalSection title="Children">
            <p>Noma isn&rsquo;t meant for children under 13, and we don&rsquo;t knowingly collect information from them.</p>
          </LegalSection>

          <LegalSection title="Changes to this policy">
            <p>
              We&rsquo;ll update this page when the app or website changes what it collects, and change the date
              at the top. If the app ever starts sending anything new off your computer, it will ask you first.
            </p>
          </LegalSection>

          <LegalSection title="Contact">
            <p>
              Questions about privacy: write to{' '}
              <a href={`mailto:${EMAIL}`} className={LINK}>
                {EMAIL}
              </a>
              .
            </p>
          </LegalSection>
        </Reveal>
      </div>
    </div>
  )
}
