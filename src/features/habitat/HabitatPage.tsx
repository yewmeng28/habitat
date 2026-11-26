import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { BIOMES, areaDef, getBiome, parseAreaId, unlockedBiomes } from '../../data/biomes'
import { getSpecies } from '../../data/species'
import { WILDLIFE } from '../../data/collection'
import { AreaOverview } from './AreaOverview'
import { WorldOverview } from './WorldOverview'
import { fromDateKey } from '../../domain/dates'
import { resolvePosition } from '../../domain/terrain'
import { existingAreaIds, treesInArea } from '../../domain/woodland'
import type { AreaView, HabitatGameApi } from '../../game/habitatGame'
import { hashString, type WorldShape } from '../../game/pixel'
import { useIsPhone, useSelectedBiome, type AppData } from '../../hooks'

// Portrait world on tall viewports (phones, portrait tablets), landscape otherwise.
const PORTRAIT_QUERY = '(max-aspect-ratio: 9/10)'
function useWorldShape(): WorldShape {
  const portrait = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PORTRAIT_QUERY)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(PORTRAIT_QUERY).matches,
    () => false,
  )
  return portrait ? 'portrait' : 'landscape'
}

export function HabitatPage({ data }: { data: AppData }) {
  const shape = useWorldShape()
  // Which biome is shown: the last one chosen, else the one you most recently planted in.
  const totalTrees = data.plantedTrees.length
  const unlockedIds = useMemo(() => unlockedBiomes(totalTrees).map((b) => b.id), [totalTrees])
  const lastPlanted = useMemo(() => [...data.plantedTrees].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.biomeId, [data.plantedTrees])
  const [biomeId, selectBiome] = useSelectedBiome(unlockedIds, lastPlanted && unlockedIds.includes(lastPlanted) ? lastPlanted : 'woodland')
  const biome = getBiome(biomeId) ?? BIOMES[0]
  const treesByBiome = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of data.plantedTrees) m[t.biomeId] = (m[t.biomeId] ?? 0) + 1
    return m
  }, [data.plantedTrees])
  const phone = useIsPhone()
  const [sheetOpen, setSheetOpen] = useState(false)
  const trees = useMemo(() => data.plantedTrees.filter((t) => t.biomeId === biome.id), [data.plantedTrees, biome.id])
  const areaIds = useMemo(() => existingAreaIds(biome, trees), [biome, trees])
  const latest = areaIds[areaIds.length - 1]
  const [picked, setPicked] = useState<string | null>(null)
  const areaKey = picked && areaIds.includes(picked) ? picked : latest
  // Selection is tied to the area it was made in, so switching area clears it without an effect.
  const [selection, setSelection] = useState<{ areaKey: string; id: string | null }>({ areaKey: '', id: null })
  const selectedId = selection.areaKey === areaKey ? selection.id : null
  const [loadError, setLoadError] = useState(false)

  const host = useRef<HTMLDivElement>(null)
  const game = useRef<HabitatGameApi | null>(null)
  const areaKeyRef = useRef(areaKey)

  const discovered = useMemo(
    () => new Set(data.discoveries.filter((d) => d.kind === 'wildlife').map((d) => d.itemId)),
    [data.discoveries],
  )
  const areaTrees = useMemo(() => treesInArea(trees, areaKey), [trees, areaKey])
  const view: AreaView = useMemo(
    () => ({
      key: areaKey,
      shape,
      biomeId: biome.id,
      effect: biome.effect,
      theme: areaDef(biome, parseAreaId(areaKey).index).theme,
      seed: hashString(areaKey),
      palette: biome.palette,
      wildlife: WILDLIFE.filter((w) => w.biome === biome.id && discovered.has(w.id)).map((w) => ({
        id: w.id,
        behaviour: w.behaviour,
        count: Math.min(w.behaviour === 'walk' || w.behaviour === 'glide' ? 2 : 3, 1 + Math.floor(areaTrees.length / 8)), // big animals need more room
      })),
      // positions that would sit on water (older trees) are nudged for display only; records are never changed
      trees: areaTrees.map((t) => {
        const p = resolvePosition(areaKey, t.position)
        return { id: t.id, speciesId: t.speciesId, stage: t.growthStage, x: p.x, y: p.y }
      }),
    }),
    [areaKey, shape, areaTrees, biome, discovered],
  )

  // Create the game once (Phaser is loaded lazily so it never slows down the other tabs).
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
    areaKeyRef.current = areaKey
  })
  useEffect(() => {
    let cancelled = false
    import('../../game/habitatGame')
      .then(({ createHabitatGame }) => {
        if (cancelled || !host.current) return
        game.current = createHabitatGame(host.current, { onSelectTree: (id) => setSelection({ areaKey: areaKeyRef.current, id }) })
        game.current.setArea(viewRef.current)
      })
      .catch(() => setLoadError(true))
    return () => {
      cancelled = true
      game.current?.destroy()
      game.current = null
    }
  }, [])

  useEffect(() => {
    game.current?.setArea(view)
  }, [view])

  const selected = areaTrees.find((t) => t.id === selectedId)
  const species = selected ? getSpecies(selected.speciesId) : null
  const areaName = areaDef(biome, parseAreaId(areaKey).index)

  return (
    <section className={phone ? 'habitat-immersive' : 'page habitat-page'}>
      {!phone && (
        <div className="page-head">
          <div>
            <h1>{biome.name}</h1>
            <p className="muted small">{areaName.name} · {areaTrees.length} tree{areaTrees.length === 1 ? '' : 's'} · {trees.length} in total</p>
          </div>
        </div>
      )}

      {/* The same frame and host element are kept in both layouts, so the game is never torn down on resize. */}
      <div className={`game-frame ${phone ? 'full' : shape}`}>
        <div ref={host} className="game-host" aria-label={`${biome.name}. Drag to pan, scroll or pinch to zoom, tap a tree for details.`} />
        {phone && (
          <button className="area-chip" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-label={`${areaName.name}, ${biome.name}. Change area or biome.`}>
            <span className="area-chip-text">
              <strong>{areaName.name}</strong>
              <span className="small muted">{biome.name} · {areaTrees.length} tree{areaTrees.length === 1 ? '' : 's'}</span>
            </span>
            <span className="area-chip-caret" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </button>
        )}
        {loadError && <p className="error pad">The woodland could not be loaded.</p>}
        {trees.length === 0 && (
          <div className="game-empty card">
            <p><strong>{areaName.name} is waiting.</strong></p>
            <p className="muted small">Finish a focus session in {biome.name} and your first tree will grow right here.</p>
            <Link className="btn primary" to="/focus">Start focusing</Link>
          </div>
        )}
        {selected && species && (
          <div className="tree-info card" role="status">
            <strong>{species.name}</strong>
            <span className="small muted"> · planted {fromDateKey(selected.plantedOn).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {selected.growthStage}</span>
            <p className="small muted">{species.description}</p>
          </div>
        )}
      </div>

      {!phone && (
        <>
          <h2>World</h2>
          <WorldOverview totalTrees={totalTrees} treesByBiome={treesByBiome} activeId={biome.id} onPick={selectBiome} />
          <h2>{biome.name}</h2>
          <AreaOverview biome={biome} areaIds={areaIds} trees={trees} activeId={areaKey} onPick={setPicked} />
        </>
      )}

      {phone && sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="sheet" role="dialog" aria-label="Areas">
            <div className="sheet-head">
              <div>
                <h2>World</h2>
                <p className="muted small">{totalTrees} tree{totalTrees === 1 ? '' : 's'} planted in total</p>
              </div>
              <button className="btn" onClick={() => setSheetOpen(false)} aria-label="Close">✕</button>
            </div>
            <WorldOverview totalTrees={totalTrees} treesByBiome={treesByBiome} activeId={biome.id} onPick={selectBiome} />
            <h2 className="sheet-sub">{biome.name}</h2>
            <AreaOverview biome={biome} areaIds={areaIds} trees={trees} activeId={areaKey} onPick={(id) => { setPicked(id); setSheetOpen(false) }} />
          </div>
        </>
      )}
    </section>
  )
}
