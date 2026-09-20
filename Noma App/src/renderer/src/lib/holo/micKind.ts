/**
 * Holo locates taps *relative to the laptop's own microphone* (its side,
 * its distance to each zone), so a headset, USB, Bluetooth or webcam mic
 * sitting somewhere else on the desk would silently ruin every calibration.
 * Browsers don't say whether an input is built in, so this classifies by the
 * device label the OS reports. Pure, so it's unit tested.
 */
export type MicKind = 'internal' | 'external' | 'unknown'

/** Unambiguous "plugged in / wireless / worn" markers — checked first, so
 *  "Microphone Array (USB Audio)" is still external. */
const HARD_EXTERNAL = /usb|bluetooth|\bbt\b|wireless|headset|headphone|earbud|earphone|airpods|buds|hands-free|handsfree|hfp|studio display/i
/** Words OSes use for a laptop's own mic. "Integrated Camera" is the
 *  laptop's webcam mic, so this is checked before the webcam brands below. */
const INTERNAL = /array|internal|built-?in|integrated|\bdmic\b|digital mic|smart sound|macbook|imac/i
/** Common external mic / webcam brands and words. */
const SOFT_EXTERNAL = /webcam|camera|\bcam\b|logitech|razer|hyperx|yeti|\bblue\b|rode|samson|fifine|elgato|steelseries|corsair|jabra|plantronics|poly|sennheiser|shure|c920|brio|obs|nvidia broadcast/i

export function classifyMic(label: string): MicKind {
  if (HARD_EXTERNAL.test(label)) return 'external'
  if (INTERNAL.test(label)) return 'internal'
  if (SOFT_EXTERNAL.test(label)) return 'external'
  return 'unknown'
}

export interface MicCandidate {
  id: string
  label: string
  kind: MicKind
}

/**
 * The one microphone Holo uses: a built-in one if any exists (preferring an
 * "array", the laptop's own mic), else an unlabeled-but-not-external one
 * (e.g. plain "Microphone (Realtek Audio)"), else — only when the user has
 * explicitly allowed it — an external one. Null means there is nothing
 * acceptable to listen on.
 */
export function pickMicrophone(candidates: MicCandidate[], allowExternal: boolean): MicCandidate | null {
  const internal = candidates.filter((mic) => mic.kind === 'internal')
  if (internal.length > 0) return internal.find((mic) => /array/i.test(mic.label)) ?? internal[0]
  const unknown = candidates.find((mic) => mic.kind === 'unknown')
  if (unknown) return unknown
  return allowExternal ? (candidates.find((mic) => mic.kind === 'external') ?? null) : null
}
