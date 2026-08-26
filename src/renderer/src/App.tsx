import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { VirtualKeyboard } from './pages/VirtualKeyboard'
import { useUiStore } from './stores/uiStore'

function App() {
  const activePage = useUiStore((state) => state.activePage)

  return <AppShell>{activePage === 'virtual-keyboard' ? <VirtualKeyboard /> : <Dashboard />}</AppShell>
}

export default App
