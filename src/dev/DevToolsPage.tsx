import { useState } from 'react'
import { BIOMES } from '../data/biomes'
import { SPECIES } from '../data/species'
import type { AppData } from '../hooks'
import { addEnergy, clearDiscoveries, clearWoodland, finishOpenSession, plantInstantly, wipeEverything } from './devTools'

export default function DevToolsPage({ data }: { data: AppData }) {
  const [biomeId, setBiomeId] = useState('woodland')
  const [species, setSpecies] = useState('oak')
  const [count, setCount] = useState(1)
  const [minutes, setMinutes] = useState(0)
  const [msg, setMsg] = useState('')

  const run = async (label: string, fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    try {
      const r = await fn()
      setMsg(`${label}${typeof r === 'number' ? `: ${r}` : ' done'}`)
    } catch (e) {
      setMsg(`${label} failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  const completed = data.focusSessions.filter((s) => s.status === 'completed').length
  return (
    <section className="page">
      <h1>Dev tools</h1>
      <p className="muted small">Only available in <code>npm run dev</code>. Not included in production builds.</p>
      <div className="card small">
        {data.plantedTrees.length} trees · {completed} completed sessions · {data.ledger.reduce((s, l) => s + l.amount, 0)} NE
      </div>

      <div className="card form">
        <h2>Plant instantly</h2>
        <p className="muted small">Skips unlock checks and the timer, but uses the real completion path (placement, areas, rewards, unlocks by session count).</p>
        <label>Biome
          <select value={biomeId} onChange={(e) => { setBiomeId(e.target.value); setSpecies(SPECIES.find((s) => s.biomes.includes(e.target.value))!.id) }}>
            {BIOMES.map((b) => <option key={b.id} value={b.id}>{b.name} (unlocks at {b.unlockTrees} trees)</option>)}
          </select>
        </label>
        <label>Species
          <select value={species} onChange={(e) => setSpecies(e.target.value)}>
            {SPECIES.filter((s) => s.biomes.includes(biomeId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div className="row">
          <label>How many<input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
          <label>Session minutes (0 allowed)<input type="number" min={0} max={240} value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))} /></label>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => run('Planted', () => plantInstantly(species, Math.max(1, Math.min(200, count)), minutes, biomeId))}>Plant</button>
          {[5, 12, 30].map((n) => <button key={n} className="btn" onClick={() => run('Planted', () => plantInstantly(species, n, minutes, biomeId))}>+{n}</button>)}
        </div>
      </div>

      <div className="card form">
        <h2>Session and rewards</h2>
        <div className="row">
          <button className="btn" onClick={() => run('Finished current session', async () => ((await finishOpenSession()) ? 1 : 0))}>Finish current session now</button>
          <button className="btn" onClick={() => run('Cleared discoveries (they will re-unlock)', clearDiscoveries)}>Reset discoveries</button>
          <button className="btn" onClick={() => run('Added 100 NE', () => addEnergy(100))}>+100 NE</button>
        </div>
      </div>

      <div className="card form">
        <h2>Reset</h2>
        <div className="row">
          <button className="btn danger" onClick={() => run('Cleared woodland', clearWoodland, 'Delete all trees, focus sessions and focus rewards?')}>Clear woodland</button>
          <button className="btn danger" onClick={() => run('Wiped all data', wipeEverything, 'Delete ALL local data (habits, challenges, trees)?')}>Wipe everything</button>
        </div>
      </div>
      {msg && <p role="status" className="ok">{msg}</p>}
    </section>
  )
}
