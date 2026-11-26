import { describe, expect, it } from 'vitest'
import { BIOMES } from '../data/biomes'
import { elapsedMs, finishTimeMs, isFinished, stageForProgress } from './focus'
import type { PlantedTree } from './types'
import { assignArea, slotPosition } from './woodland'

const start = Date.parse('2026-03-10T10:00:00.000Z')
const session = (over = {}) => ({
  startedAt: new Date(start).toISOString(),
  pausedAt: null as string | null,
  pausedMs: 0,
  endedAt: null as string | null,
  plannedSeconds: 1500,
  ...over,
})

describe('timer maths', () => {
  it('derives elapsed time from timestamps, however long the app was suspended', () => {
    expect(elapsedMs(session(), start + 10 * 60_000)).toBe(10 * 60_000)
    expect(isFinished(session(), start + 25 * 60_000)).toBe(true)
  })
  it('freezes while paused and excludes earlier pauses', () => {
    const paused = session({ pausedAt: new Date(start + 5 * 60_000).toISOString() })
    expect(elapsedMs(paused, start + 60 * 60_000)).toBe(5 * 60_000)
    const resumed = session({ pausedMs: 10 * 60_000 })
    expect(elapsedMs(resumed, start + 20 * 60_000)).toBe(10 * 60_000)
    expect(finishTimeMs(resumed)).toBe(start + 35 * 60_000)
  })
  it('maps progress to growth stages, mature only at the end', () => {
    expect(stageForProgress(0)).toBe('seed')
    expect(stageForProgress(0.3)).toBe('sprout')
    expect(stageForProgress(0.5)).toBe('sapling')
    expect(stageForProgress(0.8)).toBe('young')
    expect(stageForProgress(0.94)).toBe('young')
    expect(stageForProgress(1)).toBe('mature')
  })
})

const woodland = BIOMES[0]
const tree = (areaId: string, i: number): PlantedTree => ({
  id: `t${i}`, userId: null, createdAt: String(i).padStart(4, '0'), updatedAt: '', deletedAt: null,
  speciesId: 'oak', biomeId: 'woodland', areaId, plantedOn: '2026-03-10', growthStage: 'mature',
  position: { x: 0.5, y: 0.5 }, focusSessionId: `s${i}`,
})

describe('woodland placement', () => {
  it('fills the first area, then moves on without a global limit', () => {
    const trees = Array.from({ length: 12 }, (_, i) => tree('woodland:0', i))
    expect(assignArea(woodland, trees.slice(0, 11))).toEqual({ areaId: 'woodland:0', indexInArea: 11 })
    expect(assignArea(woodland, trees).areaId).toBe('woodland:1')
    const many = [
      ...trees,
      ...Array.from({ length: 25 + 25 + 25 + 30 }, (_, i) => tree(`woodland:${1 + (i < 25 ? 0 : i < 50 ? 1 : i < 75 ? 2 : 3)}`, 100 + i)),
    ]
    expect(assignArea(woodland, many).areaId).toBe('woodland:5') // overflow area
  })
  it('gives every tree in an area a distinct, in-bounds, repeatable slot', () => {
    const slots = Array.from({ length: 12 }, (_, i) => slotPosition('woodland:0', i, 12))
    expect(new Set(slots.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)).size).toBe(12)
    for (const p of slots) {
      expect(p.x).toBeGreaterThan(0)
      expect(p.x).toBeLessThan(1)
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(1)
    }
    expect(slotPosition('woodland:0', 3, 12)).toEqual(slots[3])
  })
})

import { areaDef } from '../data/biomes'
import { areaTerrain, isBlocked, pathYAt, streamXAt } from './terrain'

describe('terrain-aware placement', () => {
  it('is deterministic per area and differs between areas', () => {
    expect(areaTerrain('woodland:0')).toEqual(areaTerrain('woodland:0'))
    expect(areaTerrain('woodland:0')).not.toEqual(areaTerrain('woodland:1'))
  })
  it('never plants in the pond, across the stream or on the path, in any biome', () => {
    for (const b of BIOMES)
      for (let a = 0; a < 7; a++) {
        const id = `${b.id}:${a}`
        const t = areaTerrain(id)
        const capacity = areaDef(b, a).capacity
        for (let i = 0; i < capacity; i++) {
          const p = slotPosition(id, i, capacity)
          expect(isBlocked(t, p.x, p.y), `${id}#${i}`).toBe(false)
        }
      }
  })
  it('keeps the stream and path inside the world', () => {
    const t = areaTerrain('woodland:3')
    for (let x = 0; x <= 1; x += 0.05) expect(pathYAt(t, x)).toBeGreaterThan(0.5)
    for (let y = t.pond.y; y <= 1; y += 0.05) {
      expect(streamXAt(t, y)).toBeGreaterThan(0)
      expect(streamXAt(t, y)).toBeLessThan(1)
    }
  })
})

describe('streams are only in some areas', () => {
  it('varies between areas, and is stable for an area', () => {
    const flags = Array.from({ length: 12 }, (_, i) => areaTerrain(`woodland:${i}`).hasStream)
    expect(flags.some(Boolean)).toBe(true)
    expect(flags.some((f) => !f)).toBe(true)
    expect(areaTerrain('woodland:2').hasStream).toBe(areaTerrain('woodland:2').hasStream)
  })
  it('does not shift any area’s pond or path', () => {
    const t = areaTerrain('woodland:0')
    expect(t.pond.x === 0.2 || t.pond.x === 0.8).toBe(true)
  })
  it('follows each biome’s water: bigger in the marsh, no stream on the savannah', () => {
    expect(areaTerrain('marsh:0').pondRx).toBeGreaterThan(areaTerrain('savannah:0').pondRx)
    for (let i = 0; i < 20; i++) expect(areaTerrain(`savannah:${i}`).hasStream).toBe(false)
    expect(Array.from({ length: 20 }, (_, i) => areaTerrain(`marsh:${i}`).hasStream).filter(Boolean).length).toBeGreaterThan(8)
  })
})

