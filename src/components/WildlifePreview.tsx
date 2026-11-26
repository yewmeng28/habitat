import { useEffect, useRef } from 'react'
import { wildlifeCanvas } from '../game/pixel'

/** Wildlife sprite drawn with nearest-neighbour scaling. */
/** Sprites range from a firefly to an elephant, so the scale is chosen to fit a 72px box unless given. */
export function WildlifePreview({ id, scale: given, label }: { id: string; scale?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const sprite = wildlifeCanvas(id)
  const scale = given ?? Math.max(1, Math.min(6, Math.floor(72 / Math.max(sprite.width, sprite.height))))
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(sprite, 0, 0)
  }, [sprite])
  return (
    <canvas ref={ref} className="tree-preview" width={sprite.width} height={sprite.height}
      style={{ width: sprite.width * scale, height: sprite.height * scale }} role="img" aria-label={label} />
  )
}
