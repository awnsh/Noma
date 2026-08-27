import { useEffect, useState } from 'react'
import { DOM_CODE_TO_KEY_NAME, DOM_MODIFIER_CODE_TO_NAME } from '@shared/constants/domKeyCodes'

interface ShortcutRecorderProps {
  value: string[]
  onChange: (combo: string[]) => void
}

/**
 * A real "press the keys you want" recorder — not a text field where you
 * type out "Control+Shift+P" by hand. This only needs a plain DOM
 * `keydown` listener (Electron's renderer is an ordinary Chromium page),
 * no native hook: recording a shortcut for *configuration* is a much
 * lower-stakes operation than capturing one from ambient typing
 * (captureFilter.ts's policy) or sending one for real (actionExecutor.ts)
 * — this only ever runs while the user has explicitly clicked "Record".
 */
export function ShortcutRecorder({ value, onChange }: ShortcutRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    if (!isRecording) return

    function handleKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopPropagation()

      if (event.code === 'Escape') {
        setIsRecording(false)
        return
      }

      // Still building the chord — wait for the non-modifier trigger key.
      if (DOM_MODIFIER_CODE_TO_NAME[event.code]) return

      const triggerName = DOM_CODE_TO_KEY_NAME[event.code]
      if (!triggerName) return // Unrecognized key — ignore, keep recording.

      const modifiers: string[] = []
      if (event.ctrlKey) modifiers.push('Control')
      if (event.altKey) modifiers.push('Alt')
      if (event.metaKey) modifiers.push('Meta')
      if (event.shiftKey) modifiers.push('Shift')

      onChange([...modifiers, triggerName])
      setIsRecording(false)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isRecording, onChange])

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-md border border-white/10 bg-base-950 px-3 py-2 font-mono text-sm text-neutral-200">
        {isRecording
          ? 'Press keys…'
          : value.length > 0
            ? value.join(' + ')
            : 'No shortcut set'}
      </div>
      <button
        type="button"
        onClick={() => setIsRecording(true)}
        className={`shrink-0 rounded-md border px-3 py-2 text-xs ${
          isRecording
            ? 'border-accent-muted text-accent'
            : 'border-white/10 text-neutral-300 hover:border-accent-muted'
        }`}
      >
        {isRecording ? 'Recording… (Esc to cancel)' : 'Record'}
      </button>
    </div>
  )
}
