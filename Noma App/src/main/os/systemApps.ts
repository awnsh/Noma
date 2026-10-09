/**
 * macOS runs plenty of small background helpers that briefly take the front
 * when something needs attention: the permission dialog (universalAccessAuthWarn),
 * the login window, the notification host, the authentication prompt. They are
 * not apps anyone uses, so Noma never treats one as "the app you are in":
 * no controls, no workflows, no entry in the app list.
 *
 * They are told apart by where their bundle lives. Helpers sit under
 * /System/Library/ (CoreServices, Frameworks, PrivateFrameworks); the apps people
 * actually open are in /Applications or /System/Applications. The two exceptions
 * under /System/Library/ are Finder and the apps in CoreServices/Applications
 * (Archive Utility, Screen Sharing and so on), which are real, user-facing apps.
 */
const SYSTEM_LIBRARY = '/System/Library/'
const FINDER_BUNDLE = '/System/Library/CoreServices/Finder.app'
const USER_FACING_CORE_SERVICES = '/System/Library/CoreServices/Applications/'

export function isSystemUtilityApp(bundlePath: string | null | undefined): boolean {
  if (!bundlePath || !bundlePath.startsWith(SYSTEM_LIBRARY)) return false
  if (bundlePath === FINDER_BUNDLE) return false
  return !bundlePath.startsWith(USER_FACING_CORE_SERVICES)
}
