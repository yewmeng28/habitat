import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { plantInstantly } from '../dev/devTools'
import { BIOMES, areaDef, isBiomeUnlocked, unlockedBiomes } from '../data/biomes'
import { ACHIEVEMENTS, WILDLIFE } from '../data/collection'
import { SPECIES } from '../data/species'
import { computeStats, pendingDiscoveries, requirementText, ruleProgress } from '../domain/progress'
import { HabitatDB, db, useDatabase } from './db'
import { completeSession, currentStats, listTrees, startSession } from './focusRepo'
import { listDiscoveries, syncDiscoveries } from './progressRepo'

beforeEach(() => useDatabase(new HabitatDB(`test-${crypto.randomUUID()}`)))

describe('biome data', () => {
  it('has unique ids, rising thresholds, and the planned unlock counts', () => {
    expect(new Set(BIOMES.map((b) => b.id)).size).toBe(BIOMES.length)
    expect(BIOMES.map((b) => b.unlockTrees)).toEqual([0, 15, 35, 60])
    expect(BIOMES.map((b) => b.id)).toEqual(['woodland', 'tundra', 'savannah', 'marsh'])
    for (const b of BIOMES) {
      expect(b.areas.length).toBeGreaterThanOrEqual(3)
      expect(areaDef(b, b.areas.length + 4).capacity).toBeGreaterThan(0) // overflow areas exist
    }
  })
  it('unlocks biomes by total trees, anywhere', () => {
    expect(unlockedBiomes(0).map((b) => b.id)).toEqual(['woodland'])
    expect(isBiomeUnlocked(BIOMES[1], 14)).toBe(false)
    expect(unlockedBiomes(15).map((b) => b.id)).toEqual(['woodland', 'tundra'])
    expect(unlockedBiomes(60)).toHaveLength(4)
  })
  it('gives every biome species, wildlife and an explorer achievement, all referring to real biomes', () => {
    const ids = new Set(BIOMES.map((b) => b.id))
    for (const b of BIOMES) {
      expect(SPECIES.filter((s) => s.biomes.includes(b.id)).length, b.id).toBeGreaterThanOrEqual(3)
      if (b.id !== 'woodland') expect(WILDLIFE.filter((w) => w.biome === b.id), b.id).toHaveLength(3)
    }
    for (const s of SPECIES) s.biomes.forEach((id) => expect(ids.has(id)).toBe(true))
    for (const w of WILDLIFE) expect(ids.has(w.biome)).toBe(true)
    for (const a of ACHIEVEMENTS) if (a.unlock.type === 'biome-trees') expect(ids.has(a.unlock.biomeId)).toBe(true)
  })
  it('writes readable requirements for per-biome rules', () => {
    expect(requirementText({ type: 'biome-trees', biomeId: 'marsh', n: 3 })).toBe('Plant 3 trees in the Whispering Marsh')
  })
})

describe('planting across biomes', () => {
  it('keeps locked biomes closed, and species inside their own biome', async () => {
    await expect(startSession('snowy-pine', 15, 'tundra')).rejects.toThrow(/not unlocked/)
    await expect(startSession('oak', 15, 'tundra')).rejects.toThrow(/cannot be planted/)
    await expect(startSession('snowy-pine', 15, 'woodland')).rejects.toThrow(/cannot be planted/)
    await expect(startSession('oak', 15, 'narnia')).rejects.toThrow()
  })

  it('opens the tundra at 15 trees and plants there, leaving woodland trees where they are', async () => {
    await plantInstantly('oak', 14, 1)
    await expect(startSession('snowy-pine', 15, 'tundra')).rejects.toThrow(/not unlocked/)
    await plantInstantly('oak', 1, 1)
    const s = await startSession('snowy-pine', 15, 'tundra')
    const tree = await completeSession(s.id, Date.now() + 16 * 60_000)
    expect(tree?.biomeId).toBe('tundra')
    expect(tree?.areaId).toBe('tundra:0')
    const all = await listTrees()
    expect(all.filter((t) => t.biomeId === 'woodland')).toHaveLength(15)
    expect(all.filter((t) => t.biomeId === 'tundra')).toHaveLength(1)
  })

  it('fills each biome’s areas independently, with no global limit', async () => {
    await plantInstantly('oak', 15, 1)
    await plantInstantly('snowy-pine', 15, 1, 'tundra') // first tundra area holds 14
    const trees = await listTrees()
    const tundraAreas = new Set(trees.filter((t) => t.biomeId === 'tundra').map((t) => t.areaId))
    expect([...tundraAreas].sort()).toEqual(['tundra:0', 'tundra:1'])
    expect(trees.filter((t) => t.areaId === 'woodland:0')).toHaveLength(12)
  })

  it('unlocks tundra species by trees planted in the tundra, not elsewhere', async () => {
    await plantInstantly('oak', 15, 1)
    await expect(startSession('frost-spruce', 15, 'tundra')).rejects.toThrow(/not unlocked/)
    await plantInstantly('snowy-pine', 3, 1, 'tundra')
    await expect(startSession('frost-spruce', 15, 'tundra')).resolves.toBeTruthy()
  })
})

describe('biome discoveries', () => {
  it('records woodland at once and the tundra when it opens, only once', async () => {
    await syncDiscoveries()
    const first = (await listDiscoveries()).filter((d) => d.kind === 'biome').map((d) => d.itemId)
    expect(first).toEqual(['woodland'])
    await plantInstantly('oak', 15, 1)
    const created = await syncDiscoveries()
    expect(created.filter((d) => d.kind === 'biome').map((d) => d.itemId)).toEqual(['tundra'])
    expect(await syncDiscoveries()).toEqual([])
    const ach = (await listDiscoveries()).map((d) => `${d.kind}:${d.itemId}`)
    expect(ach).not.toContain('achievement:tundra-explorer') // no tree has been planted in the tundra yet
  })
  it('counts per-biome progress and attracts a biome’s wildlife only from that biome', async () => {
    await plantInstantly('oak', 15, 1)
    await plantInstantly('snowy-pine', 1, 1, 'tundra')
    const st = await currentStats()
    expect(st.treesByBiome).toEqual({ woodland: 15, tundra: 1 })
    const have = pendingDiscoveries(st, []).map((d) => `${d.kind}:${d.itemId}`)
    expect(have).toContain('wildlife:snow-hare')
    expect(have).toContain('achievement:tundra-explorer')
    expect(have).not.toContain('wildlife:zebra')
    expect(ruleProgress({ type: 'biome-trees', biomeId: 'tundra', n: 5 }, st)).toEqual({ met: false, current: 1, target: 5 })
    void db
    void computeStats
  })
})
