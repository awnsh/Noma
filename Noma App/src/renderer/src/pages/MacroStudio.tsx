import { useEffect, useMemo, useState } from 'react'
import { BUTTON_SECONDARY } from '../lib/surfaces'
import { PlusIcon } from '../components/icons'
import type { Macro } from '@shared/types'
import { useMacrosStore } from '../stores/macrosStore'
import { useUiStore } from '../stores/uiStore'
import { useApplicationsStore } from '../stores/applicationsStore'
import { useStoreSync } from '../lib/useStoreSync'
import { MacroEditor } from '../components/MacroEditor'
import { useMacroDraftsStore } from '../stores/macroDraftsStore'
import { plural } from '../lib/plural'

export function MacroStudio() {
  const { macros, isLoading, refresh } = useMacrosStore()
  const { byId: applicationsById, refresh: refreshApplications } = useApplicationsStore()
  const applications = useMemo(() => Object.values(applicationsById), [applicationsById])
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  // Unsaved edits, kept in a store so switching macros (or pages) never discards them.
  const drafts = useMacroDraftsStore((state) => state.drafts)
  const setDraft = useMacroDraftsStore((state) => state.setDraft)

  const pendingMacroId = useUiStore((state) => state.pendingMacroId)
  const clearPendingMacro = useUiStore((state) => state.clearPendingMacro)

  // Jump to a macro requested from elsewhere (Workflows) once macros load.
  useEffect(() => {
    if (!pendingMacroId || isLoading) return
    if (macros.some((macro) => macro.id === pendingMacroId)) {
      setIsCreatingNew(false)
      setSelectedMacroId(pendingMacroId)
    }
    clearPendingMacro()
  }, [pendingMacroId, isLoading, macros, clearPendingMacro])

  useStoreSync({ refresh }, { refresh: refreshApplications })

  const selectedMacro = macros.find((macro) => macro.id === selectedMacroId) ?? null
  const applicationNameById = new Map(applications.map((application) => [application.id, application.name]))

  const handleSelect = (macro: Macro): void => {
    setIsCreatingNew(false)
    setSelectedMacroId(macro.id)
  }

  const handleNew = (): void => {
    setIsCreatingNew(true)
    setSelectedMacroId(null)
  }

  const handleSaved = (macro: Macro): void => {
    setDraft('new', null)
    setIsCreatingNew(false)
    setSelectedMacroId(macro.id)
    refresh()
  }

  const handleDeleted = (): void => {
    if (selectedMacroId) setDraft(selectedMacroId, null)
    setSelectedMacroId(null)
    refresh()
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/[0.06] px-6 pb-6 pt-14">
        <div className="mb-1 font-display text-xl font-semibold text-neutral-100">Macro Studio</div>
        <p className="mb-5 text-xs text-neutral-500">
          Build a sequence of actions once, then assign it to any control.
        </p>
        <button
          type="button"
          onClick={handleNew}
          className={`mb-5 ${BUTTON_SECONDARY}`}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New macro{drafts.new && !isCreatingNew ? ' (draft)' : ''}
        </button>

        {isLoading ? (
          <p className="text-xs text-neutral-600">Loading…</p>
        ) : macros.length === 0 ? (
          <p className="text-xs text-neutral-600">No macros yet.</p>
        ) : (
          <ul className="flex-1 space-y-1 overflow-y-auto">
            {macros.map((macro) => (
              <li key={macro.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(macro)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    !isCreatingNew && selectedMacroId === macro.id
                      ? 'bg-white/5 text-neutral-100'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{macro.name}</span>
                    {drafts[macro.id] ? (
                      <span className="text-xs font-medium text-neutral-200">Unsaved</span>
                    ) : (
                      !macro.enabled && (
                        <span className="text-xs font-medium text-neutral-400">Off</span>
                      )
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    {macro.actions.length} {plural(macro.actions.length, 'step')}
                    {/* Which application this macro was scoped to: set
                        automatically when Flow creates a macro from an
                        accepted sequence suggestion (suggestionResolution.ts),
                        or left unset for a macro built from scratch here. */}
                    {macro.applicationId && applicationNameById.get(macro.applicationId) && (
                      <> · {applicationNameById.get(macro.applicationId)}</>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {isCreatingNew ? (
        <MacroEditor
          macro={null}
          draft={drafts.new}
          onDraftChange={(draft) => setDraft('new', draft)}
          applications={applications}
          allMacros={macros}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onDiscardNew={() => {
            setDraft('new', null)
            setIsCreatingNew(false)
          }}
        />
      ) : selectedMacro ? (
        <MacroEditor
          key={selectedMacro.id}
          macro={selectedMacro}
          draft={drafts[selectedMacro.id]}
          onDraftChange={(draft) => setDraft(selectedMacro.id, draft)}
          applications={applications}
          allMacros={macros}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onDiscardNew={() => {}}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-600">
          Select a macro, or create a new one.
        </div>
      )}
    </div>
  )
}
