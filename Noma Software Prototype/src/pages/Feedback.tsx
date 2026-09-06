import { useState } from 'react'
import { GLASS_CARD } from '../lib/surfaces'
import { useNomaStore } from '../store/nomaStore'

const replaceOptions = ['Absolutely', 'Maybe', 'Probably not', 'No']

/** Brief section 13 — the actual point of this whole prototype. */
export function Feedback() {
  const surveySubmitted = useNomaStore((s) => s.surveySubmitted)
  const submitSurveyResponse = useNomaStore((s) => s.submitSurveyResponse)

  const [replace, setReplace] = useState<string | null>(null)
  const [worth, setWorth] = useState('')
  const [adaptTo, setAdaptTo] = useState('')
  const [missing, setMissing] = useState('')
  const [justSubmitted, setJustSubmitted] = useState(false)

  const handleSubmit = (): void => {
    if (!replace) return
    submitSurveyResponse({ replace, worth, adaptTo, missing })
    setJustSubmitted(true)
  }

  if (surveySubmitted) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-base-50 sm:text-3xl">
          {justSubmitted ? 'Thank you — your answers are in.' : "You've already shared feedback."}
        </h1>
        <p className="mt-3 text-sm text-base-400">This is exactly the kind of signal this prototype exists to collect.</p>
        <button
          type="button"
          onClick={() => {
            useNomaStore.setState({ surveySubmitted: false })
            setJustSubmitted(false)
            setReplace(null)
            setWorth('')
            setAdaptTo('')
            setMissing('')
          }}
          className="mt-6 text-sm text-base-500 hover:text-base-300"
        >
          Submit another response
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-lg font-semibold text-base-50 sm:text-xl">One last thing.</h1>
      <p className="mt-1 text-sm text-base-500">
        This prototype exists to answer one question: do people actually want this?
      </p>

      <div className={`mt-6 p-5 ${GLASS_CARD}`}>
        <label className="text-sm text-base-200">Would you replace your current keyboard with Noma?</label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {replaceOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReplace(option)}
              className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                replace === option ? 'border-accent-dim bg-accent/10 text-accent' : 'border-white/10 text-base-300 hover:border-white/20'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-4 p-5 ${GLASS_CARD}`}>
        <label htmlFor="worth" className="text-sm text-base-200">What would make Noma worth $150+ to you?</label>
        <textarea
          id="worth"
          value={worth}
          onChange={(e) => setWorth(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-white/10 bg-base-950 p-3 text-sm text-base-100 placeholder:text-base-600"
          placeholder="Optional, but genuinely useful to us."
        />
      </div>

      <div className={`mt-4 p-5 ${GLASS_CARD}`}>
        <label htmlFor="adaptTo" className="text-sm text-base-200">What would you want Noma to adapt to?</label>
        <textarea
          id="adaptTo"
          value={adaptTo}
          onChange={(e) => setAdaptTo(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-white/10 bg-base-950 p-3 text-sm text-base-100 placeholder:text-base-600"
          placeholder="An app, a workflow, a habit — anything."
        />
      </div>

      <div className={`mt-4 p-5 ${GLASS_CARD}`}>
        <label htmlFor="missing" className="text-sm text-base-200">What's the biggest thing missing?</label>
        <textarea
          id="missing"
          value={missing}
          onChange={(e) => setMissing(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-white/10 bg-base-950 p-3 text-sm text-base-100 placeholder:text-base-600"
          placeholder="Be blunt — that's the point."
        />
      </div>

      <button
        type="button"
        disabled={!replace}
        onClick={handleSubmit}
        className="mt-6 w-full rounded-full bg-accent py-3 text-sm font-medium text-base-950 transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        Submit feedback
      </button>
    </div>
  )
}
