import { useEffect } from 'react'

interface SyncableStore {
  refresh: () => unknown
  subscribe?: () => () => void
}

/**
 * On mount, refreshes each store once and subscribes to the ones that expose a
 * live subscription, unsubscribing all of them on unmount. Runs once: the
 * stores passed on later renders are ignored (store actions are stable).
 */
export function useStoreSync(...stores: SyncableStore[]): void {
  useEffect(() => {
    for (const store of stores) void store.refresh()
    const unsubscribes = stores.flatMap((store) => (store.subscribe ? [store.subscribe()] : []))
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
