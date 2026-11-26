import type { GrowthStage } from '../domain/types'

/**
 * Procedural pixel art. Every sprite is drawn with whole-pixel fillRects onto a small canvas
 * (no smoothing, no vector curves), then scaled with nearest-neighbour. Each species has its own
 * silhouette function; stages scale that same silhouette so a tree visibly grows into itself.
 */

export const SPRITE_W = 32
export const SPRITE_H = 48

type Ctx = CanvasRenderingContext2D

function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return [c, ctx]
}

/** Fills whole pixels. Accepts (x, y, color, w?, h?) or (x, y, w, h, color). */
function px(ctx: Ctx, x: number, y: number, color: string, w?: number, h?: number): void
function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void
function px(ctx: Ctx, x: number, y: number, a: string | number, b?: number, c?: number | string) {
  const [color, w, h] = typeof a === 'string' ? [a, b ?? 1, (c as number) ?? 1] : [c as string, a, b as number]
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  const R = Math.max(1, Math.round(r))
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R + R * 0.4) px(ctx, cx + dx, cy + dy, color)
}

/** A shaded leaf blob: dark base, mid body shifted up-left, light highlight on top. */
function blob(ctx: Ctx, cx: number, cy: number, r: number, c: [string, string, string]) {
  disc(ctx, cx + 1, cy + 1, r, c[0])
  disc(ctx, cx, cy, r - 1, c[1])
  disc(ctx, cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), Math.max(1, r * 0.55), c[2])
}

function trunk(ctx: Ctx, cx: number, baseY: number, w: number, h: number, base: string, shade: string) {
  const left = Math.round(cx - w / 2)
  px(ctx, left, baseY - h, w, h, base)
  px(ctx, left + w - 1, baseY - h, 1, h, shade)
  // little root flare
  px(ctx, left - 1, baseY - 1, 1, 1, shade)
  px(ctx, left + w, baseY - 1, 1, 1, shade)
}

// Shared early stages, tinted by species leaf colour.
function drawSeed(ctx: Ctx, soil: string) {
  px(ctx, 13, 45, 6, 2, soil)
  px(ctx, 14, 44, 4, 1, soil)
  px(ctx, 15, 43, 2, 1, '#e0c27a')
}
function drawSprout(ctx: Ctx, leaf: [string, string, string]) {
  px(ctx, 13, 46, 6, 1, '#6b4a2b')
  px(ctx, 15, 40, 2, 6, leaf[0])
  px(ctx, 12, 39, 3, 2, leaf[1])
  px(ctx, 17, 38, 3, 2, leaf[2])
}

// stage -> size multiplier for grown stages
const SCALE: Record<GrowthStage, number> = { seed: 0, sprout: 0, sapling: 0.45, young: 0.72, mature: 1 }

interface Species {
  leaf: [string, string, string]
  soil: string
  draw: (ctx: Ctx, s: number) => void
}

const BARK: [string, string] = ['#7a5230', '#5a3b22']

const SPECIES: Record<string, Species> = {
  // Broad, round, heavy crown on a thick trunk.
  oak: {
    leaf: ['#2f5e2a', '#438a37', '#6bb552'],
    soil: '#6b4a2b',
    draw(ctx, s) {
      const th = Math.round(16 * s)
      trunk(ctx, 16, 47, s < 0.6 ? 3 : 5, th, ...BARK)
      const ty = 47 - th
      const c = SPECIES.oak.leaf
      blob(ctx, 16 - 8 * s, ty - 3 * s, 7 * s, c)
      blob(ctx, 16 + 8 * s, ty - 3 * s, 7 * s, c)
      blob(ctx, 16, ty - 8 * s, 10 * s, c)
      blob(ctx, 16, ty - 15 * s, 7 * s, c)
    },
  },
  // Narrow, pointed, three stacked tiers; little trunk showing.
  pine: {
    leaf: ['#1d4a30', '#2b6b43', '#4a9565'],
    soil: '#5b4128',
    draw(ctx, s) {
      const th = Math.round(7 * s)
      trunk(ctx, 16, 47, 2, th, '#6b4a2b', '#4a321c')
      const base = 47 - th
      const tiers: [number, number, number][] = [
        [9, 9, 0], // halfWidth, height, offset up
        [7, 9, 7],
        [5, 9, 14],
      ]
      for (const [hw, h, up] of tiers) {
        const bottom = base - up * s + 2
        const H = Math.round(h * s) + 2
        for (let i = 0; i < H; i++) {
          const w = Math.max(1, Math.round((hw * s * (i + 1)) / H))
          const y = bottom - H + i
          px(ctx, 16 - w, y, w * 2, 1, SPECIES.pine.leaf[1])
          px(ctx, 16 + w - 1, y, 1, 1, SPECIES.pine.leaf[0])
          px(ctx, 16 - w, y, 1, 1, SPECIES.pine.leaf[2])
        }
      }
      px(ctx, 16, base - 24 * s, 1, 2, SPECIES.pine.leaf[2])
    },
  },
  // Tall slim white trunk with dark marks and a small airy crown.
  birch: {
    leaf: ['#5f8f3a', '#86bb4f', '#b4dc7a'],
    soil: '#6b4a2b',
    draw(ctx, s) {
      const th = Math.round(26 * s)
      trunk(ctx, 16, 47, 3, th, '#ece7d8', '#b8b2a0')
      for (let y = 0; y < th; y += 4) px(ctx, 15 + (y % 8 === 0 ? 0 : 1), 47 - y - 3, 2, 1, '#3b3730')
      const ty = 47 - th
      const c = SPECIES.birch.leaf
      blob(ctx, 16 - 4 * s, ty + 1 * s, 4 * s, c)
      blob(ctx, 16 + 4 * s, ty + 2 * s, 4 * s, c)
      blob(ctx, 16, ty - 5 * s, 6 * s, c)
      blob(ctx, 16, ty - 11 * s, 4 * s, c)
    },
  },
  // Wide, flat-topped, leaning crown of pink blossom on a bent trunk with a side branch.
  'cherry-blossom': {
    leaf: ['#d9648f', '#f08fb2', '#ffd1e0'],
    soil: '#6b4a2b',
    draw(ctx, s) {
      const th = Math.round(13 * s)
      trunk(ctx, 15, 47, s < 0.6 ? 3 : 4, th, '#5e4038', '#3f2a25')
      const ty = 47 - th
      // leaning branch to the right
      for (let i = 0; i < Math.round(8 * s); i++) px(ctx, 17 + i, ty - i * 0.6, '#5e4038', 2, 2)
      const c = SPECIES['cherry-blossom'].leaf
      blob(ctx, 16 - 9 * s, ty - 2 * s, 6 * s, c)
      blob(ctx, 16 + 9 * s, ty - 6 * s, 5 * s, c)
      blob(ctx, 16 - 3 * s, ty - 8 * s, 8 * s, c)
      blob(ctx, 16 + 4 * s, ty - 11 * s, 6 * s, c)
      if (s > 0.9) {
        // fallen petals
        for (const [x, y] of [[9, 46], [22, 46], [12, 47], [19, 47], [25, 45]]) px(ctx, x, y, '#ffd1e0')
      }
    },
  },
}


// ---- more species (added to the same table) ----
SPECIES.maple = {
  // Wide, low, dense dome in red-orange, with a few bright leaves.
  leaf: ['#9a3a22', '#c9552e', '#e98a4a'],
  soil: '#6b4a2b',
  draw(ctx, s) {
    const th = Math.round(13 * s)
    trunk(ctx, 16, 47, s < 0.6 ? 3 : 4, th, '#6a4630', '#4a2f20')
    const ty = 47 - th
    const c = SPECIES.maple.leaf
    blob(ctx, 16 - 9 * s, ty - 1 * s, 6 * s, c)
    blob(ctx, 16 + 9 * s, ty - 1 * s, 6 * s, c)
    blob(ctx, 16, ty - 6 * s, 9 * s, c)
    blob(ctx, 16 - 4 * s, ty - 11 * s, 6 * s, c)
    blob(ctx, 16 + 5 * s, ty - 10 * s, 5 * s, c)
    if (s > 0.9) for (const [x, y] of [[7, 44], [24, 45], [12, 46], [20, 46]]) px(ctx, x, y, '#e98a4a', 2, 1)
  },
}
SPECIES.willow = {
  // Soft dome with long hanging strands that reach almost to the ground.
  leaf: ['#5f8a3a', '#86b04e', '#b6d77a'],
  soil: '#6b4a2b',
  draw(ctx, s) {
    const th = Math.round(15 * s)
    trunk(ctx, 16, 47, s < 0.6 ? 3 : 4, th, '#6b5a40', '#4a3d2a')
    const ty = 47 - th
    const c = SPECIES.willow.leaf
    blob(ctx, 16, ty - 4 * s, 9 * s, c)
    blob(ctx, 16 - 6 * s, ty - 2 * s, 5 * s, c)
    blob(ctx, 16 + 6 * s, ty - 2 * s, 5 * s, c)
    const strandBottom = 46
    for (const dx of [-13, -10, -7, -4, 4, 7, 10, 13]) {
      const x = Math.round(16 + dx * s)
      const top = Math.round(ty - 1 * s + Math.abs(dx) * 0.1)
      const len = Math.round((strandBottom - top) * (0.55 + (Math.abs(dx) % 5) * 0.08))
      px(ctx, x, top, 1, len, c[1])
      px(ctx, x, top + len - 2, 1, 2, c[0])
    }
  },
}
SPECIES.ginkgo = {
  // Fan / inverted-wedge crown in golden yellow on a slim trunk.
  leaf: ['#b08a1a', '#e0b92e', '#f6e27a'],
  soil: '#6b4a2b',
  draw(ctx, s) {
    const th = Math.round(15 * s)
    trunk(ctx, 16, 47, 3, th, '#7a6044', '#523f2c')
    const top = 47 - th
    const c = SPECIES.ginkgo.leaf
    const H = Math.max(3, Math.round(22 * s))
    for (let i = 0; i < H; i++) {
      const half = Math.round(2 + (i / H) * 11 * s + (i > H * 0.8 ? -1 : 0))
      const y = top - H + 2 + i
      px(ctx, 16 - half, y, half * 2, 1, c[1])
      px(ctx, 16 + half - 1, y, 1, 1, c[0])
      px(ctx, 16 - half, y, 2, 1, c[2])
      if (i % 3 === 0) px(ctx, 16 - half + 1 + ((i * 7) % (half * 2 - 2)), y, 1, 1, c[2])
    }
  },
}
SPECIES.cedar = {
  // Broad flat layers with gaps between them, so it reads wider and airier than the pine.
  leaf: ['#1f4d4a', '#2f6e68', '#4f9a8f'],
  soil: '#5b4128',
  draw(ctx, s) {
    const th = Math.round(10 * s)
    trunk(ctx, 16, 47, 4, th, '#6b4a2b', '#4a321c')
    const base = 47 - th
    const layers: [number, number][] = [[13, 0], [10, 7], [7, 14], [4, 20]]
    for (const [hw, up] of layers) {
      const y = Math.round(base - up * s)
      const w = Math.max(2, Math.round(hw * s))
      px(ctx, 16 - w, y - 3, w * 2, 4, SPECIES.cedar.leaf[1])
      px(ctx, 16 - w - 1, y - 1, w * 2 + 2, 2, SPECIES.cedar.leaf[0]) // drooping tips
      px(ctx, 16 - w + 1, y - 3, w, 1, SPECIES.cedar.leaf[2])
    }
  },
}

// ---- Frozen Tundra, Golden Savannah and Whispering Marsh species ----
const SNOW = '#ffffff'
const SNOW_SHADE = '#e1ecf3'

