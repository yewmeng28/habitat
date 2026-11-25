import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { TreePreview } from '../../components/TreePreview'
import { SPECIES, getSpecies } from '../../data/species'
import {
  MAX_MINUTES, MIN_MINUTES, PRESET_MINUTES, formatClock, isFinished,
  progress, remainingMs, stageForProgress,
} from '../../domain/focus'
import { fromDateKey, toDateKey, todayKey } from '../../domain/dates'
import type { FocusSession } from '../../domain/types'
import { computeStats, requirementText, ruleProgress } from '../../domain/progress'
import type { AppData } from '../../hooks'
import {
  completeSession, interruptSession, pauseSession, resumeSession, settleOpenSession, startSession,
} from '../../persistence/focusRepo'

function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    // The interval only triggers re-renders. Displayed time is always computed from timestamps.
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 500)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [running])
  return now
}

export function FocusPage({ data }: { data: AppData }) {
  const completed = data.focusSessions.filter((s) => s.status === 'completed')
  const open = data.focusSessions.find((s) => s.status === 'active' || s.status === 'paused')
  const [speciesId, setSpeciesId] = useState('oak')
  const [preset, setPreset] = useState<number>(25)
  const [custom, setCustom] = useState('')
  // What's shown is what's used: a non-empty custom field wins, otherwise the selected preset.
  const minutes = custom.trim() !== '' ? Number(custom) : preset
  const minutesValid = Number.isInteger(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES
  const [error, setError] = useState('')
  const [justPlanted, setJustPlanted] = useState<FocusSession | null>(null)
  const now = useNow(!!open)
  const stats = useMemo(
    () => computeStats({ sessions: data.focusSessions, trees: data.plantedTrees, habits: data.habits, completions: data.completions, today: todayKey() }),
    [data.focusSessions, data.plantedTrees, data.habits, data.completions],
  )

  // Finish sessions whose time ran out (including while the app was closed or the phone asleep).
  useEffect(() => {
    if (open && open.status === 'active' && isFinished(open, now)) {
      completeSession(open.id).then((t) => t && setJustPlanted(open)).catch(() => {})
    }
  }, [open, now])
  useEffect(() => {
    settleOpenSession().catch(() => {})
  }, [])

  const run = async (fn: () => Promise<unknown>) => {
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  const history = useMemo(
    () => [...data.focusSessions].filter((s) => s.status === 'completed' || s.status === 'interrupted').sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20),
    [data.focusSessions],
  )
  const totalMinutes = completed.reduce((s, f) => s + f.plannedSeconds / 60, 0)

  if (open) {
    const p = progress(open, now)
    const stage = stageForProgress(p)
    const sp = getSpecies(open.speciesId)
    const paused = open.status === 'paused'
    return (
      <section className="page focus-run">
        <h1>Focus</h1>
        <div className="card focus-card">
          <div className="focus-stage"><TreePreview speciesId={open.speciesId} stage={stage} scale={6} label={`${sp?.name} ${stage}`} /></div>
          <p className="clock" role="timer" aria-live="off">{formatClock(remainingMs(open, now))}</p>
          <p className="muted">{sp?.name} · {stage} · {Math.round(p * 100)}%{paused ? ' · paused' : ''}</p>
          <div className="meter" aria-hidden="true"><span style={{ width: `${p * 100}%` }} /></div>
          <div className="row focus-actions">
            {paused ? (
              <button className="btn primary" onClick={() => run(() => resumeSession(open.id))}>Resume</button>
            ) : (
              <button className="btn" onClick={() => run(() => pauseSession(open.id))}>Pause</button>
            )}
            <button
              className="btn danger"
              onClick={() => {
                if (window.confirm('Give up this session? No tree will be planted, but your other trees are safe.')) run(() => interruptSession(open.id))
              }}
            >
              Give up
            </button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <h1>Focus</h1>

      {justPlanted && (
        <div className="card planted" role="status">
          <TreePreview speciesId={justPlanted.speciesId} stage="mature" scale={4} />
          <div>
            <h2>A {getSpecies(justPlanted.speciesId)?.name} was planted!</h2>
            <p className="muted">It's now part of your woodland for good.</p>
            <div className="row">
              <Link className="btn primary" to="/habitat">See your woodland</Link>
              <button className="btn" onClick={() => setJustPlanted(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div className="card form">
        <h2>Choose a tree</h2>
        <div className="species-grid" role="radiogroup" aria-label="Tree species">
          {SPECIES.map((sp) => {
            const unlocked = ruleProgress(sp.unlock, stats).met
            return (
              <button
                key={sp.id}
                role="radio"
                aria-checked={speciesId === sp.id}
                disabled={!unlocked}
                className={`species ${speciesId === sp.id ? 'on' : ''}`}
                onClick={() => setSpeciesId(sp.id)}
              >
                <TreePreview speciesId={sp.id} stage="mature" scale={2} label={sp.name} />
                <strong>{sp.name}</strong>
                <span className="small muted">{unlocked ? sp.rarity : requirementText(sp.unlock)}</span>
              </button>
            )
          })}
        </div>

        <h2>Duration</h2>
        <div className="chips" role="group" aria-label="Duration">
          {PRESET_MINUTES.map((m) => (
            <button key={m} className={`chip ${minutes === m && custom.trim() === '' ? 'on' : ''}`} aria-pressed={minutes === m && custom.trim() === ''} onClick={() => { setPreset(m); setCustom('') }}>{m} min</button>
          ))}
          <input
            className="mins"
            type="number"
            inputMode="numeric"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            placeholder="Custom"
            aria-label="Custom minutes"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
        {!minutesValid && <p className="error" role="alert">Enter a whole number of minutes from {MIN_MINUTES} to {MAX_MINUTES}.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary big" disabled={!minutesValid} onClick={() => run(() => startSession(speciesId, minutes))}>
          Plant {getSpecies(speciesId)?.name}{minutesValid ? ` · ${minutes} min` : ''}
        </button>
        <p className="muted small">Keep this app open or come back later: the timer follows the clock, not the screen. Giving up plants nothing but never harms the trees you already have.</p>
      </div>

      <div className="tiles">
        <div className="card tile"><span className="tile-value">{completed.length}</span><span className="muted small">Sessions</span></div>
        <div className="card tile"><span className="tile-value">{(totalMinutes / 60).toFixed(1)}</span><span className="muted small">Hours focused</span></div>
        <div className="card tile"><span className="tile-value">{data.plantedTrees.length}</span><span className="muted small">Trees</span></div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <h2>History</h2>
          <ul className="bars">
            {history.map((s) => (
              <li key={s.id} className="history-row">
                <span>{getSpecies(s.speciesId)?.name}</span>
                <span className="muted small">{fromDateKey(toDateKey(new Date(s.startedAt))).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {s.plannedSeconds / 60} min</span>
                <span className={`small ${s.status === 'completed' ? 'ok' : 'muted'}`}>{s.status === 'completed' ? 'Planted' : 'Stopped early'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
