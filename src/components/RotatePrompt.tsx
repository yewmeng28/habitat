import { useEffect } from 'react'
import { useMediaQuery } from '../hooks'

/**
 * Habitat is a portrait app on touch devices. Browsers can't force rotation (iOS ignores it entirely), so
 * when a phone or tablet is held sideways this covers the app and asks for a rotation. Desktop windows
 * are never affected: they have no pointer-coarse, hover-less input.
 */
export function RotatePrompt() {
  const sideways = useMediaQuery('(orientation: landscape) and (pointer: coarse) and (hover: none)')

  // Where allowed (installed Android PWAs) also lock the orientation properly.
  useEffect(() => {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    if (!o?.lock || !window.matchMedia('(pointer: coarse) and (hover: none)').matches) return
    o.lock('portrait').catch(() => {})
  }, [])

  if (!sideways) return null
  return (
    <div className="rotate-overlay" role="alert">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 16h2" /></svg>
      <p><strong>Rotate your device</strong></p>
      <p className="small">Habitat works in portrait.</p>
    </div>
  )
}
