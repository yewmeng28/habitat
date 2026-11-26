import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resolveDisplay } from '../domain/preferences'
import { plantInstantly } from '../dev/devTools'
import { computeStats } from '../domain/progress'
import { exportBackup, importBackup, parseBackup } from './backup'
import { HabitatDB, db, useDatabase } from './db'
import { currentStats } from './focusRepo'
import { getPreferences, updatePreferences } from './repo'

beforeEach(() => useDatabase(new HabitatDB(`test-${crypto.randomUUID()}`)))

describe('saving display options', () => {
  it('starts with defaults, saves changes, and keeps the rest', async () => {
    expect(resolveDisplay(await getPreferences()).sound).toBe(false)
    await updatePreferences({ dayNight: 'night', volume: 0.2 })
    await updatePreferences({ seasons: 'winter' })
    const p = resolveDisplay(await getPreferences())
    expect(p).toMatchObject({ dayNight: 'night', volume: 0.2, seasons: 'winter', sound: false })
  })
  it('loads a preferences record saved before these options existed', async () => {
    await db.preferences.put({ id: 'preferences', userId: null, createdAt: 'a', updatedAt: 'a', deletedAt: null, weekStartsOn: 1 })
    expect(resolveDisplay(await getPreferences())).toMatchObject({ dayNight: 'auto', seasons: 'auto', weather: true })
  })
})

describe('backup with options', () => {
  it('round-trips display options', async () => {
    await updatePreferences({ music: true, quality: 'low', motion: 'reduced' })
    const parsed = parseBackup(JSON.stringify(await exportBackup()))
    if (!parsed.ok) throw new Error(parsed.error)
    useDatabase(new HabitatDB(`test-${crypto.randomUUID()}`))
    await importBackup(parsed.backup, 'replace')
    expect(resolveDisplay(await getPreferences())).toMatchObject({ music: true, quality: 'low', motion: 'reduced' })
  })
  it('still imports a backup made before these options, and rejects nonsense values', async () => {
    const parsed = parseBackup(JSON.stringify(await exportBackup()))
    if (!parsed.ok) throw new Error(parsed.error)
    const old = JSON.parse(JSON.stringify(parsed.backup))
    old.version = 3
    old.data.preferences = [{ id: 'preferences', userId: null, createdAt: 'a', updatedAt: 'a', deletedAt: null, weekStartsOn: 1 }]
    expect(parseBackup(JSON.stringify(old)).ok).toBe(true)
    old.data.preferences[0].volume = 5
    expect(parseBackup(JSON.stringify(old)).ok).toBe(false)
  })
})

describe('new achievements', () => {
  it('counts unlocked biomes and rare finds', async () => {
    await plantInstantly('oak', 15, 1)
    let st = await currentStats()
    expect(st.biomesUnlocked).toBe(2)
    expect(st.raresFound).toBe(0)
    await plantInstantly('cherry-blossom', 5, 1)
    st = await currentStats()
    expect(st.raresFound).toBe(1)
    void computeStats
  })
})
