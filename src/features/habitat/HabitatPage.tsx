import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { areaDef, getBiome, parseAreaId } from '../../data/biomes'
import { getSpecies } from '../../data/species'
import { fromDateKey } from '../../domain/dates'
import { existingAreaIds, treesInArea } from '../../domain/woodland'
import type { AreaView, HabitatGameApi } from '../../game/habitatGame'
import { hashString } from '../../game/pixel'
import type { AppData } from '../../hooks'

const BIOME_ID = 'woodland'

export function HabitatPage({ data }: { data: AppData }) {
  const biome = getBiome(BIOME_ID)!
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

  const areaTrees = useMemo(() => treesInArea(trees, areaKey), [trees, areaKey])
  const view: AreaView = useMemo(
    () => ({
      key: areaKey,
      seed: hashString(areaKey),
      palette: biome.palette,
      trees: areaTrees.map((t) => ({ id: t.id, speciesId: t.speciesId, stage: t.growthStage, x: t.position.x, y: t.position.y })),
    }),
    [areaKey, areaTrees, biome.palette],
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
    <section className="page habitat-page">
      <div className="page-head">
        <div>
          <h1>{biome.name}</h1>
          <p className="muted small">{areaName.name} · {areaTrees.length} tree{areaTrees.length === 1 ? '' : 's'} · {trees.length} in total</p>
        </div>
      </div>

      {areaIds.length > 1 && (
        <div className="chips area-tabs" role="tablist" aria-label="Areas">
          {areaIds.map((id) => (
            <button key={id} role="tab" aria-selected={id === areaKey} className={`chip ${id === areaKey ? 'on' : ''}`} onClick={() => setPicked(id)}>
              {areaDef(biome, parseAreaId(id).index).name}
            </button>
          ))}
        </div>
      )}

      <div className="game-frame">
        <div ref={host} className="game-host" aria-label="Your woodland. Drag to pan, scroll or pinch to zoom, tap a tree for details." />
        {loadError && <p className="error pad">The woodland could not be loaded.</p>}
        {trees.length === 0 && (
          <div className="game-empty card">
            <p><strong>Your clearing is waiting.</strong></p>
            <p className="muted small">Finish a focus session and your first tree will grow right here.</p>
            <Link className="btn primary" to="/focus">Start focusing</Link>
          </div>
        )}
      </div>

      {selected && species && (
        <div className="card" role="status">
          <h2>{species.name}</h2>
          <p className="muted small">{species.description}</p>
          <p className="small">Planted {fromDateKey(selected.plantedOn).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} · {selected.growthStage}</p>
        </div>
      )}
    </section>
  )
}
