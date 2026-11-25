import { areaDef, areaId, parseAreaId, type BiomeDef } from '../data/biomes'
import type { PlantedTree, TreePosition } from './types'

/** Small deterministic PRNG, so a tree's slot is reproducible from ids alone. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Picks the first area with room. Existing trees are never moved or removed;
 * when every defined area is full a new overflow area is used, so there is no global limit.
 */
export function assignArea(biome: BiomeDef, treesInBiome: PlantedTree[]): { areaId: string; indexInArea: number } {
  const counts = new Map<string, number>()
  for (const t of treesInBiome) counts.set(t.areaId, (counts.get(t.areaId) ?? 0) + 1)
  for (let i = 0; ; i++) {
    const id = areaId(biome.id, i)
    const used = counts.get(id) ?? 0
    if (used < areaDef(biome, i).capacity) return { areaId: id, indexInArea: used }
  }
}

/** World shape (in tiles) used to lay out slots; matches the scene. */
const ASPECT = 20 / 14

/**
 * Deterministic, well-spread position for the nth tree in an area:
 * a shuffled grid with a little jitter, kept inside a margin.
 */
export function slotPosition(id: string, index: number, capacity: number): TreePosition {
  const cols = Math.max(1, Math.ceil(Math.sqrt(capacity * ASPECT)))
  const rows = Math.max(1, Math.ceil(capacity / cols))
  const cells = Array.from({ length: cols * rows }, (_, i) => i)
  const rand = mulberry32(hash(id))
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  const cell = cells[index % cells.length]
  const cx = ((cell % cols) + 0.5) / cols
  const cy = (Math.floor(cell / cols) + 0.5) / rows
  const jr = mulberry32(hash(`${id}#${index}`))
  const jitter = (n: number) => (jr() - 0.5) * 0.5 * n
  const clamp = (v: number) => Math.min(0.94, Math.max(0.06, v))
  return { x: clamp(cx + jitter(1 / cols)), y: clamp(cy + jitter(1 / rows)) }
}

export function treesInArea(trees: PlantedTree[], id: string): PlantedTree[] {
  return trees.filter((t) => t.areaId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Areas that currently exist: every area up to the highest one holding a tree (at least the first). */
export function existingAreaIds(biome: BiomeDef, trees: PlantedTree[]): string[] {
  let highest = 0
  for (const t of trees) {
    const p = parseAreaId(t.areaId)
    if (p.biomeId === biome.id) highest = Math.max(highest, p.index)
  }
  return Array.from({ length: highest + 1 }, (_, i) => areaId(biome.id, i))
}