SPECIES['snowy-pine'] = {
  // Pine tiers with fresh snow settled on the ledges and slopes.
  leaf: ['#1d4a4a', '#2f6b6b', '#4f9a9a'],
  soil: '#5b4128',
  draw(ctx, s) {
    const th = Math.round(7 * s)
    trunk(ctx, 16, 47, 2, th, '#6b4a2b', '#4a321c')
    const base = 47 - th
    for (const [hw, h, up] of [[9, 9, 0], [7, 9, 7], [5, 9, 14]]) {
      const bottom = base - up * s + 2
      const H = Math.round(h * s) + 2
      for (let i = 0; i < H; i++) {
        const w = Math.max(1, Math.round((hw * s * (i + 1)) / H))
        const y = bottom - H + i
        const c = SPECIES['snowy-pine'].leaf
        px(ctx, 16 - w, y, w * 2, 1, c[1])
        px(ctx, 16 + w - 1, y, 1, 1, c[0])
        if (i % 3 === 1) px(ctx, 16 - w, y, 2, 1, SNOW)
        if (i % 3 === 2) px(ctx, 16 + w - 2, y, 2, 1, SNOW_SHADE)
        if (i === H - 1) px(ctx, 16 - w, y, w * 2, 1, SNOW_SHADE) // snow on the ledge
      }
    }
    px(ctx, 15, base - 24 * s, 2, 2, SNOW)
  },
}
SPECIES['frost-spruce'] = {
  // Tall and narrow, five slim tiers, silvered with frost.
  leaf: ['#2f5a6a', '#4a7f90', '#8fc0cf'],
  soil: '#5b4128',
  draw(ctx, s) {
    const th = Math.round(6 * s)
    trunk(ctx, 16, 47, 2, th, '#5a4430', '#3a2c1e')
    const base = 47 - th
    ;[[6, 0], [6, 7], [5, 14], [4, 21], [3, 28]].forEach(([hw, up]) => {
      const bottom = base - up * s + 1
      const H = Math.max(3, Math.round(8 * s))
      for (let i = 0; i < H; i++) {
        const w = Math.max(1, Math.round((hw * s * (i + 1)) / H))
        const y = bottom - H + i
        const c = SPECIES['frost-spruce'].leaf
        px(ctx, 16 - w, y, w * 2, 1, c[1])
        px(ctx, 16 + w - 1, y, 1, 1, c[0])
        px(ctx, 16 - w, y, 1, 1, c[2])
        if ((i + up) % 4 === 0) px(ctx, 16 - w + 1, y, 1, 1, SNOW)
      }
    })
    px(ctx, 16, base - 35 * s, 1, 2, SNOW)
  },
}
SPECIES['arctic-willow'] = {
  // Low, wide and wind-bent, studded with white catkins.
  leaf: ['#5f7e6c', '#8eb09a', '#cfe4d8'],
  soil: '#6b5a40',
  draw(ctx, s) {
    const th = Math.round(8 * s)
    trunk(ctx, 15, 47, s < 0.6 ? 3 : 4, th, '#6a5a48', '#4a3c2c')
    px(ctx, 17, 47 - th, Math.round(7 * s), 2, '#6a5a48') // bent branch
    const ty = 47 - th
    const c = SPECIES['arctic-willow'].leaf
    blob(ctx, 16 - 9 * s, ty - 1 * s, 6 * s, c)
    blob(ctx, 16 + 9 * s, ty - 2 * s, 6 * s, c)
    blob(ctx, 16, ty - 5 * s, 9 * s, c)
    if (s > 0.6) for (const [dx, dy] of [[-8, -4], [-3, -9], [4, -7], [9, -3], [0, -3], [-10, 0], [6, -11]]) px(ctx, 16 + dx * s, ty + dy * s, SNOW, 1, 2)
  },
}
SPECIES.acacia = {
  // A thin trunk forking under a flat, wide umbrella of leaves.
  leaf: ['#5a7220', '#8aa83a', '#b6cc58'],
  soil: '#8a6a3a',
  draw(ctx, s) {
    const th = Math.round(20 * s)
    trunk(ctx, 16, 47, s < 0.6 ? 2 : 3, th, '#7a5a3a', '#523a24')
    const top = 47 - th
    for (let i = 0; i < Math.round(6 * s); i++) {
      px(ctx, 15 - i, top - i * 0.6, 2, 2, '#6a4a2e')
      px(ctx, 17 + i, top - i * 0.6, 2, 2, '#6a4a2e')
    }
    const c = SPECIES.acacia.leaf
    const rx = Math.max(3, Math.round(15 * s))
    const ry = Math.max(1, Math.round(4 * s))
    const cy = Math.round(top - 4 * s)
    ell(ctx, 17, cy + 1, rx, ry, c[0])
    ell(ctx, 16, cy, rx, ry, c[1])
    ell(ctx, 14, cy - 1, Math.max(2, rx - 4), Math.max(1, ry - 1), c[2])
    ell(ctx, 13, Math.round(cy - 4 * s), Math.round(rx * 0.55), Math.max(1, ry - 1), c[1])
    ell(ctx, 12, Math.round(cy - 4 * s) - 1, Math.max(1, Math.round(rx * 0.35)), 1, c[2])
  },
}
SPECIES.baobab = {
  // A vast bottle-shaped trunk with a few stubby branches and small tufts of leaves.
  leaf: ['#4a7a2a', '#6a9a3a', '#9ac85a'],
  soil: '#8a6a3a',
  draw(ctx, s) {
    const th = Math.max(6, Math.round(20 * s))
    const wBase = Math.max(3, Math.round(12 * s))
    const wTop = Math.max(2, Math.round(7 * s))
    for (let i = 0; i < th; i++) {
      const w = Math.round(wBase + (wTop - wBase) * (i / th))
      const x = 16 - Math.floor(w / 2)
      px(ctx, x, 47 - i, w, 1, '#8a6a48')
      px(ctx, x + w - 2, 47 - i, 2, 1, '#6a4a30')
      px(ctx, x, 47 - i, 1, 1, '#a88a64')
      if (i % 5 === 2) px(ctx, x + 2, 47 - i, Math.max(1, w - 5), 1, '#7a5a3c') // wrinkles
    }
    const top = 47 - th
    const c = SPECIES.baobab.leaf
    for (const dx of [-1, 0, 1]) {
      for (let i = 0; i < Math.round(6 * s); i++) px(ctx, 16 + dx * (2 + i), top - i * 1.2, 2, 2, '#7a5a3c')
      blob(ctx, 16 + dx * (3 + 6 * s), top - 6 * s, Math.max(2, 3.2 * s), c)
    }
  },
}
SPECIES['doum-palm'] = {
  // A gently curved trunk topped with a fan of stiff, drooping fronds.
  leaf: ['#2f6a22', '#4f9a35', '#8ad05a'],
  soil: '#8a6a3a',
  draw(ctx, s) {
    const th = Math.max(5, Math.round(23 * s))
    let tx = 16
    for (let i = 0; i < th; i++) {
      tx = 16 + Math.round(Math.sin(i * 0.17) * 2 * s)
      px(ctx, tx - 1, 47 - i, 3, 1, '#8a6a48')
      if (i % 3 === 0) px(ctx, tx - 1, 47 - i, 3, 1, '#6a4a30')
    }
    const cy = 47 - th
    const c = SPECIES['doum-palm'].leaf
    const len = Math.max(3, Math.round(11 * s))
    for (let a = 0; a < 9; a++) {
      const ang = Math.PI * (1.08 + (a / 8) * 0.84)
      for (let k = 1; k <= len; k++) {
        const x = tx + Math.cos(ang) * k
        const y = cy + Math.sin(ang) * k * 0.75 + (k / len) ** 2 * 5 * s
        px(ctx, x, y, 1, 1, a % 2 ? c[1] : c[0])
        if (k > len * 0.4 && k % 2 === 0) px(ctx, x, y + 1, 1, 1, c[2])
      }
    }
    px(ctx, tx - 1, cy + 1, 3, 2, '#8a4a1a') // fruit
  },
}
SPECIES.mangrove = {
  // A rounded dark crown lifted on arching stilt roots.
  leaf: ['#1f4a22', '#2f6e32', '#5aa04a'],
  soil: '#4a4a2a',
  draw(ctx, s) {
    const rootTop = 47 - Math.round(9 * s)
    for (const side of [-1, 1]) {
      for (const off of [4, 8]) {
        const steps = Math.max(3, Math.round(9 * s))
        for (let k = 0; k <= steps; k++) {
          const f = k / steps
          px(ctx, 16 + side * Math.round(off * s * f), rootTop + Math.round(((47 - rootTop) * f) ** 1), 1, 2, '#5a4030')
        }
      }
    }
    const th = Math.round(13 * s)
    trunk(ctx, 16, rootTop + 1, 2, th, '#5a4030', '#3a2a20')
    const ty = rootTop - th
    const c = SPECIES.mangrove.leaf
    blob(ctx, 16 - 7 * s, ty + 1 * s, 5 * s, c)
    blob(ctx, 16 + 7 * s, ty + 1 * s, 5 * s, c)
    blob(ctx, 16, ty - 4 * s, 8 * s, c)
    if (s > 0.9) for (const dx of [-6, 2, 8]) px(ctx, 16 + dx, ty + 6, 1, 6, '#5a4030') // hanging roots
  },
}
SPECIES['bald-cypress'] = {
  // A buttressed trunk with knobbly knees and ragged, feathery tiers that turn rusty at the tips.
  leaf: ['#5a7a2a', '#7f9f3a', '#b8a050'],
  soil: '#4a4a2a',
  draw(ctx, s) {
    const th = Math.round(12 * s)
    for (let i = 0; i < th; i++) {
      const w = Math.max(2, Math.round(2 + (1 - i / th) * 4 * s))
      px(ctx, 16 - Math.floor(w / 2), 47 - i, w, 1, i % 2 ? '#7a5a3a' : '#6a4a30')
    }
    if (s > 0.6) for (const dx of [-8, -5, 6, 9]) px(ctx, 16 + dx, 45, 2, 3, '#6a4a30') // knees
    const base = 47 - th
    const c = SPECIES['bald-cypress'].leaf
    ;[[8, 0], [6, 8], [4, 15]].forEach(([hw, up]) => {
      const H = Math.max(3, Math.round(10 * s))
      const bottom = base - up * s + 2
      for (let i = 0; i < H; i++) {
        const jag = ((i * 7) % 3) - 1
        const w = Math.max(1, Math.round((hw * s * (i + 1)) / H) + jag)
        const y = bottom - H + i
        px(ctx, 16 - w, y, w * 2, 1, c[1])
        px(ctx, 16 - w, y, 1, 1, c[0])
        if (i % 2 === 0) px(ctx, 16 + w - 1, y, 1, 1, c[2])
      }
    })
  },
}
SPECIES['marsh-willow'] = {
  // Dark, leaning dome with long trailing fronds tipped with moss.
  leaf: ['#2a5a4a', '#3f8068', '#7fb09a'],
  soil: '#4a4a2a',
  draw(ctx, s) {
    const th = Math.round(14 * s)
    trunk(ctx, 15, 47, s < 0.6 ? 3 : 5, th, '#4a4030', '#2f2a20')
    const ty = 47 - th
    const c = SPECIES['marsh-willow'].leaf
    blob(ctx, 17, ty - 4 * s, 9 * s, c)
    blob(ctx, 17 - 6 * s, ty - 1 * s, 5 * s, c)
    blob(ctx, 17 + 7 * s, ty - 2 * s, 5 * s, c)
    for (const dx of [-14, -11, -8, -5, 2, 5, 8, 11, 14]) {
      const x = Math.round(17 + dx * s)
      const top = Math.round(ty - 1 * s + Math.abs(dx) * 0.1)
      const len = Math.round((46 - top) * (0.5 + (Math.abs(dx) % 5) * 0.08))
      px(ctx, x, top, 1, len, c[1])
      px(ctx, x, top + len - 3, 1, 3, '#8ab04a') // moss at the tips
    }
  },
}

