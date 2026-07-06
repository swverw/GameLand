'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, type RunnerCharacter } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, Heart, RotateCcw, ArrowDown, ArrowUp, Check } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'
import { addScore, getScores, formatValue } from '@/lib/leaderboard'

const W = 900
const H = 420
const GROUND_Y = H - 54
const PLAYER_X = 150
const STAND_H = 78 // massive
const DUCK_H = 46
const PLAYER_W = 44 // wide body
const GRAVITY = 1.0
const JUMP_VEL = -16.8

type ObType = 'jump' | 'duck'
interface Obstacle { x: number; type: ObType; variant: string; w: number; h: number; cy?: number; passed?: boolean }
interface Coin { x: number; y: number; taken: boolean }
interface Dust { x: number; y: number; vx: number; vy: number; life: number; r: number }

interface LevelCfg { name: string; emoji: string; bg: string; ground: string; groundDark: string; pencil: string; jumpObjs: string[]; duckObj: string; goalDist: number; endless?: boolean }
const LEVELS: LevelCfg[] = [
  { name: 'castle', emoji: '🏰', bg: '/runner/1.png', ground: '#65a30d', groundDark: '#3f6212', pencil: '#1a2e05', jumpObjs: ['bush', 'log'], duckObj: 'seed', goalDist: 17000 },
  { name: 'beach', emoji: '🏖️', bg: '/runner/2.png', ground: '#eab308', groundDark: '#a16207', pencil: '#3f2f0f', jumpObjs: ['bucket', 'crab'], duckObj: 'ball', goalDist: 19500 },
  { name: 'forest', emoji: '🌲', bg: '/runner/3.png', ground: '#4d7c0f', groundDark: '#365314', pencil: '#1a2e05', jumpObjs: ['mushroom', 'log'], duckObj: 'acorn', goalDist: 22000 },
  { name: 'endless', emoji: '♾️', bg: '/runner/1.png', ground: '#65a30d', groundDark: '#3f6212', pencil: '#1a2e05', jumpObjs: ['bush', 'log', 'mushroom'], duckObj: 'seed', goalDist: 999999, endless: true },
]

interface CharCfg { id: RunnerCharacter; name: string; emoji: string; body: string; bodyDark: string; head: string; cap: string; capDark: string; pants: string }
const CHARACTERS: CharCfg[] = [
  { id: 'hero', name: 'hero', emoji: '🦸', body: '#fbbf24', bodyDark: '#d97706', head: '#fde68a', cap: '#dc2626', capDark: '#991b1b', pants: '#1d4ed8' },
  { id: 'robot', name: 'robot', emoji: '🤖', body: '#94a3b8', bodyDark: '#475569', head: '#cbd5e1', cap: '#3b82f6', capDark: '#1e40af', pants: '#64748b' },
  { id: 'piastri', name: 'piastri', emoji: '🏎️', body: '#0ea5e9', bodyDark: '#0369a1', head: '#e2e8f0', cap: '#f59e0b', capDark: '#b45309', pants: '#1e293b' },
  { id: 'puk', name: 'puk', emoji: '🕷️', body: '#dc2626', bodyDark: '#7f1d1d', head: '#fecaca', cap: '#1e3a8a', capDark: '#0c1e5e', pants: '#0ea5e9' },
  { id: 'knight', name: 'knight', emoji: '🛡️', body: '#a1a1aa', bodyDark: '#52525b', head: '#d4d4d8', cap: '#7c3aed', capDark: '#4c1d95', pants: '#713f12' },
]

type Phase = 'intro' | 'playing' | 'dead' | 'done'
interface GameState {
  feetY: number; vy: number; onGround: boolean; ducking: boolean
  obstacles: Obstacle[]; coins: Coin[]; distance: number; speed: number
  health: number; invuln: number; spawnDist: number; runFrame: number; score: number; bgOffset: number
  dust: Dust[]
}

