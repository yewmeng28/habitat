import { pendingDiscoveries } from '../domain/progress'
import type { Discovery } from '../domain/types'
import { db } from './db'
import { currentStats } from './focusRepo'
import { newBase } from './repo'

export const listDiscoveries = () => db.discoveries.filter((d) => !d.deletedAt).toArray()

/**
 * Records anything newly earned (species unlocked, wildlife attracted, achievements) and returns it.
 * Idempotent: the unique [kind+itemId] index and the in-transaction check mean running it twice,
 * or from two tabs, can never grant the same discovery or its points twice.
 */
export async function syncDiscoveries(): Promise<Discovery[]> {
  return db.transaction('rw', [db.discoveries, db.focusSessions, db.plantedTrees, db.habits, db.completions], async () => {
    const stats = await currentStats()
    const existing = await db.discoveries.toArray()
    const created: Discovery[] = pendingDiscoveries(stats, existing).map((c) => ({ ...newBase(), ...c }))
    if (created.length) await db.discoveries.bulkAdd(created)
    return created
  })
}
