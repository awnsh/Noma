import { describe, expect, it } from 'vitest'
import { MAX_CONTROL_LABEL_LENGTH } from '../constants'
import { DOM_CODE_TO_KEY_NAME } from '../constants/domKeyCodes'
import { SHORTCUT_LIBRARY, knownShortcutsFor } from './index'

const MODIFIERS = new Set(['Control', 'Alt', 'Meta', 'Shift'])
const KEY_NAMES = new Set(Object.values(DOM_CODE_TO_KEY_NAME))

describe('shortcut library', () => {
  it('covers the apps people use', () => {
    const covered = SHORTCUT_LIBRARY.flatMap((app) => app.ids)
    for (const id of ['code', 'chrome', 'spotify', 'slack', 'githubdesktop', 'figma', 'notion', 'finder', 'explorer']) {
      expect(covered, id).toContain(id)
    }
  })

  for (const app of SHORTCUT_LIBRARY) {
    for (const platform of ['windows', 'mac'] as const) {
      describe(`${app.name} on ${platform}`, () => {
        const shortcuts = app.shortcuts.map((shortcut) => ({
          label: shortcut.label,
          short: shortcut.short,
          keys: platform === 'mac' ? shortcut.mac : shortcut.windows
        }))

        it('only uses keys Noma can send', () => {
          for (const shortcut of shortcuts) {
            const trigger = shortcut.keys[shortcut.keys.length - 1]
            expect(KEY_NAMES.has(trigger), `${shortcut.label}: ${trigger}`).toBe(true)
            for (const modifier of shortcut.keys.slice(0, -1)) {
              expect(MODIFIERS.has(modifier), `${shortcut.label}: ${modifier}`).toBe(true)
            }
          }
        })

        it('has zone names that fit a small display', () => {
          for (const shortcut of shortcuts) {
            expect(shortcut.short.length, shortcut.label).toBeGreaterThan(0)
            expect(shortcut.short.length, shortcut.label).toBeLessThanOrEqual(MAX_CONTROL_LABEL_LENGTH)
          }
        })

        it('does not list the same keys or the same name twice', () => {
          const keys = shortcuts.map((shortcut) => shortcut.keys.join('+'))
          const names = shortcuts.map((shortcut) => shortcut.short)
          expect(new Set(keys).size, 'keys').toBe(keys.length)
          expect(new Set(names).size, 'names').toBe(names.length)
        })
      })
    }
  }

  it('does not claim the same app twice', () => {
    const ids = SHORTCUT_LIBRARY.flatMap((app) => app.ids)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses Command (Meta) where a Mac does, and Control where Windows does', () => {
    const win = knownShortcutsFor('code', 'windows').find((s) => s.label === 'Command palette')
    const mac = knownShortcutsFor('code', 'mac').find((s) => s.label === 'Command palette')
    expect(win?.keys).toEqual(['Control', 'Shift', 'P'])
    expect(mac?.keys).toEqual(['Meta', 'Shift', 'P'])
  })

  it('matches an app by id, case-insensitively, or by part of its id', () => {
    expect(knownShortcutsFor('Code', 'windows').length).toBeGreaterThan(0)
    expect(knownShortcutsFor('adobe premiere pro 2025', 'mac').length).toBeGreaterThan(0)
    expect(knownShortcutsFor('notepad', 'windows')).toEqual([])
    expect(knownShortcutsFor(null, 'mac')).toEqual([])
  })
})
