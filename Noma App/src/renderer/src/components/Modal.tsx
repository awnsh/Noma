import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GLASS_PANEL, MODAL_SCRIM } from '../lib/surfaces'
import { useBackdropDismiss } from '../lib/useBackdropDismiss'

interface ModalProps {
  onClose: () => void
  /** id of the heading inside; becomes aria-labelledby. */
  titleId?: string
  size?: 'md' | 'lg'
  /** Cap the panel at 90vh and scroll its content (on by default, so a tall popup never pushes its buttons off a short window). */
  scroll?: boolean
  className?: string
  /** Rendered inside the scrim after the panel (e.g. a nested modal). */
  overlay?: ReactNode
  children: ReactNode
}

const EXIT_MS = 160
const EXIT_FALLBACK_MS = 250

const ModalCloseContext = createContext<(() => void) | null>(null)

/** Close the enclosing Modal with its exit animation. Falls back to `fallback` outside a Modal. */
export function useModalClose(fallback?: () => void): () => void {
  const ctx = useContext(ModalCloseContext)
  return ctx ?? fallback ?? (() => {})
}

/** Open modals, topmost last, so Escape only closes the front one. */
const openModals: symbol[] = []

/** Scrim + glass panel with backdrop-click and Escape dismissal, and an exit animation. The panel must stay the scrim's first child. */
export function Modal({ onClose, titleId, size = 'md', scroll = true, className, overlay, children }: ModalProps) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const finish = useCallback((): void => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    onCloseRef.current()
  }, [])

  const requestClose = useCallback((): void => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    timer.current = setTimeout(finish, EXIT_FALLBACK_MS)
  }, [finish])

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  useEffect(() => {
    const id = Symbol('modal')
    openModals.push(id)
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && openModals[openModals.length - 1] === id) requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openModals.splice(openModals.indexOf(id), 1)
    }
  }, [requestClose])

  const backdrop = useBackdropDismiss(requestClose)
  const panel = [
    scroll ? 'max-h-[90vh] overflow-y-auto' : '',
    size === 'lg' ? 'w-full max-w-lg p-6' : 'w-full max-w-md p-6',
    GLASS_PANEL,
    closing ? 'noma-scale-out' : '',
    className ?? ''
  ]
    .filter(Boolean)
    .join(' ')
  // Drawn straight into <body>: inside the page, any ancestor with a transform (the
  // page transition) makes "fixed" mean "relative to the whole page", which put the
  // popup off the bottom of the window.
  return createPortal(
    <ModalCloseContext.Provider value={requestClose}>
      <div
        className={`${MODAL_SCRIM}${closing ? ' noma-fade-out' : ''}`}
        style={closing ? { pointerEvents: 'none' } : undefined}
        // The scrim's own fade-out ends the exit; nested modals' events bubble with another target.
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget && event.animationName === 'noma-fade-out') finish()
        }}
        {...backdrop}
      >
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={panel}>
          {children}
        </div>
        {overlay}
      </div>
    </ModalCloseContext.Provider>,
    document.body
  )
}

/** A button that closes the enclosing Modal with its exit animation. */
export function ModalCloseButton({
  children,
  className,
  autoFocus
}: {
  children: ReactNode
  className?: string
  autoFocus?: boolean
}) {
  const close = useModalClose()
  return (
    <button type="button" autoFocus={autoFocus} onClick={close} className={className}>
      {children}
    </button>
  )
}
