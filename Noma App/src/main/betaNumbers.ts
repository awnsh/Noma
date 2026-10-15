import type { SuggestionStatus } from '@shared/types'
import { localDateKey } from './workflow/timeWindows'

/** How many local days back "days used" looks. */
export const DAYS_USED_WINDOW = 14
/** How many local days back the "recent suggestions" count looks. */
const RECENT_SUGGESTION_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export interface BetaNumbersInput {
  now: Date
  /** Epoch ms of non-demo workflow events in the last DAYS_USED_WINDOW days. */
  eventTimestamps: number[]
  /** Epoch ms of the oldest non-demo workflow event still stored, if any. */
  earliestEvent: number | null
  /** Non-demo suggestions: status and created_at in epoch SECONDS (SQLite unixepoch()). */
  suggestions: Array<{ status: SuggestionStatus; createdAt: number }>
  /** Parsed lines of logs/actions.jsonl, oldest first. */
  presses: Array<{ at: string; actionType: string; ok: boolean; reason?: string }>
  /** Reasons that aren't a real attempt (an empty Glide zone); left out of every count. */
  isSilentFailure: (reason: string | undefined) => boolean
  /** The reason a run gets when the tester stops it. */
  cancelledReason: string
}

/**
 * The "Beta numbers" block of the diagnostics report: the handful of counts
 * that say whether Flow is earning its place (are suggestions accepted, do
 * saved workflows finish, does the tester keep coming back). Counts and
 * dates only: never app names, shortcuts, control names or steps. Pure, so
 * it's testable without Electron or a database.
 */
export function summarizeBetaNumbers(input: BetaNumbersInput): string[] {
  const { now } = input
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const windowStart = today.getTime() - (DAYS_USED_WINDOW - 1) * DAY_MS

  const presses = input.presses.filter((press) => !input.isSilentFailure(press.reason))

  const days = new Set<string>()
  for (const at of input.eventTimestamps) if (at >= windowStart) days.add(localDateKey(new Date(at)))
  for (const press of presses) {
    const at = Date.parse(press.at)
    if (!Number.isNaN(at) && at >= windowStart) days.add(localDateKey(new Date(at)))
  }

  const byStatus = (status: SuggestionStatus): number => input.suggestions.filter((s) => s.status === status).length
  const recentStart = (today.getTime() - (RECENT_SUGGESTION_DAYS - 1) * DAY_MS) / 1000
  const recentSuggestions = input.suggestions.filter((s) => s.createdAt >= recentStart).length

  const runs = presses.filter((press) => press.actionType === 'macro')
  const others = presses.filter((press) => press.actionType !== 'macro')
  const stoppedByYou = runs.filter((run) => !run.ok && run.reason === input.cancelledReason).length
  const logSince = presses.length ? presses[0].at.slice(0, 10) : null

  return [
    'Beta numbers (counts only):',
    `  Days used in the last ${DAYS_USED_WINDOW}: ${days.size}`,
    `  Oldest learning data: ${input.earliestEvent === null ? 'none' : localDateKey(new Date(input.earliestEvent))}`,
    `  Suggestions made: ${input.suggestions.length} (last ${RECENT_SUGGESTION_DAYS} days: ${recentSuggestions})`,
    `    saved: ${byStatus('accepted')}, not now: ${byStatus('rejected')}, dismissed: ${byStatus('dismissed')}, waiting: ${byStatus('pending')}`,
    `  Saved workflow runs${logSince ? ` since ${logSince}` : ''}: ${runs.length}`,
    `    finished: ${runs.filter((run) => run.ok).length}, stopped at a step: ${
      runs.length - runs.filter((run) => run.ok).length - stoppedByYou
    }, stopped by you: ${stoppedByYou}`,
    `  Other control presses: ${others.length} (worked: ${others.filter((press) => press.ok).length})`
  ]
}
