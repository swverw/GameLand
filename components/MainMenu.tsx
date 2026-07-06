'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, type GameId, type Screen } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { useT } from '@/lib/i18n'
import { ArrowLeft, Trophy, Dice5, Medal, X } from 'lucide-react'
import { useState } from 'react'
import { getScores, formatValue } from '@/lib/leaderboard'
import { ACHIEVEMENTS, useAchievementLabels } from '@/lib/achievements'
import { music } from '@/lib/audio'

interface GameCard {
  id: GameId
  emoji: string
  gradient: string
  ring: string
  descKey: string
}

const GAMES: GameCard[] = [
  { id: 'memory', emoji: '🧠', gradient: 'from-sky-400 to-cyan-500', ring: 'ring-sky-300', descKey: 'desc.memory' },
  { id: 'drawing', emoji: '🎨', gradient: 'from-rose-400 to-pink-500', ring: 'ring-rose-300', descKey: 'desc.drawing' },
  { id: 'platformer', emoji: '🏃', gradient: 'from-emerald-400 to-green-600', ring: 'ring-emerald-300', descKey: 'desc.platformer' },
  { id: 'puzzle', emoji: '🧩', gradient: 'from-amber-400 to-orange-500', ring: 'ring-amber-300', descKey: 'desc.puzzle' },
  { id: 'snake', emoji: '🐍', gradient: 'from-teal-400 to-cyan-600', ring: 'ring-teal-300', descKey: 'desc.snake' },
  { id: 'music', emoji: '🎵', gradient: 'from-fuchsia-400 to-purple-600', ring: 'ring-fuchsia-300', descKey: 'desc.music' },
  { id: 'whack', emoji: '🔨', gradient: 'from-lime-400 to-green-500', ring: 'ring-lime-300', descKey: 'desc.whack' },
  { id: 'oddoneout', emoji: '🔍', gradient: 'from-cyan-400 to-blue-600', ring: 'ring-cyan-300', descKey: 'desc.oddoneout' },
  { id: 'spotdiff', emoji: '🔎', gradient: 'from-rose-400 to-fuchsia-600', ring: 'ring-rose-300', descKey: 'desc.spotdiff' },
  { id: 'rhythm', emoji: '🎶', gradient: 'from-purple-400 to-indigo-600', ring: 'ring-purple-300', descKey: 'desc.rhythm' },
  { id: 'skyscraper', emoji: '🏙️', gradient: 'from-sky-500 to-blue-700', ring: 'ring-sky-400', descKey: 'desc.skyscraper' },
  { id: 'safecracker', emoji: '🔓', gradient: 'from-slate-500 to-gray-700', ring: 'ring-slate-400', descKey: 'desc.safecracker' },
  { id: 'pingpong', emoji: '🏓', gradient: 'from-indigo-500 to-purple-700', ring: 'ring-indigo-400', descKey: 'desc.pingpong' },
  { id: 'candyrace', emoji: '🍬', gradient: 'from-pink-400 to-rose-600', ring: 'ring-pink-300', descKey: 'desc.candyrace' },
  { id: 'duel', emoji: '🤠', gradient: 'from-amber-500 to-orange-700', ring: 'ring-amber-400', descKey: 'desc.duel' },
  { id: 'tapbattle', emoji: '💪', gradient: 'from-violet-500 to-fuchsia-700', ring: 'ring-violet-400', descKey: 'desc.tapbattle' },
]

