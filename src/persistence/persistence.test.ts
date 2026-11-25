import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup, parseBackup } from './backup'
import { HabitatDB, db, useDatabase } from './db'
import {
  createChallenge, createHabit, listHabits, natureEnergyBalance,
  setChallengeValue, setCompletionCount,
} from './repo'

beforeEach(async () => {
  useDatabase(new HabitatDB(`test-${crypto.randomUUID()}`))
})

const input = {
  name: 'Read', category: 'mind' as const, schedule: { type: 'daily' as const },
  targetPerDay: 1, unit: 'times', rewardNE: 15,
}

describe('habits and Nature Energy', () => {
  it('rejects invalid habits', async () => {
    await expect(createHabit({ ...input, name: '  ' })).rejects.toThrow()
    await expect(createHabit({ ...input, targetPerDay: 0 })).rejects.toThrow()
  })

  it('awards once per habit per day, however often it is set', async () => {
    const h = await createHabit(input)
    await setCompletionCount(h, '2026-03-10', 1)
    await setCompletionCount(h, '2026-03-10', 1)
    await setCompletionCount(h, '2026-03-10', 2)
    expect(await natureEnergyBalance()).toBe(15)
  })

  it('reverts the award when a completion is undone, and re-awards cleanly', async () => {
    const h = await createHabit(input)
    await setCompletionCount(h, '2026-03-10', 1)
    await setCompletionCount(h, '2026-03-10', 0)
    expect(await natureEnergyBalance()).toBe(0)
    await setCompletionCount(h, '2026-03-10', 1)
    expect(await natureEnergyBalance()).toBe(15)
  })

  it('only awards when the full target is reached', async () => {
    const h = await createHabit({ ...input, targetPerDay: 8, unit: 'glasses', rewardNE: 10 })
    await setCompletionCount(h, '2026-03-10', 7)
    expect(await natureEnergyBalance()).toBe(0)
    await setCompletionCount(h, '2026-03-10', 8)
    expect(await natureEnergyBalance()).toBe(10)
  })

  it('awards challenge days only when the goal is met', async () => {
    const c = await createChallenge({ name: 'Screen Time', mode: 'duration', target: 120, isScreenTime: true })
    await setChallengeValue(c, '2026-03-10', 200)
    expect(await natureEnergyBalance()).toBe(0)
    await setChallengeValue(c, '2026-03-10', 100)
    expect(await natureEnergyBalance()).toBe(10)
  })
})

describe('backup', () => {
  async function seed() {
    const h = await createHabit(input)
    await setCompletionCount(h, '2026-03-10', 1)
    return h
  }

  it('round-trips through replace', async () => {
    await seed()
    const text = JSON.stringify(await exportBackup())
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    useDatabase(new HabitatDB(`test-${crypto.randomUUID()}`))
    await importBackup(parsed.backup, 'replace')
    expect(await listHabits()).toHaveLength(1)
    expect(await natureEnergyBalance()).toBe(15)
  })

  it('merge does not duplicate records', async () => {
    await seed()
    const parsed = parseBackup(JSON.stringify(await exportBackup()))
    if (!parsed.ok) throw new Error(parsed.error)
    const summary = await importBackup(parsed.backup, 'merge')
    expect(summary.added).toBe(0)
    expect(await db.habits.count()).toBe(1)
    expect(await db.completions.count()).toBe(1)
  })

  it('rejects malformed and inconsistent files', async () => {
    expect(parseBackup('nope').ok).toBe(false)
    expect(parseBackup('{"format":"other"}').ok).toBe(false)
    await seed()
    const b = await exportBackup()
    b.data.completions[0].habitId = 'ghost'
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false)
  })
})
