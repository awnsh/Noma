/** Start of the current local day, in epoch ms — the window used throughout
 *  the app for "today"'s actions/patterns/suggestions. */
export function startOfTodayMs(): number {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  return todayStart.getTime()
}
