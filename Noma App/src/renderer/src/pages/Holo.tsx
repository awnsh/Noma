import { useEffect, useState } from 'react'
import { useHoloStore, type CalibrationProgress, type TapOutcome } from '../stores/holoStore'
import { useFlowStore } from '../stores/flowStore'
import { HoloZoneTile } from '../components/HoloZoneTile'
import { AppIcon } from '../components/AppIcon'
import { getHoloZoneLabel } from '@shared/constants'
import type { HoloZone } from '@shared/types'
import type { HoloSensitivity } from '../lib/holo/classifier'

/** Taps per zone: more is more accurate but a longer wizard. */
const TAPS_PER_ZONE = 8
/** How long a zone tile stays visibly flashed after a recognized tap. */
const FLASH_MS = 500

type WizardState =
  | { status: 'idle' }
  | ({ status: 'running' } & CalibrationProgress)
  | { status: 'error'; message: string }

const OUTCOME_MESSAGES: Record<TapOutcome, string> = {
  pressed: 'Recognized. Control pressed.',
  'no-control': 'Recognized, but this zone has no control assigned in the current app.',
  'ignored-input': 'Ignored: that sound came with a key press or mouse click.',
  unrecognized: "Heard a sound that didn't match any zone. Tap with a knuckle on the desk, or recalibrate.",
  ambiguous: 'Heard a tap between two zones. Tap closer to the middle of a zone, or recalibrate.',
  'layout-changed': 'Your microphone setup changed since calibration. Recalibrate to continue.'
}

const SENSITIVITY_OPTIONS: Array<{ value: HoloSensitivity; label: string }> = [
  { value: 'low', label: 'Firm taps' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'Light taps' }
]

