/** Fields shared by every user-owned record. Sync-ready: userId is null until an account is linked. */
export interface BaseRecord {
  id: string // UUID
  userId: string | null
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  deletedAt: string | null // soft delete, so syncing can propagate removals
}

/** Calendar day in the user's local timezone, formatted YYYY-MM-DD. */
export type DateKey = string

export type HabitCategory = 'body' | 'mind' | 'learning' | 'rest' | 'creative' | 'other'

export type Schedule =
  | { type: 'daily' }
  | { type: 'weekly'; timesPerWeek: number } // any days, N times per week
  | { type: 'custom'; days: number[] } // 0 = Sunday ... 6 = Saturday

export interface Habit extends BaseRecord {
  name: string
  category: HabitCategory
  schedule: Schedule
  targetPerDay: number // completions needed for the day to count (e.g. 8 glasses)
  unit: string // label for the target, e.g. "glasses"
  rewardNE: number
  archivedAt: string | null
}

export interface HabitCompletion extends BaseRecord {
  habitId: string
  date: DateKey
  count: number
}

export type TrackingMode = 'avoidance' | 'frequency' | 'duration'

export interface Challenge extends BaseRecord {
  name: string
  mode: TrackingMode
  /** Daily goal. Frequency: max occurrences. Duration: max minutes. Unused for avoidance. */
  target: number | null
  isScreenTime: boolean
  archivedAt: string | null
}

export interface ChallengeRecord extends BaseRecord {
  challengeId: string
  date: DateKey
  /** Avoidance: 1 = avoided, 0 = not avoided. Frequency: occurrences. Duration: minutes. */
  value: number
}

/** Append-only Nature Energy ledger. sourceKey makes awards idempotent. */
export interface LedgerEntry extends BaseRecord {
  sourceKey: string
  amount: number
  date: DateKey
  reason: string
}

export interface Preferences extends BaseRecord {
  // fixed id 'preferences'
  weekStartsOn: 0 | 1
}