// ---- Skybound Peaks and Enchanted Fairy Forest species ----
SPECIES.cloudwood = {
  // A slim trunk carrying a small, soft cloud for a crown, with a shaded flat underside.
  leaf: ['#a8c4e0', '#e8f2fc', '#ffffff'],
  soil: '#8a7a68',
  draw(ctx, s) {
    const th = Math.round(16 * s)
    trunk(ctx, 16, 47, 2, th, '#9a8a78', '#6a5a4a')
    const ty = 47 - th
    const c = SPECIES.cloudwood.leaf
    ell(ctx, 16, Math.round(ty + 1 * s), Math.max(3, Math.round(12 * s)), Math.max(1, Math.round(2 * s)), '#9ab8d8') // underside
    blob(ctx, 16 - 8 * s, ty - 2 * s, 6 * s, c)
    blob(ctx, 16 + 8 * s, ty - 2 * s, 6 * s, c)
    blob(ctx, 16, ty - 7 * s, 9 * s, c)
    blob(ctx, 16 - 3 * s, ty - 13 * s, 5 * s, c)
  },
}
SPECIES['crystal-spire'] = {
  // No leaves at all: tall, faceted crystals growing from a little rubble.
  leaf: ['#5aa8d8', '#8fd8f8', '#e8fbff'],
  soil: '#8a7a68',
  draw(ctx, s) {
    ell(ctx, 16, 46, Math.max(3, Math.round(8 * s)), 1, '#7a6a58')
    const prism = (cx: number, h: number, w: number, lo: string, mid: string, hi: string) => {
      for (let i = 0; i < h; i++) {
        const tip = i > h - Math.max(2, Math.round(w * 0.8))
        const ww = tip ? Math.max(1, w - (i - (h - Math.max(2, Math.round(w * 0.8)))) - 1) : w
        px(ctx, cx - Math.floor(ww / 2), 46 - i, ww, 1, mid)
        px(ctx, cx - Math.floor(ww / 2), 46 - i, 1, 1, hi)
        px(ctx, cx + Math.ceil(ww / 2) - 1, 46 - i, 1, 1, lo)
      }
    }
    prism(16, Math.max(5, Math.round(36 * s)), Math.max(3, Math.round(7 * s)), '#5aa8d8', '#8fd8f8', '#e8fbff')
    prism(10, Math.max(3, Math.round(20 * s)), Math.max(2, Math.round(5 * s)), '#8a64c8', '#b890f0', '#f0e4ff')
    prism(22, Math.max(3, Math.round(25 * s)), Math.max(2, Math.round(5 * s)), '#5aa8d8', '#9ae0fa', '#ffffff')
    if (s > 0.8) for (const [x, y] of [[14, 12], [19, 20], [9, 30], [23, 26]]) px(ctx, x, y, '#ffffff')
  },
}
SPECIES.skyroot = {
  // Floats on its own scrap of island: a hanging rock, trailing roots and a shadow far below.
  leaf: ['#2f8a78', '#4fb89a', '#9ae8c8'],
  soil: '#8a7a68',
  draw(ctx, s) {
    ell(ctx, 16, 46, Math.max(3, Math.round(9 * s)), 1, '#2f4a3a') // shadow on the ground
    const rockY = 47 - Math.round(11 * s)
    const rw = Math.max(3, Math.round(8 * s))
    for (let i = 0; i < 6; i++) px(ctx, 16 - Math.max(1, rw - i), rockY + i, Math.max(2, (rw - i) * 2), 1, i % 2 ? '#7a6a58' : '#8a7a68')
    ell(ctx, 16, rockY, rw, 1, '#8fc07a')
    for (const dx of [-3, 0, 3]) px(ctx, 16 + Math.round(dx * s), rockY + 6, 1, Math.max(2, Math.round(5 * s)), '#6a4a30') // hanging roots
    const th = Math.round(11 * s)
    trunk(ctx, 16, rockY, s < 0.6 ? 2 : 3, th, '#7a5a3a', '#523a24')
    const ty = rockY - th
    const c = SPECIES.skyroot.leaf
    blob(ctx, 16 - 6 * s, ty, 5 * s, c)
    blob(ctx, 16 + 6 * s, ty - 1 * s, 5 * s, c)
    blob(ctx, 16, ty - 5 * s, 7 * s, c)
    if (s > 0.6) for (const [dx, dy] of [[-6, -2], [3, -8], [7, -1], [-2, -9]]) px(ctx, 16 + dx * s, ty + dy * s, '#ff9ad8', 2, 2)
  },
}
SPECIES['luminous-oak'] = {
  // A giant oak whose leaves glow, with bright lights in the crown and glowing runes on the trunk.
  leaf: ['#1f5a58', '#2f8a80', '#7fe8c8'],
  soil: '#3a4a50',
  draw(ctx, s) {
    ell(ctx, 16, 46, Math.max(4, Math.round(13 * s)), 2, '#2a6a70') // glow on the ground
    const th = Math.round(15 * s)
    trunk(ctx, 16, 47, s < 0.6 ? 4 : 6, th, '#4a4a5a', '#2f2f3a')
    if (s > 0.6) for (let i = 4; i < th - 2; i += 4) px(ctx, 15, 47 - i, 2, 1, '#7ff0ff') // runes
    const ty = 47 - th
    const c = SPECIES['luminous-oak'].leaf
    blob(ctx, 16 - 9 * s, ty - 2 * s, 7 * s, c)
    blob(ctx, 16 + 9 * s, ty - 2 * s, 7 * s, c)
    blob(ctx, 16, ty - 9 * s, 11 * s, c)
    blob(ctx, 16, ty - 17 * s, 7 * s, c)
    if (s > 0.6) for (const [dx, dy] of [[-9, -4], [6, -8], [-3, -14], [9, -2], [0, -9], [-5, -1], [4, -17]]) px(ctx, 16 + dx * s, ty + dy * s, '#e8fff8', 2, 2)
  },
}
SPECIES.moonwillow = {
  // A silver-lavender weeping tree, each trailing frond tipped with a point of light.
  leaf: ['#6a68a8', '#9a98d8', '#d8d4ff'],
  soil: '#3a3a5a',
  draw(ctx, s) {
    const th = Math.round(14 * s)
    trunk(ctx, 15, 47, s < 0.6 ? 3 : 4, th, '#5a5470', '#3a3450')
    const ty = 47 - th
    const c = SPECIES.moonwillow.leaf
    blob(ctx, 17, ty - 4 * s, 9 * s, c)
    blob(ctx, 17 - 6 * s, ty - 1 * s, 5 * s, c)
    blob(ctx, 17 + 7 * s, ty - 2 * s, 5 * s, c)
    for (const dx of [-14, -11, -8, -5, 2, 5, 8, 11, 14]) {
      const x = Math.round(17 + dx * s)
      const top = Math.round(ty - 1 * s + Math.abs(dx) * 0.1)
      const len = Math.round((46 - top) * (0.5 + (Math.abs(dx) % 5) * 0.08))
      px(ctx, x, top, 1, len, c[1])
      px(ctx, x, top + len - 1, 1, 1, '#bff8ff') // glowing tip
    }
  },
}
SPECIES['lantern-tree'] = {
  // A dark violet crown strung with glowing fruit that hangs like tiny lanterns.
  leaf: ['#2a2050', '#4a3a80', '#7a68b8'],
  soil: '#3a3050',
  draw(ctx, s) {
    const th = Math.round(15 * s)
    trunk(ctx, 16, 47, s < 0.6 ? 3 : 4, th, '#4a3a58', '#2f2540')
    const ty = 47 - th
    const c = SPECIES['lantern-tree'].leaf
    blob(ctx, 16 - 8 * s, ty - 1 * s, 6 * s, c)
    blob(ctx, 16 + 8 * s, ty - 1 * s, 6 * s, c)
    blob(ctx, 16, ty - 7 * s, 9 * s, c)
    for (const dx of [-9, -4, 2, 8]) {
      const x = Math.round(16 + dx * s)
      const top = Math.round(ty + 2 * s)
      const len = Math.max(2, Math.round((5 + (Math.abs(dx) % 4)) * s))
      px(ctx, x, top, 1, len, '#6a5a40') // string
      if (s > 0.4) {
        ell(ctx, x, top + len + 1, 2, 2, '#a06020') // glow
        px(ctx, x - 1, top + len, 2, 2, '#ffb040')
        px(ctx, x, top + len, '#fff0a0')
      }
    }
  },
}

// ---------- Wildlife ----------

function fromRows(rows: string[], palette: Record<string, string>): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length))
  const [canvas, ctx] = makeCanvas(w, rows.length)
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && palette[ch] && px(ctx, x, y, palette[ch])))
  return canvas
}

function drawn(w: number, h: number, draw: (ctx: Ctx) => void): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(w, h)
  draw(ctx)
  return canvas
}

/** One animal: a resting pose and the frames cycled while it moves. Every frame shares one canvas size. */
interface WildlifeFrames {
  idle: HTMLCanvasElement
  moving: HTMLCanvasElement[]
}

const BIRD_PAL = { k: '#3a2a1a', B: '#8a5a32', b: '#6a4224', R: '#e0623a', W: '#f2dcc0', E: '#111111', Y: '#f0b840', L: '#c98a3a', w: '#9a6a3c', t: '#4a2c18' }
const BIRD_IDLE = [
  '..............',
  '........kkk...',
  '.......kBBBk..',
  '......kBBEBkYY',
  '....kkBBBBBk..',
  '...kBBBBBRRRk.',
  '..kBBBBBBRRRRk',
  '..kbBBBBBWRRk.',
  '..kbbBBBWWWk..',
  '...kkbbBWWk...',
  '.....kkkkk....',
  '......L.L.....',
]
// Flight cycle: wings raised, then lowered. The body bobs a little between frames.
const BIRD_UP = [
  '....t.........',
  '....tw........',
  '.....www......',
  '.....wwww.....',
  '......wwww.kkk',
  '..kk.kwwwkkBBk',
  '..kkBBBBBBEBkY',
  '.kbbBBBBBBBBk.',
  '..kbBBBBRRRRk.',
  '...kkBBWWWRk..',
  '.....kkkkkk...',
  '..............',
]
const BIRD_DOWN = [
  '..............',
  '..............',
  '..........kkk.',
  '........kkkBBk',
  '..kkBBBBBBEBkY',
  '.kbbBBBBBBBBk.',
  '..kbBBBBRRRRk.',
  '...kkBBWWWRk..',
  '....kwwwwwk...',
  '...twwwwww....',
  '...twwww......',
  '....ttw.......',
]

// Mid-stroke: the wing is level, sweeping back across the body, so the beat reads smoothly up, level, down, level.
const BIRD_MID = [
  '..............',
  '..............',
  '..............',
  '...........kkk',
  '..twwwwwkkkBBk',
  '.twwwwwwwkEBkY',
  '.kbbBBBBBBBBk.',
  '..kbBBBBRRRRk.',
  '...kkBBWWWRk..',
  '.....kkkkkk...',
  '..............',
  '..............',
]

/** The robin's pose and flight frames, recoloured (the Aurora Finch reuses them). */
function birdFrames(pal: Record<string, string>): WildlifeFrames {
  const [idle, up, mid, down] = [BIRD_IDLE, BIRD_UP, BIRD_MID, BIRD_DOWN].map((r) => fromRows(r, pal))
  return { idle, moving: [up, mid, down, mid] }
}

function butterflyFrames(pal: Record<string, string>): WildlifeFrames {
  const open = ['....D.D....', 'WW...D...WW', 'WWWW.D.WWWW', 'WwwWWDWWwwW', '.WwwWDWwwW.', '..WWWDWWW..', '...WW.D.WW.', '.....D.....']
  const half = ['....D.D....', '.....D.....', '..WW.D.WW..', '..WwWDWwW..', '..WwWDWwW..', '...WWDWW...', '....WDW....', '.....D.....']
  const closed = ['....D.D....', '.....D.....', '.....W.....', '....WwW....', '....WwW....', '....WwW....', '.....W.....', '.....D.....']
  const [o, h, c] = [open, half, closed].map((r) => fromRows(r, pal))
  return { idle: o, moving: [o, h, c, h] }
}