function ProgressBadge({ id }: { id: GameId }) {
  const t = useT()
  const medals = useGameStore((s) => s.medals)
  const wins = useGameStore((s) => s.memoryWinsVsCpu)
  const drawingDone = useGameStore((s) => s.drawingCompleted.length)
  const platDone = useGameStore((s) => s.platformerCompleted.filter(Boolean).length)
  const snakeDone = useGameStore((s) => s.snakeCompleted.filter(Boolean).length)
  const musicDone = useGameStore((s) => s.musicCompleted.filter(Boolean).length)
  const whackDone = useGameStore((s) => s.whackCompleted.filter(Boolean).length)
  const oddDone = useGameStore((s) => s.oddoneoutCompleted.filter(Boolean).length)
  const spotDone = useGameStore((s) => s.spotdiffCompleted.filter(Boolean).length)
  const rhyDone = useGameStore((s) => s.rhythmCompleted.filter(Boolean).length)
  const coins = useGameStore((s) => s.coins)

  if (medals[id]) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-300 px-2.5 py-1 text-[10px] font-black text-yellow-900 shadow sm:text-xs">
        🏆 {t('menu.medal')}
      </span>
    )
  }

  let text = ''
  if (id === 'memory') text = `${t('memory.winsVsCpu')}: ${wins}/3`
  if (id === 'drawing') text = `${drawingDone}/20`
  if (id === 'platformer') text = `${platDone}/3`
  if (id === 'puzzle') text = `${useGameStore.getState().puzzleSet + 1}/5`
  if (id === 'snake') text = `${snakeDone}/3`
  if (id === 'music') text = `${musicDone}/3`
  if (id === 'whack') text = `${whackDone}/3`
  if (id === 'oddoneout') text = `${oddDone}/3`
  if (id === 'spotdiff') text = `${spotDone}/3`
  if (id === 'rhythm') text = `${rhyDone}/3`
  if (id === 'skyscraper') text = `${useGameStore.getState().skyscraperCompleted.filter(Boolean).length}/3`
  if (id === 'safecracker') text = `${useGameStore.getState().safecrackerCompleted.filter(Boolean).length}/3`
  if (id === 'pingpong' || id === 'candyrace' || id === 'duel' || id === 'tapbattle') text = medals[id] ? '🏆' : '▶'

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/30 px-2 py-1 text-[10px] font-bold text-white sm:text-xs">
      {text}
    </span>
  )
}

