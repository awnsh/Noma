import { useEffect, useState } from 'react'
import type { GlideToast } from '@shared/types'
import type { CSSProperties } from 'react'
import logo from '../assets/logo.png'
import { spaceStyle } from '../lib/appSpace'

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
        className="noma-glide-toast flex max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-[rgba(29,28,31,0.97)] py-1.5 pl-1.5 pr-3.5 shadow-[0_1px_0_0_rgba(255,250,240,0.05)_inset,0_12px_32px_-12px_rgba(0,0,0,0.85)]"
        style={{ animationDuration: `${GLIDE_TOAST_MS}ms`, ...(spaceStyle(toast.applicationId) as CSSProperties) }}
      >
        {/* The mark is wide (about 3:2), so it sits inset at its own
            proportions inside the circle rather than being stretched to fill it. */}
        {/* On the colour of the app the swipe ran in. */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-space-deep ring-1 ring-inset ring-white/[0.06]">
          <img src={logo} alt="" className="h-[9px] w-[13px] object-contain opacity-90" draggable={false} />
        </span>
        <span className="truncate text-[13px] font-medium text-neutral-100">{toast.name}</span>
        {toast.applicationName && (
          <span className="max-w-[40%] shrink-0 truncate text-[12px] text-space-ink/70">{toast.applicationName}</span>
        )}
      </div>
    </div>
  )
}
