import { useEffect, useState } from 'react'
import type { FlowPermissionState } from '@shared/types'
import { PrimaryButton } from './Button'

/** How often the answer is re-read: it changes while Noma is open (the
 *  user flips the switch in System Settings). */
const POLL_MS = 2000

/**
 * macOS only: says so plainly when Flow can't work yet. Without Accessibility
 * Noma sees no shortcuts and can't press any, and nothing else on screen
 * would explain why Flow never learns anything. Shows nothing on Windows or
 * once everything is allowed.
 */
export function MacAccessibilityNotice() {
  const [state, setState] = useState<FlowPermissionState | null>(null)

  useEffect(() => {
    if (!window.flow?.getFlowPermission) return
    let cancelled = false
    const read = (): void => {
      void window.flow.getFlowPermission().then((next) => {
        if (!cancelled) setState(next)
      })
    }
    read()
    const timer = setInterval(read, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (!state?.needed) return null

  if (!state.accessibility) {
    return (
      <div role="status" className="mx-auto mt-6 max-w-3xl rounded-xl border border-error/30 bg-error-muted px-5 py-4">
        <div className="text-sm font-medium text-neutral-100">Flow needs Accessibility access</div>
        <p className="mt-1.5 text-sm text-neutral-400">
          Until macOS allows it, Noma can't see your shortcuts or press them, so Flow won't learn
          anything and controls won't work. Open Accessibility settings and switch Noma on.
        </p>
        <p className="mt-1.5 text-sm text-neutral-500">
          Already switched on? After an update macOS can keep the old switch while no longer
          trusting the new app. Select Noma there, remove it with the minus button, then add it
          again.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => void window.flow.openAccessibilitySettings()}>
            Open Accessibility settings
          </PrimaryButton>
        </div>
      </div>
    )
  }

  if (state.listenerWanted && !state.listening) {
    return (
      <div role="status" className="mx-auto mt-6 max-w-3xl rounded-xl border border-white/10 bg-base-900 px-5 py-4">
        <div className="text-sm font-medium text-neutral-100">Starting Flow…</div>
        <p className="mt-1.5 text-sm text-neutral-400">
          Accessibility is allowed. If this stays here for more than a few seconds, quit Noma from
          the menu bar and open it again.
        </p>
      </div>
    )
  }

  return null
}
