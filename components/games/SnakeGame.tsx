'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw, ArrowLeft as AIco, ArrowRight as ARco } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'
import { addScore, getScores, formatValue } from '@/lib/leaderboard'

const W = 460
const H = 560
const CELL = 26
const COLS = Math.floor(W / CELL) // 17
const ROWS = Math.floor(H / CELL) // 21

const BAND_TOP = 4
const BAND_BOT = ROWS - 4

interface Block { x: number; y: number; kind: 'crate' | 'barrel' | 'bomb'; hit?: boolean }
interface Coin { x: number; y: number; taken: boolean }

type Phase = 'intro' | 'playing' | 'dead' | 'done'

interface LevelCfg { id: number; name: string; emoji: string; bandWidth: number; baseSpeed: number; blockRate: number; coinRate: number; duration: number; medalPlace: string; descKey: string; endless?: boolean; last10Boost?: number }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', bandWidth: 7, baseSpeed: 5.0, blockRate: 1.1, coinRate: 0.9, duration: 60, medalPlace: '🥉', descKey: 'snake.easyDesc', last10Boost: 1.3 },
  { id: 1, name: 'medium', emoji: '🟡', bandWidth: 6, baseSpeed: 6.0, blockRate: 1.6, coinRate: 1.0, duration: 60, medalPlace: '🥈', descKey: 'snake.medDesc', last10Boost: 1.7 },
  { id: 2, name: 'hard', emoji: '🔴', bandWidth: 5, baseSpeed: 7.5, blockRate: 2.1, coinRate: 1.1, duration: 60, medalPlace: '🥇', descKey: 'snake.hardDesc', last10Boost: 1.9 },
  { id: 3, name: 'endless', emoji: '♾️', bandWidth: 7, baseSpeed: 4.5, blockRate: 1.0, coinRate: 1.1, duration: 9999, medalPlace: '🌟', descKey: 'snake.easyDesc', endless: true, last10Boost: 1 },
]

interface State { snakeX: number; snakeY: number; vx: number; blocks: Block[]; coins: Coin[]; scrollY: number; timeLeft: number; score: number; hitFlash: number; shake: number; tail: number; coinsCollected: number; elapsed: number }

