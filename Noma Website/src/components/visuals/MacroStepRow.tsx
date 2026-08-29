// Simplified port of the real app's MacroStepRow.tsx (src/renderer/src/components) —
// same timeline-rail layout and per-step-type editor, trimmed to the step types
// that don't need a cross-app picker list (see macroDemo.ts's doc comment).

import {
  FLOW_ACTION_CATALOG,
  NEW_STEP_LABELS,
  STEP_TYPE_LABELS,
  SYSTEM_COMMAND_CATALOG,
  defaultStepForType,
  type MacroStep,
} from '../../data/macroDemo'
import ShortcutRecorder from './ShortcutRecorder'

interface MacroStepRowProps {
  step: MacroStep
  index: number
  isFirst: boolean
  isLast: boolean
  onChange: (step: MacroStep) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

const selectClass = 'w-full rounded-md border border-base-600 bg-base-950 px-3 py-2 text-sm text-base-100'

export default function MacroStepRow({
  step,
  index,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MacroStepRowProps) {
  return (
    <div className="relative flex gap-3 pb-5 pl-1 last:pb-0">
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-dim bg-base-900 text-[11px] text-accent">
          {index + 1}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-base-700" />}
      </div>

      <div className="flex-1 rounded-xl border border-base-700 bg-base-900 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <select
            value={step.type}
            onChange={(event) => onChange(defaultStepForType(event.target.value as MacroStep['type']))}
            className="rounded-md border border-base-600 bg-base-950 px-2 py-1 text-xs text-base-200"
          >
            {(Object.keys(STEP_TYPE_LABELS) as MacroStep['type'][]).map((type) => (
              <option key={type} value={type}>
                {STEP_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              title="Move up"
              className="rounded px-1.5 py-0.5 text-xs text-base-500 hover:text-base-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              title="Move down"
              className="rounded px-1.5 py-0.5 text-xs text-base-500 hover:text-base-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete step"
              className="rounded px-1.5 py-0.5 text-xs text-base-600 hover:text-error"
            >
              ✕
            </button>
          </div>
        </div>

        {step.type === 'shortcut' && (
          <ShortcutRecorder value={step.keys} onChange={(keys) => onChange({ type: 'shortcut', keys })} />
        )}

        {step.type === 'delay' && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={50}
              value={step.ms}
              onChange={(event) => onChange({ type: 'delay', ms: Math.max(0, Number(event.target.value) || 0) })}
              className="w-28 rounded-md border border-base-600 bg-base-950 px-3 py-2 text-sm text-base-100"
            />
            <span className="text-xs text-base-500">milliseconds</span>
          </div>
        )}

        {step.type === 'systemCommand' && (
          <select
            value={step.command}
            onChange={(event) => onChange({ type: 'systemCommand', command: event.target.value })}
            className={selectClass}
          >
            {SYSTEM_COMMAND_CATALOG.map((command) => (
              <option key={command} value={command}>
                {command}
              </option>
            ))}
          </select>
        )}

        {step.type === 'flowAction' && (
          <select
            value={step.action}
            onChange={(event) => onChange({ type: 'flowAction', action: event.target.value })}
            className={selectClass}
          >
            {FLOW_ACTION_CATALOG.map((flowAction) => (
              <option key={flowAction} value={flowAction}>
                {flowAction}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

export { NEW_STEP_LABELS }
