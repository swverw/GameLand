'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const GAME_TIME = 15
const WIN_THRESHOLD = 100 // rope position 0..100, 50 = center

type Phase = 'intro' | 'playing' | 'done'

export function TapBattleGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const medals = useGameStore((s) => s.medals)
  const awardMedal = useGameStore((s) => s.awardMedal)

  const [phase, setPhase] = useState<Phase>('intro')
  const [ropePos, setRopePos] = useState(50) // 0 = P1 wins, 100 = P2 wins
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [showMedal, setShowMedal] = useState(false)
  const [p1Taps, setP1Taps] = useState(0)
  const [p2Taps, setP2Taps] = useState(0)
  const [flashSide, setFlashSide] = useState<'top' | 'bottom' | null>(null)

  const ropeRef = useRef(50)
  const p1TapsRef = useRef(0)
  const p2TapsRef = useRef(0)
  const phaseRef = useRef<Phase>('intro')
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    setRopePos(50); setTimeLeft(GAME_TIME); setShowMedal(false)
    setP1Taps(0); setP2Taps(0); setFlashSide(null)
    ropeRef.current = 50; p1TapsRef.current = 0; p2TapsRef.current = 0
    setPhase('playing'); phaseRef.current = 'playing'
  }, [])

  // countdown + rope drift back to center
  useEffect(() => {
    if (phase !== 'playing') return
    const interval = setInterval(() => {
      // rope slowly drifts toward center (50)
      ropeRef.current += (50 - ropeRef.current) * 0.02
      setRopePos(ropeRef.current)
    }, 50)
    const timer = setInterval(() => {
      setTimeLeft((tl) => {
        if (tl <= 1) {
          clearInterval(timer); clearInterval(interval)
          finishGame()
          return 0
        }
        return tl - 1
      })
    }, 1000)
    return () => { clearInterval(timer); clearInterval(interval) }
  }, [phase])

  const finishGame = () => {
    music.blip('win')
    const p1Won = ropeRef.current <= 50
    if (p1Won && !medals.tapbattle) { awardMedal('tapbattle'); setTimeout(() => setShowMedal(true), 600) }
    phaseRef.current = 'done'; setPhase('done')
  }

  // check win condition
  useEffect(() => {
    if (phase !== 'playing') return
    if (ropeRef.current <= 0 || ropeRef.current >= 100) {
      finishGame()
    }
  }, [ropePos, phase])

  const tap = (player: 'p1' | 'p2') => {
    if (phaseRef.current !== 'playing') return
    const power = 1.5 + Math.random() * 1 // each tap has slight randomness for fun
    if (player === 'p1') {
      ropeRef.current = Math.max(0, ropeRef.current - power)
      p1TapsRef.current++; setP1Taps(p1TapsRef.current)
      setFlashSide('top')
    } else {
      ropeRef.current = Math.min(100, ropeRef.current + power)
      p2TapsRef.current++; setP2Taps(p2TapsRef.current)
      setFlashSide('bottom')
    }
    setRopePos(ropeRef.current)
    music.sfx('pop')
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashSide(null), 100)
  }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">💪</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-white">Тап-Битва</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-purple-100">
            2 игрока! P1 (сверху) тянет канат вверх, P2 (снизу) — вниз. Тапай быстрее! 15 секунд или пока канат не дойдёт до края.
          </p>
          <div className="mt-3 flex gap-4 text-sm font-black">
            <span className="rounded-full bg-sky-300 px-4 py-2 text-sky-800">🟦 P1: тянет ВВЕРХ</span>
            <span className="rounded-full bg-rose-300 px-4 py-2 text-rose-800">🟥 P2: тянет ВНИЗ</span>
          </div>
          <button onClick={start} className="mt-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 px-10 py-4 text-xl font-black text-white shadow-xl hover:scale-105 active:scale-95">
            ⚡ Битва!
          </button>
          {medals.tapbattle && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 Медаль получена!</span>}
        </div>
      </div>
    )
  }

  const winner = ropePos <= 50 ? '🟦 Игрок 1 победил!' : '🟥 Игрок 2 победил!'

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-700">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-3 py-10">
        {/* HUD */}
        <div className="mb-2 flex w-full items-center justify-center gap-4 text-lg font-black">
          <span className="rounded-full bg-sky-300 px-3 py-1 text-sky-800">🟦 {p1Taps}</span>
          <span className={`rounded-full px-3 py-1 text-white ${timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}>⏱️ {timeLeft}s</span>
          <span className="rounded-full bg-rose-300 px-3 py-1 text-rose-800">{p2Taps} 🟥</span>
        </div>

        {/* Play area — split horizontally */}
        <div className="relative w-full overflow-hidden rounded-3xl border-4 border-white/40 shadow-2xl" style={{ aspectRatio: '3/4', touchAction: 'none' }}>
          {/* Top zone (P1) */}
          <button
            className="absolute left-0 top-0 flex h-1/2 w-full items-center justify-center transition-colors"
            style={{ backgroundColor: flashSide === 'top' ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.15)' }}
            onPointerDown={(e) => { e.preventDefault(); tap('p1') }}
          >
            <span className="text-5xl font-black text-sky-200/50 select-none">🟦 TAP!</span>
          </button>
          {/* Bottom zone (P2) */}
          <button
            className="absolute left-0 bottom-0 flex h-1/2 w-full items-center justify-center transition-colors"
            style={{ backgroundColor: flashSide === 'bottom' ? 'rgba(244,63,94,0.4)' : 'rgba(244,63,94,0.15)' }}
            onPointerDown={(e) => { e.preventDefault(); tap('p2') }}
          >
            <span className="text-5xl font-black text-rose-200/50 select-none">TAP! 🟥</span>
          </button>

          {/* Rope indicator */}
          <div className="absolute left-0 right-0 z-10 flex items-center justify-center" style={{ top: `${ropePos}%`, transition: 'top 0.05s linear' }}>
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-xl">
              <span className="text-2xl">🪢</span>
              <span className="text-sm font-black text-gray-700">{Math.round(50 - ropePos) > 0 ? `🟦 +${Math.round(50 - ropePos)}` : Math.round(50 - ropePos) < 0 ? `🟥 +${Math.round(ropePos - 50)}` : '0'}</span>
            </div>
          </div>

          {/* Center line */}
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-white/30" />

          {/* Win zones */}
          <div className="absolute left-0 right-0 top-0 h-2 bg-sky-500 shadow-lg" />
          <div className="absolute left-0 right-0 bottom-0 h-2 bg-rose-500 shadow-lg" />

          {/* Tap effects (visual feedback) */}
          {flashSide === 'top' && (
            <motion.div initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 text-6xl pointer-events-none">⚡</motion.div>
          )}
          {flashSide === 'bottom' && (
            <motion.div initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} className="absolute left-1/2 bottom-1/4 -translate-x-1/2 translate-y-1/2 text-6xl pointer-events-none">⚡</motion.div>
          )}
        </div>
        <p className="mt-3 text-center text-xs font-bold text-purple-100">💡 P1 тапает верхнюю половину, P2 — нижнюю. Канат сам плывёт к центру — тапай без остановки!</p>
      </div>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-700 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">💪</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{winner}</h2>
              <p className="mt-1 font-bold">🟦 {p1Taps} тапов · {p2Taps} тапов 🟥</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={start} className="h-12 rounded-full bg-white text-base font-black text-purple-700 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> Реванш!</Button>
                <Button onClick={() => setScreen('menu')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.menu')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
