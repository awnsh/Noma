import type { ReactNode } from 'react'
import { useUiStore, type Page } from '../stores/uiStore'
import logo from '../assets/logo.png'
import {
  DashboardIcon,
  DemoIcon,
  KeyboardIcon,
  MacroIcon,
  LearningIcon,
  StatsIcon,
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
  { label: 'Usage Stats', page: 'usage-stats', Icon: StatsIcon },
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

// The rail's own material — a soft gradient sheen over the base fill, a
// crisp inset top highlight (the "beveled glass edge"), and an ambient
// drop shadow for real elevation off the content plane. backdrop-blur is
// kept even though nothing currently scrolls behind this floating rail —
// harmless today, and correct the day a future layout lets content pass
// under it — but the *visible* glass read here comes from the gradient +
// highlight + shadow, exactly like Apple/Logitech chrome: material is
// mostly about light, not literally what's blurred behind it.
const RAIL_GLASS =
  'bg-gradient-to-b from-white/[0.07] via-base-900/70 to-base-900/70 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)]'

function NavButton({ label, page, Icon, isActive, onClick }: NavItem & { isActive: boolean; onClick: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ${
          isActive
            ? 'bg-accent/15 text-accent shadow-[0_4px_20px_-4px_rgba(76,126,255,0.45)] ring-1 ring-inset ring-accent/30'
            : 'text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-100'
        }`}
      >
        <Icon className="h-5 w-5" />
      </button>
      {/* A real floating glass tooltip — genuine page content sits behind
          it (it's positioned over `main`), so the blur actually does
          something here, unlike the rail above. */}
      <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-base-800/70 px-2.5 py-1.5 text-xs text-neutral-100 shadow-lg shadow-black/40 backdrop-blur-md group-hover:block">
        {label}
      </span>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const activePage = useUiStore((state) => state.activePage)
  const setActivePage = useUiStore((state) => state.setActivePage)

  return (
    <div className="flex h-screen w-screen gap-3 bg-base-950 p-3 text-neutral-200">
      <aside className={`flex w-20 shrink-0 flex-col items-center rounded-[28px] py-5 ${RAIL_GLASS}`}>
        <div className="mb-6 flex h-14 w-14 items-center justify-center">
          {/* Genuinely transparent PNG (src/renderer/src/assets/logo.png) —
              no mix-blend-mode trick needed to hide a baked-in background
              anymore, see [[noma-app-glass-redesign]]. The mark's native
              aspect ratio is ~1.56:1 (wider than tall), so it's sized by
              width/height directly rather than `object-contain`-ing it
              into a square box. */}
          <img src={logo} alt="Noma" title="Noma" className="h-8 w-12" />
        </div>
        <nav className="flex flex-col gap-1.5">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavButton
              key={item.label}
              {...item}
              isActive={item.page === activePage}
              onClick={() => setActivePage(item.page)}
            />
          ))}
        </nav>

        {/* Pushed to the bottom of the rail and separated by a soft-fade
            divider — presentation/engineering tools, not the product
            itself. */}
        <div className="mt-auto flex flex-col items-center gap-1.5 pt-3">
          <div className="mb-2 h-px w-8 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
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
