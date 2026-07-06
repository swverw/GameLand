'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw, Users, User } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const W = 380, H = 520
const BLOCK_W = 80, BLOCK_H = 30
const GROUND_Y = H - 30
const TARGET_FLOORS = 7

type Phase = 'intro' | 'playing' | 'dead' | 'done'
type Mode = '1p' | '2p'

interface LevelCfg { id: number; name: string; emoji: string; speed: number; bg: [string, string]; medalPlace: string }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', speed: 1.1, bg: ['#bae6fd', '#e0f2fe'], medalPlace: '🥉' },
  { id: 1, name: 'medium', emoji: '🟡', speed: 1.6, bg: ['#fde68a', '#fef3c7'], medalPlace: '🥈' },
  { id: 2, name: 'hard', emoji: '🔴', speed: 2.2, bg: ['#fecaca', '#fee2e2'], medalPlace: '🥇' },
]

interface PlacedBlock { x: number; w: number; y: number; color: string; tilt: number }
interface FallingBlock { x: number; w: number; y: number; vy: number; color: string; settled: boolean }

const COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

export function SkyscraperGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.skyscraperCompleted)
  const completeLevel = useGameStore((s) => s.completeSkyscraperLevel)
  const medals = useGameStore((s) => s.medals)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [mode, setMode] = useState<Mode>('1p')
  const [floors, setFloors] = useState(0)
  const [p1Floors, setP1Floors] = useState(0)
  const [p2Floors, setP2Floors] = useState(0)
  const [showMedal, setShowMedal] = useState(false)
  const [p1Turn, setP1Turn] = useState(true)
  const [p1Done, setP1Done] = useState(false)
  const [p2Done, setP2Done] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const placedRef = useRef<PlacedBlock[]>([])
  const swingRef = useRef(0)
  const swingDirRef = useRef(1)
  const currentYRef = useRef(GROUND_Y)
  const fallRef = useRef<FallingBlock | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const cfgRef = useRef(LEVELS[0])
  const shakeRef = useRef(0)
  const modeRef = useRef<Mode>('1p')
  const floorCountRef = useRef(0)

  const cfg = LEVELS[level]

  const initTower = useCallback(() => {
    placedRef.current = []
    currentYRef.current = GROUND_Y
    fallRef.current = null
    swingRef.current = 0; swingDirRef.current = 1
    shakeRef.current = 0
    floorCountRef.current = 0
    setFloors(0)
  }, [])

  const startLevel = useCallback((lv: number, m: Mode) => {
    setLevel(lv); cfgRef.current = LEVELS[lv]
    setMode(m); modeRef.current = m
    setShowMedal(false)
    setP1Floors(0); setP2Floors(0); setP1Done(false); setP2Done(false)
    setP1Turn(true)
    initTower()
    setPhase('playing'); phaseRef.current = 'playing'
  }, [initTower])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let last = performance.now()

    const settle = () => {
      const fb = fallRef.current; if (!fb) return
      fb.settled = true
      const prev = placedRef.current[placedRef.current.length - 1]
      let ok = true
      if (prev) {
        const overlapL = Math.max(fb.x - fb.w / 2, prev.x - prev.w / 2)
        const overlapR = Math.min(fb.x + fb.w / 2, prev.x + prev.w / 2)
        const overlap = overlapR - overlapL
        if (overlap <= 0 || Math.abs(fb.x - prev.x) > fb.w * 0.45) {
          ok = false
        }
      }
      if (!ok) {
        music.sfx('hurt'); shakeRef.current = 20
        // 2p: record floors for current player, switch
        if (modeRef.current === '2p') {
          if (p1Turn) { setP1Floors(floorCountRef.current); setP1Done(true) }
          else { setP2Floors(floorCountRef.current); setP2Done(true) }
          if (p1Done && p2Done) {
            phaseRef.current = 'done'; setPhase('done')
          } else {
            // switch turn
            setTimeout(() => {
              setP1Turn((t) => !t)
              initTower()
            }, 800)
          }
        } else {
          phaseRef.current = 'dead'; setPhase('dead')
        }
        return
      }
      const tilt = prev ? (fb.x - prev.x) * 0.003 : 0
      placedRef.current.push({ x: fb.x, w: fb.w, y: currentYRef.current, color: fb.color, tilt })
      fallRef.current = null
      currentYRef.current -= BLOCK_H
      floorCountRef.current++
      setFloors(floorCountRef.current)
      music.sfx('place')

      if (floorCountRef.current >= TARGET_FLOORS) {
        if (modeRef.current === '2p') {
          // this player finished tower
          if (p1Turn) { setP1Floors(TARGET_FLOORS); setP1Done(true) }
          else { setP2Floors(TARGET_FLOORS); setP2Done(true) }
          if (p1Done || p2Done) {
            // other player already done -> game over
            music.blip('win')
            phaseRef.current = 'done'; setPhase('done')
          } else {
            music.blip('win')
            setTimeout(() => {
              setP1Turn((t) => !t)
              initTower()
            }, 800)
          }
        } else {
          music.blip('win')
          const wasComplete = completed[level]
          completeLevel(level)
          const allDone = LEVELS.every((_, i) => (i === level ? true : completed[i]))
          if (allDone && !wasComplete && !medals.skyscraper) setTimeout(() => setShowMedal(true), 600)
          setTimeout(() => { phaseRef.current = 'done'; setPhase('done') }, 600)
        }
        return
      }
      swingRef.current = 0; swingDirRef.current = 1
    }

    const step = (now: number) => {
      const c = cfgRef.current
      let dt = (now - last) / 16.667; last = now
      if (dt > 2.5) dt = 2.5
      if (shakeRef.current > 0) shakeRef.current -= dt

      if (!fallRef.current) {
        // speed up gradually in 2p mode
        const speedMult = modeRef.current === '2p' ? 1 + floorCountRef.current * 0.08 : 1
        swingRef.current += swingDirRef.current * c.speed * 2 * speedMult * dt
        if (swingRef.current > 130) { swingRef.current = 130; swingDirRef.current = -1 }
        if (swingRef.current < -130) { swingRef.current = -130; swingDirRef.current = 1 }
      } else {
        const fb = fallRef.current
        fb.vy += 0.9 * dt
        fb.y += fb.vy * dt
        if (fb.y >= currentYRef.current - BLOCK_H) {
          fb.y = currentYRef.current - BLOCK_H
          settle()
          if (phaseRef.current !== 'playing') return
        }
      }
      draw(ctx)
      if (phaseRef.current === 'playing' || shakeRef.current > 0) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [phase, level, completed, completeLevel, medals.skyscraper, p1Turn, p1Done, p2Done, initTower])

  const handleTap = () => {
    if (phase !== 'playing') return
    if (fallRef.current) return
    const swingX = W / 2 + swingRef.current
    fallRef.current = { x: swingX, w: BLOCK_W, y: currentYRef.current - BLOCK_H * 3, vy: 0, color: COLORS[floorCountRef.current % COLORS.length], settled: false }
    music.sfx('whoosh')
  }

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    if (shakeRef.current > 0) ctx.translate((Math.random() - 0.5) * shakeRef.current * 0.5, (Math.random() - 0.5) * shakeRef.current * 0.5)
    const c = cfgRef.current
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, c.bg[0]); grad.addColorStop(1, c.bg[1])
    ctx.fillStyle = grad; ctx.fillRect(-20, -20, W + 40, H + 40)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath(); ctx.ellipse(60, 60, 30, 15, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(300, 80, 35, 18, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#65a30d'; ctx.fillRect(-20, GROUND_Y, W + 40, H - GROUND_Y + 20)
    ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-20, GROUND_Y); ctx.lineTo(W + 20, GROUND_Y); ctx.stroke()

    for (const b of placedRef.current) {
      ctx.save(); ctx.translate(b.x, b.y - BLOCK_H / 2); ctx.rotate(b.tilt)
      ctx.fillStyle = b.color; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5
      ctx.fillRect(-b.w / 2, -BLOCK_H / 2, b.w, BLOCK_H); ctx.strokeRect(-b.w / 2, -BLOCK_H / 2, b.w, BLOCK_H)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-b.w / 2 + 5, -BLOCK_H / 2 + 5, b.w - 10, BLOCK_H - 10)
      ctx.restore()
    }
    if (fallRef.current) {
      const fb = fallRef.current
      ctx.fillStyle = fb.color; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5
      ctx.fillRect(fb.x - fb.w / 2, fb.y, fb.w, BLOCK_H); ctx.strokeRect(fb.x - fb.w / 2, fb.y, fb.w, BLOCK_H)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(fb.x - fb.w / 2 + 5, fb.y + 5, fb.w - 10, BLOCK_H - 10)
    } else {
      const swingX = W / 2 + swingRef.current
      const swingY = Math.max(35, currentYRef.current - BLOCK_H * 3)
      ctx.fillStyle = COLORS[floorCountRef.current % COLORS.length]; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.9
      ctx.fillRect(swingX - BLOCK_W / 2, swingY, BLOCK_W, BLOCK_H); ctx.strokeRect(swingX - BLOCK_W / 2, swingY, BLOCK_W, BLOCK_H)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(swingX - BLOCK_W / 2 + 5, swingY + 5, BLOCK_W - 10, BLOCK_H - 10)
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(swingX, swingY + BLOCK_H); ctx.lineTo(swingX, currentYRef.current); ctx.stroke(); ctx.setLineDash([])
    }
    // 2p label
    if (modeRef.current === '2p') {
      ctx.fillStyle = p1Turn ? 'rgba(59,130,246,0.8)' : 'rgba(244,63,94,0.8)'
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(p1Turn ? '🟦 Игрок 1' : '🟥 Игрок 2', W / 2, 25)
    }
    ctx.restore()
  }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🏙️</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-sky-800">{t('game.skyscraper')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-sky-700">{t('sky.desc')}</p>

          {/* mode select */}
          <div className="mt-4 flex gap-3">
            <button onClick={() => { setMode('1p'); music.sfx('pop') }} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black shadow-md transition ${mode === '1p' ? 'bg-sky-600 text-white scale-105' : 'bg-white/80 text-sky-700'}`}><User className="h-4 w-4" /> 1 игрок</button>
            <button onClick={() => { setMode('2p'); music.sfx('pop') }} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black shadow-md transition ${mode === '2p' ? 'bg-sky-600 text-white scale-105' : 'bg-white/80 text-sky-700'}`}><Users className="h-4 w-4" /> 2 игрока</button>
          </div>
          {mode === '2p' && <p className="mt-2 text-xs font-bold text-sky-700">🟦 Игрок 1 строит первым → 🟥 Игрок 2. Кто построит выше — победил!</p>}

          <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => {
              const done = completed[i]
              const locked = i > 0 && !completed[i - 1] && !medals.skyscraper
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i, mode)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-sky-400 bg-sky-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`sky.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-sky-600">7 {t('sky.floors')}</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-sky-600">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          {medals.skyscraper && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('sky.medalSub')}</span>}
        </div>
      </div>
    )
  }

  // determine winner in 2p
  const winner2p = mode === '2p' && phase === 'done'
    ? (p1Floors > p2Floors ? 'p1' : p2Floors > p1Floors ? 'p2' : 'tie')
    : null

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-sky-100 to-cyan-200">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-3 py-12">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-sky-800 sm:text-sm">
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">{cfg.emoji} {t(`sky.${cfg.name}`)}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">🏙️ {floors}/{TARGET_FLOORS}</span>
          {mode === '2p' && <span className="rounded-full px-3 py-1 shadow text-white ${p1Turn ? 'bg-sky-500' : 'bg-rose-500'}">{p1Turn ? '🟦 P1' : '🟥 P2'}</span>}
        </div>
        {mode === '2p' && (
          <div className="mb-2 flex gap-4 text-sm font-black">
            <span className="text-sky-600">🟦 {p1Floors}</span>
            <span className="text-rose-600">{p2Floors} 🟥</span>
          </div>
        )}
        <div className="w-full max-w-[380px] overflow-hidden rounded-3xl border-4 border-white shadow-2xl" style={{ touchAction: 'none' }} onPointerDown={handleTap}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full cursor-pointer" style={{ aspectRatio: `${W}/${H}` }} />
        </div>
        <p className="mt-3 text-center text-xs font-bold text-sky-700">{t('sky.tip')}</p>
      </div>

      <AnimatePresence>
        {phase === 'dead' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-400 to-red-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <div className="text-7xl">💥</div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('sky.fell')}</h2>
              <p className="mt-1 font-bold">🏙️ {floors}/{TARGET_FLOORS}</p>
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => startLevel(level, mode)} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{mode === '2p' ? (winner2p === 'tie' ? '🤝' : winner2p === 'p1' ? '🟦' : '🟥') : cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {mode === '2p' ? (winner2p === 'tie' ? 'Ничья!' : winner2p === 'p1' ? '🟦 Игрок 1 победил!' : '🟥 Игрок 2 победил!') : t('sky.done')}
              </h2>
              <p className="mt-1 font-bold">
                {mode === '2p' ? `🟦 ${p1Floors} — ${p2Floors} 🟥` : `🏙️ 7/7 ${t('sky.floors')}`}
              </p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('sky.medalSub')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => startLevel(level, mode)} className="h-12 rounded-full bg-white text-base font-black text-sky-700 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
