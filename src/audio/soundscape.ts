/**
 * A gentle, generated soundscape per biome (wind, birds, frogs, bells...) and optional slow music. Everything is
 * synthesised with the Web Audio API, so there are no audio files to download and it works offline.
 *
 * Browsers only allow audio after a tap or key press, so nothing starts on its own: the context is created and
 * resumed from a user gesture (the Settings toggle, or the first touch afterwards).
 */

const PENTATONIC = [0, 2, 4, 7, 9]
export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12)
/** A pitch from the major pentatonic scale, which never sounds wrong however notes are combined. */
export const pentatonic = (base: number, step: number) => base + 12 * Math.floor(step / 5) + PENTATONIC[((step % 5) + 5) % 5]

const MUSIC_ROOT: Record<string, number> = { woodland: 60, tundra: 62, savannah: 57, marsh: 55, skybound: 67, fairy: 64 }

let ctx: AudioContext | null = null
let volume = 0.5

export function audioSupported(): boolean {
  return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)
}

function context(): AudioContext | null {
  if (!audioSupported()) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  return ctx
}

/** Call from a tap or key press so the browser lets sound play. */
export function unlockAudio() {
  void context()?.resume()
}

export interface SoundOptions {
  biomeId: string
  night: boolean
  sound: boolean
  music: boolean
  volume: number
}

export function setSoundscapeVolume(v: number) {
  volume = v
  current?.setVolume(v)
}

let current: Scape | null = null

/** Starts the soundscape and returns a function that stops it. */
export function startSoundscape(opts: SoundOptions): () => void {
  const c = context()
  if (!c) return () => {}
  volume = opts.volume
  const scape = new Scape(c, opts)
  current = scape
  // until the first tap or key press the browser keeps the context suspended; resume then
  if (c.state === 'suspended') {
    const go = () => void c.resume()
    window.addEventListener('pointerdown', go, { once: true })
    window.addEventListener('keydown', go, { once: true })
  }
  return () => {
    scape.stop()
    if (current === scape) current = null
  }
}

class Scape {
  private master: GainNode
  private timers: number[] = []
  private nodes: AudioNode[] = []
  private noise: AudioBuffer
  private stopped = false
  private c: AudioContext
  private o: SoundOptions
  private onVisibility = () => {
    if (document.hidden) void this.c.suspend()
    else void this.c.resume()
  }

  constructor(c: AudioContext, o: SoundOptions) {
    this.c = c
    this.o = o
    this.master = c.createGain()
    this.master.gain.value = 0
    this.master.connect(c.destination)
    this.master.gain.setTargetAtTime(volume * 0.5, c.currentTime, 0.6) // fade in
    this.noise = this.makeNoise()
    document.addEventListener('visibilitychange', this.onVisibility)
    if (o.sound) this.environment()
    if (o.music) this.music()
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(v * 0.5, this.c.currentTime, 0.1)
  }

  stop() {
    this.stopped = true
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.timers.forEach((t) => window.clearTimeout(t))
    this.master.gain.setTargetAtTime(0, this.c.currentTime, 0.25) // fade out, then free everything
    window.setTimeout(() => {
      this.nodes.forEach((n) => {
        try {
          if ('stop' in n) (n as AudioScheduledSourceNode).stop()
          n.disconnect()
        } catch {
          /* already stopped */
        }
      })
      this.master.disconnect()
    }, 1200)
  }

