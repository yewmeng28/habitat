import { useState } from 'react'
import { CATEGORY_REWARD_NE } from '../../domain/rewards'
import type { Habit, HabitCategory, Schedule } from '../../domain/types'
import { createHabit, updateHabit, type HabitInput } from '../../persistence/repo'

const CATEGORIES: { value: HabitCategory; label: string }[] = [
  { value: 'body', label: 'Body & exercise' },
  { value: 'mind', label: 'Mind & meditation' },
  { value: 'learning', label: 'Learning & reading' },
  { value: 'rest', label: 'Sleep & rest' },
  { value: 'creative', label: 'Music & creative' },
  { value: 'other', label: 'Other' },
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function HabitForm({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? 'body')
  const [kind, setKind] = useState<Schedule['type']>(habit?.schedule.type ?? 'daily')
  const [times, setTimes] = useState(habit?.schedule.type === 'weekly' ? habit.schedule.timesPerWeek : 3)
  const [days, setDays] = useState<number[]>(habit?.schedule.type === 'custom' ? habit.schedule.days : [1, 3, 5])
  const [target, setTarget] = useState(habit?.targetPerDay ?? 1)
  const [unit, setUnit] = useState(habit?.unit ?? 'times')
  const [reward, setReward] = useState(habit?.rewardNE ?? CATEGORY_REWARD_NE.body)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function pickCategory(c: HabitCategory) {
    setCategory(c)
    if (!habit) setReward(CATEGORY_REWARD_NE[c]) // suggest the default, never override an edit
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const schedule: Schedule =
      kind === 'daily' ? { type: 'daily' } : kind === 'weekly' ? { type: 'weekly', timesPerWeek: times } : { type: 'custom', days }
    const input: HabitInput = { name, category, schedule, targetPerDay: target, unit: unit.trim() || 'times', rewardNE: reward }
    setSaving(true)
    try {
      if (habit) await updateHabit(habit.id, input)
      else await createHabit(input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the habit.')
      setSaving(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>{habit ? 'Edit habit' : 'New habit'}</h2>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 20 pages" maxLength={60} autoFocus />
      </label>
      <label>
        Category
        <select value={category} onChange={(e) => pickCategory(e.target.value as HabitCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>
      <label>
        Schedule
        <select value={kind} onChange={(e) => setKind(e.target.value as Schedule['type'])}>
          <option value="daily">Every day</option>
          <option value="weekly">Some times per week</option>
          <option value="custom">Specific days</option>
        </select>
      </label>
      {kind === 'weekly' && (
        <label>
          Times per week
          <input type="number" min={1} max={7} value={times} onChange={(e) => setTimes(Number(e.target.value))} />
        </label>
      )}
      {kind === 'custom' && (
        <div className="chips" role="group" aria-label="Days">
          {DAYS.map((d, i) => (
            <button
              type="button"
              key={d}
              className={`chip ${days.includes(i) ? 'on' : ''}`}
              aria-pressed={days.includes(i)}
              onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <label>
          Target per day
          <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </label>
        <label>
          Unit
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="glasses" maxLength={20} />
        </label>
      </div>
      <label>
        Nature Energy reward
        <input type="number" min={0} value={reward} onChange={(e) => setReward(Number(e.target.value))} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row end">
        <button type="button" className="btn" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn primary" disabled={saving}>Save</button>
      </div>
    </form>
  )
}
