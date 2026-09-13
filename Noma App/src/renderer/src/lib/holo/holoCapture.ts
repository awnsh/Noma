import type { HoloCalibration } from '@shared/types'
import {
  classifyZone,
  computeRms,
  createOnsetDetectorState,
  detectOnset,
  extractFeatures,
  type ClassificationResult,
  type OnsetDetectorState
} from './classifier'

/**
 * Owns the actual Web Audio plumbing (`getUserMedia`/`AudioContext`/
 * `AnalyserNode`) — the renderer-side, browser-API-dependent counterpart to
 * classifier.ts's pure math. Lives in the renderer (not main) because mic
 * capture is a browser API Electron's Node/main process doesn't have;
 * that's the same reason the global *keyboard* hook is main-process-only
 * and this is the mirror image of it.
 *
 * Not unit tested: jsdom (this project's DOM test environment) implements
 * no Web Audio API at all, so there is nothing meaningful to assert against
 * without a real microphone and a real browser engine — the same reason
 * `windowsAdapter.ts`'s actual PowerShell process isn't unit tested either.
 * Every piece of logic that *can* be tested without real audio hardware
 * (feature extraction, classification, onset thresholding) already lives
 * in classifier.ts specifically so it doesn't end up untested by
 * association with this file.
 */

/** How long after a detected onset to wait before allowing another one —
 *  a real tap's own decaying resonance can wobble back above the noise
 *  floor for a short while after the initial hit; without this, one
 *  physical tap could register as several. */
const TAP_REFRACTORY_MS = 250
/** How often the capture loop samples the mic — a plain `setInterval`
 *  rather than `requestAnimationFrame`, deliberately: rAF pauses when the
 *  window isn't visible/focused, and Holo needs to keep listening for taps
 *  while the user is working in a *different* application, the entire
 *  point of a no-hardware input method. */
const POLL_INTERVAL_MS = 20

export type HoloTapListener = (result: ClassificationResult & { features: number[] }) => void

export class HoloCaptureEngine {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private pollHandle: ReturnType<typeof setInterval> | null = null
  private onsetState: OnsetDetectorState = createOnsetDetectorState()
  private lastTapAt = -Infinity
  private calibration: HoloCalibration | null = null
  private readonly tapListeners = new Set<HoloTapListener>()
  private pendingCapture: { resolve: (features: number[]) => void; reject: (error: Error) => void } | null = null

  get isRunning(): boolean {
    return this.pollHandle !== null
  }

  /** Requests microphone permission and starts the listening loop. Throws
   *  if permission is denied or no input device exists — the caller (the
   *  Holo page) is responsible for showing that as a real error, not
   *  silently pretending Holo is listening when it isn't. */
  async start(): Promise<void> {
    if (this.isRunning) return

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.audioContext = new AudioContext()
    const source = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    source.connect(this.analyser)

    const timeDomain = new Float32Array(this.analyser.fftSize)
    const frequency = new Uint8Array(this.analyser.frequencyBinCount)

    this.pollHandle = setInterval(() => {
      if (!this.analyser) return
      this.analyser.getFloatTimeDomainData(timeDomain)
      const rms = computeRms(timeDomain)

      const now = performance.now()
      if (now - this.lastTapAt < TAP_REFRACTORY_MS) return

      if (detectOnset(rms, this.onsetState)) {
        this.lastTapAt = now
        this.analyser.getByteFrequencyData(frequency)
        const features = extractFeatures(frequency)
        this.handleTap(features)
      }
    }, POLL_INTERVAL_MS)
  }

  /** Releases the mic and stops listening — the "unplug" for this input
   *  source, same intent as the standalone Virtual Device's plug/unplug
   *  semantics. Idempotent. */
  stop(): void {
    if (this.pollHandle !== null) clearInterval(this.pollHandle)
    this.pollHandle = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    void this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
    this.pendingCapture?.reject(new Error('Holo capture stopped'))
    this.pendingCapture = null
  }

  /** Live recognition mode: the calibration this engine classifies against.
   *  Passing null (e.g. before any calibration exists) means every tap is
   *  captured but never classified — onTap simply never fires. */
  setCalibration(calibration: HoloCalibration | null): void {
    this.calibration = calibration
  }

  /** Subscribes to classified taps during live listening. Returns an
   *  unsubscribe function. */
  onTap(listener: HoloTapListener): () => void {
    this.tapListeners.add(listener)
    return () => {
      this.tapListeners.delete(listener)
    }
  }

  /**
   * Calibration wizard support: resolves with the next detected tap's raw
   * feature vector (not classified against anything — there may be no
   * calibration yet at all). Rejects on timeout or if `stop()` is called
   * first. Only one capture can be pending at a time — the wizard always
   * awaits one before requesting the next.
   */
  captureNextTap(timeoutMs = 8000): Promise<number[]> {
    if (this.pendingCapture) {
      return Promise.reject(new Error('A tap capture is already pending'))
    }
    return new Promise<number[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCapture = null
        reject(new Error('Timed out waiting for a tap'))
      }, timeoutMs)
      this.pendingCapture = {
        resolve: (features) => {
          clearTimeout(timeout)
          resolve(features)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      }
    })
  }

  private handleTap(features: number[]): void {
    if (this.pendingCapture) {
      const { resolve } = this.pendingCapture
      this.pendingCapture = null
      resolve(features)
      return
    }

    if (!this.calibration) return
    const result = classifyZone(features, this.calibration.zones, this.calibration.reject?.features)
    for (const listener of this.tapListeners) listener({ ...result, features })
  }
}
