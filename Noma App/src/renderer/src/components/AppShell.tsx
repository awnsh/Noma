import type { ReactNode } from 'react'
import { useUiStore, type Page } from '../stores/uiStore'
import logo from '../assets/logo-black.png'
import {
  HomeIcon,
  DemoIcon,
  KeyboardIcon,
  HoloIcon,
  MacroIcon,
  LearningIcon,
  ActivityIcon,
  StatsIcon,
  ControlsIcon,
  ProfilesIcon,
  SettingsIcon,
  DeveloperIcon,
  type IconComponent
} from './icons'

type NavItem = { label: string; page: Page; Icon: IconComponent }

// The primary loop, quiet and text-led — three items, not a wall of icons.
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Home', page: 'home', Icon: HomeIcon },
  { label: 'Controls', page: 'controls', Icon: ControlsIcon },
  { label: 'Learning', page: 'learning', Icon: LearningIcon }
]

// Noma understands your workflow -> Noma builds the interface -> Holo or
// the physical Noma Device displays it. Both are different physical
// manifestations of the same underlying system, so they sit together, as
// their own small group — not lumped in with the rest of the app.
const DEVICE_NAV_ITEMS: NavItem[] = [
  { label: 'Holo', page: 'holo', Icon: HoloIcon },
  { label: 'Noma Device', page: 'virtual-keyboard', Icon: KeyboardIcon }
]

const SETTINGS_NAV_ITEM: NavItem = { label: 'Settings', page: 'settings', Icon: SettingsIcon }

// Power-user and presentation/engineering tools — real, working
// functionality that just isn't part of the quiet primary story. Anchored
// to the bottom, below Settings, so they read as available but clearly
// tertiary — never deleted just to make the sidebar shorter.
const TOOLS_NAV_ITEMS: NavItem[] = [
  { label: 'Activity', page: 'activity', Icon: ActivityIcon },
  { label: 'Macro Studio', page: 'macros', Icon: MacroIcon },
  { label: 'Profiles', page: 'profiles', Icon: ProfilesIcon },
  { label: 'Usage Stats', page: 'usage-stats', Icon: StatsIcon },
  { label: 'Demo', page: 'demo', Icon: DemoIcon },
  { label: 'Developer', page: 'developer', Icon: DeveloperIcon }
]

function NavRow({ label, page, Icon, isActive, onClick }: NavItem & { isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors duration-150 ${
        isActive ? 'bg-accent/[0.08] font-medium text-accent' : 'text-neutral-400 hover:text-neutral-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function NavDivider() {
  return <div className="my-3 h-px bg-base-700" />
}

function NavGroupLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 px-2.5 text-[11px] text-neutral-600">{children}</div>
}

/**
 * The app's one persistent chrome element, deliberately quiet: a fixed,
 * unstyled-feeling left column, plain text labels (small icons alongside
 * them, never icon-only), no card, no shadow, no glass. Its whole job is
 * to stay out of the way of the content pane.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const activePage = useUiStore((state) => state.activePage)
  const setActivePage = useUiStore((state) => state.setActivePage)

  return (
    <div className="flex h-screen w-screen bg-base-950 text-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-base-700 px-4 py-6">
        <div className="mb-8 flex items-center gap-2 px-1">
          <img src={logo} alt="" className="h-6 w-9" />
          <span className="font-display text-sm font-semibold text-neutral-100">Noma</span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavRow
              key={item.label}
              {...item}
              isActive={item.page === activePage}
              onClick={() => setActivePage(item.page)}
            />
          ))}
        </nav>

        <NavDivider />
        <NavGroupLabel>Device</NavGroupLabel>
        <div className="flex flex-col gap-0.5">
          {DEVICE_NAV_ITEMS.map((item) => (
            <NavRow
              key={item.label}
              {...item}
              isActive={item.page === activePage}
              onClick={() => setActivePage(item.page)}
            />
          ))}
        </div>

        <NavDivider />
        <NavRow
          {...SETTINGS_NAV_ITEM}
          isActive={SETTINGS_NAV_ITEM.page === activePage}
          onClick={() => setActivePage(SETTINGS_NAV_ITEM.page)}
        />

        <div className="mt-auto flex flex-col gap-0.5 pt-4">
          <NavDivider />
          {TOOLS_NAV_ITEMS.map((item) => (
            <NavRow
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
