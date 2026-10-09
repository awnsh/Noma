import koffi, { type LibraryHandle } from 'koffi'
import { isMac } from '../platform'
import { isAccessibilityTrusted } from './macos'

/**
 * The macOS media keys (play/pause, next, previous) as the keyboard itself
 * sends them: an NX_SYSDEFINED event, subtype 8 (NX_SUBTYPE_AUX_CONTROL_BUTTONS),
 * posted to the HID tap. macOS routes that to whatever app currently owns
 * Now Playing (Music, Spotify, a browser tab), exactly like the F7–F9 keys,
 * so nothing here is aimed at a specific player.
 *
 * Kept apart from macos.ts on purpose: that file sticks to plain C APIs,
 * and there is no C constructor for a system-defined event. The only public
 * way to build one is NSEvent's otherEventWithType:… and then its CGEvent,
 * which needs the Objective-C runtime. The surface is three fixed messages
 * with fixed signatures (checked on arm64: the built CGEvent reads back as
 * type 14, flags 0xa00, data1 0x100a00 for a play key-down); a wrong FFI
 * signature is a crash, not an exception, so nothing here is built from input.
 *
 * Posting needs Accessibility permission. Without it CGEventPost drops the
 * event silently, so this checks first and reports failure instead of
 * claiming a key press that never happened.
 */

type Pointer = bigint | null
type NativeFunction = ReturnType<LibraryHandle['func']>

/** NX_KEYTYPE_* from IOKit's ev_keymap.h. */
export const NX_KEYTYPE_PLAY = 16
export const NX_KEYTYPE_NEXT = 17
export const NX_KEYTYPE_PREVIOUS = 18

const NS_EVENT_TYPE_SYSTEM_DEFINED = 14
const NX_SUBTYPE_AUX_CONTROL_BUTTONS = 8
const NX_KEYDOWN = 0x0a
const NX_KEYUP = 0x0b
const kCGHIDEventTap = 0

/** data1 of an aux-control-button event: key type in the high word, key
 *  state in the next byte. modifierFlags carries the same state byte. */
export function mediaKeyData1(keyType: number, down: boolean): number {
  return (keyType << 16) | ((down ? NX_KEYDOWN : NX_KEYUP) << 8)
}

interface MediaKeyApi {
  nsEventClass: Pointer
  otherEventSelector: Pointer
  cgEventSelector: Pointer
  otherEvent: NativeFunction
  cgEventOf: NativeFunction
  poolPush: NativeFunction
  poolPop: NativeFunction
  CGEventPost: NativeFunction
}

let api: MediaKeyApi | null | undefined

function load(): MediaKeyApi | null {
  if (api !== undefined) return api
  if (!isMac) return (api = null)
  try {
    const objc = koffi.load('/usr/lib/libobjc.A.dylib')
    // Registers NSEvent with the runtime. Electron has AppKit loaded
    // already; loading it again is a no-op.
    koffi.load('/System/Library/Frameworks/AppKit.framework/AppKit')
    const cg = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
    koffi.struct('NomaMediaKeyPoint', { x: 'double', y: 'double' })
    const getClass = objc.func('void *objc_getClass(const char *name)')
    const selector = objc.func('void *sel_registerName(const char *name)')
    const nsEventClass = getClass('NSEvent') as Pointer
    if (isNull(nsEventClass)) return (api = null)
    api = {
      nsEventClass,
      otherEventSelector: selector(
        'otherEventWithType:location:modifierFlags:timestamp:windowNumber:context:subtype:data1:data2:'
      ) as Pointer,
      cgEventSelector: selector('CGEvent') as Pointer,
      // objc_msgSend must be called with the method's exact prototype
      // (arm64 has no variadic shortcut), so each message gets its own.
      otherEvent: objc.func('objc_msgSend', 'void *', [
        'void *', 'void *', 'uint64_t', 'NomaMediaKeyPoint', 'uint64_t', 'double',
        'int64_t', 'void *', 'int16_t', 'int64_t', 'int64_t'
      ]),
      cgEventOf: objc.func('objc_msgSend', 'void *', ['void *', 'void *']),
      poolPush: objc.func('void *objc_autoreleasePoolPush()'),
      poolPop: objc.func('void objc_autoreleasePoolPop(void *pool)'),
      CGEventPost: cg.func('void CGEventPost(uint32_t tap, void *event)')
    }
  } catch {
    api = null
  }
  return api
}

function isNull(pointer: Pointer | undefined): pointer is null | undefined {
  return pointer === null || pointer === undefined || pointer === 0n
}

/** Builds and posts one key-down or key-up. The NSEvent (and the CGEvent it
 *  owns) is autoreleased, so the caller wraps this in a pool. */
function postMediaKeyEvent(mac: MediaKeyApi, keyType: number, down: boolean): boolean {
  const data1 = mediaKeyData1(keyType, down)
  const event = mac.otherEvent(
    mac.nsEventClass, mac.otherEventSelector, NS_EVENT_TYPE_SYSTEM_DEFINED, { x: 0, y: 0 },
    (down ? NX_KEYDOWN : NX_KEYUP) << 8, 0, 0, null, NX_SUBTYPE_AUX_CONTROL_BUTTONS, data1, -1
  ) as Pointer
  if (isNull(event)) return false
  const cgEvent = mac.cgEventOf(event, mac.cgEventSelector) as Pointer
  if (isNull(cgEvent)) return false
  mac.CGEventPost(kCGHIDEventTap, cgEvent)
  return true
}

/** Presses and releases one media key. False (nothing posted) without
 *  Accessibility permission or if the runtime calls fail. */
export function postMediaKey(keyType: number): boolean {
  const mac = load()
  if (!mac || !isAccessibilityTrusted()) return false
  let pool: Pointer = null
  try {
    pool = mac.poolPush() as Pointer
    // No key-up after a failed key-down: a stuck "down" is worse than none.
    return postMediaKeyEvent(mac, keyType, true) && postMediaKeyEvent(mac, keyType, false)
  } catch {
    return false
  } finally {
    if (!isNull(pool)) mac.poolPop(pool)
  }
}
