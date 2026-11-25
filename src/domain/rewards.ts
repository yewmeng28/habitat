import type { DateKey, HabitCategory } from './types'

/** Initial balancing values from the product brief. Configurable data, not logic. */
export const CATEGORY_REWARD_NE: Record<HabitCategory, number> = {
  body: 25,
  mind: 15,
  learning: 20,
  rest: 20,
  creative: 15,
  other: 10,
}

export const CHALLENGE_REWARD_NE = 10

export const habitSourceKey = (habitId: string, date: DateKey) => `habit:${habitId}:${date}`
export const challengeSourceKey = (challengeId: string, date: DateKey) =>
  `challenge:${challengeId}:${date}`
