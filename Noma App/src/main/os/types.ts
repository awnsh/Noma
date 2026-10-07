import type { Application } from '@shared/types'

/**
 * OS abstraction layer (brainstorm.md section 4/section 3).
 *
 * All application-detection logic goes through this interface so Windows
 * is a swappable implementation, not an assumption baked into the app
 * a macOS adapter can be added later without touching callers.
 */
export interface OSAdapter {
  getActiveApplication(): Promise<Application | null>
  /** Returns an unsubscribe function. */
  onActiveApplicationChanged(callback: (app: Application | null) => void): () => void
}

/** What the main process needs from the real OS adapter: detection, plus
 *  the target for actions. On Windows the handle is the last real
 *  foreground window (HWND); on macOS it is that app's pid. */
export interface PlatformOSAdapter extends OSAdapter {
  getLastKnownWindowHandle(): number | null
  /** Stops any helper process. Call on app quit. */
  dispose(): void
}
