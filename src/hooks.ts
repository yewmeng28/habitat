import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { todayKey } from './domain/dates'
import type {
  Challenge, ChallengeRecord, Discovery, FocusSession, Habit, HabitCompletion, LedgerEntry, PlantedTree,
} from './domain/types'
import { db } from './persistence/db'

export interface AppData {
  habits: Habit[]
  completions: HabitCompletion[]
  challenges: Challenge[]
  challengeRecords: ChallengeRecord[]
  ledger: LedgerEntry[]
  focusSessions: FocusSession[]
  plantedTrees: PlantedTree[]
  discoveries: Discovery[]
  weekStartsOn: 0 | 1
}

/** Live view of all local data; re-renders whenever IndexedDB changes. undefined while loading. */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => {
    const live = <T extends { deletedAt: string | null }>(r: T) => !r.deletedAt
    const [habits, completions, challenges, challengeRecords, ledger, prefs, focusSessions, plantedTrees, discoveries] = await Promise.all([
      db.habits.toArray(),
      db.completions.toArray(),
      db.challenges.toArray(),
      db.challengeRecords.toArray(),
      db.ledger.toArray(),
      db.preferences.get('preferences'),
      db.focusSessions.toArray(),
      db.plantedTrees.toArray(),
      db.discoveries.toArray(),
    ])
    return {
      habits: habits.filter(live),
      completions: completions.filter(live),
      challenges: challenges.filter(live),
      challengeRecords: challengeRecords.filter(live),
      ledger: ledger.filter(live),
      focusSessions: focusSessions.filter(live),
      plantedTrees: plantedTrees.filter(live),
      discoveries: discoveries.filter(live),
      weekStartsOn: prefs?.weekStartsOn ?? 1,
    }
  }, [])
}

/** Today's date key, refreshed when the app regains focus (handles overnight and PWA resume). */
export function useToday(): string {
  const [today, setToday] = useState(todayKey())
  useEffect(() => {
    const refresh = () => setToday(todayKey())
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return today
}

/** Re-renders while `running`. Displayed time must always be computed from timestamps, never from ticks. */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 500)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [running])
  return now
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Matches the breakpoint where the layout switches from bottom navigation to the sidebar. */
export const useIsPhone = () => useMediaQuery('(max-width: 767px)')
