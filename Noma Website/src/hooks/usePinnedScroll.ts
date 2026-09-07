import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * The shared mechanics behind every "pinned scroll scene" on this site (the
 * flagship product demo, the adaptive-workflow section): a tall wrapper
 * holds a panel that's `position: fixed` while the visitor scrolls through
 * it, then hands off to `position: absolute` (anchored to the wrapper's
 * bottom) once scrolled past — computed via a plain `getBoundingClientRect()`
 * scroll listener (rAF-throttled), not CSS `position: sticky` (Lenis's root
 * scroll mode sets `overflow: hidden auto` on `<html>`/`<body>`, which breaks
 * native sticky — see noma-website-project memory) and not Framer Motion's
 * `useScroll` either (its clamped-at-edges semantics make "not reached yet"
 * and "scrolled past" ambiguous; a manual rect check isn't).
 *
 * Also carries the short-viewport safety net: a pinned scene's content has a
 * fixed pixel height by design (so nothing resizes stage-to-stage as copy
 * length changes), but a fixed height doesn't know how tall the *viewport*
 * is. On anything shorter than the content's own natural height, the bottom
 * of a `fixed` panel silently renders past the screen edge with no
 * scrollbar to reveal it. `contentScale` is measured (not guessed from a
 * breakpoint) and shrinks the whole stack uniformly from the top down
 * whenever it doesn't fit, so short windows get a smaller — but complete —
 * sequence instead of one with its bottom missing. Attach `contentRef` to
 * the element that should shrink and `panelRef` to its fixed/absolute
 * ancestor (the one carrying the top/bottom padding to clear the floating
 * nav).
 */
export function usePinnedScroll({ scrollVh = 3, minContentScale = 0.62 }: { scrollVh?: number; minContentScale?: number } = {}) {
  const reduceMotion = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'before' | 'pinned' | 'after'>('before')
  const [progress, setProgress] = useState(0)
  const [contentScale, setContentScale] = useState(1)
  const contentScaleRef = useRef(1)

  useEffect(() => {
    if (reduceMotion) return
    let ticking = false
    const update = () => {
      ticking = false
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const total = rect.height - vh
      if (rect.top > 0) {
        setPhase('before')
        setProgress(0)
      } else if (rect.top <= -total) {
        setPhase('after')
        setProgress(1)
      } else {
        setPhase('pinned')
        setProgress(total > 0 ? -rect.top / total : 1)
      }

      const panelEl = panelRef.current
      const contentEl = contentRef.current
      if (panelEl && contentEl) {
        const panelStyle = getComputedStyle(panelEl)
        const available = vh - (parseFloat(panelStyle.paddingTop) || 0) - (parseFloat(panelStyle.paddingBottom) || 0)
        // Undo whatever scale is currently applied to recover the stack's
        // true, unscaled height — getBoundingClientRect reports the
        // post-transform size, so dividing it back out is what makes this
        // converge to a stable value instead of ratcheting every frame.
        const naturalHeight = contentEl.getBoundingClientRect().height / (contentScaleRef.current || 1)
        const nextScale = naturalHeight > 0 ? Math.min(1, Math.max(minContentScale, available / naturalHeight)) : 1
        if (Math.abs(nextScale - contentScaleRef.current) > 0.01) {
          contentScaleRef.current = nextScale
          setContentScale(nextScale)
        }
      }
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduceMotion, minContentScale])

  const panelPositionClass =
    phase === 'pinned' ? 'fixed inset-x-0 top-0 h-screen' : phase === 'after' ? 'absolute inset-x-0 bottom-0 h-screen' : 'absolute inset-x-0 top-0 h-screen'

  return { reduceMotion, wrapRef, panelRef, contentRef, phase, progress, contentScale, panelPositionClass, scrollVh }
}

/** Piecewise-linear interpolation helper shared by every stage-driven value
 *  (camera zoom, counters, etc.) in a pinned scene — given `progress` and a
 *  stage's own `[start, end)` bounds, returns 0-1 how far through that one
 *  stage the visitor currently is. */
export function stageLocalT(progress: number, start: number, end: number) {
  return end > start ? Math.min(1, Math.max(0, (progress - start) / (end - start))) : 1
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
