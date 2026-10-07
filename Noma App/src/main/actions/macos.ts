import koffi, { type LibraryHandle } from 'koffi'
import { basename } from 'path'
import { isMac } from '../platform'
import type { ScreenRect } from '../workflow/clickTarget'

/**
 * The macOS counterpart of win32.ts: the one place the Accessibility API
 * (ApplicationServices), CoreFoundation, CoreGraphics and libproc get
 * loaded, plus the small helpers built on them.
 *
 * Same reasoning as win32.ts for koffi: prebuilt binaries, no compiler
 * needed, and plain synchronous C calls from Noma's own process. Only C
 * APIs are used here (no Objective-C runtime), because their signatures are
 * fixed and simple to declare correctly; a wrong FFI signature is a crash,
 * not an exception.
 *
 * Almost everything here needs Accessibility permission (System Settings →
 * Privacy & Security → Accessibility). Without it AX calls return an error
 * code and every helper returns null/false, so callers fail closed exactly
 * as they do on Windows when a window can't be found.
 *
 * Coordinates: everything is in global display points with the origin at
 * the top-left of the main display. That is the space the AX API reports
 * in, CGEvent posts in, and uiohook reports mouse events in, so no
 * conversion is needed anywhere.
 */

type Pointer = bigint | null
type NativeFunction = ReturnType<LibraryHandle['func']>

interface MacApi {
  CFRelease: NativeFunction
  CFStringCreateWithCString: NativeFunction
  CFStringGetCString: NativeFunction
  CFGetTypeID: NativeFunction
  stringTypeId: number
  booleanTypeId: number
  arrayTypeId: number
  CFBooleanGetValue: NativeFunction
  CFArrayGetCount: NativeFunction
  CFArrayGetValueAtIndex: NativeFunction
  kCFBooleanTrue: Pointer
  AXIsProcessTrusted: NativeFunction
  AXUIElementCreateSystemWide: NativeFunction
  AXUIElementCreateApplication: NativeFunction
  AXUIElementCopyAttributeValue: NativeFunction
  AXUIElementSetAttributeValue: NativeFunction
  AXUIElementPerformAction: NativeFunction
  AXUIElementCopyElementAtPosition: NativeFunction
  AXUIElementGetPid: NativeFunction
  AXUIElementSetMessagingTimeout: NativeFunction
  AXValueGetValue: NativeFunction
  CGEventCreateMouseEvent: NativeFunction
  CGEventPost: NativeFunction
  CGEventCreate: NativeFunction
  CGEventGetLocation: NativeFunction
  CGWarpMouseCursorPosition: NativeFunction
  CGAssociateMouseAndMouseCursorPosition: NativeFunction
  CGEventSourceButtonState: NativeFunction
  proc_pidpath: NativeFunction
}

const kCFStringEncodingUTF8 = 0x08000100
const kAXErrorSuccess = 0
const kAXValueCGPointType = 1
const kAXValueCGSizeType = 2
const kCGHIDEventTap = 0
const kCGMouseButtonLeft = 0
export const CG_LEFT_MOUSE_DOWN = 1
export const CG_LEFT_MOUSE_UP = 2
export const CG_MOUSE_MOVED = 5
/** Seconds an AX call may wait on an unresponsive app before giving up
 *  (the system default is 6 s, which would stall Noma's main process). */
const AX_MESSAGING_TIMEOUT_S = 0.5

let api: MacApi | null | undefined

