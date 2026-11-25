import type { DateKey } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now)
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

export function dayOfWeek(key: DateKey): number {
  return fromDateKey(key).getDay()
}

/** Start of the week containing `key`. */
export function weekStart(key: DateKey, weekStartsOn: 0 | 1 = 1): DateKey {
  const diff = (dayOfWeek(key) - weekStartsOn + 7) % 7
  return addDays(key, -diff)
}

/** Inclusive list of date keys from `from` to `to`. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  return toDateKey(fromDateKey(key)) === key
}
