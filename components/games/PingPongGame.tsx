'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw, Users, Cpu } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const W = 400, H = 500
const PADDLE_W = 80, PADDLE_H = 12
const BALL_R = 8
const WIN_SCORE = 7

type Phase = 'intro' | 'playing' | 'done'
type Mode = 'cpu' | '2p'

interface LevelCfg { id: number; name: string; emoji: string; ballSpeed: number; cpuSpeed: number; cpuMiss: number; cpuPredict: number; medalPlace: string }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', ballSpeed: 3.0, cpuSpeed: 2.0, cpuMiss: 0.30, cpuPredict: 0, medalPlace: '🥉' },
  { id: 1, name: 'medium', emoji: '🟡', ballSpeed: 4.0, cpuSpeed: 3.2, cpuMiss: 0.12, cpuPredict: 0.5, medalPlace: '🥈' },
  { id: 2, name: 'hard', emoji: '🔴', ballSpeed: 5.0, cpuSpeed: 4.5, cpuMiss: 0.03, cpuPredict: 0.85, medalPlace: '🥇' },
]

export function PingPongGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.safecrackerCompleted) // reuse for simplicity
  const medals = useGameStore((s) => s.medals)
  const awardMedal = useGameStore((s) => s.awardMedal)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [mode, setMode] = useState<Mode>('cpu')
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [showMedal, setShowMedal] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const cfgRef = useRef(LEVELS[0])
  const modeRef = useRef<Mode>('cpu')

  // game state in refs
  const ballX = useRef(W / 2)
  const ballY = useRef(H / 2)
  const ballVX = useRef(3)
  const ballVY = useRef(3)
  const paddle1Y = useRef(H - 30) // bottom (player 1)
  const paddle2Y = useRef(30)     // top (CPU or player 2)
  const paddle1X = useRef(W / 2)
  const paddle2X = useRef(W / 2)
  const score1Ref = useRef(0)
  const score2Ref = useRef(0)
  const touchSide = useRef<'left' | 'right' | null>(null) // for 2p split screen

  const cfg = LEVELS[level]

  const startLevel = useCallback((lv: number, m: Mode) => {
    setLevel(lv); cfgRef.current = LEVELS[lv]
    setMode(m); modeRef.current = m
    setScore1(0); setScore2(0); setShowMedal(false)
    score1Ref.current = 0; score2Ref.current = 0
    ballX.current = W / 2; ballY.current = H / 2
    ballVX.current = Math.random() > 0.5 ? cfgRef.current.ballSpeed : -cfgRef.current.ballSpeed
    ballVY.current = cfgRef.current.ballSpeed
    paddle1X.current = W / 2; paddle2X.current = W / 2
    setPhase('playing'); phaseRef.current = 'playing'
  }, [])

  // pointer control: bottom half = player 1, top half = player 2
  const handlePointer = (e: React.PointerEvent) => {
    const canvas = canvasRef.current; if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) * (W / r.width)
    const y = (e.clientY - r.top) * (H / r.height)
    if (y > H / 2) {
      paddle1X.current = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x))
    } else if (modeRef.current === '2p') {
      paddle2X.current = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x))
    }
  }

  // keyboard: A/D for P1, arrows for P2
  useEffect(() => {
    if (phase !== 'playing') return
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') { paddle2X.current = Math.max(PADDLE_W / 2, paddle2X.current - 20); e.preventDefault() }
      if (e.code === 'ArrowRight') { paddle2X.current = Math.min(W - PADDLE_W / 2, paddle2X.current + 20); e.preventDefault() }
      if (e.code === 'KeyA') { paddle1X.current = Math.max(PADDLE_W / 2, paddle1X.current - 20) }
      if (e.code === 'KeyD') { paddle1X.current = Math.min(W - PADDLE_W / 2, paddle1X.current + 20) }
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let last = performance.now()

    const resetBall = (towards: number) => {
      ballX.current = W / 2; ballY.current = H / 2
      ballVX.current = (Math.random() > 0.5 ? 1 : -1) * cfgRef.current.ballSpeed
      ballVY.current = towards * cfgRef.current.ballSpeed
    }

    const checkWin = () => {
      if (score1Ref.current >= WIN_SCORE || score2Ref.current >= WIN_SCORE) {
        music.blip('win')
        const p1Won = score1Ref.current >= WIN_SCORE
        // award medal if beat CPU on any level (first time)
        if (modeRef.current === 'cpu' && p1Won && !medals.pingpong) {
          awardMedal('pingpong')
          setTimeout(() => setShowMedal(true), 600)
        }
        phaseRef.current = 'done'; setPhase('done')
        return true
      }
      return false
    }

    const step = (now: number) => {
      const c = cfgRef.current
      let dt = (now - last) / 16.667; last = now
      if (dt > 2.5) dt = 2.5

      // CPU movement — smart with prediction + miss chance
      if (modeRef.current === 'cpu') {
        if (ballVY.current < 0) {
          // ball moving towards CPU — predict where it will be
          if (Math.random() > c.cpuMiss) {
            // predict landing point (simple: current x + some velocity-based offset)
            let predictedX = ballX.current
            if (c.cpuPredict > 0) {
              // estimate where ball will be when it reaches CPU's y
              const distY = ballY.current - paddle2Y.current
              const timeToReach = distY / Math.abs(ballVY.current)
              predictedX = ballX.current + ballVX.current * timeToReach * c.cpuPredict
              // account for wall bounces (simplified)
              while (predictedX < BALL_R || predictedX > W - BALL_R) {
                if (predictedX < BALL_R) predictedX = 2 * BALL_R - predictedX
                if (predictedX > W - BALL_R) predictedX = 2 * (W - BALL_R) - predictedX
              }
            }
            const target = predictedX
            const diff = target - paddle2X.current
            paddle2X.current += Math.sign(diff) * Math.min(Math.abs(diff), c.cpuSpeed * dt)
            paddle2X.current = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, paddle2X.current))
          }
        } else {
          // ball moving away — CPU drifts towards center slowly
          const diff = W / 2 - paddle2X.current
          paddle2X.current += Math.sign(diff) * Math.min(Math.abs(diff), c.cpuSpeed * 0.3 * dt)
        }
      }

      // ball movement
      ballX.current += ballVX.current * dt
      ballY.current += ballVY.current * dt

      // wall collisions
      if (ballX.current < BALL_R) { ballX.current = BALL_R; ballVX.current = Math.abs(ballVX.current) }
      if (ballX.current > W - BALL_R) { ballX.current = W - BALL_R; ballVX.current = -Math.abs(ballVX.current) }

      // paddle collisions
      // bottom paddle (P1)
      if (ballY.current > paddle1Y.current - BALL_R - PADDLE_H / 2 &&
          ballY.current < paddle1Y.current + PADDLE_H / 2 &&
          Math.abs(ballX.current - paddle1X.current) < PADDLE_W / 2 + BALL_R &&
          ballVY.current > 0) {
        ballVY.current = -Math.abs(ballVY.current)
        // speed up ball slightly on each hit (capped)
        const speedUp = 1.04
        ballVX.current *= speedUp; ballVY.current *= speedUp
        const maxSpeed = c.ballSpeed * 2.2
        ballVX.current = Math.max(-maxSpeed, Math.min(maxSpeed, ballVX.current))
        ballVY.current = Math.max(-maxSpeed, Math.min(maxSpeed, ballVY.current))
        // add angle based on hit position
        const hitPos = (ballX.current - paddle1X.current) / (PADDLE_W / 2)
        ballVX.current += hitPos * 1.2
        music.sfx('pop')
      }
      // top paddle (P2/CPU)
      if (ballY.current < paddle2Y.current + BALL_R + PADDLE_H / 2 &&
          ballY.current > paddle2Y.current - PADDLE_H / 2 &&
          Math.abs(ballX.current - paddle2X.current) < PADDLE_W / 2 + BALL_R &&
          ballVY.current < 0) {
        ballVY.current = Math.abs(ballVY.current)
        const speedUp = 1.04
        ballVX.current *= speedUp; ballVY.current *= speedUp
        const maxSpeed = c.ballSpeed * 2.2
        ballVX.current = Math.max(-maxSpeed, Math.min(maxSpeed, ballVX.current))
        ballVY.current = Math.max(-maxSpeed, Math.min(maxSpeed, ballVY.current))
        const hitPos = (ballX.current - paddle2X.current) / (PADDLE_W / 2)
        ballVX.current += hitPos * 1.2
        music.sfx('pop')
      }

      // scoring
      if (ballY.current > H + BALL_R * 2) {
        score2Ref.current++; setScore2(score2Ref.current)
        music.sfx('hurt')
        if (checkWin()) return
        resetBall(-1)
      }
      if (ballY.current < -BALL_R * 2) {
        score1Ref.current++; setScore1(score1Ref.current)
        music.sfx('coin')
        if (checkWin()) return
        resetBall(1)
      }

      draw(ctx)
      if (phaseRef.current === 'playing') rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [phase, level, medals.pingpong, awardMedal])

  const draw = (ctx: CanvasRenderingContext2D) => {
    // bg
    ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, W, H)
    // center line
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8])
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.setLineDash([])

    // paddles
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(paddle1X.current - PADDLE_W / 2, paddle1Y.current - PADDLE_H / 2, PADDLE_W, PADDLE_H)
    ctx.fillStyle = modeRef.current === '2p' ? '#ef4444' : '#94a3b8'
    ctx.fillRect(paddle2X.current - PADDLE_W / 2, paddle2Y.current - PADDLE_H / 2, PADDLE_W, PADDLE_H)

    // ball
    ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(ballX.current, ballY.current, BALL_R, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0

    // scores
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(String(score2Ref.current), W / 2, H / 2 - 30)
    ctx.fillText(String(score1Ref.current), W / 2, H / 2 + 50)

    // labels
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(modeRef.current === '2p' ? '🟥 P2 (↑↓)' : '🤖 CPU', W / 2, 20)
    ctx.fillText('🟦 P1 (A/D)', W / 2, H - 10)
  }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🏓</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-amber-300">Пинг-Понг</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-purple-200">Отбивай мяч ракеткой! Первый до 7 очков побеждает.</p>

          <div className="mt-4 flex gap-3">
            <button onClick={() => { setMode('cpu'); music.sfx('pop') }} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black shadow-md transition ${mode === 'cpu' ? 'bg-amber-500 text-white scale-105' : 'bg-white/10 text-amber-200'}`}><Cpu className="h-4 w-4" /> Против робота</button>
            <button onClick={() => { setMode('2p'); music.sfx('pop') }} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black shadow-md transition ${mode === '2p' ? 'bg-amber-500 text-white scale-105' : 'bg-white/10 text-amber-200'}`}><Users className="h-4 w-4" /> 2 игрока</button>
          </div>
          {mode === '2p' && <p className="mt-2 text-xs font-bold text-purple-200">🟦 P1: низ экрана (A/D) · 🟥 P2: верх (←/→)</p>}
          {mode === 'cpu' && <p className="mt-2 text-xs font-bold text-purple-200">🟦 Ты: низ (A/D или тап) · 🤖 Робот: верх</p>}

          <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => (
              <button key={i} onClick={() => startLevel(i, mode)} className="relative flex flex-col items-center gap-1 rounded-2xl border-2 border-white/20 bg-white/5 p-4 text-center shadow-md transition hover:scale-105">
                <span className="text-3xl">{l.medalPlace}</span>
                <span className="text-sm font-black text-white">{l.emoji} {t(`safe.${l.name}`)}</span>
                <span className="text-xs font-semibold text-amber-300">До 7 очков</span>
                <span className="text-xs font-bold text-amber-400">{t('common.play')}</span>
              </button>
            ))}
          </div>
          {medals.pingpong && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 Медаль получена!</span>}
        </div>
      </div>
    )
  }

  const p1Won = score1 >= WIN_SCORE
  const winner = mode === '2p' ? (p1Won ? '🟦 Игрок 1' : '🟥 Игрок 2') : (p1Won ? '🟦 Ты победил!' : '🤖 Робот победил!')

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-3 py-12">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-amber-300 sm:text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1 shadow">{cfg.emoji}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 shadow">🟦 {score1} : {score2} {mode === '2p' ? '🟥' : '🤖'}</span>
        </div>
        <div className="w-full max-w-[400px] overflow-hidden rounded-3xl border-4 border-white/20 shadow-2xl" style={{ touchAction: 'none' }} onPointerMove={handlePointer} onPointerDown={handlePointer}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full cursor-pointer" style={{ aspectRatio: `${W}/${H}` }} />
        </div>
        <p className="mt-3 text-center text-xs font-bold text-purple-200">💡 Тапай / двигай пальцем по полю. ПК: A/D — низ, ←/→ — верх</p>
      </div>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{p1Won ? '🎉' : '😢'}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{winner}</h2>
              <p className="mt-1 font-bold">🟦 {score1} : {score2} {mode === '2p' ? '🟥' : '🤖'}</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => startLevel(level, mode)} className="h-12 rounded-full bg-white text-base font-black text-amber-700 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
