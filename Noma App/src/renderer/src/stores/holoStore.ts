import { create } from 'zustand'
import type { HoloCalibration, HoloZone, InputSource } from '@shared/types'
import { HOLO_ZONE_ORDER } from '@shared/constants'
import { HoloCaptureEngine } from '../lib/holo/holoCapture'
import { averageFeatureVectors } from '../lib/holo/classifier'
import { useFlowStore } from './flowStore'

/**
 * One capture engine for the whole app's lifetime (not per-page) — Holo is
 * meant to work "in the background" while the user is in some other real
 * application, the entire point of a no-hardware input method, so it can't
 * be torn down just because the Holo page itself isn't the one currently
 * showing. Same singleton-module pattern main/index.ts uses for
 * captureService.
 */
const engine = new HoloCaptureEngine()

interface HoloStoreState {
  inputSource: InputSource
  calibration: HoloCalibration | null
  isLoading: boolean
  isListening: boolean
  isCalibrating: boolean
  /** Set on a failed start()/calibrate() (mic permission denied, no input
   *  device, etc.) — a real error to show, not silently pretending Holo is
   *  listening when it isn't. */
  micError: string | null
  /** The most recent classified tap, for the zone grid's live flash —
   *  `zone: null` still updates this (a tap was heard but not confidently
   *  matched), which is itself useful feedback during calibration testing. */
  lastTap: { zone: HoloZone | null; confidence: number } | null

  refresh: () => Promise<void>
  setInputSource: (source: InputSource) => Promise<void>
  startListening: () => Promise<void>
  stopListening: () => void
  /**
   * Walks the calibration wizard through all 4 zones (no paywall/tier gate
   * — every zone is available to everyone), `tapsPerZone` taps each, then
   * a final "reject" step — the user makes ordinary keyboard/typing/
   * ambient sounds so the classifier learns what *isn't* a desk tap (see
   * classifyZone's `rejectFeatures` param) — the direct fix for Holo
   * misfiring on keyboard clacks or other non-tap sounds. Reports progress
   * via `onProgress` so the UI can show "Zone 2 of 4 — tap 3 of 6" or "Now
   * type normally — sample 4 of 6." Saves the result and refreshes
   * `calibration` on success.
   */
  calibrate: (tapsPerZone: number, onProgress: (update: CalibrationProgress) => void) => Promise<void>
  clearCalibration: () => Promise<void>
}

export type CalibrationProgress =
  | { phase: 'zone'; zone: HoloZone; zoneIndex: number; totalZones: number; tapIndex: number }
  | { phase: 'reject'; sampleIndex: number; totalSamples: number }

export const useHoloStore = create<HoloStoreState>((set, get) => ({
  inputSource: 'keyboard',
  calibration: null,
  isLoading: true,
  isListening: false,
  isCalibrating: false,
  micError: null,
  lastTap: null,

  refresh: async () => {
    set({ isLoading: true })
    const [inputSource, calibration] = await Promise.all([
      window.flow.getInputSource(),
      window.flow.getHoloCalibration()
    ])
    engine.setCalibration(calibration)
    set({ inputSource, calibration, isLoading: false })
  },

  setInputSource: async (source) => {
    const resolved = await window.flow.setInputSource(source)
    set({ inputSource: resolved })
    // Switching back to Keyboard should stop listening — the mic has no
    // reason to stay engaged once Holo is no longer the chosen input.
    if (resolved !== 'holo') get().stopListening()
  },

  startListening: async () => {
    if (engine.isRunning) {
      set({ isListening: true })
      return
    }
    set({ micError: null })
    try {
      await engine.start()
      set({ isListening: true })
    } catch (error) {
      set({ micError: error instanceof Error ? error.message : 'Microphone access failed' })
    }
  },

  stopListening: () => {
    engine.stop()
    set({ isListening: false, lastTap: null })
  },

  calibrate: async (tapsPerZone, onProgress) => {
    const zones = HOLO_ZONE_ORDER
    const totalZones = zones.length
    set({ isCalibrating: true, micError: null })

    try {
      if (!engine.isRunning) await engine.start()
      set({ isListening: true })

      const profiles: HoloCalibration['zones'] = []
      for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex++) {
        const zone = zones[zoneIndex]
        const taps: number[][] = []
        for (let tapIndex = 0; tapIndex < tapsPerZone; tapIndex++) {
          onProgress({ phase: 'zone', zone, zoneIndex, totalZones, tapIndex })
          taps.push(await engine.captureNextTap())
        }
        profiles.push({ zone, features: averageFeatureVectors(taps), sampleCount: taps.length })
      }

      // The reject step: same capture mechanism, pointed at whatever the
      // user makes happen instead of a desk tap (typing, a mouse click) —
      // reusing captureNextTap means no new detection logic is needed, it's
      // the exact same onset detector, just labeled as "not a zone" rather
      // than "zone N" once averaged.
      const rejectSamples: number[][] = []
      for (let sampleIndex = 0; sampleIndex < tapsPerZone; sampleIndex++) {
        onProgress({ phase: 'reject', sampleIndex, totalSamples: tapsPerZone })
        rejectSamples.push(await engine.captureNextTap())
      }
      const reject = { features: averageFeatureVectors(rejectSamples), sampleCount: rejectSamples.length }

      const saved = await window.flow.saveHoloCalibration({ zones: profiles, reject, calibratedAt: Date.now() })
      engine.setCalibration(saved)
      set({ calibration: saved })
    } catch (error) {
      set({ micError: error instanceof Error ? error.message : 'Calibration failed' })
    } finally {
      set({ isCalibrating: false })
    }
  },

  clearCalibration: async () => {
    await window.flow.clearHoloCalibration()
    engine.setCalibration(null)
    set({ calibration: null })
  }
}))

// Wired once, for the engine's entire lifetime — not per start()/stop()
// cycle, so toggling listening on and off repeatedly can never accumulate
// duplicate listeners (and therefore duplicate presses per tap). See
// HoloCaptureEngine's own doc comment: it only ever emits onTap while
// genuinely listening, so this is a safe no-op the rest of the time.
engine.onTap(({ zone, confidence }) => {
  useHoloStore.setState({ lastTap: { zone, confidence } })
  if (!zone || confidence <= 0) return

  // Which control this zone maps to depends on whichever application is
  // currently focused — the exact same 4 slots the physical/virtual
  // keyboard already uses, read live from flowStore rather than duplicated
  // here, so Holo and the keyboard can never disagree about "what's in
  // slot N right now."
  const slot = HOLO_ZONE_ORDER.indexOf(zone) + 1
  const control = useFlowStore.getState().context.profile?.controls.find((item) => item.slot === slot)
  if (control) void window.flow.pressControl(control.id)
})
