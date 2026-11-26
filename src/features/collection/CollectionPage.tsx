import { useMemo, useState } from 'react'
import { TreePreview } from '../../components/TreePreview'
import { WildlifePreview } from '../../components/WildlifePreview'
import { BIOMES } from '../../data/biomes'
import { ACHIEVEMENTS, RARE_DISCOVERIES, WILDLIFE } from '../../data/collection'
import { SPECIES } from '../../data/species'
import { todayKey } from '../../domain/dates'
import { computeStats, requirementText, ruleProgress, summarise } from '../../domain/progress'
import type { Discovery, DiscoveryKind, Rule } from '../../domain/types'
import type { AppData } from '../../hooks'

type Tab = 'trees' | 'wildlife' | 'achievements' | 'biomes' | 'rare'

function Card({ name, rarity, description, rule, found, stats, art }: {
  name: string; rarity?: string; description: string; rule: Rule; found?: Discovery
  stats: ReturnType<typeof computeStats>; art: (locked: boolean) => React.ReactNode
}) {
  const p = ruleProgress(rule, stats)
  const locked = !p.met
  return (
    <li className={`card item ${locked ? 'locked' : ''}`}>
      <div className="item-art">{art(locked)}</div>
      <div className="item-body">
        <h3>{locked ? name : name}{rarity && <span className={`rarity ${rarity}`}>{rarity}</span>}</h3>
        <p className="small muted">{locked ? requirementText(rule) : description}</p>
        {locked ? (
          <>
            <div className="meter slim" aria-hidden="true"><span style={{ width: `${(p.current / p.target) * 100}%` }} /></div>
            <p className="small muted">{Math.floor(p.current * 10) / 10} / {p.target}</p>
          </>
        ) : (
          found && <p className="small ok">Discovered {new Date(found.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · +{found.points} DP</p>
        )}
      </div>
    </li>
  )
}

export function CollectionPage({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>('trees')
  const stats = useMemo(
    () => computeStats({ sessions: data.focusSessions, trees: data.plantedTrees, habits: data.habits, completions: data.completions, today: todayKey() }),
    [data.focusSessions, data.plantedTrees, data.habits, data.completions],
  )
  const found = (kind: DiscoveryKind, id: string) => data.discoveries.find((d) => d.kind === kind && d.itemId === id)
  const { discoveryPoints, biodiversity } = summarise(data.discoveries)
  const unlockedSpecies = SPECIES.filter((s) => ruleProgress(s.unlock, stats).met).length
  const foundWildlife = WILDLIFE.filter((w) => ruleProgress(w.unlock, stats).met).length
  const foundAch = ACHIEVEMENTS.filter((a) => ruleProgress(a.unlock, stats).met).length
  const foundRare = RARE_DISCOVERIES.filter((r) => ruleProgress(r.unlock, stats).met).length
  const foundBiomes = BIOMES.filter((b) => stats.trees >= b.unlockTrees).length

  const tabs: [Tab, string, string][] = [
    ['trees', 'Trees', `${unlockedSpecies}/${SPECIES.length}`],
    ['wildlife', 'Wildlife', `${foundWildlife}/${WILDLIFE.length}`],
    ['achievements', 'Achievements', `${foundAch}/${ACHIEVEMENTS.length}`],
    ['biomes', 'Biomes', `${foundBiomes}/${BIOMES.length}`],
    ['rare', 'Rare', `${foundRare}/${RARE_DISCOVERIES.length}`],
  ]

  return (
    <section className="page">
      <h1>Collection</h1>
      <div className="tiles">
        <div className="card tile"><span className="tile-value">{biodiversity}</span><span className="muted small">Biodiversity</span></div>
        <div className="card tile"><span className="tile-value">{discoveryPoints}</span><span className="muted small">Discovery Points</span></div>
        <div className="card tile"><span className="tile-value">{stats.trees}</span><span className="muted small">Trees planted</span></div>
      </div>
      <div className="seg wide" role="tablist" aria-label="Collection">
        {tabs.map(([id, label, count]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label} {count}</button>
        ))}
      </div>

      <ul className="grid-list">
        {tab === 'trees' && BIOMES.flatMap((b) => [
          <li key={`h-${b.id}`} className="grid-heading">{b.name}</li>,
          ...SPECIES.filter((s) => s.biomes[0] === b.id).map((s) => (
            <Card key={s.id} name={s.name} rarity={s.rarity} description={s.description} rule={s.unlock} found={found('species', s.id)} stats={stats}
              art={(locked) => <span className={locked ? 'silhouette' : ''}><TreePreview speciesId={s.id} stage="mature" scale={2} label={s.name} /></span>} />
          )),
        ])}
        {tab === 'wildlife' && BIOMES.flatMap((b) => [
          <li key={`h-${b.id}`} className="grid-heading">{b.name}</li>,
          ...WILDLIFE.filter((w) => w.biome === b.id).map((w) => (
            <Card key={w.id} name={w.name} rarity={w.rarity} description={w.description} rule={w.unlock} found={found('wildlife', w.id)} stats={stats}
              art={(locked) => <span className={locked ? 'silhouette' : ''}><WildlifePreview id={w.id} label={w.name} /></span>} />
          )),
        ])}
        {tab === 'achievements' && ACHIEVEMENTS.map((a) => (
          <Card key={a.id} name={a.name} description={a.description} rule={a.unlock} found={found('achievement', a.id)} stats={stats}
            art={(locked) => <span className={`medal ${locked ? 'off' : ''}`} aria-hidden="true" />} />
        ))}
        {tab === 'rare' && RARE_DISCOVERIES.map((r) => (
          <Card key={r.id} name={r.name} rarity="rare" description={r.description} rule={r.unlock} found={found('rare', r.id)} stats={stats}
            art={(locked) => <span className={`medal rare ${locked ? 'off' : ''}`} aria-hidden="true" />} />
        ))}
        {tab === 'biomes' && BIOMES.map((b) => (
          <Card key={b.id} name={b.name} description={b.description} rule={b.unlockTrees === 0 ? { type: 'always' } : { type: 'trees', n: b.unlockTrees }} found={found('biome', b.id)} stats={stats}
            art={(locked) => (
              <span className="world-swatch big" aria-hidden="true" style={{ background: `linear-gradient(${b.palette.grass[0]} 0 62%, ${b.palette.path} 62% 74%, ${b.palette.grass[2]} 74%)`, opacity: locked ? 0.35 : 1 }} />
            )} />
        ))}
      </ul>
      <p className="muted small">Nothing here can be lost: discoveries stay discovered, and every tree stays in the biome where it was planted.</p>
    </section>
  )
}
