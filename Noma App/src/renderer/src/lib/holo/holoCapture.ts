import type { HoloCalibration } from '@shared/types'
import { classifyMic, pickMicrophone, type MicCandidate, type MicKind } from './micKind'
import {
  blockEnergy,
  classifyZone,
  createOnsetDetectorState,
  detectOnset,
  detectVoice,
  extractTapFeatures,
  isVoiceLike,
  tapPeakDb,
  onsetThreshold,
  type ClassificationResult,
  type HoloSensitivity,
  type OnsetDetectorState
} from './classifier'

/**
 * Owns the Web Audio plumbing — the browser-API-dependent counterpart to
 * classifier.ts's pure math. Not unit tested: jsdom has no Web Audio at all
 * (same reason windowsAdapter.ts's real PowerShell process isn't).
 *
 * Works on any computer with a built-in microphone, and uses *only* that
 * one. Taps are located relative to the laptop's own mic, so a headset, USB
 * or webcam mic elsewhere on the desk would ruin calibration — see
 * micKind.ts. Extra external mics are ignored unless the user explicitly
 * allows one as a last resort (no built-in mic at all, e.g. a desktop PC).
 *
 * Deliberately *raw* audio: echo cancellation, noise suppression and auto
 * gain control are all switched off. They exist to make speech clean and
 * treat a desk tap as noise to remove — leaving them on is exactly how a
 * tap can vanish before it ever reaches the detector.
 */

const MAX_CHANNELS = 2
const BLOCK_FRAMES = 512
const RING_FRAMES = 8192
/** Audio kept for feature extraction (~128 ms at 48 kHz): wide enough that
 *  timer jitter in the finalize delay can't push the tap's start out of it. */
const TAP_WINDOW_FRAMES = 6144
/** After an onset, wait this long so the whole knock (resonance plus the
 *  ~100 ms tail/bounce check that separates it from a set-down object) is in
 *  the ring buffer before extracting features. */
const FINALIZE_DELAY_MS = 110
/** A real tap's own ringing can wobble back over the threshold — without
 *  this one physical tap could register several times. */
const TAP_REFRACTORY_MS = 220
/** A key/mouse event within this long *before* (or shortly after) an
 *  acoustic onset means the sound was the user's typing/clicking. */
const INPUT_GATE_BEFORE_MS = 220
const INPUT_GATE_AFTER_MS = 90
/** The mic is switched off the instant a key/mouse event arrives and back on
 *  this long after the last one, so typing sounds are never even captured
 *  (not merely filtered afterwards). */
const INPUT_MUTE_HOLD_MS = 300
/** After switching back on, ignore onsets briefly: the mic coming back up
 *  can itself look like a sudden rise against the silence just before it. */
const UNMUTE_SETTLE_MS = 120
const VIRTUAL_MIC_PATTERN = /stereo mix|loopback|virtual|voicemeeter|cable|steam streaming|obs|nvidia broadcast|what u hear/i

export interface MicInfo {
  id: string
  label: string
  kind: MicKind
  channels: number
}

export interface HoloTapEvent extends ClassificationResult {
  features: number[]
  /** True when the sound was discarded because a key/mouse event coincided. */
  ignoredByInput: boolean
}

export type HoloTapListener = (event: HoloTapEvent) => void

export interface HoloStatus {
  /** Loudest recent block energy as a multiple of the current trigger
   *  threshold — >= 1 means "would trigger." Drives the live meter. */
  level: number
  /** True while the mic is switched off because the user is typing/clicking. */
  muted: boolean
}

interface DeviceInput {
  info: MicInfo
  stream: MediaStream
  source: MediaStreamAudioSourceNode
  processor: ScriptProcessorNode
  ring: Float32Array[]
  writeIndex: number
  detector: OnsetDetectorState
}

