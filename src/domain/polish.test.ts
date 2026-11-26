import { describe, expect, it } from 'vitest'
import { pentatonic } from '../audio/soundscape'
import { WILDLIFE } from '../data/collection'
import { daylightAt, isNight, lighting } from './daylight'
import { DEFAULT_DISPLAY, resolveDisplay, wantsCalm, wantsLowQuality } from './preferences'
import { isLeafy, seasonAt, seasonalGrass, seasonalLeaf } from './season'

const at = (h: number, m = 0, month = 5) => new Date(2026, month, 15, h, m)

describe('day and night', () => {
  it('is bright at midday and dark in the small hours', () => {
    expect(daylightAt(at(12)).darkness).toBe(0)
    expect(daylightAt(at(23)).darkness).toBe(1)
    expect(daylightAt(at(3)).darkness).toBe(1)
  })
  it('darkens steadily through dusk and brightens through dawn, glowing warm only in between', () => {
    const dusk = [17.5, 18, 18.5, 19, 19.5].map((h) => daylightAt(at(Math.floor(h), (h % 1) * 60)).darkness)
    for (let i = 1; i < dusk.length; i++) expect(dusk[i]).toBeGreaterThanOrEqual(dusk[i - 1])
    const dawn = [5, 5.5, 6, 6.5, 7, 7.5].map((h) => daylightAt(at(Math.floor(h), (h % 1) * 60)).darkness)
    for (let i = 1; i < dawn.length; i++) expect(dawn[i]).toBeLessThanOrEqual(dawn[i - 1])
    expect(daylightAt(at(18, 30)).warmth).toBeGreaterThan(0.3)
    expect(daylightAt(at(12)).warmth).toBe(0)
    expect(daylightAt(at(1)).warmth).toBe(0)
  })
  it('lets the player pin day or night, and keeps magical places dim', () => {
    expect(lighting('day', at(23)).darkness).toBe(0)
    expect(lighting('night', at(12)).darkness).toBe(1)
    expect(lighting('auto', at(12)).darkness).toBe(0)
    expect(lighting('day', at(12), 0.32).darkness).toBe(0.32)
    expect(isNight(lighting('night', at(12)))).toBe(true)
    expect(isNight(lighting('day', at(23)))).toBe(false)
  })
})

describe('seasons', () => {
  it('maps months to northern-hemisphere seasons', () => {
    const season = (month: number) => seasonAt(new Date(2026, month, 10))
    expect([11, 0, 1].map(season)).toEqual(['winter', 'winter', 'winter'])
    expect([2, 3, 4].map(season)).toEqual(['spring', 'spring', 'spring'])
    expect([5, 6, 7].map(season)).toEqual(['summer', 'summer', 'summer'])
    expect([8, 9, 10].map(season)).toEqual(['autumn', 'autumn', 'autumn'])
  })
  const leaf: [number, number, number] = [67, 138, 55]
  it('recognises foliage but not bark or snow', () => {
    expect(isLeafy(leaf)).toBe(true)
    expect(isLeafy([122, 82, 48])).toBe(false) // bark
    expect(isLeafy([240, 244, 247])).toBe(false) // snow
  })
  it('leaves summer alone, frosts winter, warms autumn and freshens spring', () => {
    expect(seasonalLeaf(leaf, 'summer')).toEqual(leaf)
    const winter = seasonalLeaf(leaf, 'winter')
    expect(winter.every((v, i) => v >= leaf[i])).toBe(true)
    expect(winter[0] + winter[1] + winter[2]).toBeGreaterThan(leaf[0] + leaf[1] + leaf[2]) // lighter, frosted
    for (const salt of [0, 1, 2]) {
      const a = seasonalLeaf(leaf, 'autumn', salt)
      expect(a[0]).toBeGreaterThan(a[1]) // warm: red above green
      expect(a[2]).toBeLessThan(a[0])
    }
    expect(seasonalLeaf(leaf, 'spring')[1]).toBeGreaterThan(leaf[1])
  })
  it('varies autumn colour between patches but is stable for the same patch', () => {
    const colours = new Set([0, 1, 2].map((salt) => seasonalLeaf(leaf, 'autumn', salt).join()))
    expect(colours.size).toBe(3)
    expect(seasonalLeaf(leaf, 'autumn', 4)).toEqual(seasonalLeaf(leaf, 'autumn', 4))
  })
  it('recolours ground as valid hex, lightest in winter', () => {
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) expect(seasonalGrass('#5c8a3a', s)).toMatch(/^#[0-9a-f]{6}$/)
    const sum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
    expect(sum(seasonalGrass('#5c8a3a', 'winter'))).toBeGreaterThan(sum(seasonalGrass('#5c8a3a', 'summer')))
  })
})

describe('display preferences', () => {
  it('fills in defaults, so older saved preferences still load', () => {
    expect(resolveDisplay(undefined)).toEqual(DEFAULT_DISPLAY)
    expect(resolveDisplay({ dayNight: 'night' }).seasons).toBe('auto')
  })
  it('starts with sound and music off, and keeps volume in range', () => {
    expect(DEFAULT_DISPLAY.sound).toBe(false)
    expect(DEFAULT_DISPLAY.music).toBe(false)
    expect(resolveDisplay({ volume: 7 }).volume).toBe(1)
    expect(resolveDisplay({ volume: -1 }).volume).toBe(0)
    expect(resolveDisplay({ volume: Number.NaN }).volume).toBe(DEFAULT_DISPLAY.volume)
  })
  it('combines the player’s choice with what the device asks for', () => {
    const d = (over = {}) => resolveDisplay(over)
    expect(wantsCalm(d(), true)).toBe(true) // auto follows the system
    expect(wantsCalm(d(), false)).toBe(false)
    expect(wantsCalm(d({ motion: 'full' }), true)).toBe(false) // the player can override
    expect(wantsCalm(d({ motion: 'reduced' }), false)).toBe(true)
    expect(wantsLowQuality(d(), true)).toBe(true)
    expect(wantsLowQuality(d({ quality: 'high' }), true)).toBe(false)
    expect(wantsLowQuality(d({ quality: 'low' }), false)).toBe(true)
  })
})

describe('creatures keep hours', () => {
  it('gives moths and fireflies the night, and birds, butterflies and squirrels the day', () => {
    const act = (id: string) => WILDLIFE.find((w) => w.id === id)?.activity
    expect(act('luna-moth')).toBe('night')
    expect(act('firefly')).toBe('night')
    for (const id of ['songbird', 'butterfly', 'squirrel', 'aurora-finch']) expect(act(id)).toBe('day')
    expect(act('zebra')).toBeUndefined()
  })
})

describe('music notes', () => {
  it('stays on the pentatonic scale, including below the root', () => {
    expect([0, 1, 2, 3, 4].map((s) => pentatonic(60, s))).toEqual([60, 62, 64, 67, 69])
    expect(pentatonic(60, 5)).toBe(72)
    expect(pentatonic(60, -1)).toBe(57)
  })
})
