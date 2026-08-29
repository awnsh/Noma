import { useEffect, useState } from 'react'
import { MODULE_CATALOG } from '@shared/constants'
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

function DevToolButton({
  children,
  onClick,
  disabled,
  title
}: {
  children: string
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-accent-muted hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function StatusPill({
  ok,
  onLabel,
  offLabel,
  tone = 'accent'
}: {
  ok: boolean
  onLabel: string
  offLabel: string
  /** 'gold' for a real hardware-connection state (matches the website's
   *  "gold = real hardware contact" rule) — leave the default 'accent' for
   *  a software/interface toggle like workflow monitoring. */
  tone?: 'accent' | 'gold'
}) {
  // Full literal class strings (not a templated `${tone}`) — Tailwind's
  // content scanner needs the complete class name to appear as-is in
  // source, it can't resolve one assembled from a runtime variable.
  const okClasses =
    tone === 'gold' ? 'border-gold-muted text-gold' : 'border-accent-muted text-accent'
  const dotClasses = tone === 'gold' ? 'bg-gold' : 'bg-accent'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
        ok ? okClasses : 'border-white/10 text-neutral-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? dotClasses : 'bg-neutral-700'}`} />
      {ok ? onLabel : offLabel}
    </span>
  )
}

export function Developer() {
  const hardware = useHardwareStore()
  const flow = useFlowStore()
  const workflow = useWorkflowStore()
  const developer = useDeveloperStore()
  const [selectedControlId, setSelectedControlId] = useState<string>('')
  const [selectedModuleType, setSelectedModuleType] = useState(MODULE_CATALOG[0].type)

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
  const encoderModule = status.modules.find((module) => module.capabilities.includes('rotate'))

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
            <StatusPill ok={status.connected} onLabel="Connected" offLabel="Disconnected" tone="gold" />
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-neutral-500">
              Virtual Device · v{status.protocolVersion}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-700">
            Future: Noma Prototype (STM32) — not yet connected, no physical hardware exists yet. See{' '}
            src/main/hardware/stm32Device.ts.
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

      <div className="mb-8 rounded-xl border border-white/10 bg-base-900 px-4 py-4">
        <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
          Hardware Bring-Up Tools
        </div>
        <p className="mb-3 text-[11px] text-neutral-600">
          Every button below calls the real VirtualHardwareDevice — the same object real usage
          drives — never a separate fake path. Useful today for exercising the event pipeline;
          this is exactly the toolset a real STM32 bring-up will need.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DevToolButton onClick={() => void developer.ping()}>Ping</DevToolButton>
          {developer.lastPing && (
            <span className="text-[11px] text-neutral-500">
              {developer.lastPing.ok ? '✓' : '✗'} {developer.lastPing.latencyMs}ms
            </span>
          )}

          <DevToolButton onClick={() => void developer.reset()}>Reset</DevToolButton>

          <DevToolButton onClick={() => void developer.clearLog()}>Clear Log</DevToolButton>

          <span className="mx-1 h-4 w-px bg-white/10" />

          <select
            value={selectedControlId}
            onChange={(event) => setSelectedControlId(event.target.value)}
            disabled={controls.length === 0}
            className="rounded-md border border-white/10 bg-base-950 px-2 py-1 text-[11px] text-neutral-300 disabled:opacity-40"
          >
            <option value="" disabled>
              {controls.length === 0 ? 'No controls' : 'Choose a control…'}
            </option>
            {controls.map((control) => (
              <option key={control.id} value={control.id}>
                Slot {control.slot} · {control.label}
              </option>
            ))}
          </select>
          <DevToolButton
            disabled={!selectedControlId}
            onClick={() => selectedControlId && void hardware.pressControl(selectedControlId)}
          >
            Simulate Button Press
          </DevToolButton>

          <span className="mx-1 h-4 w-px bg-white/10" />

          <DevToolButton
            disabled={!encoderModule}
            onClick={() => encoderModule && void hardware.simulateEncoderRotation(encoderModule.id, 1)}
            title={encoderModule ? undefined : 'Add a Rotary Encoder Module from the Virtual Keyboard page first'}
          >
            Simulate Encoder Rotation
          </DevToolButton>

          <span className="mx-1 h-4 w-px bg-white/10" />

          <select
            value={selectedModuleType}
            onChange={(event) => setSelectedModuleType(event.target.value)}
            className="rounded-md border border-white/10 bg-base-950 px-2 py-1 text-[11px] text-neutral-300"
          >
            {MODULE_CATALOG.map((entry) => (
              <option key={entry.type} value={entry.type}>
                {entry.name}
              </option>
            ))}
          </select>
          <DevToolButton onClick={() => void hardware.addModule(selectedModuleType)}>
            Simulate Module Connect
          </DevToolButton>
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