export class HoloCaptureEngine {
  private audioContext: AudioContext | null = null
  private devices: DeviceInput[] = []
  private silentSink: GainNode | null = null
  private finalizeTimer: ReturnType<typeof setTimeout> | null = null
  private lastTapAt = -Infinity
  private onsetAt = 0
  private calibration: HoloCalibration | null = null
  private sensitivity: HoloSensitivity = 'medium'
  private allowExternalMic = false
  private muted = false
  private unmuteTimer: ReturnType<typeof setTimeout> | null = null
  private settleUntil = 0
  private lastInputActivityAt = -Infinity
  private nextInputActivityAt = Infinity
  private readonly tapListeners = new Set<HoloTapListener>()
  private readonly statusListeners = new Set<(status: HoloStatus) => void>()
  private pendingCapture: { resolve: (features: number[]) => void; reject: (error: Error) => void } | null = null
  private peakRatio = 0
  /** Peak level (dB) of the most recent accepted tap — used to find which side the mic is on. */
  lastTapPeakDb = -Infinity
  private lastStatusAt = 0
  private starting: Promise<void> | null = null

  get isRunning(): boolean {
    return this.audioContext !== null
  }

  /** The microphones in use right now (empty when not listening). */
  get mics(): MicInfo[] {
    return this.devices.map((device) => device.info)
  }

  /** Which mic (and channel count) a calibration was made on — a calibration
   *  is only valid for the mic it was recorded with. */
  get layout(): string {
    return this.devices.map((device) => `${device.info.label}:${device.info.channels}`).join('+')
  }

  setSensitivity(sensitivity: HoloSensitivity): void {
    this.sensitivity = sensitivity
  }

  /** Whether an external mic may be used when no built-in one exists. Off by default. */
  setAllowExternalMic(allow: boolean): void {
    this.allowExternalMic = allow
  }

  /** Lists input devices with their built-in/external classification
   *  (labels need a prior mic permission grant). */
  static async listInputDevices(): Promise<MicCandidate[]> {
    const all = await navigator.mediaDevices.enumerateDevices()
    const inputs = all.filter((device) => device.kind === 'audioinput')
    const hasReal = inputs.some((device) => device.deviceId !== 'default' && device.deviceId !== 'communications')
    return inputs
      .filter((device) => !hasReal || (device.deviceId !== 'default' && device.deviceId !== 'communications'))
      .filter((device) => !VIRTUAL_MIC_PATTERN.test(device.label))
      .map((device, index) => {
        const label = device.label || `Microphone ${index + 1}`
        return { id: device.deviceId, label, kind: classifyMic(label) }
      })
  }

  /** Requests permission and starts listening on every usable microphone.
   *  Throws (as a readable Error) if none can be opened. */
  start(): Promise<void> {
    if (this.isRunning) return Promise.resolve()
    this.starting ??= this.doStart().finally(() => {
      this.starting = null
    })
    return this.starting
  }

  private async doStart(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This computer has no microphone access available.')
    }

    // Raw capture: see the class doc comment for why these are all off.
    const rawAudio = (deviceId?: string): MediaTrackConstraints => ({
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: { ideal: 2 }
    })

