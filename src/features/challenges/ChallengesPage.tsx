import { useState } from 'react'
import { DateStepper } from '../../components/DateStepper'
import { addDays, todayKey } from '../../domain/dates'
import { challengeStatus, challengeStreak } from '../../domain/habits'
import type { Challenge, TrackingMode } from '../../domain/types'
import { useToday, type AppData } from '../../hooks'
import { createChallenge, setChallengeArchived, setChallengeValue } from '../../persistence/repo'

const MODE_LABEL: Record<TrackingMode, string> = {
  avoidance: 'Avoidance: did I steer clear today?',
  frequency: 'Frequency: how many times?',
  duration: 'Duration: how many minutes?',
}

function ChallengeForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<TrackingMode>('avoidance')
  const [target, setTarget] = useState(60)
  const [screenTime, setScreenTime] = useState(false)
  const [error, setError] = useState('')

  function toggleScreenTime(on: boolean) {
    setScreenTime(on)
    if (on) {
      setMode('duration')
      if (!name.trim()) setName('Screen Time')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createChallenge({ name, mode, target: mode === 'avoidance' ? null : target, isScreenTime: screenTime })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the challenge.')
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>New challenge</h2>
      <label>
        What would you like to reduce or manage?
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Late-night scrolling" maxLength={60} autoFocus />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={screenTime} onChange={(e) => toggleScreenTime(e.target.checked)} />
        This is Screen Time (I'll enter my daily total by hand)
      </label>
      <label>
        How to track
        <select value={mode} disabled={screenTime} onChange={(e) => setMode(e.target.value as TrackingMode)}>
          {(Object.keys(MODE_LABEL) as TrackingMode[]).map((m) => (
            <option key={m} value={m}>{MODE_LABEL[m]}</option>
          ))}
        </select>
      </label>
      {mode !== 'avoidance' && (
        <label>
          Daily limit ({mode === 'duration' ? 'minutes' : 'times'})
          <input type="number" min={0} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </label>
      )}
      {screenTime && (
        <p className="muted small">
          Habitat can't read Screen Time from your device. Check your phone's own Screen Time and type the total here.
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row end">
        <button type="button" className="btn" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn primary">Save</button>
      </div>
    </form>
  )
}

export function ChallengesPage({ data }: { data: AppData }) {
  const today = useToday()
  const [date, setDate] = useState(todayKey())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})

  const active = data.challenges.filter((c) => !c.archivedAt)
  const archived = data.challenges.filter((c) => c.archivedAt)

  async function run(fn: () => Promise<void>) {
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  function renderChallenge(c: Challenge) {
    const rec = data.challengeRecords.find((r) => r.challengeId === c.id && r.date === date)
    const status = challengeStatus(c, data.challengeRecords, date)
    const streak = challengeStreak(c, data.challengeRecords, today)
    const unit = c.mode === 'duration' ? 'min' : 'times'
    const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
    return (
      <li key={c.id} className={`card habit ${status === 'met' ? 'done' : ''}`}>
        <div className="habit-main">
          <div className="habit-info">
            <h3>{c.name}</h3>
            <p className="muted small">
              {c.mode === 'avoidance' ? 'Avoid today' : `Aim for ${c.target} ${unit} or fewer`}
              {c.isScreenTime && ' · manual entry'}
            </p>
            <p className="small">
              <strong>{streak}</strong> day streak
              {status === 'missed' && <span className="muted"> · a tough day, tomorrow is fresh</span>}
            </p>
          </div>
          {!c.archivedAt && c.mode === 'avoidance' && (
            <div className="seg" role="group" aria-label="Today's result">
              <button className={rec?.value === 1 ? 'on' : ''} aria-pressed={rec?.value === 1} onClick={() => run(() => setChallengeValue(c, date, 1))}>Avoided</button>
              <button className={rec?.value === 0 ? 'on' : ''} aria-pressed={rec?.value === 0} onClick={() => run(() => setChallengeValue(c, date, 0))}>Not today</button>
            </div>
          )}
          {!c.archivedAt && c.mode === 'frequency' && (
            <div className="counter">
              <button className="btn icon" aria-label="Decrease" disabled={!rec || rec.value === 0} onClick={() => run(() => setChallengeValue(c, date, Math.max(0, (rec?.value ?? 0) - 1)))}>−</button>
              <span className="counter-value">{rec?.value ?? '–'}</span>
              <button className="btn icon" aria-label="Increase" onClick={() => run(() => setChallengeValue(c, date, (rec?.value ?? 0) + 1))}>+</button>
            </div>
          )}
          {!c.archivedAt && c.mode === 'duration' && (
            <form
              className="counter"
              onSubmit={(e) => {
                e.preventDefault()
                const raw = draft[c.id]
                if (raw === undefined || raw.trim() === '') return
                run(async () => {
                  await setChallengeValue(c, date, Number(raw))
                  setDraft((d) => {
                    const { [c.id]: _gone, ...rest } = d
                    return rest
                  })
                })
              }}
            >
              <input
                className="mins"
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Minutes for ${c.name}`}
                placeholder={rec ? String(rec.value) : 'min'}
                value={draft[c.id] ?? ''}
                onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })}
              />
              <button className="btn" type="submit">Save</button>
            </form>
          )}
        </div>
        {c.mode === 'duration' && rec && (
          <p className="small">
            {rec.value} / {c.target} min {status === 'met' ? '· within your goal' : '· over your goal'}
          </p>
        )}
        <div className="dots" aria-label="Last 14 days">
          {last14.map((d) => {
            const s = challengeStatus(c, data.challengeRecords, d)
            return <span key={d} title={d} className={`dot ${s === 'met' ? 'on' : s === 'missed' ? 'miss' : ''}`} />
          })}
        </div>
        <div className="row end small-actions">
          <button className="link" onClick={() => run(() => setChallengeArchived(c.id, !c.archivedAt))}>
            {c.archivedAt ? 'Restore' : 'Archive'}
          </button>
        </div>
      </li>
    )
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>Challenges</h1>
        <button className="btn primary" onClick={() => setCreating(true)}>+ New challenge</button>
      </div>
      <p className="muted">Personal goals for things you'd like to reduce. No scores against you, just a record to reflect on.</p>
      {creating && <ChallengeForm onDone={() => setCreating(false)} />}
      <DateStepper date={date} onChange={setDate} />
      {error && <p className="error" role="alert">{error}</p>}
      {active.length === 0 && !creating ? (
        <div className="card empty">
          <p>No challenges yet.</p>
          <p className="muted">Try tracking Screen Time, or pick one behaviour you'd like more control over.</p>
        </div>
      ) : (
        <ul className="list">{active.map(renderChallenge)}</ul>
      )}
      {archived.length > 0 && (
        <>
          <h2>Archived</h2>
          <ul className="list">{archived.map(renderChallenge)}</ul>
        </>
      )}
    </section>
  )
}
