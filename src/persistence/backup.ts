import type { EntityTable } from 'dexie'
import { z } from 'zod'
import { isValidDateKey } from '../domain/dates'
import { db } from './db'

export const BACKUP_FORMAT = 'habitat-backup'
export const BACKUP_VERSION = 3

const base = {
  id: z.string().min(1),
  userId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
}
const dateKey = z.string().refine(isValidDateKey, 'Invalid date')

const schedule = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({ type: z.literal('weekly'), timesPerWeek: z.number().int().min(1).max(7) }),
  z.object({ type: z.literal('custom'), days: z.array(z.number().int().min(0).max(6)).min(1) }),
])

const habit = z.object({
  ...base,
  name: z.string().min(1),
  category: z.enum(['body', 'mind', 'learning', 'rest', 'creative', 'other']),
  schedule,
  targetPerDay: z.number().int().min(1),
  unit: z.string(),
  rewardNE: z.number().min(0),
  archivedAt: z.string().nullable(),
})
const completion = z.object({
  ...base,
  habitId: z.string(),
  date: dateKey,
  count: z.number().min(0),
})
const challenge = z.object({
  ...base,
  name: z.string().min(1),
  mode: z.enum(['avoidance', 'frequency', 'duration']),
  target: z.number().min(0).nullable(),
  isScreenTime: z.boolean(),
  archivedAt: z.string().nullable(),
})
const challengeRecord = z.object({
  ...base,
  challengeId: z.string(),
  date: dateKey,
  value: z.number().min(0),
})
const ledger = z.object({
  ...base,
  sourceKey: z.string().min(1),
  amount: z.number(),
  date: dateKey,
  reason: z.string(),
})
const focusSession = z.object({
  ...base,
  speciesId: z.string().min(1),
  biomeId: z.string().min(1),
  plannedSeconds: z.number().int().min(0), // 0 only occurs for dev-tool sessions
  startedAt: z.string(),
  pausedAt: z.string().nullable(),
  pausedMs: z.number().min(0),
  endedAt: z.string().nullable(),
  status: z.enum(['active', 'paused', 'completed', 'interrupted']),
})
const plantedTree = z.object({
  ...base,
  speciesId: z.string().min(1),
  biomeId: z.string().min(1),
  areaId: z.string().min(1),
  plantedOn: dateKey,
  growthStage: z.enum(['seed', 'sprout', 'sapling', 'young', 'mature']),
  position: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  focusSessionId: z.string().min(1),
})
const discovery = z.object({
  ...base,
  kind: z.enum(['species', 'wildlife', 'achievement', 'biome', 'rare']),
  itemId: z.string().min(1),
  points: z.number().min(0),
})
const preferences = z.object({ ...base, weekStartsOn: z.union([z.literal(0), z.literal(1)]) })

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().max(BACKUP_VERSION, 'This backup was made by a newer version of Habitat.'),
  exportedAt: z.string(),
  data: z.object({
    habits: z.array(habit),
    completions: z.array(completion),
    challenges: z.array(challenge),
    challengeRecords: z.array(challengeRecord),
    ledger: z.array(ledger),
    preferences: z.array(preferences),
    // Added in backup version 2; version 1 files simply have none.
    focusSessions: z.array(focusSession).default([]),
    plantedTrees: z.array(plantedTree).default([]),
    discoveries: z.array(discovery).default([]),
  }),
})
export type Backup = z.infer<typeof backupSchema>

export async function exportBackup(): Promise<Backup> {
  const [habits, completions, challenges, challengeRecords, ledgerRows, prefs, focusSessions, plantedTrees, discoveries] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
    db.challenges.toArray(),
    db.challengeRecords.toArray(),
    db.ledger.toArray(),
    db.preferences.toArray(),
    db.focusSessions.toArray(),
    db.plantedTrees.toArray(),
    db.discoveries.toArray(),
  ])
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      habits,
      completions,
      challenges,
      challengeRecords,
      ledger: ledgerRows,
      preferences: prefs,
      focusSessions,
      plantedTrees,
      discoveries,
    },
  }
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

