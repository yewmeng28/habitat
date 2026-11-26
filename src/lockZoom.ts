/**
 * The interface is fixed-size: pinch and double-tap must never zoom the page. Only the habitat world zooms,
 * and it does that itself (Phaser reads the touches on its own canvas).
 *
 * Three layers, because browsers differ:
 *  - the viewport meta tag (Android and desktop honour it; iOS Safari ignores it)
 *  - CSS `touch-action` (blocks pinch and double-tap zoom; set in index.css)
 *  - these WebKit gesture events, which are how iOS pinch-zooms the page
 * Touch and pointer events are unaffected, so the habitat's own pinch-to-zoom still works.
 * Browser zoom from the keyboard (Ctrl and +/-) is deliberately left alone for accessibility.
 */
export function lockPageZoom() {
  const stop = (e: Event) => e.preventDefault()
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, stop, { passive: false })
}
