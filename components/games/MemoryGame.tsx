'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw, Cpu, Users } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

type Mode = '2p' | 'cpu' | null
type Player = 'blue' | 'red'

// 14 emojis -> 28 cards (14 pairs)
const EMOJIS = ['🍎', '🚀', '🌈', '🐱', '⭐', '🐟', '🌸', '🎈', '🦊', '🍄', '🚗', '🐢', '🐝', '🎸']

interface Card {
  id: number
  emoji: string
  pair: number
  flipped: boolean
  matched: boolean
  matchedBy: Player | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeDeck(): Card[] {
  const deck: Card[] = []
  EMOJIS.forEach((e, i) => {
    deck.push({ id: i * 2, emoji: e, pair: i, flipped: false, matched: false, matchedBy: null })
    deck.push({ id: i * 2 + 1, emoji: e, pair: i, flipped: false, matched: false, matchedBy: null })
  })
  return shuffle(deck)
}

export function MemoryGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const addMemoryWin = useGameStore((s) => s.addMemoryWin)
  const memoryWins = useGameStore((s) => s.memoryWinsVsCpu)
  const medals = useGameStore((s) => s.medals)

  const [mode, setMode] = useState<Mode>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [turn, setTurn] = useState<Player>('blue')
  const [scores, setScores] = useState({ blue: 0, red: 0 })
  const [flipped, setFlipped] = useState<number[]>([])
  const [locked, setLocked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [winner, setWinner] = useState<Player | 'tie' | null>(null)
  const [showMedal, setShowMedal] = useState(false)
  const [cpuTick, setCpuTick] = useState(0)

  const aiMemory = useRef<Map<number, string>>(new Map())
  const winCounted = useRef(false)
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback((m: Mode) => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current)
    setMode(m)
    setCards(makeDeck())
    setTurn('blue')
    setScores({ blue: 0, red: 0 })
    setFlipped([])
    setLocked(false)
    setFinished(false)
    setWinner(null)
    setShowMedal(false)
    setCpuTick(0)
    winCounted.current = false
    aiMemory.current = new Map()
  }, [])

  const reset = () => start(mode)

  const allMatched = cards.length > 0 && cards.every((c) => c.matched)

  const flipCard = useCallback((id: number) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)))
    setFlipped((f) => [...f, id])
  }, [])

  useEffect(() => {
    if (flipped.length !== 2) return
    setLocked(true)
    const [a, b] = flipped
    const cardA = cards.find((c) => c.id === a)!
    const cardB = cards.find((c) => c.id === b)!
    aiMemory.current.set(cardA.id, cardA.emoji)
    aiMemory.current.set(cardB.id, cardB.emoji)

    const isMatch = cardA.pair === cardB.pair
    const currentTurn = turn

    resolveTimer.current = setTimeout(() => {
      if (isMatch) {
        music.sfx('coin')
        setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, matched: true, matchedBy: currentTurn } : c)))
        setScores((s) => ({ ...s, [currentTurn]: s[currentTurn] + 1 }))
        setFlipped([])
        setLocked(false)
        if (mode === 'cpu' && currentTurn === 'red') setCpuTick((tk) => tk + 1)
      } else {
        music.sfx('hurt')
        setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, flipped: false } : c)))
        setFlipped([])
        const nextTurn: Player = currentTurn === 'blue' ? 'red' : 'blue'
        setTurn(nextTurn)
        setLocked(false)
        if (mode === 'cpu' && nextTurn === 'red') setCpuTick((tk) => tk + 1)
      }
    }, isMatch ? 700 : 1100)
    return () => { if (resolveTimer.current) clearTimeout(resolveTimer.current) }
  }, [flipped])

  useEffect(() => {
    if (!allMatched || finished) return
    setFinished(true)
    let w: Player | 'tie' = 'tie'
    if (scores.blue > scores.red) w = 'blue'
    else if (scores.red > scores.blue) w = 'red'
    setWinner(w)
    music.blip('win')
    if (mode === 'cpu' && w === 'blue' && !winCounted.current) {
      winCounted.current = true
      const willReach = memoryWins + 1 >= 3
      addMemoryWin()
      if (willReach && !medals.memory) setTimeout(() => setShowMedal(true), 900)
    }
  }, [allMatched])

  const handleCardClick = (card: Card) => {
    if (locked || finished) return
    if (mode === 'cpu' && turn === 'red') return
    if (card.flipped || card.matched) return
    if (flipped.length >= 2) return
    music.sfx('pop')
    flipCard(card.id)
  }

  // ---- SMARTER COMPUTER ----
  useEffect(() => {
    if (mode !== 'cpu' || finished) return
    if (turn !== 'red') return
    const available = cards.filter((c) => !c.matched && !c.flipped)
    if (available.length < 2) return

    // 70% use memory for first card (smarter), else random
    const useMemory = Math.random() < 0.5
    const known = new Map<string, number[]>()
    available.forEach((c) => {
      const e = aiMemory.current.get(c.id)
      if (e) known.set(e, [...(known.get(e) || []), c.id])
    })

    let first: Card
    if (useMemory) {
      let knownPair: number[] | null = null
      for (const [, ids] of known) {
        if (ids.length >= 2) { knownPair = ids; break }
      }
      if (knownPair) {
        first = cards.find((c) => c.id === knownPair![0])!
      } else {
        const unknown = available.filter((c) => !aiMemory.current.has(c.id))
        const pool = unknown.length ? unknown : available
        first = pool[Math.floor(Math.random() * pool.length)]
      }
    } else {
      first = available[Math.floor(Math.random() * available.length)]
    }

    // 80% recall match for second (smarter), else random
    let second: Card
    const recallMatch = Math.random() < 0.6
    const match = available.find((c) => c.id !== first.id && aiMemory.current.get(c.id) === first.emoji)
    if (recallMatch && match && aiMemory.current.has(first.id)) {
      second = match
    } else {
      const unknown = available.filter((c) => c.id !== first.id && !aiMemory.current.has(c.id))
      const pool = unknown.length ? unknown : available.filter((c) => c.id !== first.id)
      second = pool[Math.floor(Math.random() * pool.length)]
    }

    aiMemory.current.set(first.id, first.emoji)
    aiMemory.current.set(second.id, second.emoji)
    // 12% forget (still a kid)
    if (Math.random() < 0.12) {
      const keys = Array.from(aiMemory.current.keys())
      if (keys.length) aiMemory.current.delete(keys[Math.floor(Math.random() * keys.length)])
    }

    const t1 = setTimeout(() => flipCard(first.id), 600)
    const t2 = setTimeout(() => flipCard(second.id), 1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [turn, mode, finished, cpuTick])

  if (!mode) {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-sky-200 via-cyan-100 to-blue-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90">
            <ArrowLeft className="h-4 w-4" /> {t('common.menu')}
          </Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
          <TopControls />
        </div>
        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-7xl">🧠</motion.div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black text-sky-800 drop-shadow">{t('game.memory')}</h1>
          <p className="mt-2 max-w-md font-semibold text-sky-700">{t('memory.desc')}</p>
          {medals.memory ? (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">{t('memory.medalDone')}</span>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-sky-700">🏆 {t('memory.medalHint')} ({t('memory.medalHintNow')}: {memoryWins}/3)</span>
          )}
          <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
            <motion.button whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => start('2p')} className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 p-6 text-white shadow-xl ring-4 ring-emerald-200">
              <Users className="h-10 w-10" />
              <span className="text-xl font-black">{t('memory.mode2p')}</span>
              <span className="text-xs font-semibold opacity-90">{t('memory.mode2pSub')}</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => start('cpu')} className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-orange-400 to-rose-600 p-6 text-white shadow-xl ring-4 ring-orange-200">
              <Cpu className="h-10 w-10" />
              <span className="text-xl font-black">{t('memory.modeCpu')}</span>
              <span className="text-xs font-semibold opacity-90">{t('memory.modeCpuSub')}</span>
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  const winnerColor = winner === 'blue' ? 'from-sky-500 to-blue-700' : winner === 'red' ? 'from-rose-500 to-red-700' : 'from-amber-400 to-orange-600'

  return (
    <div className={`relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br ${turn === 'blue' ? 'from-sky-100 to-cyan-200' : 'from-rose-100 to-red-200'} transition-colors duration-500`}>
      {winner && <div className={`pointer-events-none fixed inset-0 z-0 bg-gradient-to-br ${winnerColor} opacity-20`} />}
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-4xl flex-col px-3 py-14 sm:px-4 sm:py-16">
        <h1 className="text-center text-2xl sm:text-4xl font-black text-gray-800">🧠 {t('game.memory')}</h1>

        <div className="mt-3 flex items-center justify-center gap-2 sm:gap-6">
          <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 shadow-md transition-all ${turn === 'blue' ? 'bg-sky-500 text-white scale-110 ring-4 ring-sky-300' : 'bg-white/70 text-sky-700'}`}>
            <span className="text-xl sm:text-2xl">🟦</span>
            <div className="text-left">
              <div className="text-[10px] font-bold opacity-80 sm:text-xs">{t('memory.blue')}</div>
              <div className="text-xl font-black leading-none sm:text-2xl">{scores.blue}</div>
            </div>
          </div>
          <span className="text-base font-black text-gray-500 sm:text-xl">VS</span>
          <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 shadow-md transition-all ${turn === 'red' ? 'bg-rose-500 text-white scale-110 ring-4 ring-rose-300' : 'bg-white/70 text-rose-700'}`}>
            <div className="text-right">
              <div className="text-[10px] font-bold opacity-80 sm:text-xs">{mode === 'cpu' ? t('memory.cpu') : t('memory.red')} 🟥</div>
              <div className="text-xl font-black leading-none sm:text-2xl">{scores.red}</div>
            </div>
            <span className="text-xl sm:text-2xl">🟥</span>
          </div>
        </div>

        <div className="mt-2 text-center text-xs font-bold text-gray-600 sm:text-sm">
          {finished ? t('memory.gameOver') : mode === 'cpu' && turn === 'red' ? t('memory.cpuThinking') : turn === 'blue' ? t('memory.turnBlue') : t('memory.turnRed')}
        </div>

        <div className="mt-3 grid flex-1 grid-cols-4 gap-1.5 sm:gap-3 sm:grid-cols-7">
          {cards.map((card) => (
            <motion.button
              key={card.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleCardClick(card)}
              disabled={card.matched || card.flipped || locked}
              className="relative aspect-[3/4] select-none"
              animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-violet-500 to-purple-600 text-xl shadow-md sm:rounded-xl sm:text-2xl" style={{ backfaceVisibility: 'hidden' }}>❓</div>
              <div className={`absolute inset-0 flex items-center justify-center rounded-lg border-2 text-xl shadow-md sm:rounded-xl sm:text-3xl ${card.matchedBy === 'blue' ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-300' : card.matchedBy === 'red' ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-300' : 'border-amber-200 bg-white'}`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{card.emoji}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {finished && winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className={`w-full max-w-sm rounded-3xl bg-gradient-to-br ${winnerColor} p-6 text-center text-white shadow-2xl sm:p-8`}>
              <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{winner === 'tie' ? '🤝' : '🏆'}</motion.div>
              <h2 className="mt-3 text-2xl font-black drop-shadow sm:text-3xl">{winner === 'tie' ? t('memory.tie') : winner === 'blue' ? t('memory.winBlue') : mode === 'cpu' ? t('memory.winCpu') : t('memory.winRed')}</h2>
              <p className="mt-2 text-base font-bold sm:text-lg">{t('common.score')}: {scores.blue} — {scores.red}</p>
              {showMedal && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.3 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg">
                  <div className="text-5xl">🏅</div>
                  <div className="mt-1 font-black">{t('common.medalEarned')}</div>
                  <div className="text-xs font-semibold">{t('memory.winsVsCpu')} 3!</div>
                </motion.div>
              )}
              <div className="mt-6 flex flex-col gap-3">
                <Button onClick={reset} className="h-12 rounded-full bg-white text-base font-black text-gray-800 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('memory.playAgain')}</Button>
                <Button onClick={() => setScreen('menu')} variant="outline" className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.menu')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
