import { FLOW_ACTION_CATALOG, SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import type { Application, Macro, MacroStep } from '@shared/types'
import { ShortcutRecorder } from './ShortcutRecorder'

type StepType = MacroStep['type']

const STEP_TYPE_LABELS: Record<StepType, string> = {
  shortcut: 'Keyboard shortcut',
  delay: 'Wait',
  systemCommand: 'System action',
  flowAction: 'Flow action',
  launchApplication: 'Launch application',
  macro: 'Run another macro'
}

export function defaultStepForType(type: StepType): MacroStep {
  switch (type) {
    case 'shortcut':
      return { type: 'shortcut', keys: [] }
    case 'delay':
      return { type: 'delay', ms: 500 }
    case 'systemCommand':
      return { type: 'systemCommand', command: SYSTEM_COMMAND_CATALOG[0] }
    case 'flowAction':
      return { type: 'flowAction', action: FLOW_ACTION_CATALOG[0] }
    case 'launchApplication':
      return { type: 'launchApplication', applicationId: '' }
    case 'macro':
      return { type: 'macro', macroId: '' }
  }
}

interface MacroStepRowProps {
  step: MacroStep
  index: number
  isFirst: boolean
  isLast: boolean
  /** Other macros this step could reference — the macro being edited is
   *  already excluded by the caller so a step can't reference itself. */
  otherMacros: Macro[]
  applications: Application[]
  onChange: (step: MacroStep) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

const selectClass =
  'w-full rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100'

export function MacroStepRow({
  step,
  index,
  isFirst,
  isLast,
  otherMacros,
  applications,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown
}: MacroStepRowProps) {
  return (
    <div className="relative flex gap-3 pb-5 pl-1 last:pb-0">
      {/* Timeline rail — a plain CSS line + dot, no diagramming library needed. */}
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-muted bg-base-900 text-[11px] text-accent">
          {index + 1}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-white/10" />}
      </div>

      <div className="flex-1 rounded-xl border border-white/10 bg-base-900 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <select
            value={step.type}
            onChange={(event) => onChange(defaultStepForType(event.target.value as StepType))}
            className="rounded-md border border-white/10 bg-base-950 px-2 py-1 text-xs text-neutral-200"
          >
            {(Object.keys(STEP_TYPE_LABELS) as StepType[]).map((type) => (
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
              className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              title="Move down"
              className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete step"
              className="rounded px-1.5 py-0.5 text-xs text-neutral-600 hover:text-red-400"
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
              onChange={(event) =>
                onChange({ type: 'delay', ms: Math.max(0, Number(event.target.value) || 0) })
              }
              className="w-28 rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
            />
            <span className="text-xs text-neutral-500">milliseconds</span>
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

        {step.type === 'launchApplication' && (
          <>
            <select
              value={step.applicationId}
              onChange={(event) =>
                onChange({ type: 'launchApplication', applicationId: event.target.value })
              }
              className={selectClass}
            >
              <option value="" disabled>
                Choose an application…
              </option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-neutral-600">
              Not implemented yet — this will save, but running it reports a clear "not implemented"
              result rather than doing nothing silently.
            </p>
          </>
        )}

        {step.type === 'macro' && (
          <>
            {otherMacros.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/10 px-3 py-2 text-xs text-neutral-600">
                No other macros yet to reference.
              </p>
            ) : (
              <select
                value={step.macroId}
                onChange={(event) => onChange({ type: 'macro', macroId: event.target.value })}
                className={selectClass}
              >
                <option value="" disabled>
                  Choose a macro…
                </option>
                {otherMacros.map((macro) => (
                  <option key={macro.id} value={macro.id}>
                    {macro.name}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </div>
    </div>
  )
}
