import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Demo } from './pages/Demo'
import { VirtualKeyboard } from './pages/VirtualKeyboard'
import { MacroStudio } from './pages/MacroStudio'
import { LearningCenter } from './pages/LearningCenter'
import { Profiles } from './pages/Profiles'
import { Settings } from './pages/Settings'
import { Developer } from './pages/Developer'
import { useUiStore } from './stores/uiStore'

function App() {
  const activePage = useUiStore((state) => state.activePage)

  return (
    <AppShell>
      {activePage === 'demo' && <Demo />}
      {activePage === 'virtual-keyboard' && <VirtualKeyboard />}
      {activePage === 'macros' && <MacroStudio />}
      {activePage === 'learning' && <LearningCenter />}
      {activePage === 'profiles' && <Profiles />}
      {activePage === 'settings' && <Settings />}
      {activePage === 'developer' && <Developer />}
      {activePage === 'dashboard' && <Dashboard />}
    </AppShell>
  )
}

export default App
