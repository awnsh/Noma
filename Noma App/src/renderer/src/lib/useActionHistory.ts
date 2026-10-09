import { useEffect, useState } from 'react'
import type { ActionHistory, ControlRunStats } from '@shared/types'

/** Reads logs/actions.jsonl through main (read-only) and re-reads after
 *  every press, so what's shown is what the log really holds right now.
 *  Null until the first read comes back. */
export function useActionHistory(limit?: number): ActionHistory | null {
  const [history, setHistory] = useState<ActionHistory | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      void window.flow.getActionHistory(limit).then((next) => {
        if (!cancelled) setHistory(next)
      })
    }
    load()
    const unsubscribe = window.flow.onActionExecuted(load)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [limit])
  return history
}

/**
 * The most recent run across a set of controls, matched by controlId when
 * the log recorded one. Older log lines only carry a label, so a label
 * match is used too, but only for `macro` runs and only for labels the
 * caller says are unambiguous; a guess between two same-named controls
 * would show a failure that may not be this workflow's.
 */
export function latestRunFor(
  history: ActionHistory | null,
  controls: Array<{ controlId: string; label: string }>,
  unambiguousLabels: ReadonlySet<string>
): ControlRunStats | null {
  if (!history) return null
  let latest: ControlRunStats | null = null
  for (const stats of history.controls) {
    const matches = controls.some((control) =>
      stats.controlId
        ? stats.controlId === control.controlId
        : stats.actionType === 'macro' && stats.control === control.label && unambiguousLabels.has(control.label)
    )
    if (matches && (!latest || stats.lastAt > latest.lastAt)) latest = stats
  }
  return latest
}