    // Permission (and therefore device labels) needs a first open. That
    // stream is on the system *default* input, which may well be a headset —
    // it's only used to read labels, then replaced if it isn't the built-in mic.
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: rawAudio() })
    } catch (error) {
      throw new Error(describeMicError(error))
    }

    const probeTrack = stream.getAudioTracks()[0]
    const listed = await HoloCaptureEngine.listInputDevices().catch(() => [] as MicCandidate[])
    const candidates: MicCandidate[] = listed.length
      ? listed
      : [{ id: probeTrack.getSettings().deviceId ?? '', label: probeTrack.label, kind: classifyMic(probeTrack.label) }]
    const chosen = pickMicrophone(candidates, this.allowExternalMic)
    if (!chosen) {
      stream.getTracks().forEach((track) => track.stop())
      throw new Error(NO_BUILT_IN_MIC_MESSAGE)
    }
    if (chosen.id && chosen.id !== probeTrack.getSettings().deviceId) {
      stream.getTracks().forEach((track) => track.stop())
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: rawAudio(chosen.id) })
      } catch (error) {
        throw new Error(describeMicError(error))
      }
    }

    const context = new AudioContext({ latencyHint: 'interactive' })
    await context.resume()
    const sink = context.createGain()
    sink.gain.value = 0 // ScriptProcessor only runs while connected; we never want to hear it.
    sink.connect(context.destination)

    const track = stream.getAudioTracks()[0]
    const settings = track.getSettings()
    const channels = Math.max(1, Math.min(MAX_CHANNELS, settings.channelCount ?? 1))
    const source = context.createMediaStreamSource(stream)
    const processor = context.createScriptProcessor(BLOCK_FRAMES, channels, 1)
    const device: DeviceInput = {
      info: { id: chosen.id || track.id, label: chosen.label, kind: chosen.kind, channels },
      stream,
      source,
      processor,
      ring: Array.from({ length: channels }, () => new Float32Array(RING_FRAMES)),
      writeIndex: 0,
      detector: createOnsetDetectorState()
    }
    processor.onaudioprocess = (event) => this.handleBlock(device, event)
    source.connect(processor)
    processor.connect(sink)

    this.audioContext = context
    this.silentSink = sink
    this.devices = [device]
  }

  /** Releases the mic. Idempotent. */
  stop(): void {
    if (this.finalizeTimer) clearTimeout(this.finalizeTimer)
    this.finalizeTimer = null
    if (this.unmuteTimer) clearTimeout(this.unmuteTimer)
    this.unmuteTimer = null
    this.muted = false
    for (const device of this.devices) {
      device.processor.onaudioprocess = null
      device.processor.disconnect()
      device.source.disconnect()
      device.stream.getTracks().forEach((track) => track.stop())
    }
    this.devices = []
    this.silentSink?.disconnect()
    this.silentSink = null
    void this.audioContext?.close()
    this.audioContext = null
    this.pendingCapture?.reject(new Error('Holo capture stopped'))
    this.pendingCapture = null
  }

  setCalibration(calibration: HoloCalibration | null): void {
    this.calibration = calibration
  }

  onTap(listener: HoloTapListener): () => void {
    this.tapListeners.add(listener)
    return () => {
      this.tapListeners.delete(listener)
    }
  }

  onStatus(listener: (status: HoloStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  /** Called for every physical key/mouse event (timestamp only — see
   *  inputActivityService.ts). Sounds coinciding with one are typing/clicking. */
  noteInputActivity(timestamp: number): void {
    this.lastInputActivityAt = timestamp
    // A key event can also arrive just *after* its sound was detected.
    if (this.finalizeTimer) this.nextInputActivityAt = Math.min(this.nextInputActivityAt, timestamp)
    this.muteForInput()
  }

  /** Switches the mic track off (it delivers pure silence) while the user
   *  types or clicks, and back on shortly after they stop. */
  private muteForInput(): void {
    if (!this.isRunning) return
    this.setTracksEnabled(false)
    this.muted = true
    if (this.unmuteTimer) clearTimeout(this.unmuteTimer)
    this.unmuteTimer = setTimeout(() => {
      this.unmuteTimer = null
      this.setTracksEnabled(true)
      this.muted = false
      this.settleUntil = performance.now() + UNMUTE_SETTLE_MS
    }, INPUT_MUTE_HOLD_MS)
  }

  private setTracksEnabled(enabled: boolean): void {
    for (const device of this.devices) {
      device.stream.getAudioTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }

  /**
   * Calibration wizard support: resolves with the next detected tap's raw
   * feature vector. Rejects on timeout or if `stop()` is called first.
   */
  captureNextTap(timeoutMs = 15000): Promise<number[]> {
    if (this.pendingCapture) return Promise.reject(new Error('A tap capture is already pending'))
    return new Promise<number[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCapture = null
        reject(new Error('No tap heard. Check that the right microphone is selected and tap a little harder.'))
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

  // -------------------------------------------------------------- internals

  private handleBlock(device: DeviceInput, event: AudioProcessingEvent): void {
    const input = event.inputBuffer
    const frames = input.length
    let energy = 0
    for (let c = 0; c < device.ring.length; c++) {
      const channelData = input.getChannelData(Math.min(c, input.numberOfChannels - 1))
      const ring = device.ring[c]
      for (let i = 0; i < frames; i++) ring[(device.writeIndex + i) % RING_FRAMES] = channelData[i]
      energy = Math.max(energy, blockEnergy(channelData))
    }
    device.writeIndex = (device.writeIndex + frames) % RING_FRAMES

    const now = performance.now()
    // While muted (or just resuming) the detector is skipped entirely, so
    // its noise-floor estimate isn't dragged down by the silence. The ring
    // buffer above still records that silence, so a tap right after typing
    // never sees stale pre-mute audio in its window.
    if (!this.muted && now >= this.settleUntil) {
      const threshold = onsetThreshold(device.detector, this.sensitivity)
      this.peakRatio = Math.max(this.peakRatio, energy / threshold)

      const isOnset = detectOnset(energy, device.detector, this.sensitivity)
      if (isOnset && !this.finalizeTimer && now - this.lastTapAt >= TAP_REFRACTORY_MS) {
        this.onsetAt = Date.now()
        this.nextInputActivityAt = Infinity
        this.finalizeTimer = setTimeout(() => this.finalizeTap(), FINALIZE_DELAY_MS)
      }
    }

    if (now - this.lastStatusAt > 60) {
      this.lastStatusAt = now
      const status = { level: this.peakRatio, muted: this.muted }
      this.peakRatio = 0
      for (const listener of this.statusListeners) listener(status)
    }
  }

  private finalizeTap(): void {
    this.finalizeTimer = null
    this.lastTapAt = performance.now()
    const context = this.audioContext
    if (!context) return

    const span = TAP_WINDOW_FRAMES
    const channels: Float32Array[] = []
    const deviceOf: number[] = []
    this.devices.forEach((device, deviceIndex) => {
      for (const ring of device.ring) {
        const out = new Float32Array(span)
        for (let i = 0; i < span; i++) {
          out[i] = ring[(device.writeIndex - span + i + RING_FRAMES * 2) % RING_FRAMES]
        }
        channels.push(out)
        deviceOf.push(deviceIndex)
      }
    })

    const features = extractTapFeatures(channels, deviceOf, context.sampleRate)
    if (!features) return
    this.lastTapPeakDb = tapPeakDb(channels)

    const sinceInput = this.onsetAt - this.lastInputActivityAt
    const ignoredByInput =
      (sinceInput >= 0 && sinceInput <= INPUT_GATE_BEFORE_MS) ||
      this.nextInputActivityAt - this.onsetAt <= INPUT_GATE_AFTER_MS
    if (ignoredByInput) {
      const result: HoloTapEvent = { zone: null, confidence: 0, reason: 'unrecognized', features, ignoredByInput }
      for (const listener of this.tapListeners) listener(result)
      return
    }

    // Speech is the other thing loud and abrupt enough to get this far, and
    // unlike typing it has no key event to give it away — so it is told apart
    // by how the sound itself behaves (see classifier.ts's voice rejection).
    // Checked ahead of the calibration capture below on purpose: a word
    // spoken during the wizard must never become part of a zone's profile.
    const voice = detectVoice(channels, context.sampleRate)
    if (voice && isVoiceLike(voice)) {
      const spoken: HoloTapEvent = { zone: null, confidence: 0, reason: 'voice', features, ignoredByInput: false }
      for (const listener of this.tapListeners) listener(spoken)
      return
    }

    if (this.pendingCapture) {
      const { resolve } = this.pendingCapture
      this.pendingCapture = null
      resolve(features)
      return
    }

    const calibration = this.calibration
    if (!calibration) return
    if (calibration.layout !== this.layout || calibration.scale.length !== features.length) {
      const mismatch: HoloTapEvent = { zone: null, confidence: 0, reason: 'no-calibration', features, ignoredByInput: false }
      for (const listener of this.tapListeners) listener(mismatch)
      return
    }
    const result = classifyZone(features, calibration.zones, calibration.scale, {
      peakDb: this.lastTapPeakDb,
      range: calibration.levelRange
    })
    for (const listener of this.tapListeners) listener({ ...result, features, ignoredByInput: false })
  }
}

const NO_BUILT_IN_MIC_MESSAGE =
  "No built-in laptop microphone was found. Holo locates taps relative to your laptop's own mic, so it doesn't use headsets, USB or webcam mics. If this computer has no built-in mic, enable \"Allow an external microphone\" below."

/** Turns a getUserMedia failure into something a person can act on. */
function describeMicError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access was blocked. Allow microphone access for Noma in Windows Settings > Privacy & security > Microphone, then try again.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone was found. Plug one in (or enable your built-in mic) and try again.'
  }
  if (name === 'NotReadableError') {
    return 'The microphone is busy or unavailable. Close other apps using it and try again.'
  }
  return error instanceof Error ? error.message : 'Microphone access failed.'
}
