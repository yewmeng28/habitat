import Dexie, { type EntityTable } from 'dexie'
import type {
  Challenge,
  ChallengeRecord,
  Habit,
  HabitCompletion,
  LedgerEntry,
  Preferences,
} from '../domain/types'

/**
 * Local-first store. Every table holds BaseRecord rows (UUID, userId, timestamps, soft delete)
 * so they can later be synced to Supabase without reshaping the data.
 */
export class HabitatDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>
  completions!: EntityTable<HabitCompletion, 'id'>
  challenges!: EntityTable<Challenge, 'id'>
  challengeRecords!: EntityTable<ChallengeRecord, 'id'>
  ledger!: EntityTable<LedgerEntry, 'id'>
  preferences!: EntityTable<Preferences, 'id'>

  constructor(name = 'habitat') {
    super(name)
    this.version(1).stores({
      habits: 'id, updatedAt',
      completions: 'id, &[habitId+date], date, updatedAt',
      challenges: 'id, updatedAt',
      challengeRecords: 'id, &[challengeId+date], date, updatedAt',
      ledger: 'id, &sourceKey, date, updatedAt',
      preferences: 'id',
    })
  }
}

export let db = new HabitatDB()

/** Test hook: swap in an isolated database. */
export function useDatabase(next: HabitatDB) {
  db = next
}
