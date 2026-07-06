'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const W = 400, H = 480
const CX = W / 2, CY = H / 2 - 20
const RADIUS = 140
const TARGET_HITS = 5
const DOT_WINDOW = 0.22 // radians — how close the arrow must be to the dot

type Phase = 'intro' | 'playing' | 'dead' | 'done'

interface LevelCfg { id: number; name: string; emoji: string; baseSpeed: number; speedUp: number; medalPlace: string }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', baseSpeed: 0.025, speedUp: 0.006, medalPlace: '🥉' },
  { id: 1, name: 'medium', emoji: '🟡', baseSpeed: 0.035, speedUp: 0.009, medalPlace: '🥈' },
  { id: 2, name: 'hard', emoji: '🔴', baseSpeed: 0.045, speedUp: 0.012, medalPlace: '🥇' },
]

export function SafecrackerGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.safecrackerCompleted)
  const completeLevel = useGameStore((s) => s.completeSafecrackerLevel)
  const medals = useGameStore((s) => s.medals)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [hits, setHits] = useState(0)
  const [showMedal, setShowMedal] = useState(false)
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const cfgRef = useRef(LEVELS[0])
  const angleRef = useRef(-Math.PI / 2) // start at top
  const dirRef = useRef(1) // 1 = clockwise, -1 = counterclockwise
  const speedRef = useRef(0.025)
  const dotAngleRef = useRef(0)
  const hitsRef = useRef(0)
  const flashLifeRef = useRef(0)

  const cfg = LEVELS[level]

  const startLevel = useCallback((lv: number) => {
    setLevel(lv); cfgRef.current = LEVELS[lv]
    speedRef.current = LEVELS[lv].baseSpeed
    setHits(0); hitsRef.current = 0; setShowMedal(false)
    angleRef.current = -Math.PI / 2; dirRef.current = 1
    dotAngleRef.current = Math.random() * Math.PI * 2
    flashLifeRef.current = 0; setFlash(null)
    setPhase('playing'); phaseRef.current = 'playing'
  }, [])

  // main loop
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let last = performance.now()

    const step = (now: number) => {
      const c = cfgRef.current
      let dt = (now - last) / 16.667; last = now
      if (dt > 2.5) dt = 2.5

      // move arrow
      angleRef.current += dirRef.current * speedRef.current * dt
      // wrap to 0..2PI
      if (angleRef.current > Math.PI * 2) angleRef.current -= Math.PI * 2
      if (angleRef.current < 0) angleRef.current += Math.PI * 2

      if (flashLifeRef.current > 0) {
        flashLifeRef.current -= dt
        if (flashLifeRef.current <= 0) setFlash(null)
      }

      draw(ctx)
      if (phaseRef.current === 'playing') rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [phase, level])

  const handleTap = () => {
    if (phase !== 'playing') return
    // check if arrow is within window of dot
    let diff = Math.abs(angleRef.current - dotAngleRef.current)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    if (diff < DOT_WINDOW) {
      // hit!
      hitsRef.current += 1; setHits(hitsRef.current)
      music.sfx('perfect')
      setFlash('good'); flashLifeRef.current = 15
      if (hitsRef.current >= TARGET_HITS) {
        // level complete!
        music.blip('win')
        const wasComplete = completed[level]
        completeLevel(level)
        const allDone = LEVELS.every((_, i) => (i === level ? true : completed[i]))
        if (allDone && !wasComplete && !medals.safecracker) setTimeout(() => setShowMedal(true), 600)
        setTimeout(() => { phaseRef.current = 'done'; setPhase('done') }, 500)
        return
      }
      // next: new dot, reverse direction, speed up
      dotAngleRef.current = Math.random() * Math.PI * 2
      dirRef.current *= -1
      speedRef.current += cfgRef.current.speedUp
    } else {
      // miss — game over
      music.sfx('hurt')
      setFlash('bad'); flashLifeRef.current = 20
      setTimeout(() => { phaseRef.current = 'dead'; setPhase('dead') }, 300)
    }
  }

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, W, H)
    // bg
    const grad = ctx.createRadialGradient(CX, CY, 50, CX, CY, 250)
    grad.addColorStop(0, '#1e293b'); grad.addColorStop(1, '#0f172a')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

    // outer ring (safe dial)
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 8
    ctx.beginPath(); ctx.arc(CX, CY, RADIUS + 10, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(CX, CY, RADIUS, 0, Math.PI * 2); ctx.stroke()

    // tick marks
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(CX + Math.cos(a) * (RADIUS - 8), CY + Math.sin(a) * (RADIUS - 8))
      ctx.lineTo(CX + Math.cos(a) * RADIUS, CY + Math.sin(a) * RADIUS)
      ctx.stroke()
    }

    // green dot
    const dx = CX + Math.cos(dotAngleRef.current) * RADIUS
    const dy = CY + Math.sin(dotAngleRef.current) * RADIUS
    // glow
    ctx.fillStyle = 'rgba(34,197,94,0.3)'
    ctx.beginPath(); ctx.arc(dx, dy, 18, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#22c55e'; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(dx, dy, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

    // arrow
    const ax = CX + Math.cos(angleRef.current) * RADIUS
    const ay = CY + Math.sin(angleRef.current) * RADIUS
    ctx.strokeStyle = flash === 'good' ? '#22c55e' : flash === 'bad' ? '#ef4444' : '#fbbf24'
    ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(ax, ay); ctx.stroke()
    // arrowhead
    ctx.fillStyle = ctx.strokeStyle
    ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2); ctx.fill()

    // center hub
    ctx.fillStyle = '#64748b'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(CX, CY, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

    // flash overlay
    if (flash === 'good' && flashLifeRef.current > 0) {
      ctx.fillStyle = `rgba(34,197,94,${flashLifeRef.current / 30})`
      ctx.fillRect(0, 0, W, H)
    } else if (flash === 'bad' && flashLifeRef.current > 0) {
      ctx.fillStyle = `rgba(239,68,68,${flashLifeRef.current / 40})`
      ctx.fillRect(0, 0, W, H)
    }
  }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🔓</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-amber-300">{t('game.safecracker')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-slate-300">{t('safe.desc')}</p>
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => {
              const done = completed[i]
              const locked = i > 0 && !completed[i - 1] && !medals.safecracker
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center shadow-md transition ${locked ? 'border-gray-600 bg-gray-800 opacity-60' : done ? 'border-amber-400 bg-amber-950/50 hover:scale-105' : 'border-white/20 bg-white/10 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-white">{l.emoji} {t(`safe.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-amber-300">5 {t('safe.hits')}</span>
                  {done && <span className="text-xs font-bold text-emerald-400">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-500">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-amber-300">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          {medals.safecracker && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('safe.medalSub')}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-slate-800 to-gray-900">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-3 py-12">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-amber-300 sm:text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1 shadow">{cfg.emoji} {t(`safe.${cfg.name}`)}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 shadow">✅ {hits}/{TARGET_HITS}</span>
        </div>
        <div className="w-full max-w-[400px] overflow-hidden rounded-3xl border-4 border-slate-600 shadow-2xl" style={{ touchAction: 'none' }} onPointerDown={handleTap}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full cursor-pointer" style={{ aspectRatio: `${W}/${H}` }} />
        </div>
        <p className="mt-3 text-center text-xs font-bold text-amber-300">{t('safe.tip')}</p>
      </div>

      <AnimatePresence>
        {phase === 'dead' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-500 to-red-700 p-6 text-center text-white shadow-2xl sm:p-8">
              <div className="text-7xl">🔒</div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('safe.missed')}</h2>
              <p className="mt-1 font-bold">✅ {hits}/{TARGET_HITS}</p>
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => startLevel(level)} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('safe.done')}</h2>
              <p className="mt-1 font-bold">✅ 5/5 {t('safe.hits')}</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('safe.medalSub')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1); else setPhase('intro') }} className="h-12 rounded-full bg-white text-base font-black text-amber-700 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
