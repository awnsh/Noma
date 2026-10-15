import { useEffect, useState, type ReactNode } from 'react'
import { BUTTON_SECONDARY } from '../lib/surfaces'
import { useUiStore, type Page } from '../stores/uiStore'
import { useApplicationsStore } from '../stores/applicationsStore'
import { useActionRunStore } from '../stores/actionRunStore'
import logo from '../assets/logo.png'
import wordmark from '../assets/noma-wordmark.png'
import { BetaBadge } from './BetaBadge'
import { AppIcon } from './AppIcon'
import { useFlowStore } from '../stores/flowStore'
import { useAppSpace } from '../lib/appSpace'
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
      data-nav-page={page}
      className={`relative flex h-8 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] transition-colors duration-100 ${
        isActive ? 'bg-white/[0.07] text-neutral-50' : 'text-neutral-300 hover:bg-white/[0.04] hover:text-neutral-100'
      }`}
    >
      {/* The selection mark Windows 11 and macOS sidebars use. */}
      {isActive && <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent" />}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function NavDivider() {
  return <div className="my-2.5 h-px bg-white/[0.06]" />
}

function NavGroupLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1 mt-1 px-3 text-[12px] font-semibold text-neutral-500">{children}</div>
}

/**
 * Where you are: the app Noma is acting for right now, on its own colour.
 * The only place in the chrome that names it, so it's the first thing the
 * sidebar says after Noma's own name.
 */
function CurrentSpace() {
  const application = useFlowStore((state) => state.context.application)
  return (
    <div className="mb-4 flex items-center gap-2.5 border-y border-white/[0.06] px-3 py-2.5">
      <AppIcon applicationId={application?.id} name={application?.name ?? 'No app'} size={18} />
      <span className="min-w-0 truncate text-[13px] text-neutral-300">
        {application?.name ?? 'No app yet'}
      </span>
    </div>
  )
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
  useAppSpace()

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
    <div className="noma-window relative flex h-screen w-screen overflow-hidden text-neutral-100">
      {/* The window frame is the app's space (lib/appSpace.ts), the way an
          Arc window takes its space's colour: the sidebar sits directly on
          it, and the page is a graphite sheet laid on top. */}
      <aside className="relative z-10 flex w-56 shrink-0 flex-col px-2 pb-3 pt-4">
        <div className="mb-4 flex items-center gap-1.5 px-3">
          <img src={logo} alt="" className="h-[22px] w-[34px] object-contain" />
          <img src={wordmark} alt="Noma" className="h-[13px] w-auto" />
          <BetaBadge className="ml-1" />
        </div>
        <CurrentSpace />

        <nav aria-label="Main" className="relative flex min-h-0 flex-1 flex-col">
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
      <main className="relative z-10 mt-1.5 flex-1 overflow-y-auto rounded-tl-lg border-l border-t border-white/[0.06] bg-[rgba(24,22,20,0.86)]">
        <div className="relative h-full">
          <RunningActionBar />
          {children}
        </div>
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
      className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-base-850 px-10 py-2.5 text-sm text-neutral-100"
    >
      <span>
        Running <span className="font-medium">“{run.label ?? 'action'}”</span>… it stops by itself when done.
      </span>
      <button
        type="button"
        onClick={() => void window.flow.cancelRunningAction()}
        className={BUTTON_SECONDARY}
      >
        Stop after this step
      </button>
    </div>
  )
}
