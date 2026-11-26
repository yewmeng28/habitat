import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { getSpecies } from '../data/species'
import { formatClock, remainingMs } from '../domain/focus'
import type { FocusSession } from '../domain/types'
import { useNow } from '../hooks'

export interface MenuItem {
  to: string
  label: string
  icon: string
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
)
const MENU_ICON = 'M4 7h16M4 12h16M4 17h16'
const CLOSE_ICON = 'M6 6l12 12M18 6 6 18'

/**
 * Menu for the full-screen habitat: one small button at the bottom centre. Tapping it opens a full-screen
 * blurred layer with labelled destinations. A running session shows its time inside the button, and
 * the menu offers a way back to it, so there is no separate banner covering the world.
 */
export function FloatingMenu({
  items, session, faded, onItemClick,
}: { items: MenuItem[]; session?: FocusSession; faded: boolean; onItemClick: (to: string) => void }) {
  const { pathname } = useLocation()
  // Open state is tied to the route it was opened on, so navigating closes the menu with no extra effect.
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === pathname
  const now = useNow(!!session)
  const current = items.find((i) => i.to === pathname)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenPath(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const time = session ? formatClock(remainingMs(session, now)) : ''
  const paused = session?.status === 'paused'

  return (
    <>
      <button
        className={`fm-pill ${faded && !open ? 'faded' : ''}`}
        onClick={() => setOpenPath(open ? null : pathname)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? 'Close menu' : `Menu${session ? `, focus session ${paused ? 'paused' : 'in progress'}, ${time} left` : ''}`}
      >
        <Icon d={open ? CLOSE_ICON : MENU_ICON} />
        <span>{open ? 'Close' : (current?.label ?? 'Menu')}</span>
        {session && !open && (
          <>
            <span className="fm-sep" aria-hidden="true" />
            <span className={`focus-bar-dot ${paused ? 'paused' : ''}`} aria-hidden="true" />
            <strong className="focus-bar-time">{time}</strong>
          </>
        )}
      </button>

      {open && (
        <div className="fm-overlay" role="dialog" aria-modal="true" aria-label="Menu" onClick={() => setOpenPath(null)}>
          <div className="fm-content" onClick={(e) => e.stopPropagation()}>
            {session && (
              <NavLink to="/focus" className="fm-session" onClick={() => onItemClick('/focus')}>
                <span className={`focus-bar-dot ${paused ? 'paused' : ''}`} aria-hidden="true" />
                <span>
                  Focus {paused ? 'paused' : 'in progress'}
                  <span className="small"> · {getSpecies(session.speciesId)?.name}</span>
                </span>
                <strong className="focus-bar-time">{time}</strong>
                <span className="small">Return</span>
              </NavLink>
            )}
            <div className="fm-grid">
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} className="fm-item" onClick={() => onItemClick(i.to)}>
                  <Icon d={i.icon} />
                  <span>{i.label}</span>
                </NavLink>
              ))}
            </div>
            <NavLink to="/settings" className="fm-settings" onClick={() => onItemClick('/settings')}>Settings and backup</NavLink>
          </div>
        </div>
      )}
    </>
  )
}
