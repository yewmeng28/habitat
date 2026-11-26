import { NavLink } from 'react-router'
import { getSpecies } from '../data/species'
import { formatClock, remainingMs } from '../domain/focus'
import type { FocusSession } from '../domain/types'
import { useNow } from '../hooks'

/**
 * A small frosted chip, shown on every other screen while a session runs, so a minimised session is never
 * out of sight but never competes with the screen either. The whole chip is the way back.
 */
export function FocusBar({ session, onReturn }: { session: FocusSession; onReturn: () => void }) {
  const now = useNow(true)
  const paused = session.status === 'paused'
  const time = formatClock(remainingMs(session, now))
  return (
    <NavLink
      to="/focus"
      className={`focus-bar ${paused ? 'paused' : ''}`}
      onClick={onReturn}
      aria-label={`Focus session ${paused ? 'paused' : 'in progress'}, ${getSpecies(session.speciesId)?.name}, ${time} left. Return to session.`}
    >
      <span className="focus-bar-dot" aria-hidden="true" />
      <span aria-hidden="true">{paused ? 'Paused' : 'Focus'}</span>
      <strong className="focus-bar-time" aria-hidden="true">{time}</strong>
    </NavLink>
  )
}
