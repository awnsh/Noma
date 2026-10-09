import { useEffect, useState } from 'react'
import type { GlideToast } from '@shared/types'
import logo from '../assets/logo.png'

/** Must match GLIDE_TOAST_MS in main/notifications/glideToastWindow.ts,
 *  which hides the window when this animation has faded the pill out. */
const GLIDE_TOAST_MS = 1800

/**
 * The whole application, for Glide's toast window: one small pill naming
 * what a swipe just ran. Nothing to click (the window ignores the mouse),
 * nothing to dismiss; it fades in, holds, and fades out on its own.
 */
export function GlideToastSurface() {
  const [toast, setToast] = useState<GlideToast | null>(null)

  useEffect(() => {
    const unsubscribe = window.flow.onGlideToastShown(setToast)
    void window.flow.getPendingGlideToast().then((pending) => {
      if (pending) setToast((current) => current ?? pending)
    })
    return unsubscribe
  }, [])

  if (!toast) return null

  return (
    <div className="flex h-screen w-screen items-end justify-start p-3">
      <div
        // Keyed on the swipe, so a second swipe restarts the animation
        // instead of inheriting the first one's fade-out.
        key={toast.at}
        role="status"
        aria-live="polite"
        className="noma-glide-toast flex max-w-full items-center gap-2 rounded-full border border-white/[0.09] bg-[rgba(17,18,20,0.86)] py-1.5 pl-1.5 pr-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]"
        style={{ animationDuration: `${GLIDE_TOAST_MS}ms` }}
      >
        <img src={logo} alt="" className="h-6 w-6 shrink-0 rounded-full" draggable={false} />
        <span className="truncate text-[13px] font-medium text-neutral-100">{toast.name}</span>
        {toast.applicationName && (
          <span className="max-w-[40%] shrink-0 truncate text-[12px] text-neutral-500">{toast.applicationName}</span>
        )}
      </div>
    </div>
  )
}
