import { useEffect, useState, type ReactNode } from 'react'
import { useUiStore, type Page } from '../stores/uiStore'
import { useApplicationsStore } from '../stores/applicationsStore'
import { useActionRunStore } from '../stores/actionRunStore'
import logo from '../assets/logo.png'
import wordmark from '../assets/noma-wordmark.png'
import { BetaBadge } from './BetaBadge'
import {
  HomeIcon,
  DemoIcon,
  KeyboardIcon,
  GlideIcon,
  MacroIcon,
  WorkflowsIcon,
  LearningIcon,
  ActivityIcon,
  StatsIcon,
  ProfilesIcon,
  SettingsIcon,
  DeveloperIcon,
  type IconComponent
} from './icons'

type NavItem = { label: string; page: Page; Icon: IconComponent }

// What a new user needs, in the order they need it: what Noma is doing
// (Home), the trackpad actions (Glide), and what Flow has noticed or saved
// (Workflows). Everything else is one group down.
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Home', page: 'home', Icon: HomeIcon },
  { label: 'Glide', page: 'holo', Icon: GlideIcon },
  { label: 'Workflows', page: 'workflows', Icon: WorkflowsIcon }
]

// Real, working pages for people who want more detail or control.
const MORE_NAV_ITEMS: NavItem[] = [
  { label: 'Learning', page: 'learning', Icon: LearningIcon },
  { label: 'Activity', page: 'activity', Icon: ActivityIcon },
  { label: 'Macro Studio', page: 'macros', Icon: MacroIcon },
  { label: 'Profiles', page: 'profiles', Icon: ProfilesIcon },
  { label: 'Usage Stats', page: 'usage-stats', Icon: StatsIcon }
]

const SETTINGS_NAV_ITEM: NavItem = { label: 'Settings', page: 'settings', Icon: SettingsIcon }

// For building and presenting Noma, shown only with developer tools on
// (Settings): the hardware simulator's page, Demo Mode (scripted data) and
// the device log.
const DEVELOPER_NAV_ITEMS: NavItem[] = [
  { label: 'Noma Device', page: 'virtual-keyboard', Icon: KeyboardIcon },
  { label: 'Demo', page: 'demo', Icon: DemoIcon },
  { label: 'Developer', page: 'developer', Icon: DeveloperIcon }
]

function NavRow({ label, page, Icon, isActive, onClick }: NavItem & { isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.98] ${
        isActive
          ? 'border border-accent/25 bg-accent/[0.12] font-medium text-accent'
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
 * left column of smoked glass floating over the page behind it. Plain
 * text labels (small icons alongside them, never icon-only), no
 * card-within-a-card, no second glass recipe (see `CARD` in
 * `lib/surfaces.ts`; this uses a lighter hand-rolled variant since it's
 * full-height chrome, not a content card). Its whole job is to stay out
 * of the way of the content pane, just with real material this time
 * instead of a flat panel.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const activePage = useUiStore((state) => state.activePage)
  const setActivePage = useUiStore((state) => state.setActivePage)
  const developerTools = useUiStore((state) => state.developerTools)
  const refreshApplications = useApplicationsStore((state) => state.refresh)
  const subscribeApplications = useApplicationsStore((state) => state.subscribe)

  // Loaded once, app-wide; every `AppIcon` anywhere in the tree resolves
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
      {/* v4: a single, extremely low-opacity cool wash; not the two
          80-160px-blur violet/blue "AI glow" blobs a prior version had.
          Real feedback was that even a restrained version of that reads
          as decoration; this is deliberately close to invisible, the way
          a premium physical product's own ambient lighting would be. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -right-1/4 -top-1/3 h-[900px] w-[900px] rounded-full opacity-[0.05] blur-[180px]"
          style={{ background: 'radial-gradient(circle, #4c7eff 0%, transparent 70%)' }}
        />
      </div>

      <aside className="relative z-10 flex w-56 shrink-0 flex-col border-r border-base-700 bg-white/[0.03] px-4 py-6 backdrop-blur-2xl">
        <div className="mb-8 flex items-center gap-1.5 px-1">
          <img src={logo} alt="" className="h-6 w-[34px]" />
          <img src={wordmark} alt="Noma" className="h-[14px] w-auto" />
          <BetaBadge className="ml-1" />
        </div>

        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-0.5">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavRow key={item.label} {...item} isActive={item.page === activePage} onClick={() => setActivePage(item.page)} />
            ))}
          </div>

          <NavDivider />
          <NavGroupLabel>More</NavGroupLabel>
          <div className="flex flex-col gap-0.5">
            {MORE_NAV_ITEMS.map((item) => (
              <NavRow key={item.label} {...item} isActive={item.page === activePage} onClick={() => setActivePage(item.page)} />
            ))}
          </div>

          {developerTools && (
            <>
              <NavDivider />
              <NavGroupLabel>Developer</NavGroupLabel>
              <div className="flex flex-col gap-0.5">
                {DEVELOPER_NAV_ITEMS.map((item) => (
                  <NavRow key={item.label} {...item} isActive={item.page === activePage} onClick={() => setActivePage(item.page)} />
                ))}
              </div>
            </>
          )}

          <div className="mt-auto pt-4">
            <NavDivider />
            <NavRow
              {...SETTINGS_NAV_ITEM}
              isActive={SETTINGS_NAV_ITEM.page === activePage}
              onClick={() => setActivePage(SETTINGS_NAV_ITEM.page)}
            />
          </div>
        </nav>
      </aside>
      <main className="relative z-10 flex-1 overflow-y-auto">
        <RunningActionBar />
        {children}
      </main>
    </div>
  )
}

/** Below this an action is over before a bar could help, so none appears. */
const RUNNING_BAR_DELAY_MS = 400

/**
 * Shown while an action has been running for a moment (a saved workflow
 * replaying, typically), with a way to stop it before its next step. The
 * same Stop is in the tray menu, for when Noma's window isn't open.
 */
function RunningActionBar() {
  const run = useActionRunStore((state) => state.run)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!run.running) {
      setVisible(false)
      return
    }
    const timeout = window.setTimeout(() => setVisible(true), RUNNING_BAR_DELAY_MS)
    return () => window.clearTimeout(timeout)
  }, [run.running, run.startedAt])

  if (!visible) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-accent/30 bg-base-900/95 px-10 py-2.5 text-sm text-neutral-100 backdrop-blur"
    >
      <span>
        Running <span className="font-medium">“{run.label ?? 'action'}”</span>… it stops by itself when done.
      </span>
      <button
        type="button"
        onClick={() => void window.flow.cancelRunningAction()}
        className="rounded-md border border-base-600 px-3 py-1 text-xs text-neutral-100 hover:border-neutral-400"
      >
        Stop after this step
      </button>
    </div>
  )
}
