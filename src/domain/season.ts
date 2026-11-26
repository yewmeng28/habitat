export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** Meteorological seasons for the northern hemisphere, from the local date. */
export function seasonAt(date: Date): Season {
  const m = date.getMonth() // 0 = January
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 10) return 'autumn'
  return 'winter'
}

type Rgb = [number, number, number]
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)]

/** A pixel that belongs to green foliage (not bark, soil or snow). */
export const isLeafy = ([r, g, b]: Rgb) => g > r + 8 && g > b + 8

const AUTUMN: Rgb[] = [[217, 168, 46], [201, 101, 46], [168, 64, 42]] // gold, orange, red

/**
 * The colour of a foliage pixel in a given season. Pure, so it can be tested without a canvas. `salt` picks
 * stable variety between neighbouring pixels (autumn leaves are not one colour).
 */
export function seasonalLeaf(rgb: Rgb, season: Season, salt = 0): Rgb {
  const light = Math.max(0.45, Math.min(1.25, rgb[1] / 160)) // keep the sprite's own shading
  switch (season) {
    case 'summer':
      return rgb
    case 'spring':
      return mix([Math.min(255, rgb[0] + 18), Math.min(255, rgb[1] + 22), rgb[2] + 6], [205, 240, 150], 0.18)
    case 'autumn': {
      const base = AUTUMN[Math.abs(salt) % AUTUMN.length]
      return [clamp(base[0] * light), clamp(base[1] * light), clamp(base[2] * light)]
    }
    case 'winter':
      return mix(rgb, [232, 240, 245], 0.66) // frosted, still shaded
  }
}

/** Grass colour for the woodland in a season. */
export function seasonalGrass(hex: string, season: Season): string {
  const n = parseInt(hex.slice(1), 16)
  const rgb: Rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const out: Rgb =
    season === 'autumn' ? mix(rgb, [150, 130, 60], 0.35)
    : season === 'winter' ? mix(rgb, [232, 240, 245], 0.7)
    : season === 'spring' ? mix(rgb, [120, 190, 90], 0.15)
    : rgb
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Trees that change with the seasons. Evergreens and fantasy species are left alone. */
export const DECIDUOUS = new Set(['oak', 'birch', 'maple', 'willow', 'ginkgo', 'cherry-blossom'])