describe('trees stay out of the water (independent geometry check)', () => {
  // Re-derives the footprint test by brute-force sampling pixels, not by reusing isBlocked's maths.
  const shapes = [{ w: 320, h: 224 }, { w: 224, h: 384 }]
  const inPond = (t: ReturnType<typeof areaTerrain>, x: number, y: number, W: number, H: number) =>
    ((x - t.pond.x * W) / (t.pondRx - 2)) ** 2 + ((y - t.pond.y * H) / (t.pondRy - 2)) ** 2 < 1
  const inStream = (t: ReturnType<typeof areaTerrain>, x: number, y: number, W: number, H: number) =>
    t.hasStream && y > t.pond.y * H && Math.abs(x - streamXAt(t, y / H) * W) < 3
  it('no sampled crown pixel is over the pond or stream, in either world shape or any biome', () => {
    for (const b of BIOMES)
      for (let a = 0; a < 5; a++) {
        const id = `${b.id}:${a}`
        const t = areaTerrain(id)
        const capacity = areaDef(b, a).capacity
        for (let i = 0; i < capacity; i++) {
          const p = slotPosition(id, i, capacity)
          for (const { w, h } of shapes)
            for (let dx = -10; dx <= 10; dx += 2)
              for (let dy = -28; dy <= 0; dy += 2) {
                const x = p.x * w + dx
                const y = p.y * h + dy
                expect(inPond(t, x, y, w, h) || inStream(t, x, y, w, h), `${id}#${i} ${w}x${h}`).toBe(false)
              }
        }
      }
  })
  it('nudges a tree stored on the pond to clear ground, and leaves a clear one alone', async () => {
    const { resolvePosition } = await import('./terrain')
    const t = areaTerrain('woodland:0')
    const onPond = { x: t.pond.x, y: t.pond.y }
    const moved = resolvePosition('woodland:0', onPond)
    expect(isBlocked(t, moved.x, moved.y)).toBe(false)
    const clear = slotPosition('woodland:0', 2, 12)
    expect(resolvePosition('woodland:0', clear)).toEqual(clear)
  })
})

import { mulberry32 } from './rng'
import { bridgePoint, isInWater } from './terrain'
import { dryBetween, dryPoint, hopTarget, shoreTarget, walkTarget, wet } from './wildlifeMove'

describe('wildlife movement', () => {
  const sizes = [{ w: 320, h: 224 }, { w: 224, h: 384 }]
  const areas = BIOMES.flatMap((b) => Array.from({ length: 6 }, (_, i) => `${b.id}:${i}`))

  it('knows where the water is, and treats the bridge as dry', () => {
    const t = areaTerrain('woodland:0')
    expect(isInWater(t, t.pond.x * 320, t.pond.y * 224, 320, 224)).toBe(true)
    expect(isInWater(t, 160, 215, 320, 224)).toBe(false)
    const withStream = areas.map(areaTerrain).find((x) => x.hasStream)!
    const b = bridgePoint(withStream, 320, 224)
    expect(isInWater(withStream, b.x, b.y, 320, 224)).toBe(false)
    expect(isInWater(withStream, streamXAt(withStream, (b.y + 40) / 224) * 320, b.y + 40, 320, 224)).toBe(true)
  })

  it('ground animals never hop into or across water', () => {
    const rand = mulberry32(7)
    for (const id of areas) {
      const t = areaTerrain(id)
      for (const { w, h } of sizes) {
        let p = dryPoint(t, w, h, rand)
        for (let i = 0; i < 400; i++) {
          expect(wet(t, w, h, p), `${id} ${w}x${h} step ${i}`).toBe(false)
          const to = hopTarget(t, w, h, p, rand)
          if (to) {
            expect(dryBetween(t, w, h, p, to)).toBe(true)
            p = to
          }
        }
      }
    }
  })

  it('big animals take long strides but never into or across water', () => {
    const rand = mulberry32(5)
    for (const id of areas) {
      const t = areaTerrain(id)
      for (const { w, h } of sizes) {
        let p = dryPoint(t, w, h, rand)
        for (let i = 0; i < 300; i++) {
          const to = walkTarget(t, w, h, p, rand)
          if (to) {
            expect(wet(t, w, h, to), `${id} ${w}x${h} step ${i}`).toBe(false)
            expect(dryBetween(t, w, h, p, to)).toBe(true)
            p = to
          }
        }
      }
    }
  })

  it('frogs stay on the shore of the pond, never in the water', () => {
    const rand = mulberry32(11)
    for (const id of areas) {
      const t = areaTerrain(id)
      for (const { w, h } of sizes) {
        let angle = 1
        for (let i = 0; i < 300; i++) {
          const s = shoreTarget(t, w, h, angle, rand)
          angle = s.angle
          expect(wet(t, w, h, s), `${id} ${w}x${h} step ${i}`).toBe(false)
          expect(Math.hypot((s.x - t.pond.x * w) / t.pondRx, (s.y - t.pond.y * h) / t.pondRy)).toBeLessThan(2.2)
        }
      }
    }
  })
})
