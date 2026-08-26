import { useEffect, useState } from 'react'
import { useHardwareStore } from '../stores/hardwareStore'
import { VirtualControlButton } from '../components/VirtualControlButton'
import { ModuleChip } from '../components/ModuleChip'
import { AddModuleMenu } from '../components/AddModuleMenu'

function describeEvent(event: { type: string } & Record<string, unknown>): string {
  switch (event.type) {
    case 'buttonPress':
      return `BUTTON_PRESS · slot ${event.slot}`
    case 'moduleConnected':
      return `MODULE_CONNECTED · ${(event.module as { name?: string })?.name ?? 'module'}`
    case 'moduleDisconnected':
      return 'MODULE_DISCONNECTED'
    case 'encoderRotate':
      return 'ENCODER_ROTATE'
    default:
      return event.type
  }
}

export function VirtualKeyboard() {
  const { status, lastEvent, isLoading, refresh, subscribe, pressControl, addModule, removeModule } =
    useHardwareStore()
  const [flashEvent, setFlashEvent] = useState(false)

  useEffect(() => {
    refresh()
    const unsubscribe = subscribe()
    return unsubscribe
  }, [refresh, subscribe])

  useEffect(() => {
    if (!lastEvent) return
    setFlashEvent(true)
    const timeout = window.setTimeout(() => setFlashEvent(false), 600)
    return () => window.clearTimeout(timeout)
  }, [lastEvent])

  const statusDisplay = status.displays['status'] ?? (isLoading ? 'Loading…' : 'Idle')

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">Virtual Keyboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            A software simulation of the physical device. It will be replaced/connected to real
            STM32 hardware later — see docs/architecture.md.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${status.connected ? 'bg-accent' : 'bg-neutral-700'}`}
          />
          <span className="text-neutral-400">{status.connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* The deck */}
      <div className="rounded-3xl border border-white/10 bg-base-900 p-6 shadow-2xl shadow-black/40">
        {/* Display strip */}
        <div className="mb-6 rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm text-accent">
          {statusDisplay}
        </div>

        {/* Contextual controls */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((slot) => (
            <VirtualControlButton
              key={slot}
              slot={slot}
              control={status.controls.find((control) => control.slot === slot)}
              onPress={pressControl}
            />
          ))}
        </div>

        {/* Last device event, for visibility into the DEVICE -> HOST path */}
        <div
          className={`mb-6 rounded-lg border px-3 py-2 text-xs transition-colors ${
            flashEvent ? 'border-accent-muted text-accent' : 'border-white/5 text-neutral-600'
          }`}
        >
          {lastEvent ? describeEvent(lastEvent) : 'No device events yet — press a control above.'}
        </div>

        {/* Modular slots */}
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-neutral-500">
            Modular Slots
          </div>
          <div className="flex flex-wrap gap-3">
            {status.modules.map((module) => (
              <ModuleChip key={module.id} module={module} onRemove={removeModule} />
            ))}
            <AddModuleMenu onAdd={addModule} />
          </div>
        </div>
      </div>
    </div>
  )
}