/** Validates raw JSON text, including referential integrity between records. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  const parsed = backupSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: `Not a valid Habitat backup (${issue.path.join('.') || 'root'}: ${issue.message}).` }
  }
  const { data } = parsed.data
  const habitIds = new Set(data.habits.map((h) => h.id))
  const challengeIds = new Set(data.challenges.map((c) => c.id))
  if (data.completions.some((c) => !habitIds.has(c.habitId)))
    return { ok: false, error: 'Backup contains completions for habits that do not exist.' }
  if (data.challengeRecords.some((r) => !challengeIds.has(r.challengeId)))
    return { ok: false, error: 'Backup contains records for challenges that do not exist.' }
  const sessionIds = new Set(data.focusSessions.map((f) => f.id))
  if (data.plantedTrees.some((t) => !sessionIds.has(t.focusSessionId)))
    return { ok: false, error: 'Backup contains trees whose focus session is missing.' }
  if (new Set(data.plantedTrees.map((t) => t.focusSessionId)).size !== data.plantedTrees.length)
    return { ok: false, error: 'Backup contains more than one tree for the same focus session.' }
  return { ok: true, backup: parsed.data }
}

export interface ImportSummary {
  mode: 'replace' | 'merge'
  added: number
  updated: number
  skipped: number
}

type Row = { id: string; updatedAt: string }

async function mergeTable<T extends Row>(
  table: EntityTable<T, 'id'>,
  incoming: T[],
  naturalKey: ((r: T) => string) | null,
  tally: ImportSummary,
) {
  const existing = await table.toArray()
  const byId = new Map(existing.map((r) => [r.id, r]))
  const byKey = naturalKey ? new Map(existing.map((r) => [naturalKey(r), r])) : null
  const toPut: T[] = []
  const toDelete: string[] = []
  for (const row of incoming) {
    const sameId = byId.get(row.id)
    const sameKey = byKey?.get(naturalKey!(row))
    const clash = sameId ?? sameKey
    if (!clash) {
      toPut.push(row)
      tally.added++
    } else if (clash.updatedAt < row.updatedAt) {
      // Incoming is newer: replace the clashing row (which may carry a different id).
      if (clash.id !== row.id) toDelete.push(clash.id)
      toPut.push(row)
      tally.updated++
    } else tally.skipped++
  }
  await table.bulkDelete(toDelete as Parameters<typeof table.bulkDelete>[0])
  await table.bulkPut(toPut)
}

/**
 * Imports a validated backup in one transaction, so a failure leaves local data untouched.
 * 'replace' wipes local data first (the UI must confirm). 'merge' keeps the newer version of each record.
 */
export async function importBackup(backup: Backup, mode: 'replace' | 'merge'): Promise<ImportSummary> {
  const tally: ImportSummary = { mode, added: 0, updated: 0, skipped: 0 }
  const d = backup.data
  await db.transaction(
    'rw',
    [db.habits, db.completions, db.challenges, db.challengeRecords, db.ledger, db.preferences, db.focusSessions, db.plantedTrees, db.discoveries],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.habits.clear(),
          db.completions.clear(),
          db.challenges.clear(),
          db.challengeRecords.clear(),
          db.ledger.clear(),
          db.preferences.clear(),
          db.focusSessions.clear(),
          db.plantedTrees.clear(),
          db.discoveries.clear(),
        ])
        await db.habits.bulkAdd(d.habits)
        await db.completions.bulkAdd(d.completions)
        await db.challenges.bulkAdd(d.challenges)
        await db.challengeRecords.bulkAdd(d.challengeRecords)
        await db.ledger.bulkAdd(d.ledger)
        await db.preferences.bulkAdd(d.preferences)
        await db.focusSessions.bulkAdd(d.focusSessions)
        await db.plantedTrees.bulkAdd(d.plantedTrees)
        await db.discoveries.bulkAdd(d.discoveries)
        tally.added =
          d.habits.length + d.completions.length + d.challenges.length +
          d.challengeRecords.length + d.ledger.length + d.preferences.length +
          d.focusSessions.length + d.plantedTrees.length + d.discoveries.length
        return
      }
      await mergeTable(db.habits, d.habits, null, tally)
      await mergeTable(db.challenges, d.challenges, null, tally)
      await mergeTable(db.completions, d.completions, (r) => `${r.habitId}|${r.date}`, tally)
      await mergeTable(db.challengeRecords, d.challengeRecords, (r) => `${r.challengeId}|${r.date}`, tally)
      await mergeTable(db.ledger, d.ledger, (r) => r.sourceKey, tally)
      await mergeTable(db.preferences, d.preferences, null, tally)
      await mergeTable(db.focusSessions, d.focusSessions, null, tally)
      await mergeTable(db.plantedTrees, d.plantedTrees, (r) => r.focusSessionId, tally)
      await mergeTable(db.discoveries, d.discoveries, (r) => `${r.kind}:${r.itemId}`, tally)
    },
  )
  return tally
}
