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

function butterflyFrames(pal: Record<string, string>): WildlifeFrames {
  const open = ['....D.D....', 'WW...D...WW', 'WWWW.D.WWWW', 'WwwWWDWWwwW', '.WwwWDWwwW.', '..WWWDWWW..', '...WW.D.WW.', '.....D.....']
  const half = ['....D.D....', '.....D.....', '..WW.D.WW..', '..WwWDWwW..', '..WwWDWwW..', '...WWDWW...', '....WDW....', '.....D.....']
  const closed = ['....D.D....', '.....D.....', '.....W.....', '....WwW....', '....WwW....', '....WwW....', '.....W.....', '.....D.....']
  const [o, h, c] = [open, half, closed].map((r) => fromRows(r, pal))
  return { idle: o, moving: [o, h, c, h] }
}

const WILDLIFE_ART: Record<string, () => WildlifeFrames> = {
  songbird: () => ({
    idle: fromRows(BIRD_IDLE, BIRD_PAL),
    moving: [fromRows(BIRD_UP, BIRD_PAL), fromRows(BIRD_MID, BIRD_PAL), fromRows(BIRD_DOWN, BIRD_PAL), fromRows(BIRD_MID, BIRD_PAL)],
  }),
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

  // Crouched with bulging eyes, then legs thrown out mid-hop.
  frog: () => ({
    idle: drawn(12, 9, (c) => {
      ell(c, 6, 6, 4, 2, '#5aa83c'); ell(c, 6, 7, 3, 1, '#a8d878')
      ell(c, 4, 3, 1, 1, '#5aa83c'); ell(c, 8, 3, 1, 1, '#5aa83c')
      px(c, 4, 2, '#fff6a8'); px(c, 8, 2, '#fff6a8'); px(c, 4, 3, '#111111'); px(c, 8, 3, '#111111')
      px(c, 5, 5, 3, 1, '#3f7a2c')
      px(c, 1, 7, 3, 1, '#3f7a2c'); px(c, 8, 7, 3, 1, '#3f7a2c'); px(c, 1, 8, 2, 1, '#3f7a2c'); px(c, 9, 8, 2, 1, '#3f7a2c')
    }),
    moving: [
      drawn(12, 9, (c) => {
        ell(c, 6, 4, 3, 2, '#5aa83c'); ell(c, 6, 5, 2, 1, '#a8d878')
        px(c, 4, 2, '#fff6a8'); px(c, 8, 2, '#fff6a8'); px(c, 4, 3, '#111111'); px(c, 8, 3, '#111111')
        px(c, 0, 5, 4, 1, '#3f7a2c'); px(c, 0, 6, 2, 1, '#3f7a2c') // hind legs trailing
        px(c, 9, 5, 3, 1, '#3f7a2c'); px(c, 10, 6, 2, 1, '#3f7a2c') // forelegs reaching
      }),
    ],
  }),
}

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

import type { AreaTheme } from '../data/biomes'
import { areaTerrain, bridgePoint, isOnWaterOrPath, pathYAt, streamXAt, type Terrain } from '../domain/terrain'

