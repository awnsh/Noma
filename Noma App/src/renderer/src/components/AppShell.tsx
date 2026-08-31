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

type NavItem = { label: string; page: Page; Icon: IconComponent }

// The actual product surfaces a real user works in day to day — ordered
// roughly by how often they'd reach for each one.
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', page: 'dashboard', Icon: DashboardIcon },
  { label: 'Virtual Keyboard', page: 'virtual-keyboard', Icon: KeyboardIcon },
  { label: 'Macro Studio', page: 'macros', Icon: MacroIcon },
  { label: 'Learning Center', page: 'learning', Icon: LearningIcon },
  { label: 'Profiles', page: 'profiles', Icon: ProfilesIcon },
  { label: 'Settings', page: 'settings', Icon: SettingsIcon }
]

// Presentation/engineering tools, not something a customer reaches for —
// anchored to the bottom of the rail (see the `mt-auto` spacer below) and
// visually separated, rather than sitting ahead of Virtual Keyboard/
// Profiles/Settings in the list a real user sees first.
const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: 'Demo', page: 'demo', Icon: DemoIcon },
  { label: 'Developer', page: 'developer', Icon: DeveloperIcon }
]

function NavButton({ label, page, Icon, isActive, onClick }: NavItem & { isActive: boolean; onClick: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          isActive ? 'bg-white/10 text-accent' : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-200'
        }`}
      >
        <Icon className="h-5 w-5" />
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-base-800 px-2 py-1 text-xs text-neutral-200 group-hover:block">
        {label}
      </span>
    </div>
  )
}

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
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavButton
              key={item.label}
              {...item}
              isActive={item.page === activePage}
              onClick={() => setActivePage(item.page)}
            />
          ))}
        </nav>

        {/* Pushed to the bottom of the rail and separated by a divider —
            presentation/engineering tools, not the product itself. */}
        <div className="mt-auto flex flex-col items-center gap-1 pt-3">
          <div className="mb-2 h-px w-8 bg-white/10" />
          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavButton
              key={item.label}
              {...item}
              isActive={item.page === activePage}
              onClick={() => setActivePage(item.page)}
            />
          ))}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
