import { areaDef, parseAreaId, type BiomeDef } from '../../data/biomes'
import type { PlantedTree } from '../../domain/types'

const COLORS: Record<string, string> = {
  oak: '#438a37', pine: '#1d4a30', birch: '#b4dc7a', maple: '#c9552e',
  'cherry-blossom': '#f08fb2', willow: '#86b04e', ginkgo: '#e0b92e', cedar: '#2f6e68',
}

/**
 * Miniature of every area. Each tree is a single dot, so the whole woodland is visible at a glance
 * without rendering any sprites. Tap an area to open it. The next area is shown as locked.
 */
export function AreaOverview({
  biome, areaIds, trees, activeId, onPick,
}: { biome: BiomeDef; areaIds: string[]; trees: PlantedTree[]; activeId: string; onPick: (id: string) => void }) {
  const last = parseAreaId(areaIds[areaIds.length - 1]).index
  const lastUsed = trees.filter((t) => t.areaId === areaIds[areaIds.length - 1]).length
  const lastCap = areaDef(biome, last).capacity
  const next = areaDef(biome, last + 1)
  return (
    <div className="overview" aria-label="Forest overview">
      {areaIds.map((id) => {
        const def = areaDef(biome, parseAreaId(id).index)
        const here = trees.filter((t) => t.areaId === id)
        return (
          <button key={id} className={`ov-area ${id === activeId ? 'on' : ''}`} onClick={() => onPick(id)} aria-label={`${def.name}, ${here.length} of about ${def.capacity} trees`}>
            <svg viewBox="0 0 100 70" aria-hidden="true">
              <rect width="100" height="70" fill="#5c8a3a" />
              <path d="M0 48 Q25 44 50 49 T100 46" stroke="#a9824f" strokeWidth="5" fill="none" />
              {here.map((t) => (
                <circle key={t.id} cx={6 + t.position.x * 88} cy={8 + t.position.y * 54} r="3.2" fill={COLORS[t.speciesId] ?? '#2f5e2a'} stroke="#12200f" strokeWidth=".6" />
              ))}
            </svg>
            <span className="ov-name">{def.name}</span>
            <span className="small muted">{here.length}/{def.capacity}</span>
          </button>
        )
      })}
      <div className="ov-area locked" aria-label="Next area">
        <svg viewBox="0 0 100 70" aria-hidden="true"><rect width="100" height="70" fill="#3a4636" /></svg>
        <span className="ov-name">{next.name}</span>
        <span className="small muted">{Math.max(0, lastCap - lastUsed)} more tree{lastCap - lastUsed === 1 ? '' : 's'} to open</span>
      </div>
    </div>
  )
}
