import type { ReactNode } from 'react'
import { useUiStore, type Page } from '../stores/uiStore'
import logo from '../assets/logo.png'
import {
  DashboardIcon,
  DemoIcon,
  KeyboardIcon,
  MacroIcon,
  LearningIcon,
  ProfilesIcon,
  SettingsIcon,
  DeveloperIcon,
  type IconComponent
} from './icons'

const NAV_ITEMS: Array<{ label: string; page: Page; Icon: IconComponent }> = [
  { label: 'Dashboard', page: 'dashboard', Icon: DashboardIcon },
  { label: 'Demo', page: 'demo', Icon: DemoIcon },
  { label: 'Virtual Keyboard', page: 'virtual-keyboard', Icon: KeyboardIcon },
  { label: 'Macro Studio', page: 'macros', Icon: MacroIcon },
  { label: 'Learning Center', page: 'learning', Icon: LearningIcon },
  { label: 'Profiles', page: 'profiles', Icon: ProfilesIcon },
  { label: 'Settings', page: 'settings', Icon: SettingsIcon },
  { label: 'Developer', page: 'developer', Icon: DeveloperIcon }
]

export function AppShell({ children }: { children: ReactNode }) {
  const activePage = useUiStore((state) => state.activePage)
  const setActivePage = useUiStore((state) => state.setActivePage)

  return (
    <div className="flex h-screen w-screen bg-base-950 text-neutral-200">
      <aside className="flex w-20 flex-col items-center border-r border-white/10 py-5">
        <img
          src={logo}
          alt="Noma"
          title="Noma"
          className="mb-6 h-14 w-14 rounded-md"
          style={{ mixBlendMode: 'screen' }}
        />
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, page, Icon }) => {
            const isActive = page === activePage

            return (
              <div key={label} className="group relative">
                <button
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => setActivePage(page)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isActive
                      ? 'bg-white/10 text-accent'
                      : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
                <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-base-800 px-2 py-1 text-xs text-neutral-200 group-hover:block">
                  {label}
                </span>
              </div>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