export function SnakeGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const snakeCompleted = useGameStore((s) => s.snakeCompleted)
  const completeSnakeLevel = useGameStore((s) => s.completeSnakeLevel)
  const medals = useGameStore((s) => s.medals)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [showMedal, setShowMedal] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sRef = useRef<State | null>(null)
  const rafRef = useRef<number | null>(null)
  const steer = useRef(0)

  const cfg = LEVELS[level]
  const bandHalf = Math.floor(cfg.bandWidth / 2)
  const bandCenter = Math.floor(COLS / 2)
  const bandL = bandCenter - bandHalf
  const bandR = bandCenter + bandHalf

  const startLevel = useCallback((lv: number) => {
    setLevel(lv)
    const c = LEVELS[lv]
    const bh = Math.floor(c.bandWidth / 2)
    const bc = Math.floor(COLS / 2)
    sRef.current = { snakeX: bc, snakeY: BAND_BOT - 2, vx: 0, blocks: [], coins: [], scrollY: 0, timeLeft: c.duration, score: 0, hitFlash: 0, shake: 0, tail: 0, coinsCollected: 0, elapsed: 0 }
    setTimeLeft(c.duration); setScore(0); setShowMedal(false); setPhase('playing')
  }, [])

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { steer.current = -1; e.preventDefault() }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { steer.current = 1; e.preventDefault() }
    }
    const ku = (e: KeyboardEvent) => {
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && steer.current === -1) steer.current = 0
      if ((e.code === 'ArrowRight' || e.code === 'KeyD') && steer.current === 1) steer.current = 0
    }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let last = performance.now()
    let blockAcc = 0; let coinAcc = 0

    const c = LEVELS[level]
    const bh = Math.floor(c.bandWidth / 2)
    const bc = Math.floor(COLS / 2)
    const bL = bc - bh; const bR = bc + bh

    const spawnBlock = (s: State) => {
      const x = bL + Math.floor(Math.random() * (bR - bL + 1))
      const kinds: Block['kind'][] = ['crate', 'barrel', 'bomb']
      s.blocks.push({ x, y: BAND_TOP - 1, kind: kinds[Math.floor(Math.random() * kinds.length)] })
    }
    const spawnCoin = (s: State) => {
      const x = bL + Math.floor(Math.random() * (bR - bL + 1))
      s.coins.push({ x, y: BAND_TOP - 1, taken: false })
    }

    const finishLevel = (won: boolean) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null
      setPhase(won ? 'done' : 'dead')
      if (won) {
        music.blip('win')
        const wasComplete = snakeCompleted[level]
        completeSnakeLevel(level)
        const allDone = LEVELS.slice(0, 3).every((_, i) => (i === level ? true : snakeCompleted[i]))
        if (allDone && !wasComplete && !medals.snake) setTimeout(() => setShowMedal(true), 700)
      } else {
        music.sfx('hurt')
        // endless mode: save score to leaderboard on death
        if (c.endless && sRef.current) {
          try { addScore('snake', 'Игрок', sRef.current.score, false) } catch {}
        }
      }
    }

    const step = (now: number) => {
      const s = sRef.current; if (!s) return
      let dt = (now - last) / 1000; last = now
      if (dt > 0.05) dt = 0.05

      s.elapsed += dt
      // gentle gradual speed ramp over time; endless grows forever (slowly)
      const ramp = c.endless
        ? Math.min(2.2, 0.9 + s.elapsed / 45)   // endless: keeps growing
        : Math.min(1.4, 0.8 + s.elapsed / 40)    // timed: gentle ramp
      const last10 = !c.endless && s.timeLeft <= 10 ? (c.last10Boost || 1.7) : 1
      const speed = c.baseSpeed * ramp * last10
      s.scrollY += speed * dt

      s.vx = steer.current
      s.snakeX += s.vx * 10 * dt

      for (const b of s.blocks) b.y += speed * dt
      for (const g of s.coins) g.y += speed * dt

      const blockRate = c.blockRate * ramp * (!c.endless && s.timeLeft <= 10 ? 1.3 : 1)
      blockAcc += blockRate * dt
      while (blockAcc >= 1) { spawnBlock(s); blockAcc -= 1 }
      coinAcc += c.coinRate * dt
      while (coinAcc >= 1) { spawnCoin(s); coinAcc -= 1 }

      const hx = s.snakeX, hy = s.snakeY
      for (const b of s.blocks) {
        if (!b.hit && Math.abs(b.y - hy) < 0.7 && Math.abs(b.x - hx) < 0.95) {
          b.hit = true
          s.snakeX += b.x < hx ? 1.6 : -1.6
          s.hitFlash = 0.5; s.shake = 0.4
          music.sfx('hurt')
        }
      }
      for (const g of s.coins) {
        if (!g.taken && Math.abs(g.y - hy) < 0.7 && Math.abs(g.x - hx) < 0.95) {
          g.taken = true; s.score += 5; s.coinsCollected += 1
          // grow tail very slowly: +1 segment every 3 coins, capped at 6
          if (s.coinsCollected % 3 === 0 && s.tail < 6) s.tail += 1
          music.sfx('coin')
        }
      }
      s.blocks = s.blocks.filter((b) => b.y < BAND_BOT + 2 && !b.hit)
      s.coins = s.coins.filter((g) => g.y < BAND_BOT + 2 && !g.taken)

      const onBand = s.snakeX >= bL - 0.3 && s.snakeX <= bR + 0.3
      if (!onBand) { finishLevel(false); return }

      if (s.hitFlash > 0) s.hitFlash -= dt
      if (s.shake > 0) s.shake -= dt
      if (!c.endless) {
        s.timeLeft -= dt
        setTimeLeft(Math.max(0, Math.ceil(s.timeLeft)))
      }
      setScore(s.score)
      if (!c.endless && s.timeLeft <= 0) { finishLevel(true); return }

      draw(ctx, s, c, bL, bR)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [phase, level])

  const draw = (ctx: CanvasRenderingContext2D, s: State, c: LevelCfg, bL: number, bR: number) => {
    ctx.save()
    if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
    // pit
    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, W, H)
    // band
    const bandPxX = bL * CELL, bandPxW = (bR - bL + 1) * CELL
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#475569'); grad.addColorStop(1, '#334155')
    ctx.fillStyle = grad; ctx.fillRect(bandPxX, 0, bandPxW, H)
    // conveyor stripes
    ctx.fillStyle = '#64748b'
    const stripeOff = (s.scrollY % 2) * CELL
    for (let y = -CELL + stripeOff; y < H; y += CELL * 2) ctx.fillRect(bandPxX, y, bandPxW, CELL)
    // danger edges
    ctx.fillStyle = '#ef4444'; ctx.fillRect(bandPxX - 4, 0, 4, H); ctx.fillRect(bandPxX + bandPxW, 0, 4, H)
    ctx.fillStyle = 'rgba(239,68,68,0.5)'
    for (let y = 20; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(bandPxX - 14, y); ctx.lineTo(bandPxX - 4, y - 6); ctx.lineTo(bandPxX - 4, y + 6); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(bandPxX + bandPxW + 14, y); ctx.lineTo(bandPxX + bandPxW + 4, y - 6); ctx.lineTo(bandPxX + bandPxW + 4, y + 6); ctx.closePath(); ctx.fill()
    }
    // blocks
    for (const b of s.blocks) {
      const px = b.x * CELL, py = b.y * CELL
      if (b.kind === 'crate') {
        ctx.fillStyle = '#a16207'; ctx.strokeStyle = '#713f12'; ctx.lineWidth = 2
        ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4); ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4)
        ctx.beginPath(); ctx.moveTo(px + 2, py + 2); ctx.lineTo(px + CELL - 2, py + CELL - 2); ctx.moveTo(px + CELL - 2, py + 2); ctx.lineTo(px + 2, py + CELL - 2); ctx.stroke()
      } else if (b.kind === 'barrel') {
        ctx.fillStyle = '#92400e'; ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.ellipse(px + CELL / 2, py + CELL / 2, CELL / 2 - 2, CELL / 2 - 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.ellipse(px + CELL / 2, py + CELL / 2, CELL / 2 - 2, 4, 0, 0, Math.PI * 2); ctx.stroke()
      } else {
        ctx.fillStyle = '#1f2937'; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('!', px + CELL / 2, py + CELL / 2 + 1)
      }
    }
    // coins
    for (const g of s.coins) {
      if (g.taken) continue
      const px = g.x * CELL + CELL / 2, py = g.y * CELL + CELL / 2
      ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#ca8a04'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('★', px, py + 1)
    }
    // smooth snake head (no bulging eyes)
    const hx = s.snakeX * CELL + CELL / 2, hy = s.snakeY * CELL + CELL / 2
    const headR = CELL / 2 - 1
    // short tail behind the head (grows slowly with coins)
    for (let i = 1; i <= s.tail; i++) {
      const ty = hy + i * CELL * 0.7
      ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#22c55e'
      ctx.beginPath(); ctx.arc(hx - s.vx * i * 1.5, ty, headR - i * 0.6, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = s.hitFlash > 0 ? '#fca5a5' : '#16a34a'
    ctx.strokeStyle = '#14532d'; ctx.lineWidth = 2.5
    // rounded head
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    // subtle scale shine
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.beginPath(); ctx.ellipse(hx - 2, hy - 3, headR * 0.5, headR * 0.3, -0.4, 0, Math.PI * 2); ctx.fill()
    // small integrated eyes (not bulging)
    const eo = s.vx >= 0 ? 4 : -4
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(hx + eo, hy - 3, 2.6, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(hx + eo + 7, hy - 3, 2.6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1f2937'
    ctx.beginPath(); ctx.arc(hx + eo + 0.8, hy - 3, 1.3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(hx + eo + 7.8, hy - 3, 1.3, 0, Math.PI * 2); ctx.fill()
    // gentle smile
    ctx.strokeStyle = '#14532d'; ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(hx + 3, hy + 4, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()

    ctx.restore()
    if (s.hitFlash > 0) { ctx.fillStyle = `rgba(239,68,68,${s.hitFlash * 0.4})`; ctx.fillRect(0, 0, W, H) }
    if (s.timeLeft <= 10) { ctx.strokeStyle = 'rgba(239,68,68,0.6)'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, W - 8, H - 8) }
  }

  const handleRetry = () => startLevel(level)
  const handleNext = () => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1); else setPhase('intro') }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-teal-100 via-cyan-100 to-blue-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🐍</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-teal-800">{t('game.snake')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-teal-700">{t('snake.desc')}</p>
          <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l, i) => {
              const done = !l.endless && snakeCompleted[i]
              const locked = i > 0 && i < 3 && !snakeCompleted[i - 1] && !medals.snake
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-teal-400 bg-teal-50 hover:scale-105' : l.endless ? 'border-fuchsia-400 bg-fuchsia-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`snake.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-teal-600">{l.endless ? '∞' : t(l.descKey).slice(0, 16)}</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-teal-600">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          {/* endless leaderboard */}
          <div className="mt-4 w-full max-w-sm rounded-2xl bg-white/70 p-3 shadow-md">
            <div className="mb-1 text-center text-sm font-black text-teal-800">♾️ {t('menu.leadersTitle')}</div>
            {getScores('snake').length === 0 ? <div className="text-center text-xs font-semibold text-gray-500">{t('menu.leadersEmpty')}</div> : (
              <div className="space-y-1">{getScores('snake').slice(0, 5).map((e, i) => (<div key={i} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1 text-sm"><span className="font-black text-teal-700">{i + 1}. {e.name}</span><span className="font-bold text-gray-700">⭐ {formatValue('snake', e.value)}</span></div>))}</div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-teal-800">
            <span className="rounded-full bg-white/70 px-3 py-1">{t('snake.steer')}</span>
            <span className="rounded-full bg-white/70 px-3 py-1">⏱️ 60s</span>
          </div>
          {medals.snake && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('snake.medalSub')}</span>}
        </div>
      </div>
    )
  }

  const danger = timeLeft <= 10
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-teal-50">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-3 py-12">
        <div className="mb-2 flex w-full items-center justify-between gap-3">
          <div className={`rounded-full px-3 py-1 text-xs font-black shadow sm:text-sm ${danger ? 'animate-pulse bg-red-500 text-white' : 'bg-white/80 text-teal-700'}`}>⏱️ {timeLeft}s</div>
          <div className="text-xs font-black text-teal-800 sm:text-sm">{cfg.emoji} {t(`snake.${cfg.name}`)}</div>
          <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-amber-600 shadow sm:text-sm">★ {score}</div>
        </div>
        <div className="relative w-full select-none" onPointerDown={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); steer.current = (e.clientX - r.left) < r.width / 2 ? -1 : 1 }} onPointerMove={(e) => { if (e.buttons !== 1 && e.pointerType !== 'touch') return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); steer.current = (e.clientX - r.left) < r.width / 2 ? -1 : 1 }} onPointerUp={() => { steer.current = 0 }} onPointerCancel={() => { steer.current = 0 }} onPointerLeave={() => { steer.current = 0 }}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-2xl border-4 border-white shadow-xl" style={{ aspectRatio: `${W} / ${H}`, touchAction: 'none' }} />
        </div>
        <div className="mt-3 flex w-full items-center justify-between gap-3 sm:hidden">
          <button onPointerDown={(e) => { e.preventDefault(); steer.current = -1 }} onPointerUp={() => { steer.current = 0 }} onPointerLeave={() => { steer.current = 0 }} className="flex h-16 flex-1 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg active:scale-95"><AIco className="h-8 w-8" /></button>
          <button onPointerDown={(e) => { e.preventDefault(); steer.current = 1 }} onPointerUp={() => { steer.current = 0 }} onPointerLeave={() => { steer.current = 0 }} className="flex h-16 flex-1 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg active:scale-95"><ARco className="h-8 w-8" /></button>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-teal-700">{t('snake.tip')}</p>

        <AnimatePresence>
          {phase === 'dead' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-400 to-red-600 p-6 text-center text-white shadow-2xl sm:p-8">
                <div className="text-6xl">😱</div>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('snake.fell')}</h2>
                <p className="mt-1 font-bold">★ {score}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <Button onClick={handleRetry} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
                  <Button onClick={() => setPhase('intro')} variant="outline" className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-600 p-6 text-center text-white shadow-2xl sm:p-8">
                <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{cfg.medalPlace}</motion.div>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('snake.survived')}</h2>
                <p className="mt-1 font-bold">★ {score}</p>
                {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('snake.medalSub')}</div></motion.div>}
                <div className="mt-5 flex flex-col gap-3">
                  <Button onClick={handleNext} className="h-12 rounded-full bg-white text-base font-black text-teal-700 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                  <Button onClick={() => setPhase('intro')} variant="outline" className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
