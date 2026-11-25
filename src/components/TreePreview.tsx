import { useEffect, useRef } from 'react'
import type { GrowthStage } from '../domain/types'
import { SPRITE_H, SPRITE_W, treeCanvas } from '../game/pixel'

/** Draws a tree sprite with nearest-neighbour scaling (no Phaser needed for a single sprite). */
export function TreePreview({ speciesId, stage, scale = 4, label }: { speciesId: string; stage: GrowthStage; scale?: number; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(treeCanvas(speciesId, stage), 0, 0)
  }, [speciesId, stage])
  return (
    <canvas
      ref={ref}
      className="tree-preview"
      width={SPRITE_W}
      height={SPRITE_H}
      style={{ width: SPRITE_W * scale, height: SPRITE_H * scale }}
      role="img"
      aria-label={label ?? `${speciesId} ${stage}`}
    />
  )
}
