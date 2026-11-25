import { db } from '../persistence/db'
import { completeSession, getOpenSession, listTrees } from '../persistence/focusRepo'
import { newBase } from '../persistence/repo'

/**
 * Dev-only helpers behind /test. Everything goes through the real completeSession path,
 * so planted trees, rewards and area placement behave exactly like production.
 */
export async function plantInstantly(speciesId: string, count: number, minutes = 25): Promise<number> {
  let planted = 0
  for (let i = 0; i < count; i++) {
    const startedAt = new Date(Date.now() - minutes * 60_000 - 1000).toISOString()
    const session = {
      ...newBase(),
      speciesId,
      biomeId: 'woodland',
      plannedSeconds: minutes * 60,
      startedAt,
      pausedAt: null,
      pausedMs: 0,
      endedAt: null,
      status: 'active' as const,
    }
    await db.focusSessions.add(session)
    if (await completeSession(session.id)) planted++
  }
  return planted
}

/** Fast-forwards the current focus session so it completes right away. */
export async function finishOpenSession(): Promise<boolean> {
  const open = await getOpenSession()
  if (!open) return false
  await db.focusSessions.update(open.id, {
    startedAt: new Date(Date.now() - open.plannedSeconds * 1000 - open.pausedMs - 1000).toISOString(),
    pausedAt: null,
    status: 'active',
  })
  return !!(await completeSession(open.id))
}

export async function clearWoodland(): Promise<void> {
  await db.transaction('rw', db.focusSessions, db.plantedTrees, db.ledger, async () => {
    await db.plantedTrees.clear()
    await db.focusSessions.clear()
    await db.ledger.filter((l) => l.sourceKey.startsWith('focus:')).delete()
  })
}

export async function wipeEverything(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()))
}

export async function addEnergy(amount: number): Promise<void> {
  await db.ledger.add({ ...newBase(), sourceKey: `dev:${crypto.randomUUID()}`, amount, date: new Date().toISOString().slice(0, 10), reason: 'Dev tools' })
}

export const treeCount = async () => (await listTrees()).length
