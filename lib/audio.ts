'use client'

// Procedural background music + SFX using the Web Audio API.
// Two separate gain channels: musicMaster (background music) and sfxMaster (effects),
// so they can be muted independently.

const C_MAJ = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]
const G_MAJ = [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99]
const F_MAJ = [349.23, 392.0, 440.0, 466.16, 523.25, 587.33, 698.46, 698.46]

const PATTERNS: number[][] = [
  [0, 2, 4, 2, 0, 4, 7, 4],
  [0, 4, 7, 4, 5, 4, 2, 0],
  [7, 5, 4, 2, 4, 5, 7, 4],
  [0, 0, 4, 4, 5, 5, 4, 2],
  [4, 2, 0, 2, 4, 5, 7, 5],
  [0, 2, 4, 5, 4, 2, 0, -1],
]

const TARGET_VOLUME = 0.16

class MusicEngine {
  private ctx: AudioContext | null = null
  private musicMaster: GainNode | null = null
  private sfxMaster: GainNode | null = null
  private timer: number | null = null
  private playing = false
  private trackIndex = 0
  private musicOn = true
  private sfxOn = true

  get isPlaying() { return this.playing }

  private ensureContext() {
    if (this.ctx) return
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new Ctor()
      this.musicMaster = this.ctx.createGain()
      this.musicMaster.gain.value = this.musicOn ? TARGET_VOLUME : 0
      this.musicMaster.connect(this.ctx.destination)
      this.sfxMaster = this.ctx.createGain()
      this.sfxMaster.gain.value = this.sfxOn ? 1 : 0
      this.sfxMaster.connect(this.ctx.destination)
    } catch {
      this.ctx = null; this.musicMaster = null; this.sfxMaster = null
    }
  }

  setMusicOn(on: boolean) {
    this.musicOn = on
    if (this.musicMaster && this.ctx) {
      const now = this.ctx.currentTime
      this.musicMaster.gain.cancelScheduledValues(now)
      this.musicMaster.gain.setValueAtTime(Math.max(0.0001, this.musicMaster.gain.value), now)
      this.musicMaster.gain.linearRampToValueAtTime(on ? TARGET_VOLUME : 0.0001, now + 0.25)
    }
    if (on) this.start()
    else this.stop()
  }
  setSfxOn(on: boolean) {
    this.sfxOn = on
    if (this.sfxMaster && this.ctx) {
      const now = this.ctx.currentTime
      this.sfxMaster.gain.cancelScheduledValues(now)
      this.sfxMaster.gain.setValueAtTime(Math.max(0.0001, this.sfxMaster.gain.value), now)
      this.sfxMaster.gain.linearRampToValueAtTime(on ? 1 : 0.0001, now + 0.15)
    }
  }
  get musicOnState() { return this.musicOn }
  get sfxOnState() { return this.sfxOn }

  start() {
    this.ensureContext()
    if (!this.ctx || !this.musicMaster) return
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    this.playing = true
    const now = this.ctx.currentTime
    this.musicMaster.gain.cancelScheduledValues(now)
    this.musicMaster.gain.setValueAtTime(Math.max(0.0001, this.musicMaster.gain.value), now)
    this.musicMaster.gain.linearRampToValueAtTime(this.musicOn ? TARGET_VOLUME : 0.0001, now + 0.4)
    if (this.timer == null) this.scheduleLoop()
  }

  stop() {
    this.playing = false
    if (this.ctx && this.musicMaster) {
      const now = this.ctx.currentTime
      this.musicMaster.gain.cancelScheduledValues(now)
      this.musicMaster.gain.setValueAtTime(this.musicMaster.gain.value, now)
      this.musicMaster.gain.linearRampToValueAtTime(0.0001, now + 0.25)
    }
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
  }

  private melody: number[] | null = null
  private melodyIdx = 0
  setMelody(freqs: number[] | null) {
    this.melody = freqs && freqs.length ? freqs : null
    this.melodyIdx = 0
  }

  private scheduleLoop = () => {
    if (!this.playing || !this.ctx || !this.musicMaster) { this.timer = null; return }
    if (this.melody && this.melody.length) {
      const beat = 0.32
      let t = this.ctx.currentTime + 0.06
      for (let i = 0; i < 8; i++) {
        const freq = this.melody[this.melodyIdx % this.melody.length]
        this.melodyIdx++
        if (freq > 0) {
          this.playNote(freq, t, beat * 0.9)
          if (i % 2 === 0) this.playBass(freq / 2, t, beat * 1.7)
        }
        t += beat
      }
      this.timer = window.setTimeout(this.scheduleLoop, 8 * beat * 1000)
      return
    }
    const scales = [C_MAJ, G_MAJ, F_MAJ]
    const scale = scales[this.trackIndex % scales.length]
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
    const bpm = 92 + Math.random() * 28
    const beat = 60 / bpm
    let t = this.ctx.currentTime + 0.06
    for (let i = 0; i < pattern.length; i++) {
      const idx = pattern[i]
      if (idx >= 0) {
        const freq = scale[Math.min(idx, scale.length - 1)]
        this.playNote(freq, t, beat * 0.9)
      }
      if (i % 2 === 0) this.playBass(scale[0] / 2, t, beat * 1.7)
      t += beat
    }
    this.timer = window.setTimeout(this.scheduleLoop, pattern.length * beat * 1000)
    this.trackIndex++
  }

  private playNote(freq: number, start: number, dur: number) {
    if (!this.ctx || !this.musicMaster) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.5, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain); gain.connect(this.musicMaster)
    osc.start(start); osc.stop(start + dur + 0.05)
  }
  private playBass(freq: number, start: number, dur: number) {
    if (!this.ctx || !this.musicMaster) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.35, start + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain); gain.connect(this.musicMaster)
    osc.start(start); osc.stop(start + dur + 0.05)
  }

  // SFX routed through sfxMaster
  blip(type: 'good' | 'bad' | 'click' | 'win') {
    if (!this.ctx || !this.sfxMaster || !this.sfxOn) return
    const now = this.ctx.currentTime
    const map = {
      good: [659.25, 880.0], bad: [220.0, 174.61], click: [523.25], win: [523.25, 659.25, 783.99, 1046.5],
    } as const
    map[type].forEach((f, i) => this.playSfxNote(f, now + i * 0.12, 0.18))
  }

  sfx(type: 'jump' | 'coin' | 'hurt' | 'pop' | 'note' | 'star' | 'duck' | 'place' | 'tick' | 'whoosh' | 'perfect') {
    if (!this.ctx || !this.sfxMaster || !this.sfxOn) return
    const now = this.ctx.currentTime
    if (type === 'jump') {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain()
      o.type = 'square'; o.frequency.setValueAtTime(330, now); o.frequency.exponentialRampToValueAtTime(660, now + 0.12)
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.32, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
      o.connect(g); g.connect(this.sfxMaster); o.start(now); o.stop(now + 0.2)
    } else if (type === 'coin') { this.playSfxNote(988, now, 0.09); this.playSfxNote(1319, now + 0.08, 0.14) }
    else if (type === 'hurt') {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain()
      o.type = 'sawtooth'; o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(80, now + 0.3)
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.28, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
      o.connect(g); g.connect(this.sfxMaster); o.start(now); o.stop(now + 0.34)
    } else if (type === 'pop') { this.playSfxNote(880, now, 0.07); this.playSfxNote(1175, now + 0.05, 0.1) }
    else if (type === 'note') { this.playSfxNote(784, now, 0.22) }
    else if (type === 'star') { ;[523, 659, 784, 1047].forEach((f, i) => this.playSfxNote(f, now + i * 0.1, 0.16)) }
    else if (type === 'duck') {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain()
      o.type = 'sine'; o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(220, now + 0.1)
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.22, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
      o.connect(g); g.connect(this.sfxMaster); o.start(now); o.stop(now + 0.14)
    } else if (type === 'place') { this.playSfxNote(659, now, 0.06); this.playSfxNote(988, now + 0.05, 0.12) }
    else if (type === 'tick') { this.playSfxNote(523, now, 0.04) }
    else if (type === 'whoosh') {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain()
      o.type = 'triangle'; o.frequency.setValueAtTime(200, now); o.frequency.linearRampToValueAtTime(600, now + 0.2)
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.16, now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      o.connect(g); g.connect(this.sfxMaster); o.start(now); o.stop(now + 0.24)
    } else if (type === 'perfect') {
      // sparkly arpeggio
      ;[784, 1047, 1319, 1568].forEach((f, i) => this.playSfxNote(f, now + i * 0.06, 0.18))
    }
  }

  private playSfxNote(freq: number, start: number, dur: number) {
    if (!this.ctx || !this.sfxMaster) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.4, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain); gain.connect(this.sfxMaster)
    osc.start(start); osc.stop(start + dur + 0.05)
  }

  // play a specific note through sfxMaster (for music memory & rhythm)
  playTone(freq: number, duration = 0.35) {
    if (!this.ctx || !this.sfxMaster || !this.sfxOn) return
    const now = this.ctx.currentTime
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, now)
    g.gain.linearRampToValueAtTime(0.4, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    o.connect(g); g.connect(this.sfxMaster)
    o.start(now); o.stop(now + duration + 0.05)
  }
}

export const music = new MusicEngine()
