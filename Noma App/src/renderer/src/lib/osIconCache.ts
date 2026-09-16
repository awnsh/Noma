import { useEffect, useState } from 'react'

/**
 * Renderer-side twin of the main process's cache in `iconService.ts` — that
 * one avoids repeated OS calls across every `getApplicationIcon` IPC
 * invocation; this one avoids repeated *IPC round trips* for the same path
 * from every `AppIcon` instance on screen (a workflow chain can render the
 * same application's icon three times in one row). `null` is cached too
 * ("asked, OS has nothing") so a path with no real icon doesn't get re-sent
 * over IPC on every re-render.
 */
const cache = new Map<string, string | null>()
const inFlight = new Map<string, Promise<string | null>>()
const subscribers = new Map<string, Set<() => void>>()

function notify(key: string): void {
  for (const listener of subscribers.get(key) ?? []) listener()
}

async function fetchIcon(executablePath: string): Promise<void> {
  const pending =
    inFlight.get(executablePath) ??
    window.flow.getApplicationIcon(executablePath).finally(() => {
      inFlight.delete(executablePath)
    })
  inFlight.set(executablePath, pending)

  const dataUrl = await pending
  cache.set(executablePath, dataUrl)
  notify(executablePath)
}

/**
 * The real OS icon for an executable path, as a `data:image/png;base64,...`
 * string once resolved. Returns `undefined` while unresolved/loading (never
 * yet requested, or the IPC call is in flight) and `null` once resolved
 * with no real icon available — callers should keep rendering a fallback
 * for both of those, and only switch to `<img src={value}>` once `value`
 * is a real string.
 */
export function useOsIcon(executablePath: string | null | undefined): string | null | undefined {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!executablePath) return

    if (!cache.has(executablePath)) {
      void fetchIcon(executablePath)
    }

    let subs = subscribers.get(executablePath)
    if (!subs) {
      subs = new Set()
      subscribers.set(executablePath, subs)
    }
    const listener = (): void => forceUpdate((n) => n + 1)
    subs.add(listener)

    return () => {
      subs?.delete(listener)
      if (subs?.size === 0) subscribers.delete(executablePath)
    }
  }, [executablePath])

  if (!executablePath) return undefined
  return cache.get(executablePath)
}
