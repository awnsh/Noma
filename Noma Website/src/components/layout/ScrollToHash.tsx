import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenis } from 'lenis/react'

/**
 * Handles scroll position on every route change: jumps to the top for a
 * plain path change (so navigating Home -> /privacy doesn't land halfway
 * down the new page at whatever scroll position Home was left at), or
 * scrolls to the matching element for a `/#hash` link (see `SiteLink.tsx`)
 * once Home has mounted and the target section exists in the DOM. Goes
 * through the active Lenis instance when one exists, with the same -80
 * offset the homepage's own `anchors` config already uses, so a cross-page
 * anchor link lands in the same spot a same-page one would — and falls
 * back to plain browser scrolling for reduced-motion visitors, who never
 * get a `ReactLenis` wrapper in the first place (see `App.tsx`).
 */
export default function ScrollToHash() {
  const { pathname, hash } = useLocation()
  const lenis = useLenis()

  useEffect(() => {
    // A route change can swap in a page with a very different total
    // height (e.g. /contact, a few hundred pixels tall, to Home, tens of
    // thousands tall thanks to its pinned-scroll sections) — Lenis caches
    // its scrollable height and doesn't know that changed until it
    // re-measures, so calling `scrollTo` immediately after navigating can
    // clamp to the *previous* page's height and land near the top no
    // matter what target was requested. `resize()` forces that
    // re-measurement, and the rAF gives the new route's DOM a frame to
    // actually paint (and its pinned sections to size themselves) first.
    const raf = requestAnimationFrame(() => {
      lenis?.resize()

      if (hash) {
        const el = document.querySelector(hash)
        if (el) {
          if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -80, immediate: true })
          else el.scrollIntoView()
          return
        }
      }
      if (lenis) lenis.scrollTo(0, { immediate: true })
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash, lenis])

  return null
}
