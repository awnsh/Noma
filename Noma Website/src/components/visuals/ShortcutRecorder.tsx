// Verbatim port of the real app's ShortcutRecorder.tsx (src/renderer/src/components) —
// no IPC involved in the original at all, so nothing had to change here. A real
// "press the keys you want" recorder, not a text field: click Record, press a
// combo, it's captured with a plain DOM keydown listener (exactly like the app).

import { useEffect, useState } from 'react'

// Same DOM-code maps as the app's shared/constants/domKeyCodes.ts.
const LETTER_CODES: Record<string, string> = Object.fromEntries(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => [`Key${letter}`, letter])
)
const DIGIT_CODES: Record<string, string> = Object.fromEntries(
  '0123456789'.split('').map((digit) => [`Digit${digit}`, digit])
)
const FUNCTION_KEY_CODES: Record<string, string> = Object.fromEntries(
  Array.from({ length: 24 }, (_, index) => `F${index + 1}`).map((name) => [name, name])
)
const DIRECT_CODES: Record<string, string> = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Escape: 'Escape',
  Delete: 'Delete',
  Backquote: 'Backquote',
  Minus: 'Minus',
  Equal: 'Equal',
  BracketLeft: 'BracketLeft',
  BracketRight: 'BracketRight',
  Semicolon: 'Semicolon',
  Comma: 'Comma',
  Period: 'Period',
  Slash: 'Slash',
}
const DOM_CODE_TO_KEY_NAME: Record<string, string> = {
  ...LETTER_CODES,
  ...DIGIT_CODES,
  ...FUNCTION_KEY_CODES,
  ...DIRECT_CODES,
}
const DOM_MODIFIER_CODE_TO_NAME: Record<string, 'Control' | 'Alt' | 'Meta' | 'Shift'> = {
  ControlLeft: 'Control',
  ControlRight: 'Control',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  MetaLeft: 'Meta',
  MetaRight: 'Meta',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
}

interface ShortcutRecorderProps {
  value: string[]
  onChange: (combo: string[]) => void
}

export default function ShortcutRecorder({ value, onChange }: ShortcutRecorderProps) {
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
      if (DOM_MODIFIER_CODE_TO_NAME[event.code]) return

      const triggerName = DOM_CODE_TO_KEY_NAME[event.code]
      if (!triggerName) return

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
      <div className="flex-1 rounded-md border border-base-600 bg-base-950 px-3 py-2 font-mono text-sm text-base-200">
        {isRecording ? 'Press keys…' : value.length > 0 ? value.join(' + ') : 'No shortcut set'}
      </div>
      <button
        type="button"
        onClick={() => setIsRecording(true)}
        className={`shrink-0 rounded-md border px-3 py-2 text-xs ${
          isRecording ? 'border-accent-dim text-accent' : 'border-base-600 text-base-300 hover:border-accent-dim'
        }`}
      >
        {isRecording ? 'Recording… (Esc to cancel)' : 'Record'}
      </button>
    </div>
  )
}
