import { create } from 'zustand'
import type { Application } from '@shared/types'

interface ApplicationsStoreState {
  /** Every application Noma has ever recorded (seeded, profiled, or just
   *  detected running once), keyed by id — the renderer's one lookup table
   *  for "what's this application's real executable path," which `AppIcon`
   *  needs for real OS-icon extraction (see `lib/osIconCache.ts`) but most
   *  call sites only ever have an `applicationId` for (WorkflowChain steps,
   *  a Control's owning application, a Suggestion's chain). Populated two
   *  ways: a bulk `getAllApplications()` load for everything the main
   *  process's `applications` table already knows about, and a live merge
   *  of `onActiveContextChanged`'s `application` — the freshest possible
   *  source, arriving before any database round trip could. */
  byId: Record<string, Application>
  refresh: () => Promise<void>
  /** Subscribes to live application-context changes, merging the focused
   *  application into `byId` as it changes. Returns an unsubscribe function. */
  subscribe: () => () => void
}

export const useApplicationsStore = create<ApplicationsStoreState>((set) => ({
  byId: {},
  refresh: async () => {
    const applications = await window.flow.getAllApplications()
    set((state) => {
      const byId = { ...state.byId }
      for (const application of applications) byId[application.id] = application
      return { byId }
    })
  },
  subscribe: () => {
    return window.flow.onActiveContextChanged((context) => {
      if (!context.application) return
      const application = context.application
      set((state) => ({ byId: { ...state.byId, [application.id]: application } }))
    })
  }
}))
