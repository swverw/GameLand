'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, Users, User } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'
import { addScore, getScores, formatValue } from '@/lib/leaderboard'

type Phase = 'intro' | 'playing' | 'done'
type Mode = '1p' | '2p'

interface LevelCfg { id: number; name: string; emoji: string; showTime: number; gap: number; duration: number; medalPlace: string; descKey: string }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', showTime: 1300, gap: 600, duration: 30, medalPlace: '🥉', descKey: 'whack.easyDesc' },
  { id: 1, name: 'medium', emoji: '🟡', showTime: 950, gap: 450, duration: 30, medalPlace: '🥈', descKey: 'whack.medDesc' },
  { id: 2, name: 'hard', emoji: '🔴', showTime: 700, gap: 320, duration: 30, medalPlace: '🥇', descKey: 'whack.hardDesc' },
]

const FACES = ['🦔', '🐰', '🐹', '🦝', '🐻', '🦊', '🐭', '🐷']

export function WhackGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const whackCompleted = useGameStore((s) => s.whackCompleted)
  const completeWhackLevel = useGameStore((s) => s.completeWhackLevel)
  const medals = useGameStore((s) => s.medals)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [mode, setMode] = useState<Mode>('1p')
  const [active, setActive] = useState<number | null>(null)
  const [active2, setActive2] = useState<number | null>(null)
  const [face, setFace] = useState(FACES[0])
  const [score, setScore] = useState(0)
  const [score2, setScore2] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [hitFlash, setHitFlash] = useState<number | null>(null)
  const [hitFlash2, setHitFlash2] = useState<number | null>(null)
  const [showMedal, setShowMedal] = useState(false)
  const [done, setDone] = useState(false)

  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spawn2Ref = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfg = LEVELS[level]

  const startLevel = useCallback((lv: number, m: Mode) => {
    setLevel(lv); setMode(m)
    setScore(0); setScore2(0); setTimeLeft(LEVELS[lv].duration)
    setActive(null); setActive2(null); setHitFlash(null); setHitFlash2(null)
    setShowMedal(false); setDone(false); setPhase('playing')
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const c = LEVELS[level]
    const HOLES = mode === '2p' ? 3 : 9
    const spawn = (which: 1 | 2) => {
      const hole = Math.floor(Math.random() * HOLES)
      setFace(FACES[Math.floor(Math.random() * FACES.length)])
      if (which === 1) {
        setActive(hole)
        spawnRef.current = setTimeout(() => setActive(null), c.showTime)
      } else {
        setActive2(hole)
        spawn2Ref.current = setTimeout(() => setActive2(null), c.showTime)
      }
    }
    const interval = setInterval(() => spawn(1), c.showTime + c.gap)
    spawn(1)
    if (mode === '2p') { const i2 = setInterval(() => spawn(2), c.showTime + c.gap + 100); spawn(2); (window as any)._i2 = i2 }
    const countdown = setInterval(() => {
      setTimeLeft((tl) => Math.max(0, tl - 1))
    }, 1000)
    return () => { clearInterval(interval); clearInterval(countdown); if ((window as any)._i2) clearInterval((window as any)._i2); if (spawnRef.current) clearTimeout(spawnRef.current); if (spawn2Ref.current) clearTimeout(spawn2Ref.current) }
  }, [phase, level, mode])

  // finish when time runs out
  useEffect(() => {
    if (phase !== 'playing' || timeLeft > 0) return
    setPhase('done'); setDone(true); music.blip('win')
    const wasComplete = whackCompleted[level]
    completeWhackLevel(level)
    const allDone = LEVELS.every((_, i) => (i === level ? true : whackCompleted[i]))
    if (allDone && !wasComplete && !medals.whack) setTimeout(() => setShowMedal(true), 700)
  }, [timeLeft, phase, level, whackCompleted, completeWhackLevel, medals.whack])

  const hit = (hole: number, which: 1 | 2) => {
    if (phase !== 'playing') return
    const isActive = which === 1 ? active === hole : active2 === hole
    if (isActive) {
      if (which === 1) { setScore((s) => s + 1); setHitFlash(hole); setActive(null); if (spawnRef.current) clearTimeout(spawnRef.current) }
      else { setScore2((s) => s + 1); setHitFlash2(hole); setActive2(null); if (spawn2Ref.current) clearTimeout(spawn2Ref.current) }
      music.sfx('pop')
      setTimeout(() => { if (which === 1) setHitFlash(null); else setHitFlash2(null) }, 300)
    } else {
      music.sfx('hurt')
    }
  }

  const save1p = () => { addScore('whack', 'Игрок', score, false) }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-lime-100 via-green-100 to-emerald-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🔨</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-lime-800">{t('game.whack')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-lime-700">{t('whack.desc')}</p>

          {/* mode select */}
          <div className="mt-5 flex gap-3">
            <button onClick={() => { setMode('1p'); music.sfx('pop') }} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black shadow-md transition ${mode === '1p' ? 'bg-lime-600 text-white scale-105' : 'bg-white/80 text-lime-700'}`}><User className="h-4 w-4" /> {t('whack.mode1p')}</button>
            <button onClick={() => { setMode('2p'); music.sfx('pop') }} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black shadow-md transition ${mode === '2p' ? 'bg-lime-600 text-white scale-105' : 'bg-white/80 text-lime-700'}`}><Users className="h-4 w-4" /> {t('whack.mode2p')}</button>
          </div>

          <div className="mt-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => {
              const done = whackCompleted[i]
              const locked = i > 0 && !whackCompleted[i - 1] && !medals.whack
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i, mode)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-lime-400 bg-lime-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`whack.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-lime-600">{t(l.descKey)}</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-lime-600">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          {mode === '2p' && <p className="mt-3 text-xs font-bold text-lime-700">👈 {t('whack.p1')} · 👉 {t('whack.p2')}</p>}
          {mode === '1p' && (
            <div className="mt-5 w-full max-w-sm rounded-2xl bg-white/70 p-3 shadow-md">
              <div className="mb-1 text-center text-sm font-black text-lime-800">🏅 {t('menu.leadersTitle')}</div>
              {getScores('whack').length === 0 ? <div className="text-center text-xs font-semibold text-gray-500">{t('menu.leadersEmpty')}</div> : (
                <div className="space-y-1">{getScores('whack').slice(0, 5).map((e, i) => (<div key={i} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1 text-sm"><span className="font-black text-lime-700">{i + 1}. {e.name}</span><span className="font-bold text-gray-700">⭐ {formatValue('whack', e.value)}</span></div>))}</div>
              )}
            </div>
          )}
          {medals.whack && <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('whack.medalSub')}</span>}
        </div>
      </div>
    )
  }

  const renderHole = (i: number, which: 1 | 2) => {
    const act = which === 1 ? active : active2
    const flash = which === 1 ? hitFlash : hitFlash2
    const ringColor = which === 2 ? 'ring-rose-400' : 'ring-sky-400'
    return (
      <button key={i} onPointerDown={() => hit(i, which)} className={`relative aspect-square overflow-hidden rounded-full bg-gradient-to-b from-amber-700 to-amber-950 shadow-inner ring-2 ${which === 2 ? 'ring-rose-300' : 'ring-sky-300'}`}>
        <div className="absolute inset-0 rounded-full ring-4 ring-amber-800/50" />
        <AnimatePresence>
          {act === i && (
            <motion.div initial={{ y: '100%' }} animate={{ y: '15%' }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl">{face}</motion.div>
          )}
        </AnimatePresence>
        {flash === i && <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} className="absolute inset-0 flex items-center justify-center text-4xl">💥</motion.div>}
      </button>
    )
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-lime-100 via-green-100 to-emerald-200">
      {/* garden deco */}
      <div className="pointer-events-none absolute top-10 left-4 text-3xl opacity-50">🌷</div>
      <div className="pointer-events-none absolute top-16 right-6 text-3xl opacity-50">🌼</div>
      <div className="pointer-events-none absolute bottom-20 left-8 text-3xl opacity-50">🌻</div>
      <div className="pointer-events-none absolute bottom-24 right-4 text-3xl opacity-50">🌸</div>

      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center justify-center px-3 py-12">
        <div className="mb-3 flex w-full items-center justify-center gap-3">
          <div className={`rounded-full px-3 py-1 text-xs font-black shadow sm:text-sm ${timeLeft <= 5 ? 'animate-pulse bg-red-500 text-white' : 'bg-white/80 text-lime-700'}`}>⏱️ {timeLeft}s</div>
          {mode === '2p' ? (
            <>
              <div className="rounded-full bg-sky-500 px-3 py-1 text-xs font-black text-white shadow sm:text-sm">🟦 {score}</div>
              <div className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white shadow sm:text-sm">{score2} 🟥</div>
            </>
          ) : (
            <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-amber-600 shadow sm:text-sm">⭐ {score}</div>
          )}
        </div>

        {mode === '1p' ? (
          <div className="grid w-full max-w-sm grid-cols-3 gap-2.5">
            {Array.from({ length: 9 }).map((_, i) => renderHole(i, 1))}
          </div>
        ) : (
          <div className="grid w-full max-w-md grid-cols-2 gap-4">
            <div>
              <div className="mb-1 text-center text-xs font-black text-sky-700">🟦 {t('whack.p1')}</div>
              <div className="grid grid-cols-1 gap-2">{[0, 1, 2].map((i) => renderHole(i, 1))}</div>
            </div>
            <div>
              <div className="mb-1 text-center text-xs font-black text-rose-700">{t('whack.p2')} 🟥</div>
              <div className="grid grid-cols-1 gap-2">{[0, 1, 2].map((i) => renderHole(i, 2))}</div>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs font-bold text-lime-700">{t('whack.tip')}</p>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-lime-400 to-green-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{mode === '2p' ? (score > score2 ? '🟦' : score2 > score ? '🟥' : '🤝') : cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{mode === '2p' ? (score > score2 ? `${t('whack.p1')} ${t('whack.wins')}` : score2 > score ? `${t('whack.p2')} ${t('whack.wins')}` : t('memory.tie')) : t('whack.timeUp')}</h2>
              <p className="mt-1 font-bold">{mode === '2p' ? `🟦 ${score} — ${score2} 🟥` : `⭐ ${score}`}</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('whack.medalSub')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1, mode); else setPhase('intro') }} className="h-12 rounded-full bg-white text-base font-black text-lime-700 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
