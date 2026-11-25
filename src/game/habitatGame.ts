import Phaser from 'phaser'
import type { GrowthStage } from '../domain/types'
import { SPRITE_H, SPRITE_W, WORLD_H, WORLD_W, groundCanvas, treeCanvas } from './pixel'

/** The only data the game sees: plain view models. No React, no database, no sync. */
export interface TreeView {
  id: string
  speciesId: string
  stage: GrowthStage
  x: number // 0..1 within the area
  y: number
}

export interface AreaView {
  key: string // unique per area, also used to seed its terrain
  seed: number
  palette: { grass: string[]; path: string }
  trees: TreeView[]
}

export interface HabitatGameApi {
  setArea(area: AreaView): void
  destroy(): void
}

interface Options {
  onSelectTree: (id: string | null) => void
}

const MARGIN = 24
const MAX_ZOOM = 8

class WoodlandScene extends Phaser.Scene {
  private pending: AreaView | null = null
  private ready = false
  private ground?: Phaser.GameObjects.Image
  private treeSprites = new Map<string, Phaser.GameObjects.Image>()
  private ring?: Phaser.GameObjects.Graphics
  private selectedId: string | null = null
  private currentKey = ''
  private ambient: Phaser.GameObjects.GameObject[] = []
  private fitZoom = 1
  private dragged = false
  private pinchDist = 0

  private opts: Options

  constructor(opts: Options) {
    super('woodland')
    this.opts = opts
  }

