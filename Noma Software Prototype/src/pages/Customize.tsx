import { useMemo, useState } from 'react'
import { AppSwitcher } from '../components/AppSwitcher'
import { ControlIcon } from '../components/ControlIcon'
import { ChevronDownIcon, ChevronUpIcon, DragHandleIcon } from '../components/Icon'
import { GLASS_CARD } from '../lib/surfaces'
import { appProfiles } from '../data/appProfiles'
import { useNomaStore } from '../store/nomaStore'

/** A section label — Inter, not mono. Mono is reserved for technical
 *  readouts (shortcuts, counts, timestamps) per DESIGN.md; a plain section
 *  heading like "Also Available" isn't technical content, so it shouldn't
 *  wear a mono costume. */
const LABEL = 'text-[10px] font-medium uppercase tracking-widest text-base-500'

/**
 * "Your Noma" (brief section 10) — deliberately not the primary experience.
 * Noma already decided a sensible default (Workspace); this is where a
 * visitor who wants control over that default gets it. Primary/pinned
 * controls are reorderable (drag, or the chevron buttons for touch/
 * keyboard); the rest use Noma's own ordering.
 */
export function Customize() {
  const currentAppId = useNomaStore((s) => s.currentAppId)
  const selectApp = useNomaStore((s) => s.selectApp)
  const customization = useNomaStore((s) => s.customization)
  const pinControl = useNomaStore((s) => s.pinControl)
  const unpinControl = useNomaStore((s) => s.unpinControl)
  const removeControl = useNomaStore((s) => s.removeControl)
  const restoreControl = useNomaStore((s) => s.restoreControl)
  const reorderPinned = useNomaStore((s) => s.reorderPinned)
  const resetCustomization = useNomaStore((s) => s.resetCustomization)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dismissedSuggestion, setDismissedSuggestion] = useState<Record<string, boolean>>({})

  const app = appProfiles[currentAppId]
  const { pinned, removed } = customization[currentAppId]

  const available = useMemo(
    () => app.controls.filter((c) => !pinned.includes(c.id) && !removed.includes(c.id)),
    [app, pinned, removed],
  )
  const removedControls = useMemo(() => app.controls.filter((c) => removed.includes(c.id)), [app, removed])
  const pinnedControls = pinned.map((id) => app.controls.find((c) => c.id === id)!).filter(Boolean)

  const suggested = !dismissedSuggestion[currentAppId] ? available[0] : undefined

  const move = (from: number, to: number): void => {
    if (to < 0 || to >= pinnedControls.length) return
    reorderPinned(currentAppId, from, to)
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-lg font-semibold text-base-50 sm:text-xl">Your Noma</h1>
      <p className="mt-1 text-sm text-base-500">
        Noma automatically handles most of this. Customize it when you want to.
      </p>

      <div className="mt-5">
        <AppSwitcher activeId={currentAppId} onSelect={selectApp} />
      </div>

      {suggested && (
        <div className="mt-5 rounded-xl border border-flow-dim bg-flow/[0.05] px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-widest text-flow">Noma suggests</div>
          <p className="mt-1 text-sm text-base-200">
            Pin <span className="text-base-50">{suggested.label}</span> as a primary control for {app.shortName}?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => pinControl(currentAppId, suggested.id)}
              className="rounded-md border border-flow-dim bg-flow/10 px-3 py-1 text-xs font-medium text-flow-bright hover:bg-flow/20"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setDismissedSuggestion((s) => ({ ...s, [currentAppId]: true }))}
              className="rounded-md px-3 py-1 text-xs text-base-500 hover:text-base-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className={`mt-6 p-5 ${GLASS_CARD}`}>
        <div className="flex items-center justify-between">
          <div className={LABEL}>Primary — drag to reorder</div>
        </div>
        {pinnedControls.length === 0 ? (
          <p className="mt-3 text-sm text-base-600">
            Nothing pinned yet. Accept a suggestion in the Workspace, or pin a control below.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {pinnedControls.map((control, index) => (
              <div
                key={control.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) move(dragIndex, index)
                  setDragIndex(null)
                }}
                className="flex items-center gap-3 rounded-lg border border-accent-dim bg-accent/[0.04] px-3 py-2.5"
              >
                <DragHandleIcon aria-hidden className="h-4 w-4 shrink-0 cursor-grab text-base-600" />
                <ControlIcon label={control.label} className="h-4 w-4 shrink-0 text-accent-bright" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-base-100">{control.label}</div>
                  <div className="font-mono text-[10px] text-base-500">{control.shortcut}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Move up" className="rounded p-1 text-base-500 hover:text-base-200 disabled:opacity-30">
                    <ChevronUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(index, index + 1)} disabled={index === pinnedControls.length - 1} aria-label="Move down" className="rounded p-1 text-base-500 hover:text-base-200 disabled:opacity-30">
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => unpinControl(currentAppId, control.id)} className="ml-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-base-400 hover:border-white/20 hover:text-base-200">Unpin</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`mt-4 p-5 ${GLASS_CARD}`}>
        <div className={LABEL}>Also Available</div>
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-base-600">Everything is pinned or hidden.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {available.map((control) => (
              <div key={control.id} className="flex items-center gap-3 rounded-lg border border-white/[0.06] px-3 py-2.5">
                <ControlIcon label={control.label} className="h-4 w-4 shrink-0 text-base-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-base-200">{control.label}</div>
                  <div className="font-mono text-[10px] text-base-500">{control.shortcut}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => pinControl(currentAppId, control.id)} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-base-400 hover:border-accent-dim hover:text-accent-bright">Pin</button>
                  <button type="button" onClick={() => removeControl(currentAppId, control.id)} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-base-500 hover:border-white/20 hover:text-base-300">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {removedControls.length > 0 && (
        <div className={`mt-4 p-5 ${GLASS_CARD}`}>
          <div className={LABEL}>Hidden</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {removedControls.map((control) => (
              <button
                key={control.id}
                type="button"
                onClick={() => restoreControl(currentAppId, control.id)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-base-400 hover:border-white/20 hover:text-base-200"
              >
                Restore {control.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => resetCustomization(currentAppId)}
        className="mt-6 text-sm text-base-500 hover:text-base-300"
      >
        Reset to Noma's recommendation
      </button>
    </div>
  )
}
