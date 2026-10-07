import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ApplicationProfile,
  ApplicationProfileSummary,
  HoloTrackpadZoneCount,
  MacEdgeSwipeState
} from '@shared/types'
import type { GlideZoneName } from '@shared/constants'
import { useGlideStore } from '../stores/glideStore'
import { useFlowStore } from '../stores/flowStore'
import { GlideGestureDemo } from '../components/GlideGestureDemo'
import { GlideZoneMap } from '../components/GlideZoneMap'
import { GlideTouchCheck } from '../components/GlideTouchCheck'
import { ControlEditorModal } from '../components/ControlEditorModal'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { AppIcon } from '../components/AppIcon'
import { glideActivityMessage, glideStatusLine } from '../lib/glideMessages'

const ZONE_COUNT_OPTIONS: Array<{ value: HoloTrackpadZoneCount; label: string; hint: string }> = [
  { value: 4, label: 'Four zones', hint: 'Upper and lower half of each side' },
  { value: 2, label: 'Two zones', hint: 'Left and right, easier to hit' }
]

/**
 * Glide: turn it on, see the gesture, and see (and change) what each zone
 * runs in each app. This is the one place the four actions per app are laid
 * out against the trackpad they're triggered from; a workflow saved from
 * Flow shows up here on the zone it was put on.
 */
