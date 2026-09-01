import { useEffect, useState } from 'react'
import type { ApplicationProfile, ApplicationProfileSummary } from '@shared/types'
import { VirtualControlButton } from '../components/VirtualControlButton'
import { ControlEditorModal } from '../components/ControlEditorModal'
import { CreateProfileModal } from '../components/CreateProfileModal'

export function Profiles() {
  const [summaries, setSummaries] = useState<ApplicationProfileSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<ApplicationProfile | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  const refreshList = (): void => {
    window.flow.listApplicationProfileSummaries().then((next) => {
      setSummaries(next)
      setIsLoading(false)
    })
  }

  useEffect(() => {
    refreshList()
  }, [])

  useEffect(() => {
    setSelectedProfile(null)
    setIsRenaming(false)
    setDeleteConfirming(false)
    if (!selectedId) return
    window.flow.getProfileForApplication(selectedId).then(setSelectedProfile)
  }, [selectedId])

  const selectedSummary = summaries.find((s) => s.application.id === selectedId) ?? null

  const handleSelect = (applicationId: string): void => {
    setIsCreatingNew(false)
    setSelectedId(applicationId)
  }

  const handleRename = async (): Promise<void> => {
    if (!selectedId) return
    const updated = await window.flow.renameApplicationProfile(selectedId, renameValue.trim())
    if (updated) {
      setSelectedProfile(updated)
      setIsRenaming(false)
      refreshList()
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!selectedId) return
    await window.flow.deleteApplicationProfile(selectedId)
    setSelectedId(null)
    refreshList()
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 p-6">
        <div className="mb-1 font-display text-xl font-semibold text-neutral-100">Profiles</div>
        <p className="mb-5 text-xs text-neutral-500">
          Every application Flow knows about, and whether it's been personalized yet.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsCreatingNew(true)
            setSelectedId(null)
          }}
          className="mb-4 rounded-md border border-accent-muted bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-transform duration-150 hover:bg-accent/20 active:scale-[0.97]"
        >
          + New Application Profile
        </button>

        {isLoading ? (
          <p className="text-xs text-neutral-600">Loading…</p>
        ) : summaries.length === 0 ? (
          <p className="text-xs text-neutral-600">
            No applications known yet — open one Flow can detect, or add one by hand.
          </p>
        ) : (
          <ul className="flex-1 space-y-1 overflow-y-auto">
            {summaries.map((summary) => (
              <li key={summary.application.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(summary.application.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    !isCreatingNew && selectedId === summary.application.id
                      ? 'bg-white/5 text-neutral-100'
                      : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{summary.application.name}</span>
                    {!summary.hasProfile && (
                      <span className="text-[10px] uppercase tracking-widest text-neutral-700">
                        Unconfigured
                      </span>
                    )}
                  </div>
                  {summary.hasProfile && (
                    <div className="text-[11px] text-neutral-600">{summary.profileName}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="flex-1 overflow-y-auto p-8">
        {isCreatingNew ? (
          <CreateProfileModal
            onClose={() => setIsCreatingNew(false)}
            onCreated={(profile) => {
              setIsCreatingNew(false)
              setSelectedId(profile.applicationId)
              refreshList()
            }}
          />
        ) : selectedSummary ? (
          <>
            {!selectedSummary.hasProfile ? (
              <div>
                <h2 className="mb-4 text-lg font-medium text-neutral-100">
                  {selectedSummary.application.name}
                </h2>
                <p className="mb-4 text-sm text-neutral-500">
                  No profile yet for this application.
                </p>
                <CreateProfileModal
                  application={selectedSummary.application}
                  onClose={() => setSelectedId(null)}
                  onCreated={(profile) => {
                    setSelectedProfile(profile)
                    refreshList()
                  }}
                />
              </div>
            ) : selectedProfile ? (
              <div>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          className="rounded-md border border-white/10 bg-base-900 px-3 py-1.5 text-lg font-medium text-neutral-100"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => void handleRename()}
                          className="rounded-md border border-accent-muted bg-accent/10 px-2 py-1 text-xs text-accent"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRenaming(false)}
                          className="text-xs text-neutral-500 hover:text-neutral-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-medium text-neutral-100">{selectedProfile.name}</h2>
                        <button
                          type="button"
                          onClick={() => {
                            setRenameValue(selectedProfile.name)
                            setIsRenaming(true)
                          }}
                          className="text-xs text-neutral-600 hover:text-neutral-300"
                        >
                          Rename
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      {selectedSummary.application.name} ·{' '}
                      <span className="font-mono">{selectedSummary.application.processName}</span>
                    </p>
                  </div>

                  {!deleteConfirming ? (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirming(true)}
                      className="shrink-0 text-xs text-neutral-600 hover:text-red-400"
                    >
                      Delete profile
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2 text-xs">
                      <span className="text-neutral-400">Delete this profile?</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirming(false)}
                        className="text-neutral-500 hover:text-neutral-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-600">
                  Controls — click a tile to configure it
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((slot) => (
                    <VirtualControlButton
                      key={slot}
                      slot={slot}
                      control={selectedProfile.controls.find((control) => control.slot === slot)}
                      onPress={() => {}}
                      editMode
                      onEdit={setEditingSlot}
                    />
                  ))}
                </div>

                {editingSlot !== null && (
                  <ControlEditorModal
                    applicationId={selectedSummary.application.id}
                    applicationName={selectedSummary.application.name}
                    slot={editingSlot}
                    control={selectedProfile.controls.find((control) => control.slot === editingSlot)}
                    onClose={() => setEditingSlot(null)}
                    onSaved={() => {
                      window.flow.getProfileForApplication(selectedSummary.application.id).then(setSelectedProfile)
                    }}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">Loading…</p>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-600">
            Select an application, or create a new profile.
          </div>
        )}
      </div>
    </div>
  )
}
