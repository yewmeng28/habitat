import { Suspense, lazy, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { FloatingMenu } from './components/FloatingMenu'
import { RotatePrompt } from './components/RotatePrompt'
import { FocusBar } from './components/FocusBar'
import { ACHIEVEMENTS, getWildlife } from './data/collection'
import { getSpecies } from './data/species'
import { remainingMs } from './domain/focus'
import type { Discovery, PlantedTree } from './domain/types'
import { ChallengesPage } from './features/challenges/ChallengesPage'
import { CollectionPage } from './features/collection/CollectionPage'
import { FocusPage } from './features/focus/FocusPage'
import { GrowthPage } from './features/growth/GrowthPage'
import { HabitatPage } from './features/habitat/HabitatPage'
import { InsightsPage } from './features/insights/InsightsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { useAppData, useIsPhone } from './hooks'
import { settleOpenSession } from './persistence/focusRepo'
import { syncDiscoveries } from './persistence/progressRepo'

// Dev-only: import.meta.env.DEV is statically false in production builds, so this module is dropped from the bundle.
const DevToolsPage = import.meta.env.DEV ? lazy(() => import('./dev/DevToolsPage')) : null

function describe(d: Discovery): string {
  if (d.kind === 'species') return `${getSpecies(d.itemId)?.name ?? d.itemId} unlocked`
  if (d.kind === 'wildlife') return `${getWildlife(d.itemId)?.name ?? d.itemId} arrived`
  return ACHIEVEMENTS.find((a) => a.id === d.itemId)?.name ?? d.itemId
}

const NAV = [
  { to: '/habitat', label: 'Habitat', icon: 'M12 3 4 20h16L12 3Zm0 6 4 8H8l4-8Z' },
  { to: '/growth', label: 'Growth', icon: 'M12 21V10m0 0c0-4 3-6 7-6 0 4-3 6-7 6Zm0 4c0-3-2-5-6-5 0 3 2 5 6 5Z' },
  { to: '/focus', label: 'Focus', icon: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3v5l3 2' },
  { to: '/challenges', label: 'Challenges', icon: 'M5 20 12 4l7 16H5Zm7-10v4m0 2v.01' },
  { to: '/collection', label: 'Collection', icon: 'M4 5h7v7H4V5Zm9 0h7v7h-7V5ZM4 14h7v5H4v-5Zm9 0h7v5h-7v-5Z' },
  { to: '/insights', label: 'Insights', icon: 'M5 20V10m7 10V4m7 16v-7' },
]

export default function App() {
  const data = useAppData()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isPhone = useIsPhone()
  const [toast, setToast] = useState<Discovery[]>([])
  const [planted, setPlanted] = useState<PlantedTree | null>(null)
  // Minimising is tied to one session, so the next session always starts full-screen.
  const [minimisedFor, setMinimisedFor] = useState<string | null>(null)
  const [navFaded, setNavFaded] = useState(false)

  const open = data?.focusSessions.find((s) => s.status === 'active' || s.status === 'paused')
  const minimised = !!open && minimisedFor === open.id
  const immersiveFocus = !!open && pathname === '/focus' && !minimised
  const immersiveHabitat = isPhone && pathname === '/habitat'

  // Record anything newly earned whenever progress changes. Idempotent, so repeat runs are harmless.
  const progressKey = data ? `${data.plantedTrees.length}|${data.focusSessions.length}|${data.completions.length}|${data.habits.length}` : ''
  useEffect(() => {
    if (!progressKey) return
    syncDiscoveries()
      .then((created) => created.length && setToast((t) => [...t, ...created]))
      .catch(() => {})
  }, [progressKey])

  // App-level so a minimised session still finishes (and plants) on any screen, and a session that
  // ended while the app was closed is settled on launch. Safe to run repeatedly: completion is idempotent.
  const openId = open?.id
  const openStatus = open?.status
  const openStartedAt = open?.startedAt
  const openPausedMs = open?.pausedMs
  useEffect(() => {
    if (!open || open.status !== 'active') return
    const check = () => settleOpenSession().then((t) => t && setPlanted(t)).catch(() => {})
    check()
    const timer = window.setTimeout(check, remainingMs(open, Date.now()) + 100)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, openStatus, openStartedAt, openPausedMs])

  // Floating nav on the full-screen habitat fades after a few idle seconds; any touch brings it back.
  useEffect(() => {
    if (!immersiveHabitat) return
    let timer = window.setTimeout(() => setNavFaded(true), 4000)
    const wake = () => {
      setNavFaded(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setNavFaded(true), 4000)
    }
    document.addEventListener('pointerdown', wake)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', wake)
      setNavFaded(false)
    }
  }, [immersiveHabitat])

  const energy = data?.ledger.reduce((s, l) => s + l.amount, 0) ?? 0
  const showToast = toast.length > 0 && !open // hold discoveries back until the session is over

  return (
    <div className={`shell ${immersiveFocus ? 'immersive-focus' : ''} ${immersiveHabitat ? 'immersive-habitat' : ''} ${navFaded ? 'nav-faded' : ''}`}>
      <aside className={`nav ${navFaded ? 'faded' : ''}`} aria-label="Primary">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Habitat</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="nav-link" onClick={() => n.to === '/focus' && setMinimisedFor(null)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={n.icon} />
              </svg>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className="nav-link nav-settings">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M3 12h3m12 0h3" />
          </svg>
          <span>Settings</span>
        </NavLink>
      </aside>

      <RotatePrompt />
      {immersiveHabitat && (
        <FloatingMenu items={NAV} session={open} faded={navFaded} onItemClick={(to) => to === '/focus' && setMinimisedFor(null)} />
      )}

      <main className="main">
        <header className="topbar">
          <NavLink to="/settings" className="topbar-settings" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M3 12h3m12 0h3" />
            </svg>
          </NavLink>
          <div className="energy" title="Nature Energy">
            <span className="energy-dot" aria-hidden="true" />
            <strong>{energy}</strong> NE
          </div>
        </header>
        {open && !immersiveFocus && !immersiveHabitat && <FocusBar session={open} onReturn={() => setMinimisedFor(null)} />}
        {planted && !open && pathname !== '/focus' && (
          <div className="toast planted-toast" role="status">
            <div>
              <strong>A {getSpecies(planted.speciesId)?.name} was planted!</strong>
              <p className="small">Your focus session is complete.</p>
            </div>
            <NavLink to="/habitat" className="btn" onClick={() => setPlanted(null)}>See it</NavLink>
            <button className="btn" onClick={() => setPlanted(null)} aria-label="Dismiss">✕</button>
          </div>
        )}
        {showToast && (
          <div className="toast" role="status">
            <div>
              <strong>{toast.length === 1 ? 'New discovery!' : `${toast.length} new discoveries!`}</strong>
              <p className="small">{toast.slice(0, 3).map(describe).join(' · ')}{toast.length > 3 ? ' …' : ''}</p>
            </div>
            <NavLink to="/collection" className="btn" onClick={() => setToast([])}>View</NavLink>
            <button className="btn" onClick={() => setToast([])} aria-label="Dismiss">✕</button>
          </div>
        )}
        {!data ? (
          <p className="muted pad">Loading…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/growth" replace />} />
            <Route path="/growth" element={<GrowthPage data={data} />} />
            <Route path="/challenges" element={<ChallengesPage data={data} />} />
            <Route path="/insights" element={<InsightsPage data={data} />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/habitat" element={<HabitatPage data={data} />} />
            <Route
              path="/focus"
              element={
                <FocusPage
                  data={data}
                  planted={planted}
                  onDismissPlanted={() => setPlanted(null)}
                  onMinimise={() => {
                    if (!open) return
                    navigate('/growth')
                    setMinimisedFor(open.id)
                  }}
                />
              }
            />
            <Route path="/collection" element={<CollectionPage data={data} />} />
            {DevToolsPage && (
              <Route path="/test" element={<Suspense fallback={null}><DevToolsPage data={data} /></Suspense>} />
            )}
            <Route path="*" element={<Navigate to="/growth" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
