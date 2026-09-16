import { useEffect, useState } from 'react'
import { useHoloStore, type CalibrationProgress } from '../stores/holoStore'
import { useFlowStore } from '../stores/flowStore'
import { HoloZoneTile } from '../components/HoloZoneTile'
import { AppIcon } from '../components/AppIcon'
import { HOLO_ZONE_LABELS, HOLO_ZONE_ORDER } from '@shared/constants'
import type { HoloZone } from '@shared/types'

/** Taps/samples per zone (and per the final reject step) — more than
 *  Holo's own README default (10/zone) would be more accurate but a much
 *  longer wizard; fewer is faster but noisier. A middle ground for a first,
 *  simplified pass — see classifier.ts's doc comment on why this whole
 *  feature is a deliberately simplified stand-in for Holo's real pipeline. */
const TAPS_PER_ZONE = 6
/** How long a zone tile stays visibly flashed after a recognized tap. */
const FLASH_MS = 500

type WizardState =
  | { status: 'idle' }
  | ({ status: 'running' } & CalibrationProgress)
  | { status: 'error'; message: string }

export function Holo() {
  const {
    inputSource,
    calibration,
    isListening,
    isCalibrating,
    micError,
    lastTap,
    refresh,
    startListening,
    stopListening,
    calibrate,
    clearCalibration
  } = useHoloStore()
  const { context, refresh: refreshContext, subscribeToContext } = useFlowStore()
  const [wizard, setWizard] = useState<WizardState>({ status: 'idle' })
  const [flashingZone, setFlashingZone] = useState<HoloZone | null>(null)

  useEffect(() => {
    refresh()
    refreshContext()
    return subscribeToContext()
  }, [refresh, refreshContext, subscribeToContext])

  // Stop listening when navigating away mid-test — this page is the only
  // place that starts it today (a background auto-start tied to
  // inputSource is a documented next step, not implemented yet), so
  // leaving it running unattended after leaving the page would be
  // surprising, not helpful.
  useEffect(() => stopListening, [stopListening])

  useEffect(() => {
    if (!lastTap?.zone) return
    setFlashingZone(lastTap.zone)
    const timeout = window.setTimeout(() => setFlashingZone(null), FLASH_MS)
    return () => window.clearTimeout(timeout)
  }, [lastTap])

  const calibratedZones = new Set(calibration?.zones.map((zone) => zone.zone) ?? [])
  const isFullyCalibrated = HOLO_ZONE_ORDER.every((zone) => calibratedZones.has(zone))

  const runCalibration = async (): Promise<void> => {
    stopListening()
    try {
      await calibrate(TAPS_PER_ZONE, (progress) => setWizard({ status: 'running', ...progress }))
      // calibrate() catches its own errors into micError rather than
      // throwing — check it here instead of a try/catch around a promise
      // that never rejects.
      const failure = useHoloStore.getState().micError
      setWizard(failure ? { status: 'error', message: failure } : { status: 'idle' })
    } catch (error) {
      setWizard({ status: 'error', message: error instanceof Error ? error.message : 'Calibration failed' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8">
        <h1 className="font-display text-xl font-semibold text-neutral-100">Holo</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          No physical keyboard needed — tap the desk around your laptop in one of four zones and
          Noma presses the matching control, exactly as if a real button were pressed. Free, and
          listens only while this is your chosen input (Settings) or you're testing it here.
        </p>
      </div>

      {inputSource !== 'holo' && (
        <div className="mb-6 rounded-lg border border-base-700 bg-base-900 px-4 py-3 text-xs text-neutral-600">
          Input Source is currently <span className="text-neutral-100">Keyboard</span> — Holo still
          works here for testing, but won't fire outside this page until you switch Input Source to
          Holo in Settings.
        </div>
      )}

      {/* Holo's own self-contained dark surface — "a piece of Noma
          hardware translated into software," deliberately not the app's
          light canvas. Uses the dedicated `holo` color group, never
          `base`/`neutral`, so it stays dark regardless of the app theme. */}
      <div className="rounded-2xl bg-holo-bg p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-holo-muted">
            {context.application && (
              <AppIcon applicationId={context.application.id} name={context.application.name} size={16} />
            )}
            {context.application ? context.application.name : 'No application detected'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void runCalibration()}
              disabled={isCalibrating}
              className="rounded-full border border-holo-border px-3 py-1 text-[11px] text-holo-text/80 hover:border-holo-text/30 hover:text-holo-text disabled:opacity-40"
            >
              {calibration ? 'Recalibrate' : 'Calibrate'}
            </button>
            {calibration && (
              <button
                type="button"
                onClick={() => void clearCalibration()}
                disabled={isCalibrating}
                className="rounded-full border border-holo-border px-3 py-1 text-[11px] text-holo-muted hover:border-holo-text/30 hover:text-holo-text disabled:opacity-40"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => void (isListening ? stopListening() : startListening())}
              disabled={!isFullyCalibrated || isCalibrating}
              className={`rounded-full border px-3 py-1 text-[11px] disabled:opacity-40 ${
                isListening
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-holo-border text-holo-text/80 hover:border-holo-text/30 hover:text-holo-text'
              }`}
            >
              {isListening ? 'Listening…' : 'Start Listening'}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          {HOLO_ZONE_ORDER.map((zone, index) => (
            <HoloZoneTile
              key={zone}
              zone={zone}
              slot={index + 1}
              control={context.profile?.controls.find((control) => control.slot === index + 1)}
              isCalibrated={calibratedZones.has(zone)}
              isFlashing={flashingZone === zone}
            />
          ))}
        </div>

        {wizard.status === 'running' && wizard.phase === 'zone' && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/[0.08] px-4 py-3 text-sm text-holo-text">
            Zone {wizard.zoneIndex + 1} of {wizard.totalZones} — {HOLO_ZONE_LABELS[wizard.zone]}: tap it now
            (tap {wizard.tapIndex + 1} of {TAPS_PER_ZONE})
          </div>
        )}
        {wizard.status === 'running' && wizard.phase === 'reject' && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/[0.08] px-4 py-3 text-sm text-holo-text">
            Almost done — now type on your keyboard, click your mouse, or make other normal sounds so
            Holo learns to ignore them (sample {wizard.sampleIndex + 1} of {wizard.totalSamples})
          </div>
        )}
        {(wizard.status === 'error' || micError) && (
          // A brighter red than the app-wide `error` token (chosen for
          // light surfaces) on purpose — this sits on Holo's own dark
          // surface, where a muted light-mode red would read too dim.
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
            {wizard.status === 'error' ? wizard.message : micError}
          </div>
        )}

        <p className="text-xs text-holo-muted">
          Holo only ever processes audio in memory to recognize a tap's zone — nothing is recorded
          or saved. Calibration (including the reject step, so Holo learns to ignore keyboard/mouse
          sounds) stores a small set of numbers describing each sound, never audio itself. See
          docs/privacy-and-legal.md.
        </p>
      </div>
    </div>
  )
}
