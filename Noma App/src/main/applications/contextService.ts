import type { Application, ApplicationContext } from '@shared/types'
import type { OSAdapter } from '../os/types'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'
import { upsertApplication } from '../database/repositories/applicationsRepository'

/**
 * Combines the OS layer's raw active-application signal with the profile
 * system's stored profiles into one live ApplicationContext, and re-emits
 * it whenever the foreground application changes. This is the one thing
 * the renderer subscribes to for "Current Application" + "Current
 * Controls" (brainstorm.md sections 7, 17).
 */
export class ApplicationContextService {
  private current: ApplicationContext = { application: null, profile: null }
  private listeners = new Set<(context: ApplicationContext) => void>()
  private unsubscribeOsAdapter: (() => void) | null = null
  /** True while Demo Mode has overridden the live application — see
   *  setDemoApplication below. */
  private demoOverrideActive = false

  constructor(private readonly osAdapter: OSAdapter) {}

  start(): void {
    if (this.unsubscribeOsAdapter) return
    this.unsubscribeOsAdapter = this.osAdapter.onActiveApplicationChanged((application) => {
      // While Demo Mode is driving the context, ignore whatever the real OS
      // adapter reports (e.g. the presenter's cursor grazing another
      // window) — the demo's own script is the only thing allowed to move
      // the context until it explicitly hands control back (see
      // setDemoApplication(null) below).
      if (this.demoOverrideActive) return
      this.updateContext(application)
    })
  }

  stop(): void {
    this.unsubscribeOsAdapter?.()
    this.unsubscribeOsAdapter = null
  }

  getContext(): ApplicationContext {
    return this.current
  }

  /**
   * Re-resolves the current application's profile from the database and
   * re-emits the context — for when a control mapping changed out from
   * under the currently-focused application (e.g. a suggestion was just
   * accepted) so listeners don't have to wait for the next app switch to
   * see it. No-op if a different application is now focused.
   */
  refreshIfCurrentApplication(applicationId: string): void {
    if (this.current.application?.id !== applicationId) return
    this.updateContext(this.current.application)
  }

  /**
   * Demo Mode (Product Development Phase 2, "the Noma Moment"): drives the
   * live context from a scripted step instead of a real Alt-Tab, through
   * the exact same updateContext path a real foreground-window change
   * uses — so every downstream listener (hardware simulator, capture
   * service, renderer push) reacts exactly as it would to a genuine
   * switch. Passing null hands control back to the real OS adapter,
   * re-synced immediately from its current reading rather than left stale
   * until the next real switch happens to fire.
   */
  async setDemoApplication(application: Application | null): Promise<void> {
    if (application) {
      this.demoOverrideActive = true
      this.updateContext(application)
    } else {
      this.demoOverrideActive = false
      const real = await this.osAdapter.getActiveApplication()
      this.updateContext(real)
    }
  }

  /** Returns an unsubscribe function. */
  onContextChanged(callback: (context: ApplicationContext) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private updateContext(application: Application | null): void {
    // Durably records *every* detected application, not just ones with a
    // profile — this is what makes real OS-icon lookup (iconService.ts)
    // work for "arbitrary installed applications" later, e.g. from the
    // Learning Center's history, after the app itself has closed and its
    // live executablePath is no longer available from anywhere else.
    // upsertApplication's COALESCE backfill (applicationsRepository.ts)
    // means this is always safe to call, even for an app that already has
    // a seeded/user-chosen row.
    if (application) upsertApplication(application)
    const profile = application ? getProfileForApplicationId(application.id) : null
    this.current = { application, profile }
    for (const listener of this.listeners) {
      listener(this.current)
    }
  }
}
