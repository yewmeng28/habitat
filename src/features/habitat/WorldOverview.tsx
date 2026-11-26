import { BIOMES, isBiomeUnlocked } from '../../data/biomes'

/**
 * The world at a glance: every biome, with its unlock progress. Unlocked biomes can be opened (and planted in);
 * locked ones show how many more trees they need, counted across every biome you have planted in.
 */
export function WorldOverview({
  totalTrees, treesByBiome, activeId, onPick,
}: { totalTrees: number; treesByBiome: Record<string, number>; activeId: string; onPick: (id: string) => void }) {
  return (
    <div className="world" aria-label="World overview">
      {BIOMES.map((b) => {
        const unlocked = isBiomeUnlocked(b, totalTrees)
        const planted = treesByBiome[b.id] ?? 0
        const left = Math.max(0, b.unlockTrees - totalTrees)
        return (
          <button
            key={b.id}
            className={`world-card ${b.id === activeId ? 'on' : ''} ${unlocked ? '' : 'locked'}`}
            disabled={!unlocked}
            aria-pressed={b.id === activeId}
            onClick={() => onPick(b.id)}
          >
            <span className="world-swatch" aria-hidden="true" style={{ background: `linear-gradient(${b.palette.grass[0]} 0 62%, ${b.palette.path} 62% 74%, ${b.palette.grass[2]} 74%)` }} />
            <span className="world-name">{b.name}</span>
            {unlocked ? (
              <span className="small muted">{planted} tree{planted === 1 ? '' : 's'} planted</span>
            ) : (
              <>
                <span className="small muted">Unlocks at {b.unlockTrees} trees · {left} to go</span>
                <span className="meter slim" aria-hidden="true"><span style={{ width: `${Math.min(100, (totalTrees / b.unlockTrees) * 100)}%` }} /></span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
