import { CHALLENGE_REWARD_NE, challengeSourceKey, habitSourceKey } from '../domain/rewards'
import type {
  BaseRecord,
  Challenge,
  ChallengeRecord,
  DateKey,
  Habit,
  HabitCompletion,
  LedgerEntry,
  Preferences,
  TrackingMode,
} from '../domain/types'
import { challengeStatus } from '../domain/habits'
import { db } from './db'

const now = () => new Date().toISOString()

export function newBase(): BaseRecord {
  const t = now()
  return { id: crypto.randomUUID(), userId: null, createdAt: t, updatedAt: t, deletedAt: null }
}

// ---------- Habits ----------

export type HabitInput = Pick<
  Habit,
  'name' | 'category' | 'schedule' | 'targetPerDay' | 'unit' | 'rewardNE'
>

function validateHabit(input: HabitInput) {
  if (!input.name.trim()) throw new Error('Habit name is required.')
  if (!Number.isInteger(input.targetPerDay) || input.targetPerDay < 1)
    throw new Error('Target per day must be a whole number of at least 1.')
  if (input.rewardNE < 0) throw new Error('Reward cannot be negative.')
  const s = input.schedule
  if (s.type === 'weekly' && (s.timesPerWeek < 1 || s.timesPerWeek > 7))
    throw new Error('Weekly target must be between 1 and 7.')
  if (s.type === 'custom' && s.days.length === 0) throw new Error('Choose at least one day.')
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  validateHabit(input)
  const habit: Habit = { ...newBase(), ...input, name: input.name.trim(), archivedAt: null }
  await db.habits.add(habit)
  return habit
}

export async function updateHabit(id: string, input: HabitInput): Promise<void> {
  validateHabit(input)
  await db.habits.update(id, { ...input, name: input.name.trim(), updatedAt: now() })
}

export async function setHabitArchived(id: string, archived: boolean): Promise<void> {
  await db.habits.update(id, { archivedAt: archived ? now() : null, updatedAt: now() })
}

export const listHabits = () => db.habits.filter((h) => !h.deletedAt).toArray()
export const listCompletions = () => db.completions.filter((c) => !c.deletedAt).toArray()

/**
 * Sets the completion count for a habit on a date and keeps the Nature Energy award in step.
 * The award is keyed by habit+date, so repeating this call can never double-award.
 */
export async function setCompletionCount(
  habit: Habit,
  date: DateKey,
  count: number,
): Promise<void> {
  const clamped = Math.max(0, Math.min(count, habit.targetPerDay * 10))
  await db.transaction('rw', db.completions, db.ledger, async () => {
    const existing = await db.completions.where('[habitId+date]').equals([habit.id, date]).first()
    if (existing) {
      await db.completions.update(existing.id, { count: clamped, updatedAt: now(), deletedAt: null })
    } else {
      const row: HabitCompletion = { ...newBase(), habitId: habit.id, date, count: clamped }
      await db.completions.add(row)
    }
    const key = habitSourceKey(habit.id, date)
    if (clamped >= habit.targetPerDay) await awardNE(key, habit.rewardNE, date, `Habit: ${habit.name}`)
    else await revokeNE(key)
  })
}

// ---------- Challenges ----------

export type ChallengeInput = {
  name: string
  mode: TrackingMode
  target: number | null
  isScreenTime: boolean
}

function validateChallenge(input: ChallengeInput) {
  if (!input.name.trim()) throw new Error('Challenge name is required.')
  if (input.mode !== 'avoidance') {
    if (input.target === null || !(input.target >= 0)) throw new Error('A daily limit is required.')
  }
  if (input.isScreenTime && input.mode !== 'duration')
    throw new Error('Screen Time must track duration.')
}

export async function createChallenge(input: ChallengeInput): Promise<Challenge> {
  validateChallenge(input)
  const c: Challenge = {
    ...newBase(),
    ...input,
    name: input.name.trim(),
    target: input.mode === 'avoidance' ? null : input.target,
    archivedAt: null,
  }
  await db.challenges.add(c)
  return c
}

export async function setChallengeArchived(id: string, archived: boolean): Promise<void> {
  await db.challenges.update(id, { archivedAt: archived ? now() : null, updatedAt: now() })
}

export const listChallenges = () => db.challenges.filter((c) => !c.deletedAt).toArray()
export const listChallengeRecords = () =>
  db.challengeRecords.filter((r) => !r.deletedAt).toArray()

export async function setChallengeValue(
  challenge: Challenge,
  date: DateKey,
  value: number,
): Promise<void> {
  if (!(value >= 0) || !Number.isFinite(value)) throw new Error('Value must be zero or more.')
  if (challenge.mode === 'avoidance' && value !== 0 && value !== 1)
    throw new Error('Avoidance is recorded as 0 or 1.')
  await db.transaction('rw', db.challengeRecords, db.ledger, async () => {
    const existing = await db.challengeRecords
      .where('[challengeId+date]')
      .equals([challenge.id, date])
      .first()
    let rec: ChallengeRecord
    if (existing) {
      rec = { ...existing, value, updatedAt: now(), deletedAt: null }
      await db.challengeRecords.put(rec)
    } else {
      rec = { ...newBase(), challengeId: challenge.id, date, value }
      await db.challengeRecords.add(rec)
    }
    const key = challengeSourceKey(challenge.id, date)
    if (challengeStatus(challenge, [rec], date) === 'met')
      await awardNE(key, CHALLENGE_REWARD_NE, date, `Challenge: ${challenge.name}`)
    else await revokeNE(key)
  })
}

// ---------- Nature Energy ledger ----------

async function awardNE(sourceKey: string, amount: number, date: DateKey, reason: string) {
  const existing = await db.ledger.where('sourceKey').equals(sourceKey).first()
  if (existing) {
    await db.ledger.update(existing.id, { amount, reason, updatedAt: now(), deletedAt: null })
  } else {
    const row: LedgerEntry = { ...newBase(), sourceKey, amount, date, reason }
    await db.ledger.add(row)
  }
}

async function revokeNE(sourceKey: string) {
  const existing = await db.ledger.where('sourceKey').equals(sourceKey).first()
  if (existing && !existing.deletedAt)
    await db.ledger.update(existing.id, { deletedAt: now(), updatedAt: now() })
}

export const listLedger = () => db.ledger.filter((l) => !l.deletedAt).toArray()

export async function natureEnergyBalance(): Promise<number> {
  const rows = await listLedger()
  return rows.reduce((sum, r) => sum + r.amount, 0)
}

// ---------- Preferences ----------

export async function getPreferences(): Promise<Preferences> {
  const p = await db.preferences.get('preferences')
  if (p) return p
  const row: Preferences = { ...newBase(), id: 'preferences', weekStartsOn: 1 }
  await db.preferences.put(row)
  return row
}
