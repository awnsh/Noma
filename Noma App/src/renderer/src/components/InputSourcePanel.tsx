import { useEffect } from 'react'
import { useHoloStore } from '../stores/holoStore'
import type { InputSource } from '@shared/types'

const SOURCE_OPTIONS: Array<{ value: InputSource; label: string; description: string }> = [
  { value: 'keyboard', label: 'Keyboard', description: 'The physical module, or the Virtual Keyboard page.' },
  { value: 'holo', label: 'Holo (tap desk)', description: 'No hardware. Tap the desk around your laptop.' }
]

function OptionButton<T extends string>({
  value,
  current,
  label,
  onSelect
}: {
  value: T
  current: T
  label: string
  onSelect: (value: T) => void
}) {
  const isActive = value === current
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        isActive
          ? 'border-accent-muted bg-accent/10 text-accent'
          : 'border-white/10 text-neutral-300 hover:border-white/30 hover:text-neutral-100'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * Which "keyboard" Flow trusts to fire pressControl (see InputSource's doc
 * comment in shared/types). Manual choice for now per an explicit request
 * to be able to test both; real hardware-presence auto-detection is a
 * documented future step (see docs/architecture.md), not implemented here.
 *
 * No paywall/tier switch here — Holo has no subscription gate today, by
 * explicit request (see docs/architecture.md's Holo section for where a
 * future one would hook in).
 */
export function InputSourcePanel() {
  const { inputSource, refresh, setInputSource } = useHoloStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-base-900 px-5 py-4">
      <div className="text-xs uppercase tracking-widest text-neutral-500">Input Source</div>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        Not everyone wants to buy the physical keyboard. Holo is a free, no-hardware way to use
        Noma from a laptop alone. Both drive the exact same 4 controls per application.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {SOURCE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            value={option.value}
            current={inputSource}
            label={option.label}
            onSelect={setInputSource}
          />
        ))}
      </div>
    </section>
  )
}