const WILDLIFE_ART: Record<string, () => WildlifeFrames> = {
  songbird: () => birdFrames(BIRD_PAL),
  'aurora-finch': () => birdFrames({ k: '#3a2a5a', B: '#4ad8c8', b: '#2a9a9a', R: '#ff6ad8', W: '#fff0a8', E: '#111111', Y: '#ffd060', L: '#c98a3a', w: '#8a6aff', t: '#4a2c88' }),
  butterfly: () => butterflyFrames({ W: '#f2a93b', w: '#fbe08a', D: '#3a2a1a' }),
  'blossom-butterfly': () => butterflyFrames({ W: '#e87aa8', w: '#ffd6e6', D: '#4a2a3a' }),

  // Sitting with a bushy tail curled up behind, then stretched out mid-leap.
  squirrel: () => ({
    idle: drawn(16, 14, (c) => {
      ell(c, 4, 9, 3, 3, '#a85a22'); ell(c, 3, 5, 3, 4, '#a85a22'); ell(c, 5, 2, 2, 2, '#a85a22')
      ell(c, 4, 8, 2, 2, '#d9803a'); ell(c, 3, 5, 2, 3, '#d9803a'); px(c, 4, 1, '#f0d9b0', 2, 1)
      ell(c, 9, 9, 4, 4, '#c46a28'); ell(c, 11, 10, 2, 3, '#f0d9b0')
      ell(c, 11, 5, 3, 3, '#c46a28'); ell(c, 12, 6, 2, 1, '#f0d9b0')
      px(c, 10, 1, 1, 2, '#a85a22'); px(c, 13, 1, 1, 2, '#a85a22')
      px(c, 12, 4, '#111111'); px(c, 14, 5, '#222222', 1, 2)
      px(c, 12, 8, 2, 2, '#a85a22'); px(c, 13, 9, 2, 2, '#8a5a2a') // paws holding an acorn
      px(c, 7, 13, 3, 1, '#5a3318'); px(c, 11, 13, 3, 1, '#5a3318')
    }),
    moving: [
      drawn(16, 14, (c) => {
        ell(c, 3, 7, 3, 2, '#a85a22'); ell(c, 2, 5, 2, 2, '#a85a22'); ell(c, 3, 7, 2, 1, '#d9803a'); px(c, 1, 4, '#f0d9b0', 2, 1)
        ell(c, 8, 9, 5, 3, '#c46a28'); ell(c, 9, 11, 3, 1, '#f0d9b0')
        ell(c, 13, 7, 2, 2, '#c46a28'); px(c, 12, 4, 1, 2, '#a85a22'); px(c, 14, 4, 1, 2, '#a85a22')
        px(c, 14, 6, '#111111'); px(c, 15, 7, '#222222')
        px(c, 3, 11, 4, 1, '#5a3318'); px(c, 12, 11, 3, 1, '#5a3318') // legs stretched fore and aft
      }),
    ],
  }),

  // Upright with tall ears and a round white tail; ears laid back and legs stretched when hopping.
  rabbit: () => ({
    idle: drawn(16, 15, (c) => {
      ell(c, 3, 11, 2, 2, '#ffffff'); px(c, 2, 10, '#e6e6e6')
      ell(c, 8, 11, 4, 4, '#a89480'); ell(c, 9, 12, 3, 3, '#cdbfae')
      ell(c, 12, 7, 3, 3, '#a89480'); ell(c, 13, 8, 2, 1, '#cdbfae')
      px(c, 11, 0, 2, 5, '#8a7560'); px(c, 14, 1, 2, 5, '#8a7560'); px(c, 11, 1, 1, 3, '#e8b0a8'); px(c, 14, 2, 1, 3, '#e8b0a8')
      px(c, 13, 6, '#111111'); px(c, 15, 8, '#e8909a')
      px(c, 7, 14, 3, 1, '#6a5a48'); px(c, 11, 14, 4, 1, '#6a5a48')
    }),
    moving: [
      drawn(16, 15, (c) => {
        ell(c, 2, 10, 2, 2, '#ffffff')
        ell(c, 8, 10, 5, 3, '#a89480'); ell(c, 9, 11, 3, 1, '#cdbfae')
        ell(c, 13, 8, 2, 2, '#a89480')
        px(c, 9, 5, 5, 2, '#8a7560'); px(c, 9, 5, 4, 1, '#e8b0a8') // ears laid back
        px(c, 14, 7, '#111111'); px(c, 15, 9, '#e8909a')
        px(c, 2, 12, 5, 1, '#6a5a48'); px(c, 11, 12, 4, 1, '#6a5a48')
      }),
    ],
  }),

  frog: () => frogArt({ body: '#5aa83c', dark: '#3f7a2c', belly: '#a8d878' }),
}


interface FrogPalette { body: string; dark: string; belly: string }
/** Crouched with bulging eyes, then legs thrown out mid-hop. */
function frogArt({ body, dark, belly }: FrogPalette): WildlifeFrames {
  return {
    idle: drawn(12, 9, (c) => {
      ell(c, 6, 6, 4, 2, body); ell(c, 6, 7, 3, 1, belly)
      ell(c, 4, 3, 1, 1, body); ell(c, 8, 3, 1, 1, body)
      px(c, 4, 2, '#fff6a8'); px(c, 8, 2, '#fff6a8'); px(c, 4, 3, '#111111'); px(c, 8, 3, '#111111')
      px(c, 5, 5, 3, 1, dark)
      px(c, 1, 7, 3, 1, dark); px(c, 8, 7, 3, 1, dark); px(c, 1, 8, 2, 1, dark); px(c, 9, 8, 2, 1, dark)
    }),
    moving: [
      drawn(12, 9, (c) => {
        ell(c, 6, 4, 3, 2, body); ell(c, 6, 5, 2, 1, belly)
        px(c, 4, 2, '#fff6a8'); px(c, 8, 2, '#fff6a8'); px(c, 4, 3, '#111111'); px(c, 8, 3, '#111111')
        px(c, 0, 5, 4, 1, dark); px(c, 0, 6, 2, 1, dark)
        px(c, 9, 5, 3, 1, dark); px(c, 10, 6, 2, 1, dark)
      }),
    ],
  }
}
WILDLIFE_ART['marsh-frog'] = () => frogArt({ body: '#4a7a3a', dark: '#2f5a2a', belly: '#a0b868' })

// ---- Frozen Tundra ----
WILDLIFE_ART['snow-hare'] = () => {
  const W = '#f4f9fb'
  const S = '#cfdde6'
  return {
    idle: drawn(16, 14, (c) => {
      ell(c, 3, 10, 2, 2, '#ffffff')
      ell(c, 8, 10, 4, 3, W); ell(c, 9, 11, 3, 2, S)
      ell(c, 12, 6, 3, 3, W)
      px(c, 11, 1, 2, 4, W); px(c, 14, 2, 2, 4, W); px(c, 11, 1, 2, 1, '#222222'); px(c, 14, 2, 2, 1, '#222222') // black ear tips
      px(c, 12, 2, 1, 2, '#e8b0a8'); px(c, 15, 3, 1, 2, '#e8b0a8')
      px(c, 13, 5, '#111111'); px(c, 15, 7, '#e8909a')
      px(c, 7, 13, 3, 1, S); px(c, 11, 13, 4, 1, S)
    }),
    moving: [
      drawn(16, 14, (c) => {
        ell(c, 2, 9, 2, 2, '#ffffff')
        ell(c, 8, 9, 5, 2, W); ell(c, 9, 10, 3, 1, S)
        ell(c, 13, 7, 2, 2, W)
        px(c, 9, 4, 5, 2, W); px(c, 9, 4, 2, 1, '#222222')
        px(c, 14, 6, '#111111'); px(c, 15, 8, '#e8909a')
        px(c, 2, 11, 5, 1, S); px(c, 11, 11, 4, 1, S)
      }),
    ],
  }
}
WILDLIFE_ART['arctic-fox'] = () => {
  const W = '#f4f9fb'
  const S = '#cfdde6'
  const body = (c: Ctx) => {
    ell(c, 4, 8, 4, 3, W); ell(c, 3, 9, 3, 2, S) // bushy tail
    ell(c, 11, 8, 5, 3, W); ell(c, 12, 9, 4, 2, S)
    ell(c, 17, 6, 3, 3, W); px(c, 20, 7, 2, 2, W); px(c, 21, 7, '#222222') // snout and nose
    px(c, 15, 1, 2, 3, W); px(c, 18, 1, 2, 3, W); px(c, 16, 2, 1, 2, '#e0eaf0'); px(c, 19, 2, 1, 2, '#e0eaf0')
    px(c, 18, 5, '#111111')
  }
  return {
    idle: drawn(22, 14, (c) => {
      body(c)
      for (const x of [8, 11, 14, 17]) px(c, x, 11, 2, 3, S)
    }),
    moving: [
      drawn(22, 14, (c) => {
        body(c)
        px(c, 6, 11, 2, 3, S); px(c, 10, 11, 2, 2, S); px(c, 15, 11, 2, 3, S); px(c, 19, 11, 2, 2, S) // trotting stride
      }),
    ],
  }
}
/** A stag: used for the reindeer and, in glowing colours, the spirit stag. */
function deerArt(B: string, D: string, chest: string, belly: string, antler: string): WildlifeFrames {
  const body = (c: Ctx) => {
    ell(c, 13, 13, 8, 4, B); ell(c, 14, 15, 6, 2, belly)
    ell(c, 21, 10, 3, 4, chest) // pale chest and neck
    ell(c, 24, 6, 3, 3, B); px(c, 26, 8, 3, 2, D); px(c, 28, 8, '#222222'); px(c, 25, 5, '#111111')
    px(c, 4, 11, 2, 2, chest) // tail
    // antlers
    for (const [x, y, w, h] of [[22, 0, 1, 4], [21, 0, 1, 2], [20, 1, 1, 1], [24, 0, 1, 4], [25, 0, 1, 2], [26, 1, 1, 1], [23, 2, 3, 1]]) px(c, x, y, w, h, antler)
  }
  return {
    idle: drawn(30, 26, (c) => {
      body(c)
      for (const x of [7, 10, 17, 20]) { px(c, x, 16, 2, 9, D); px(c, x, 25, 2, 1, '#2a1a10') }
    }),
    moving: [
      drawn(30, 26, (c) => {
        body(c)
        px(c, 5, 16, 2, 9, D); px(c, 5, 25, 2, 1, '#2a1a10'); px(c, 11, 16, 2, 8, D); px(c, 11, 24, 2, 1, '#2a1a10')
        px(c, 18, 16, 2, 8, D); px(c, 18, 24, 2, 1, '#2a1a10'); px(c, 22, 16, 2, 9, D); px(c, 22, 25, 2, 1, '#2a1a10')
      }),
    ],
  }
}

WILDLIFE_ART.reindeer = () => deerArt('#8a6a4a', '#6a4a30', '#e8e0d0', '#a88a6a', '#d8c8a0')
WILDLIFE_ART['spirit-stag'] = () => deerArt('#8ac8ff', '#5a8ac8', '#e8f8ff', '#b8e0ff', '#ffe9a0')

