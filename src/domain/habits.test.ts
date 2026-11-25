import { describe, expect, it } from 'vitest'
import { challengeStatus, challengeStreak, completionRate, countsFor, currentStreak } from './habits'
import type { Challenge, ChallengeRecord, Habit, HabitCompletion } from './types'

const base = { userId: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '', deletedAt: null }

const habit = (over: Partial<Habit> = {}): Habit => ({
  ...base, id: 'h1', name: 'Read', category: 'mind', schedule: { type: 'daily' },
  targetPerDay: 1, unit: 'times', rewardNE: 15, archivedAt: null, ...over,
})
const done = (date: string, count = 1, habitId = 'h1'): HabitCompletion => ({
  ...base, id: `${habitId}${date}`, habitId, date, count,
})

describe('currentStreak', () => {
  it('counts consecutive days', () => {
    const c = countsFor('h1', [done('2026-03-08'), done('2026-03-09'), done('2026-03-10')])
    expect(currentStreak(habit(), c, '2026-03-10')).toBe(3)
  })
  it('does not break on an unfinished today', () => {
    const c = countsFor('h1', [done('2026-03-08'), done('2026-03-09')])
    expect(currentStreak(habit(), c, '2026-03-10')).toBe(2)
  })
  it('breaks on a missed past day', () => {
    const c = countsFor('h1', [done('2026-03-07'), done('2026-03-09'), done('2026-03-10')])
    expect(currentStreak(habit(), c, '2026-03-10')).toBe(2)
  })
  it('requires the full daily target', () => {
    const c = countsFor('h1', [done('2026-03-10', 3)])
    expect(currentStreak(habit({ targetPerDay: 8 }), c, '2026-03-10')).toBe(0)
  })
  it('skips unscheduled days on custom schedules', () => {
    // 2026-03-09 is Monday, 2026-03-11 Wednesday; habit is Mon/Wed only
    const h = habit({ schedule: { type: 'custom', days: [1, 3] } })
    const c = countsFor('h1', [done('2026-03-09'), done('2026-03-11')])
    expect(currentStreak(h, c, '2026-03-12')).toBe(2)
  })
  it('counts weekly streaks by weeks meeting the target', () => {
    const h = habit({ schedule: { type: 'weekly', timesPerWeek: 2 } })
    const c = countsFor('h1', [
      done('2026-03-02'), done('2026-03-04'), // week of Mar 2
      done('2026-03-09'), done('2026-03-10'), // week of Mar 9
    ])
    expect(currentStreak(h, c, '2026-03-11')).toBe(2)
  })
})

describe('completionRate', () => {
  it('ignores days before the habit existed', () => {
    const h = habit({ createdAt: '2026-03-09T00:00:00.000Z' })
    const c = countsFor('h1', [done('2026-03-09')])
    expect(completionRate(h, c, '2026-03-01', '2026-03-10')).toBe(0.5)
  })
  it('returns null when nothing was scheduled', () => {
    expect(completionRate(habit(), new Map(), '2025-01-01', '2025-01-05')).toBeNull()
  })
})

const challenge = (over: Partial<Challenge> = {}): Challenge => ({
  ...base, id: 'c1', name: 'Smoking', mode: 'avoidance', target: null,
  isScreenTime: false, archivedAt: null, ...over,
})
const rec = (date: string, value: number): ChallengeRecord => ({
  ...base, id: date, challengeId: 'c1', date, value,
})

describe('challenges', () => {
  it('never treats a missing record as missed', () => {
    expect(challengeStatus(challenge(), [], '2026-03-10')).toBe('none')
  })
  it('judges duration against the limit', () => {
    const c = challenge({ mode: 'duration', target: 120 })
    expect(challengeStatus(c, [rec('2026-03-10', 90)], '2026-03-10')).toBe('met')
    expect(challengeStatus(c, [rec('2026-03-10', 150)], '2026-03-10')).toBe('missed')
  })
  it('streak pauses on gaps and resets on a missed day', () => {
    const recs = [rec('2026-03-07', 0), rec('2026-03-08', 1), rec('2026-03-10', 1)]
    expect(challengeStreak(challenge(), recs, '2026-03-10')).toBe(2)
  })
})
