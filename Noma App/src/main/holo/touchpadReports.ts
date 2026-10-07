import {
  GetRawInputDataBuffer,
  GetRawInputDeviceInfoW,
  HID_USAGE_DIGITIZER_CONFIDENCE,
  HID_USAGE_DIGITIZER_CONTACT_COUNT,
  HID_USAGE_DIGITIZER_CONTACT_ID,
  HID_USAGE_DIGITIZER_FINGER,
  HID_USAGE_DIGITIZER_TIP_SWITCH,
  HID_USAGE_DIGITIZER_TOUCH_PAD,
  HID_USAGE_GENERIC_X,
  HID_USAGE_GENERIC_Y,
  HID_USAGE_PAGE_DIGITIZER,
  HID_USAGE_PAGE_BUTTON,
  HID_USAGE_PAGE_GENERIC,
  HIDP_CAPS_SIZE,
  HIDP_INPUT,
  HIDP_STATUS_SUCCESS,
  HIDP_VALUE_CAPS_SIZE,
  HidP_GetCaps,
  HidP_GetUsages,
  HidP_GetUsageValue,
  HidP_GetValueCaps,
  RAWINPUTHEADER_SIZE,
  RID_INPUT,
  RIDI_PREPARSEDDATA,
  RIM_TYPEHID
} from '../actions/win32'
import { readDeviceInfo } from './rawDevices'
import type { TouchContact, TouchFrame } from './trackpadGesture'

/**
 * Turns a Windows precision touchpad's raw HID report into finger contacts
 * (where each finger is, whether it's touching, whether the touchpad thinks
 * it's a palm), for Holo's trackpad corners.
 *
 * Every precision touchpad describes its own report layout (a "report
 * descriptor"): one "finger" collection per contact it can report, each with
 * X, Y, a tip switch, a confidence bit and a contact ID, plus a contact count.
 * hid.dll's HidP_* functions read values by meaning rather than byte offset,
 * so this works on any precision touchpad without per-model code. Older
 * mouse-mode trackpads send no such reports (see touchCoverage.ts) and * never produce a frame.
 *
 * Positions only ever live in memory long enough to recognise the gesture;
 * nothing is stored or sent anywhere.
 */

