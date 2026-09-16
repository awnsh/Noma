import { useEffect, type ReactNode } from 'react'
import { useUiStore, type Page } from '../stores/uiStore'
import { useApplicationsStore } from '../stores/applicationsStore'
import logo from '../assets/logo.png'
import wordmark from '../assets/noma-wordmark.png'
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
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all duration-150 ${
        isActive
          ? 'border border-accent/25 bg-accent/[0.12] font-medium text-accent shadow-[0_0_16px_-4px_rgba(99,124,255,0.45)]'
          : 'border border-transparent text-neutral-400 hover:text-neutral-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function NavDivider() {
  return <div className="my-3 h-px bg-white/[0.08]" />
}

function NavGroupLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 px-2.5 text-[11px] tracking-wide text-neutral-600">{children}</div>
}

/**
 * The app's one persistent chrome element, deliberately quiet: a fixed
 * left column of smoked glass floating over the ambient-lit page behind
 * it — plain text labels (small icons alongside them, never icon-only),
 * no card-within-a-card, no second glass recipe (see `GLASS_CARD` in
 * `lib/surfaces.ts` — this uses a lighter hand-rolled variant since it's
 * full-height chrome, not a content card). Its whole job is to stay out
 * of the way of the content pane, just with real material this time
 * instead of a flat panel.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const activePage = useUiStore((state) => state.activePage)
  const setActivePage = useUiStore((state) => state.setActivePage)
  const refreshApplications = useApplicationsStore((state) => state.refresh)
  const subscribeApplications = useApplicationsStore((state) => state.subscribe)

  // Loaded once, app-wide — every `AppIcon` anywhere in the tree resolves
  // its executable path from this store (see applicationsStore.ts), not a
  // per-page fetch, since a workflow chain or Learning Center entry can
  // reference an application that isn't the one currently focused.
  useEffect(() => {
    refreshApplications()
    return subscribeApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-base-950 text-neutral-100">
      {/* The ambient light source behind the whole interface — large, soft,
          low-opacity, blurred; meant to almost disappear once you stop
          looking for it. A fixed background layer, never re-created per
          page, so it never competes with (or gets clipped by) page
          content — see product brief Part 3. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -right-1/4 -top-1/3 h-[900px] w-[900px] rounded-full opacity-[0.16] blur-[160px]"
          style={{ background: 'radial-gradient(circle, #637cff 0%, #8b6cff 45%, transparent 70%)' }}
        />
        {/* A second, dimmer light low on the opposite corner — "light
            reflecting across black glass" needs two sources catching
            different surfaces, not one big glow doing all the work. Kept
            well under the primary source's opacity so it reads as
            ambience, not a second focal point. */}
        <div
          className="absolute -bottom-1/3 -left-1/4 h-[700px] w-[700px] rounded-full opacity-[0.09] blur-[170px]"
          style={{ background: 'radial-gradient(circle, #8b6cff 0%, #637cff 50%, transparent 70%)' }}
        />
      </div>

      <aside className="relative z-10 flex w-56 shrink-0 flex-col border-r border-white/[0.08] bg-white/[0.04] px-4 py-6 backdrop-blur-2xl">
        <div className="relative mb-8 flex items-center gap-2 px-1">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-2 h-9 w-9 rounded-full opacity-40 blur-lg"
            style={{ background: 'radial-gradient(circle, #637cff 0%, transparent 70%)' }}
          />
          <img src={logo} alt="" className="relative h-7 w-10" />
          <img src={wordmark} alt="Noma" className="relative h-4 w-auto" />
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
      <main className="relative z-10 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