function load(): MacApi | null {
  if (api !== undefined) return api
  if (!isMac) return (api = null)
  try {
    const cf = koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
    const ax = koffi.load('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
    const cg = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
    const libSystem = koffi.load('/usr/lib/libSystem.B.dylib')
    koffi.struct('NomaCGPoint', { x: 'double', y: 'double' })

    const CFGetTypeID = cf.func('uint64_t CFGetTypeID(void *cf)')
    api = {
      CFRelease: cf.func('void CFRelease(void *cf)'),
      CFStringCreateWithCString: cf.func('void *CFStringCreateWithCString(void *alloc, const char *cStr, uint32_t encoding)'),
      CFStringGetCString: cf.func('bool CFStringGetCString(void *theString, void *buffer, intptr_t bufferSize, uint32_t encoding)'),
      CFGetTypeID,
      stringTypeId: Number(cf.func('uint64_t CFStringGetTypeID()')()),
      booleanTypeId: Number(cf.func('uint64_t CFBooleanGetTypeID()')()),
      arrayTypeId: Number(cf.func('uint64_t CFArrayGetTypeID()')()),
      CFBooleanGetValue: cf.func('bool CFBooleanGetValue(void *boolean)'),
      CFArrayGetCount: cf.func('intptr_t CFArrayGetCount(void *theArray)'),
      CFArrayGetValueAtIndex: cf.func('void *CFArrayGetValueAtIndex(void *theArray, intptr_t idx)'),
      kCFBooleanTrue: koffi.decode(cf.symbol('kCFBooleanTrue'), 'void *') as Pointer,
      AXIsProcessTrusted: ax.func('bool AXIsProcessTrusted()'),
      AXUIElementCreateSystemWide: ax.func('void *AXUIElementCreateSystemWide()'),
      AXUIElementCreateApplication: ax.func('void *AXUIElementCreateApplication(int32_t pid)'),
      AXUIElementCopyAttributeValue: ax.func('int32_t AXUIElementCopyAttributeValue(void *element, void *attribute, _Out_ void **value)'),
      AXUIElementSetAttributeValue: ax.func('int32_t AXUIElementSetAttributeValue(void *element, void *attribute, void *value)'),
      AXUIElementPerformAction: ax.func('int32_t AXUIElementPerformAction(void *element, void *action)'),
      AXUIElementCopyElementAtPosition: ax.func('int32_t AXUIElementCopyElementAtPosition(void *application, float x, float y, _Out_ void **element)'),
      AXUIElementGetPid: ax.func('int32_t AXUIElementGetPid(void *element, _Out_ int32_t *pid)'),
      AXUIElementSetMessagingTimeout: ax.func('int32_t AXUIElementSetMessagingTimeout(void *element, float timeoutInSeconds)'),
      AXValueGetValue: ax.func('bool AXValueGetValue(void *value, uint32_t theType, void *valuePtr)'),
      CGEventCreateMouseEvent: cg.func('void *CGEventCreateMouseEvent(void *source, uint32_t mouseType, NomaCGPoint mouseCursorPosition, uint32_t mouseButton)'),
      CGEventPost: cg.func('void CGEventPost(uint32_t tap, void *event)'),
      CGEventCreate: cg.func('void *CGEventCreate(void *source)'),
      CGEventGetLocation: cg.func('NomaCGPoint CGEventGetLocation(void *event)'),
      CGWarpMouseCursorPosition: cg.func('int32_t CGWarpMouseCursorPosition(NomaCGPoint newCursorPosition)'),
      CGAssociateMouseAndMouseCursorPosition: cg.func('int32_t CGAssociateMouseAndMouseCursorPosition(uint32_t connected)'),
      CGEventSourceButtonState: cg.func('bool CGEventSourceButtonState(int32_t stateID, uint32_t button)'),
      proc_pidpath: libSystem.func('int proc_pidpath(int pid, void *buffer, uint32_t buffersize)')
    }
  } catch {
    api = null
  }
  return api
}

function isNull(pointer: Pointer | undefined): pointer is null | undefined {
  return pointer === null || pointer === undefined || pointer === 0n
}

const cfStrings = new Map<string, Pointer>()

/** A CFString for a fixed attribute/action name. Cached for the process
 *  lifetime (a few dozen constants), so never released. */
function cfString(mac: MacApi, value: string): Pointer {
  let string = cfStrings.get(value)
  if (string === undefined) {
    string = mac.CFStringCreateWithCString(null, value, kCFStringEncodingUTF8) as Pointer
    cfStrings.set(value, string)
  }
  return string
}

function release(mac: MacApi, pointer: Pointer): void {
  if (!isNull(pointer)) mac.CFRelease(pointer)
}

/** A copied (+1) attribute value, or null. The caller releases it. */
function copyAttribute(mac: MacApi, element: Pointer, name: string): Pointer {
  if (isNull(element)) return null
  const out: Pointer[] = [null]
  const error = mac.AXUIElementCopyAttributeValue(element, cfString(mac, name), out) as number
  return error === kAXErrorSuccess && !isNull(out[0]) ? out[0] : null
}

function readCfString(mac: MacApi, value: Pointer): string | null {
  if (isNull(value) || Number(mac.CFGetTypeID(value)) !== mac.stringTypeId) return null
  const buffer = Buffer.alloc(1024)
  if (!mac.CFStringGetCString(value, buffer, buffer.length, kCFStringEncodingUTF8)) return null
  const end = buffer.indexOf(0)
  return buffer.toString('utf8', 0, end === -1 ? buffer.length : end)
}

function stringAttribute(mac: MacApi, element: Pointer, name: string): string | null {
  const value = copyAttribute(mac, element, name)
  try {
    return readCfString(mac, value)
  } finally {
    release(mac, value)
  }
}

function booleanAttribute(mac: MacApi, element: Pointer, name: string): boolean | null {
  const value = copyAttribute(mac, element, name)
  try {
    if (isNull(value) || Number(mac.CFGetTypeID(value)) !== mac.booleanTypeId) return null
    return Boolean(mac.CFBooleanGetValue(value))
  } finally {
    release(mac, value)
  }
}

/** Reads an AXValue holding two doubles (CGPoint or CGSize). */
function pairAttribute(mac: MacApi, element: Pointer, name: string, type: number): [number, number] | null {
  const value = copyAttribute(mac, element, name)
  try {
    if (isNull(value)) return null
    const buffer = Buffer.alloc(16)
    if (!mac.AXValueGetValue(value, type, buffer)) return null
    return [buffer.readDoubleLE(0), buffer.readDoubleLE(8)]
  } finally {
    release(mac, value)
  }
}

function frameOf(mac: MacApi, element: Pointer): ScreenRect | null {
  const position = pairAttribute(mac, element, 'AXPosition', kAXValueCGPointType)
  const size = pairAttribute(mac, element, 'AXSize', kAXValueCGSizeType)
  if (!position || !size) return null
  const left = Math.round(position[0])
  const top = Math.round(position[1])
  return { left, top, right: left + Math.round(size[0]), bottom: top + Math.round(size[1]) }
}

function pidOf(mac: MacApi, element: Pointer): number | null {
  if (isNull(element)) return null
  const pid = [0]
  return (mac.AXUIElementGetPid(element, pid) as number) === kAXErrorSuccess && pid[0] > 0 ? pid[0] : null
}

function applicationElement(mac: MacApi, pid: number): Pointer {
  const element = mac.AXUIElementCreateApplication(pid) as Pointer
  if (!isNull(element)) mac.AXUIElementSetMessagingTimeout(element, AX_MESSAGING_TIMEOUT_S)
  return element
}

/** Whether macOS has granted Noma Accessibility access. */
export function isAccessibilityTrusted(): boolean {
  const mac = load()
  try {
    return mac ? Boolean(mac.AXIsProcessTrusted()) : false
  } catch {
    return false
  }
}

/** The pid of the app that currently has keyboard focus, or null. */
export function frontmostPid(): number | null {
  const mac = load()
  if (!mac) return null
  try {
    const systemWide = mac.AXUIElementCreateSystemWide() as Pointer
    try {
      const focused = copyAttribute(mac, systemWide, 'AXFocusedApplication')
      try {
        return pidOf(mac, focused)
      } finally {
        release(mac, focused)
      }
    } finally {
      release(mac, systemWide)
    }
  } catch {
    return null
  }
}

interface WindowListApi {
  CGWindowListCopyWindowInfo: NativeFunction
  CFArrayGetCount: NativeFunction
  CFArrayGetValueAtIndex: NativeFunction
  CFDictionaryGetValue: NativeFunction
  CFNumberGetValue: NativeFunction
  CFRelease: NativeFunction
  layerKey: Pointer
  ownerPidKey: Pointer
}

let windowListApi: WindowListApi | null | undefined

/** Loaded separately from the main API so that, if any of these symbols
 *  were ever missing, only this fallback is lost. */
function loadWindowList(): WindowListApi | null {
  if (windowListApi !== undefined) return windowListApi
  if (!isMac) return (windowListApi = null)
  try {
    const cf = koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
    const cg = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
    windowListApi = {
      CGWindowListCopyWindowInfo: cg.func('void *CGWindowListCopyWindowInfo(uint32_t option, uint32_t relativeToWindow)'),
      CFArrayGetCount: cf.func('intptr_t CFArrayGetCount(void *theArray)'),
      CFArrayGetValueAtIndex: cf.func('void *CFArrayGetValueAtIndex(void *theArray, intptr_t idx)'),
      CFDictionaryGetValue: cf.func('void *CFDictionaryGetValue(void *theDict, void *key)'),
      CFNumberGetValue: cf.func('bool CFNumberGetValue(void *number, int32_t theType, _Out_ int32_t *valuePtr)'),
      CFRelease: cf.func('void CFRelease(void *cf)'),
      layerKey: koffi.decode(cg.symbol('kCGWindowLayer'), 'void *') as Pointer,
      ownerPidKey: koffi.decode(cg.symbol('kCGWindowOwnerPID'), 'void *') as Pointer
    }
  } catch {
    windowListApi = null
  }
  return windowListApi
}

const kCGWindowListOptionOnScreenOnly = 1
const kCGWindowListExcludeDesktopElements = 16
const kCFNumberSInt32Type = 3

/**
 * The pid owning the frontmost ordinary window, from the window server
 * (CoreGraphics). A second opinion for frontmostPid(): that one asks the
 * Accessibility API, which Chromium-based apps such as Spotify often don't
 * answer in time (Mac testing, 2026-10-05: every Spotify press refused as
 * "could not confirm focus" while Chrome worked). This needs no permission
 * (only window titles would) and works the same for every app. Layer 0 is
 * ordinary app windows; menus, the Dock and always-on-top panels (Noma's
 * own notice) sit on higher layers and are skipped.
 */
export function frontWindowOwnerPid(): number | null {
  const api = loadWindowList()
  if (!api) return null
  try {
    const list = api.CGWindowListCopyWindowInfo(
      kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
      0
    ) as Pointer
    if (isNull(list)) return null
    try {
      const count = Number(api.CFArrayGetCount(list))
      const read = (dict: Pointer, key: Pointer): number | null => {
        const value = api.CFDictionaryGetValue(dict, key) as Pointer
        if (isNull(value)) return null
        const out = [0]
        return api.CFNumberGetValue(value, kCFNumberSInt32Type, out) ? out[0] : null
      }
      for (let index = 0; index < count; index++) {
        const window = api.CFArrayGetValueAtIndex(list, index) as Pointer
        if (isNull(window) || read(window, api.layerKey) !== 0) continue
        const pid = read(window, api.ownerPidKey)
        if (pid && pid > 0) return pid
      }
      return null
    } finally {
      api.CFRelease(list)
    }
  } catch {
    return null
  }
}

/** Whether `pid` is the app in front, by either the Accessibility API or
 *  the window server. Both are macOS's own answer; either is enough. */
export function isAppFrontmost(pid: number): boolean {
  return frontmostPid() === pid || frontWindowOwnerPid() === pid
}

/** Asks the app to come to the front (AXFrontmost). Whether it actually
 *  did is for the caller to verify with frontmostPid(). */
export function requestActivation(pid: number): boolean {
  const mac = load()
  if (!mac || isNull(mac.kCFBooleanTrue)) return false
  try {
    const app = applicationElement(mac, pid)
    try {
      return (mac.AXUIElementSetAttributeValue(app, cfString(mac, 'AXFrontmost'), mac.kCFBooleanTrue) as number) === kAXErrorSuccess
    } finally {
      release(mac, app)
    }
  } catch {
    return false
  }
}

/** The bounds of the app's focused (or else main) window, or null. */
export function focusedWindowRect(pid: number): ScreenRect | null {
  const mac = load()
  if (!mac) return null
  try {
    const app = applicationElement(mac, pid)
    try {
      const window = copyAttribute(mac, app, 'AXFocusedWindow') ?? copyAttribute(mac, app, 'AXMainWindow')
      try {
        return frameOf(mac, window)
      } finally {
        release(mac, window)
      }
    } finally {
      release(mac, app)
    }
  } catch {
    return null
  }
}

/**
 * Presses the focused window's close button: the macOS equivalent of the
 * WM_CLOSE windowClose.ts posts on Windows: exactly what clicking the red
 * button does, so the app still gets to ask about unsaved changes.
 */
export function closeFocusedWindow(pid: number): boolean {
  const mac = load()
  if (!mac) return false
  try {
    const app = applicationElement(mac, pid)
    try {
      const window = copyAttribute(mac, app, 'AXFocusedWindow')
      try {
        const button = copyAttribute(mac, window, 'AXCloseButton')
        try {
          if (isNull(button)) return false
          return (mac.AXUIElementPerformAction(button, cfString(mac, 'AXPress')) as number) === kAXErrorSuccess
        } finally {
          release(mac, button)
        }
      } finally {
        release(mac, window)
      }
    } finally {
      release(mac, app)
    }
  } catch {
    return false
  }
}

/** The executable file name of a process ("Google Chrome"), or null. Needs
 *  no permission. */
export function processNameForPid(pid: number): string | null {
  const mac = load()
  if (!mac || pid <= 0) return null
  try {
    const buffer = Buffer.alloc(4096)
    const length = mac.proc_pidpath(pid, buffer, buffer.length) as number
    if (length <= 0) return null
    return basename(buffer.toString('utf8', 0, length))
  } catch {
    return null
  }
}

/** Posts one synthetic mouse event at (x, y). */
export function postMouseEvent(type: number, x: number, y: number): boolean {
  const mac = load()
  if (!mac) return false
  try {
    const event = mac.CGEventCreateMouseEvent(null, type, { x, y }, kCGMouseButtonLeft) as Pointer
    if (isNull(event)) return false
    mac.CGEventPost(kCGHIDEventTap, event)
    release(mac, event)
    return true
  } catch {
    return false
  }
}

const kCGEventSourceStateCombinedSessionState = 0

/** Where the pointer is now, in global display points. No permission needed. */
export function pointerPosition(): { x: number; y: number } | null {
  const mac = load()
  if (!mac) return null
  try {
    const event = mac.CGEventCreate(null) as Pointer
    if (isNull(event)) return null
    const point = mac.CGEventGetLocation(event) as { x: number; y: number }
    release(mac, event)
    return { x: point.x, y: point.y }
  } catch {
    return null
  }
}

/** Moves the pointer without posting a mouse event (Glide putting it back
 *  after a swipe-in). Re-associating straight after the warp skips the
 *  quarter-second freeze macOS otherwise applies to the mouse after one. */
export function warpPointer(x: number, y: number): boolean {
  const mac = load()
  if (!mac) return false
  try {
    const ok = mac.CGWarpMouseCursorPosition({ x, y }) === 0
    mac.CGAssociateMouseAndMouseCursorPosition(1)
    return ok
  } catch {
    return false
  }
}

/** The left button (or the trackpad itself) is pressed down right now. */
export function isLeftButtonDown(): boolean {
  const mac = load()
  if (!mac) return false
  try {
    return mac.CGEventSourceButtonState(kCGEventSourceStateCombinedSessionState, kCGMouseButtonLeft) === true
  } catch {
    return false
  }
}

/** Accessibility roles mapped onto the UI Automation control-type names
 *  clickTarget.ts already classifies, so capture rules stay one list. A
 *  pop-up button shows its current value (content), so it maps to ComboBox
 *  and is never recorded by name. */
const ROLE_TO_CONTROL_TYPE: Record<string, string> = {
  AXButton: 'ControlType.Button',
  AXMenuButton: 'ControlType.SplitButton',
  AXMenuItem: 'ControlType.MenuItem',
  AXMenuBarItem: 'ControlType.MenuItem',
  AXCheckBox: 'ControlType.CheckBox',
  AXRadioButton: 'ControlType.RadioButton',
  AXPopUpButton: 'ControlType.ComboBox',
  AXComboBox: 'ControlType.ComboBox',
  AXTextField: 'ControlType.Edit',
  AXTextArea: 'ControlType.Edit',
  AXSearchField: 'ControlType.Edit',
  AXStaticText: 'ControlType.Text',
  AXRow: 'ControlType.DataItem',
  AXCell: 'ControlType.DataItem',
  AXLink: 'ControlType.Hyperlink',
  AXImage: 'ControlType.Image',
  AXWebArea: 'ControlType.Document',
  AXTable: 'ControlType.Table',
  AXOutline: 'ControlType.Tree',
  AXList: 'ControlType.List',
  AXGroup: 'ControlType.Group',
  AXWindow: 'ControlType.Window',
  AXScrollArea: 'ControlType.Pane'
}

const COMMAND_ROLES = new Set(['AXButton', 'AXMenuButton', 'AXMenuItem', 'AXMenuBarItem', 'AXCheckBox', 'AXRadioButton'])

export function controlTypeForRole(role: string | null): string | null {
  if (!role) return null
  return ROLE_TO_CONTROL_TYPE[role] ?? 'ControlType.Custom'
}

/** A control's accessible name: its title, else its description (toolbar
 *  icon buttons usually only have the latter). */
function nameOf(mac: MacApi, element: Pointer): string | null {
  const title = stringAttribute(mac, element, 'AXTitle')
  if (title && title.trim()) return title
  const description = stringAttribute(mac, element, 'AXDescription')
  return description && description.trim() ? description : null
}

export interface ElementAtPoint {
  controlType: string | null
  name: string | null
  pid: number | null
  window: ScreenRect | null
}

/** What control is at a screen point: the AX equivalent of the UI
 *  Automation hit-test in uiaInspector.ts. */
export function elementAtPoint(x: number, y: number): ElementAtPoint | null {
  const mac = load()
  if (!mac) return null
  try {
    const systemWide = mac.AXUIElementCreateSystemWide() as Pointer
    try {
      mac.AXUIElementSetMessagingTimeout(systemWide, AX_MESSAGING_TIMEOUT_S)
      const out: Pointer[] = [null]
      if ((mac.AXUIElementCopyElementAtPosition(systemWide, x, y, out) as number) !== kAXErrorSuccess || isNull(out[0])) {
        return null
      }
      const element = out[0]
      try {
        const role = stringAttribute(mac, element, 'AXRole')
        const name = nameOf(mac, element)
        const window = copyAttribute(mac, element, 'AXWindow')
        try {
          return {
            controlType: controlTypeForRole(role),
            name: name && name.length > 80 ? name.slice(0, 80) : name,
            pid: pidOf(mac, element),
            window: frameOf(mac, window)
          }
        } finally {
          release(mac, window)
        }
      } finally {
        release(mac, element)
      }
    } finally {
      release(mac, systemWide)
    }
  } catch {
    return null
  }
}

/** Upper bounds on one search of an app's UI tree. */
const MAX_NODES = 4000
const MAX_DEPTH = 40
/** Nodes visited between yields to the event loop, so a big tree doesn't
 *  freeze Noma's main process. */
const NODES_PER_SLICE = 120

export type MacFindResult =
  | { status: 'found'; x: number; y: number }
  | { status: 'none' }
  | { status: 'several'; count: number }
  | { status: 'unavailable' }

/**
 * Finds enabled, on-screen command controls named `label` in an app: the
 * AX equivalent of uiaControlFinder.ts. Searches the app's windows, any open
 * popup menus, and the menu bar; a menu-bar menu is only searched while it's
 * open (its title is selected), because closed menus still have items in
 * the tree with no real position. `normalize` is the same cleanup capture
 * applies to names.
 */
export async function findNamedControls(
  pid: number,
  label: string,
  normalize: (name: string) => string
): Promise<MacFindResult> {
  const mac = load()
  if (!mac) return { status: 'unavailable' }
  const wanted = normalize(label).toLowerCase()
  const toRelease: Pointer[] = []
  const hits: Array<{ x: number; y: number }> = []
  try {
    const app = applicationElement(mac, pid)
    if (isNull(app)) return { status: 'unavailable' }
    toRelease.push(app)

    const queue: Array<{ element: Pointer; depth: number }> = [{ element: app, depth: 0 }]
    let visited = 0
    while (queue.length > 0 && visited < MAX_NODES) {
      const { element, depth } = queue.shift()!
      visited++
      if (visited % NODES_PER_SLICE === 0) await new Promise((resolve) => setImmediate(resolve))

      const role = stringAttribute(mac, element, 'AXRole')
      if (role && COMMAND_ROLES.has(role)) {
        const name = nameOf(mac, element)
        if (name && normalize(name).toLowerCase() === wanted && booleanAttribute(mac, element, 'AXEnabled') !== false) {
          const frame = frameOf(mac, element)
          if (frame && frame.right > frame.left && frame.bottom > frame.top) {
            hits.push({ x: Math.round((frame.left + frame.right) / 2), y: Math.round((frame.top + frame.bottom) / 2) })
          }
        }
      }

      if (depth >= MAX_DEPTH) continue
      if (role === 'AXMenuBarItem' && booleanAttribute(mac, element, 'AXSelected') !== true) continue

      const children = copyAttribute(mac, element, 'AXChildren')
      if (isNull(children)) continue
      toRelease.push(children)
      if (Number(mac.CFGetTypeID(children)) !== mac.arrayTypeId) continue
      const count = Number(mac.CFArrayGetCount(children))
      for (let index = 0; index < count; index++) {
        const child = mac.CFArrayGetValueAtIndex(children, index) as Pointer
        if (!isNull(child)) queue.push({ element: child, depth: depth + 1 })
      }
    }
  } catch {
    return { status: 'unavailable' }
  } finally {
    // Children are borrowed from their arrays, so the arrays are only
    // released once the whole walk is done.
    for (const pointer of toRelease.reverse()) {
      try {
        release(mac, pointer)
      } catch {
        // Nothing useful to do; never let cleanup break a replay.
      }
    }
  }
  if (hits.length === 0) return { status: 'none' }
  if (hits.length > 1) return { status: 'several', count: hits.length }
  return { status: 'found', x: hits[0].x, y: hits[0].y }
}
