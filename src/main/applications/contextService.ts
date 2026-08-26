import type { Application, ApplicationContext } from '@shared/types'
import type { OSAdapter } from '../os/types'
import { getProfileForApplicationId } from '../database/repositories/profileRepository'

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

  constructor(private readonly osAdapter: OSAdapter) {}

  start(): void {
    if (this.unsubscribeOsAdapter) return
    this.unsubscribeOsAdapter = this.osAdapter.onActiveApplicationChanged((application) => {
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

  /** Returns an unsubscribe function. */
  onContextChanged(callback: (context: ApplicationContext) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private updateContext(application: Application | null): void {
    const profile = application ? getProfileForApplicationId(application.id) : null
    this.current = { application, profile }
    for (const listener of this.listeners) {
      listener(this.current)
    }
  }
}
