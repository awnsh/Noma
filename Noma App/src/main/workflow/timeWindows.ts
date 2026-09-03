/** Start of the given date's local day, in epoch ms. */
export function startOfDayMs(date: Date): number {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start.getTime()
}

/** Start of the current local day, in epoch ms — the window used throughout
 *  the app for "today"'s actions/patterns/suggestions. */
export function startOfTodayMs(): number {
  return startOfDayMs(new Date())
}

/** A local (not UTC) `YYYY-MM-DD` calendar-day key for `date` — used to
 *  bucket timestamps by the same local-day boundary `startOfDayMs` uses, so
 *  a day's activity always lines up with what the rest of the app considers
 *  "today"/"yesterday". */
export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
