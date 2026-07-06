'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const GAME_TIME = 20
const CANDY_EMOJIS = ['🍬', '🍫', '🍭', '🧁', '🍪', '🍩', '🍰', '🧁']

type Phase = 'intro' | 'playing' | 'done'

interface Candy { id: number; x: number; y: number; emoji: string; owner: 'left' | 'right'; collected: boolean }

export function CandyRaceGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const medals = useGameStore((s) => s.medals)
  const awardMedal = useGameStore((s) => s.awardMedal)

  const [phase, setPhase] = useState<Phase>('intro')
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [candies, setCandies] = useState<Candy[]>([])
  const [showMedal, setShowMedal] = useState(false)

  const candiesRef = useRef<Candy[]>([])
  const score1Ref = useRef(0)
  const score2Ref = useRef(0)
  const candyIdRef = useRef(0)
  const phaseRef = useRef<Phase>('intro')

  const start = useCallback(() => {
    setScore1(0); setScore2(0); setTimeLeft(GAME_TIME); setShowMedal(false)
    setCandies([]); candiesRef.current = []
    score1Ref.current = 0; score2Ref.current = 0; candyIdRef.current = 0
    setPhase('playing'); phaseRef.current = 'playing'
  }, [])

  // spawn candies — simultaneously on BOTH sides at different positions
  useEffect(() => {
    if (phase !== 'playing') return
    const spawn = () => {
      if (phaseRef.current !== 'playing') return
      // spawn one for P1 (left) and one for P2 (right) at the same time
      const x1 = 10 + Math.random() * 80
      const y1 = 15 + Math.random() * 65
      const x2 = 10 + Math.random() * 80
      const y2 = 15 + Math.random() * 65
      const emoji1 = CANDY_EMOJIS[Math.floor(Math.random() * CANDY_EMOJIS.length)]
      const emoji2 = CANDY_EMOJIS[Math.floor(Math.random() * CANDY_EMOJIS.length)]
      const candy1: Candy = { id: candyIdRef.current++, x: x1, y: y1, emoji: emoji1, owner: 'left', collected: false }
      const candy2: Candy = { id: candyIdRef.current++, x: x2, y: y2, emoji: emoji2, owner: 'right', collected: false }
      candiesRef.current = [...candiesRef.current, candy1, candy2]
      setCandies(candiesRef.current)
      // auto-remove after 1.5s
      setTimeout(() => {
        candiesRef.current = candiesRef.current.filter((c) => c.id !== candy1.id && c.id !== candy2.id)
        setCandies(candiesRef.current)
      }, 1500)
    }
    const interval = setInterval(spawn, 1000)
    spawn()
    return () => clearInterval(interval)
  }, [phase])

  // countdown
  useEffect(() => {
    if (phase !== 'playing') return
    const timer = setInterval(() => {
      setTimeLeft((tl) => {
        if (tl <= 1) {
          clearInterval(timer)
          music.blip('win')
          const p1Won = score1Ref.current > score2Ref.current
          if (p1Won && !medals.candyrace) { awardMedal('candyrace'); setTimeout(() => setShowMedal(true), 600) }
          phaseRef.current = 'done'; setPhase('done')
          return 0
        }
        return tl - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, medals.candyrace, awardMedal])

  const collect = (candy: Candy, player: 'left' | 'right') => {
    if (candy.collected || candy.owner !== player) return
    candiesRef.current = candiesRef.current.map((c) => c.id === candy.id ? { ...c, collected: true } : c)
    setCandies(candiesRef.current)
    if (player === 'left') { score1Ref.current++; setScore1(score1Ref.current) }
    else { score2Ref.current++; setScore2(score2Ref.current) }
    music.sfx('coin')
    setTimeout(() => {
      candiesRef.current = candiesRef.current.filter((c) => c.id !== candy.id)
      setCandies(candiesRef.current)
    }, 200)
  }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-pink-200 via-rose-200 to-orange-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🍬</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-rose-700">Сбор Конфет</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-rose-600">
            2 игрока! Конфеты появляются на твоей стороне — тапай быстрее соперника! 20 секунд. Кто больше собрал — победил!
          </p>
          <div className="mt-3 flex gap-4 text-sm font-black">
            <span className="rounded-full bg-sky-200 px-4 py-2 text-sky-700">🟦 Игрок 1 (слева)</span>
            <span className="rounded-full bg-rose-200 px-4 py-2 text-rose-700">🟥 Игрок 2 (справа)</span>
          </div>
          <button onClick={start} className="mt-6 rounded-full bg-gradient-to-b from-rose-500 to-pink-600 px-10 py-4 text-xl font-black text-white shadow-xl hover:scale-105 active:scale-95">
            ▶ Играть!
          </button>
          {medals.candyrace && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 Медаль получена!</span>}
        </div>
      </div>
    )
  }

  const winner = score1 > score2 ? '🟦 Игрок 1 победил!' : score2 > score1 ? '🟥 Игрок 2 победил!' : '🤝 Ничья!'

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-pink-100 to-orange-100">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-3 py-12">
        {/* HUD */}
        <div className="mb-2 flex w-full items-center justify-center gap-4 text-lg font-black">
          <span className="rounded-full bg-sky-200 px-4 py-1 text-sky-700">🟦 {score1}</span>
          <span className={`rounded-full px-4 py-1 text-white ${timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}>⏱️ {timeLeft}s</span>
          <span className="rounded-full bg-rose-200 px-4 py-1 text-rose-700">{score2} 🟥</span>
        </div>

        {/* Split play area */}
        <div className="relative w-full overflow-hidden rounded-3xl border-4 border-white shadow-2xl" style={{ aspectRatio: '3/4', touchAction: 'none' }}>
          {/* Left zone (P1) */}
          <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-sky-100 to-cyan-200" />
          {/* Right zone (P2) */}
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-bl from-rose-100 to-pink-200" />
          {/* Divider */}
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white/50" />

          {/* Candies */}
          {candies.map((candy) => (
            <motion.button
              key={candy.id}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: candy.collected ? 0 : 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              onClick={() => collect(candy, candy.owner)}
              className="absolute flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-lg"
              style={{
                left: candy.owner === 'left' ? `${candy.x * 0.5}%` : `${50 + candy.x * 0.5}%`,
                top: `${candy.y}%`,
                backgroundColor: candy.owner === 'left' ? 'rgba(59,130,246,0.15)' : 'rgba(244,63,94,0.15)',
                border: `3px solid ${candy.owner === 'left' ? '#3b82f6' : '#f43f5e'}`,
              }}
            >
              {candy.emoji}
            </motion.button>
          ))}

          {/* Labels */}
          <div className="absolute bottom-2 left-2 text-xs font-black text-sky-600">🟦 P1</div>
          <div className="absolute bottom-2 right-2 text-xs font-black text-rose-600">P2 🟥</div>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-rose-600">💡 Тапай по конфетам на своей стороне! Синяя рамка = твоя (P1), красная = твоя (P2)</p>
      </div>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-400 to-pink-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">🍬</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{winner}</h2>
              <p className="mt-1 font-bold">🟦 {score1} — {score2} 🟥</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={start} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> Ещё раз</Button>
                <Button onClick={() => setScreen('menu')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.menu')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
