/**
 * Time of day for the habitat's lighting, from the local clock. Hours are decimal (13.5 is 1:30pm).
 * Full day 07:30 to 17:30, dusk ramps to night by 19:30, night until 05:00, dawn back to day by 07:30.
 */
export interface Daylight {
  /** 0 is full day, 1 is full night. */
  darkness: number
  /** How strong the warm dawn or dusk glow is (0..1). */
  warmth: number
}

const ramp = (h: number, a: number, b: number) => Math.max(0, Math.min(1, (h - a) / (b - a)))

export function daylightAt(date: Date): Daylight {
  const h = date.getHours() + date.getMinutes() / 60
  let darkness: number
  if (h >= 19.5 || h < 5) darkness = 1
  else if (h >= 17.5) darkness = ramp(h, 17.5, 19.5)
  else if (h >= 7.5) darkness = 0
  else darkness = 1 - ramp(h, 5, 7.5)
  // warm light peaks while the sky is changing, and is absent at full day and full night
  const warmth = (4 * darkness * (1 - darkness)) ** 1.2 // exactly 0 at full day and full night
  return { darkness, warmth }
}

export type DayNightMode = 'auto' | 'day' | 'night'

/** The lighting to use: the clock, or a fixed day or night when the player prefers. `floor` keeps magical places dim. */
export function lighting(mode: DayNightMode, now: Date, floor = 0): Daylight {
  const base: Daylight = mode === 'day' ? { darkness: 0, warmth: 0 } : mode === 'night' ? { darkness: 1, warmth: 0 } : daylightAt(now)
  return { darkness: Math.max(base.darkness, floor), warmth: base.warmth }
}

export const isNight = (d: Daylight) => d.darkness >= 0.55
