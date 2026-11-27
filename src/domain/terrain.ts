import { BIOMES, getBiome, parseAreaId } from '../data/biomes'
import { hash, mulberry32 } from './rng'

/**
 * Water and path layout for one area, in normalised (0..1) coordinates and derived from the area id alone.
 * Both the terrain renderer and tree placement read this, so trees never get planted in a pond,
 * across the stream or on the main path, and every device draws the same landscape.
 */
export interface Terrain {
  pond: { x: number; y: number }
  /** Radii of the main water body including its shore, in pixels. Larger in a marsh, smaller at a watering hole. */
  pondRx: number
  pondRy: number
  pathY: number
  pathAmp: number
  phase: number
  /** Only some areas have a stream; chosen from the area id so every device agrees. */
  hasStream: boolean
  /** A floating island (Skybound Peaks): ground only inside an irregular shape, open sky outside it. */
  floating: boolean
  land: { cx: number; cy: number; rx: number; ry: number; wobble: number; phase: number }
}

export function areaTerrain(areaKey: string): Terrain {
  const r = mulberry32(hash(`${areaKey}#terrain`))
  const biome = getBiome(parseAreaId(areaKey).biomeId) ?? BIOMES[0] // unknown keys (e.g. backdrops) use woodland
  const floating = !!biome.terrain.floating
  const left = r() < 0.5
  const pondY = r()
  const t: Terrain = {
    // On a floating island the pond sits well inside the land rather than in a corner
    pond: floating ? { x: left ? 0.34 : 0.66, y: 0.3 + pondY * 0.1 } : { x: left ? 0.2 : 0.8, y: 0.16 + pondY * 0.12 },
    pondRx: biome.terrain.pondRx,
    pondRy: biome.terrain.pondRy,
    pathY: 0.66 + r() * 0.12,
    pathAmp: 0.025 + r() * 0.02,
    phase: r() * Math.PI * 2,
    hasStream: r() < biome.terrain.streamChance,
    floating,
    land: { cx: 0.5, cy: 0.5, rx: 0.42, ry: 0.4, wobble: 0.05, phase: 0 },
  }
  // drawn last, so adding these never moved the pond or path of any existing area
  t.land.rx += r() * 0.03
  t.land.wobble = 0.04 + r() * 0.03
  t.land.phase = r() * Math.PI * 2
  return t
}

/**
 * Whether a normalised point is on the ground. Always true except on a floating island, where it follows a
 * wobbly ellipse. `margin` shrinks the island (as a fraction of its radius) to keep things off the very edge.
 */
export function inLand(t: Terrain, nx: number, ny: number, margin = 0): boolean {
  if (!t.floating) return true
  const dx = (nx - t.land.cx) / t.land.rx
  const dy = (ny - t.land.cy) / t.land.ry
  const ang = Math.atan2(dy, dx)
  const edge = 1 + t.land.wobble * Math.sin(3 * ang + t.land.phase) + t.land.wobble * 0.6 * Math.sin(5 * ang + t.land.phase * 1.7)
  return Math.hypot(dx, dy) < edge - margin
}

export const pathYAt = (t: Terrain, x: number) => t.pathY + Math.sin(x * Math.PI * 2.4 + t.phase) * t.pathAmp
/** The stream leaves the pond and runs down to the bottom edge, meandering. */
export const streamXAt = (t: Terrain, y: number) => t.pond.x + Math.sin((y - t.pond.y) * 8 + t.phase) * 0.035

// Pixel sizes of the drawn features (kept in sync with the renderer in src/game/pixel.ts) and of a tree sprite.
const STREAM_HALF = 4
const CROWN_HALF = 12 // half the visible crown width
const CROWN_UP = 30 // how far the crown rises above the base point
const PATH_HALF = 9
/** World sizes in pixels for each shape; a position must be clear in both, because it is stored once for all devices. */
const WORLDS = [
  { w: 320, h: 224 }, // landscape
  { w: 224, h: 384 }, // portrait
]