// ---- Golden Savannah ----
WILDLIFE_ART.zebra = () => {
  const body = (c: Ctx) => {
    ell(c, 13, 10, 8, 4, '#f4f4f0')
    for (let x = 6; x <= 20; x += 3) for (let y = 6; y <= 14; y++) if (((x - 13) / 8) ** 2 + ((y - 10) / 4) ** 2 < 0.95) px(c, x, y, 1, 1, '#1a1a1a')
    ell(c, 21, 6, 2, 4, '#f4f4f0'); ell(c, 24, 4, 3, 2, '#f4f4f0'); px(c, 26, 5, 2, 2, '#2a2a2a'); px(c, 24, 3, '#111111')
    for (let y = 1; y < 8; y += 2) px(c, 20, y, 1, 1, '#1a1a1a') // mane
    px(c, 23, 0, 1, 2, '#1a1a1a'); px(c, 25, 0, 1, 2, '#1a1a1a')
    px(c, 4, 8, 1, 6, '#1a1a1a') // tail
  }
  return {
    idle: drawn(30, 20, (c) => {
      body(c)
      for (const x of [7, 10, 17, 20]) { px(c, x, 14, 2, 6, '#f4f4f0'); px(c, x, 16, 2, 1, '#1a1a1a'); px(c, x, 19, 2, 1, '#2a2a2a') }
    }),
    moving: [
      drawn(30, 20, (c) => {
        body(c)
        for (const [x, h] of [[5, 6], [11, 5], [18, 5], [22, 6]]) { px(c, x, 14, 2, h, '#f4f4f0'); px(c, x, 16, 2, 1, '#1a1a1a'); px(c, x, 13 + h, 2, 1, '#2a2a2a') }
      }),
    ],
  }
}
WILDLIFE_ART.giraffe = () => {
  const Y = '#d9a040'
  const T = '#8a5a2a'
  const body = (c: Ctx) => {
    ell(c, 12, 20, 6, 4, Y)
    for (const [x, y] of [[8, 18], [11, 21], [14, 18], [16, 21], [10, 19]]) px(c, x, y, 2, 2, T)
    for (let i = 0; i < 14; i++) px(c, 16 + Math.floor(i / 6), 17 - i, 3, 1, Y) // long neck
    for (const [x, y] of [[17, 14], [18, 10], [17, 7]]) px(c, x, y, 2, 2, T)
    ell(c, 20, 4, 3, 2, Y); px(c, 22, 4, 3, 2, '#c89030'); px(c, 24, 4, '#222222'); px(c, 21, 3, '#111111')
    px(c, 18, 0, 1, 2, T); px(c, 21, 0, 1, 2, T); px(c, 17, 1, 1, 1, '#c89030') // ears and horns
    px(c, 6, 18, 1, 6, T) // tail
  }
  return {
    idle: drawn(26, 32, (c) => {
      body(c)
      for (const x of [7, 10, 14, 17]) { px(c, x, 24, 2, 8, '#d9a040'); px(c, x, 31, 2, 1, '#3a2814'); px(c, x, 27, 2, 1, T) }
    }),
    moving: [
      drawn(26, 32, (c) => {
        body(c)
        for (const [x, h] of [[5, 8], [11, 7], [13, 7], [19, 8]]) { px(c, x, 24, 2, h, '#d9a040'); px(c, x, 23 + h, 2, 1, '#3a2814') }
      }),
    ],
  }
}
WILDLIFE_ART.elephant = () => {
  const G = '#8a8a92'
  const D = '#6a6a74'
  const body = (c: Ctx, trunkUp: boolean) => {
    ell(c, 15, 12, 10, 7, G); ell(c, 16, 15, 7, 3, '#9a9aa2')
    ell(c, 26, 10, 5, 5, G)
    ell(c, 23, 9, 3, 5, D); ell(c, 23, 9, 2, 3, '#9a9aa2') // ear
    if (trunkUp) { px(c, 30, 8, 3, 3, G); px(c, 32, 4, 3, 5, G); px(c, 33, 3, 2, 2, D) }
    else { px(c, 30, 12, 3, 4, G); px(c, 31, 16, 3, 6, D); px(c, 31, 21, 3, 1, G) }
    px(c, 29, 14, 4, 1, '#f0ead8'); px(c, 31, 15, 2, 1, '#f0ead8') // tusk
    px(c, 28, 8, '#111111')
    px(c, 4, 10, 1, 6, D) // tail
  }
  const legs = (c: Ctx, xs: number[]) => { for (const x of xs) { px(c, x, 17, 4, 9, D); px(c, x, 25, 4, 1, '#cfcfd0') } }
  return {
    idle: drawn(36, 26, (c) => { body(c, false); legs(c, [7, 12, 19, 24]) }),
    moving: [drawn(36, 26, (c) => { body(c, true); legs(c, [5, 13, 18, 25]) })],
  }
}

// ---- Whispering Marsh ----
WILDLIFE_ART.heron = () => {
  const body = (c: Ctx, neckForward: boolean) => {
    ell(c, 8, 16, 4, 4, '#9aa8b4'); ell(c, 7, 16, 3, 3, '#7a8a98'); px(c, 3, 18, 3, 1, '#5a6a78') // body, wing, tail
    if (neckForward) { px(c, 11, 11, 5, 2, '#e8eef2'); px(c, 15, 9, 3, 2, '#e8eef2'); px(c, 17, 9, 2, 1, '#f0b840') }
    else { px(c, 11, 8, 2, 8, '#e8eef2'); px(c, 12, 5, 3, 3, '#e8eef2'); px(c, 15, 6, 5, 1, '#f0b840'); px(c, 13, 6, '#111111') }
    px(c, 8, 5, 5, 1, '#222222') // head plume
  }
  return {
    idle: drawn(20, 30, (c) => {
      body(c, false)
      px(c, 7, 20, 1, 9, '#c9a050'); px(c, 10, 20, 1, 9, '#c9a050'); px(c, 6, 29, 3, 1, '#c9a050'); px(c, 9, 29, 3, 1, '#c9a050')
    }),
    moving: [
      drawn(20, 30, (c) => {
        body(c, true)
        px(c, 7, 20, 1, 9, '#c9a050'); px(c, 6, 29, 3, 1, '#c9a050')
        px(c, 11, 20, 1, 3, '#c9a050'); px(c, 12, 22, 1, 4, '#c9a050'); px(c, 13, 25, 2, 1, '#c9a050') // raised, stepping leg
      }),
    ],
  }
}
WILDLIFE_ART.firefly = () => ({
  idle: drawn(7, 7, (c) => { ell(c, 3, 3, 2, 2, '#3a5a28'); px(c, 2, 2, 3, 3, '#d8f060'); px(c, 3, 3, '#fffbd0') }),
  moving: [
    drawn(7, 7, (c) => { ell(c, 3, 3, 2, 2, '#3a5a28'); px(c, 2, 2, 3, 3, '#d8f060'); px(c, 3, 3, '#fffbd0') }),
    drawn(7, 7, (c) => { px(c, 3, 3, '#6a8a30') }),
  ],
})


// ---- Skybound Peaks ----
WILDLIFE_ART['peak-goat'] = () => {
  const W = '#f0eee8'
  const S = '#c8c4bc'
  const body = (c: Ctx) => {
    ell(c, 11, 10, 6, 4, W); ell(c, 12, 12, 5, 2, S)
    ell(c, 18, 7, 3, 3, W); px(c, 20, 8, 2, 2, S); px(c, 21, 8, '#222222'); px(c, 18, 6, '#111111')
    px(c, 17, 2, 1, 3, '#5a4a3a'); px(c, 18, 1, 1, 2, '#5a4a3a'); px(c, 20, 2, 1, 3, '#5a4a3a'); px(c, 21, 1, 1, 2, '#5a4a3a') // curved horns
    px(c, 20, 11, 1, 3, W) // beard
    px(c, 4, 8, 2, 2, W)
  }
  return {
    idle: drawn(24, 20, (c) => { body(c); for (const x of [6, 9, 13, 16]) { px(c, x, 13, 2, 6, W); px(c, x, 19, 2, 1, '#3a3028') } }),
    moving: [drawn(24, 20, (c) => { body(c); for (const [x, h] of [[4, 5], [9, 6], [12, 6], [17, 5]]) { px(c, x, 13, 2, h, W); px(c, x, 12 + h, 2, 1, '#3a3028') } })],
  }
}
WILDLIFE_ART['cloud-ray'] = () => {
  const top = '#8ab8e8'
  const edge = '#5a88c0'
  const belly = '#e8f2ff'
  return {
    idle: drawn(30, 14, (c) => {
      ell(c, 15, 7, 13, 3, top); ell(c, 15, 8, 10, 2, belly); ell(c, 15, 6, 6, 2, '#a8d0f4')
      px(c, 3, 6, 4, 1, edge); px(c, 23, 6, 4, 1, edge)
      px(c, 1, 8, 1, 1, '#ffffff'); px(c, 28, 8, 1, 1, '#ffffff')
      px(c, 14, 11, 2, 3, top); px(c, 15, 13, 1, 1, edge) // tail
      px(c, 19, 5, '#111111')
    }),
    moving: [
      drawn(30, 14, (c) => { // wings swept down
        ell(c, 15, 6, 8, 3, top); ell(c, 15, 7, 6, 2, belly)
        px(c, 3, 8, 6, 2, top); px(c, 1, 10, 4, 1, edge); px(c, 21, 8, 6, 2, top); px(c, 25, 10, 4, 1, edge)
        px(c, 14, 10, 2, 3, top); px(c, 19, 5, '#111111')
      }),
      drawn(30, 14, (c) => { // wings swept up
        ell(c, 15, 8, 8, 3, top); ell(c, 15, 9, 6, 2, belly)
        px(c, 3, 4, 6, 2, top); px(c, 1, 2, 4, 1, edge); px(c, 21, 4, 6, 2, top); px(c, 25, 2, 4, 1, edge)
        px(c, 14, 11, 2, 3, top); px(c, 19, 7, '#111111')
      }),
    ],
  }
}

// ---- Enchanted Fairy Forest ----
WILDLIFE_ART.pixie = () => {
  const person = (c: Ctx) => {
    ell(c, 5, 3, 2, 2, '#ffe0c8') // head
    px(c, 3, 1, 5, 2, '#ff8ad8'); px(c, 7, 2, 1, 3, '#ff8ad8') // hair
    px(c, 4, 3, '#111111'); px(c, 6, 3, '#111111')
    px(c, 4, 5, 3, 3, '#7ff0ff'); px(c, 3, 8, 5, 1, '#7ff0ff') // dress
    px(c, 4, 9, 1, 2, '#ffe0c8'); px(c, 6, 9, 1, 2, '#ffe0c8')
  }
  return {
    idle: drawn(11, 12, (c) => {
      ell(c, 5, 6, 5, 5, '#3a4a6a') // soft glow
      person(c)
      px(c, 0, 3, 4, 4, '#dff8ff'); px(c, 7, 3, 4, 4, '#dff8ff'); px(c, 1, 4, 2, 2, '#ffffff'); px(c, 8, 4, 2, 2, '#ffffff')
    }),
    moving: [
      drawn(11, 12, (c) => { ell(c, 5, 6, 5, 5, '#3a4a6a'); person(c); px(c, 0, 3, 4, 4, '#dff8ff'); px(c, 7, 3, 4, 4, '#dff8ff'); px(c, 1, 4, 2, 2, '#ffffff'); px(c, 8, 4, 2, 2, '#ffffff') }),
      drawn(11, 12, (c) => { ell(c, 5, 6, 5, 5, '#3a4a6a'); person(c); px(c, 2, 2, 2, 5, '#dff8ff'); px(c, 7, 2, 2, 5, '#dff8ff') }),
    ],
  }
}
WILDLIFE_ART['luna-moth'] = () => butterflyFrames({ W: '#b8f0c8', w: '#e8fff0', D: '#f0f0d0' })

const wildlifeCache = new Map<string, WildlifeFrames>()
export function wildlifeFrames(id: string): WildlifeFrames {
  let f = wildlifeCache.get(id)
  if (!f) {
    f = (WILDLIFE_ART[id] ?? WILDLIFE_ART.songbird)()
    wildlifeCache.set(id, f)
  }
  return f
}

/** Resting pose, for collection cards and previews. */
export const wildlifeCanvas = (id: string): HTMLCanvasElement => wildlifeFrames(id).idle

const cache = new Map<string, HTMLCanvasElement>()

export function treeCanvas(speciesId: string, stage: GrowthStage): HTMLCanvasElement {
  const key = `${speciesId}:${stage}`
  const hit = cache.get(key)
  if (hit) return hit
  const [canvas, ctx] = makeCanvas(SPRITE_W, SPRITE_H)
  const sp = SPECIES[speciesId] ?? SPECIES.oak
  if (stage === 'seed') drawSeed(ctx, sp.soil)
  else if (stage === 'sprout') drawSprout(ctx, sp.leaf)
  else sp.draw(ctx, SCALE[stage])
  cache.set(key, canvas)
  return canvas
}

export const hasSpeciesSprite = (id: string) => id in SPECIES

// ---------- Ground ----------

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const TILE = 16

/** Portrait is taller than landscape's area so a full-screen phone view has no empty bands; slots are fractional, so trees simply spread. */
export type WorldShape = 'landscape' | 'portrait'

export interface WorldSize {
  w: number
  h: number
  tilesW: number
  tilesH: number
}

