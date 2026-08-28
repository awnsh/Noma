import { useState } from 'react'
import type { Module, ModuleFunctionConfig } from '@shared/types'
import { ModuleConfigModal, MODULE_FUNCTIONS_BY_TYPE } from './ModuleConfigModal'

interface ModuleChipProps {
  module: Module
  onRemove: (moduleId: string) => void
}

const TYPE_GLYPH: Record<string, string> = {
  encoder: '◉',
  slider: '▬',
  display: '▭',
  macro: '▦',
  numpad: '▦',
  creator: '▦'
}

/**
 * A module rendered as a labeled piece of hardware, not a generic chip
 * (this phase's section 9 — "the module simulator should feel like
 * configuring physical hardware"). Encoder and Slider modules are
 * configurable: their capability functions ("Turn", "Press", "Slide") can
 * be assigned a real, testable action (see ModuleConfigModal). Button-style
 * modules (Macro/Numpad/Creator) don't have a per-key model yet — see
 * README's "what remains incomplete" — so they render as a simpler
 * identity card without a configure affordance, honestly reflecting that.
 */
export function ModuleChip({ module, onRemove }: ModuleChipProps) {
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [testResult, setTestResult] = useState<{ key: string; ok: boolean; reason?: string } | null>(
    null
  )
  const [isTesting, setIsTesting] = useState<string | null>(null)

  // Read live from the module itself (pushed via HARDWARE_STATUS_CHANGED
  // after every save) rather than duplicating it into local state — one
  // source of truth, no staleness to manage.
  const configuration = (module.configuration ?? {}) as Record<string, ModuleFunctionConfig>
  const functions = MODULE_FUNCTIONS_BY_TYPE[module.type]
  const glyph = TYPE_GLYPH[module.type] ?? '▦'

  const handleTest = async (key: string): Promise<void> => {
    const entry = configuration[key]
    if (!entry) return
    setIsTesting(key)
    const result = await window.flow.testControlAction(entry.action)
    setTestResult({ key, ...result })
    setIsTesting(null)
  }

  return (
    <div className="w-44 rounded-xl border border-white/10 bg-base-900 px-4 py-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg text-neutral-400">{glyph}</span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-200">
              {module.name}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-neutral-600">
              {module.capabilities.join(' · ')}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(module.id)}
          aria-label={`Remove ${module.name}`}
          className="rounded-full border border-white/10 px-1.5 text-xs text-neutral-500 hover:border-white/30 hover:text-neutral-300"
        >
          ×
        </button>
      </div>

      {functions ? (
        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2.5">
          {functions.map((fn) => {
            const entry = configuration[fn.key]
            return (
              <div key={fn.key} className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-neutral-600">{fn.gesture}: </span>
                  <span className={entry ? 'text-neutral-200' : 'text-neutral-600'}>
                    {entry?.label || 'Not assigned'}
                  </span>
                </div>
                {entry && (
                  <button
                    type="button"
                    disabled={isTesting === fn.key}
                    onClick={() => void handleTest(fn.key)}
                    className="text-neutral-600 hover:text-accent"
                    title={`Test ${fn.gesture}`}
                  >
                    {isTesting === fn.key ? '…' : '▶'}
                  </button>
                )}
              </div>
            )
          })}
          {testResult && (
            <div className={testResult.ok ? 'text-[10px] text-accent' : 'text-[10px] text-neutral-500'}>
              {testResult.ok ? '✓ executed' : `✗ ${testResult.reason ?? 'failed'}`}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsConfiguring(true)}
            className="mt-1 w-full rounded-md border border-dashed border-white/10 py-1 text-[10px] uppercase tracking-widest text-neutral-500 hover:border-accent-muted hover:text-accent"
          >
            Configure
          </button>
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-neutral-600">Attached — no functions to assign yet</div>
      )}

      {isConfiguring && functions && (
        <ModuleConfigModal
          module={module}
          functions={functions}
          onClose={() => setIsConfiguring(false)}
          onSaved={() => setTestResult(null)}
        />
      )}
    </div>
  )
}
