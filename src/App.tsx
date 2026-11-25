import { NavLink, Navigate, Route, Routes } from 'react-router'
import { useAppData } from './hooks'
import { ChallengesPage } from './features/challenges/ChallengesPage'
import { GrowthPage } from './features/growth/GrowthPage'
import { InsightsPage } from './features/insights/InsightsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ComingSoon } from './components/ComingSoon'
import { FocusPage } from './features/focus/FocusPage'
import { HabitatPage } from './features/habitat/HabitatPage'

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
  const energy = data?.ledger.reduce((s, l) => s + l.amount, 0) ?? 0

  return (
    <div className="shell">
      <aside className="nav" aria-label="Primary">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Habitat</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="nav-link">
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
            <Route path="/focus" element={<FocusPage data={data} />} />
            <Route
              path="/collection"
              element={<ComingSoon title="Collection" phase="Phase 3" text="Species, wildlife and discoveries will be collected here." />}
            />
            <Route path="*" element={<Navigate to="/growth" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
