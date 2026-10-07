import { beforeEach, describe, expect, it } from 'vitest'
import { useMacroDraftsStore } from './macroDraftsStore'

const draft = { name: 'Edited', actions: [{ type: 'delay' as const, ms: 500 }], enabled: true }

describe('macroDraftsStore', () => {
  beforeEach(() => useMacroDraftsStore.setState({ drafts: {} }))

  it('keeps a draft per macro, so switching between macros loses neither', () => {
    const { setDraft } = useMacroDraftsStore.getState()
    setDraft('a', draft)
    setDraft('b', { ...draft, name: 'Other' })

    const { drafts } = useMacroDraftsStore.getState()
    expect(drafts.a.name).toBe('Edited')
    expect(drafts.b.name).toBe('Other')
  })

  it('removes a draft when it is cleared, and ignores clearing one that does not exist', () => {
    const { setDraft } = useMacroDraftsStore.getState()
    setDraft('a', draft)
    setDraft('a', null)
    expect(useMacroDraftsStore.getState().drafts).toEqual({})

    const before = useMacroDraftsStore.getState().drafts
    setDraft('missing', null)
    expect(useMacroDraftsStore.getState().drafts).toBe(before)
  })
})
