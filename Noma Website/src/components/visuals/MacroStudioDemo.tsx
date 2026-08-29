// A faithful interactive recreation of the real app's Macro Studio page
// (src/renderer/src/pages/MacroStudio.tsx + MacroEditor.tsx) — same
// sidebar-list-plus-editor shape, driven by local state instead of the real
// app's window.flow IPC (see AppPreview.tsx's doc comment). "Save" just
// commits the draft back into this session's macro list — there's no
// database to write to in a marketing mockup, but every other interaction
// (add/reorder/delete a step, record a real shortcut, rename, enable/disable,
// create a new macro from scratch) is the real editor's own behavior.

import { useEffect, useState } from 'react'
import MacroStepRow, { NEW_STEP_LABELS } from './MacroStepRow'
import { defaultStepForType, initialMacros, type DemoMacro, type MacroStep } from '../../data/macroDemo'

const STEP_TYPES: MacroStep['type'][] = ['shortcut', 'delay', 'systemCommand', 'flowAction']

let nextId = 0

export default function MacroStudioDemo() {
  const [macros, setMacros] = useState<DemoMacro[]>(initialMacros)
  const [selectedId, setSelectedId] = useState<string | null>(initialMacros[0]?.id ?? null)
  const [savedFlash, setSavedFlash] = useState(false)

  const selected = macros.find((m) => m.id === selectedId) ?? null

  // Local draft state, re-seeded whenever the selected macro changes — mirrors
  // the real MacroEditor's "don't leak edits between macros" effect.
  const [name, setName] = useState(selected?.name ?? '')
  const [enabled, setEnabled] = useState(selected?.enabled ?? true)
  const [actions, setActions] = useState<MacroStep[]>(selected?.actions ?? [])

  useEffect(() => {
    setName(selected?.name ?? '')
    setEnabled(selected?.enabled ?? true)
    setActions(selected?.actions ?? [])
    setSavedFlash(false)
  }, [selectedId])

  const handleNew = () => {
    const id = `draft-${nextId++}`
    const macro: DemoMacro = { id, name: 'New Macro', enabled: true, actions: [] }
    setMacros((prev) => [...prev, macro])
    setSelectedId(id)
  }

  const handleSave = () => {
    if (!selected) return
    setMacros((prev) =>
      prev.map((m) => (m.id === selected.id ? { ...m, name: name.trim() || 'Untitled Macro', enabled, actions } : m))
    )
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1200)
  }

  const handleDelete = () => {
    if (!selected) return
    setMacros((prev) => prev.filter((m) => m.id !== selected.id))
    setSelectedId(null)
  }

  const updateStep = (index: number, step: MacroStep) =>
    setActions((prev) => prev.map((existing, i) => (i === index ? step : existing)))
  const deleteStep = (index: number) => setActions((prev) => prev.filter((_, i) => i !== index))
  const moveStep = (index: number, direction: -1 | 1) =>
    setActions((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  const addStep = (type: MacroStep['type']) => setActions((prev) => [...prev, defaultStepForType(type)])

  return (
    <div className="flex min-h-[26rem]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-base-700 p-5">
        <div className="mb-1 text-base font-semibold text-base-100">Macro Studio</div>
        <p className="mb-4 text-[11px] text-base-500">Build a sequence once, assign it to any control.</p>
        <button
          type="button"
          onClick={handleNew}
          className="mb-3 rounded-md border border-accent-dim bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20"
        >
          + New Macro
        </button>

        {macros.length === 0 ? (
          <p className="text-xs text-base-600">No macros yet.</p>
        ) : (
          <ul className="flex-1 space-y-1 overflow-y-auto">
            {macros.map((macro) => (
              <li key={macro.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(macro.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    selectedId === macro.id
                      ? 'bg-base-700/60 text-base-100'
                      : 'text-base-400 hover:bg-base-700/40 hover:text-base-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{macro.name}</span>
                    {!macro.enabled && <span className="text-[10px] uppercase tracking-widest text-base-600">Off</span>}
                  </div>
                  <div className="text-[11px] text-base-600">
                    {macro.actions.length} step{macro.actions.length === 1 ? '' : 's'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {selected ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-base-500">
                Macro name
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full max-w-xs rounded-md border border-base-600 bg-base-900 px-3 py-2 text-base font-medium text-base-100"
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-xs text-base-400">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-3.5 w-3.5 accent-accent"
              />
              Enabled
            </label>
          </div>

          <div className="mb-5">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-base-500">Steps</div>
            {actions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-base-700 px-4 py-6 text-center text-sm text-base-600">
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
                    onChange={(next) => updateStep(index, next)}
                    onDelete={() => deleteStep(index)}
                    onMoveUp={() => moveStep(index, -1)}
                    onMoveDown={() => moveStep(index, 1)}
                  />
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {STEP_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addStep(type)}
                  className="rounded-full border border-base-700 px-3 py-1.5 text-xs text-base-400 hover:border-accent-dim hover:text-accent"
                >
                  {NEW_STEP_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md border border-accent-dim bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
            >
              Save
            </button>
            {savedFlash && <span className="text-xs text-accent">✓ Saved</span>}
            <div className="flex-1" />
            <button type="button" onClick={handleDelete} className="text-xs text-base-600 hover:text-error">
              Delete macro
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-base-600">
          Select a macro, or create a new one.
        </div>
      )}
    </div>
  )
}
