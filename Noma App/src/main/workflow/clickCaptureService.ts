import { uIOhook, type UiohookMouseEvent } from 'uiohook-napi'
import { acquireHook, releaseHook } from './sharedHook'
import { clickTargetFor } from './clickTarget'
import { isClickCaptureExcluded } from './appKnowledge'
import type { ClickInspector } from './uiaInspector'

export interface CapturedClickEvent {
  applicationId: string | null
  /** `label:<name>` or `zone:<col>x<row>` — see clickTarget.ts. */
  clickTarget: string
  timestamp: number
}

const LEFT_BUTTON = 1

/**
 * The click counterpart of CaptureService: owns the (shared, ref-counted)
 * global mouse hook while click capture is enabled, asks the inspector what
 * control was hit, and reports ONLY the sanitized target (clickTarget.ts).
 * Coordinates and raw control names are used transiently to compute that
 * target and are never stored or emitted.
 *
 * Only left-button presses count (right-click/middle-click are context and
 * navigation, not command steps). Clicks landing in Flow's own window are
 * dropped. The application is read at the moment of the press, not after the
 * (async) inspection, so a click that switches windows is still attributed to
 * the app it happened in.
 */
export class ClickCaptureService {
  private isRunning = false
  private currentApplicationId: string | null = null

  constructor(
    private readonly onClick: (event: CapturedClickEvent) => void,
    private readonly inspector: ClickInspector,
    private readonly ownProcessId: number = process.pid
  ) {}

  setCurrentApplicationId(applicationId: string | null): void {
    this.currentApplicationId = applicationId
  }

  start(): void {
    if (this.isRunning) return
    uIOhook.on('mousedown', this.handleMouseDown)
    acquireHook()
    this.isRunning = true
  }

  stop(): void {
    if (!this.isRunning) return
    releaseHook()
    uIOhook.off('mousedown', this.handleMouseDown)
    this.inspector.dispose()
    this.isRunning = false
  }

  get running(): boolean {
    return this.isRunning
  }

  /** Exposed for tests: the whole pipeline for one press. */
  async handlePress(x: number, y: number, applicationId: string | null, timestamp: number): Promise<void> {
    // No known application (nothing focused / Flow itself) -> nothing to attribute a click to.
    if (!applicationId) return
    // Browsers, chat and meeting apps put people's names and page content in
    // their buttons — see isClickCaptureExcluded. Skipped before inspecting.
    if (isClickCaptureExcluded(applicationId)) return
    const inspection = await this.inspector.inspect(x, y)
    if (!inspection) return
    if (inspection.processId === this.ownProcessId) return

    const clickTarget = clickTargetFor(x, y, inspection)
    if (!clickTarget) return
    this.onClick({ applicationId, clickTarget, timestamp })
  }

  private readonly handleMouseDown = (event: UiohookMouseEvent): void => {
    if (event.button !== LEFT_BUTTON) return
    void this.handlePress(event.x, event.y, this.currentApplicationId, Date.now())
  }
}
