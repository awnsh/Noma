import { useEffect, useState } from 'react'
import { FLOW_ACTION_CATALOG, GLIDE_ZONE_LABELS, SYSTEM_COMMAND_CATALOG, glideZoneForSlot } from '@shared/constants'
import { useGlideStore } from '../stores/glideStore'
import type { Control, ControlAction, Macro } from '@shared/types'
import { ShortcutRecorder } from './ShortcutRecorder'
import { Modal, ModalCloseButton } from './Modal'
import { PrimaryButton } from './Button'
import { FIELD_INPUT, FIELD_LABEL } from '../lib/surfaces'
import { defaultActionForType, type SelectableActionType } from '../lib/actions'

interface ControlEditorModalProps {
  applicationId: string
  applicationName: string
  slot: number
  control: Control | undefined
  onClose: () => void
  /** Called after a successful save/reset so the caller can refresh. The modal
   *  waits for it before closing, so reopening never shows the old control. */
  onSaved: () => void | Promise<void>
}

const ACTION_TYPE_LABELS: Record<SelectableActionType, string> = {
  shortcut: 'Keyboard shortcut',
  macro: 'Saved workflow',
  systemCommand: 'System action',
  flowAction: 'Flow action'
}

export function ControlEditorModal({
  applicationId,
  applicationName,
  slot,
  control,
  onClose,
  onSaved
}: ControlEditorModalProps) {
  // An empty zone opens as a blank form, not as a hidden "none" action.
  const existing = control && control.action.type !== 'none' ? control : undefined
  const [label, setLabel] = useState(existing?.label ?? '')
  const [action, setAction] = useState<ControlAction>(existing?.action ?? defaultActionForType('shortcut'))
  const [macros, setMacros] = useState<Macro[]>([])
  const [testResult, setTestResult] = useState<{
    ok: boolean
    reason?: string
  } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const zoneCount = useGlideStore((state) => state.state?.zoneCount ?? 4)
  const zone = glideZoneForSlot(slot, zoneCount)
  const zoneLabel = zone ? GLIDE_ZONE_LABELS[zoneCount][zone] : null

  useEffect(() => {
    window.flow.getMacros().then(setMacros)
  }, [])

  const canSave =
    label.trim().length > 0 &&
    (action.type !== 'shortcut' || action.keys.length > 0) &&
    (action.type !== 'macro' || action.macroId.length > 0)

  // Why Save is off, so a disabled button is never a mystery.
  const saveBlocker = !label.trim()
    ? 'Give it a name to save.'
    : action.type === 'shortcut' && action.keys.length === 0
      ? 'Record a shortcut to save.'
      : action.type === 'macro' && !action.macroId
        ? 'Choose a workflow to save.'
        : null

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
    try {
      const result = await window.flow.updateControl(applicationId, slot, label.trim(), action)
      if (result) {
        await onSaved()
        onClose()
      } else {
        setSaveError(`No profile configured for ${applicationName} yet. Nothing to save this into.`)
      }
    } catch {
      setSaveError('Could not save this. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Empties just this zone; nothing else in the profile changes.
  const handleClear = async (): Promise<void> => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const result = await window.flow.clearControl(applicationId, slot)
      if (result) {
        await onSaved()
        onClose()
      } else {
        setSaveError(`No profile configured for ${applicationName} yet. Nothing to clear.`)
      }
    } catch {
      setSaveError('Could not clear this. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-widest text-neutral-600">
          {applicationName}, {zoneLabel ? `${zoneLabel} zone` : `Control ${slot}`}
        </div>
        <h2 className="mt-1 font-display text-lg font-semibold text-neutral-100">Choose what this runs</h2>
      </div>

      <div className="mb-4">
        <label className={FIELD_LABEL}>Name</label>
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value.slice(0, 12))}
          placeholder="e.g. RUN"
          maxLength={12}
          className={FIELD_INPUT}
        />
      </div>

      <div className="mb-4">
        <label className={FIELD_LABEL}>Action type</label>
        <select
          value={action.type}
          onChange={(event) => handleActionTypeChange(event.target.value as SelectableActionType)}
          className={FIELD_INPUT}
        >
          {/* A zone can hold an action this form can't build (a workflow's window switch). Show it as is so the select never lies. */}
          {!(action.type in ACTION_TYPE_LABELS) && <option value={action.type}>Other action (kept as is)</option>}
          {(Object.keys(ACTION_TYPE_LABELS) as SelectableActionType[]).map((type) => (
            <option key={type} value={type}>
              {ACTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        {action.type === 'shortcut' && (
          <ShortcutRecorder value={action.keys} onChange={(keys) => setAction({ type: 'shortcut', keys })} />
        )}

        {action.type === 'macro' &&
          (macros.length === 0 ? (
            <p className="rounded-md border border-dashed border-white/10 px-3 py-2 text-xs text-neutral-600">
              No saved workflows yet. Approve one Flow noticed on the Workflows page, or build one in Macro Studio.
            </p>
          ) : (
            <select
              value={action.macroId}
              onChange={(event) => setAction({ type: 'macro', macroId: event.target.value })}
              className={FIELD_INPUT}
            >
              <option value="" disabled>
                Choose a workflow…
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
            className={FIELD_INPUT}
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
            className={FIELD_INPUT}
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
          className={`mb-4 rounded-md border px-3 py-2 text-xs flex items-center gap-2 ${
            testResult.ok ? 'border-accent-muted text-accent' : 'border-white/10 text-neutral-400'
          }`}
        >
          {testResult.ok ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 shrink-0"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Executed
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 shrink-0"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              {testResult.reason ?? 'Failed'}
            </>
          )}
        </div>
      )}

      {saveBlocker && !saveError && <p className="mb-4 text-xs text-neutral-500">{saveBlocker}</p>}

      {saveError && (
        <div className="mb-4 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-400">{saveError}</div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          disabled={isSaving || !existing}
          className="text-xs text-neutral-600 hover:text-neutral-400"
        >
          Clear zone
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
          <ModalCloseButton className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300">Cancel</ModalCloseButton>
          <PrimaryButton onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
