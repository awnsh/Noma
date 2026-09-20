import { describe, expect, it } from 'vitest'
import { classifyMic, pickMicrophone, type MicCandidate } from './micKind'

describe('classifyMic', () => {
  it('recognizes laptop microphones', () => {
    expect(classifyMic('Microphone Array (Realtek(R) Audio)')).toBe('internal')
    expect(classifyMic('Internal Microphone (Cirrus Logic)')).toBe('internal')
    expect(classifyMic('MacBook Pro Microphone')).toBe('internal')
    expect(classifyMic('Microphone Array (AMD Audio Device)')).toBe('internal')
    expect(classifyMic('Integrated Camera Microphone')).toBe('internal')
  })

  it('recognizes external microphones', () => {
    expect(classifyMic('Headset Microphone (Logitech G733)')).toBe('external')
    expect(classifyMic('Microphone (USB Audio Device)')).toBe('external')
    expect(classifyMic('AirPods Pro')).toBe('external')
    expect(classifyMic('Microphone Array (USB Camera)')).toBe('external')
    expect(classifyMic('Blue Yeti')).toBe('external')
    expect(classifyMic('Logi C920 HD Pro Webcam')).toBe('external')
  })

  it('leaves ambiguous labels unknown', () => {
    expect(classifyMic('Microphone (Realtek High Definition Audio)')).toBe('unknown')
  })
})

describe('pickMicrophone', () => {
  const mic = (label: string): MicCandidate => ({ id: label, label, kind: classifyMic(label) })

  it('prefers the built-in array over an external headset, whatever the default is', () => {
    const picked = pickMicrophone([mic('Headset (Bluetooth)'), mic('Microphone Array (Realtek(R) Audio)')], false)
    expect(picked?.label).toBe('Microphone Array (Realtek(R) Audio)')
  })

  it('never picks an external mic unless explicitly allowed', () => {
    const onlyExternal = [mic('Microphone (USB Audio Device)')]
    expect(pickMicrophone(onlyExternal, false)).toBeNull()
    expect(pickMicrophone(onlyExternal, true)?.label).toBe('Microphone (USB Audio Device)')
  })

  it('falls back to an unknown-but-not-external mic', () => {
    const picked = pickMicrophone([mic('Blue Yeti'), mic('Microphone (Realtek High Definition Audio)')], false)
    expect(picked?.kind).toBe('unknown')
  })

  it('returns null with no devices', () => {
    expect(pickMicrophone([], true)).toBeNull()
  })
})
