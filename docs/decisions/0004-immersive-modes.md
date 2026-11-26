# ADR 0004: Immersive Habitat and Focus

## Decisions

- **Shell modes, not new routes.** `App` derives two flags from the route and viewport: `immersiveHabitat` (phone width on `/habitat`) and `immersiveFocus` (a session is open, on `/focus`, and not minimised). They only change CSS classes on the shell, so every screen keeps its URL and the sidebar/bottom bar are unchanged elsewhere.
- **Habitat on phones is full-screen.** The game frame becomes `position: fixed; inset: 0`. The nav turns into a floating translucent pill that fades after 4 idle seconds (never fully hidden, so it stays discoverable) and returns on any touch. The title, area switcher and tree details move into overlays: an area chip and a bottom sheet holding the forest overview. The same frame and host element are used in both layouts, so Phaser is never torn down when the viewport crosses the breakpoint.
- **Taller portrait world (14x24 tiles).** A tall phone filled edge to edge would otherwise show empty bands. Tree positions are fractions, so existing trees only spread a little more vertically. On phones the camera starts at the larger of the zoomed-in start and a "cover" zoom, so there are no bands.
- **Focus is full-screen while running.** Only the growing tree on a terrain backdrop, the time, and Pause/Resume, Minimise, Give up. The screen wake lock is requested while running, where supported, and failure is ignored.
- **Minimise is per session** (`minimisedFor = sessionId`), so a new session always starts full-screen. Minimising shows the normal navigation plus a persistent "Focus in progress, mm:ss" bar on every other screen. The bar is a link back, which clears the flag. The timer needs nothing special because it is timestamp-based.
- **Completion moved to `App`.** A minimised session must still finish and plant on any screen, so `App` owns a watcher (timeout at the remaining time, plus visibility/focus events and one check at launch). It calls the existing idempotent `settleOpenSession`. The resulting tree is held in app state, shown as a banner on other screens and as the "planted" card on Focus.
- **Quiet during a session.** Discovery toasts are held back while a session is open and appear when it ends.

## Known gaps

- Wake Lock support in installed iOS PWAs is not verified.
- The nav fade is touch-driven (`pointerdown`) and has no keyboard-specific behaviour. It stays visible and focusable at reduced opacity.
- Desktop and tablet Habitat keep the sidebar layout (not full-screen).
