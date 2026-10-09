/**
 * Distinguishes a real user app switch from one Noma made itself: the
 * app-switch counterpart to selfInjectedKeys.ts and selfInjectedClicks.ts.
 *
 * A macro's `focusApplication` step (actionExecutor.ts's
 * focusApplicationById) brings another app to the front. The foreground
 * watcher (contextService) can't tell that apart from the user Alt-Tabbing,
 * so main/index.ts's onContextChanged listener would record it as a genuine
 * `appSwitch` workflow event, and pattern detection would then "learn" Noma
 * replaying its own workflow as something the user keeps doing; the same
 * self-echo the key and click guards exist to stop.
 *
 * markExpectedAppSwitch() is called right before Noma focuses an app;
 * consumeExpectedAppSwitch() (from the onContextChanged listener) consumes
 * one matching, still-live mark. Per-application, so a switch into some
 * *other* app in the meantime is still recorded as the user's own. Marks
 * expire quickly regardless: the foreground watcher polls every ~400 ms and
 * macOS activation can take over a second, so the TTL covers that, but a
 * focus that never actually lands must never leave a stale mark that
 * swallows a real switch the user makes later.
 */

const EXPECTED_SWITCH_TTL_MS = 3000

interface PendingSwitch {
  applicationId: string
  expiresAt: number
}

let pending: PendingSwitch[] = []

/** Call immediately before Noma itself brings `applicationId` to the front. */
export function markExpectedAppSwitch(applicationId: string, ttlMs = EXPECTED_SWITCH_TTL_MS): void {
  const now = Date.now()
  pending = pending.filter((entry) => entry.expiresAt > now)
  pending.push({ applicationId, expiresAt: now + ttlMs })
}

/**
 * Reports whether a switch into `applicationId` right now was one Noma made
 * itself, and consumes that mark if so; call once per observed switch,
 * before recording it as user behaviour.
 */
export function consumeExpectedAppSwitch(applicationId: string | null): boolean {
  if (applicationId === null) return false
  const now = Date.now()
  pending = pending.filter((entry) => entry.expiresAt > now)
  const index = pending.findIndex((entry) => entry.applicationId === applicationId)
  if (index === -1) return false
  pending.splice(index, 1)
  return true
}

/** Drops every pending mark (factory reset, and between tests). */
export function clearExpectedAppSwitches(): void {
  pending = []
}