interface FingerSlot {
  link: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

interface TouchpadLayout {
  preparsed: Buffer
  fingers: FingerSlot[]
}

/** hDevice -> its layout, or null when it isn't a precision touchpad. */
const layouts = new Map<number, TouchpadLayout | null>()

/** HIDP_VALUE_CAPS offsets: UsagePage 0, LinkCollection 6, LinkUsage 8,
 *  IsRange 12, LogicalMin 40, LogicalMax 44, Usage (NotRange) 56. */
function readLayout(device: number): TouchpadLayout | null {
  const info = readDeviceInfo(device)
  if (!info || info.type !== RIM_TYPEHID) return null
  if (info.usagePage !== HID_USAGE_PAGE_DIGITIZER || info.usage !== HID_USAGE_DIGITIZER_TOUCH_PAD) return null

  const size = [0]
  GetRawInputDeviceInfoW(device, RIDI_PREPARSEDDATA, null, size)
  if (!size[0]) return null
  const preparsed = Buffer.alloc(size[0])
  if (GetRawInputDeviceInfoW(device, RIDI_PREPARSEDDATA, preparsed, size) === 0xffffffff) return null

  const caps = Buffer.alloc(HIDP_CAPS_SIZE)
  if (HidP_GetCaps(preparsed, caps) !== HIDP_STATUS_SUCCESS) return null
  const count = [caps.readUInt16LE(48)]
  const values = Buffer.alloc(count[0] * HIDP_VALUE_CAPS_SIZE)
  if (HidP_GetValueCaps(HIDP_INPUT, values, count, preparsed) !== HIDP_STATUS_SUCCESS) return null

  const byLink = new Map<number, Partial<FingerSlot>>()
  for (let i = 0; i < count[0]; i++) {
    const at = i * HIDP_VALUE_CAPS_SIZE
    if (values.readUInt16LE(at) !== HID_USAGE_PAGE_GENERIC || values[at + 12]) continue
    if (values.readUInt16LE(at + 8) !== HID_USAGE_DIGITIZER_FINGER) continue
    const link = values.readUInt16LE(at + 6)
    const usage = values.readUInt16LE(at + 56)
    const min = values.readInt32LE(at + 40)
    const max = values.readInt32LE(at + 44)
    const slot = byLink.get(link) ?? { link }
    if (usage === HID_USAGE_GENERIC_X) Object.assign(slot, { xMin: min, xMax: max })
    if (usage === HID_USAGE_GENERIC_Y) Object.assign(slot, { yMin: min, yMax: max })
    byLink.set(link, slot)
  }
  const fingers = [...byLink.values()]
    .filter((slot): slot is FingerSlot => slot.xMax !== undefined && slot.yMax !== undefined)
    .filter((slot) => slot.xMax > slot.xMin && slot.yMax > slot.yMin)
    .sort((a, b) => a.link - b.link)
  return fingers.length ? { preparsed, fingers } : null
}

function layoutOf(device: number): TouchpadLayout | null {
  let layout = layouts.get(device)
  if (layout === undefined) {
    layout = readLayout(device)
    layouts.set(device, layout)
  }
  return layout
}

/** Forgets cached layouts (devices can be unplugged and handles reused). */
export function clearTouchpadLayouts(): void {
  layouts.clear()
}

function value(layout: TouchpadLayout, page: number, link: number, usage: number, report: Buffer): number | null {
  const out = [0]
  const status = HidP_GetUsageValue(HIDP_INPUT, page, link, usage, out, layout.preparsed, report, report.length)
  return status === HIDP_STATUS_SUCCESS ? out[0] : null
}

function pressedUsages(layout: TouchpadLayout, link: number, report: Buffer, page = HID_USAGE_PAGE_DIGITIZER): Set<number> {
  const length = [16]
  const list = Buffer.alloc(length[0] * 2)
  const status = HidP_GetUsages(
    HIDP_INPUT,
    page,
    link,
    list,
    length,
    layout.preparsed,
    report,
    report.length
  )
  const usages = new Set<number>()
  if (status !== HIDP_STATUS_SUCCESS) return usages
  for (let i = 0; i < length[0]; i++) usages.add(list.readUInt16LE(i * 2))
  return usages
}

function parseReport(
  layout: TouchpadLayout,
  report: Buffer
): { contacts: TouchContact[]; contactCount: number; clicked: boolean } | null {
  const contactCount = value(layout, HID_USAGE_PAGE_DIGITIZER, 0, HID_USAGE_DIGITIZER_CONTACT_COUNT, report)
  // A report of another kind (a different report ID, e.g. a vendor one).
  if (contactCount === null) return null
  // Only the first `contactCount` slots hold real contacts. A count of 0
  // marks a continuation report (hybrid mode): treat its slots as valid.
  const slots = contactCount > 0 ? layout.fingers.slice(0, contactCount) : layout.fingers
  const contacts: TouchContact[] = []
  for (const slot of slots) {
    const x = value(layout, HID_USAGE_PAGE_GENERIC, slot.link, HID_USAGE_GENERIC_X, report)
    const y = value(layout, HID_USAGE_PAGE_GENERIC, slot.link, HID_USAGE_GENERIC_Y, report)
    const id = value(layout, HID_USAGE_PAGE_DIGITIZER, slot.link, HID_USAGE_DIGITIZER_CONTACT_ID, report)
    if (x === null || y === null || id === null) continue
    const pressed = pressedUsages(layout, slot.link, report)
    contacts.push({
      id,
      tip: pressed.has(HID_USAGE_DIGITIZER_TIP_SWITCH),
      confident: pressed.has(HID_USAGE_DIGITIZER_CONFIDENCE),
      x: Math.min(1, Math.max(0, (x - slot.xMin) / (slot.xMax - slot.xMin))),
      y: Math.min(1, Math.max(0, (y - slot.yMin) / (slot.yMax - slot.yMin)))
    })
  }
  // The pad's own physical button (a clickpad pressed down).
  const clicked = pressedUsages(layout, 0, report, HID_USAGE_PAGE_BUTTON).has(1)
  return { contacts, contactCount, clicked }
}

/**
 * Reads one WM_INPUT. Returns a frame per touchpad report in it, or an
 * empty list when it came from something other than a precision touchpad.
 * RAWINPUT = header, then RAWHID { dwSizeHid, dwCount, bRawData[] }.
 */
export function readTouchpadFrames(hRawInput: number): TouchFrame[] {
  const size = [0]
  GetRawInputDataBuffer(hRawInput, RID_INPUT, null, size, RAWINPUTHEADER_SIZE)
  if (!size[0]) return []
  const raw = Buffer.alloc(size[0])
  if (GetRawInputDataBuffer(hRawInput, RID_INPUT, raw, size, RAWINPUTHEADER_SIZE) === 0xffffffff) return []
  if (raw.readUInt32LE(0) !== RIM_TYPEHID) return []
  const device = Number(RAWINPUTHEADER_SIZE === 24 ? raw.readBigUInt64LE(8) : raw.readUInt32LE(8))
  const layout = layoutOf(device)
  if (!layout) return []

  const reportSize = raw.readUInt32LE(RAWINPUTHEADER_SIZE)
  const reportCount = raw.readUInt32LE(RAWINPUTHEADER_SIZE + 4)
  const frames: TouchFrame[] = []
  for (let i = 0; i < reportCount; i++) {
    const start = RAWINPUTHEADER_SIZE + 8 + i * reportSize
    if (start + reportSize > raw.length) break
    const parsed = parseReport(layout, raw.subarray(start, start + reportSize))
    if (parsed) frames.push({ device, ...parsed })
  }
  return frames
}
