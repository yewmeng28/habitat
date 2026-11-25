import { addDays, dateRange, dayOfWeek, weekStart } from './dates'
import type { Challenge, ChallengeRecord, DateKey, Habit, HabitCompletion } from './types'

/** Map of date -> completed count for one habit. */
export type CountsByDate = Map<DateKey, number>

export function countsFor(habitId: string, completions: HabitCompletion[]): CountsByDate {
  const m: CountsByDate = new Map()
  for (const c of completions) {
    if (c.habitId === habitId && !c.deletedAt) m.set(c.date, (m.get(c.date) ?? 0) + c.count)
  }
  return m
}

export function isScheduledOn(habit: Habit, date: DateKey): boolean {
  switch (habit.schedule.type) {
    case 'daily':
    case 'weekly': // weekly habits can be done on any day
      return true
    case 'custom':
      return habit.schedule.days.includes(dayOfWeek(date))
  }
}

export function isDayComplete(habit: Habit, counts: CountsByDate, date: DateKey): boolean {
  return (counts.get(date) ?? 0) >= habit.targetPerDay
}

function weekCompletions(habit: Habit, counts: CountsByDate, start: DateKey): number {
  return dateRange(start, addDays(start, 6)).filter((d) => isDayComplete(habit, counts, d)).length
}

/**
 * Current streak. Gentle by design: an unfinished *today* (or current week) never
 * breaks the streak, it simply has not been counted yet.
 * Daily/custom: consecutive scheduled days completed. Weekly: consecutive weeks meeting the target.
 */
export function currentStreak(
  habit: Habit,
  counts: CountsByDate,
  today: DateKey,
  weekStartsOn: 0 | 1 = 1,
): number {
  const created = habit.createdAt.slice(0, 10)
  if (habit.schedule.type === 'weekly') {
    const need = habit.schedule.timesPerWeek
    const thisWeek = weekStart(today, weekStartsOn)
    let streak = weekCompletions(habit, counts, thisWeek) >= need ? 1 : 0
    for (let w = addDays(thisWeek, -7); w >= weekStart(created, weekStartsOn); w = addDays(w, -7)) {
      if (weekCompletions(habit, counts, w) >= need) streak++
      else break
    }
    return streak
  }

  let streak = 0
  let day = today
  // Guard against infinite loops: never look back before the habit existed or over ~10 years.
  for (let i = 0; i < 3650 && day >= created; i++, day = addDays(day, -1)) {
    if (!isScheduledOn(habit, day)) continue
    if (isDayComplete(habit, counts, day)) streak++
    else if (day !== today) break
  }
  return streak
}

export function longestStreak(habit: Habit, counts: CountsByDate, today: DateKey): number {
  if (habit.schedule.type === 'weekly') return currentStreak(habit, counts, today) // approximation kept simple
  let best = 0
  let run = 0
  for (const d of dateRange(habit.createdAt.slice(0, 10), today)) {
    if (!isScheduledOn(habit, d)) continue
    if (isDayComplete(habit, counts, d)) best = Math.max(best, ++run)
    else if (d !== today) run = 0
  }
  return best
}

/** Completion rate over scheduled days in [from, to]; null if nothing was scheduled. */
export function completionRate(
  habit: Habit,
  counts: CountsByDate,
  from: DateKey,
  to: DateKey,
): number | null {
  const start = from < habit.createdAt.slice(0, 10) ? habit.createdAt.slice(0, 10) : from
  if (start > to) return null
  const days = dateRange(start, to).filter((d) => isScheduledOn(habit, d))
  if (days.length === 0) return null
  const done = days.filter((d) => isDayComplete(habit, counts, d)).length
  return done / days.length
}

// ---- Challenges ----

export type ChallengeStatus = 'met' | 'missed' | 'none'

/** Whether the challenge goal was met on a date. No record means 'none', never 'missed'. */
export function challengeStatus(
  challenge: Challenge,
  records: ChallengeRecord[],
  date: DateKey,
): ChallengeStatus {
  const rec = records.find((r) => r.challengeId === challenge.id && r.date === date && !r.deletedAt)
  if (!rec) return 'none'
  if (challenge.mode === 'avoidance') return rec.value >= 1 ? 'met' : 'missed'
  const target = challenge.target ?? 0
  return rec.value <= target ? 'met' : 'missed'
}

/** Consecutive days with goal met, ending today or yesterday. Days without a record pause rather than reset. */
export function challengeStreak(
  challenge: Challenge,
  records: ChallengeRecord[],
  today: DateKey,
): number {
  const created = challenge.createdAt.slice(0, 10)
  let streak = 0
  for (let i = 0, day = today; i < 3650 && day >= created; i++, day = addDays(day, -1)) {
    const s = challengeStatus(challenge, records, day)
    if (s === 'met') streak++
    else if (s === 'missed') break
    // 'none' on today is ignored; earlier gaps also pause the streak instead of ending it.
  }
  return streak
}