export function MainMenu() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const medals = useGameStore((s) => s.medals)
  const state = useGameStore()
  const coins = useGameStore((s) => s.coins)
  const medalCount = Object.values(medals).filter(Boolean).length
  const [modal, setModal] = useState<null | 'leaders' | 'ach'>(null)
  const achLabel = useAchievementLabels()
  const unlocked = new Set(ACHIEVEMENTS.filter((a) => a.check(state)).map((a) => a.id))

  const playRandom = () => {
    const games: Screen[] = ['memory', 'drawing', 'platformer', 'puzzle', 'snake', 'music', 'whack', 'oddoneout', 'spotdiff', 'rhythm', 'skyscraper', 'safecracker']
    const shuffled = [...games].sort(() => Math.random() - 0.5).sort(() => Math.random() - 0.5)
    music.sfx('whoosh')
    setScreen(shuffled[0])
  }

  const leaderGames: { key: string; label: string }[] = [
    { key: 'puzzle', label: t('game.puzzle') },
    { key: 'whack', label: t('game.whack') },
    { key: 'runner', label: t('game.platformer') },
    { key: 'rhythm', label: t('game.rhythm') },
  ]

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-violet-100 via-amber-100 to-emerald-100">
      <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-purple-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />

      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1.5 text-sm font-black text-yellow-900 shadow-md">
          <Trophy className="h-4 w-4" /> {medalCount}/16
        </span>
        <TopControls />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-3 py-6 sm:px-6 sm:py-8">
        <button
          onClick={() => setScreen('splash')}
          className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm backdrop-blur hover:bg-white sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> {t('splash.back')}
        </button>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 drop-shadow sm:text-6xl"
        >
          {t('menu.title')}
        </motion.h1>
        <p className="mt-1 text-center text-sm font-semibold text-gray-600 sm:mt-2 sm:text-lg">
          {t('menu.subtitle')}
        </p>

        {/* action buttons */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button onClick={playRandom} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-orange-400 to-rose-500 px-4 py-2 text-sm font-black text-white shadow-md transition hover:scale-105">
            <Dice5 className="h-4 w-4" /> {t('menu.random')}
          </button>
          <button onClick={() => setScreen('shop')} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 px-4 py-2 text-sm font-black text-white shadow-md transition hover:scale-105">
            🛒 {t('shop.title').replace('🛒 ', '')} <span className="ml-1 rounded-full bg-white/30 px-1.5 text-xs">🪙 {coins}</span>
          </button>
          <button onClick={() => setModal('leaders')} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-black text-amber-700 shadow-md backdrop-blur transition hover:scale-105">
            <Trophy className="h-4 w-4" /> {t('menu.leaderboard')}
          </button>
          <button onClick={() => setModal('ach')} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-black text-purple-700 shadow-md backdrop-blur transition hover:scale-105">
            <Medal className="h-4 w-4" /> {t('menu.achievements')} <span className="text-xs">({unlocked.size}/{ACHIEVEMENTS.length})</span>
          </button>
        </div>

        {/* 4×3 grid of games */}
        <div className="mt-5 grid flex-1 grid-cols-2 gap-2 sm:mt-6 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GAMES.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setScreen(g.id)}
              className={`group relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${g.gradient} p-3 text-left shadow-xl ring-2 ${g.ring}/40 transition-all sm:rounded-3xl sm:p-5`}
            >
              <div className="absolute -right-3 -top-3 text-6xl opacity-25 transition-transform group-hover:scale-110 group-hover:rotate-12 sm:-right-6 sm:-top-6 sm:text-8xl">
                {g.emoji}
              </div>
              <div className="relative flex h-full flex-col">
                <div className="text-3xl drop-shadow-lg sm:text-5xl">{g.emoji}</div>
                <h2 className="mt-1 text-sm font-black leading-tight text-white drop-shadow-md sm:mt-2 sm:text-xl">
                  {t(`game.${g.id}`)}
                </h2>
                <p className="mt-0.5 text-[9px] font-semibold leading-tight text-white/80 sm:text-xs">{t(g.descKey)}</p>
                <div className="mt-auto pt-1.5">
                  <ProgressBadge id={g.id} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <footer className="mt-5 text-center text-xs font-semibold text-gray-500 sm:mt-8 sm:text-sm">
          {medalCount}/16 🏆
        </footer>
      </div>

      {/* LEADERBOARD MODAL */}
      <AnimatePresence>
        {modal === 'leaders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-black text-amber-700">🏅 {t('menu.leadersTitle')}</h2>
                <button onClick={() => setModal(null)} className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                {leaderGames.map((g) => {
                  const scores = getScores(g.key)
                  return (
                    <div key={g.key} className="rounded-2xl bg-amber-50 p-3">
                      <div className="mb-1 text-sm font-black text-amber-800">{g.label}</div>
                      {scores.length === 0 ? (
                        <div className="text-xs font-semibold text-gray-400">{t('menu.leadersEmpty')}</div>
                      ) : (
                        <div className="space-y-1">
                          {scores.map((e, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-1 text-sm">
                              <span className="font-black text-amber-700">{i + 1}. {e.name}</span>
                              <span className="font-bold text-gray-700">{g.key === 'whack' ? `⭐ ${formatValue(g.key, e.value)}` : `⏱ ${formatValue(g.key, e.value)}`}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <Button onClick={() => setModal(null)} className="mt-4 w-full rounded-full">{t('menu.close')}</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACHIEVEMENTS MODAL */}
      <AnimatePresence>
        {modal === 'ach' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-black text-purple-700">⭐ {t('menu.achTitle')}</h2>
                <button onClick={() => setModal(null)} className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"><X className="h-5 w-5" /></button>
              </div>
              <div className="mb-3 text-center text-sm font-bold text-purple-600">{unlocked.size}/{ACHIEVEMENTS.length} {t('menu.achUnlocked')}</div>
              <div className="grid grid-cols-1 gap-2">
                {ACHIEVEMENTS.map((a) => {
                  const isUnlocked = unlocked.has(a.id)
                  return (
                    <div key={a.id} className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 ${isUnlocked ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl ${isUnlocked ? 'bg-yellow-200' : 'bg-gray-200 grayscale'}`}>{a.emoji}</div>
                      <span className={`flex-1 text-sm font-bold ${isUnlocked ? 'text-gray-800' : 'text-gray-400'}`}>{achLabel(a.id)}</span>
                      {isUnlocked && <span className="text-emerald-500">✓</span>}
                    </div>
                  )
                })}
              </div>
              <Button onClick={() => setModal(null)} className="mt-4 w-full rounded-full">{t('menu.close')}</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
