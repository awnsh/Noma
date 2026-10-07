import { useState } from 'react'
import type { Module, ModuleFunctionConfig } from '@shared/types'
import { ModuleConfigModal, MODULE_FUNCTIONS_BY_TYPE } from './ModuleConfigModal'

interface ModuleChipProps {
  module: Module
  onRemove: (moduleId: string) => void
}

// Icon SVG for each module type; returns a reactElement for rendering
const TYPE_ICON: Record<string, () => React.ReactElement> = {
  encoder: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  slider: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  ),
  display: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="5" y="2" width="14" height="14" rx="2" />
      <path d="M8 18h8" />
    </svg>
  ),
  macro: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M13 2L5 13l8 8v-9h4V11h-4V2Z" />
    </svg>
  ),
  numpad: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="6" y="6" width="2.5" height="2.5" />
      <rect x="11" y="6" width="2.5" height="2.5" />
      <rect x="16" y="6" width="2" height="2" />
    </svg>
  ),
  creator: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  )
}

/**
 * A module rendered as a labeled piece of hardware, not a generic chip
 * (this phase's section 9; "the module simulator should feel like
 * configuring physical hardware"). Encoder and Slider modules are
 * configurable: their capability functions ("Turn", "Press", "Slide") can
 * be assigned a real, testable action (see ModuleConfigModal). Button-style
 * modules (Macro/Numpad/Creator) don't have a per-key model yet. See
 * README's "what remains incomplete". They render as a simpler
 * identity card without a configure affordance, honestly reflecting that.
 */
export function ModuleChip({ module, onRemove }: ModuleChipProps) {
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [testResult, setTestResult] = useState<{ key: string; ok: boolean; reason?: string } | null>(
    null
  )
  const [isTesting, setIsTesting] = useState<string | null>(null)

  // Read live from the module itself (pushed via HARDWARE_STATUS_CHANGED
  // after every save) rather than duplicating it into local state; one
  // source of truth, no staleness to manage.
  const configuration = (module.configuration ?? {}) as Record<string, ModuleFunctionConfig>
  const functions = MODULE_FUNCTIONS_BY_TYPE[module.type]
  const IconComponent = TYPE_ICON[module.type]

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
          {IconComponent && (
            <div className="text-neutral-400 shrink-0">
              <IconComponent />
            </div>
          )}
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
                    className="text-neutral-600 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Test ${fn.gesture}`}
                  >
                    {isTesting === fn.key ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-3.5 w-3.5">
                        <path d="M8 5v14l11-7-11-7Z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            )
          })}
          {testResult && (
            <div className={`text-[10px] flex items-center gap-1.5 ${testResult.ok ? 'text-accent' : 'text-neutral-500'}`}>
              {testResult.ok ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Executed
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  {testResult.reason ?? 'Failed'}
                </>
              )}
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
        <div className="mt-2 text-[10px] text-neutral-600">Attached, no functions to assign yet</div>
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
