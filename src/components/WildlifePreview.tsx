import { useEffect, useRef } from 'react'
import { wildlifeCanvas } from '../game/pixel'

/** Wildlife sprite drawn with nearest-neighbour scaling. */
export function WildlifePreview({ id, scale = 5, label }: { id: string; scale?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const sprite = wildlifeCanvas(id)
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