  create() {
    this.cameras.main.setBackgroundColor('#2a3a24')
    this.ring = this.add.graphics().setDepth(100000)
    this.input.addPointer(1)
    this.scale.on('resize', () => this.fit(false))
    this.input.on('pointerdown', () => (this.dragged = false))
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p))
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p))
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? 0.87 : 1.15))
    this.ready = true
    if (this.pending) this.applyArea(this.pending)
  }

  setArea(area: AreaView) {
    if (!this.ready) this.pending = area
    else this.applyArea(area)
  }

  private texture(key: string, make: () => HTMLCanvasElement) {
    if (!this.textures.exists(key)) {
      const t = this.textures.addCanvas(key, make())
      t?.setFilter(Phaser.Textures.FilterMode.NEAREST)
    }
    return key
  }

  private applyArea(area: AreaView) {
    const changedArea = area.key !== this.currentKey
    this.currentKey = area.key

    if (changedArea) {
      this.ground?.destroy()
      const key = this.texture(`ground:${area.key}`, () => groundCanvas(area.seed, area.palette))
      this.ground = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1)
      this.treeSprites.forEach((s) => s.destroy())
      this.treeSprites.clear()
      this.selectTree(null)
      this.buildAmbient(area.seed)
      this.fit(true)
    }

    const seen = new Set<string>()
    for (const t of area.trees) {
      seen.add(t.id)
      const key = this.texture(`tree:${t.speciesId}:${t.stage}`, () => treeCanvas(t.speciesId, t.stage))
      const x = Math.round(MARGIN + t.x * (WORLD_W - 2 * MARGIN))
      const y = Math.round(MARGIN + 12 + t.y * (WORLD_H - 2 * MARGIN - 12))
      let s = this.treeSprites.get(t.id)
      if (!s) {
        s = this.add.image(x, y, key).setOrigin(0.5, 1)
        this.treeSprites.set(t.id, s)
        // trees fade up when they first appear
        s.setAlpha(changedArea ? 1 : 0)
        if (!changedArea) this.tweens.add({ targets: s, alpha: 1, duration: 600 })
      } else {
        s.setTexture(key).setPosition(x, y)
      }
      s.setDepth(y)
    }
    for (const [id, s] of this.treeSprites)
      if (!seen.has(id)) {
        s.destroy()
        this.treeSprites.delete(id)
      }
  }

  private buildAmbient(seed: number) {
    this.ambient.forEach((o) => o.destroy())
    this.ambient = []
    const rnd = (n: number) => ((Math.sin(seed + n * 12.9898) * 43758.5453) % 1 + 1) % 1
    // drifting cloud shadows
    const shadowKey = this.texture('cloud-shadow', () => {
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 32
      const g = c.getContext('2d')!
      g.fillStyle = '#10200f'
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 64; x++) {
          const dx = (x - 32) / 32
          const dy = (y - 16) / 16
          if (dx * dx + dy * dy < 1 && (x + y) % 2 === 0) g.fillRect(x, y, 1, 1)
        }
      return c
    })
    // shadows only show over the terrain, never in the margin around it
    const clip = this.make.graphics({}, false)
    clip.fillRect(0, 0, WORLD_W, WORLD_H)
    const mask = clip.createGeometryMask()
    this.ambient.push(clip)
    for (let i = 0; i < 3; i++) {
      const img = this.add.image(-80 + rnd(i) * WORLD_W, 30 + rnd(i + 5) * (WORLD_H - 60), shadowKey)
        .setAlpha(0.22).setDepth(90000).setScale(1.5 + rnd(i + 9))
      img.setMask(mask)
      this.tweens.add({ targets: img, x: WORLD_W + 90, duration: 70000 + i * 15000, repeat: -1, delay: -rnd(i) * 40000 })
      this.ambient.push(img)
    }
    // floating motes (pollen / fireflies)
    const moteKey = this.texture('mote', () => {
      const c = document.createElement('canvas')
      c.width = 2
      c.height = 2
      const g = c.getContext('2d')!
      g.fillStyle = '#f6f0a8'
      g.fillRect(0, 0, 2, 2)
      return c
    })
    for (let i = 0; i < 14; i++) {
      const m = this.add.image(rnd(i + 20) * WORLD_W, rnd(i + 40) * WORLD_H, moteKey).setDepth(89000).setAlpha(0.2)
      this.tweens.add({ targets: m, y: m.y - 14 - rnd(i) * 12, x: m.x + (rnd(i + 3) - 0.5) * 24, alpha: 0.9, duration: 2600 + rnd(i + 7) * 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rnd(i + 11) * 3000 })
      this.ambient.push(m)
    }
  }

  // ---- camera ----

  private fit(reset: boolean) {
    const cam = this.cameras.main
    const w = this.scale.width
    const h = this.scale.height
    if (w === 0 || h === 0) return
    this.fitZoom = Math.min(w / (WORLD_W + 2 * 8), h / (WORLD_H + 2 * 8))
    if (reset || cam.zoom < this.fitZoom) cam.setZoom(this.fitZoom)
    this.clamp()
    if (reset) cam.centerOn(WORLD_W / 2, WORLD_H / 2)
  }

  private clamp() {
    const cam = this.cameras.main
    // allow the world to be centred when smaller than the viewport, and panned when larger
    const vw = cam.width / cam.zoom
    const vh = cam.height / cam.zoom
    const padX = Math.max(8, (vw - WORLD_W) / 2 + 8)
    const padY = Math.max(8, (vh - WORLD_H) / 2 + 8)
    cam.setBounds(-padX, -padY, WORLD_W + padX * 2, WORLD_H + padY * 2)
  }

  private zoomBy(f: number) {
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * f, this.fitZoom, MAX_ZOOM))
    this.clamp()
  }

  private onMove(p: Phaser.Input.Pointer) {
    const { pointer1, pointer2 } = this.input
    if (pointer1.isDown && pointer2.isDown) {
      const d = Phaser.Math.Distance.Between(pointer1.x, pointer1.y, pointer2.x, pointer2.y)
      if (this.pinchDist > 0) this.zoomBy(d / this.pinchDist)
      this.pinchDist = d
      this.dragged = true
      return
    }
    this.pinchDist = 0
    if (!p.isDown) return
    const dx = p.x - p.prevPosition.x
    const dy = p.y - p.prevPosition.y
    if (this.dragged || Math.hypot(p.x - p.downX, p.y - p.downY) > 6) {
      this.dragged = true
      const cam = this.cameras.main
      cam.scrollX -= dx / cam.zoom
      cam.scrollY -= dy / cam.zoom
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    this.pinchDist = 0
    if (this.dragged) return
    const wp = this.cameras.main.getWorldPoint(p.x, p.y)
    let hit: string | null = null
    let best = -Infinity
    for (const [id, s] of this.treeSprites) {
      const left = s.x - SPRITE_W / 2
      const top = s.y - SPRITE_H
      if (wp.x >= left && wp.x <= left + SPRITE_W && wp.y >= top && wp.y <= s.y && s.depth > best) {
        hit = id
        best = s.depth
      }
    }
    this.selectTree(hit)
    this.opts.onSelectTree(hit)
  }

  private selectTree(id: string | null) {
    this.selectedId = id
    this.ring?.clear()
    const s = id ? this.treeSprites.get(id) : null
    if (s && this.ring) {
      this.ring.lineStyle(1, 0xfff2a8, 1)
      this.ring.strokeEllipse(s.x, s.y - 1, 22, 8)
    }
  }

  get selected() {
    return this.selectedId
  }
}

export function createHabitatGame(parent: HTMLElement, opts: Options): HabitatGameApi {
  const scene = new WoodlandScene(opts)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    backgroundColor: '#2a3a24',
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 320, height: parent.clientHeight || 224 },
    scene,
  })
  return {
    setArea: (area) => scene.setArea(area),
    destroy: () => game.destroy(true),
  }
}
