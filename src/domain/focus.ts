import { GROWTH_STAGES, type FocusSession, type GrowthStage } from './types'

type TimerFields = Pick<FocusSession, 'startedAt' | 'pausedAt' | 'pausedMs' | 'endedAt' | 'plannedSeconds'>

/**
 * Elapsed focus time, derived purely from timestamps. Never from counting ticks, so it stays
 * correct after a refresh or iOS suspending the app.
 */
export function elapsedMs(s: TimerFields, nowMs: number): number {
  const end = s.endedAt ? Date.parse(s.endedAt) : s.pausedAt ? Date.parse(s.pausedAt) : nowMs
  return Math.max(0, end - Date.parse(s.startedAt) - s.pausedMs)
}

export function remainingMs(s: TimerFields, nowMs: number): number {
  return Math.max(0, s.plannedSeconds * 1000 - elapsedMs(s, nowMs))
}

export function progress(s: TimerFields, nowMs: number): number {
  return Math.min(1, elapsedMs(s, nowMs) / (s.plannedSeconds * 1000))
}

export function isFinished(s: TimerFields, nowMs: number): boolean {
  return elapsedMs(s, nowMs) >= s.plannedSeconds * 1000
}

/** The moment the full duration was reached; used as endedAt when a session finishes while the app was closed. */
export function finishTimeMs(s: TimerFields): number {
  return Date.parse(s.startedAt) + s.pausedMs + s.plannedSeconds * 1000
}

const STAGE_STARTS = [0, 0.2, 0.45, 0.7, 0.95] as const

/** Growth stage for a given progress. Mature is only reached right at the end. */
export function stageForProgress(p: number): GrowthStage {
  let idx = 0
  STAGE_STARTS.forEach((start, i) => {
    if (p >= start) idx = i
  })
  return GROWTH_STAGES[idx]
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const PRESET_MINUTES = [15, 25, 45, 60] as const
export const MIN_MINUTES = 1
export const MAX_MINUTES = 240

/** Nature Energy for a completed session: one per focused minute. */
export const sessionReward = (plannedSeconds: number) => Math.round(plannedSeconds / 60)