export function Holo() {
  const {
    inputSource,
    calibration,
    isListening,
    isCalibrating,
    micError,
    lastTap,
    mics,
    availableMics,
    allowExternalMic,
    sensitivity,
    level,
    pausedForTyping,
    layoutMismatch,
    laptop,
    zoneOverride,
    zoneCount,
    zoneReason,
    setZoneOverride,
    micSide,
    micSideReason,
    sideOverride,
    setSideOverride,
    activeZones,
    setSensitivity,
    setAllowExternalMic,
    refreshAvailableMics,
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

  useEffect(() => {
    void refreshAvailableMics()
  }, [refreshAvailableMics])

  // Holo exists to work while the user is in *other* apps, so listening
  // survives leaving this page when Holo is the chosen Input Source. As a
  // test-only session (Input Source = Keyboard) it still stops on leave, so
  // the mic is never left open unattended.
  useEffect(
    () => () => {
      if (useHoloStore.getState().inputSource !== 'holo') stopListening()
    },
    [stopListening]
  )

  useEffect(() => {
    if (!lastTap?.zone) return
    setFlashingZone(lastTap.zone)
    const timeout = window.setTimeout(() => setFlashingZone(null), FLASH_MS)
    return () => window.clearTimeout(timeout)
  }, [lastTap])

  const calibratedZones = new Set(calibration?.zones.map((zone) => zone.zone) ?? [])
  const isFullyCalibrated =
    activeZones.every((zone) => calibratedZones.has(zone)) && calibratedZones.size === activeZones.length

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
          No physical keyboard needed. Tap the desk around your laptop in one of four zones and
          Noma presses the matching control, exactly as if a real button were pressed. Free, and
          keeps listening in the background while Holo is your chosen input (Settings).
        </p>
      </div>

      {inputSource !== 'holo' && (
        <div className="mb-6 rounded-lg border border-base-700 bg-base-900 px-4 py-3 text-xs text-neutral-600">
          Input Source is currently <span className="text-neutral-100">Keyboard</span>. Holo still
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
          <div className="flex items-center gap-2.5">
            {context.application && (
              <AppIcon applicationId={context.application.id} name={context.application.name} size={26} variant="tile" />
            )}
            <span className="text-sm text-holo-text">
              {context.application ? context.application.name : 'No application detected'}
            </span>
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
          {activeZones.map((zone, index) => (
            <HoloZoneTile
              key={zone}
              zone={zone}
              slot={index + 1}
              zoneCount={zoneCount}
              control={context.profile?.controls.find((control) => control.slot === index + 1)}
              isCalibrated={calibratedZones.has(zone)}
              isFlashing={flashingZone === zone}
            />
          ))}
        </div>

        {wizard.status === 'running' && wizard.phase === 'side' && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/[0.08] px-4 py-3 text-sm text-holo-text">
            Finding your microphone. Tap the desk at the far {wizard.edge.toUpperCase()} edge of your laptop, level
            with the keyboard (tap {wizard.tapIndex + 1} of {wizard.totalTaps})
          </div>
        )}
        {wizard.status === 'running' && wizard.phase === 'zone' && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/[0.08] px-4 py-3 text-sm text-holo-text">
            Zone {wizard.zoneIndex + 1} of {wizard.totalZones}: {getHoloZoneLabel(wizard.zone, zoneCount)}, tap it now
            (tap {wizard.tapIndex + 1} of {TAPS_PER_ZONE}). Vary your force and spot a little within the zone,
            so Holo learns how much your taps naturally differ.
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

        {isListening && (
          <div className="mb-4 space-y-3 rounded-lg border border-holo-border px-4 py-3 text-xs text-holo-muted">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0">Input level</span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-holo-border">
                <div
                  className={`h-full rounded-full transition-[width] duration-75 ${level >= 1 ? 'bg-accent' : 'bg-holo-text/40'}`}
                  style={{ width: `${Math.min(100, (level / 1.5) * 100)}%` }}
                />
                <div className="absolute inset-y-0 w-px bg-holo-text/60" style={{ left: `${(1 / 1.5) * 100}%` }} />
              </div>
            </div>
            <div>
              {pausedForTyping ? (
                <span className="text-holo-text">Mic paused while you type or click. </span>
              ) : (
                <>Mic on. It switches off while you type or click so those sounds are never heard. </>
              )}
              Listening on the built-in microphone
              {mics[0] && <> ({mics[0].label})</>}
              {mics[0]?.kind === 'external' && (
                <span className="text-amber-200">. This is an external mic, so zone accuracy is not guaranteed.</span>
              )}
            </div>
            {lastTap && (
              <div className={lastTap.outcome === 'pressed' ? 'text-accent' : ''}>
                {OUTCOME_MESSAGES[lastTap.outcome]}
              </div>
            )}
          </div>
        )}

        {calibration && !isCalibrating && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-xs ${
              calibration.accuracy < 0.75 ? 'border-amber-400/30 text-amber-200' : 'border-holo-border text-holo-muted'
            }`}
          >
            Calibration accuracy: {Math.round(calibration.accuracy * 100)}%.
            {calibration.accuracy < 0.75 &&
              ' Some zones sound too alike on this setup. Recalibrate with firmer, more distinct taps, spaced further apart on the desk, or add a second microphone.'}
          </div>
        )}
        {layoutMismatch && (
          <div className="mb-4 rounded-lg border border-amber-400/30 px-4 py-3 text-xs text-amber-200">
            Your microphone setup changed since you calibrated. Recalibrate so Holo can recognize taps.
          </div>
        )}

        {calibration && !isCalibrating && !isFullyCalibrated && (
          <div className="mb-4 rounded-lg border border-amber-400/30 px-4 py-3 text-xs text-amber-200">
            Your zones changed since you calibrated (zone count or microphone side). Recalibrate to continue.
          </div>
        )}

        <div className="mb-4 space-y-2 text-xs text-holo-muted">
          <div>
            {laptop?.model ? (
              <>
                Detected <span className="text-holo-text">{`${laptop.manufacturer} ${laptop.model}`.trim()}</span>.{' '}
              </>
            ) : (
              'Could not identify this computer. '
            )}
            Using <span className="text-holo-text">{zoneCount} zones</span>: {zoneReason}.
            {zoneCount === 2 && (
              <>
                {' '}
                Microphone is on the <span className="text-holo-text">{micSide}</span> ({micSideReason}), so both
                zones sit on that side, top and bottom.
              </>
            )}
          </div>
          {zoneCount === 2 && (
            <div className="flex items-center gap-2">
              <span>Mic side</span>
              {(['auto', 'left', 'right'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={isCalibrating}
                  onClick={() => setSideOverride(option)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] capitalize disabled:opacity-40 ${
                    sideOverride === option
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-holo-border hover:border-holo-text/30 hover:text-holo-text'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span>Zones</span>
            {(['auto', 2, 4] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={isCalibrating}
                onClick={() => setZoneOverride(option)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] disabled:opacity-40 ${
                  zoneOverride === option
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-holo-border hover:border-holo-text/30 hover:text-holo-text'
                }`}
              >
                {option === 'auto' ? 'Auto' : option}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-holo-muted">
          <span>Tap strength</span>
          <div className="flex gap-1.5">
            {SENSITIVITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSensitivity(option.value)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                  sensitivity === option.value
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-holo-border hover:border-holo-text/30 hover:text-holo-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 text-xs text-holo-muted">
          <div>
            Holo only uses your laptop's built-in microphone, never a headset, USB or webcam mic, because
            taps are located relative to it.
            {availableMics.some((mic) => mic.kind === 'external') && ' Ignoring: '}
            {availableMics
              .filter((mic) => mic.kind === 'external')
              .map((mic) => mic.label)
              .join(', ')}
          </div>
          <label className="mt-1.5 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowExternalMic}
              onChange={(event) => void setAllowExternalMic(event.target.checked)}
              disabled={isCalibrating}
            />
            <span>Allow an external microphone (only if this computer has no built-in mic)</span>
          </label>
        </div>

        <p className="text-xs text-holo-muted">
          Holo processes audio in memory only to recognize a tap's zone,
          nothing is recorded or saved; calibration stores a small set of numbers, never audio. While
          listening it also notices <em>when</em> you press a key or click (never which) so typing and
          clicking are never mistaken for taps: the mic is switched off entirely while you type or click, and back on a moment after you stop. See docs/privacy-and-legal.md.
        </p>
      </div>
    </div>
  )
}
