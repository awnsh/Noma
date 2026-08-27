import type { ReactNode } from 'react'
import { useUiStore, type Page } from '../stores/uiStore'

const NAV_ITEMS: Array<{ label: string; page: Page } | { label: string; page: null }> = [
  { label: 'Dashboard', page: 'dashboard' },
  { label: 'Virtual Keyboard', page: 'virtual-keyboard' },
  { label: 'Macro Studio', page: 'macros' },
  { label: 'Insights', page: null },
  { label: 'Developer', page: 'developer' }
]

export function AppShell({ children }: { children: ReactNode }) {
  const activePage = useUiStore((state) => state.activePage)
  const setActivePage = useUiStore((state) => state.setActivePage)

  return (
    <div className="flex h-screen w-screen bg-base-950 text-neutral-200">
      <aside className="flex w-56 flex-col border-r border-white/10 px-4 py-6">
        <div className="mb-8 px-2">
          {/* Noma is the product/company; Flow is specifically the adaptive
              suggestion/pattern-learning feature within it (see the panel
              copy on the Dashboard) — not the whole app's name. */}
          <div className="text-sm font-semibold tracking-widest text-neutral-100">NOMA</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.page !== null && item.page === activePage
            const isEnabled = item.page !== null

            return (
              <button
                key={item.label}
                type="button"
                disabled={!isEnabled}
                onClick={() => item.page && setActivePage(item.page)}
                className={`rounded-lg px-3 py-2 text-left text-sm ${
                  isActive
                    ? 'bg-white/5 text-neutral-100'
                    : isEnabled
                      ? 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
                      : 'text-neutral-600'
                }`}
              >
                {item.label}
                {!isEnabled && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-neutral-700">
                    Soon
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
