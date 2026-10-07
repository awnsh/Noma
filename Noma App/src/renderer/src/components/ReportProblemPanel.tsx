import { useState } from 'react'
import { CARD } from '../lib/surfaces'

/**
 * Beta bug reports, with nothing sent behind the tester's back. "Show
 * details" builds a plain-text summary (versions, Glide and Flow settings,
 * counts, recent success/failure lines; never shortcuts, workflow steps,
 * app or control names, typed text or screenshots), shows all of it, and
 * lets the tester copy it. "Open the report form" opens the website's
 * report form (nomashift.com/feedback) in the browser, empty. Whatever they paste is their choice.
 */
export function ReportProblemPanel() {
  const [report, setReport] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const showReport = async (): Promise<void> => {
    setCopied(false)
    setReport(await window.flow.getDiagnosticsReport())
  }

  const copy = async (): Promise<void> => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className={`mb-8 px-5 py-4 ${CARD}`}>
      <div className="text-xs uppercase tracking-widest text-neutral-500">Report a problem</div>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        You can add a technical summary of this install. Read it first; it&apos;s never sent automatically.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void window.flow.openIssuePage()}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
        >
          Open the report form
        </button>
        <button
          type="button"
          onClick={() => void showReport()}
          className="rounded-md border border-base-600 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-400"
        >
          {report ? 'Refresh details' : 'Show technical details'}
        </button>
      </div>
      {report && (
        <div className="mt-4">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-base-700 bg-base-950 p-3 font-mono text-[11px] leading-relaxed text-neutral-300">
            {report}
          </pre>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => void copy()} className="text-xs text-accent hover:opacity-80">
              Copy
            </button>
            {copied && <span className="text-xs text-neutral-500">Copied. Paste it into the form if you want to.</span>}
          </div>
        </div>
      )}
    </section>
  )
}
