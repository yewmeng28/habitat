import { getBiome } from '../data/biomes'
import { getSpecies } from '../data/species'
import { toDateKey } from '../domain/dates'
import {
  MAX_MINUTES,
  MIN_MINUTES,
  elapsedMs,
  finishTimeMs,
  isFinished,
  isSpeciesUnlocked,
  sessionReward,
} from '../domain/focus'
import type { FocusSession, PlantedTree } from '../domain/types'
import { areaDef, parseAreaId } from '../data/biomes'
import { assignArea, slotPosition } from '../domain/woodland'
import { db } from './db'
import { newBase } from './repo'

const nowIso = () => new Date().toISOString()
export const focusSourceKey = (sessionId: string) => `focus:${sessionId}`

export const listSessions = () => db.focusSessions.filter((s) => !s.deletedAt).toArray()
export const listTrees = () => db.plantedTrees.filter((t) => !t.deletedAt).toArray()

export async function completedSessionCount(): Promise<number> {
  return db.focusSessions.where('status').equals('completed').filter((s) => !s.deletedAt).count()
}

export async function getOpenSession(): Promise<FocusSession | undefined> {
  const open = await db.focusSessions.where('status').anyOf('active', 'paused').filter((s) => !s.deletedAt).toArray()
  return open[0]
}

export async function startSession(speciesId: string, minutes: number, biomeId = 'woodland'): Promise<FocusSession> {
  const species = getSpecies(speciesId)
  if (!species || !species.biomes.includes(biomeId)) throw new Error('That tree cannot be planted here.')
  if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES)
    throw new Error(`Choose between ${MIN_MINUTES} and ${MAX_MINUTES} minutes.`)
  return db.transaction('rw', db.focusSessions, async () => {
    if (await getOpenSession()) throw new Error('A focus session is already in progress.')
    const completed = await completedSessionCount()
    if (!isSpeciesUnlocked(species, completed)) throw new Error(`${species.name} is not unlocked yet.`)
    const session: FocusSession = {
      ...newBase(),
      speciesId,
      biomeId,
      plannedSeconds: minutes * 60,
      startedAt: nowIso(),
      pausedAt: null,
      pausedMs: 0,
      endedAt: null,
      status: 'active',
    }
    await db.focusSessions.add(session)
    return session
  })
}

export async function pauseSession(id: string): Promise<void> {
  await db.transaction('rw', db.focusSessions, async () => {
    const s = await db.focusSessions.get(id)
    if (!s || s.status !== 'active') return
    await db.focusSessions.update(id, { status: 'paused', pausedAt: nowIso(), updatedAt: nowIso() })
  })
}

export async function resumeSession(id: string): Promise<void> {
  await db.transaction('rw', db.focusSessions, async () => {
    const s = await db.focusSessions.get(id)
    if (!s || s.status !== 'paused' || !s.pausedAt) return
    const pausedFor = Math.max(0, Date.now() - Date.parse(s.pausedAt))
    await db.focusSessions.update(id, {
      status: 'active',
      pausedAt: null,
      pausedMs: s.pausedMs + pausedFor,
      updatedAt: nowIso(),
    })
  })
}

/** Giving up keeps the history but plants nothing. Existing trees are never touched. */
export async function interruptSession(id: string): Promise<void> {
  await db.transaction('rw', db.focusSessions, async () => {
    const s = await db.focusSessions.get(id)
    if (!s || (s.status !== 'active' && s.status !== 'paused')) return
    await db.focusSessions.update(id, { status: 'interrupted', endedAt: nowIso(), updatedAt: nowIso() })
  })
}

/**
 * Completes a session and plants its tree, atomically and idempotently.
 * Calling it again (retry, double tab, resume after reload) returns the same tree and awards nothing twice.
 */
export async function completeSession(id: string, nowMs = Date.now()): Promise<PlantedTree | null> {
  return db.transaction('rw', db.focusSessions, db.plantedTrees, db.ledger, async () => {
    const s = await db.focusSessions.get(id)
    if (!s) return null
    if (s.status === 'interrupted') return null
    if (s.status !== 'completed') {
      if (!isFinished(s, nowMs)) throw new Error('This session is not finished yet.')
      await db.focusSessions.update(id, {
        status: 'completed',
        pausedAt: null,
        endedAt: new Date(Math.min(nowMs, finishTimeMs(s))).toISOString(),
        updatedAt: nowIso(),
      })
    }

    // Attribute the tree and reward to the day the session actually finished, not the day it was settled.
    const doneMs = Date.parse((await db.focusSessions.get(id))!.endedAt ?? new Date(nowMs).toISOString())
    const existing = await db.plantedTrees.where('focusSessionId').equals(id).first()
    if (existing) return existing

    const biome = getBiome(s.biomeId)
    if (!biome) throw new Error(`Unknown biome ${s.biomeId}`)
    const inBiome = await db.plantedTrees.filter((t) => !t.deletedAt && t.biomeId === s.biomeId).toArray()
    const slot = assignArea(biome, inBiome)
    const capacity = areaDef(biome, parseAreaId(slot.areaId).index).capacity
    const tree: PlantedTree = {
      ...newBase(),
      speciesId: s.speciesId,
      biomeId: s.biomeId,
      areaId: slot.areaId,
      plantedOn: toDateKey(new Date(doneMs)),
      growthStage: 'mature',
      position: slotPosition(slot.areaId, slot.indexInArea, capacity),
      focusSessionId: id,
    }
    await db.plantedTrees.add(tree)

    const key = focusSourceKey(id)
    if (!(await db.ledger.where('sourceKey').equals(key).first())) {
      await db.ledger.add({
        ...newBase(),
        sourceKey: key,
        amount: sessionReward(s.plannedSeconds),
        date: toDateKey(new Date(doneMs)),
        reason: `Focus: ${getSpecies(s.speciesId)?.name ?? s.speciesId}`,
      })
    }
    return tree
  })
}

/** Call on startup and on resume: finishes any session whose time ran out while the app was closed. */
export async function settleOpenSession(nowMs = Date.now()): Promise<PlantedTree | null> {
  const open = await getOpenSession()
  if (!open || open.status !== 'active') return null
  if (elapsedMs(open, nowMs) < open.plannedSeconds * 1000) return null
  return completeSession(open.id, nowMs)
}
