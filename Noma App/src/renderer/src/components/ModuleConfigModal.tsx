import { useState } from 'react'
import { FLOW_ACTION_CATALOG, SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import type { ControlAction, Module, ModuleFunctionConfig } from '@shared/types'
import { ShortcutRecorder } from './ShortcutRecorder'
import { GLASS_PANEL, MODAL_SCRIM } from '../lib/surfaces'

interface ModuleFunctionSpec {
  key: string
  /** e.g. "Turn" — the fixed physical gesture; not user-editable. */
  gesture: string
}

interface ModuleConfigModalProps {
  module: Module
  functions: ModuleFunctionSpec[]
  onClose: () => void
  onSaved: (configuration: Record<string, ModuleFunctionConfig>) => void
}

// 'launchApplication' has no working execution path anywhere yet
// (actionExecutor.ts refuses it with "not implemented yet") — left out of
// this picker so configuring a module function never leads to one that
// silently does nothing when triggered. See ControlEditorModal.tsx, which
// applies the same rule to control actions.
type SelectableActionType = Exclude<ControlAction['type'], 'launchApplication'>

const ACTION_TYPE_LABELS: Record<SelectableActionType, string> = {
  shortcut: 'Keyboard shortcut',
  macro: 'Macro',
  systemCommand: 'System action',
  flowAction: 'Flow action'
}

function defaultActionForType(type: SelectableActionType): ControlAction {
  switch (type) {
    case 'shortcut':
      return { type: 'shortcut', keys: [] }
    case 'macro':
      return { type: 'macro', macroId: '' }
    case 'systemCommand':
      return { type: 'systemCommand', command: SYSTEM_COMMAND_CATALOG[0] }
    case 'flowAction':
      return { type: 'flowAction', action: FLOW_ACTION_CATALOG[0] }
  }
}

/**
 * Assigns a real, executable action to one function of a module (this
 * phase's section 9/10 — "the software should understand the capabilities
 * of each module"). Deliberately its own small modal rather than a
 * generalization of ControlEditorModal: a module function has no slot, no
 * profile, and — unlike a control — needs a free-text name (e.g. "Timeline
 * Zoom") since it isn't tied to an application's control label.
 */
export function ModuleConfigModal({ module, functions, onClose, onSaved }: ModuleConfigModalProps) {
  const existing = (module.configuration ?? {}) as Record<string, ModuleFunctionConfig>

  const [entries, setEntries] = useState<Record<string, ModuleFunctionConfig>>(() => {
    const initial: Record<string, ModuleFunctionConfig> = {}
    for (const fn of functions) {
      initial[fn.key] = existing[fn.key] ?? { label: '', action: defaultActionForType('shortcut') }
    }
    return initial
  })
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; reason?: string }>>({})
  const [isTesting, setIsTesting] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const updateEntry = (key: string, patch: Partial<ModuleFunctionConfig>): void => {
    setEntries((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
    setTestResults((prev) => {
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }

  const handleTest = async (key: string, action: ControlAction): Promise<void> => {
    setIsTesting(key)
    const result = await window.flow.testControlAction(action)
    setTestResults((prev) => ({ ...prev, [key]: result }))
    setIsTesting(null)
  }

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    // Only persist functions that were actually named — an empty label
    // means "leave unconfigured", not "assign a nameless action".
    const configuration = Object.fromEntries(
      Object.entries(entries).filter(([, value]) => value.label.trim().length > 0)
    ) as Record<string, ModuleFunctionConfig>
    await window.flow.configureModule(module.id, configuration)
    setIsSaving(false)
    onSaved(configuration)
    onClose()
  }

  return (
    <div className={MODAL_SCRIM}>
      <div className={`w-full max-w-md p-6 ${GLASS_PANEL}`}>
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">{module.name}</div>
          <h2 className="mt-1 font-display text-lg font-semibold text-neutral-100">Configure module</h2>
        </div>

        <div className="space-y-5">
          {functions.map((fn) => {
            const entry = entries[fn.key]
            const testResult = testResults[fn.key]
            return (
              <div key={fn.key} className="rounded-lg border border-white/10 p-3">
                <div className="mb-2 text-[10px] uppercase tracking-widest text-accent">
                  {fn.gesture}
                </div>

                <input
                  type="text"
                  value={entry.label}
                  onChange={(event) => updateEntry(fn.key, { label: event.target.value.slice(0, 20) })}
                  placeholder="e.g. Timeline Zoom"
                  maxLength={20}
                  className="mb-2 w-full rounded-md border border-white/10 bg-base-950 px-3 py-1.5 text-sm text-neutral-100"
                />

                <select
                  value={entry.action.type}
                  onChange={(event) =>
                    updateEntry(fn.key, {
                      action: defaultActionForType(event.target.value as SelectableActionType)
                    })
                  }
                  className="mb-2 w-full rounded-md border border-white/10 bg-base-950 px-3 py-1.5 text-xs text-neutral-200"
                >
                  {(Object.keys(ACTION_TYPE_LABELS) as SelectableActionType[]).map((type) => (
                    <option key={type} value={type}>
                      {ACTION_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>

                {entry.action.type === 'shortcut' && (
                  <ShortcutRecorder
                    value={entry.action.keys}
                    onChange={(keys) => updateEntry(fn.key, { action: { type: 'shortcut', keys } })}
                  />
                )}
                {entry.action.type === 'systemCommand' && (
                  <select
                    value={entry.action.command}
                    onChange={(event) =>
                      updateEntry(fn.key, { action: { type: 'systemCommand', command: event.target.value } })
                    }
                    className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-1.5 text-xs text-neutral-200"
                  >
                    {SYSTEM_COMMAND_CATALOG.map((command) => (
                      <option key={command} value={command}>
                        {command}
                      </option>
                    ))}
                  </select>
                )}
                {entry.action.type === 'flowAction' && (
                  <select
                    value={entry.action.action}
                    onChange={(event) =>
                      updateEntry(fn.key, { action: { type: 'flowAction', action: event.target.value } })
                    }
                    className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-1.5 text-xs text-neutral-200"
                  >
                    {FLOW_ACTION_CATALOG.map((flowAction) => (
                      <option key={flowAction} value={flowAction}>
                        {flowAction}
                      </option>
                    ))}
                  </select>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={isTesting === fn.key}
                    onClick={() => void handleTest(fn.key, entry.action)}
                    className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-accent-muted"
                  >
                    {isTesting === fn.key ? 'Testing…' : 'Test'}
                  </button>
                  {testResult && (
                    <span className={testResult.ok ? 'text-[11px] text-accent' : 'text-[11px] text-neutral-500'}>
                      {testResult.ok ? '✓ Executed' : `✗ ${testResult.reason ?? 'Failed'}`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="rounded-md border border-accent-muted bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97]"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Re-exported so ModuleChip can build the right function set per module
// type without duplicating this list.
export type { ModuleFunctionSpec }
export const MODULE_FUNCTIONS_BY_TYPE: Record<string, ModuleFunctionSpec[]> = {
  encoder: [
    { key: 'turn', gesture: 'Turn' },
    { key: 'press', gesture: 'Press' }
  ],
  slider: [{ key: 'slide', gesture: 'Slide' }]
}
