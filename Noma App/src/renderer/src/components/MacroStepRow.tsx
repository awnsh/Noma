import { FLOW_ACTION_CATALOG, SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import type { Macro, MacroStep } from '@shared/types'
import { ShortcutRecorder } from './ShortcutRecorder'
import { FIELD_INPUT } from '../lib/surfaces'
import { useApplicationsStore } from '../stores/applicationsStore'

type StepType = MacroStep['type']
// 'launchApplication' has no working execution path anywhere yet
// (actionExecutor.ts's executeMacroSteps refuses it with "not implemented
// yet"). Left out of the type-change dropdown below so a step can never
// be switched to one that silently does nothing when the macro runs.
// 'click' is real (main/actions/click.ts) but a click target only ever comes
// from a captured workflow step, so it isn't hand-authored here either.
// 'focusApplication' is selectable: it runs for real and has an application
// picker below.
type SelectableStepType = Exclude<StepType, 'launchApplication' | 'click' | 'none'>

const STEP_TYPE_LABELS: Record<SelectableStepType, string> = {
  shortcut: 'Keyboard shortcut',
  delay: 'Wait',
  focusApplication: 'Switch window',
  systemCommand: 'System action',
  flowAction: 'Flow action',
  macro: 'Run another macro'
}

export function defaultStepForType(type: StepType): MacroStep {
  switch (type) {
    case 'none':
      return { type: 'none' }
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
    case 'focusApplication':
      return { type: 'focusApplication', applicationId: '' }
    case 'click':
      return { type: 'click', target: '' }
    case 'macro':
      return { type: 'macro', macroId: '' }
  }
}

interface MacroStepRowProps {
  step: MacroStep
  index: number
  isFirst: boolean
  isLast: boolean
  /** Other macros this step could reference; the macro being edited is
   *  already excluded by the caller so a step can't reference itself. */
  otherMacros: Macro[]
  onChange: (step: MacroStep) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

const selectClass = FIELD_INPUT

export function MacroStepRow({
  step,
  index,
  isFirst,
  isLast,
  otherMacros,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown
}: MacroStepRowProps) {
  const applicationsById = useApplicationsStore((state) => state.byId)
  const applications = Object.values(applicationsById)
  // A step built from a suggestion may point at an app that isn't in the list.
  const knownApp = applications.some((application) => application.id === (step.type === 'focusApplication' ? step.applicationId : ''))
  return (
    <div className="relative flex gap-3 pb-5 pl-1 last:pb-0">
      {/* Timeline rail: a plain CSS line + dot, no diagramming library needed. */}
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-muted bg-base-900 text-[11px] text-accent">
          {index + 1}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-black/10" />}
      </div>

      <div className="flex-1 rounded-xl border border-white/10 bg-base-900 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <select
            value={step.type}
            onChange={(event) => onChange(defaultStepForType(event.target.value as SelectableStepType))}
            className="rounded-md border border-white/10 bg-base-950 px-2 py-1 text-xs text-neutral-200"
          >
            {(Object.keys(STEP_TYPE_LABELS) as SelectableStepType[]).map((type) => (
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
              className="rounded p-1 text-neutral-500 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              title="Move down"
              className="rounded p-1 text-neutral-500 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete step"
              className="rounded p-1 text-neutral-600 hover:text-red-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
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
                onChange({
                  type: 'delay',
                  ms: Math.max(0, Number(event.target.value) || 0)
                })
              }
              className="w-28 rounded-md border border-white/10 bg-base-950 px-3 py-2 text-sm text-neutral-100"
            />
            <span className="text-xs text-neutral-500">milliseconds</span>
          </div>
        )}

        {step.type === 'focusApplication' && (
          <select
            value={step.applicationId}
            onChange={(event) => onChange({ type: 'focusApplication', applicationId: event.target.value })}
            className={selectClass}
          >
            <option value="" disabled>
              Choose an app
            </option>
            {step.applicationId && !knownApp && <option value={step.applicationId}>{step.applicationId}</option>}
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.name}
              </option>
            ))}
          </select>
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
