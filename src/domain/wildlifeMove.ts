import { isInWater, type Terrain } from './terrain'

/**
 * Movement rules for wildlife, kept pure (no Phaser) so they can be tested: ground animals never enter the
 * pond or stream (they cross the stream by the bridge), and frogs stay on the shore. Flyers are unrestricted.
 */
export interface Pt { x: number; y: number }
type Rand = () => number

const MARGIN = 6 // keep clear of the world edge
const WATER_MARGIN = 2 // keep a little distance from the water's edge

export const wet = (t: Terrain, W: number, H: number, p: Pt) => isInWater(t, p.x, p.y, W, H, WATER_MARGIN)

/** True if every sampled point of a hop is dry, so nothing leaps across open water. */
export function dryBetween(t: Terrain, W: number, H: number, a: Pt, b: Pt): boolean {
  for (let i = 1; i <= 6; i++) {
    const f = i / 6
    if (wet(t, W, H, { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })) return false
  }
  return true
}

const clampPt = (W: number, H: number, p: Pt): Pt => ({
  x: Math.min(W - MARGIN, Math.max(MARGIN, p.x)),
  y: Math.min(H - MARGIN, Math.max(MARGIN + 12, p.y)),
})

/** A short hop for a ground animal, or null to stay put this turn. */
export function hopTarget(t: Terrain, W: number, H: number, from: Pt, rand: Rand = Math.random): Pt | null {
  for (let i = 0; i < 10; i++) {
    const ang = rand() * Math.PI * 2
    const to = clampPt(W, H, { x: from.x + Math.cos(ang) * (10 + rand() * 16), y: from.y + Math.sin(ang) * (6 + rand() * 10) })
    if (!wet(t, W, H, to) && dryBetween(t, W, H, from, to)) return to
  }
  return null
}

/** A random dry spot anywhere in the world (used for spawning and as a landing spot). */
export function dryPoint(t: Terrain, W: number, H: number, rand: Rand = Math.random): Pt {
  for (let i = 0; i < 40; i++) {
    const p = clampPt(W, H, { x: rand() * W, y: rand() * H })
    if (!wet(t, W, H, p)) return p
  }
  return { x: W / 2, y: H - 20 } // bottom centre is always dry in practice
}

// Shore ring around the pond: just outside the water, inside the sandy bank.
const SHORE = { rx: 30, ry: 17 }

/** Next spot on the pond's shore for a frog, moving a little around the ring. Always dry. */
export function shoreTarget(t: Terrain, W: number, H: number, angle: number, rand: Rand = Math.random): Pt & { angle: number } {
  for (let i = 0; i < 12; i++) {
    const a = angle + (rand() - 0.5) * 0.9
    const f = 1.04 + rand() * 0.4
    const p = { x: t.pond.x * W + Math.cos(a) * SHORE.rx * f, y: t.pond.y * H + Math.sin(a) * SHORE.ry * f }
    const q = clampPt(W, H, p)
    if (!wet(t, W, H, q) && Math.abs(q.x - p.x) < 1 && Math.abs(q.y - p.y) < 1) return { ...q, angle: a }
  }
  // fall back to the nearest known-dry point on the ring, then to a plain dry point
  const q = { x: t.pond.x * W + Math.cos(angle) * SHORE.rx * 1.3, y: t.pond.y * H + Math.sin(angle) * SHORE.ry * 1.3 }
  return !wet(t, W, H, q) ? { ...clampPt(W, H, q), angle } : { ...dryPoint(t, W, H, rand), angle }
}
