import { useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Demo } from './pages/Demo'
import { VirtualKeyboard } from './pages/VirtualKeyboard'
import { MacroStudio } from './pages/MacroStudio'
import { LearningCenter } from './pages/LearningCenter'
import { UsageStats } from './pages/UsageStats'
import { Profiles } from './pages/Profiles'
import { Settings } from './pages/Settings'
import { Developer } from './pages/Developer'
import { Onboarding } from './pages/Onboarding'
import { useUiStore } from './stores/uiStore'
import { useOnboardingStore } from './stores/onboardingStore'

function App() {
  const activePage = useUiStore((state) => state.activePage)
  const onboardingState = useOnboardingStore((state) => state.state)
  const isOnboardingLoading = useOnboardingStore((state) => state.isLoading)
  const loadOnboardingState = useOnboardingStore((state) => state.load)

  useEffect(() => {
    loadOnboardingState()
  }, [loadOnboardingState])

  // Blank instead of a spinner while the very first IPC round-trip is in
  // flight — same background as every other state below, so there's no
  // visible flash before we know whether to show onboarding or the app.
  if (isOnboardingLoading || !onboardingState) {
    return <div className="h-screen w-screen bg-base-950" />
  }

  // Onboarding replaces the whole app shell (no sidebar, no normal
  // navigation) until it's completed — never shown again after that on a
  // normal launch, since `completed` is persisted (see onboardingStore).
  if (!onboardingState.completed) {
    return <Onboarding />
  }

  return (
    <AppShell>
      {activePage === 'demo' && <Demo />}
      {activePage === 'virtual-keyboard' && <VirtualKeyboard />}
      {activePage === 'macros' && <MacroStudio />}
      {activePage === 'learning' && <LearningCenter />}
      {activePage === 'usage-stats' && <UsageStats />}
      {activePage === 'profiles' && <Profiles />}
      {activePage === 'settings' && <Settings />}
      {activePage === 'developer' && <Developer />}
      {activePage === 'dashboard' && <Dashboard />}
    </AppShell>
  )
}

export default App
