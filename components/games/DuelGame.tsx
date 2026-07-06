'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const WIN_SCORE = 3

type Phase = 'intro' | 'waiting' | 'fire' | 'roundResult' | 'done'
type RoundResult = 'p1' | 'p2' | 'p1_early' | 'p2_early' | null

export function DuelGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const medals = useGameStore((s) => s.medals)
  const awardMedal = useGameStore((s) => s.awardMedal)

  const [phase, setPhase] = useState<Phase>('intro')
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [showMedal, setShowMedal] = useState(false)
  const [roundResult, setRoundResult] = useState<RoundResult>(null)
  const [roundMsg, setRoundMsg] = useState('')

  const score1Ref = useRef(0)
  const score2Ref = useRef(0)
  const phaseRef = useRef<Phase>('intro')
  const fireTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    setScore1(0); setScore2(0); setShowMedal(false); setRoundResult(null); setRoundMsg('')
    score1Ref.current = 0; score2Ref.current = 0
    startRound()
  }, [])

  const startRound = useCallback(() => {
    setRoundResult(null); setRoundMsg('Внимание...')
    phaseRef.current = 'waiting'; setPhase('waiting')
    const delay = 1500 + Math.random() * 3000
    fireTimer.current = setTimeout(() => {
      phaseRef.current = 'fire'; setPhase('fire')
      music.sfx('whoosh')
    }, delay)
  }, [])

  const handleTap = (player: 'p1' | 'p2') => {
    if (phaseRef.current === 'waiting') {
      // tapped too early — opponent gets the point
      clearTimeout(fireTimer.current!)
      const winner = player === 'p1' ? 'p2' : 'p1'
      if (winner === 'p1') { score1Ref.current++; setScore1(score1Ref.current) }
      else { score2Ref.current++; setScore2(score2Ref.current) }
      setRoundResult(winner === 'p1' ? 'p2_early' : 'p1_early')
      setRoundMsg(player === 'p1' ? 'P1 поторопился! → 🟦 +1' : 'P2 поторопился! → 🟥 +1')
      music.sfx('hurt')
      endRound()
    } else if (phaseRef.current === 'fire') {
      // correct tap — this player gets the point
      if (player === 'p1') { score1Ref.current++; setScore1(score1Ref.current) }
      else { score2Ref.current++; setScore2(score2Ref.current) }
      setRoundResult(player === 'p1' ? 'p1' : 'p2')
      setRoundMsg(player === 'p1' ? '🟦 P1 быстрее! +1' : '🟥 P2 быстрее! +1')
      music.sfx('coin')
      endRound()
    }
  }

  const endRound = () => {
    phaseRef.current = 'roundResult'; setPhase('roundResult')
    setTimeout(() => {
      if (score1Ref.current >= WIN_SCORE || score2Ref.current >= WIN_SCORE) {
        music.blip('win')
        const p1Won = score1Ref.current >= WIN_SCORE
        if (p1Won && !medals.duel) { awardMedal('duel'); setTimeout(() => setShowMedal(true), 600) }
        phaseRef.current = 'done'; setPhase('done')
      } else {
        startRound()
      }
    }, 1500)
  }

  useEffect(() => {
    return () => { if (fireTimer.current) clearTimeout(fireTimer.current) }
  }, [])

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-amber-900 via-orange-900 to-red-950">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🤠</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-amber-300">Ковбойская Дуэль</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-amber-200">
            2 игрока! Жди «ОГОНЬ!», потом тапай по своей половине. Поторопишь — очко сопернику! До 3 побед.
          </p>
          <div className="mt-3 flex gap-4 text-sm font-black">
            <span className="rounded-full bg-sky-200 px-4 py-2 text-sky-700">🟦 Игрок 1 (слева)</span>
            <span className="rounded-full bg-rose-200 px-4 py-2 text-rose-700">🟥 Игрок 2 (справа)</span>
          </div>
          <button onClick={start} className="mt-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 px-10 py-4 text-xl font-black text-white shadow-xl hover:scale-105 active:scale-95">
            ⚡ Дуэль!
          </button>
          {medals.duel && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 Медаль получена!</span>}
        </div>
      </div>
    )
  }

  const winner = score1 >= WIN_SCORE ? '🟦 Игрок 1 победил!' : score2 >= WIN_SCORE ? '🟥 Игрок 2 победил!' : ''

  // determine background based on phase
  const bgColor = phase === 'fire' ? 'from-red-500 to-orange-600' : phase === 'waiting' ? 'from-amber-800 to-yellow-900' : 'from-slate-700 to-gray-800'

  return (
    <div className={`relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br ${bgColor} transition-colors duration-300`}>
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-3 py-12">
        {/* HUD */}
        <div className="mb-3 flex w-full items-center justify-center gap-6 text-2xl font-black">
          <span className="rounded-full bg-sky-500 px-5 py-2 text-white shadow-lg">🟦 {score1}</span>
          <span className="text-amber-300">VS</span>
          <span className="rounded-full bg-rose-500 px-5 py-2 text-white shadow-lg">{score2} 🟥</span>
        </div>

        {/* Split screen play area */}
        <div className="relative w-full overflow-hidden rounded-3xl border-4 border-white/30 shadow-2xl" style={{ aspectRatio: '3/4', touchAction: 'none' }}>
          {/* Left zone (P1) */}
          <button
            className="absolute left-0 top-0 flex h-full w-1/2 items-center justify-center text-6xl font-black text-white/30 transition-colors hover:bg-white/5"
            onPointerDown={() => handleTap('p1')}
          >
            🟦
          </button>
          {/* Right zone (P2) */}
          <button
            className="absolute right-0 top-0 flex h-full w-1/2 items-center justify-center text-6xl font-black text-white/30 transition-colors hover:bg-white/5"
            onPointerDown={() => handleTap('p2')}
          >
            🟥
          </button>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {phase === 'waiting' && (
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-4xl sm:text-6xl font-black text-amber-300 drop-shadow-lg">
                ⏳ Внимание...
              </motion.div>
            )}
            {phase === 'fire' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="text-6xl sm:text-8xl font-black text-white drop-shadow-2xl">
                🔥 ОГОНЬ!
              </motion.div>
            )}
            {phase === 'roundResult' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <div className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">{roundMsg}</div>
              </motion.div>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-bold text-amber-200">💡 Жди «ОГОНЬ!», потом тапай по своей половине. Поторопишь → очко сопернику!</p>
      </div>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">🤠</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{winner}</h2>
              <p className="mt-1 font-bold">🟦 {score1} — {score2} 🟥</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={start} className="h-12 rounded-full bg-white text-base font-black text-amber-700 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> Реванш!</Button>
                <Button onClick={() => setScreen('menu')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.menu')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
