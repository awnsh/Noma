import { useEffect, useState } from 'react'
import { FLOW_ACTION_CATALOG, SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import type { Control, ControlAction, Macro } from '@shared/types'
import { ShortcutRecorder } from './ShortcutRecorder'
import { GLASS_PANEL, MODAL_SCRIM } from '../lib/surfaces'

interface ControlEditorModalProps {
  applicationId: string
  applicationName: string
  slot: number
  control: Control | undefined
  onClose: () => void
  /** Called after a successful save/reset so the caller can refresh. */
  onSaved: () => void
}

// 'launchApplication' is a real ControlAction variant but has no working
// execution path anywhere yet (actionExecutor.ts refuses it with "not
// implemented yet") — deliberately left out of this picker so choosing an
// action type here never leads to a control that silently (or not-so-
// silently) does nothing when pressed. Re-add once it actually launches
// something.
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

export function ControlEditorModal({
  applicationId,
  applicationName,
  slot,
  control,
  onClose,
  onSaved
}: ControlEditorModalProps) {
  const [label, setLabel] = useState(control?.label ?? '')
  const [action, setAction] = useState<ControlAction>(control?.action ?? defaultActionForType('shortcut'))
  const [macros, setMacros] = useState<Macro[]>([])
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    window.flow.getMacros().then(setMacros)
  }, [])

  const canSave =
    label.trim().length > 0 &&
    (action.type !== 'shortcut' || action.keys.length > 0) &&
    (action.type !== 'macro' || action.macroId.length > 0)

  const handleActionTypeChange = (nextType: SelectableActionType): void => {
    setAction(defaultActionForType(nextType))
    setTestResult(null)
  }

  const handleTest = async (): Promise<void> => {
    setIsTesting(true)
    setTestResult(null)
    const result = await window.flow.testControlAction(action)
    setTestResult(result)
    setIsTesting(false)
  }

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    setSaveError(null)
    const result = await window.flow.updateControl(applicationId, slot, label.trim(), action)
    setIsSaving(false)
    if (result) {
      onSaved()
      onClose()
    } else {
      setSaveError(`No profile configured for ${applicationName} yet — nothing to save this into.`)
    }
  }

  const handleReset = async (): Promise<void> => {
    setIsSaving(true)
    setSaveError(null)
    const result = await window.flow.resetControlToDefault(applicationId, slot)
    setIsSaving(false)
    if (result) {
      onSaved()
      onClose()
    } else {
      setSaveError(`No default to reset to for ${applicationName}.`)
    }
  }

  return (
    <div className={MODAL_SCRIM}>
      <div className={`w-full max-w-md p-6 ${GLASS_PANEL}`}>
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">
            {applicationName} · Control {slot}
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold text-neutral-100">Configure control</h2>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
            Name
          </label>
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value.slice(0, 12))}
            placeholder="e.g. RUN"
            maxLength={12}
            className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
          />
          <p className="mt-1 text-[11px] text-neutral-600">
            Max 12 characters — this has to fit on a small physical display.
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
            Action type
          </label>
          <select
            value={action.type}
            onChange={(event) => handleActionTypeChange(event.target.value as SelectableActionType)}
            className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
          >
            {(Object.keys(ACTION_TYPE_LABELS) as SelectableActionType[]).map((type) => (
              <option key={type} value={type}>
                {ACTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          {action.type === 'shortcut' && (
            <ShortcutRecorder
              value={action.keys}
              onChange={(keys) => setAction({ type: 'shortcut', keys })}
            />
          )}

          {action.type === 'macro' &&
            (macros.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/10 px-3 py-2 text-xs text-neutral-600">
                No macros yet — build one in Macro Studio, or accept a repeated-sequence suggestion
                on the Dashboard.
              </p>
            ) : (
              <select
                value={action.macroId}
                onChange={(event) => setAction({ type: 'macro', macroId: event.target.value })}
                className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
              >
                <option value="" disabled>
                  Choose a macro…
                </option>
                {macros.map((macro) => (
                  <option key={macro.id} value={macro.id}>
                    {macro.name}
                  </option>
                ))}
              </select>
            ))}

          {action.type === 'systemCommand' && (
            <select
              value={action.command}
              onChange={(event) => setAction({ type: 'systemCommand', command: event.target.value })}
              className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
            >
              {SYSTEM_COMMAND_CATALOG.map((command) => (
                <option key={command} value={command}>
                  {command}
                </option>
              ))}
            </select>
          )}

          {action.type === 'flowAction' && (
            <select
              value={action.action}
              onChange={(event) => setAction({ type: 'flowAction', action: event.target.value })}
              className="w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
            >
              {FLOW_ACTION_CATALOG.map((flowAction) => (
                <option key={flowAction} value={flowAction}>
                  {flowAction}
                </option>
              ))}
            </select>
          )}
        </div>

        {testResult && (
          <div
            className={`mb-4 rounded-md border px-3 py-2 text-xs ${
              testResult.ok ? 'border-accent-muted text-accent' : 'border-white/10 text-neutral-400'
            }`}
          >
            {testResult.ok ? '✓ Executed' : `✗ ${testResult.reason ?? 'Failed'}`}
          </div>
        )}

        {saveError && (
          <div className="mb-4 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-400">
            {saveError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="text-xs text-neutral-600 hover:text-neutral-400"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-muted"
            >
              {isTesting ? 'Testing…' : 'Test'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="rounded-md border border-accent-muted bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
