import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { areaDef, getBiome, parseAreaId } from '../../data/biomes'
import { getSpecies } from '../../data/species'
import { WILDLIFE } from '../../data/collection'
import { AreaOverview } from './AreaOverview'
import { fromDateKey } from '../../domain/dates'
import { resolvePosition } from '../../domain/terrain'
import { existingAreaIds, treesInArea } from '../../domain/woodland'
import type { AreaView, HabitatGameApi } from '../../game/habitatGame'
import { hashString, type WorldShape } from '../../game/pixel'
import { useIsPhone, type AppData } from '../../hooks'

const BIOME_ID = 'woodland'

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
  const biome = getBiome(BIOME_ID)!
  const shape = useWorldShape()
  const phone = useIsPhone()
  const [sheetOpen, setSheetOpen] = useState(false)
  const trees = useMemo(() => data.plantedTrees.filter((t) => t.biomeId === BIOME_ID), [data.plantedTrees])
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
      theme: areaDef(biome, parseAreaId(areaKey).index).theme,
      seed: hashString(areaKey),
      palette: biome.palette,
      wildlife: WILDLIFE.filter((w) => w.biome === BIOME_ID && discovered.has(w.id)).map((w) => ({
        id: w.id,
        behaviour: w.behaviour,
        count: Math.min(3, 1 + Math.floor(areaTrees.length / 8)),
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
        <div ref={host} className="game-host" aria-label="Your woodland. Drag to pan, scroll or pinch to zoom, tap a tree for details." />
        {phone && (
          <button className="area-chip" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            <strong>{areaName.name}</strong> · {areaTrees.length} tree{areaTrees.length === 1 ? '' : 's'} ▾
          </button>
        )}
        {loadError && <p className="error pad">The woodland could not be loaded.</p>}
        {trees.length === 0 && (
          <div className="game-empty card">
            <p><strong>Your clearing is waiting.</strong></p>
            <p className="muted small">Finish a focus session and your first tree will grow right here.</p>
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
          <h2>Forest overview</h2>
          <AreaOverview biome={biome} areaIds={areaIds} trees={trees} activeId={areaKey} onPick={setPicked} />
        </>
      )}

      {phone && sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="sheet" role="dialog" aria-label="Areas">
            <div className="sheet-head">
              <div>
                <h2>{biome.name}</h2>
                <p className="muted small">{trees.length} tree{trees.length === 1 ? '' : 's'} planted in total</p>
              </div>
              <button className="btn" onClick={() => setSheetOpen(false)} aria-label="Close">✕</button>
            </div>
            <AreaOverview biome={biome} areaIds={areaIds} trees={trees} activeId={areaKey} onPick={(id) => { setPicked(id); setSheetOpen(false) }} />
          </div>
        </>
      )}
    </section>
  )
}