type Rgb = [number, number, number]
const shift = (hex: string, [dr, dg, db]: Rgb) => {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, v))
  return `#${[c((n >> 16) + dr), c(((n >> 8) & 255) + dg), c((n & 255) + db)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

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
}

const FLOWERS = ['#f4e36b', '#f08fb2', '#ffffff', '#b9a0f0']

/** Each area looks different even though all share the biome palette. Adding a theme is one entry here. */
const THEMES: Record<AreaTheme, ThemeStyle> = {
  clearing: { tint: [0, 0, 0], litter: { colors: [], count: 0, kind: 'dot' }, rocks: 3, logs: 1, stumps: 1, tufts: 28, mushrooms: 2, rings: 0, ferns: 6, flowers: 40, flowerColors: FLOWERS, acorns: 0 },
  oak: { tint: [10, -4, -12], litter: { colors: ['#a8662a', '#c98a3a', '#8a4a1e'], count: 170, kind: 'dot' }, rocks: 3, logs: 2, stumps: 2, tufts: 16, mushrooms: 3, rings: 0, ferns: 4, flowers: 8, flowerColors: ['#f4e36b', '#ffffff'], acorns: 12 },
  pine: { tint: [-12, -6, 6], litter: { colors: ['#8a6a3a', '#6b4f2a', '#a8884e'], count: 220, kind: 'needle' }, rocks: 7, logs: 2, stumps: 1, tufts: 12, mushrooms: 2, rings: 0, ferns: 9, flowers: 4, flowerColors: ['#b9a0f0', '#ffffff'], acorns: 0 },
  blossom: { tint: [14, 8, 6], litter: { colors: ['#ffd1e0', '#f08fb2', '#fff0f5'], count: 190, kind: 'petal' }, rocks: 2, logs: 1, stumps: 1, tufts: 24, mushrooms: 1, rings: 0, ferns: 3, flowers: 56, flowerColors: ['#f08fb2', '#ffd1e0', '#ffffff', '#f4e36b'], acorns: 0 },
  ancient: { tint: [-18, -8, -14], litter: { colors: ['#3f6e2c', '#2f5e2a', '#4f7e34'], count: 130, kind: 'dot' }, rocks: 5, logs: 3, stumps: 3, tufts: 20, mushrooms: 8, rings: 1, ferns: 16, flowers: 6, flowerColors: ['#8fb8ff', '#b9a0f0'], acorns: 0 },
}

function ell(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++) if ((dx * dx) / (rx * rx + 0.5) + (dy * dy) / (ry * ry + 0.5) <= 1) px(ctx, cx + dx, cy + dy, color)
}

function drawRock(ctx: Ctx, x: number, y: number, size: number) {
  const rx = 3 + size * 2
  const ry = 2 + size
  ell(ctx, x + 1, y + 1, rx, ry, '#2f4a22') // shadow
  ell(ctx, x, y, rx, ry, '#7d827a')
  ell(ctx, x - 1, y - 1, Math.max(1, rx - 2), Math.max(1, ry - 1), '#a4a89e')
  px(ctx, x - rx + 2, y - ry, '#cfd2c8', 2, 1)
  px(ctx, x + 1, y - ry + 1, '#5f8a3a', 3, 1) // moss
}

function drawLog(ctx: Ctx, x: number, y: number, len: number) {
  px(ctx, x - len / 2 + 1, y + 3, '#2f4a22', len, 1) // shadow
  px(ctx, x - len / 2, y - 2, len, 5, '#6b4a2b')
  px(ctx, x - len / 2, y + 2, len, 1, '#4a321c')
  for (let i = 3; i < len - 3; i += 4) px(ctx, x - len / 2 + i, y - 1, 1, 2, '#4a321c') // bark
  ell(ctx, x - len / 2, y, 1, 3, '#c9a46a')
  px(ctx, x - len / 2, y, '#8a6a3a')
  px(ctx, x - len / 2 + 3, y - 3, '#5f8a3a', 4, 1) // moss
  px(ctx, x + len / 2 - 4, y - 3, '#5f8a3a', 2, 1)
}

function drawStump(ctx: Ctx, x: number, y: number) {
  ell(ctx, x + 1, y + 1, 5, 2, '#2f4a22')
  px(ctx, x - 4, y - 5, 8, 6, '#6b4a2b')
  px(ctx, x + 3, y - 5, 1, 6, '#4a321c')
  px(ctx, x - 5, y, 1, 1, '#4a321c')
  px(ctx, x + 4, y, 1, 1, '#4a321c')
  ell(ctx, x, y - 5, 4, 2, '#c9a46a')
  ell(ctx, x, y - 5, 2, 1, '#a8864e')
  px(ctx, x, y - 5, '#8a6a3a')
}

function drawTuft(ctx: Ctx, x: number, y: number, dark: string) {
  px(ctx, x, y - 3, 1, 3, '#7fb85a')
  px(ctx, x - 2, y - 2, 1, 2, dark)
  px(ctx, x + 2, y - 2, 1, 2, '#7fb85a')
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

function drawLilyPad(ctx: Ctx, x: number, y: number, flower: boolean) {
  ell(ctx, x, y, 3, 2, '#3f8a3a')
  px(ctx, x, y - 2, 1, 2, '#4d8fb0') // notch
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

/**
 * Terrain for one area: themed grass, leaf litter / needles / petals, a stream that runs from the pond and
 * crosses the path under a small bridge, a pond with lily pads and reeds, and scattered logs, rocks, stumps,
 * mushrooms and tufts. All layout comes from the area key, and the pond, stream and path come from the
 * shared terrain model that tree placement also reads, so trees stay out of the water.
 */
export function groundCanvas(
  areaKey: string,
  theme: AreaTheme,
  palette: { grass: string[]; path: string },
  shape: WorldShape = 'landscape',
): HTMLCanvasElement {
  const { w: W, h: H, tilesW, tilesH } = worldSize(shape)
  const [canvas, ctx] = makeCanvas(W, H)
  const style = THEMES[theme]
  const t: Terrain = areaTerrain(areaKey)
  const rand = mulberry(hashString(`${areaKey}#ground`))
  const grass = palette.grass.map((g) => shift(g, style.tint))
  const darkBlade = shift('#3f6e2c', style.tint)

  // 1. grass tiles with blade flecks
  for (let ty = 0; ty < tilesH; ty++) {
    for (let tx = 0; tx < tilesW; tx++) {
      px(ctx, tx * TILE, ty * TILE, grass[Math.floor(rand() * grass.length)], TILE, TILE)
      for (let i = 0; i < 7; i++) {
        px(ctx, tx * TILE + Math.floor(rand() * TILE), ty * TILE + Math.floor(rand() * TILE), rand() > 0.5 ? darkBlade : '#7fb85a', 1, 2)
      }
    }
  }

  // 2. themed ground cover: leaf litter, needles or petals
  for (let i = 0; i < style.litter.count && style.litter.colors.length; i++) {
    const x = Math.floor(rand() * (W - 3))
    const y = Math.floor(rand() * (H - 3))
    const c = style.litter.colors[Math.floor(rand() * style.litter.colors.length)]
    if (style.litter.kind === 'needle') px(ctx, x, y, 2 + Math.floor(rand() * 2), 1, c)
    else if (style.litter.kind === 'petal') px(ctx, x, y, 2, 1, c)
    else px(ctx, x, y, 2, 2, c)
  }

  // 3. stream, from the pond down to the bottom edge
  const pondX = Math.round(t.pond.x * W)
  const pondY = Math.round(t.pond.y * H)
  for (let y = pondY; t.hasStream && y < H; y++) {
    const cx = Math.round(streamXAt(t, y / H) * W)
    px(ctx, cx - 3, y, 1, 1, '#7a6a45')
    px(ctx, cx + 3, y, 1, 1, '#7a6a45')
    px(ctx, cx - 2, y, 5, 1, '#4d8fb0')
    if (rand() > 0.82) px(ctx, cx - 1 + Math.floor(rand() * 3), y, 1, 1, '#a8d8ee')
  }

  // 4. pond with a sandy shore
  ell(ctx, pondX, pondY, 30, 17, '#b9a77a')
  ell(ctx, pondX, pondY, 28, 15, '#4d8fb0')
  ell(ctx, pondX, pondY, 22, 10, '#5aa3c6')
  for (const [dx, dy, len] of [[-12, -5, 7], [4, 4, 6], [-3, 8, 4], [14, -2, 4], [-16, 4, 3]]) px(ctx, pondX + dx, pondY + dy, '#a8d8ee', len, 1)

  // 5. main path, with the bridge where the stream crosses it
  for (let x = 0; x < W; x++) {
    const py = Math.round(pathYAt(t, x / W) * H)
    px(ctx, x, py - 4, 1, 8, palette.path)
    px(ctx, x, py - 4, 1, 1, '#8a6738')
    px(ctx, x, py + 3, 1, 1, '#8a6738')
    if (rand() > 0.9) px(ctx, x, py - 1 + Math.floor(rand() * 3), 1, 1, '#c9a46a')
    if (rand() > 0.985) px(ctx, x, py + 4, 2, 1, '#7d827a') // pebbles on the verge
  }
  if (t.hasStream) {
    const { x: bx, y: by } = bridgePoint(t, W, H)
    px(ctx, bx - 8, by - 6, 17, 12, '#5a3f22') // rails
    px(ctx, bx - 8, by - 4, 17, 8, '#a67c4a') // deck
    for (let i = -7; i <= 8; i += 3) px(ctx, bx + i, by - 4, 1, 8, '#7a5a30') // plank seams
    px(ctx, bx - 8, by - 6, 17, 1, '#7a5a30')
    px(ctx, bx - 8, by + 5, 17, 1, '#3a2814')
  }

  // 6. decorations, placed only on open ground (clear of water and path)
  const open = (x: number, y: number) => !isOnWaterOrPath(t, x, y, W, H) && x > 8 && y > 12 && x < W - 8 && y < H - 6
  const scatter = (n: number, draw: (x: number, y: number) => void) => {
    for (let placed = 0, tries = 0; placed < n && tries < n * 12; tries++) {
      const x = Math.floor(rand() * W)
      const y = Math.floor(rand() * H)
      if (open(x, y)) {
        draw(x, y)
        placed++
      }
    }
  }
  scatter(style.ferns, (x, y) => drawFern(ctx, x, y))
  scatter(style.flowers, (x, y) => {
    px(ctx, x, y, style.flowerColors[Math.floor(rand() * style.flowerColors.length)], 2, 2)
    px(ctx, x, y + 2, darkBlade, 1, 1)
  })
  scatter(style.tufts, (x, y) => drawTuft(ctx, x, y, darkBlade))
  scatter(style.acorns, (x, y) => drawAcorn(ctx, x, y))
  scatter(style.mushrooms, (x, y) => {
    drawMushroom(ctx, x, y, rand() > 0.6)
    if (rand() > 0.4) drawMushroom(ctx, x + 4, y + 1)
  })
  scatter(style.rings, (cx, cy) => {
    for (let a = 0; a < 7; a++) drawMushroom(ctx, Math.round(cx + Math.cos((a / 7) * Math.PI * 2) * 9), Math.round(cy + Math.sin((a / 7) * Math.PI * 2) * 5))
  })
  scatter(style.rocks, (x, y) => drawRock(ctx, x, y, Math.floor(rand() * 3)))
  scatter(style.logs, (x, y) => drawLog(ctx, x, y, 14 + Math.floor(rand() * 8)))
  scatter(style.stumps, (x, y) => drawStump(ctx, x, y))

  // 7. pond life, drawn last so it sits on the water
  for (const [dx, dy, flower] of [[-14, 2, true], [9, -5, false], [15, 5, true], [-3, 8, false], [-10, -6, false], [2, -1, true], [-18, -3, false]] as const) drawLilyPad(ctx, pondX + dx, pondY + dy, flower)
  const side = t.pond.x < 0.5 ? -1 : 1
  for (let i = 0; i < 8; i++) drawReed(ctx, pondX + side * (-22 + i * 3) + (i % 2), pondY - 15 + (i % 3), 7 + (i % 3) * 2)
  for (let i = 0; i < 5; i++) drawReed(ctx, pondX - side * (20 - i * 5), pondY + 15, 6 + (i % 2) * 2)
  return canvas
}

export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}
