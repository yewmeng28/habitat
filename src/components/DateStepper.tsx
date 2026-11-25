import { addDays, fromDateKey, todayKey } from '../domain/dates'

function formatDate(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Lets the user view/record any past day; the future is not selectable. */
export function DateStepper({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayKey()
  return (
    <div className="stepper" role="group" aria-label="Choose day">
      <button className="btn icon" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day">‹</button>
      <span className="stepper-label">{date === today ? 'Today' : formatDate(date)}</span>
      <button className="btn icon" onClick={() => onChange(addDays(date, 1))} disabled={date >= today} aria-label="Next day">›</button>
    </div>
  )
}
