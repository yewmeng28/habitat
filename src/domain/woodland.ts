import { areaDef, areaId, parseAreaId, type BiomeDef } from '../data/biomes'
import { hash, mulberry32 } from './rng'
import { areaTerrain, isBlocked } from './terrain'
import type { PlantedTree, TreePosition } from './types'

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

/**
 * Deterministic, well-spread position for the nth tree in an area.
 * Candidate cells of a square grid in normalised space (device-independent, because positions are stored per tree)
 * are filtered to those clear of the pond, stream and path, shuffled by the area id, and the nth is taken
 * with a little jitter. The grid is refined until at least `capacity` clear cells exist.
 */
export function slotPosition(id: string, index: number, capacity: number): TreePosition {
  const terrain = areaTerrain(id)
  let cells: { cx: number; cy: number; w: number; h: number }[] = []
  for (let scale = 1.2; scale <= 3.2; scale += 0.2) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(capacity * scale)))
    const rows = Math.max(1, Math.ceil((capacity * scale) / cols))
    cells = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) / cols
        const cy = (r + 0.5) / rows
        if (!isBlocked(terrain, cx, cy)) cells.push({ cx, cy, w: 1 / cols, h: 1 / rows })
      }
    if (cells.length >= capacity) break
  }
  const rand = mulberry32(hash(id))
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  const cell = cells[index % cells.length]
  const jr = mulberry32(hash(`${id}#${index}`))
  const clamp = (v: number) => Math.min(0.94, Math.max(0.06, v))
  let x = clamp(cell.cx + (jr() - 0.5) * 0.5 * cell.w)
  let y = clamp(cell.cy + (jr() - 0.5) * 0.5 * cell.h)
  if (isBlocked(terrain, x, y)) {
    x = cell.cx
    y = cell.cy
  }
  return { x, y }
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
