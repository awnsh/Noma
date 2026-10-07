import { useEffect, useState } from 'react'
import type { WhatsNew } from '@shared/types'
import { Modal, ModalCloseButton } from './Modal'

/**
 * "What's new in X", once, on the first launch after Noma updates. Main
 * decides whether this launch follows an update (main/whatsNew.ts); closing
 * it in any way marks it seen, so it never comes back for this version.
 */
export function WhatsNewModal() {
  const [whatsNew, setWhatsNew] = useState<WhatsNew | null>(null)

  useEffect(() => {
    void window.flow.getWhatsNew().then(setWhatsNew)
  }, [])

  const close = (): void => {
    setWhatsNew(null)
    void window.flow.dismissWhatsNew()
  }

  if (!whatsNew) return null

  const [latest, ...earlier] = whatsNew.releases

  return (
    <Modal onClose={close} titleId="whats-new-title">
      <div className="text-xs uppercase tracking-widest text-neutral-500">Updated to {whatsNew.version}</div>
      <h2 id="whats-new-title" className="mt-1 font-display text-lg font-semibold text-neutral-100">
        What&apos;s new
      </h2>

      <NoteList notes={latest.notes} />

      {earlier.map((release) => (
        <div key={release.version} className="mt-5">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">Also in {release.version}</div>
          <NoteList notes={release.notes} />
        </div>
      ))}

      <div className="mt-6 flex justify-end">
        <ModalCloseButton
          autoFocus
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
        >
          Got it
        </ModalCloseButton>
      </div>
    </Modal>
  )
}

function NoteList({ notes }: { notes: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-neutral-300">
      {notes.map((note) => (
        <li key={note} className="flex gap-2.5">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
          {note}
        </li>
      ))}
    </ul>
  )
}
