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

// ---------- Wildlife ----------

function fromRows(rows: string[], palette: Record<string, string>): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length))
  const [canvas, ctx] = makeCanvas(w, rows.length)
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && palette[ch] && px(ctx, x, y, palette[ch])))
  return canvas
}

const WILDLIFE_SPRITES: Record<string, () => HTMLCanvasElement> = {
  songbird: () =>
    fromRows(
      ['...bbb......', '..bBBBb.....', '..bBEBBK....', '..bBBBBbK...', '.bBBBBBBb...', '.bOOBBBBbb..', '..bOOBBBb.b.', '...bbBBb..b.', '....k..k....'],
      { b: '#2f5a8a', B: '#4a7fb5', E: '#111111', K: '#e0b030', O: '#e8a05a', k: '#6b4a2b' },
    ),
  butterfly: () =>
    fromRows(
      ['WW......WW', 'WWWW.DD.WWWW'.slice(0, 10), 'WwwWDDWwwW', '.WwWDDWwW.', '..WWDDWW..', '..W.DD.W..', '....D.....'],
      { W: '#f2a93b', w: '#fbe08a', D: '#3a2a1a' },
    ),
  'blossom-butterfly': () =>
    fromRows(
      ['WW......WW', 'WWWW.DD.WWWW'.slice(0, 10), 'WwwWDDWwwW', '.WwWDDWwW.', '..WWDDWW..', '..W.DD.W..', '....D.....'],
      { W: '#e87aa8', w: '#ffd6e6', D: '#4a2a3a' },
    ),
  squirrel: () =>
    fromRows(
      ['......tt....', '.....tTTt...', '....tTTTt...', '....tTTt.hh.', '...tTTt.hHHh', '..bBBBBBHHEh', '.bBBBBBBBHHn', '.bBBBBBBBBh.', '..bBwBBBBb..', '..kk..kk....'],
      { t: '#a85a22', T: '#d9803a', b: '#a85a22', B: '#c46a28', h: '#a85a22', H: '#c46a28', E: '#111111', n: '#222222', w: '#f0d9b0', k: '#5a3318' },
    ),
  rabbit: () =>
    fromRows(
      ['..ee.ee.....', '..eE.eE.....', '..eE.eE.....', '...bbbb.....', '..bBBBBb....', '..bBEBBbb...', '.bbBBBBBBb..', 'wbBBBBBBBBb.', '.bBBBBBBBBb.', '..kk...kk...'],
      { e: '#8a7560', E: '#e8b0a8', b: '#8a7560', B: '#b09a82', E2: '#000', w: '#ffffff', k: '#6a5a48' },
    ),
  frog: () =>
    fromRows(
      ['.ee..ee.', 'eEEeeEEe', '.GGGGGG.', 'gGGGGGGg', 'gGGyyGGg', '.gg..gg.'],
      { e: '#3f7a2c', E: '#fff6a8', G: '#5aa83c', g: '#3f7a2c', y: '#a8d878' },
    ),
}

const wildlifeCache = new Map<string, HTMLCanvasElement>()
export function wildlifeCanvas(id: string): HTMLCanvasElement {
  let c = wildlifeCache.get(id)
  if (!c) {
    c = (WILDLIFE_SPRITES[id] ?? WILDLIFE_SPRITES.songbird)()
    wildlifeCache.set(id, c)
  }
  return c
}

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
export const WORLD_TILES_W = 20
export const WORLD_TILES_H = 14
export const WORLD_W = TILE * WORLD_TILES_W
export const WORLD_H = TILE * WORLD_TILES_H

/** Terrain for one area: tiled grass with variation, a winding dirt path, flowers, ferns, a pond. Seeded per area. */
export function groundCanvas(seed: number, palette: { grass: string[]; path: string }): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(WORLD_W, WORLD_H)
  const rand = mulberry(seed)
  for (let ty = 0; ty < WORLD_TILES_H; ty++) {
    for (let tx = 0; tx < WORLD_TILES_W; tx++) {
      const base = palette.grass[Math.floor(rand() * palette.grass.length)]
      px(ctx, tx * TILE, ty * TILE, base, TILE, TILE)
      for (let i = 0; i < 7; i++) {
        const gx = tx * TILE + Math.floor(rand() * TILE)
        const gy = ty * TILE + Math.floor(rand() * TILE)
        px(ctx, gx, gy, rand() > 0.5 ? '#3f6e2c' : '#7fb85a', 1, 2)
      }
    }
  }
  // winding path across the lower third
  let py = Math.round(WORLD_H * (0.6 + rand() * 0.2))
  for (let x = 0; x < WORLD_W; x++) {
    if (x % 9 === 0) py += rand() > 0.5 ? 1 : -1
    py = Math.max(WORLD_H * 0.45, Math.min(WORLD_H * 0.9, py))
    px(ctx, x, py - 4, 1, 8, palette.path)
    px(ctx, x, py - 4, 1, 1, '#8a6738')
    px(ctx, x, py + 3, 1, 1, '#8a6738')
    if (rand() > 0.9) px(ctx, x, py - 1, 1, 1, '#c9a46a')
  }
  // pond in a corner, chosen per area
  const pondX = rand() > 0.5 ? 28 : WORLD_W - 60
  const pondY = 18 + Math.floor(rand() * 16)
  for (let dy = -9; dy <= 9; dy++)
    for (let dx = -16; dx <= 16; dx++) {
      const d = (dx * dx) / 256 + (dy * dy) / 81
      if (d <= 1) px(ctx, pondX + dx, pondY + dy, d > 0.8 ? '#7a6a45' : d > 0.45 ? '#4d8fb0' : '#5aa3c6')
    }
  px(ctx, pondX - 6, pondY - 2, '#a8d8ee', 4, 1)
  px(ctx, pondX + 3, pondY + 3, '#a8d8ee', 3, 1)
  // flowers and ferns
  const flowers = ['#f4e36b', '#f08fb2', '#ffffff', '#b9a0f0']
  for (let i = 0; i < 38; i++) {
    const x = Math.floor(rand() * (WORLD_W - 4)) + 1
    const y = Math.floor(rand() * (WORLD_H - 4)) + 1
    const c = flowers[Math.floor(rand() * flowers.length)]
    px(ctx, x, y, c, 2, 2)
    px(ctx, x, y + 2, '#3f6e2c', 1, 1)
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rand() * (WORLD_W - 8)) + 2
    const y = Math.floor(rand() * (WORLD_H - 8)) + 2
    px(ctx, x, y + 2, '#2f5e2a', 5, 1)
    px(ctx, x + 1, y + 1, '#438a37', 3, 1)
    px(ctx, x + 2, y, '#6bb552', 1, 1)
  }
  return canvas
}

export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}
