import { useEffect, useState } from 'react'
import type { Application, Macro, MacroStep } from '@shared/types'
import { MacroStepRow, defaultStepForType } from './MacroStepRow'

interface MacroEditorProps {
  /** null means "unsaved new macro" — Save calls createMacro instead of updateMacro. */
  macro: Macro | null
  applications: Application[]
  allMacros: Macro[]
  onSaved: (macro: Macro) => void
  onDeleted: () => void
  /** Only meaningful in new-macro mode — discards the draft. */
  onDiscardNew: () => void
}

const STEP_TYPES_FOR_NEW_STEP: MacroStep['type'][] = [
  'shortcut',
  'delay',
  'systemCommand',
  'flowAction',
  'launchApplication',
  'macro'
]

const NEW_STEP_LABELS: Record<MacroStep['type'], string> = {
  shortcut: '+ Shortcut',
  delay: '+ Wait',
  systemCommand: '+ System action',
  flowAction: '+ Flow action',
  launchApplication: '+ Launch app',
  macro: '+ Run macro'
}

export function MacroEditor({
  macro,
  applications,
  allMacros,
  onSaved,
  onDeleted,
  onDiscardNew
}: MacroEditorProps) {
  const [name, setName] = useState(macro?.name ?? 'New Macro')
  const [actions, setActions] = useState<MacroStep[]>(macro?.actions ?? [])
  const [enabled, setEnabled] = useState(macro?.enabled ?? true)
  const [assignments, setAssignments] = useState<
    Array<{ applicationId: string; applicationName: string; slot: number; label: string }>
  >([])
  const [assignAppId, setAssignAppId] = useState('')
  const [assignSlot, setAssignSlot] = useState(1)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  // Re-seed local edit state whenever the selected macro changes (including
  // switching to/from "new macro" mode) — otherwise the previous macro's
  // in-progress edits would leak into the next one.
  useEffect(() => {
    setName(macro?.name ?? 'New Macro')
    setActions(macro?.actions ?? [])
    setEnabled(macro?.enabled ?? true)
    setTestResult(null)
    setDeleteConfirming(false)
    setAssignError(null)
  }, [macro?.id])

  useEffect(() => {
    if (!macro) {
      setAssignments([])
      return
    }
    window.flow.getControlsReferencingMacro(macro.id).then(setAssignments)
  }, [macro?.id])

  const otherMacros = allMacros.filter((candidate) => candidate.id !== macro?.id)
  const canSave = name.trim().length > 0

  const updateStep = (index: number, step: MacroStep): void => {
    setActions((prev) => prev.map((existing, i) => (i === index ? step : existing)))
  }
  const deleteStep = (index: number): void => {
    setActions((prev) => prev.filter((_, i) => i !== index))
  }
  const moveStep = (index: number, direction: -1 | 1): void => {
    setActions((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const addStep = (type: MacroStep['type']): void => {
    setActions((prev) => [...prev, defaultStepForType(type)])
  }

  const handleTest = async (): Promise<void> => {
    setIsTesting(true)
    setTestResult(null)
    const result = await window.flow.testMacroSteps(actions)
    setTestResult(result)
    setIsTesting(false)
  }

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    if (macro) {
      const updated = await window.flow.updateMacro(macro.id, { name: name.trim(), actions, enabled })
      setIsSaving(false)
      if (updated) onSaved(updated)
    } else {
      const created = await window.flow.createMacro(name.trim(), actions)
      setIsSaving(false)
      onSaved(created)
    }
  }

  const handleDuplicate = async (): Promise<void> => {
    if (!macro) return
    const copy = await window.flow.duplicateMacro(macro.id)
    if (copy) onSaved(copy)
  }

  const handleDelete = async (): Promise<void> => {
    if (!macro) return
    await window.flow.deleteMacro(macro.id)
    onDeleted()
  }

  const handleAssign = async (): Promise<void> => {
    if (!macro) return
    setAssignError(null)
    const profile = await window.flow.updateControl(assignAppId, assignSlot, name.trim(), {
      type: 'macro',
      macroId: macro.id
    })
    if (!profile) {
      setAssignError('No profile configured for that application yet — nothing to assign this into.')
      return
    }
    setAssignments(await window.flow.getControlsReferencingMacro(macro.id))
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-neutral-500">
            Macro name
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full max-w-sm rounded-md border border-white/10 bg-base-900 px-3 py-2 text-lg font-medium text-neutral-100"
          />
        </div>
        <label className="mt-6 flex items-center gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Enabled
        </label>
      </div>

      <div className="mb-6">
        <div className="mb-3 text-[10px] uppercase tracking-widest text-neutral-500">Steps</div>

        {actions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-neutral-600">
            No steps yet — add one below.
          </p>
        ) : (
          <div>
            {actions.map((step, index) => (
              <MacroStepRow
                key={index}
                step={step}
                index={index}
                isFirst={index === 0}
                isLast={index === actions.length - 1}
                otherMacros={otherMacros}
                applications={applications}
                onChange={(next) => updateStep(index, next)}
                onDelete={() => deleteStep(index)}
                onMoveUp={() => moveStep(index, -1)}
                onMoveDown={() => moveStep(index, 1)}
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {STEP_TYPES_FOR_NEW_STEP.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addStep(type)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-400 hover:border-accent-muted hover:text-accent"
            >
              {NEW_STEP_LABELS[type]}
            </button>
          ))}
        </div>
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

      <div className="mb-8 flex items-center gap-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting || actions.length === 0}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isTesting ? 'Testing…' : 'Test'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="rounded-md border border-accent-muted bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        {macro && (
          <button
            type="button"
            onClick={handleDuplicate}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-white/30"
          >
            Duplicate
          </button>
        )}
        {!macro && (
          <button
            type="button"
            onClick={onDiscardNew}
            className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300"
          >
            Discard
          </button>
        )}
        <div className="flex-1" />
        {macro && !deleteConfirming && (
          <button
            type="button"
            onClick={() => setDeleteConfirming(true)}
            className="text-xs text-neutral-600 hover:text-red-400"
          >
            Delete macro
          </button>
        )}
        {macro && deleteConfirming && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">
              {assignments.length > 0
                ? `Used by ${assignments.length} control${assignments.length === 1 ? '' : 's'} — delete anyway?`
                : 'Delete this macro?'}
            </span>
            <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300">
              Delete
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirming(false)}
              className="text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {macro && (
        <div className="rounded-xl border border-white/10 bg-base-900 p-4">
          <div className="mb-3 text-[10px] uppercase tracking-widest text-neutral-500">
            Assigned controls
          </div>
          {assignments.length === 0 ? (
            <p className="mb-3 text-xs text-neutral-600">Not assigned to any control yet.</p>
          ) : (
            <ul className="mb-3 space-y-1 text-xs text-neutral-400">
              {assignments.map((assignment) => (
                <li key={`${assignment.applicationId}-${assignment.slot}`}>
                  {assignment.applicationName} · slot {assignment.slot} ({assignment.label})
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={assignAppId}
              onChange={(event) => setAssignAppId(event.target.value)}
              className="rounded-md border border-white/10 bg-base-950 px-2 py-1.5 text-xs text-neutral-200"
            >
              <option value="" disabled>
                Application…
              </option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.name}
                </option>
              ))}
            </select>
            <select
              value={assignSlot}
              onChange={(event) => setAssignSlot(Number(event.target.value))}
              className="rounded-md border border-white/10 bg-base-950 px-2 py-1.5 text-xs text-neutral-200"
            >
              {[1, 2, 3, 4].map((slot) => (
                <option key={slot} value={slot}>
                  Slot {slot}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!assignAppId}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:border-accent-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Assign
            </button>
          </div>
          {assignError && <p className="mt-2 text-[11px] text-neutral-600">{assignError}</p>}
        </div>
      )}
    </div>
  )
}
