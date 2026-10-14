import { useEffect, useMemo, useState } from 'react'
import type { ApplicationProfile, ApplicationProfileSummary } from '@shared/types'
import { GLIDE_ZONE_LABELS, GLIDE_ZONE_SLOTS } from '@shared/constants'
import { useGlideStore } from '../stores/glideStore'
import { useFlowStore } from '../stores/flowStore'
import { GlideZoneMap, isEmptyControl } from './GlideZoneMap'
import { ControlEditorModal } from './ControlEditorModal'
import { OnboardingButton } from './OnboardingButton'

interface OnboardingFirstActionScreenProps {
  onFinish: () => void
}

/** Apps to suggest first: the one you were just in, then a browser, then
 *  any other app with actions. */
function pickDefaultApp(apps: ApplicationProfileSummary[], currentAppId: string | null): string | null {
  const withProfile = apps.filter((entry) => entry.hasProfile)
  return (
    withProfile.find((entry) => entry.application.id === currentAppId)?.application.id ??
    withProfile.find((entry) => entry.application.id === 'chrome')?.application.id ??
    withProfile[0]?.application.id ??
    null
  )
}

/**
 * Screen 4: one real action, done for real. Pick an app, see (or change)
 * what its zones do, switch to it and swipe. The screen waits for main to
 * report a swipe that actually ran something, then says what ran and where.
 * Finishing early is always allowed.
 */
export function OnboardingFirstActionScreen({ onFinish }: OnboardingFirstActionScreenProps) {
  const { state, lastActivity } = useGlideStore()
  const { context, refresh: refreshContext, subscribeToContext } = useFlowStore()
  const [apps, setApps] = useState<ApplicationProfileSummary[]>([])
  const [chosenAppId, setChosenAppId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ApplicationProfile | null>(null)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [startedAt] = useState(Date.now())

  useEffect(() => {
    void refreshContext()
    void window.flow.listApplicationProfileSummaries().then(setApps)
    return subscribeToContext()
  }, [refreshContext, subscribeToContext])

  const appId = chosenAppId ?? pickDefaultApp(apps, context.application?.id ?? null)
  const app = apps.find((entry) => entry.application.id === appId)?.application ?? null
  const appChoices = useMemo(() => apps.filter((entry) => entry.hasProfile).slice(0, 6), [apps])

  const loadProfile = async (): Promise<void> => {
    setProfile(appId ? await window.flow.getProfileForApplication(appId) : null)
  }
  useEffect(() => {
    void loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  const success =
    lastActivity && lastActivity.at >= startedAt && lastActivity.type === 'fire' && lastActivity.outcome === 'pressed'
      ? lastActivity
      : null
  const zoneCount = state?.zoneCount ?? 4
  const firstZone = profile
    ? (['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).find(
        (zone) => (zoneCount === 4 || zone.startsWith('top')) && !isEmptyControl(profile.controls.find((c) => c.slot === GLIDE_ZONE_SLOTS[zone]))
      )
    : undefined
  const firstControl = firstZone && profile?.controls.find((c) => c.slot === GLIDE_ZONE_SLOTS[firstZone])
  const glideOn = Boolean(state?.enabled)

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-3xl font-semibold text-neutral-50">
        {success ? 'It worked.' : 'Your first action'}
      </h1>

      {success ? (
        <p className="mt-3 max-w-md text-sm text-neutral-300">
          “{success.controlLabel}” ran in {success.applicationName}, from the{' '}
          {GLIDE_ZONE_LABELS[zoneCount][success.zone].toLowerCase()} zone. That&apos;s Glide: four actions in every app,
          and Flow adds your own as it notices them.
        </p>
      ) : glideOn ? (
        <p className="mt-3 max-w-md text-sm text-neutral-400">
          Every app has its own four. Pick one you use, change any zone if you like, then switch to it and swipe.
        </p>
      ) : (
        <p className="mt-3 max-w-md text-sm text-neutral-400">
          Glide is off, so there&apos;s nothing to try right now. This is what it would do; you can turn it on later from
          the Glide page or the tray icon.
        </p>
      )}

      {!success && (
        <>
          {appChoices.length > 1 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="App">
              {appChoices.map((entry) => (
                <button
                  key={entry.application.id}
                  type="button"
                  onClick={() => setChosenAppId(entry.application.id)}
                  aria-pressed={entry.application.id === appId}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    entry.application.id === appId
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-base-700 text-neutral-400 hover:text-neutral-100'
                  }`}
                >
                  {entry.application.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 w-full">
            {profile && app ? (
              <div className="mx-auto max-w-md">
                <GlideZoneMap zoneCount={zoneCount} controls={profile.controls} onEditZone={setEditingSlot} centerLabel={app.name} centerAppId={app.id} />
              </div>
            ) : (
              <p className="py-8 text-sm text-holo-muted">No app with actions yet. You can set one up on the Glide page.</p>
            )}
          </div>

          {glideOn && app && firstZone && firstControl && (
            <ol className="mt-5 max-w-md space-y-1 text-left text-sm text-neutral-300">
              <li>1. Switch to {app.name} (open it first if it isn&apos;t running).</li>
              <li>
                2. Swipe in from the {GLIDE_ZONE_LABELS[zoneCount][firstZone].toLowerCase()}: “{firstControl.label}”.
              </li>
              <li>3. Come back here.</li>
            </ol>
          )}
          {glideOn && lastActivity && lastActivity.at >= startedAt && lastActivity.type === 'fire' && lastActivity.outcome !== 'pressed' && (
            <p className="mt-3 max-w-md text-xs text-neutral-500">
              {lastActivity.outcome === 'practice'
                ? 'That swipe was recognised, but Noma was in front, so it was practice. Switch to the app first.'
                : lastActivity.outcome === 'no-control'
                  ? `Recognised, but that zone has nothing set in ${lastActivity.applicationName ?? 'that app'}.`
                  : 'Recognised, but nothing ran. Try once more in the app.'}
            </p>
          )}
        </>
      )}

      <div className="mt-8">
        <OnboardingButton onClick={onFinish}>{success ? 'Start using Noma' : 'Finish setup'}</OnboardingButton>
      </div>

      {editingSlot !== null && app && profile && (
        <ControlEditorModal
          applicationId={app.id}
          applicationName={app.name}
          slot={editingSlot}
          control={profile.controls.find((control) => control.slot === editingSlot)}
          onClose={() => setEditingSlot(null)}
          onSaved={() => void loadProfile()}
        />
      )}
    </div>
  )
}
