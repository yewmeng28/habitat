import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { todayKey } from './domain/dates'
import type {
  Challenge, ChallengeRecord, FocusSession, Habit, HabitCompletion, LedgerEntry, PlantedTree,
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
  weekStartsOn: 0 | 1
}

/** Live view of all local data; re-renders whenever IndexedDB changes. undefined while loading. */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => {
    const live = <T extends { deletedAt: string | null }>(r: T) => !r.deletedAt
    const [habits, completions, challenges, challengeRecords, ledger, prefs, focusSessions, plantedTrees] = await Promise.all([
      db.habits.toArray(),
      db.completions.toArray(),
      db.challenges.toArray(),
      db.challengeRecords.toArray(),
      db.ledger.toArray(),
      db.preferences.get('preferences'),
      db.focusSessions.toArray(),
      db.plantedTrees.toArray(),
    ])
    return {
      habits: habits.filter(live),
      completions: completions.filter(live),
      challenges: challenges.filter(live),
      challengeRecords: challengeRecords.filter(live),
      ledger: ledger.filter(live),
      focusSessions: focusSessions.filter(live),
      plantedTrees: plantedTrees.filter(live),
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