export function Glide() {
  const { state, lastActivity, isChanging, refresh, setEnabled, setZoneCount } = useGlideStore()
  const { context, refresh: refreshContext, subscribeToContext } = useFlowStore()
  const [apps, setApps] = useState<ApplicationProfileSummary[]>([])
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ApplicationProfile | null | undefined>(undefined)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [flashing, setFlashing] = useState<GlideZoneName | null>(null)
  // macOS opens Notification Center on a swipe from the right edge, which fights Glide's right zones.
  const [edgeSwipe, setEdgeSwipe] = useState<MacEdgeSwipeState | null>(null)
  const [edgeSwipeJustOff, setEdgeSwipeJustOff] = useState(false)

  useEffect(() => {
    void refresh()
    void refreshContext()
    void window.flow.listApplicationProfileSummaries().then(setApps)
    void window.flow.getMacEdgeSwipe().then((value) => setEdgeSwipe(value ?? null))
    return subscribeToContext()
  }, [refresh, refreshContext, subscribeToContext])

  // Follow the app you were last in, until you pick one yourself.
  const appId = selectedAppId ?? context.application?.id ?? apps.find((entry) => entry.hasProfile)?.application.id ?? null
  const app = apps.find((entry) => entry.application.id === appId)?.application ?? context.application

  const loadProfile = useCallback(async () => {
    setProfile(appId ? await window.flow.getProfileForApplication(appId) : null)
  }, [appId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile, context])

  // Light up the zone that was just recognised.
  useEffect(() => {
    if (!lastActivity || lastActivity.type !== 'fire') return
    setFlashing(lastActivity.zone)
    const timeout = window.setTimeout(() => setFlashing(null), 700)
    return () => window.clearTimeout(timeout)
  }, [lastActivity])

  const status = glideStatusLine(state)
  const zoneCount = state?.zoneCount ?? 4
  const unavailable = state ? !state.platformSupported : false
  const sortedApps = useMemo(
    () =>
      [...apps].sort(
        (a, b) => Number(b.hasProfile) - Number(a.hasProfile) || a.application.name.localeCompare(b.application.name)
      ),
    [apps]
  )

  // Read the zone fresh from the saved profile each time the editor opens, so
  // it can never show a control from before the last save.
  const openZone = async (slot: number): Promise<void> => {
    if (appId) setProfile(await window.flow.getProfileForApplication(appId))
    setEditingSlot(slot)
  }

  const toggleEdgeSwipe = async (): Promise<void> => {
    if (!edgeSwipe) return
    const next = await window.flow.setMacEdgeSwipe(!edgeSwipe.enabled)
    setEdgeSwipe(next)
    setEdgeSwipeJustOff(!next.enabled)
  }

  const setUpApp = async (): Promise<void> => {
    if (!app) return
    await window.flow.createProfileForApplication(app, app.name)
    setApps(await window.flow.listApplicationProfileSummaries())
    await loadProfile()
  }

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-neutral-100">Glide</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Slide a finger from the palm rest onto your trackpad to run an action in the app you&apos;re using. Four
            actions per app, no extra hardware.
          </p>
        </div>
        {!unavailable && (
          <div className="flex shrink-0 items-center gap-3 pt-1">
            <span className="text-sm text-neutral-400">{state?.enabled ? 'On' : 'Off'}</span>
            <ToggleSwitch
              checked={Boolean(state?.enabled)}
              onChange={(checked) => void setEnabled(checked)}
              label="Glide"
            />
          </div>
        )}
      </header>

      {/* macOS only: `supported` is false on every other system, so nothing shows there. */}
      {edgeSwipe?.supported && state?.enabled && (edgeSwipe.enabled || edgeSwipeJustOff) && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border border-base-700 bg-base-900 px-4 py-3 text-sm text-neutral-300">
          <p>
            {edgeSwipe.enabled
              ? 'macOS opens Notification Center when a swipe starts at the right edge. That clashes with Glide’s right zones.'
              : 'Turned off. If a right-edge swipe still opens it, log out and back in.'}
          </p>
          <button
            type="button"
            onClick={() => void toggleEdgeSwipe()}
            className="shrink-0 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:border-accent-muted"
          >
            {edgeSwipe.enabled ? 'Turn it off' : 'Turn back on'}
          </button>
        </div>
      )}

      {(isChanging || status.tone === 'problem') && (
        <div
          className={`mb-8 rounded-lg border px-4 py-3 text-sm ${
            status.tone === 'problem'
              ? 'border-error/30 bg-error-muted text-neutral-100'
              : 'border-base-700 bg-base-900 text-neutral-400'
          }`}
          role="status"
        >
          {isChanging ? 'Starting…' : status.text}
        </div>
      )}

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-neutral-100">What each zone does</h2>
                      </div>
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            {app && <AppIcon applicationId={app.id} name={app.name} size={24} fill />}
            <span className="sr-only">App</span>
            <select
              value={appId ?? ''}
              onChange={(event) => setSelectedAppId(event.target.value || null)}
              className="rounded-md border border-base-700 bg-base-900 px-2.5 py-1.5 text-sm text-neutral-100"
            >
              {!appId && <option value="">Choose an app</option>}
              {sortedApps.map((entry) => (
                <option key={entry.application.id} value={entry.application.id}>
                  {entry.application.name}
                  {entry.hasProfile ? '' : ' (not set up)'}
                  {entry.application.id === context.application?.id ? ' · last used' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl bg-holo-bg p-6">
          {profile === undefined ? (
            <p className="py-10 text-center text-sm text-holo-muted">Loading…</p>
          ) : profile && app ? (
            <GlideZoneMap
              zoneCount={zoneCount}
              controls={profile.controls}
              flashingZone={flashing}
              onEditZone={(slot) => void openZone(slot)}
              centerLabel={app.name}
            />
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-holo-text">
                {app ? `Noma has no actions for ${app.name} yet.` : 'Open an app, then come back here.'}
              </p>
              {app && (
                <button
                  type="button"
                  onClick={() => void setUpApp()}
                  className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                >
                  Set up {app.name}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-holo-muted">
            {ZONE_COUNT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => void setZoneCount(option.value)}
                title={option.hint}
                aria-pressed={zoneCount === option.value}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                  zoneCount === option.value
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-holo-border hover:border-holo-text/30 hover:text-holo-text'
                }`}
              >
                {option.label}
              </button>
            ))}
            {zoneCount === 2 && <span>The lower two actions aren&apos;t reachable with two zones.</span>}
          </div>

          <p className="mt-3 min-h-[1.25rem] text-xs text-holo-muted" aria-live="polite">
            {state?.enabled && lastActivity ? (
              <span className={lastActivity.type === 'fire' && lastActivity.outcome === 'pressed' ? 'text-accent' : ''}>
                {glideActivityMessage(lastActivity, zoneCount)}
              </span>
            ) : state?.enabled ? (
              'Waiting for a swipe-in.'
            ) : null}
          </p>
        </div>
      </section>

      <section className="mb-10 rounded-2xl bg-holo-bg p-6">
        <div className="grid items-center gap-6 sm:grid-cols-[1.1fr_1fr]">
          <GlideGestureDemo className="w-full" />
          <ul className="space-y-2.5 text-sm text-holo-text/90">
            <li>
              <span className="text-holo-text">Start on the palm rest,</span>{' '}
              <span className="text-holo-muted">not on the trackpad, and flick inward in one quick move.</span>
            </li>
            <li>
              <span className="text-holo-text">Which side and half</span>{' '}
              <span className="text-holo-muted">you land in picks the action.</span>
            </li>
            <li>
              <span className="text-holo-text">It never clicks.</span>{' '}
              <span className="text-holo-muted">The pointer is put back where it was.</span>
            </li>
            <li>
              <span className="text-holo-text">Ordinary use doesn&apos;t count:</span>{' '}
              <span className="text-holo-muted">pointer moves, scrolling, a palm, two fingers, or typing just before.</span>
            </li>
            <li>
              <span className="text-holo-text">Try it here safely.</span>{' '}
              <span className="text-holo-muted">While Noma is in front a swipe only lights up its zone; nothing runs.</span>
            </li>
          </ul>
        </div>
      </section>

      {!unavailable && (
        <details className="group mb-8 rounded-2xl bg-holo-bg p-6">
          <summary className="cursor-pointer list-none text-sm text-holo-text">
            <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">›</span>
            Touch check (optional diagnostics)
          </summary>
          <div className="mt-4">
            <GlideTouchCheck />
          </div>
        </details>
      )}

      <p className="max-w-2xl text-xs leading-relaxed text-neutral-600">
        Glide reads where your fingers are on the trackpad, in memory only, to recognise a swipe-in. Nothing is recorded
        except during a touch check you start. It also notices <em>when</em> a key is
        pressed (never which one), so a hand coming off the keyboard isn&apos;t mistaken for a swipe. Needs a Windows
        precision touchpad or a Mac trackpad; tested so far on one Windows laptop (ASUS ROG Zephyrus G14).
      </p>

      {editingSlot !== null && app && profile && (
        <ControlEditorModal
          key={`${app.id}:${editingSlot}`}
          applicationId={app.id}
          applicationName={app.name}
          slot={editingSlot}
          control={profile.controls.find((control) => control.slot === editingSlot)}
          onClose={() => setEditingSlot(null)}
          onSaved={loadProfile}
        />
      )}
    </div>
  )
}