export function PlatformerGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const platformerCompleted = useGameStore((s) => s.platformerCompleted)
  const completePlatformerLevel = useGameStore((s) => s.completePlatformerLevel)
  const medals = useGameStore((s) => s.medals)
  const equippedSkin = useGameStore((s) => s.equippedSkin)
  const runnerCharacter = useGameStore((s) => s.runnerCharacter)
  const setRunnerCharacter = useGameStore((s) => s.setRunnerCharacter)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [selectedChar, setSelectedChar] = useState<RunnerCharacter>(runnerCharacter)
  const [health, setHealth] = useState(3)
  const [pct, setPct] = useState(0)
  const [score, setScore] = useState(0)
  const [showMedal, setShowMedal] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const gRef = useRef<GameState | null>(null)
  const rafRef = useRef<number | null>(null)
  const keys = useRef({ jump: false, duck: false })
  const duckBtn = useRef(false)
  const charRef = useRef<RunnerCharacter>(runnerCharacter)
  const lastSfxJump = useRef(0)
  const runStart = useRef(0)

  const cfg = LEVELS[level]
  const charCfg = CHARACTERS.find((c) => c.id === charRef.current) || CHARACTERS[0]

  const initState = useCallback(() => {
    gRef.current = { feetY: GROUND_Y, vy: 0, onGround: true, ducking: false, obstacles: [], coins: [], distance: 0, speed: 4.6, health: 3, invuln: 0, spawnDist: 600, runFrame: 0, score: 0, bgOffset: 0, dust: [] }
    setHealth(3); setPct(0); setScore(0)
  }, [])

  const startLevel = useCallback((lv: number) => {
    setLevel(lv); charRef.current = selectedChar
    const img = new Image(); img.src = LEVELS[lv].bg; bgImgRef.current = img
    initState(); runStart.current = Date.now(); setPhase('playing')
  }, [initState, selectedChar])

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { keys.current.jump = true; e.preventDefault() }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { keys.current.duck = true; e.preventDefault() }
    }
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.current.jump = false
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.current.duck = false
    }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  const jump = useCallback(() => {
    const g = gRef.current; if (!g) return
    if (g.onGround) {
      g.vy = JUMP_VEL; g.onGround = false; g.ducking = false
      // spawn dust particles behind the character on jump
      for (let i = 0; i < 8; i++) {
        g.dust.push({
          x: PLAYER_X + Math.random() * PLAYER_W,
          y: GROUND_Y - 2,
          vx: -1.5 - Math.random() * 3,
          vy: -1 - Math.random() * 2,
          life: 45 + Math.random() * 20,
          r: 6 + Math.random() * 7,
        })
      }
      const now = Date.now()
      if (now - lastSfxJump.current > 120) { music.sfx('jump'); lastSfxJump.current = now }
    }
  }, [])
  const setDuck = useCallback((on: boolean) => {
    duckBtn.current = on
    const g = gRef.current; if (!g) return
    if (on && g.onGround) { g.ducking = true; music.sfx('duck') }
    if (!on) g.ducking = false
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let last = performance.now()

    const spawnObstacle = (g: GameState) => {
      const isJump = Math.random() < 0.62
      if (isJump) {
        const variant = cfg.jumpObjs[Math.floor(Math.random() * cfg.jumpObjs.length)]
        let w = 44, h = 40
        if (variant === 'log') { w = 64; h = 26 }
        if (variant === 'bush') { w = 50; h = 40 }
        if (variant === 'bucket') { w = 38; h = 38 }
        if (variant === 'crab') { w = 40; h = 30 }
        if (variant === 'mushroom') { w = 42; h = 44 }
        g.obstacles.push({ x: W + 40, type: 'jump', variant, w, h })
      } else {
        g.obstacles.push({ x: W + 40, type: 'duck', variant: cfg.duckObj, w: 26, h: 26, cy: GROUND_Y - DUCK_H - 18 })
      }
      if (isJump && Math.random() < 0.75) {
        for (let i = 0; i < 3; i++) g.coins.push({ x: W + 40 + 80 + i * 24, y: GROUND_Y - 180, taken: false })
      }
    }
    const hit = (g: GameState) => { g.health -= 1; g.invuln = 70; music.sfx('hurt'); g.vy = -8; g.onGround = false }
    const finishLevel = (won: boolean) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null
      setPhase(won ? 'done' : 'dead')
      if (won) {
        music.blip('win')
        const time = Math.floor((Date.now() - runStart.current) / 1000)
        if (!cfg.endless) addScore('runner', 'Герой', time, true)
        const wasComplete = platformerCompleted[level]
        if (!cfg.endless) completePlatformerLevel(level)
        const allDone = LEVELS.slice(0, 3).every((_, i) => (i === level ? true : platformerCompleted[i]))
        if (allDone && !wasComplete && !medals.platformer) setTimeout(() => setShowMedal(true), 700)
      } else {
        // endless: save score (distance) to leaderboard on death
        if (cfg.endless && gRef.current) {
          try { addScore('runner', 'Герой', gRef.current.score, false) } catch {}
        }
      }
    }

    const step = (now: number) => {
      const g = gRef.current; if (!g) return
      let dt = (now - last) / 16.667; last = now
      if (dt > 2.5) dt = 2.5
      if (keys.current.jump) { jump(); keys.current.jump = false }
      g.ducking = g.onGround && (keys.current.duck || duckBtn.current)
      g.vy += GRAVITY * dt; g.feetY += g.vy * dt
      if (g.feetY >= GROUND_Y) { g.feetY = GROUND_Y; g.vy = 0; g.onGround = true } else g.onGround = false
      g.speed = 5.5 + Math.min(3.5, g.distance / 5500)
      const move = g.speed * dt; g.distance += move; g.bgOffset += move * 0.5
      if (g.onGround) g.runFrame += dt * 0.4
      if (g.distance > g.spawnDist) { spawnObstacle(g); g.spawnDist = g.distance + 320 + Math.random() * 280 }

      const pH = g.ducking ? DUCK_H : STAND_H
      const pTop = g.feetY - pH
      const pLeft = PLAYER_X
      const pRight = PLAYER_X + PLAYER_W

      for (const o of g.obstacles) {
        o.x -= move
        if (o.type === 'jump') {
          const oTop = GROUND_Y - o.h
          // generous body-box collision so the chunky hero interacts fairly
          if (!o.passed && pRight > o.x + 4 && pLeft < o.x + o.w - 4 && g.feetY > oTop + 8) {
            if (g.invuln <= 0) hit(g); o.passed = true
          }
          if (!o.passed && pLeft > o.x + o.w) { o.passed = true; g.score += 10 }
        } else {
          const cx = o.x + o.w / 2, cy = o.cy!, r = 14
          if (!o.passed && pRight > cx - r && pLeft < cx + r && pTop < cy + r && g.feetY > cy - r) {
            if (g.invuln <= 0) hit(g); o.passed = true
          }
          if (!o.passed && pLeft > cx + r) { o.passed = true; g.score += 10 }
        }
      }
      g.obstacles = g.obstacles.filter((o) => o.x > -120)

      // coins — generous pickup box (whole body)
      for (const c of g.coins) {
        c.x -= move
        if (!c.taken && c.x > pLeft - 10 && c.x < pRight + 10 && c.y > pTop - 10 && c.y < g.feetY + 10) {
          c.taken = true; g.score += 5; music.sfx('coin')
        }
      }
      g.coins = g.coins.filter((c) => c.x > -40 && !c.taken)
      // update dust particles
      for (const d of g.dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 0.15 * dt; d.life -= dt }
      g.dust = g.dust.filter((d) => d.life > 0)
      if (g.invuln > 0) g.invuln -= dt
      setHealth(g.health); setPct(Math.min(1, g.distance / cfg.goalDist)); setScore(g.score)
      if (g.distance >= cfg.goalDist) { finishLevel(true); return }
      if (g.health <= 0) { finishLevel(false); return }
      draw(ctx, g)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [phase, level])

  const draw = (ctx: CanvasRenderingContext2D, g: GameState) => {
    const img = bgImgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      const iw = img.naturalWidth, ih = img.naturalHeight, scale = H / ih, drawnW = iw * scale
      const off = -(g.bgOffset % drawnW)
      ctx.drawImage(img, off, 0, drawnW, H); ctx.drawImage(img, off + drawnW, 0, drawnW, H)
      if (off + drawnW * 2 < W) ctx.drawImage(img, off + drawnW * 2, 0, drawnW, H)
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#bae6fd'); grad.addColorStop(1, '#e0f2fe')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
    }
    ctx.fillStyle = cfg.ground; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y)
    ctx.strokeStyle = cfg.groundDark; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke()
    ctx.lineWidth = 2; const goff = -(g.distance % 40)
    for (let i = -1; i < W / 40 + 1; i++) { ctx.beginPath(); ctx.moveTo(goff + i * 40, GROUND_Y + 14); ctx.lineTo(goff + i * 40 + 20, GROUND_Y + 14); ctx.stroke() }
    if (g.distance > cfg.goalDist - 1400) { const fx = W - ((cfg.goalDist - g.distance) / 1400) * (W - PLAYER_X); drawFlag(ctx, fx) }
    for (const c of g.coins) {
      if (c.taken) continue
      ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#ca8a04'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('★', c.x - 3, c.y + 3)
    }
    for (const o of g.obstacles) drawObstacle(ctx, o)
    // draw dust particles (behind the player)
    for (const d of g.dust) {
      const alpha = Math.min(0.65, d.life / 60)
      ctx.fillStyle = `rgba(210,210,210,${alpha})`
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + (1 - d.life / 65) * 0.5), 0, Math.PI * 2); ctx.fill()
    }
    drawPlayer(ctx, g)
  }

  const drawFlag = (ctx: CanvasRenderingContext2D, x: number) => {
    ctx.strokeStyle = cfg.pencil; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x, GROUND_Y - 90); ctx.stroke()
    ctx.fillStyle = '#ef4444'; ctx.strokeStyle = cfg.pencil
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 90); ctx.lineTo(x + 40, GROUND_Y - 78); ctx.lineTo(x, GROUND_Y - 66); ctx.closePath(); ctx.fill(); ctx.stroke()
  }

  const drawObstacle = (ctx: CanvasRenderingContext2D, o: Obstacle) => {
    ctx.strokeStyle = cfg.pencil; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    if (o.type === 'jump') {
      const x = o.x, y = GROUND_Y - o.h, w = o.w, h = o.h
      if (o.variant === 'log') {
        ctx.fillStyle = '#a16207'; roundRect(ctx, x, y, w, h, 10); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#713f12'; ctx.beginPath(); ctx.arc(x + 8, y + h / 2, 5, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + w - 8, y + h / 2, 5, 0, Math.PI * 2); ctx.fill()
      } else if (o.variant === 'bush') {
        ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(x + w * 0.3, y + h * 0.4, h / 3, 0, Math.PI * 2); ctx.fill()
      } else if (o.variant === 'bucket') {
        ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 6, y + h); ctx.lineTo(x + 6, y + h); ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(x - 4, y - 3, w + 8, 5)
      } else if (o.variant === 'crab') {
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(x + w * 0.35, y + h * 0.4, 2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + w * 0.65, y + h * 0.4, 2, 0, Math.PI * 2); ctx.fill()
      } else if (o.variant === 'mushroom') {
        ctx.fillStyle = '#f3e8d0'; ctx.fillRect(x + w * 0.35, y + h * 0.45, w * 0.3, h * 0.55)
        ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.4, w * 0.5, h * 0.4, 0, Math.PI, 0); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + w * 0.35, y + h * 0.35, 4, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + w * 0.6, y + h * 0.3, 3, 0, Math.PI * 2); ctx.fill()
      }
    } else {
      const cx = o.x + o.w / 2, cy = o.cy!, r = 13
      if (o.variant === 'seed') { ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
      else if (o.variant === 'ball') { ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2); ctx.fill() }
      else if (o.variant === 'acorn') { ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#16a34a'; ctx.fillRect(cx - 4, cy - r - 4, 8, 5) }
    }
  }

  // MASSIVE chunky character (Mario-like), drawn with filled shapes + thick outline
  const drawPlayer = (ctx: CanvasRenderingContext2D, g: GameState) => {
    const c = charCfg
    const feet = g.feetY
    const duck = g.ducking
    const h = duck ? DUCK_H : STAND_H
    const top = feet - h
    const cx = PLAYER_X + PLAYER_W / 2
    const flashing = g.invuln > 0 && Math.floor(g.invuln / 6) % 2 === 0

    ctx.save()
    if (flashing) ctx.globalAlpha = 0.45
    ctx.strokeStyle = 'rgba(15,23,42,0.85)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'

    if (duck) {
      // smooth crouched capsule body
      ctx.fillStyle = c.body
      roundRect(ctx, cx - PLAYER_W / 2, top + 6, PLAYER_W, DUCK_H - 6, 16); ctx.fill(); ctx.stroke()
      // head merged on top
      ctx.fillStyle = c.head
      ctx.beginPath(); ctx.arc(cx + 4, top + 14, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      // headgear by character
      drawHead(ctx, c, cx + 4, top + 12, 12, duck)
      // shoes
      ctx.fillStyle = c.pants
      roundRect(ctx, cx - PLAYER_W / 2 - 3, feet - 7, 18, 9, 5); ctx.fill(); ctx.stroke()
      roundRect(ctx, cx + PLAYER_W / 2 - 15, feet - 7, 18, 9, 5); ctx.fill(); ctx.stroke()
      ctx.restore()
      return
    }

    // standing pose — unified body
    const headR = 14
    const headY = top + headR
    // body capsule (torso + pants as one smooth shape)
    const bodyTop = headY + headR - 5
    const bodyBot = feet - 12
    ctx.fillStyle = c.body
    roundRect(ctx, cx - PLAYER_W / 2 + 5, bodyTop, PLAYER_W - 10, bodyBot - bodyTop, 14); ctx.fill(); ctx.stroke()
    // pants lower band
    ctx.fillStyle = c.pants
    roundRect(ctx, cx - PLAYER_W / 2 + 5, bodyBot - 16, PLAYER_W - 10, 16, 8); ctx.fill(); ctx.stroke()
    // head (slightly overlapping body for a unified look)
    ctx.fillStyle = c.head
    ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    // character-specific headgear + face
    drawHead(ctx, c, cx, headY, headR, false)
    // arms (smooth, swing)
    const armSwing = g.onGround ? Math.sin(g.runFrame * Math.PI) * 6 : -5
    ctx.fillStyle = c.body
    ctx.beginPath(); ctx.ellipse(cx - PLAYER_W / 2 + 4, bodyTop + 14 + armSwing, 6, 9, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(cx + PLAYER_W / 2 - 4, bodyTop + 14 - armSwing, 6, 9, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    // legs (smooth)
    ctx.fillStyle = c.pants
    if (g.onGround) {
      const ls = Math.sin(g.runFrame * Math.PI) * 6
      roundRect(ctx, cx - 11 + ls, bodyBot - 2, 13, 14, 6); ctx.fill(); ctx.stroke()
      roundRect(ctx, cx - 2 - ls, bodyBot - 2, 13, 14, 6); ctx.fill(); ctx.stroke()
    } else {
      roundRect(ctx, cx - 11, bodyBot - 5, 13, 13, 6); ctx.fill(); ctx.stroke()
      roundRect(ctx, cx - 2, bodyBot - 9, 13, 13, 6); ctx.fill(); ctx.stroke()
    }
    ctx.restore()
  }

  // character-specific headgear + face, drawn smoothly
  const drawHead = (ctx: CanvasRenderingContext2D, c: CharCfg, cx: number, hy: number, r: number, duck: boolean) => {
    const dir = 1 // facing right
    if (c.id === 'hero') {
      // red cap
      ctx.fillStyle = c.cap
      ctx.beginPath(); ctx.arc(cx, hy, r, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(cx + r, hy - 2); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = c.capDark
      roundRect(ctx, cx + r - 2, hy - 3, 8, 5, 2); ctx.fill(); ctx.stroke()
    } else if (c.id === 'robot') {
      // metallic helmet + antenna
      ctx.fillStyle = c.cap
      roundRect(ctx, cx - r, hy - r, r * 2, r, 6); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = c.capDark; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(cx, hy - r); ctx.lineTo(cx, hy - r - 6); ctx.stroke()
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx, hy - r - 7, 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(15,23,42,0.85)'; ctx.lineWidth = 2.5
    } else if (c.id === 'piastri') {
      // F1 racing helmet with visor
      ctx.fillStyle = c.cap
      ctx.beginPath(); ctx.arc(cx, hy, r + 1, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = c.capDark
      roundRect(ctx, cx - r - 1, hy - r - 1, (r + 1) * 2, r * 0.6, 4); ctx.fill(); ctx.stroke()
      // visor (dark tinted)
      ctx.fillStyle = '#1e293b'
      roundRect(ctx, cx - 2, hy - r * 0.5, r + 4, r * 0.5, 3); ctx.fill()
      // visor shine
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      roundRect(ctx, cx, hy - r * 0.45, 4, r * 0.25, 2); ctx.fill()
      return // no separate eyes (hidden behind visor)
    } else if (c.id === 'puk') {
      // spider-man style mask (red with web)
      ctx.fillStyle = c.cap
      ctx.beginPath(); ctx.arc(cx, hy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      // web lines
      ctx.strokeStyle = c.capDark; ctx.lineWidth = 1.2
      for (let a = -1; a <= 1; a++) {
        ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx + Math.cos(a * 0.7) * r, hy + Math.sin(a * 0.7) * r); ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(cx, hy, r * 0.6, -0.4, 0.4); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx, hy, r * 0.35, -0.4, 0.4); ctx.stroke()
      ctx.strokeStyle = 'rgba(15,23,42,0.85)'; ctx.lineWidth = 2.5
      // big white eyes
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(cx + 4, hy - 1, 5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(cx + 5, hy - 1, 2, 0, Math.PI * 2); ctx.fill()
      return
    } else if (c.id === 'knight') {
      // armored helmet with visor slit
      ctx.fillStyle = c.cap
      ctx.beginPath(); ctx.arc(cx, hy, r + 1, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
      // visor band
      ctx.fillStyle = c.capDark
      roundRect(ctx, cx - r, hy - 3, r * 2, 6, 2); ctx.fill(); ctx.stroke()
      // visor slit
      ctx.fillStyle = '#0f172a'
      roundRect(ctx, cx - 2, hy - 1, r + 4, 2.5, 1); ctx.fill()
      // plume
      ctx.fillStyle = '#7c3aed'
      ctx.beginPath(); ctx.moveTo(cx, hy - r); ctx.quadraticCurveTo(cx + 6, hy - r - 8, cx + 2, hy - r - 12); ctx.quadraticCurveTo(cx - 2, hy - r - 6, cx, hy - r); ctx.fill(); ctx.stroke()
      return
    }
    // default friendly eyes (hero/robot)
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(cx + 4, hy, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(cx + 5, hy, 1.8, 0, Math.PI * 2); ctx.fill()
    // smile
    ctx.beginPath(); ctx.arc(cx + 2, hy + 5, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()

    // draw equipped skin (hat/accessory) on top of head
    if (equippedSkin) {
      ctx.save()
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const skinEmojis: Record<string, string> = {
        crown: '👑', party: '🎩', wizard: '🧙', cowboy: '🤠', helmet: '🚀',
        pirate: '🏴‍☠️', rainbow: '🌈', ninja: '🥷', graduate: '🎓', santa: '🎅',
      }
      const emoji = skinEmojis[equippedSkin]
      if (emoji) {
        ctx.font = `${r * 1.4}px serif`
        ctx.fillText(emoji, cx, hy - r - 2)
      }
      ctx.restore()
    }
  }

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }

  const handleRetry = () => { initState(); setPhase('playing') }
  const handleNext = () => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1); else setPhase('intro') }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-emerald-100 to-green-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🏃</div>
          <h1 className="mt-2 text-4xl sm:text-5xl font-black text-emerald-800">{t('game.platformer')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-emerald-700">{t('runner.desc')}</p>

          <div className="mt-5 w-full max-w-md rounded-2xl bg-white/70 p-3 shadow-md">
            <div className="mb-2 text-center text-sm font-black text-emerald-700">{t('runner.pickHero')}</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {CHARACTERS.map((c) => (
                <button key={c.id} onClick={() => { setSelectedChar(c.id); setRunnerCharacter(c.id); music.sfx('pop') }} className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-2xl border-2 shadow-sm transition ${selectedChar === c.id ? 'border-emerald-500 bg-emerald-50 scale-110' : 'border-white bg-white'}`}>
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-[10px] font-bold text-gray-600">{t(`char.${c.id}`)}</span>
                  {selectedChar === c.id && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" /></span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l, i) => {
              const done = !l.endless && platformerCompleted[i]
              const locked = i > 0 && i < 3 && !platformerCompleted[i - 1] && !medals.platformer
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 overflow-hidden rounded-2xl border-2 p-3 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-emerald-400 bg-emerald-50 hover:scale-105' : l.endless ? 'border-fuchsia-400 bg-fuchsia-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <div className="h-12 w-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${l.bg})` }} />
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`runner.${l.name}`)}</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-emerald-600">{t('common.play')}</span>}
                  {l.endless && <span className="text-xs font-bold text-fuchsia-600">∞ 🏆</span>}
                </button>
              )
            })}
          </div>
          {/* endless leaderboard */}
          <div className="mt-4 w-full max-w-sm rounded-2xl bg-white/70 p-3 shadow-md">
            <div className="mb-1 text-center text-sm font-black text-emerald-800">♾️ {t('menu.leadersTitle')}</div>
            {getScores('runner').length === 0 ? <div className="text-center text-xs font-semibold text-gray-500">{t('menu.leadersEmpty')}</div> : (
              <div className="space-y-1">{getScores('runner').slice(0, 5).map((e, i) => (<div key={i} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1 text-sm"><span className="font-black text-emerald-700">{i + 1}. {e.name}</span><span className="font-bold text-gray-700">⭐ {formatValue('runner', e.value)}</span></div>))}</div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-emerald-800">
            <span className="rounded-full bg-white/70 px-3 py-1">{t('runner.jumpHint')}</span>
            <span className="rounded-full bg-white/70 px-3 py-1">{t('runner.duckHint')}</span>
          </div>
          {medals.platformer && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('runner.medalSub')}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-emerald-50">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-5xl flex-col items-center justify-center px-2 py-10 sm:py-12">
        <div className="mb-2 flex w-full max-w-[900px] items-center justify-between gap-3">
          <div className="flex items-center gap-1">{[0, 1, 2].map((i) => <Heart key={i} className={`h-5 w-5 sm:h-6 sm:w-6 ${i < health ? 'fill-rose-500 text-rose-500' : 'text-gray-300'}`} />)}</div>
          <div className="text-xs font-black text-emerald-800 sm:text-sm">{cfg.emoji}</div>
          <div className="text-xs font-black text-amber-600 sm:text-sm">★ {score}</div>
        </div>
        <div className="mb-2 h-3 w-full max-w-[900px] overflow-hidden rounded-full bg-white/80 shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600 transition-all" style={{ width: `${pct * 100}%` }} />
        </div>
        <div className="relative w-full max-w-[900px] select-none" onPointerDown={(e) => { const target = e.target as HTMLElement; if (target.dataset && target.dataset.duck === '1') return; jump() }}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-2xl border-4 border-white shadow-xl" style={{ aspectRatio: `${W} / ${H}`, touchAction: 'none' }} />
          <button data-duck="1" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setDuck(true) }} onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setDuck(false) }} onPointerLeave={() => setDuck(false)} className="absolute bottom-3 right-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/90 text-white shadow-lg backdrop-blur active:scale-95 sm:hidden" aria-label={t('runner.duck')}><ArrowDown className="h-8 w-8" /></button>
          <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); jump() }} className="absolute bottom-3 left-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/90 text-white shadow-lg backdrop-blur active:scale-95 sm:hidden" aria-label={t('runner.jump')}><ArrowUp className="h-8 w-8" /></button>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-emerald-700">{t('runner.tip')}</p>

        <AnimatePresence>
          {phase === 'dead' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-400 to-red-600 p-6 text-center text-white shadow-2xl sm:p-8">
                <div className="text-6xl">😵</div>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('runner.dead')}</h2>
                <p className="mt-1 font-bold">{t('runner.deadSub')}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <Button onClick={handleRetry} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
                  <Button onClick={() => setPhase('intro')} variant="outline" className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('runner.toLevels')}</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 p-6 text-center text-white shadow-2xl sm:p-8">
                <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">🏁</motion.div>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('runner.levelDone')}</h2>
                <p className="mt-1 font-bold">★ {score}</p>
                {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('runner.medalSub')}</div></motion.div>}
                <div className="mt-5 flex flex-col gap-3">
                  <Button onClick={handleNext} className="h-12 rounded-full bg-white text-base font-black text-emerald-700 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('runner.nextLevel') : t('common.done')}</Button>
                  <Button onClick={() => setPhase('intro')} variant="outline" className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('runner.toLevels')}</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
