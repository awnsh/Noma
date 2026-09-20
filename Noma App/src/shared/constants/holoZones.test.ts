import { describe, expect, it } from 'vitest'
import { getHoloZoneLabel, getHoloZones, lookupHoloMicSide, recommendHoloZoneCount } from './index'

describe('recommendHoloZoneCount', () => {
  it('gives a MacBook 4 zones', () => {
    expect(recommendHoloZoneCount({ platform: 'darwin', manufacturer: 'Apple', model: 'MacBookPro18,3' }).count).toBe(4)
  })

  it('gives a Windows laptop (ROG Zephyrus G14) 2 zones', () => {
    const g14 = { platform: 'win32', manufacturer: 'ASUSTeK COMPUTER INC.', model: 'ROG Zephyrus G14 GA402' }
    expect(recommendHoloZoneCount(g14).count).toBe(2)
  })

  it('falls back to 2 when the laptop is unknown', () => {
    expect(recommendHoloZoneCount(null).count).toBe(2)
  })
})

describe('zone sets', () => {
  it('puts both 2-zone zones on the mic side, top and bottom', () => {
    expect(getHoloZones(2, 'left')).toEqual(['frontLeft', 'rearLeft'])
    expect(getHoloZones(2, 'right')).toEqual(['frontRight', 'rearRight'])
    expect(getHoloZones(2, 'left').map((zone) => getHoloZoneLabel(zone, 2))).toEqual(['Bottom left', 'Top left'])
  })

  it('keeps the full canonical order for 4 zones', () => {
    expect(getHoloZones(4, 'right')).toEqual(['frontLeft', 'frontRight', 'rearLeft', 'rearRight'])
  })
})

describe('lookupHoloMicSide', () => {
  it('knows the ROG Zephyrus G14 has its mic on the left', () => {
    expect(lookupHoloMicSide({ manufacturer: 'ASUSTeK COMPUTER INC.', model: 'ROG Zephyrus G14 GA402RJ' })).toBe('left')
  })

  it('returns null for models it has not verified', () => {
    expect(lookupHoloMicSide({ manufacturer: 'Dell', model: 'XPS 13' })).toBeNull()
    expect(lookupHoloMicSide(null)).toBeNull()
  })
})
