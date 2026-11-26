import Phaser from 'phaser'
import type { AmbientEffect, AreaTheme } from '../data/biomes'
import type { GrowthStage } from '../domain/types'
import { areaTerrain, type Terrain } from '../domain/terrain'
import { dryPoint, hopTarget, shoreTarget, walkTarget } from '../domain/wildlifeMove'
import { SPRITE_H, SPRITE_W, groundCanvas, treeCanvas, wildlifeFrames, worldSize, type WorldShape, type WorldSize } from './pixel'

/** The only data the game sees: plain view models. No React, no database, no sync. */
export interface TreeView {
  id: string
  speciesId: string
  stage: GrowthStage
  x: number // 0..1 within the area
  y: number
}

export type Behaviour = 'flutter' | 'hop' | 'perch' | 'shore' | 'walk' | 'glide'

export interface WildlifeView {
  id: string
  behaviour: Behaviour
  count: number
}

export interface AreaView {
  key: string // unique per area, also used to seed its terrain
  biomeId: string
  effect: AmbientEffect // weather drifting over the scene: motes, snow, dust or fog
  theme: AreaTheme
  shape: WorldShape // chosen from the viewport; tree positions are fractions so they work in either
  seed: number
  palette: { grass: string[]; path: string }
  trees: TreeView[]
  wildlife: WildlifeView[]
}

export interface HabitatGameApi {
  setArea(area: AreaView): void
  destroy(): void
}

interface Options {
  onSelectTree: (id: string | null) => void
}

interface Critter {
  s: Phaser.GameObjects.Image
  behaviour: Behaviour
  wait: number
  t: number
  dur: number
  x0: number
  y0: number
  x1: number
  y1: number
  arc: number
  flap: number
  phase: number
  angle: number // position around the pond, for shore animals
  id: string
  frame: string // current texture frame, so we only swap when it changes
}

const MARGIN = 24
/** Phones open centred on the trees rather than the middle of the map. */
const PHONE_MAX_WIDTH = 600
const MAX_ZOOM = 8

class WoodlandScene extends Phaser.Scene {
  private pending: AreaView | null = null
  private ready = false
  private ground?: Phaser.GameObjects.Image
  private treeSprites = new Map<string, Phaser.GameObjects.Image>()
  /** Objects that make up the selection highlight; rebuilt whenever the selection or the tree moves. */
  private highlight: Phaser.GameObjects.GameObject[] = []
  private selectedId: string | null = null
  private currentKey = ''
  private world: WorldSize = worldSize('landscape')
  private terrain: Terrain = areaTerrain('woodland:0')
  private ambient: Phaser.GameObjects.GameObject[] = []
  private critters: Critter[] = []
  private wildlifeKey = ''
  private treePoints: { x: number; y: number }[] = []
  /** Smallest allowed zoom: the world always covers the viewport, so the dark margin is never shown. */
  private minZoom = 1
  private dragged = false
  private pinchDist = 0

  private opts: Options

  constructor(opts: Options) {
    super('woodland')
    this.opts = opts
  }

  create() {
    this.cameras.main.setBackgroundColor('#2a3a24')
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
    const viewKey = `${area.key}|${area.shape}`
    const changedArea = viewKey !== this.currentKey
    this.currentKey = viewKey
    if (changedArea) {
      this.world = worldSize(area.shape)
      this.terrain = areaTerrain(area.key)
    }

    if (changedArea) {
      this.ground?.destroy()
      const key = this.texture(`ground:${viewKey}`, () => groundCanvas(area.key, area.theme, area.palette, area.shape, area.biomeId))
      this.ground = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1)
      this.treeSprites.forEach((s) => s.destroy())
      this.treeSprites.clear()
      this.selectTree(null)
      this.buildAmbient(area.seed, area.effect)
      this.fit(true)
    }

