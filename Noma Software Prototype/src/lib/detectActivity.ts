import type { Activity } from '../data/appProfiles'

export interface DetectedActivity {
  id: string
  label: string
  contextLine: string
  controlIds: string[]
}

/** How many of the recent presses have to match an activity's signal
 *  controls before Noma calls it recognized — low enough to feel
 *  responsive within a short demo session, high enough that two
 *  unrelated clicks never falsely announce a pattern. */
const RECOGNITION_THRESHOLD = 2

/**
 * The core mechanism this prototype exists to demonstrate: not "VS Code is
 * focused" but "you're debugging inside VS Code," inferred from which
 * controls were actually reached for recently. Pure function over a
 * rolling window of recent control ids for the current app (see
 * store/nomaStore.ts's `recentPresses`) — ties are broken by whichever
 * activity is declared first, so authoring order doubles as priority.
 */
export function detectActivity(activities: Activity[], recentControlIds: string[]): DetectedActivity | null {
  if (recentControlIds.length === 0) return null

  let best: { activity: Activity; score: number } | null = null
  for (const activity of activities) {
    const score = recentControlIds.filter((id) => activity.signalControlIds.includes(id)).length
    if (score >= RECOGNITION_THRESHOLD && (!best || score > best.score)) {
      best = { activity, score }
    }
  }

  if (!best) return null
  return {
    id: best.activity.id,
    label: best.activity.label,
    contextLine: best.activity.contextLine,
    controlIds: best.activity.signalControlIds,
  }
}
