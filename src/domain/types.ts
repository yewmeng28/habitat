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

// ---- Focus & woodland ----

export const GROWTH_STAGES = ['seed', 'sprout', 'sapling', 'young', 'mature'] as const
export type GrowthStage = (typeof GROWTH_STAGES)[number]

export type FocusStatus = 'active' | 'paused' | 'completed' | 'interrupted'

/** Timer state is timestamp-based so it survives backgrounding, refreshes and iOS suspension. */
export interface FocusSession extends BaseRecord {
  speciesId: string
  biomeId: string
  plannedSeconds: number
  startedAt: string // ISO
  pausedAt: string | null // ISO while paused
  pausedMs: number // total time spent paused in earlier pauses
  endedAt: string | null // ISO; for completed sessions, the moment the full duration was reached
  status: FocusStatus
}

export interface TreePosition {
  x: number // 0..1 within the area
  y: number
}

/** A permanent record. At most one exists per focus session (unique index on focusSessionId). */
export interface PlantedTree extends BaseRecord {
  speciesId: string
  biomeId: string
  areaId: string
  plantedOn: DateKey
  growthStage: GrowthStage
  position: TreePosition
  focusSessionId: string
}

// ---- Collection & progression ----

/** A data-driven unlock condition, shared by species, wildlife and achievements. */
export type Rule =
  | { type: 'always' }
  | { type: 'sessions'; n: number } // completed focus sessions
  | { type: 'hours'; n: number } // total focused hours
  | { type: 'trees'; n: number } // total planted trees
  | { type: 'species-trees'; speciesId: string; n: number }
  | { type: 'biome-trees'; biomeId: string; n: number } // trees planted in one biome
  | { type: 'area-trees'; n: number } // trees in a single area (density)
  | { type: 'species-discovered'; n: number } // distinct tree species unlocked
  | { type: 'habit-streak'; n: number } // best current habit streak

export type DiscoveryKind = 'species' | 'wildlife' | 'achievement' | 'biome'

/** First-time discovery of an item. Unique per kind+itemId, so awarding is idempotent. */
export interface Discovery extends BaseRecord {
  kind: DiscoveryKind
  itemId: string
  points: number // Discovery Points granted
}

export interface Preferences extends BaseRecord {
  // fixed id 'preferences'
  weekStartsOn: 0 | 1
}
