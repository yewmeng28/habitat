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
