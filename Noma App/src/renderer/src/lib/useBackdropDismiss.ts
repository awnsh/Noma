import { useRef } from 'react'
import type { MouseEvent } from 'react'

/** Clicks this close to the panel's edge never dismiss it, so a slightly
 *  missed click on a button or the panel border can't close the popup. */
const BUFFER_PX = 24

/**
 * Props for a modal's backdrop that close it on a click in the blurred area.
 * The press and the release must both land on the backdrop itself, outside
 * the panel plus a buffer ring, so a drag that starts in a text field and
 * ends outside doesn't dismiss it. Nested popups are safe: their clicks
 * bubble up with a different target and are ignored.
 */
export function useBackdropDismiss(onClose: () => void): {
  onMouseDown: (event: MouseEvent<HTMLElement>) => void
  onClick: (event: MouseEvent<HTMLElement>) => void
} {
  const pressedOutside = useRef(false)

  const isOutside = (event: MouseEvent<HTMLElement>): boolean => {
    if (event.target !== event.currentTarget) return false
    const panel = event.currentTarget.firstElementChild
    if (!panel) return true
    const rect = panel.getBoundingClientRect()
    return (
      event.clientX < rect.left - BUFFER_PX ||
      event.clientX > rect.right + BUFFER_PX ||
      event.clientY < rect.top - BUFFER_PX ||
      event.clientY > rect.bottom + BUFFER_PX
    )
  }

  return {
    onMouseDown: (event) => {
      pressedOutside.current = isOutside(event)
    },
    onClick: (event) => {
      if (pressedOutside.current && isOutside(event)) onClose()
      pressedOutside.current = false
    }
  }
}
