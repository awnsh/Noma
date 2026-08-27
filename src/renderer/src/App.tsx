import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { VirtualKeyboard } from './pages/VirtualKeyboard'
import { MacroStudio } from './pages/MacroStudio'
import { Developer } from './pages/Developer'
import { useUiStore } from './stores/uiStore'

function App() {
  const activePage = useUiStore((state) => state.activePage)

  return (
    <AppShell>
      {activePage === 'virtual-keyboard' && <VirtualKeyboard />}
      {activePage === 'macros' && <MacroStudio />}
      {activePage === 'developer' && <Developer />}
      {activePage === 'dashboard' && <Dashboard />}
    </AppShell>
  )
}

export default App
