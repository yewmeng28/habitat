import { useState } from 'react'
import { DateStepper } from '../../components/DateStepper'
import { addDays, todayKey } from '../../domain/dates'
import { countsFor, currentStreak, isDayComplete, isScheduledOn, longestStreak } from '../../domain/habits'
import type { Habit } from '../../domain/types'
import { useToday, type AppData } from '../../hooks'
import { setCompletionCount, setHabitArchived } from '../../persistence/repo'
import { HabitForm } from './HabitForm'

function scheduleText(h: Habit): string {
  const s = h.schedule
  if (s.type === 'daily') return 'Every day'
  if (s.type === 'weekly') return `${s.timesPerWeek}× per week`
  return s.days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
}

export function GrowthPage({ data }: { data: AppData }) {
  const today = useToday()
  const [date, setDate] = useState(todayKey())
  const [editing, setEditing] = useState<Habit | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [actionError, setActionError] = useState('')

  const active = data.habits.filter((h) => !h.archivedAt)
  const archived = data.habits.filter((h) => h.archivedAt)
  const visible = active.filter((h) => isScheduledOn(h, date) && h.createdAt.slice(0, 10) <= date)
  const other = active.filter((h) => !visible.includes(h))

  async function run(fn: () => Promise<void>) {
    setActionError('')
    try {
      await fn()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  function renderHabit(h: Habit, interactive: boolean) {
    const counts = countsFor(h.id, data.completions)
    const count = counts.get(date) ?? 0
    const complete = isDayComplete(h, counts, date)
    const streak = currentStreak(h, counts, today, data.weekStartsOn)
    const best = longestStreak(h, counts, today)
    const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
    return (
      <li key={h.id} className={`card habit ${complete ? 'done' : ''}`}>
        <div className="habit-main">
          <div className="habit-info">
            <h3>{h.name}</h3>
            <p className="muted small">
              {scheduleText(h)} · {h.targetPerDay > 1 ? `${h.targetPerDay} ${h.unit}` : 'once'} · +{h.rewardNE} NE
            </p>
            <p className="small">
              <strong>{streak}</strong> {h.schedule.type === 'weekly' ? 'week' : 'day'} streak
              <span className="muted"> · best {best}</span>
            </p>
          </div>
          {interactive &&
            (h.targetPerDay === 1 ? (
              <button
                className={`check ${complete ? 'on' : ''}`}
                aria-pressed={complete}
                aria-label={`${complete ? 'Undo' : 'Complete'} ${h.name}`}
                onClick={() => run(() => setCompletionCount(h, date, complete ? 0 : 1))}
              >
                {complete ? '✓' : ''}
              </button>
            ) : (
              <div className="counter">
                <button className="btn icon" aria-label="Decrease" disabled={count === 0} onClick={() => run(() => setCompletionCount(h, date, count - 1))}>−</button>
                <span className="counter-value">{count}/{h.targetPerDay}</span>
                <button className="btn icon" aria-label="Increase" onClick={() => run(() => setCompletionCount(h, date, count + 1))}>+</button>
              </div>
            ))}
        </div>
        <div className="dots" aria-label="Last 14 days">
          {last14.map((d) => (
            <span
              key={d}
              title={d}
              className={`dot ${isDayComplete(h, counts, d) ? 'on' : ''} ${!isScheduledOn(h, d) ? 'off' : ''}`}
            />
          ))}
        </div>
        <div className="row end small-actions">
          <button className="link" onClick={() => setEditing(h)}>Edit</button>
          <button className="link" onClick={() => run(() => setHabitArchived(h.id, !h.archivedAt))}>
            {h.archivedAt ? 'Restore' : 'Archive'}
          </button>
        </div>
      </li>
    )
  }

  const doneCount = visible.filter((h) => isDayComplete(h, countsFor(h.id, data.completions), date)).length

  return (
    <section className="page">
      <div className="page-head">
        <h1>Growth</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>+ New habit</button>
      </div>

      {editing && (
        <HabitForm key={editing === 'new' ? 'new' : editing.id} habit={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
      )}

      <DateStepper date={date} onChange={setDate} />
      {visible.length > 0 && (
        <p className="muted">{doneCount} of {visible.length} done</p>
      )}
      {actionError && <p className="error" role="alert">{actionError}</p>}

      {active.length === 0 && !editing ? (
        <div className="card empty">
          <p>No habits yet.</p>
          <p className="muted">Start with something small, like a glass of water or ten minutes of reading.</p>
        </div>
      ) : (
        <ul className="list">{visible.map((h) => renderHabit(h, true))}</ul>
      )}
      {visible.length === 0 && active.length > 0 && <p className="muted">Nothing scheduled for this day.</p>}

      {other.length > 0 && (
        <>
          <h2>Not scheduled this day</h2>
          <ul className="list">{other.map((h) => renderHabit(h, false))}</ul>
        </>
      )}

      {archived.length > 0 && (
        <>
          <button className="link" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && <ul className="list">{archived.map((h) => renderHabit(h, false))}</ul>}
        </>
      )}
    </section>
  )
}
