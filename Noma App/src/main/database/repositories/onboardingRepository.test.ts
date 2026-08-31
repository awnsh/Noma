import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { __setDatabaseForTesting, runMigrations } from '../db'
import { getOnboardingState, saveOnboardingState } from './onboardingRepository'

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  __setDatabaseForTesting(db)
})

describe('getOnboardingState', () => {
  it('returns the fresh-install default when nothing has been saved yet', () => {
    expect(getOnboardingState()).toEqual({
      completed: false,
      step: 'welcome',
      selectedUseCases: [],
      flowEnabled: false,
      hardwareSkipped: false
    })
  })
})

describe('saveOnboardingState', () => {
  it('persists a partial update merged onto the current state', () => {
    saveOnboardingState({ step: 'useCases', selectedUseCases: ['Development'] })
    expect(getOnboardingState()).toEqual({
      completed: false,
      step: 'useCases',
      selectedUseCases: ['Development'],
      flowEnabled: false,
      hardwareSkipped: false
    })
  })

  it('accumulates updates across multiple calls without losing earlier fields', () => {
    saveOnboardingState({ selectedUseCases: ['Design', 'Video'] })
    saveOnboardingState({ flowEnabled: true, step: 'hardware' })
    saveOnboardingState({ hardwareSkipped: true, step: 'demo' })

    expect(getOnboardingState()).toEqual({
      completed: false,
      step: 'demo',
      selectedUseCases: ['Design', 'Video'],
      flowEnabled: true,
      hardwareSkipped: true
    })
  })

  it('marks onboarding complete without disturbing the rest of the record', () => {
    saveOnboardingState({ selectedUseCases: ['Writing'], flowEnabled: true })
    const result = saveOnboardingState({ completed: true, step: 'completion' })

    expect(result).toEqual({
      completed: true,
      step: 'completion',
      selectedUseCases: ['Writing'],
      flowEnabled: true,
      hardwareSkipped: false
    })
    expect(getOnboardingState()).toEqual(result)
  })

  it('returns the update it just persisted, not a stale copy', () => {
    const result = saveOnboardingState({ step: 'flowPrivacy' })
    expect(result.step).toBe('flowPrivacy')
  })
})
