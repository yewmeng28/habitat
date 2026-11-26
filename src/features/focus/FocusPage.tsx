import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { TreePreview } from '../../components/TreePreview'
import { BIOMES } from '../../data/biomes'
import { SPECIES, getSpecies } from '../../data/species'
import {
  MAX_MINUTES, MIN_MINUTES, PRESET_MINUTES, formatClock,
  progress, remainingMs, stageForProgress,
} from '../../domain/focus'
import { fromDateKey, toDateKey, todayKey } from '../../domain/dates'
import type { FocusSession, PlantedTree } from '../../domain/types'
import { computeStats, requirementText, ruleProgress } from '../../domain/progress'
import { groundCanvas } from '../../game/pixel'
import { useNow, type AppData } from '../../hooks'
import {
  interruptSession, pauseSession, resumeSession, startSession,
} from '../../persistence/focusRepo'

// One terrain patch, rendered once and reused as the full-screen backdrop.
let groundUrl: string | null = null
function backdrop(): string {
  if (!groundUrl) groundUrl = groundCanvas('focus-backdrop', 'clearing', BIOMES[0].palette, 'landscape').toDataURL()
  return groundUrl
}

/** Keeps the screen awake while a session is running, where the browser supports it. Failure is harmless. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) lock.release().catch(() => {})
      } catch {
        /* denied or unsupported: the timer still works, the screen may just dim */
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}

const treeScaleFor = () => Math.max(4, Math.min(12, Math.floor(Math.min((window.innerHeight * 0.4) / 48, (window.innerWidth * 0.8) / 32))))
function useTreeScale(): number {
  const [scale, setScale] = useState(treeScaleFor)
  useEffect(() => {
    const onResize = () => setScale(treeScaleFor())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

interface RunningProps {
  session: FocusSession
  error: string
  onPause: () => void
  onResume: () => void
  onGiveUp: () => void
  onMinimise: () => void
}

/** Whole-screen focus view: just the growing tree, the time and the controls. */
function RunningSession({ session, error, onPause, onResume, onGiveUp, onMinimise }: RunningProps) {
  const now = useNow(true)
  const paused = session.status === 'paused'
  useWakeLock(!paused)
  const scale = useTreeScale()
  const p = progress(session, now)
  const stage = stageForProgress(p)
  const sp = getSpecies(session.speciesId)
  return (
    <section className="focus-immersive" style={{ backgroundImage: `url(${backdrop()})` }} aria-label="Focus session">
      <div className="focus-shade" />
      <div className="focus-center">
        <TreePreview speciesId={session.speciesId} stage={stage} scale={scale} label={`${sp?.name} ${stage}`} />
        <p className="clock xl" role="timer" aria-live="off">{formatClock(remainingMs(session, now))}</p>
        <p className="focus-sub">{sp?.name} · {stage} · {Math.round(p * 100)}%{paused ? ' · paused' : ''}</p>
        <div className="meter light" aria-hidden="true"><span style={{ width: `${p * 100}%` }} /></div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="focus-controls">
        {paused ? (
          <button className="btn primary big" onClick={onResume}>Resume</button>
        ) : (
          <button className="btn glass big" onClick={onPause}>Pause</button>
        )}
        <button className="btn glass" onClick={onMinimise}>Minimise</button>
        <button className="btn glass danger" onClick={onGiveUp}>Give up</button>
      </div>
    </section>
  )
}

interface FocusPageProps {
  data: AppData
  planted: PlantedTree | null
  onDismissPlanted: () => void
  onMinimise: () => void
}

export function FocusPage({ data, planted, onDismissPlanted, onMinimise }: FocusPageProps) {
  const completed = data.focusSessions.filter((s) => s.status === 'completed')
  const open = data.focusSessions.find((s) => s.status === 'active' || s.status === 'paused')
  const [speciesId, setSpeciesId] = useState('oak')
  const [preset, setPreset] = useState<number>(25)
  const [custom, setCustom] = useState('')
  // What's shown is what's used: a non-empty custom field wins, otherwise the selected preset.
  const minutes = custom.trim() !== '' ? Number(custom) : preset
  const minutesValid = Number.isInteger(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES
  const [error, setError] = useState('')
  const stats = useMemo(
    () => computeStats({ sessions: data.focusSessions, trees: data.plantedTrees, habits: data.habits, completions: data.completions, today: todayKey() }),
    [data.focusSessions, data.plantedTrees, data.habits, data.completions],
  )

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
    return (
      <RunningSession
        session={open}
        error={error}
        onPause={() => run(() => pauseSession(open.id))}
        onResume={() => run(() => resumeSession(open.id))}
        onMinimise={onMinimise}
        onGiveUp={() => {
          if (window.confirm('Give up this session? No tree will be planted, but your other trees are safe.')) run(() => interruptSession(open.id))
        }}
      />
    )
  }

  return (
    <section className="page">
      <h1>Focus</h1>

      {planted && (
        <div className="card planted" role="status">
          <TreePreview speciesId={planted.speciesId} stage="mature" scale={4} />
          <div>
            <h2>A {getSpecies(planted.speciesId)?.name} was planted!</h2>
            <p className="muted">It's now part of your woodland for good.</p>
            <div className="row">
              <Link className="btn primary" to="/habitat">See your woodland</Link>
              <button className="btn" onClick={onDismissPlanted}>Dismiss</button>
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
        <button className="btn primary big" disabled={!minutesValid} onClick={() => { onDismissPlanted(); run(() => startSession(speciesId, minutes)) }}>
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