    const seen = new Set<string>()
    for (const t of area.trees) {
      seen.add(t.id)
      const key = this.texture(`tree:${t.speciesId}:${t.stage}`, () => treeCanvas(t.speciesId, t.stage))
      const x = Math.round(MARGIN + t.x * (this.world.w - 2 * MARGIN))
      const y = Math.round(MARGIN + 12 + t.y * (this.world.h - 2 * MARGIN - 12))
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

    // keep the highlight attached if the selected tree was moved or its sprite changed
    if (this.selectedId) this.selectTree(this.treeSprites.has(this.selectedId) ? this.selectedId : null)
    if (changedArea && this.scale.width < PHONE_MAX_WIDTH && this.treeSprites.size > 0) this.centerOnTrees()
    this.treePoints = [...this.treeSprites.values()].map((s) => ({ x: s.x, y: s.y - SPRITE_H * 0.55 }))
    // rebuild critters only when the set of wildlife (or the area) changes, so they don't jump on every new tree
    const wKey = `${viewKey}|${area.wildlife.map((w) => `${w.id}x${w.count}`).join(',')}`
    if (wKey !== this.wildlifeKey) {
      this.wildlifeKey = wKey
      this.spawnWildlife(area.wildlife)
    }
  }

  private spawnWildlife(list: WildlifeView[]) {
    this.critters.forEach((c) => c.s.destroy())
    this.critters = []
    for (const w of list) {
      const frames = wildlifeFrames(w.id)
      const key = this.texture(`wild:${w.id}:idle`, () => frames.idle)
      frames.moving.forEach((f, i) => this.texture(`wild:${w.id}:m${i}`, () => f))
      for (let i = 0; i < w.count; i++) {
        // flyers may start anywhere; ground and shore animals start on dry land, frogs at the pond's edge
        const ang = Math.random() * Math.PI * 2
        const start =
          w.behaviour === 'shore' ? shoreTarget(this.terrain, this.world.w, this.world.h, ang)
          : w.behaviour === 'flutter' || w.behaviour === 'glide' ? { x: MARGIN + Math.random() * (this.world.w - 2 * MARGIN), y: MARGIN + Math.random() * (this.world.h - 2 * MARGIN), angle: ang }
          : { ...dryPoint(this.terrain, this.world.w, this.world.h), angle: ang }
        const { x, y } = start
        const s = this.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, 1).setDepth(y)
        this.critters.push({ s, behaviour: w.behaviour, wait: Math.random() * 2000, t: 0, dur: 0, x0: x, y0: y, x1: x, y1: y, arc: 0, flap: 0, phase: Math.random() * 6, angle: start.angle, id: w.id, frame: 'idle' })
      }
    }
  }

  update(_time: number, delta: number) {
    for (const c of this.critters) this.stepCritter(c, delta)
  }

  /** Picks the sprite frame: wings flap while flying, a leap pose while hopping, a resting pose otherwise. */
  private animate(c: Critter, dt: number, moving: boolean) {
    c.flap += dt
    const frames = wildlifeFrames(c.id).moving.length
    let frame = 'idle'
    if (c.behaviour === 'flutter') frame = `m${Math.floor(c.flap / 110) % frames}` // butterflies never stop flapping
    else if (c.behaviour === 'glide') frame = `m${Math.floor(c.flap / 380) % frames}` // slow, lazy wingbeats
    else if (c.behaviour === 'perch') frame = moving ? `m${Math.floor(c.flap / 70) % frames}` : 'idle' // up, level, down, level: about four beats a second
    else if (c.behaviour === 'walk') frame = moving && Math.floor(c.flap / 230) % 2 ? 'm0' : 'idle' // two-pose stride
    else if (moving) frame = 'm0'
    if (frame !== c.frame) {
      c.frame = frame
      c.s.setTexture(`wild:${c.id}:${frame}`)
    }
  }

  private pickTarget(c: Critter) {
    const { w, h } = this.world
    c.x0 = c.s.x
    c.y0 = c.s.y
    c.arc = 4
    if (c.behaviour === 'perch') {
      // flies between trees; if it has to come down it only lands on dry ground, never in the water
      if (this.treePoints.length && Math.random() < 0.85) {
        const p = this.treePoints[Math.floor(Math.random() * this.treePoints.length)]
        c.x1 = p.x + (Math.random() - 0.5) * 8
        c.y1 = p.y
      } else {
        const p = dryPoint(this.terrain, w, h)
        c.x1 = p.x
        c.y1 = p.y
      }
      c.dur = 900 + Math.hypot(c.x1 - c.x0, c.y1 - c.y0) * 14
      c.arc = 10
    } else if (c.behaviour === 'hop') {
      // ground animals hop on dry land only (crossing the stream by the bridge), or stay put this turn
      const to = hopTarget(this.terrain, w, h, { x: c.x0, y: c.y0 })
      c.x1 = to ? to.x : c.x0
      c.y1 = to ? to.y : c.y0
      c.dur = to ? 320 : 200
    } else if (c.behaviour === 'glide') {
      // sky creatures (cloud rays) drift slowly and smoothly across the whole sky, over the island and beyond it
      c.x1 = MARGIN + Math.random() * (w - 2 * MARGIN)
      c.y1 = MARGIN + Math.random() * (h * 0.7)
      c.dur = 5500 + Math.random() * 4500
      c.arc = 0
    } else if (c.behaviour === 'walk') {
      // big animals (reindeer, zebra, giraffe, elephant) stride on dry ground, slower and further than hoppers
      const to = walkTarget(this.terrain, w, h, { x: c.x0, y: c.y0 })
      c.x1 = to ? to.x : c.x0
      c.y1 = to ? to.y : c.y0
      c.dur = to ? 900 + Math.hypot(c.x1 - c.x0, c.y1 - c.y0) * 38 : 400
      c.arc = 1
    } else if (c.behaviour === 'shore') {
      // animals of the water's edge (frogs, herons) stay on the bank
      const to = shoreTarget(this.terrain, w, h, c.angle)
      c.angle = to.angle
      c.x1 = to.x
      c.y1 = to.y
      c.dur = 360
    } else {
      // butterflies drift anywhere, including over the water
      c.x1 = MARGIN + Math.random() * (w - 2 * MARGIN)
      c.y1 = MARGIN + Math.random() * (h - 2 * MARGIN)
      c.dur = 2200 + Math.random() * 2600
      c.arc = 0
    }
    c.t = 0
    if (Math.abs(c.x1 - c.x0) > 1) c.s.setFlipX(c.x1 < c.x0)
  }

  private stepCritter(c: Critter, dt: number) {
    if (c.wait > 0) {
      c.wait -= dt
      this.animate(c, dt, false)
      return
    }
    if (c.dur === 0) this.pickTarget(c)
    c.t += dt
    const p = Math.min(1, c.t / c.dur)
    const e = c.behaviour === 'flutter' ? p : p * p * (3 - 2 * p)
    let x = c.x0 + (c.x1 - c.x0) * e
    let y = c.y0 + (c.y1 - c.y0) * e - Math.sin(Math.PI * p) * c.arc
    if (c.behaviour === 'flutter') {
      c.phase += dt / 260
      x += Math.cos(c.phase * 1.3) * 5
      y += Math.sin(c.phase) * 4
    }
    this.animate(c, dt, true)
    c.s.setPosition(Math.round(x), Math.round(y))
    // flyers draw above the trees, ground animals sort with them by y
    c.s.setDepth(c.behaviour === 'hop' || c.behaviour === 'shore' || c.behaviour === 'walk' ? y : 50000 + y)
    if (p >= 1) {
      c.dur = 0
      c.wait = c.behaviour === 'glide' ? 100 : c.behaviour === 'walk' ? 900 + Math.random() * 3200 : c.behaviour === 'hop' || c.behaviour === 'shore' ? 400 + Math.random() * 2200 : c.behaviour === 'perch' ? 1500 + Math.random() * 3500 : 200 + Math.random() * 600
    }
  }

  private canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
    return this.texture(key, () => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      draw(c.getContext('2d')!)
      return c
    })
  }

  /** Weather and light for the biome. Everything created here is tracked in `ambient` and cleared on the next area. */
  private buildAmbient(seed: number, effect: AmbientEffect) {
    this.ambient.forEach((o) => {
      this.tweens.killTweensOf(o)
      o.destroy()
    })
    this.ambient = []
    const { w: W, h: H } = this.world
    const rnd = (n: number) => ((Math.sin(seed + n * 12.9898) * 43758.5453) % 1 + 1) % 1
    // effects stay over the terrain, never in the margin around it
    const clip = this.make.graphics({}, false)
    clip.fillRect(0, 0, W, H)
    const mask = clip.createGeometryMask()
    this.ambient.push(clip)

    // dithered, drifting shapes: cloud shadows (woodland, savannah) or mist banks (marsh)
    const drifting = (key: string, w: number, h: number, color: string, count: number, alpha: number, depth: number) => {
      const tex = this.canvasTexture(key, w, h, (g) => {
        g.fillStyle = color
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const dx = (x - w / 2) / (w / 2)
            const dy = (y - h / 2) / (h / 2)
            if (dx * dx + dy * dy < 1 && (x + y) % 2 === 0) g.fillRect(x, y, 1, 1)
          }
      })
      for (let i = 0; i < count; i++) {
        const img = this.add.image(-80 + rnd(i) * W, 30 + rnd(i + 5) * (H - 60), tex).setAlpha(alpha).setDepth(depth).setScale(1.5 + rnd(i + 9))
        img.setMask(mask)
        this.tweens.add({ targets: img, x: W + 90, duration: 70000 + i * 15000, repeat: -1, delay: -rnd(i) * 40000 })
        this.ambient.push(img)
      }
    }

    // small specks that rise, sway and fade in and out (pollen, fireflies)
    const specks = (key: string, color: string, count: number, peak: number, off = 0) => {
      const tex = this.canvasTexture(key, 2, 2, (g) => {
        g.fillStyle = color
        g.fillRect(0, 0, 2, 2)
      })
      for (let i = 0; i < count; i++) {
        const m = this.add.image(rnd(i + 20 + off) * W, rnd(i + 40 + off) * H, tex).setDepth(89000).setAlpha(0.2)
        this.tweens.add({ targets: m, y: m.y - 14 - rnd(i + off) * 12, x: m.x + (rnd(i + 3 + off) - 0.5) * 24, alpha: peak, duration: 2600 + rnd(i + 7 + off) * 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: rnd(i + 11 + off) * 3000 })
        this.ambient.push(m)
      }
    }

    if (effect === 'motes') {
      drifting('cloud-shadow', 64, 32, '#10200f', 3, 0.22, 90000)
      specks('mote', '#f6f0a8', 14, 0.9)
    } else if (effect === 'dust') {
      drifting('heat-shadow', 64, 32, '#6a4a1a', 3, 0.14, 90000)
      // dust and seed fluff blown steadily across the plains
      const tex = this.canvasTexture('dust', 3, 1, (g) => {
        g.fillStyle = '#efdca4'
        g.fillRect(0, 0, 3, 1)
      })
      for (let i = 0; i < 18; i++) {
        const d = this.add.image(rnd(i + 30) * W, rnd(i + 50) * H, tex).setDepth(89000).setAlpha(0.6)
        this.tweens.add({ targets: d, x: W + 10, y: d.y + (rnd(i + 2) - 0.5) * 18, duration: 9000 + rnd(i + 4) * 8000, repeat: -1, delay: -rnd(i) * 9000 })
        this.ambient.push(d)
      }
    } else if (effect === 'snow') {
      const tex = this.canvasTexture('flake', 2, 2, (g) => {
        g.fillStyle = '#ffffff'
        g.fillRect(0, 0, 2, 2)
      })
      for (let i = 0; i < 46; i++) {
        const dur = 7000 + rnd(i + 6) * 6000
        const f = this.add.image(rnd(i + 20) * W, rnd(i + 40) * H, tex).setDepth(91000).setAlpha(0.9)
        // finish the first fall from where the flake starts, then loop from the top
        this.tweens.add({
          targets: f, y: H + 6, duration: dur * (1 - f.y / H),
          onComplete: () => f.active && this.tweens.add({ targets: f, y: { from: -6, to: H + 6 }, duration: dur, repeat: -1 }),
        })
        this.tweens.add({ targets: f, x: f.x + 6 + rnd(i) * 8, duration: 1800 + rnd(i + 9) * 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
        this.ambient.push(f)
      }
    } else if (effect === 'clouds') {
      // cloud wisps sliding across the island, with the odd glint of sun
      drifting('sky-cloud', 64, 32, '#ffffff', 4, 0.5, 90500)
      specks('sky-glint', '#ffffff', 10, 0.9)
    } else if (effect === 'sparkles') {
      // a faint violet haze and drifting points of cyan, pink and gold light
      drifting('spirit-haze', 96, 40, '#7a6ad0', 3, 0.14, 90500)
      specks('spark-cyan', '#7ff0ff', 9, 1)
      specks('spark-pink', '#ff8ad8', 9, 1, 100)
      specks('spark-gold', '#ffe08a', 9, 1, 200)
    } else {
      drifting('mist', 96, 40, '#c4dccb', 5, 0.2, 90500)
      specks('glow', '#8ff0d0', 12, 1)
    }
  }

  // ---- camera ----

  private fit(reset: boolean) {
    const cam = this.cameras.main
    const w = this.scale.width
    const h = this.scale.height
    if (w === 0 || h === 0) return
    this.minZoom = Math.max(w / this.world.w, h / this.world.h)
    if (reset) cam.setZoom(this.minZoom)
    else if (cam.zoom < this.minZoom) cam.setZoom(this.minZoom)
    this.clamp()
    if (reset) cam.centerOn(this.world.w / 2, this.world.h / 2)
  }

  /** Opening view when zoomed in: centre on where the trees are rather than the empty middle. */
  private centerOnTrees() {
    const pts = [...this.treeSprites.values()]
    const cx = pts.reduce((a, t) => a + t.x, 0) / pts.length
    const cy = pts.reduce((a, t) => a + t.y - SPRITE_H / 2, 0) / pts.length
    this.cameras.main.centerOn(cx, cy)
  }

  private clamp() {
    // The camera can only show the terrain itself. Zoom is capped at "cover", so it always fills the viewport.
    this.cameras.main.setBounds(0, 0, this.world.w, this.world.h)
  }

  private zoomBy(f: number) {
    const cam = this.cameras.main
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * f, this.minZoom, MAX_ZOOM))
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
    this.tweens.killTweensOf(this.highlight)
    this.highlight.forEach((o) => o.destroy())
    this.highlight = []
    const s = id ? this.treeSprites.get(id) : null
    if (!s) return

    // A soft pool of light on the ground. It sits just behind the tree, so the trunk stands in it and
    // trees nearer the camera still cover it, like a real ground mark.
    const pool = this.add.graphics().setDepth(s.depth - 0.5)
    pool.fillStyle(0xfff2a8, 0.3).fillEllipse(s.x, s.y - 1, 30, 11)
    pool.lineStyle(1, 0xfff2a8, 0.9).strokeEllipse(s.x, s.y - 1, 30, 11)
    this.tweens.add({ targets: pool, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // A crisp one-pixel outline in the sprite's own pixel grid: four tinted copies offset behind the tree.
    const outline = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) =>
      this.add.image(s.x + dx, s.y + dy, s.texture.key).setOrigin(0.5, 1).setTint(0xfff2a8).setTintMode(Phaser.TintModes.FILL).setDepth(s.depth - 0.2),
    )
    this.highlight = [pool, ...outline]
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
