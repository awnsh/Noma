import { useEffect } from 'react'
import { Workspace } from './pages/Workspace'
import { Compare } from './pages/Compare'
import { Customize } from './pages/Customize'
import { WhyNoma } from './pages/WhyNoma'
import { Feedback } from './pages/Feedback'
import { TopNav } from './components/TopNav'
import { FeedbackNudge } from './components/FeedbackNudge'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { useNomaStore } from './store/nomaStore'

/**
 * No landing/marketing gate before the product (brief feedback: "show the
 * hero feature immediately... I don't want it to look like a website
 * showing it off"). The hardware simulation in Workspace *is* the first
 * thing rendered — everything else is one tab away.
 */
export default function App() {
  const view = useNomaStore((s) => s.view)
  const setView = useNomaStore((s) => s.setView)
  const analyticsOpen = useNomaStore((s) => s.analyticsOpen)
  const toggleAnalytics = useNomaStore((s) => s.toggleAnalytics)
  const feedbackNudgeVisible = useNomaStore((s) => s.feedbackNudgeVisible)
  const dismissFeedbackNudge = useNomaStore((s) => s.dismissFeedbackNudge)

  // Validation Mode (brief section 12) is deliberately not in the nav —
  // reachable only by this shortcut, or the quiet dot in the footer below.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        toggleAnalytics()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleAnalytics])

  return (
    <div className="min-h-screen">
      <TopNav view={view} onNavigate={setView} onHome={() => setView('workspace')} />
      {view === 'workspace' && <Workspace />}
      {view === 'compare' && <Compare />}
      {view === 'customize' && <Customize />}
      {view === 'why' && <WhyNoma />}
      {view === 'feedback' && <Feedback />}

      <FeedbackNudge
        visible={feedbackNudgeVisible && view !== 'feedback'}
        onOpen={() => {
          dismissFeedbackNudge()
          setView('feedback')
        }}
        onDismiss={dismissFeedbackNudge}
      />

      <FooterDot onOpenAnalytics={toggleAnalytics} />
      {analyticsOpen && <AnalyticsPanel onClose={toggleAnalytics} />}
    </div>
  )
}

/** The "easily accessible" half of Validation Mode's hidden-ness (brief
 *  section 12) — findable if you know to look, invisible otherwise. */
function FooterDot({ onOpenAnalytics }: { onOpenAnalytics: () => void }) {
  return (
    <div className="flex justify-center py-8">
      <button
        type="button"
        onClick={onOpenAnalytics}
        aria-label="Validation data"
        className="h-1.5 w-1.5 rounded-full bg-base-800 transition-colors hover:bg-base-600"
      />
    </div>
  )
}