export function worldSize(shape: WorldShape): WorldSize {
  const [tilesW, tilesH] = shape === 'portrait' ? [14, 24] : [20, 14]
  return { w: tilesW * TILE, h: tilesH * TILE, tilesW, tilesH }
}

// ---- Terrain ----

import { BIOMES, getBiome, type AreaTheme, type WaterStyle } from '../data/biomes'
import { areaTerrain, bridgePoint, inLand, isOnWaterOrPath, pathYAt, streamXAt, type Terrain } from '../domain/terrain'

type Rgb = [number, number, number]
const shift = (hex: string, [dr, dg, db]: Rgb) => {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, v))
  return `#${[c((n >> 16) + dr), c(((n >> 8) & 255) + dg), c((n & 255) + db)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Extra decorations beyond the common set; each biome's themes choose their own mix. */
interface Extras { drift?: number; spike?: number; twigs?: number; thorn?: number; mound?: number; crack?: number; mud?: number; reeds?: number; glow?: number; crystal?: number; glowflower?: number; lights?: number }

interface ThemeStyle {
  tint: Rgb // shifts the biome's grass palette
  litter: { colors: string[]; count: number; kind: 'dot' | 'needle' | 'petal' }
  rocks: number
  logs: number
  stumps: number
  tufts: number
  mushrooms: number
  rings: number
  ferns: number
  flowers: number
  flowerColors: string[]
  acorns: number
  extra?: Extras
}

const FLOWERS = ['#f4e36b', '#f08fb2', '#ffffff', '#b9a0f0']
const NONE = { colors: [] as string[], count: 0, kind: 'dot' as const }
const base = (o: Partial<ThemeStyle>): ThemeStyle => ({ tint: [0, 0, 0], litter: NONE, rocks: 0, logs: 0, stumps: 0, tufts: 0, mushrooms: 0, rings: 0, ferns: 0, flowers: 0, flowerColors: FLOWERS, acorns: 0, ...o })

/** Each area looks different even though areas share their biome's palette. Adding a theme is one entry here. */
const THEMES: Record<AreaTheme, ThemeStyle> = {
  // Woodland Sanctuary
  clearing: base({ rocks: 3, logs: 1, stumps: 1, tufts: 28, mushrooms: 2, ferns: 6, flowers: 40 }),
  oak: base({ tint: [10, -4, -12], litter: { colors: ['#a8662a', '#c98a3a', '#8a4a1e'], count: 170, kind: 'dot' }, rocks: 3, logs: 2, stumps: 2, tufts: 16, mushrooms: 3, ferns: 4, flowers: 8, flowerColors: ['#f4e36b', '#ffffff'], acorns: 12 }),
  pine: base({ tint: [-12, -6, 6], litter: { colors: ['#8a6a3a', '#6b4f2a', '#a8884e'], count: 220, kind: 'needle' }, rocks: 7, logs: 2, stumps: 1, tufts: 12, mushrooms: 2, ferns: 9, flowers: 4, flowerColors: ['#b9a0f0', '#ffffff'] }),
  blossom: base({ tint: [14, 8, 6], litter: { colors: ['#ffd1e0', '#f08fb2', '#fff0f5'], count: 190, kind: 'petal' }, rocks: 2, logs: 1, stumps: 1, tufts: 24, mushrooms: 1, ferns: 3, flowers: 56, flowerColors: ['#f08fb2', '#ffd1e0', '#ffffff', '#f4e36b'] }),
  ancient: base({ tint: [-18, -8, -14], litter: { colors: ['#3f6e2c', '#2f5e2a', '#4f7e34'], count: 130, kind: 'dot' }, rocks: 5, logs: 3, stumps: 3, tufts: 20, mushrooms: 8, rings: 1, ferns: 16, flowers: 6, flowerColors: ['#8fb8ff', '#b9a0f0'] }),
  // Frozen Tundra
  snowfield: base({ litter: { colors: ['#ffffff', '#cfe6f2'], count: 120, kind: 'petal' }, rocks: 3, tufts: 14, extra: { drift: 10, spike: 3, twigs: 6 } }),
  frostwood: base({ litter: { colors: ['#c9d6dc', '#ffffff'], count: 100, kind: 'needle' }, rocks: 3, logs: 2, stumps: 2, tufts: 8, extra: { drift: 6, twigs: 10, spike: 2 } }),
  glacier: base({ tint: [-8, -4, 4], litter: { colors: ['#ffffff', '#9fd4f0'], count: 100, kind: 'petal' }, rocks: 5, extra: { spike: 9, drift: 5, crack: 6 } }),
  // Golden Savannah
  plains: base({ litter: { colors: ['#a8903f', '#e0c97a', '#b89a48'], count: 160, kind: 'dot' }, rocks: 4, tufts: 40, flowers: 6, flowerColors: ['#f08fb2', '#f4e36b'], extra: { mound: 2, thorn: 4, crack: 6 } }),
  acacia: base({ litter: { colors: ['#8a6a2a', '#c9a050'], count: 130, kind: 'dot' }, rocks: 3, tufts: 30, extra: { thorn: 6, mound: 1, crack: 4 } }),
  baobab: base({ tint: [6, -6, -8], litter: { colors: ['#a0602a', '#c98040'], count: 150, kind: 'dot' }, rocks: 6, tufts: 22, extra: { mound: 3, crack: 10, thorn: 3 } }),
  // Whispering Marsh
  shallows: base({ litter: { colors: ['#3a5a2c', '#2f4a26', '#52743a'], count: 140, kind: 'dot' }, logs: 2, stumps: 1, tufts: 20, mushrooms: 2, ferns: 8, flowers: 10, flowerColors: ['#b9a0f0', '#ffffff', '#f4e36b'], extra: { mud: 6, reeds: 10, glow: 2 } }),
  willowbend: base({ litter: { colors: ['#2f5a3a', '#46703c'], count: 150, kind: 'dot' }, logs: 3, stumps: 2, tufts: 14, mushrooms: 4, ferns: 12, extra: { mud: 5, reeds: 12, glow: 4 } }),
  fen: base({ tint: [-8, -4, -6], litter: { colors: ['#2f5a3a', '#3f6e2c'], count: 150, kind: 'dot' }, logs: 3, stumps: 3, tufts: 12, mushrooms: 5, rings: 1, ferns: 14, extra: { mud: 8, reeds: 14, glow: 8 } }),
  // Skybound Peaks
  terrace: base({ litter: { colors: ['#ffffff', '#e6f2ff'], count: 90, kind: 'petal' }, rocks: 3, tufts: 16, flowers: 16, flowerColors: ['#ffffff', '#bfe8ff', '#f4e36b'], extra: { crystal: 2 } }),
  crystal: base({ tint: [-4, -2, 8], rocks: 4, tufts: 10, flowers: 6, flowerColors: ['#d6f0ff', '#e8d6ff'], extra: { crystal: 9 } }),
  summit: base({ tint: [-10, -4, 4], rocks: 9, tufts: 8, flowers: 4, flowerColors: ['#ffffff'], extra: { crystal: 4, drift: 4 } }),
  // Enchanted Fairy Forest
  glade: base({ litter: { colors: ['#3a6272', '#44707e'], count: 45, kind: 'dot' }, tufts: 20, ferns: 6, extra: { glowflower: 26, lights: 12, glow: 4 } }),
  luminous: base({ tint: [-4, 2, 4], litter: { colors: ['#3f7080', '#4a8290'], count: 55, kind: 'dot' }, tufts: 14, ferns: 8, mushrooms: 2, extra: { glow: 10, glowflower: 18, lights: 16, crystal: 3 } }),
  moonlit: base({ tint: [-6, -4, 10], litter: { colors: ['#55558f', '#6a6aa8'], count: 50, kind: 'petal' }, tufts: 10, rings: 1, extra: { glow: 8, glowflower: 22, lights: 20, crystal: 5 } }),
}

/** Per-biome ground colours and how its water is painted. */
const LOOK: Record<WaterStyle, { blade: [string, string]; shore: string; edge: string; mid: string; hl: string; bank: string; snow: boolean }> = {
  pond: { blade: ['#3f6e2c', '#7fb85a'], shore: '#b9a77a', edge: '#4d8fb0', mid: '#5aa3c6', hl: '#a8d8ee', bank: '#7a6a45', snow: false },
  ice: { blade: ['#b8cbd6', '#ffffff'], shore: '#f4f9fb', edge: '#9ec6da', mid: '#c4e2ef', hl: '#ffffff', bank: '#e8f2f7', snow: true },
  waterhole: { blade: ['#9a7a2a', '#e8cf7a'], shore: '#8a6a3a', edge: '#6a8a93', mid: '#7fa3ad', hl: '#b8d4d8', bank: '#8a6a3a', snow: false },
  marsh: { blade: ['#2a4a30', '#5f9a4a'], shore: '#2f3d24', edge: '#365046', mid: '#44695a', hl: '#8ab8a0', bank: '#2f3d24', snow: false },
  sky: { blade: ['#6fa060', '#c8e8b0'], shore: '#f2f8ff', edge: '#9ed0f0', mid: '#c4e6fa', hl: '#ffffff', bank: '#dfeaf2', snow: false },
  spirit: { blade: ['#223c52', '#35687a'], shore: '#4a4a7a', edge: '#2f6a8a', mid: '#4aa0b8', hl: '#bff8ff', bank: '#4a4a7a', snow: false },
}

function ell(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++) if ((dx * dx) / (rx * rx + 0.5) + (dy * dy) / (ry * ry + 0.5) <= 1) px(ctx, cx + dx, cy + dy, color)
}

function drawRock(ctx: Ctx, x: number, y: number, size: number, snow = false) {
  const rx = 3 + size * 2
  const ry = 2 + size
  ell(ctx, x + 1, y + 1, rx, ry, snow ? '#9fb3c0' : '#2f4a22') // shadow
  ell(ctx, x, y, rx, ry, '#7d827a')
  ell(ctx, x - 1, y - 1, Math.max(1, rx - 2), Math.max(1, ry - 1), '#a4a89e')
  px(ctx, x - rx + 2, y - ry, '#cfd2c8', 2, 1)
  if (snow) {
    ell(ctx, x, y - ry + 1, rx - 1, 1, '#ffffff')
    px(ctx, x - rx + 1, y - ry + 2, '#e6eff5', rx, 1)
  } else px(ctx, x + 1, y - ry + 1, '#5f8a3a', 3, 1) // moss
}

function drawLog(ctx: Ctx, x: number, y: number, len: number, snow = false) {
  px(ctx, x - len / 2 + 1, y + 3, snow ? '#9fb3c0' : '#2f4a22', len, 1) // shadow
  px(ctx, x - len / 2, y - 2, len, 5, '#6b4a2b')
  px(ctx, x - len / 2, y + 2, len, 1, '#4a321c')
  for (let i = 3; i < len - 3; i += 4) px(ctx, x - len / 2 + i, y - 1, 1, 2, '#4a321c') // bark
  ell(ctx, x - len / 2, y, 1, 3, '#c9a46a')
  px(ctx, x - len / 2, y, '#8a6a3a')
  px(ctx, x - len / 2 + 3, y - 3, snow ? '#ffffff' : '#5f8a3a', len - 5, 1) // moss, or snow
  if (snow) px(ctx, x - len / 2 + 2, y - 4, '#ffffff', len - 7, 1)
}

function drawStump(ctx: Ctx, x: number, y: number, snow = false) {
  ell(ctx, x + 1, y + 1, 5, 2, snow ? '#9fb3c0' : '#2f4a22')
  px(ctx, x - 4, y - 5, 8, 6, '#6b4a2b')
  px(ctx, x + 3, y - 5, 1, 6, '#4a321c')
  px(ctx, x - 5, y, 1, 1, '#4a321c')
  px(ctx, x + 4, y, 1, 1, '#4a321c')
  ell(ctx, x, y - 5, 4, 2, snow ? '#ffffff' : '#c9a46a')
  ell(ctx, x, y - 5, 2, 1, snow ? '#e6eff5' : '#a8864e')
  px(ctx, x, y - 5, '#8a6a3a')
}

function drawTuft(ctx: Ctx, x: number, y: number, [dark, light]: [string, string]) {
  px(ctx, x, y - 3, 1, 3, light)
  px(ctx, x - 2, y - 2, 1, 2, dark)
  px(ctx, x + 2, y - 2, 1, 2, light)
  px(ctx, x - 1, y - 1, 1, 1, dark)
}

function drawMushroom(ctx: Ctx, x: number, y: number, big = false) {
  const r = big ? 3 : 2
  px(ctx, x, y - 1, 1, 2, '#efe6d0')
  ell(ctx, x, y - 2, r, 1, '#c8402e')
  px(ctx, x - 1, y - 3, '#ffffff')
  if (big) px(ctx, x + 1, y - 2, '#ffffff')
}

function drawFern(ctx: Ctx, x: number, y: number) {
  px(ctx, x, y + 2, 5, 1, '#2f5e2a')
  px(ctx, x + 1, y + 1, 3, 1, '#438a37')
  px(ctx, x + 2, y, 1, 1, '#6bb552')
}

function drawAcorn(ctx: Ctx, x: number, y: number) {
  px(ctx, x, y, 2, 2, '#8a5a2a')
  px(ctx, x, y - 1, 2, 1, '#5a3a1a')
}

function drawLilyPad(ctx: Ctx, x: number, y: number, flower: boolean, water = '#4d8fb0') {
  ell(ctx, x, y, 3, 2, '#3f8a3a')
  px(ctx, x, y - 2, 1, 2, water) // notch
  px(ctx, x - 1, y - 1, 2, 1, '#6bb552')
  if (flower) {
    px(ctx, x + 1, y, 2, 2, '#f08fb2')
    px(ctx, x + 1, y, '#fff0f5')
  }
}

function drawReed(ctx: Ctx, x: number, y: number, h: number) {
  px(ctx, x, y - h, 1, h, '#6b8a3a')
  px(ctx, x + 1, y - h + 2, 1, h - 2, '#4f6e2a')
  px(ctx, x, y - h - 1, 1, 3, '#6b4a2b') // cattail
}

// ---- biome-specific decorations ----
function drawDrift(ctx: Ctx, x: number, y: number, w: number) {
  ell(ctx, x + 1, y + 1, w, 3, '#c5d6e0')
  ell(ctx, x, y, w, 3, '#e6eff5')
  ell(ctx, x - 2, y - 1, Math.max(2, w - 3), 2, '#ffffff')
}
function drawIceSpike(ctx: Ctx, x: number, y: number, h: number) {
  for (let i = 0; i < h; i++) {
    const w = Math.max(1, Math.round(((h - i) / h) * 4))
    px(ctx, x - Math.floor(w / 2), y - i, w, 1, '#bfe8f8')
    px(ctx, x - Math.floor(w / 2), y - i, 1, 1, '#ffffff')
    px(ctx, x + Math.ceil(w / 2) - 1, y - i, 1, 1, '#8fc8e0')
  }
}
function drawTwigs(ctx: Ctx, x: number, y: number) {
  px(ctx, x, y, 5, 1, '#5a4a38')
  px(ctx, x + 1, y - 1, 1, 1, '#5a4a38')
  px(ctx, x + 3, y - 2, 1, 2, '#5a4a38')
}
function drawThorn(ctx: Ctx, x: number, y: number) {
  ell(ctx, x + 1, y + 1, 5, 2, '#6a5a2a')
  ell(ctx, x, y, 5, 3, '#4f6a2a')
  ell(ctx, x - 1, y - 1, 3, 2, '#6f8a3a')
  for (const dx of [-4, -1, 2, 4]) px(ctx, x + dx, y - 4, 1, 1, '#e8d8a0')
}
function drawMound(ctx: Ctx, x: number, y: number) {
  ell(ctx, x, y, 6, 2, '#8a6a3a')
  for (let i = 0; i < 8; i++) {
    const w = Math.max(2, 8 - i)
    px(ctx, x - Math.floor(w / 2), y - 2 - i, w, 1, '#b89260')
    px(ctx, x + Math.ceil(w / 2) - 1, y - 2 - i, 1, 1, '#8a6a3a')
  }
}
function drawCrack(ctx: Ctx, x: number, y: number) {
  px(ctx, x, y, 3, 1, '#7a5a2a')
  px(ctx, x + 3, y + 1, 3, 1, '#7a5a2a')
  px(ctx, x + 6, y, 2, 1, '#7a5a2a')
  px(ctx, x + 4, y + 2, 1, 2, '#7a5a2a')
}
function drawMud(ctx: Ctx, x: number, y: number) {
  ell(ctx, x, y, 7, 3, '#33331f')
  ell(ctx, x - 1, y - 1, 5, 2, '#44442a')
  px(ctx, x - 3, y - 1, 2, 1, '#5a5a38')
}
function drawGlowShroom(ctx: Ctx, x: number, y: number) {
  ell(ctx, x, y - 2, 4, 3, '#26504e') // soft glow
  px(ctx, x, y - 1, 1, 2, '#cfe8e0')
  ell(ctx, x, y - 2, 2, 1, '#8ff0d0')
  px(ctx, x - 1, y - 3, '#e8fff6')
}
function drawFootprints(ctx: Ctx, x: number, y: number) {
  px(ctx, x, y, 1, 2, '#5a3f22')
  px(ctx, x + 3, y + 1, 1, 2, '#5a3f22')
  px(ctx, x + 6, y, 1, 2, '#5a3f22')
}

function drawCrystal(ctx: Ctx, x: number, y: number, h: number, hue: 'cyan' | 'violet') {
  const [lo, mid, hi] = hue === 'cyan' ? ['#5aa8d8', '#8fd8f8', '#e8fbff'] : ['#8a64c8', '#b890f0', '#f0e4ff']
  ell(ctx, x + 2, y + 1, 5, 2, '#2f4a3a') // shadow
  for (const [dx, hh, w] of [[-4, Math.round(h * 0.6), 3], [0, h, 4], [4, Math.round(h * 0.45), 3]]) {
    for (let i = 0; i < hh; i++) {
      const tip = i > hh - 3
      const ww = tip ? Math.max(1, w - (i - (hh - 3)) - 1) : w
      px(ctx, x + dx - Math.floor(ww / 2), y - i, ww, 1, mid)
      px(ctx, x + dx - Math.floor(ww / 2), y - i, 1, 1, hi)
      px(ctx, x + dx + Math.ceil(ww / 2) - 1, y - i, 1, 1, lo)
    }
  }
}
function drawGlowFlower(ctx: Ctx, x: number, y: number, color: string) {
  px(ctx, x, y, 1, 3, '#2f6a60')
  ell(ctx, x, y - 1, 3, 2, shift(color, [-110, -110, -110])) // soft halo
  px(ctx, x - 1, y - 2, 3, 2, color)
  px(ctx, x, y - 2, '#ffffff')
}
function drawFairyLight(ctx: Ctx, x: number, y: number) {
  px(ctx, x - 1, y, 3, 1, '#6a5a2a')
  px(ctx, x, y - 1, 1, 3, '#6a5a2a')
  px(ctx, x, y, '#fff6b0')
}
function drawCloudPuff(ctx: Ctx, x: number, y: number, s: number) {
  ell(ctx, x, y + 1, 9 * s, 3 * s, '#d4e6f4')
  ell(ctx, x - 4 * s, y - 1, 5 * s, 3 * s, '#ffffff')
  ell(ctx, x + 4 * s, y, 6 * s, 3 * s, '#ffffff')
  ell(ctx, x, y - 2 * s, 5 * s, 3 * s, '#f4faff')
}
/** A small floating islet: a grassy lens on a hanging chunk of rock. */
function drawIslet(ctx: Ctx, x: number, y: number, rx: number, grass: string) {
  for (let dy = 0; dy < 12; dy++) {
    const w = Math.round(rx * (1 - dy / 14))
    px(ctx, x - w, y + 2 + dy, w * 2, 1, dy % 3 === 0 ? '#8a7a68' : '#7a6a58')
  }
  ell(ctx, x, y, rx, 3, grass)
  ell(ctx, x - 1, y - 1, rx - 3, 2, shift(grass, [14, 14, 14]))
}

/**
 * Terrain for one area. Layout (pond, stream, path) comes from the shared terrain model that tree placement
 * and wildlife also read, so everything agrees about where the water is. The biome decides colours and how
 * its water is painted (pond, frozen lake, muddy waterhole, murky marsh); the area theme decides decorations.
 */
export function groundCanvas(
  areaKey: string,
  theme: AreaTheme,
  palette: { grass: string[]; path: string },
  shape: WorldShape = 'landscape',
  biomeId = 'woodland',
): HTMLCanvasElement {
  const { w: W, h: H, tilesW, tilesH } = worldSize(shape)
  const [canvas, ctx] = makeCanvas(W, H)
  const style = THEMES[theme]
  const biome = getBiome(biomeId) ?? BIOMES[0]
  const kind = biome.terrain.water
  const look = LOOK[kind]
  const t: Terrain = areaTerrain(areaKey)
  const rand = mulberry(hashString(`${areaKey}#ground`))
  const grass = palette.grass.map((g) => shift(g, style.tint))
  const blade: [string, string] = [shift(look.blade[0], style.tint), look.blade[1]]
  const extra = style.extra ?? {}
  const snow = look.snow
  const floating = t.floating
  // On a floating island only the island itself is ground. Everything else is open sky.
  const onLand = (x: number, y: number) => !floating || inLand(t, (x + 0.5) / W, (y + 0.5) / H)

  if (floating) {
    // sky: soft vertical bands, drifting clouds, and a couple of distant islets joined by the rope bridge
    const bands = ['#7fc4f2', '#8fd0f8', '#a4daf9', '#b8e3fa', '#cdecfb', '#dff4fd']
    bands.forEach((c, i) => px(ctx, 0, Math.floor((i * H) / bands.length), W, Math.ceil(H / bands.length) + 1, c))
    for (let i = 0; i < 9; i++) drawCloudPuff(ctx, Math.floor(rand() * W), Math.floor(rand() * H), 1 + Math.floor(rand() * 2))
    drawIslet(ctx, 10, Math.round(pathYAt(t, 0.03) * H) - 3, 13, grass[0])
    drawIslet(ctx, W - 10, Math.round(pathYAt(t, 0.97) * H) - 3, 13, grass[1])
  }

  // 1. ground tiles with blade flecks
  const tileCols = Array.from({ length: tilesW * tilesH }, () => grass[Math.floor(rand() * grass.length)])
  if (floating) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (onLand(x, y)) px(ctx, x, y, tileCols[Math.floor(y / TILE) * tilesW + Math.floor(x / TILE)], 1, 1)
    for (let i = 0; i < tilesW * tilesH * 7; i++) {
      const x = Math.floor(rand() * W)
      const y = Math.floor(rand() * H)
      if (onLand(x, y)) px(ctx, x, y, rand() > 0.5 ? blade[0] : blade[1], 1, 2)
    }
    // the island's underside: layered rock that tapers away below the grass, with a few hanging stalactites
    for (let x = 0; x < W; x++) {
      let bottom = -1
      for (let y = H - 1; y >= 0; y--) if (onLand(x, y)) { bottom = y; break }
      if (bottom < 0) continue
      const depth = Math.round(8 + 22 * (1 - Math.abs(x / W - t.land.cx) / t.land.rx) + (rand() > 0.93 ? 8 : 0))
      for (let k = 1; k <= depth; k++) px(ctx, x, bottom + k, 1, 1, k < 3 ? '#a89888' : k % 5 === 0 ? '#6a5a4a' : k % 2 ? '#8a7a68' : '#7a6a58')
      px(ctx, x, bottom, 1, 1, '#9aa070') // grassy lip
    }
  } else {
    for (let ty = 0; ty < tilesH; ty++) {
      for (let tx = 0; tx < tilesW; tx++) {
        px(ctx, tx * TILE, ty * TILE, tileCols[ty * tilesW + tx], TILE, TILE)
        for (let i = 0; i < 7; i++) px(ctx, tx * TILE + Math.floor(rand() * TILE), ty * TILE + Math.floor(rand() * TILE), rand() > 0.5 ? blade[0] : blade[1], 1, 2)
      }
    }
  }

  // 2. themed ground cover: leaf litter, needles, petals, sparkle or dry grass
  for (let i = 0; i < style.litter.count && style.litter.colors.length; i++) {
    const x = Math.floor(rand() * (W - 3))
    const y = Math.floor(rand() * (H - 3))
    if (!onLand(x, y)) continue
    const c = style.litter.colors[Math.floor(rand() * style.litter.colors.length)]
    if (style.litter.kind === 'needle') px(ctx, x, y, 2 + Math.floor(rand() * 2), 1, c)
    else if (style.litter.kind === 'petal') px(ctx, x, y, 2, 1, c)
    else px(ctx, x, y, 2, 2, c)
  }

  const open = (x: number, y: number) => !isOnWaterOrPath(t, x, y, W, H) && x > 8 && y > 12 && x < W - 8 && y < H - 6
  const scatter = (n: number | undefined, draw: (x: number, y: number) => void) => {
    for (let placed = 0, tries = 0; placed < (n ?? 0) && tries < (n ?? 0) * 12; tries++) {
      const x = Math.floor(rand() * W)
      const y = Math.floor(rand() * H)
      if (open(x, y)) {
        draw(x, y)
        placed++
      }
    }
  }

  // 3. ground-level patches that sit under everything else
  scatter(extra.mud, (x, y) => drawMud(ctx, x, y))
  scatter(extra.crack, (x, y) => drawCrack(ctx, x, y))

  // 4. stream (a frozen creek in the tundra, murky in the marsh), from the pond down to the bottom edge
  const pondX = Math.round(t.pond.x * W)
  const pondY = Math.round(t.pond.y * H)
  for (let y = pondY; t.hasStream && y < H; y++) {
    const cx = Math.round(streamXAt(t, y / H) * W)
    if (floating && !onLand(cx, y)) {
      // past the island's edge the stream becomes a waterfall, falling into the clouds below
      px(ctx, cx - 2, y, 5, 1, y % 4 < 2 ? '#e8f6ff' : '#bfe4fa')
      if (rand() > 0.7) px(ctx, cx - 3 + Math.floor(rand() * 6), y, 1, 1, '#ffffff')
      continue
    }
    px(ctx, cx - 3, y, 1, 1, look.bank)
    px(ctx, cx + 3, y, 1, 1, look.bank)
    px(ctx, cx - 2, y, 5, 1, look.edge)
    if (rand() > 0.82) px(ctx, cx - 1 + Math.floor(rand() * 3), y, 1, 1, look.hl)
  }

  // 5. the pond / frozen lake / waterhole / marsh pool, sized by the biome
  const rx = t.pondRx
  const ry = t.pondRy
  ell(ctx, pondX, pondY, rx, ry, look.shore)
  ell(ctx, pondX, pondY, rx - 2, ry - 2, look.edge)
  ell(ctx, pondX, pondY, Math.round(rx * 0.74), Math.round(ry * 0.6), look.mid)
  const f = rx / 30 // scale decorations with the water
  for (const [dx, dy, len] of [[-12, -5, 7], [4, 4, 6], [-3, 8, 4], [14, -2, 4], [-16, 4, 3]]) px(ctx, pondX + Math.round(dx * f), pondY + Math.round(dy * f), look.hl, len, 1)

  // 6. main path (packed snow, dirt, or a plank boardwalk in the marsh), with the bridge over any stream
  for (let x = 0; x < W; x++) {
    const py = Math.round(pathYAt(t, x / W) * H)
    if (floating && !onLand(x, py)) {
      // between islands the path is a rope bridge of planks, strung with rails
      px(ctx, x, py - 2, 1, 5, x % 3 === 0 ? '#7a5a30' : '#a67c4a')
      px(ctx, x, py - 5, 1, 1, '#5a4a3a')
      px(ctx, x, py + 4, 1, 1, '#5a4a3a')
      if (x % 8 === 0) px(ctx, x, py - 5, 1, 10, '#5a4a3a')
      continue
    }
    px(ctx, x, py - 4, 1, 8, palette.path)
    px(ctx, x, py - 4, 1, 1, shift(palette.path, [-30, -30, -30]))
    px(ctx, x, py + 3, 1, 1, shift(palette.path, [-30, -30, -30]))
    if (kind === 'marsh') {
      if (x % 5 === 0) px(ctx, x, py - 4, 1, 8, '#4a3d26') // boardwalk plank seams
    } else {
      if (rand() > 0.9) px(ctx, x, py - 1 + Math.floor(rand() * 3), 1, 1, shift(palette.path, [30, 30, 30]))
      if (rand() > 0.985) px(ctx, x, py + 4, 2, 1, '#7d827a') // pebbles on the verge
    }
  }
  if (t.hasStream) {
    const { x: bx, y: by } = bridgePoint(t, W, H)
    px(ctx, bx - 8, by - 6, 17, 12, '#5a3f22') // rails
    px(ctx, bx - 8, by - 4, 17, 8, '#a67c4a') // deck
    for (let i = -7; i <= 8; i += 3) px(ctx, bx + i, by - 4, 1, 8, '#7a5a30') // plank seams
    px(ctx, bx - 8, by - 6, 17, 1, '#7a5a30')
    px(ctx, bx - 8, by + 5, 17, 1, '#3a2814')
  }

  // 7. decorations, placed only on open ground (clear of water and path)
  scatter(style.ferns, (x, y) => drawFern(ctx, x, y))
  scatter(style.flowers, (x, y) => {
    px(ctx, x, y, style.flowerColors[Math.floor(rand() * style.flowerColors.length)], 2, 2)
    px(ctx, x, y + 2, blade[0], 1, 1)
  })
  scatter(style.tufts, (x, y) => drawTuft(ctx, x, y, blade))
  scatter(style.acorns, (x, y) => drawAcorn(ctx, x, y))
  scatter(style.mushrooms, (x, y) => {
    drawMushroom(ctx, x, y, rand() > 0.6)
    if (rand() > 0.4) drawMushroom(ctx, x + 4, y + 1)
  })
  scatter(style.rings, (cx, cy) => {
    for (let a = 0; a < 7; a++) drawMushroom(ctx, Math.round(cx + Math.cos((a / 7) * Math.PI * 2) * 9), Math.round(cy + Math.sin((a / 7) * Math.PI * 2) * 5))
  })
  scatter(extra.drift, (x, y) => drawDrift(ctx, x, y, 5 + Math.floor(rand() * 5)))
  scatter(extra.mound, (x, y) => drawMound(ctx, x, y))
  scatter(extra.thorn, (x, y) => drawThorn(ctx, x, y))
  scatter(extra.twigs, (x, y) => drawTwigs(ctx, x, y))
  scatter(style.rocks, (x, y) => drawRock(ctx, x, y, Math.floor(rand() * 3), snow))
  scatter(style.logs, (x, y) => drawLog(ctx, x, y, 14 + Math.floor(rand() * 8), snow))
  scatter(style.stumps, (x, y) => drawStump(ctx, x, y, snow))
  scatter(extra.spike, (x, y) => {
    drawIceSpike(ctx, x - 4, y + 1, 6 + Math.floor(rand() * 3))
    drawIceSpike(ctx, x, y, 10 + Math.floor(rand() * 4))
    drawIceSpike(ctx, x + 4, y + 1, 5 + Math.floor(rand() * 3))
  })
  scatter(extra.reeds, (x, y) => {
    for (let i = 0; i < 4; i++) drawReed(ctx, x + i * 2, y + (i % 2), 6 + ((i * 3) % 5))
  })
  scatter(extra.glow, (x, y) => drawGlowShroom(ctx, x, y))
  scatter(extra.crystal, (x, y) => drawCrystal(ctx, x, y, 7 + Math.floor(rand() * 7), rand() > 0.5 ? 'cyan' : 'violet'))
  const glowColors = ['#7ff0ff', '#ff8ad8', '#c8a8ff', '#ffe08a']
  scatter(extra.glowflower, (x, y) => drawGlowFlower(ctx, x, y, glowColors[Math.floor(rand() * glowColors.length)]))
  scatter(extra.lights, (x, y) => drawFairyLight(ctx, x, y))

  // 8. life on and around the water, drawn last so it sits on top
  const side = t.pond.x < 0.5 ? -1 : 1
  if (kind === 'pond') {
    for (const [dx, dy, flower] of [[-14, 2, true], [9, -5, false], [15, 5, true], [-3, 8, false], [-10, -6, false], [2, -1, true], [-18, -3, false]] as const)
      drawLilyPad(ctx, pondX + Math.round(dx * f), pondY + Math.round(dy * f), flower)
    for (let i = 0; i < 8; i++) drawReed(ctx, pondX + side * (-22 + i * 3) + (i % 2), pondY - 15 + (i % 3), 7 + (i % 3) * 2)
    for (let i = 0; i < 5; i++) drawReed(ctx, pondX - side * (20 - i * 5), pondY + 15, 6 + (i % 2) * 2)
  } else if (kind === 'ice') {
    // cracks across the ice, a few shards at the rim
    for (const [dx, dy, len] of [[-14, -2, 9], [-4, 3, 12], [6, -4, 8], [12, 4, 7]]) {
      px(ctx, pondX + Math.round(dx * f), pondY + dy, len, 1, '#8fb8cc')
      px(ctx, pondX + Math.round(dx * f) + len - 2, pondY + dy + 1, 3, 1, '#8fb8cc')
    }
    for (let i = 0; i < 5; i++) drawIceSpike(ctx, pondX + Math.round((-30 + i * 14) * f), pondY + ry - 2 + (i % 2), 4 + (i % 3))
  } else if (kind === 'waterhole') {
    for (let i = 0; i < 4; i++) drawFootprints(ctx, pondX + Math.round((-26 + i * 16) * f), pondY + ry + 2 + (i % 2) * 3)
    for (let i = 0; i < 5; i++) drawReed(ctx, pondX - side * (14 - i * 4), pondY - ry + 2, 5 + (i % 3) * 2)
    px(ctx, pondX - 6, pondY, '#9fbcc0', 6, 1)
  } else if (kind === 'sky') {
    // a pool in the clouds: soft puffs of cloud around the rim and a few ripples
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      drawCloudPuff(ctx, pondX + Math.round(Math.cos(a) * (rx - 2)), pondY + Math.round(Math.sin(a) * (ry - 2)) + 1, 0.7)
    }
    for (let i = 0; i < 3; i++) px(ctx, pondX - 10 + i * 9, pondY - 2 + (i % 2) * 4, '#ffffff', 5, 1)
  } else if (kind === 'spirit') {
    // a glowing pool: bright lily pads, drifting light motes and glowing reeds around the rim
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4
      drawLilyPad(ctx, pondX + Math.round(Math.cos(a) * rx * 0.5), pondY + Math.round(Math.sin(a) * ry * 0.45), i % 2 === 0, look.edge)
    }
    for (let i = 0; i < 22; i++) px(ctx, pondX + Math.round((rand() - 0.5) * (rx * 1.7)), pondY + Math.round((rand() - 0.5) * (ry * 1.6)), '#bff8ff', 1, 1)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      drawGlowFlower(ctx, pondX + Math.round(Math.cos(a) * (rx + 1)), pondY + Math.round(Math.sin(a) * (ry + 1)), glowColors[i % glowColors.length])
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3
      drawLilyPad(ctx, pondX + Math.round(Math.cos(a) * rx * 0.55), pondY + Math.round(Math.sin(a) * ry * 0.5), i % 4 === 0, look.edge)
    }
    for (let i = 0; i < 40; i++) px(ctx, pondX + Math.round((rand() - 0.5) * (rx * 1.6)), pondY + Math.round((rand() - 0.5) * (ry * 1.5)), '#6f9f4a', 2, 1) // duckweed
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      drawReed(ctx, pondX + Math.round(Math.cos(a) * (rx - 1)), pondY + Math.round(Math.sin(a) * (ry - 1)) + 3, 6 + (i % 3) * 2)
    }
  }
  return canvas
}

export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}
