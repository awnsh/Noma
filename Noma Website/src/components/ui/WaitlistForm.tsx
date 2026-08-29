import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WAITLIST_ENDPOINT } from '../../data/config'

type Status = 'idle' | 'loading' | 'success' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // honeypot — real visitors never fill this in
    const honeypot = (e.currentTarget.elements.namedItem('company') as HTMLInputElement | null)?.value
    if (honeypot) return

    if (!EMAIL_RE.test(email)) {
      setStatus('error')
      setMessage('Enter a valid email address.')
      return
    }

    if (!WAITLIST_ENDPOINT) {
      setStatus('error')
      setMessage('Waitlist isn’t connected yet — check back soon.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, _subject: 'New Noma waitlist signup' }),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => null)
        setStatus('error')
        setMessage(data?.errors?.[0]?.message ?? 'Something went wrong — try again in a moment.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong — try again in a moment.')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.06] px-6 py-3.5 text-sm text-base-100"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        You&rsquo;re on the list. Flow will let you know when there&rsquo;s something to try.
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row"
        noValidate
      >
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          className={`w-full rounded-lg border bg-base-900 px-4 py-3 text-sm text-base-50 placeholder:text-base-500 outline-none transition-colors focus:border-accent ${
            status === 'error' ? 'border-error/60' : 'border-base-600'
          }`}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-base-950 transition-colors hover:bg-accent-bright disabled:opacity-60"
        >
          {status === 'loading' && <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-base-950" />}
          {status === 'loading' ? 'Joining…' : 'Join the Waitlist'}
        </button>
      </form>

      <AnimatePresence>
        {status === 'error' && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2.5 flex items-center gap-2 text-left text-xs text-error"
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-error" />
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-base-500">
        No spam &mdash; just real updates as the hardware comes together.
      </p>
    </div>
  )
}
