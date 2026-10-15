import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import Reveal from '../components/ui/Reveal'
import SiteLink from '../components/layout/SiteLink'
import { FEEDBACK_ENDPOINT } from '../data/config'
import { GLASS, GLASS_ACCENT, GLASS_TOGGLE, GLASS_TOGGLE_ACTIVE } from '../lib/glass'
import { useLatestDownloads } from '../lib/downloads'

// Issue reports go to the same Formspree account as the waitlist (see
// FEEDBACK_ENDPOINT), so a submitted report really reaches someone. Only
// what the visitor types and picks is sent: no browser details, no
// screenshots, nothing gathered behind their back. Privacy.tsx says so.

const KINDS = ['Something broke', 'Idea', 'Weekly check-in', 'Something else'] as const
const PLATFORMS = ['Windows', 'Mac (Apple silicon)', 'Mac (Intel)', 'Not using the app'] as const

type Status = 'idle' | 'loading' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELD =
  'w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-base-50 placeholder:text-base-500 outline-none transition-colors focus:border-accent'
const LABEL = 'block text-sm font-medium text-base-300'

export default function Feedback() {
  const { version: latestVersion } = useLatestDownloads()
  const [kind, setKind] = useState<(typeof KINDS)[number]>('Something broke')
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number] | null>(null)
  const [version, setVersion] = useState('')
  const [details, setDetails] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const fail = (text: string) => {
    setStatus('error')
    setMessage(text)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // honeypot: real visitors never fill this in
    const honeypot = (e.currentTarget.elements.namedItem('company') as HTMLInputElement | null)?.value
    if (honeypot) return

    if (details.trim().length < 10) return fail('Tell us a little more about what happened.')
    if (email && !EMAIL_RE.test(email)) return fail('That email address doesn’t look right.')

    setStatus('loading')
    const about = [platform, version.trim() && `v${version.trim().replace(/^v/i, '')}`].filter(Boolean).join(' ')
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: `${kind === 'Weekly check-in' ? 'Noma weekly check-in' : `Noma issue report: ${kind}`}${about ? ` (${about})` : ''}`,
          type: kind,
          platform: platform ?? 'Not given',
          version: version.trim() || 'Not given',
          details: details.trim(),
          // Formspree uses `email` as the reply-to address.
          ...(email ? { email } : {}),
        }),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => null)
        fail(data?.errors?.[0]?.message ?? 'Something went wrong. Try again in a moment.')
      }
    } catch {
      fail('Couldn’t send it. Check your connection and try again.')
    }
  }

  return (
    <div className="border-t border-base-800 bg-base-950 pb-24 pt-40 sm:pt-48">
      <div className="mx-auto max-w-xl px-6 sm:px-8">
        <Reveal>
          <p className="text-sm font-medium text-base-400">Feedback</p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.1] tracking-[-0.02em] text-base-50">
            Report an issue.
          </h1>
          <p className="mt-4 max-w-md text-balance text-base text-base-400">
            Noma is in beta, so things will break. Tell me what happened and I&rsquo;ll fix it. I read
            every report myself.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div className={`mt-12 rounded-3xl p-6 sm:p-8 ${GLASS}`}>
            {status === 'success' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="py-6 text-center"
                role="status"
              >
                <span className="mx-auto block h-2 w-2 rounded-full bg-accent" />
                <p className="mt-4 font-display text-xl font-semibold text-base-50">Thanks, it&rsquo;s sent.</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-base-400">
                  {email
                    ? 'We’ll reply to your email if we need more detail, or once it’s fixed.'
                    : 'You didn’t leave an email, so we won’t be able to reply, but we’ll still look into it.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDetails('')
                    setStatus('idle')
                  }}
                  className="mt-6 text-sm text-accent-bright transition-colors hover:text-accent"
                >
                  Report something else
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
                <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

                <fieldset>
                  <legend className={LABEL}>What is it?</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {KINDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={kind === k}
                        onClick={() => setKind(k)}
                        className={`rounded-full px-4 py-2 text-sm ${kind === k ? GLASS_TOGGLE_ACTIVE : GLASS_TOGGLE}`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className={LABEL}>
                    Your computer <span className="normal-case tracking-normal text-base-500">(optional)</span>
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={platform === p}
                        onClick={() => setPlatform(platform === p ? null : p)}
                        className={`rounded-full px-4 py-2 text-sm ${platform === p ? GLASS_TOGGLE_ACTIVE : GLASS_TOGGLE}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {platform !== 'Not using the app' && (
                  <div>
                    <label htmlFor="feedback-version" className={LABEL}>
                      Noma version <span className="normal-case tracking-normal text-base-500">(optional)</span>
                    </label>
                    <input
                      id="feedback-version"
                      type="text"
                      inputMode="decimal"
                      placeholder={latestVersion ? `e.g. ${latestVersion}` : 'e.g. 0.1.9'}
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className={`mt-3 ${FIELD} sm:max-w-[12rem]`}
                    />
                    <p className="mt-2 text-xs text-base-500">It&rsquo;s at the top of Noma&rsquo;s tray menu.</p>
                  </div>
                )}

                <div>
                  <label htmlFor="feedback-details" className={LABEL}>
                    {kind === 'Weekly check-in' ? 'How did this week go?' : 'What happened?'}
                  </label>
                  <textarea
                    id="feedback-details"
                    required
                    rows={6}
                    placeholder={
                      kind === 'Idea'
                        ? 'What would you like Noma to do?'
                        : kind === 'Weekly check-in'
                          ? 'Paste the details from Settings > Report a problem, then tell us what helped and what got in the way this week.'
                          : 'What were you doing, what did you expect, and what happened instead?'
                    }
                    value={details}
                    onChange={(e) => {
                      setDetails(e.target.value)
                      if (status === 'error') setStatus('idle')
                    }}
                    className={`mt-3 resize-y ${FIELD} ${status === 'error' && details.trim().length < 10 ? 'border-error/60' : ''}`}
                  />
                </div>

                <div>
                  <label htmlFor="feedback-email" className={LABEL}>
                    Your email <span className="normal-case tracking-normal text-base-500">(optional)</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (status === 'error') setStatus('idle')
                    }}
                    className={`mt-3 ${FIELD}`}
                  />
                  <p className="mt-2 text-xs text-base-500">Only so we can reply. It doesn&rsquo;t add you to any list.</p>
                </div>

                {status === 'error' && (
                  <p role="alert" className="flex items-center gap-2 text-xs text-error">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-error" />
                    {message}
                  </p>
                )}

                <div className="flex flex-col-reverse items-start gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-base-500">
                    We only get what you write here.{' '}
                    <SiteLink href="/privacy" className="text-accent-bright transition-colors hover:text-accent">
                      Privacy
                    </SiteLink>
                  </p>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium disabled:opacity-60 ${GLASS_ACCENT}`}
                  >
                    {status === 'loading' && <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-base-50" />}
                    {status === 'loading' ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mt-10 text-center text-sm text-base-500">
            Rather email? Write to{' '}
            <a href="mailto:hello@nomashift.com" className="text-accent-bright transition-colors hover:text-accent">
              hello@nomashift.com
            </a>
            .
          </p>
        </Reveal>
      </div>
    </div>
  )
}
