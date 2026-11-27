import type { DayNightMode } from './daylight'
import type { Season } from './season'

export type SeasonMode = 'auto' | 'off' | Season
export type QualityMode = 'auto' | 'high' | 'low'
export type MotionMode = 'auto' | 'reduced' | 'full'

/** Display and sound options. Stored on the preferences record; every field is optional there, so old data still loads. */
export interface Display {
  dayNight: DayNightMode
  seasons: SeasonMode
  weather: boolean
  quality: QualityMode
  motion: MotionMode
  sound: boolean
  music: boolean
  clicks: boolean
  volume: number // 0..1
}

export const DEFAULT_DISPLAY: Display = {
  dayNight: 'auto',
  seasons: 'auto',
  weather: true,
  quality: 'auto',
  motion: 'auto',
  sound: false, // sound and music start off: nothing plays until the player asks for it
  music: false,
  clicks: false,
  volume: 0.5,
}

export function resolveDisplay(p?: Partial<Display> | null): Display {
  const d = { ...DEFAULT_DISPLAY, ...(p ?? {}) }
  return { ...d, volume: Math.max(0, Math.min(1, Number.isFinite(d.volume) ? d.volume : DEFAULT_DISPLAY.volume)) }
}

/** Reduced motion if asked for, or if the system asks for it and the player left it on auto. */
export const wantsCalm = (d: Display, systemReduces: boolean) => d.motion === 'reduced' || (d.motion === 'auto' && systemReduces)
/** Lower quality if asked for, or if the device looks modest and the player left it on auto. */
export const wantsLowQuality = (d: Display, modestDevice: boolean) => d.quality === 'low' || (d.quality === 'auto' && modestDevice)
