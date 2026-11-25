import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, WILDLIFE } from '../data/collection'
import { SPECIES } from '../data/species'
import { computeStats, pendingDiscoveries, requirementText, ruleProgress, summarise, type StatsInput } from './progress'
import type { FocusSession, PlantedTree } from './types'

const base = { userId: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '', deletedAt: null }
const session = (i: number, seconds = 1500): FocusSession => ({
  ...base, id: `s${i}`, speciesId: 'oak', biomeId: 'woodland', plannedSeconds: seconds,
  startedAt: '', pausedAt: null, pausedMs: 0, endedAt: '', status: 'completed',
})
const tree = (i: number, speciesId = 'oak', areaId = 'woodland:0'): PlantedTree => ({
  ...base, id: `t${i}`, speciesId, biomeId: 'woodland', areaId, plantedOn: '2026-03-10',
  growthStage: 'mature', position: { x: 0.5, y: 0.5 }, focusSessionId: `s${i}`,
})
const input = (n: number, species = 'oak', seconds = 1500): StatsInput => ({
  sessions: Array.from({ length: n }, (_, i) => session(i, seconds)),
  trees: Array.from({ length: n }, (_, i) => tree(i, species)),
  habits: [], completions: [], today: '2026-03-10',
})

describe('stats and rules', () => {
  it('starts with only Oak', () => {
    const st = computeStats(input(0))
    expect(SPECIES.filter((s) => ruleProgress(s.unlock, st).met).map((s) => s.id)).toEqual(['oak'])
  })
  it('unlocks by sessions, hours, tree counts and species counts', () => {
    const st = computeStats(input(8, 'birch', 3600))
    const met = (id: string) => ruleProgress(SPECIES.find((s) => s.id === id)!.unlock, st).met
    expect(met('pine')).toBe(true) // sessions
    expect(met('willow')).toBe(true) // 8h >= 3h
    expect(met('maple')).toBe(true) // 8 trees
    expect(met('ginkgo')).toBe(true) // 8 birch >= 3
    expect(met('cedar')).toBe(false) // needs 20 sessions
  })
  it('tracks density per area, not across the whole world', () => {
    const trees = [...Array.from({ length: 6 }, (_, i) => tree(i, 'oak', 'woodland:0')), ...Array.from({ length: 6 }, (_, i) => tree(10 + i, 'oak', 'woodland:1'))]
    const st = computeStats({ ...input(0), trees })
    expect(st.maxAreaTrees).toBe(6)
    expect(ruleProgress({ type: 'area-trees', n: 8 }, st).met).toBe(false)
  })
  it('reports capped progress and readable requirements', () => {
    const st = computeStats(input(2))
    expect(ruleProgress({ type: 'sessions', n: 5 }, st)).toEqual({ met: false, current: 2, target: 5 })
    expect(requirementText({ type: 'species-trees', speciesId: 'birch', n: 3 })).toBe('Plant 3 Birch trees')
  })
})

describe('discoveries', () => {
  it('only reports what is new', () => {
    const st = computeStats(input(1))
    const first = pendingDiscoveries(st, [])
    const ids = first.map((d) => `${d.kind}:${d.itemId}`)
    expect(ids).toContain('species:oak')
    expect(ids).toContain('species:pine')
    expect(ids).toContain('wildlife:songbird')
    expect(ids).toContain('achievement:first-tree')
    expect(pendingDiscoveries(st, first)).toEqual([])
  })
  it('summarises points and biodiversity (achievements do not count as species)', () => {
    const s = summarise([{ kind: 'species', points: 10 }, { kind: 'wildlife', points: 15 }, { kind: 'achievement', points: 20 }])
    expect(s).toEqual({ discoveryPoints: 45, biodiversity: 2 })
  })
  it('every content definition has a valid, achievable rule', () => {
    const huge = computeStats({ ...input(60, 'birch', 3600), trees: Array.from({ length: 60 }, (_, i) => tree(i, ['oak', 'cherry-blossom', 'birch'][i % 3])) })
    huge.bestHabitStreak = 7 // streaks come from habits, covered in habits.test.ts
    for (const d of [...SPECIES, ...WILDLIFE, ...ACHIEVEMENTS]) expect(ruleProgress(d.unlock, huge).met, d.id).toBe(true)
  })
})