/** Trees keep to this band of the height, so the top and bottom bars never cover one. */
export const TREE_MIN_Y = 0.2
export const TREE_MAX_Y = 0.82

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function treeBlockedIn(t: Terrain, nx: number, ny: number, W: number, H: number): boolean {
  if (ny < TREE_MIN_Y || ny > TREE_MAX_Y) return true
  const x = nx * W
  const y = ny * H
  const pondX = t.pond.x * W
  const pondY = t.pond.y * H
  // The whole crown must stay off the water, not just the trunk: nearest point of the crown box to the pond.
  const cx = clamp(pondX, x - CROWN_HALF, x + CROWN_HALF)
  const cy = clamp(pondY, y - CROWN_UP, y)
  if (((cx - pondX) / t.pondRx) ** 2 + ((cy - pondY) / t.pondRy) ** 2 < 1) return true
  for (let yy = y - CROWN_UP; t.hasStream && yy <= y; yy += 3) {
    if (yy > pondY && Math.abs(x - streamXAt(t, yy / H) * W) < CROWN_HALF + STREAM_HALF) return true
  }
  if (t.floating && ![-CROWN_HALF * 0.7, 0, CROWN_HALF * 0.7].every((dx) => inLand(t, (x + dx) / W, y / H, 0.06))) return true // not at the edge of the island
  return Math.abs(y - pathYAt(t, nx) * H) < PATH_HALF // trunks never stand on the main path
}

/** True if a tree planted at this normalised position would stand in or over water, or on the path, in either world shape. */
export function isBlocked(t: Terrain, nx: number, ny: number): boolean {
  return WORLDS.some((d) => treeBlockedIn(t, nx, ny, d.w, d.h))
}

/** Point test for ground decorations, in world pixels. */
export function isOnWaterOrPath(t: Terrain, x: number, y: number, W: number, H: number): boolean {
  if (t.floating && !inLand(t, x / W, y / H, 0.05)) return true // open sky: nothing is placed there
  const pondX = t.pond.x * W
  const pondY = t.pond.y * H
  if (((x - pondX) / (t.pondRx + 3)) ** 2 + ((y - pondY) / (t.pondRy + 3)) ** 2 < 1) return true
  if (t.hasStream && y > pondY && Math.abs(x - streamXAt(t, y / H) * W) < STREAM_HALF + 4) return true
  return Math.abs(y - pathYAt(t, x / W) * H) < 7
}

/**
 * Where to draw a tree whose stored position is blocked, for example one planted before the pond
 * and stream existed. Finds the nearest clear spot. The saved record is never modified.
 */
export function resolvePosition(areaKey: string, pos: { x: number; y: number }): { x: number; y: number } {
  const t = areaTerrain(areaKey)
  if (!isBlocked(t, pos.x, pos.y)) return pos
  for (let r = 0.01; r <= 0.6; r += 0.01) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2
      const x = clamp(pos.x + Math.cos(ang) * r, 0.06, 0.94)
      const y = clamp(pos.y + Math.sin(ang) * r, TREE_MIN_Y, TREE_MAX_Y)
      if (!isBlocked(t, x, y)) return { x, y }
    }
  }
  return pos
}

/** Where the path crosses the stream (and the bridge is drawn), in world pixels. Only meaningful if `hasStream`. */
export function bridgePoint(t: Terrain, W: number, H: number): { x: number; y: number } {
  let bx = Math.round(streamXAt(t, t.pathY) * W)
  const by = Math.round(pathYAt(t, bx / W) * H)
  bx = Math.round(streamXAt(t, by / H) * W)
  return { x: bx, y: by }
}

/** Open water (pond or stream), or open sky beyond a floating island, in world pixels. The bridge deck counts as dry. `margin` widens it. */
export function isInWater(t: Terrain, x: number, y: number, W: number, H: number, margin = 0): boolean {
  if (t.floating && !inLand(t, x / W, y / H, 0.02 + margin * 0.01)) return true // ground animals cannot step off the island
  const pondX = t.pond.x * W
  const pondY = t.pond.y * H
  if (((x - pondX) / (t.pondRx - 2 + margin)) ** 2 + ((y - pondY) / (t.pondRy - 2 + margin)) ** 2 < 1) return true
  if (t.hasStream && y > pondY) {
    const b = bridgePoint(t, W, H)
    if (Math.abs(x - b.x) <= 9 && Math.abs(y - b.y) <= 6) return false
    return Math.abs(x - streamXAt(t, y / H) * W) < 3 + margin
  }
  return false
}
