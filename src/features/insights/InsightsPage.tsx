import { useState } from 'react'
import { addDays } from '../../domain/dates'
import { dateRange } from '../../domain/dates'
import { challengeStatus, completionRate, countsFor } from '../../domain/habits'
import { useToday, type AppData } from '../../hooks'

const RANGES = [7, 30, 90] as const

const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`)

export function InsightsPage({ data }: { data: AppData }) {
  const today = useToday()
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const from = addDays(today, -(range - 1))
  const days = dateRange(from, today)

  const habits = data.habits.filter((h) => !h.archivedAt)
  const rates = habits.map((h) => ({
    habit: h,
    rate: completionRate(h, countsFor(h.id, data.completions), from, today),
  }))
  const rated = rates.filter((r) => r.rate !== null) as { habit: (typeof habits)[number]; rate: number }[]
  // Each habit counts equally, so a category with many habits can't swamp the overall figure.
  const overall = rated.length ? rated.reduce((s, r) => s + r.rate, 0) / rated.length : null

  const neByDay = new Map<string, number>()
  for (const l of data.ledger) neByDay.set(l.date, (neByDay.get(l.date) ?? 0) + l.amount)
  const series = days.map((d) => neByDay.get(d) ?? 0)
  const totalNE = data.ledger.reduce((s, l) => s + l.amount, 0)
  const periodNE = series.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...series)

  const challenges = data.challenges.filter((c) => !c.archivedAt)
  const challengeRows = challenges.map((c) => {
    const statuses = days.map((d) => challengeStatus(c, data.challengeRecords, d))
    return { c, met: statuses.filter((s) => s === 'met').length, logged: statuses.filter((s) => s !== 'none').length }
  })

  const hasAny = data.habits.length > 0 || data.challenges.length > 0

  return (
    <section className="page">
      <div className="page-head">
        <h1>Insights</h1>
        <div className="seg" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? 'on' : ''} aria-pressed={range === r} onClick={() => setRange(r)}>{r}d</button>
          ))}
        </div>
      </div>

      {!hasAny ? (
        <div className="card empty">
          <p>Nothing to show yet.</p>
          <p className="muted">Add a habit in Growth and check it off. Your trends will appear here.</p>
        </div>
      ) : (
        <>
          <div className="tiles">
            <div className="card tile"><span className="tile-value">{pct(overall)}</span><span className="muted small">Habit completion</span></div>
            <div className="card tile"><span className="tile-value">{periodNE}</span><span className="muted small">NE this period</span></div>
            <div className="card tile"><span className="tile-value">{totalNE}</span><span className="muted small">NE all time</span></div>
          </div>

          <div className="card">
            <h2>Nature Energy earned</h2>
            <svg className="chart" viewBox={`0 0 ${days.length * 10} 60`} preserveAspectRatio="none" role="img" aria-label={`Nature Energy earned per day over the last ${range} days`}>
              {series.map((v, i) => (
                <rect key={days[i]} x={i * 10 + 1.5} width={7} y={56 - (v / max) * 52} height={Math.max(v > 0 ? 1 : 0, (v / max) * 52)} rx={1.5}>
                  <title>{`${days[i]}: ${v} NE`}</title>
                </rect>
              ))}
              <line x1={0} x2={days.length * 10} y1={56} y2={56} className="axis" />
            </svg>
            <div className="chart-axis muted small"><span>{from}</span><span>{today}</span></div>
          </div>

          {rated.length > 0 && (
            <div className="card">
              <h2>Habits</h2>
              <ul className="bars">
                {rated.map(({ habit, rate }) => (
                  <li key={habit.id}>
                    <span>{habit.name}</span>
                    <span className="bar" aria-hidden="true"><span style={{ width: `${rate * 100}%` }} /></span>
                    <span className="small">{pct(rate)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {challengeRows.length > 0 && (
            <div className="card">
              <h2>Challenges</h2>
              <ul className="bars">
                {challengeRows.map(({ c, met, logged }) => (
                  <li key={c.id}>
                    <span>{c.name}</span>
                    <span className="bar" aria-hidden="true"><span style={{ width: logged ? `${(met / logged) * 100}%` : '0%' }} /></span>
                    <span className="small">{logged ? `${met}/${logged} days` : 'no entries'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
