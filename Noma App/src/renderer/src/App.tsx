import { useEffect, useRef, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Home } from './pages/Home'
import { Workflows } from './pages/Workflows'
import { Demo } from './pages/Demo'
import { VirtualKeyboard } from './pages/VirtualKeyboard'
import { Glide } from './pages/Glide'
import { MacroStudio } from './pages/MacroStudio'
import { Learning } from './pages/Learning'
import { Activity } from './pages/Activity'
import { UsageStats } from './pages/UsageStats'
import { Profiles } from './pages/Profiles'
import { Settings } from './pages/Settings'
import { Developer } from './pages/Developer'
import { Onboarding } from './pages/Onboarding'
import { WhatsNewModal } from './components/WhatsNewModal'
import { useUiStore } from './stores/uiStore'
import { useOnboardingStore } from './stores/onboardingStore'
// Imported for their side effect: both subscribe to main's pushes at load,
// so Glide and running-action state are current whichever page is open.
import './stores/glideStore'
import './stores/actionRunStore'

const PAGE_EXIT_MS = 120

function App() {
  const activePage = useUiStore((state) => state.activePage)
  // Page shown on screen. Lags activePage by the exit duration so the old page
  // can fade out; a newer navigation simply restarts the timer (latest wins).
  const [shownPage, setShownPage] = useState(activePage)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaving = shownPage !== activePage
  useEffect(() => {
    if (shownPage === activePage) return
    exitTimer.current = setTimeout(() => setShownPage(activePage), PAGE_EXIT_MS)
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current)
    }
  }, [activePage, shownPage])
  const setActivePage = useUiStore((state) => state.setActivePage)
  const onboardingState = useOnboardingStore((state) => state.state)
  const isOnboardingLoading = useOnboardingStore((state) => state.isLoading)
  const loadOnboardingState = useOnboardingStore((state) => state.load)

  useEffect(() => {
    loadOnboardingState()
  }, [loadOnboardingState])

  // Noma Notice's "Review" finishes here: accepting a workflow ends in
  // picking a control slot, which the floating card is deliberately too
  // small to ask for. Workflows (not Home) is where the user lands: Home
  // only ever shows a single "most important" suggestion (`suggestions[0]`),
  // so the one just reviewed could easily not be it and effectively
  // disappear. Workflows' "Suggestions" section lists every pending
  // suggestion, so the reviewed one is guaranteed to actually be there.
  useEffect(() => window.flow.onOpenSuggestionInApp(() => setActivePage('workflows')), [setActivePage])

  // Blank instead of a spinner while the very first IPC round-trip is in
  // flight. Same background as every other state below, so there's no
  // visible flash before we know whether to show onboarding or the app.
  if (isOnboardingLoading || !onboardingState) {
    return <div className="h-screen w-screen bg-base-950" />
  }

  // Onboarding replaces the whole app shell (no sidebar, no normal
  // navigation) until it's completed. Never shown again after that on a
  // normal launch, since `completed` is persisted (see onboardingStore).
  if (!onboardingState.completed) {
    return <Onboarding />
  }

  return (
    <AppShell>
      <div key={shownPage} className={`${leaving ? 'noma-page-out' : 'noma-page-in'} min-h-full`}>
      {shownPage === 'home' && <Home />}
      {shownPage === 'workflows' && <Workflows />}
      {shownPage === 'learning' && <Learning />}
      {shownPage === 'activity' && <Activity />}
      {shownPage === 'settings' && <Settings />}
      {shownPage === 'demo' && <Demo />}
      {shownPage === 'virtual-keyboard' && <VirtualKeyboard />}
      {shownPage === 'holo' && <Glide />}
      {shownPage === 'macros' && <MacroStudio />}
      {shownPage === 'usage-stats' && <UsageStats />}
      {shownPage === 'profiles' && <Profiles />}
      {shownPage === 'developer' && <Developer />}
      </div>
      <WhatsNewModal />
    </AppShell>
  )
}

export default App
