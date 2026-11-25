import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup, parseBackup } from './backup'
import { HabitatDB, db, useDatabase } from './db'
import {
  completeSession, getOpenSession, interruptSession, listTrees, pauseSession,
  resumeSession, settleOpenSession, startSession,
} from './focusRepo'
import { natureEnergyBalance } from './repo'

beforeEach(() => useDatabase(new HabitatDB(`test-${crypto.randomUUID()}`)))

const later = (ms: number) => Date.now() + ms

describe('focus sessions', () => {
  it('only allows unlocked species and one open session at a time', async () => {
    await expect(startSession('cherry-blossom', 25)).rejects.toThrow(/not unlocked/)
    await expect(startSession('oak', 0)).rejects.toThrow()
    await startSession('oak', 25)
    await expect(startSession('oak', 25)).rejects.toThrow(/already/)
  })

  it('refuses to complete early', async () => {
    const s = await startSession('oak', 25)
    await expect(completeSession(s.id)).rejects.toThrow(/not finished/)
    expect(await listTrees()).toHaveLength(0)
  })

  it('plants exactly one tree and awards once, even when completion is retried', async () => {
    const s = await startSession('oak', 25)
    const a = await completeSession(s.id, later(26 * 60_000))
    const b = await completeSession(s.id, later(27 * 60_000))
    expect(a?.id).toBe(b?.id)
    expect(await listTrees()).toHaveLength(1)
    expect(a?.speciesId).toBe('oak')
    expect(a?.growthStage).toBe('mature')
    expect(await natureEnergyBalance()).toBe(25)
  })

  it('settles a session that finished while the app was closed', async () => {
    await startSession('oak', 15)
    expect(await settleOpenSession(later(5 * 60_000))).toBeNull()
    const tree = await settleOpenSession(later(16 * 60_000))
    expect(tree).not.toBeNull()
    expect(await getOpenSession()).toBeUndefined()
  })

  it('does not complete while paused, and records interruptions without a tree', async () => {
    const s = await startSession('oak', 15)
    await pauseSession(s.id)
    expect(await settleOpenSession(later(60 * 60_000))).toBeNull()
    await resumeSession(s.id)
    await interruptSession(s.id)
    expect(await listTrees()).toHaveLength(0)
    expect((await db.focusSessions.get(s.id))?.status).toBe('interrupted')
    expect(await completeSession(s.id, later(60 * 60_000))).toBeNull()
    expect(await natureEnergyBalance()).toBe(0)
  })

  it('unlocks Pine after the first completed session and keeps old trees when interrupted later', async () => {
    const first = await startSession('oak', 15)
    await completeSession(first.id, later(16 * 60_000))
    const second = await startSession('pine', 15)
    await interruptSession(second.id)
    expect(await listTrees()).toHaveLength(1)
  })

  it('round-trips trees and sessions through backup', async () => {
    const s = await startSession('oak', 15)
    await completeSession(s.id, later(16 * 60_000))
    const parsed = parseBackup(JSON.stringify(await exportBackup()))
    if (!parsed.ok) throw new Error(parsed.error)
    useDatabase(new HabitatDB(`test-${crypto.randomUUID()}`))
    await importBackup(parsed.backup, 'replace')
    expect(await listTrees()).toHaveLength(1)
    const merged = await importBackup(parsed.backup, 'merge')
    expect(merged.added).toBe(0)
    expect(await listTrees()).toHaveLength(1)
  })
})

describe('zero-length sessions (dev tools)', () => {
  it('complete immediately and survive a backup round-trip', async () => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    await db.focusSessions.add({
      id, userId: null, createdAt: now, updatedAt: now, deletedAt: null, speciesId: 'oak', biomeId: 'woodland',
      plannedSeconds: 0, startedAt: now, pausedAt: null, pausedMs: 0, endedAt: null, status: 'active',
    })
    expect(await completeSession(id)).not.toBeNull()
    expect(await natureEnergyBalance()).toBe(0)
    const parsed = parseBackup(JSON.stringify(await exportBackup()))
    expect(parsed.ok).toBe(true)
  })
})

describe('discoveries persistence', () => {
  it('records each discovery once, even if sync runs repeatedly or concurrently', async () => {
    const { syncDiscoveries, listDiscoveries } = await import('./progressRepo')
    const s = await startSession('oak', 15)
    await completeSession(s.id, later(16 * 60_000))
    const [a, b] = await Promise.all([syncDiscoveries(), syncDiscoveries()])
    const again = await syncDiscoveries()
    expect(a.length + b.length).toBe((await listDiscoveries()).length)
    expect(again).toEqual([])
    const ids = (await listDiscoveries()).map((d) => `${d.kind}:${d.itemId}`)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('wildlife:songbird')
  })
  it('unlocks Maple for planting once 8 trees exist', async () => {
    const { plantInstantly } = await import('../dev/devTools')
    await expect(startSession('maple', 15)).rejects.toThrow(/not unlocked/)
    await plantInstantly('oak', 8, 1)
    await expect(startSession('maple', 15)).resolves.toBeTruthy()
  })
})
