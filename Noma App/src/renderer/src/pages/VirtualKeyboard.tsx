import { useEffect, useRef, useState } from 'react'
import { useHardwareStore } from '../stores/hardwareStore'
import { useFlowStore } from '../stores/flowStore'
import { KeyboardLayout } from '../components/KeyboardLayout'
import { VirtualControlButton } from '../components/VirtualControlButton'
import { ModuleChip } from '../components/ModuleChip'
import { AddModuleMenu } from '../components/AddModuleMenu'
import { SuggestionsPanel } from '../components/SuggestionsPanel'
import { ControlEditorModal } from '../components/ControlEditorModal'

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
  const {
    status,
    lastEvent,
    lastExecution,
    isLoading,
    refresh,
    subscribe,
    pressControl,
    addModule,
    removeModule
  } = useHardwareStore()
  const { context, refresh: refreshContext, subscribeToContext } = useFlowStore()
  const [flashEvent, setFlashEvent] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(new Set())
  const flashTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    refresh()
    refreshContext()
    const unsubscribeHardware = subscribe()
    const unsubscribeContext = subscribeToContext()
    return () => {
      unsubscribeHardware()
      unsubscribeContext()
    }
  }, [refresh, subscribe, refreshContext, subscribeToContext])

  useEffect(() => {
    const unsubscribe = window.flow.onWorkflowComboCaptured((comboKeys) => {
      // A new combo replaces whatever was flashing, and resets the clock —
      // without this, an in-flight timeout from a *previous* combo could
      // fire mid-way through this one and clear it early.
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current)
      setFlashingKeys(new Set(comboKeys))
      flashTimeoutRef.current = window.setTimeout(() => setFlashingKeys(new Set()), 500)
    })
    return () => {
      unsubscribe()
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!lastEvent) return
    setFlashEvent(true)
    const timeout = window.setTimeout(() => setFlashEvent(false), 600)
    return () => window.clearTimeout(timeout)
  }, [lastEvent])

  const statusDisplay = status.displays['status'] ?? (isLoading ? 'Loading…' : 'Idle')
  const application = context.application

  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">Virtual Keyboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            A digital twin of the eventual physical device. Every control here really executes —
            shortcuts are sent for real, MUTE really changes volume, CLOSE WINDOW posts the same
            graceful close a title bar's X button sends. See "Real execution" in
            docs/architecture.md.
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
        <KeyboardLayout flashingKeys={flashingKeys} />

        {/* Display strip */}
        <div className="mb-6 rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm text-accent">
          {statusDisplay}
        </div>

        {/* Contextual controls */}
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">
            {application ? application.name : 'No application detected'}
          </div>
          <button
            type="button"
            onClick={() => setIsEditMode((prev) => !prev)}
            className={`rounded-full border px-3 py-1 text-[11px] ${
              isEditMode
                ? 'border-accent-muted bg-accent/10 text-accent'
                : 'border-white/10 text-neutral-400 hover:border-white/30 hover:text-neutral-200'
            }`}
          >
            {isEditMode ? 'Done editing' : 'Edit Controls'}
          </button>
        </div>
        <div className="mb-3 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((slot) => (
            <VirtualControlButton
              key={slot}
              slot={slot}
              control={status.controls.find((control) => control.slot === slot)}
              onPress={pressControl}
              editMode={isEditMode}
              onEdit={setEditingSlot}
            />
          ))}
        </div>

        {/* Last device event + whether the action actually executed */}
        <div
          className={`mb-6 rounded-lg border px-3 py-2 text-xs transition-colors ${
            flashEvent ? 'border-accent-muted text-accent' : 'border-white/5 text-neutral-600'
          }`}
        >
          {lastEvent ? describeEvent(lastEvent) : 'No device events yet — press a control above.'}
          {lastExecution && (
            <span className={lastExecution.ok ? 'ml-2 text-accent' : 'ml-2 text-red-400'}>
              {lastExecution.ok ? '✓ executed' : `✗ ${lastExecution.reason ?? 'failed'}`}
            </span>
          )}
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

      <div className="mt-8">
        <SuggestionsPanel />
      </div>

      {editingSlot !== null && application && (
        <ControlEditorModal
          applicationId={application.id}
          applicationName={application.name}
          slot={editingSlot}
          control={status.controls.find((control) => control.slot === editingSlot)}
          onClose={() => setEditingSlot(null)}
          onSaved={() => {
            refresh()
            refreshContext()
          }}
        />
      )}
    </div>
  )
}
