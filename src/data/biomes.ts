export interface AreaDef {
  name: string
  capacity: number // comfortable number of trees; configurable, never a hard cap on the player's total
}

export interface BiomeDef {
  id: string
  name: string
  description: string
  unlockTrees: number // total planted trees required
  /** Areas fill in order. When all are full, overflow areas are generated indefinitely. */
  areas: AreaDef[]
  overflowArea: { namePrefix: string; capacity: number }
  palette: { grass: string[]; path: string; accent: string }
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'woodland',
    name: 'Woodland Sanctuary',
    description: 'A quiet clearing where every focused hour leaves a tree behind.',
    unlockTrees: 0,
    areas: [
      { name: 'Woodland Clearing', capacity: 12 },
      { name: 'Oak Grove', capacity: 25 },
      { name: 'Pine Ridge', capacity: 25 },
      { name: 'Blossom Garden', capacity: 25 },
      { name: 'Ancient Woodland', capacity: 30 },
    ],
    overflowArea: { namePrefix: 'Deep Woods', capacity: 30 },
    palette: {
      grass: ['#5c8a3a', '#639443', '#56833a', '#6a9c48'],
      path: '#a9824f',
      accent: '#e8d36a',
    },
  },
]

export const getBiome = (id: string) => BIOMES.find((b) => b.id === id)

export function areaDef(biome: BiomeDef, index: number): AreaDef {
  if (index < biome.areas.length) return biome.areas[index]
  const n = index - biome.areas.length + 1
  return { name: `${biome.overflowArea.namePrefix} ${n}`, capacity: biome.overflowArea.capacity }
}

export const areaId = (biomeId: string, index: number) => `${biomeId}:${index}`

export function parseAreaId(id: string): { biomeId: string; index: number } {
  const [biomeId, idx] = id.split(':')
  return { biomeId, index: Number(idx) }
}
