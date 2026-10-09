import { describe, expect, it } from 'vitest'
import { isSystemUtilityApp } from './systemApps'

describe('isSystemUtilityApp', () => {
  it('flags the background helpers that take the front', () => {
    for (const path of [
      '/System/Library/PrivateFrameworks/UniversalAccess.framework/Versions/A/Resources/universalAccessAuthWarn.app',
      '/System/Library/CoreServices/loginwindow.app',
      '/System/Library/CoreServices/UserNotificationCenter.app',
      '/System/Library/Frameworks/LocalAuthentication.framework/Support/coreautha.bundle'
    ]) {
      expect(isSystemUtilityApp(path)).toBe(true)
    }
  })

  it('keeps the apps people actually use, including Finder and System Settings', () => {
    for (const path of [
      '/Applications/Visual Studio Code.app',
      '/System/Applications/System Settings.app',
      '/System/Applications/Messages.app',
      '/System/Library/CoreServices/Finder.app',
      '/System/Library/CoreServices/Applications/Archive Utility.app'
    ]) {
      expect(isSystemUtilityApp(path)).toBe(false)
    }
  })

  it('does not flag an app with no known path', () => {
    expect(isSystemUtilityApp(null)).toBe(false)
    expect(isSystemUtilityApp(undefined)).toBe(false)
  })
})