  // ---- building blocks ----
  private makeNoise() {
    const buf = this.c.createBuffer(1, this.c.sampleRate * 2, this.c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  private every(minMs: number, maxMs: number, fn: () => void) {
    const tick = () => {
      if (this.stopped) return
      fn()
      this.timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)))
    }
    this.timers.push(window.setTimeout(tick, Math.random() * minMs))
  }

  /** Continuous wind: looping noise through a band-pass filter whose level slowly swells and fades. */
  private wind(freq: number, q: number, level: number) {
    const src = this.c.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const filter = this.c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = q
    const gain = this.c.createGain()
    gain.gain.value = level
    const lfo = this.c.createOscillator()
    lfo.frequency.value = 0.07 + Math.random() * 0.05
    const depth = this.c.createGain()
    depth.gain.value = level * 0.6
    lfo.connect(depth).connect(gain.gain)
    src.connect(filter).connect(gain).connect(this.master)
    src.start()
    lfo.start()
    this.nodes.push(src, filter, gain, lfo, depth)
  }

  private tone(type: OscillatorType, from: number, to: number, start: number, dur: number, peak: number, filterHz?: number) {
    const t = this.c.currentTime + start
    const osc = this.c.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = this.c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    let out: AudioNode = osc
    if (filterHz) {
      const f = this.c.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = filterHz
      osc.connect(f)
      out = f
    }
    out.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  private chirp() {
    const base = 2400 + Math.random() * 1200
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) this.tone('sine', base, base * 1.35, i * 0.14, 0.1, 0.12)
  }
  private cricket() {
    for (let i = 0; i < 9; i++) this.tone('sine', 4300, 4300, i * 0.06, 0.04, 0.04)
  }
  private croak() {
    for (let i = 0; i < 2; i++) this.tone('sawtooth', 190, 110, i * 0.22, 0.16, 0.1, 700)
  }
  private bell(root: number) {
    const f = midiToHz(pentatonic(root, Math.floor(Math.random() * 8)))
    this.tone('sine', f, f, 0, 2.6, 0.1)
    this.tone('sine', f * 2.01, f * 2.01, 0, 1.6, 0.04)
  }
  private chime() {
    const f = midiToHz(pentatonic(84, Math.floor(Math.random() * 6)))
    this.tone('sine', f, f, 0, 1.8, 0.06)
  }
  private whistle() {
    this.tone('sine', 400, 340, 0, 1.6, 0.03)
  }
  private cicada() {
    const src = this.c.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const f = this.c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 5200
    f.Q.value = 4
    const g = this.c.createGain()
    const t = this.c.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.025, t + 0.4)
    g.gain.setValueAtTime(0.025, t + 2.4)
    g.gain.linearRampToValueAtTime(0, t + 3)
    src.connect(f).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + 3.1)
  }

  /** Wind plus the occasional creature sounds of the biome, which change between day and night. */
  private environment() {
    const { biomeId, night } = this.o
    switch (biomeId) {
      case 'tundra':
        this.wind(320, 0.5, 0.07)
        this.every(9000, 18000, () => this.whistle())
        break
      case 'savannah':
        this.wind(700, 0.6, 0.035)
        this.every(5000, 9000, () => (night ? this.cricket() : this.cicada()))
        if (!night) this.every(7000, 13000, () => this.chirp())
        break
      case 'marsh':
        this.wind(450, 0.6, 0.035)
        this.every(3000, 7000, () => this.croak())
        if (night) this.every(2500, 5000, () => this.cricket())
        break
      case 'skybound':
        this.wind(900, 0.5, 0.06)
        this.every(4000, 8000, () => this.chime())
        break
      case 'fairy':
        this.wind(600, 0.8, 0.02)
        this.every(3000, 7000, () => this.bell(64))
        break
      default:
        this.wind(500, 0.7, 0.045)
        this.every(night ? 2500 : 4000, night ? 5000 : 9000, () => (night ? this.cricket() : this.chirp()))
    }
  }

  /** Slow generative pad: a low drone and soft pentatonic notes that rise and fall, never repeating exactly. */
  private music() {
    const root = MUSIC_ROOT[this.o.biomeId] ?? 60
    const drone = this.c.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = midiToHz(root - 24)
    const dg = this.c.createGain()
    dg.gain.value = 0.02
    drone.connect(dg).connect(this.master)
    drone.start()
    this.nodes.push(drone, dg)
    let step = 3
    this.every(2500, 4500, () => {
      step = Math.max(-2, Math.min(9, step + Math.floor(Math.random() * 5) - 2))
      const f = midiToHz(pentatonic(root, step))
      this.tone('sine', f, f, 0, 4.5, 0.05)
      this.tone('sine', f * 1.003, f * 1.003, 0.05, 4.5, 0.03) // slight detune for warmth
    })
  }
}
