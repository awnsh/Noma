import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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
      className={`relative z-10 flex w-full items-center gap-2.5 rounded-full px-3 py-[7px] text-left text-[13px] transition-[color,transform] duration-200 ease-out active:scale-[0.97] ${
        isActive ? 'font-medium text-neutral-50' : 'text-neutral-300/80 hover:text-neutral-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function NavDivider() {
  return <div className="my-3 h-px bg-white/[0.06]" />
}

function NavGroupLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1 px-2.5 text-[11px] text-neutral-300/50">{children}</div>
}

/**
 * Where you are: the app Noma is acting for right now, on its own colour.
 * The only place in the chrome that names it, so it's the first thing the
 * sidebar says after Noma's own name.
 */
function CurrentSpace() {
  const application = useFlowStore((state) => state.context.application)
  return (
    <div className="glass mb-6 flex items-center gap-2.5 rounded-[14px] px-2.5 py-2">
      {/* The app's colour, as a solid tile behind its icon: the one place
          the chrome shows it. */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-space-deep">
        <AppIcon applicationId={application?.id} name={application?.name ?? 'No app'} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] leading-tight text-neutral-500">In</span>
        <span className="block truncate text-[13px] font-medium leading-tight text-neutral-100">
          {application?.name ?? 'No app yet'}
        </span>
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

  // Where the nav's glass pill sits: over the active row.
  const navRef = useRef<HTMLElement>(null)
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const place = (): void => {
      const nav = navRef.current
      const row = nav?.querySelector<HTMLElement>(`[data-nav-page="${activePage}"]`)
      if (!nav || !row) return setPill(null)
      const navTop = nav.getBoundingClientRect().top
      const rect = row.getBoundingClientRect()
      setPill({ top: rect.top - navTop, height: rect.height })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [activePage, developerTools])

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
      <aside className="relative z-10 flex w-56 shrink-0 flex-col px-3 pb-4 pt-5">
        <div className="mb-5 flex items-center gap-1.5 px-2">
          <img src={logo} alt="" className="h-[22px] w-[34px] object-contain" />
          <img src={wordmark} alt="Noma" className="h-[13px] w-auto" />
          <BetaBadge className="ml-1" />
        </div>
        <CurrentSpace />

        <nav ref={navRef} aria-label="Main" className="relative flex min-h-0 flex-1 flex-col">
          {/* One glass pill that glides to the page you open, instead of
              each row lighting up on its own. */}
          {pill && (
            <div
              aria-hidden
              className="glass pointer-events-none absolute inset-x-0 rounded-full bg-white/[0.07] transition-[top,height] duration-500 [transition-timing-function:var(--ease-spring)]"
              style={{ top: pill.top, height: pill.height }}
            />
          )}
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
      <main className="relative z-10 my-2 mr-2 flex-1 overflow-y-auto glass rounded-[14px] bg-[rgba(17,16,14,0.74)]">
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
