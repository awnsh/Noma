import { useEffect } from 'react'
import type { ControlAction } from '@shared/types'
import { useHardwareStore } from '../stores/hardwareStore'
import { useFlowStore } from '../stores/flowStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { useDeveloperStore } from '../stores/developerStore'
import { DeviceLogRow } from '../components/DeviceLogRow'

function describeAction(action: ControlAction): string {
  switch (action.type) {
    case 'shortcut':
      return `shortcut: ${action.keys.join('+')}`
    case 'macro':
      return `macro: ${action.macroId}`
    case 'launchApplication':
      return `launchApplication: ${action.applicationId}`
    case 'systemCommand':
      return `systemCommand: ${action.command}`
    case 'flowAction':
      return `flowAction: ${action.action}`
  }
}

function StatusPill({ ok, onLabel, offLabel }: { ok: boolean; onLabel: string; offLabel: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
        ok ? 'border-accent-muted text-accent' : 'border-white/10 text-neutral-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-accent' : 'bg-neutral-700'}`} />
      {ok ? onLabel : offLabel}
    </span>
  )
}

export function Developer() {
  const hardware = useHardwareStore()
  const flow = useFlowStore()
  const workflow = useWorkflowStore()
  const developer = useDeveloperStore()

  useEffect(() => {
    hardware.refresh()
    flow.refresh()
    workflow.refresh()
    developer.refresh()

    const unsubscribeHardware = hardware.subscribe()
    const unsubscribeContext = flow.subscribeToContext()
    const unsubscribeDeveloper = developer.subscribe()
    return () => {
      unsubscribeHardware()
      unsubscribeContext()
      unsubscribeDeveloper()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { status } = hardware
  const { context } = flow
  const controls = context.profile?.controls ?? []
  const reversedLog = [...developer.log].reverse()

  return (
    <div className="mx-auto max-w-4xl px-10 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-100">Developer</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Hardware connection status, current mappings, and a live HOST↔DEVICE log using the exact
          message names the future STM32 protocol uses — see docs/hardware-protocol.md.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-base-900 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">
            Hardware Connection
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill ok={status.connected} onLabel="Connected" offLabel="Disconnected" />
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-neutral-500">
              {status.deviceType} · v{status.protocolVersion}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-base-900 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">
            Workflow Monitoring
          </div>
          <div className="mt-2">
            <StatusPill ok={workflow.enabled} onLabel="Enabled" offLabel="Disabled" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-base-900 px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">
            Keystroke Execution
          </div>
          <div className="mt-2">
            <StatusPill
              ok={developer.executionStatus?.keystrokeExecutionEnabled ?? false}
              onLabel="Enabled"
              offLabel="Disabled"
            />
          </div>
          {!developer.executionStatus?.keystrokeExecutionEnabled && (
            <p className="mt-1.5 text-[11px] leading-snug text-neutral-600">
              Off after real crashes during testing — see docs/architecture.md.
            </p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
          Current Control Mappings
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-base-900">
          {controls.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-600">
              {context.application
                ? `No profile configured for ${context.application.name}.`
                : 'No application detected yet.'}
            </div>
          ) : (
            controls
              .slice()
              .sort((a, b) => a.slot - b.slot)
              .map((control) => (
                <div
                  key={control.id}
                  className="flex items-center gap-4 border-b border-white/5 px-4 py-2 text-sm last:border-b-0"
                >
                  <span className="w-16 shrink-0 text-[10px] uppercase tracking-widest text-neutral-600">
                    Slot {control.slot}
                  </span>
                  <span className="w-32 shrink-0 text-neutral-200">{control.label}</span>
                  <span className="truncate font-mono text-xs text-neutral-500">
                    {describeAction(control.action)}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
          Modules ({status.modules.length})
        </div>
        {status.modules.length === 0 ? (
          <p className="text-sm text-neutral-600">
            None connected — add one from the Virtual Keyboard page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {status.modules.map((module) => (
              <span
                key={module.id}
                className="rounded-full border border-white/10 bg-base-900 px-3 py-1 text-xs text-neutral-400"
              >
                {module.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
          HOST ↔ DEVICE Log
        </div>
        <div className="max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-base-900">
          {reversedLog.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-600">
              No events yet — switch applications or press a control.
            </div>
          ) : (
            reversedLog.map((entry, index) => (
              <DeviceLogRow key={`${entry.timestamp}-${entry.type}-${index}`} entry={entry} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
