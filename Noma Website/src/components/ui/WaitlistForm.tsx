import { useId, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { WAITLIST_ENDPOINT } from '../../data/config'
import { attributionFields } from '../../lib/attribution'
import { trackEvent } from '../../lib/events'

type Status = 'idle' | 'loading' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Email signup for the keyboard waitlist (Formspree, see data/config.ts).
 * Left-aligned by default; pass `center` where the form sits in a centred
 * block.
 */
export default function WaitlistForm({
  submitLabel = 'Join the waitlist',
  center = false,
}: {
  submitLabel?: string
  center?: boolean
}) {
  const id = useId()
  const { pathname } = useLocation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // honeypot: real visitors never fill this in
    const honeypot = (e.currentTarget.elements.namedItem('company') as HTMLInputElement | null)?.value
    if (honeypot) return

    if (!EMAIL_RE.test(email)) {
      setStatus('error')
      setMessage('That email doesn’t look right.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          interest: 'keyboard',
          _subject: 'New Noma keyboard waitlist signup',
          ...attributionFields(pathname),
        }),
      })
      if (res.ok) {
        setStatus('success')
        trackEvent('signup', pathname, 'keyboard')
      } else {
        const data = await res.json().catch(() => null)
        setStatus('error')
        setMessage(data?.errors?.[0]?.message ?? 'Something went wrong. Try again in a moment.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again in a moment.')
    }
  }

  const align = center ? 'mx-auto text-center' : ''

  if (status === 'success') {
    return (
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        role="status"
        className={`flex max-w-md items-center gap-3 rounded-full border border-line bg-raised px-5 py-3.5 text-[15px] text-ink ${center ? 'mx-auto justify-center' : ''}`}
      >
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px] bg-accent" />
        You’re on the list. I’ll write when there’s something to type on.
      </motion.p>
    )
  }

  return (
    <div className={`w-full max-w-md ${align}`}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row">
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          value={email}
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? `${id}-error` : undefined}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          className={`h-12 w-full min-w-0 rounded-full border bg-raised px-5 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-ink ${
            status === 'error' ? 'border-error' : 'border-line'
          }`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="h-12 shrink-0 rounded-full bg-ink px-6 text-[15px] font-semibold text-paper transition-[transform,opacity] duration-150 hover:opacity-90 active:translate-y-px disabled:opacity-60"
        >
          {status === 'loading' ? 'Joining…' : submitLabel}
        </button>
      </form>

      <AnimatePresence>
        {status === 'error' && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-left text-sm text-error"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-3 text-sm text-faint">Occasional build updates. No spam, unsubscribe anytime.</p>
    </div>
  )
}
