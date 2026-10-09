import { describe, expect, it } from 'vitest'
import { MAX_CONTROL_LABEL_LENGTH, SYSTEM_COMMAND_CATALOG } from '@shared/constants'
import { actionCaption, systemCommandLabel } from './describeAction'
import { defaultLabelForAction } from './actionLabel'

describe('systemCommandLabel', () => {
  it('gives every catalog command a plain name, not its stored id', () => {
    for (const command of SYSTEM_COMMAND_CATALOG) expect(systemCommandLabel(command), command).not.toBe(command)
  })

  it('names the media commands', () => {
    expect(systemCommandLabel('mediaPlayPause')).toBe('Play/Pause')
    expect(systemCommandLabel('mediaNextTrack')).toBe('Next track')
    expect(systemCommandLabel('mediaPrevTrack')).toBe('Previous track')
  })

  it('shows an unknown id as itself, and ignores inherited keys', () => {
    expect(systemCommandLabel('somethingNew')).toBe('somethingNew')
    expect(systemCommandLabel('toString')).toBe('toString')
  })

  it('is the tile caption for a system command', () => {
    expect(actionCaption({ type: 'systemCommand', command: 'mediaNextTrack' })).toBe('Next track')
  })
})

describe('default zone names for system commands', () => {
  it('fit on the display without being cut off', () => {
    for (const command of SYSTEM_COMMAND_CATALOG) {
      const label = defaultLabelForAction({ type: 'systemCommand', command }, [])
      expect(label?.length, command).toBeLessThanOrEqual(MAX_CONTROL_LABEL_LENGTH)
      expect(label?.replace(/ /g, '').toLowerCase(), command).toBe(command.toLowerCase())
    }
  })
})
