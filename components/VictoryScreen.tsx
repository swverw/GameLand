'use client'

import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { useT } from '@/lib/i18n'

const MEDALS = [
  { id: 'memory', emoji: '🧠', color: 'from-sky-400 to-cyan-500' },
  { id: 'drawing', emoji: '🎨', color: 'from-rose-400 to-pink-500' },
  { id: 'platformer', emoji: '🏃', color: 'from-emerald-400 to-green-600' },
  { id: 'puzzle', emoji: '🧩', color: 'from-amber-400 to-orange-500' },
  { id: 'snake', emoji: '🐍', color: 'from-teal-400 to-cyan-600' },
  { id: 'music', emoji: '🎵', color: 'from-fuchsia-400 to-purple-600' },
  { id: 'whack', emoji: '🔨', color: 'from-lime-400 to-green-500' },
  { id: 'oddoneout', emoji: '🔍', color: 'from-cyan-400 to-blue-600' },
  { id: 'spotdiff', emoji: '🔎', color: 'from-rose-400 to-fuchsia-600' },
  { id: 'rhythm', emoji: '🎶', color: 'from-purple-400 to-indigo-600' },
  { id: 'skyscraper', emoji: '🏙️', color: 'from-sky-500 to-blue-700' },
  { id: 'safecracker', emoji: '🔓', color: 'from-slate-500 to-gray-700' },
  { id: 'pingpong', emoji: '🏓', color: 'from-indigo-500 to-purple-700' },
  { id: 'candyrace', emoji: '🍬', color: 'from-pink-400 to-rose-600' },
  { id: 'duel', emoji: '🤠', color: 'from-amber-500 to-orange-700' },
  { id: 'tapbattle', emoji: '💪', color: 'from-violet-500 to-fuchsia-700' },
] as const

export function VictoryScreen() {
  const t = useT()
  const resetAll = useGameStore((s) => s.resetAll)
  const setScreen = useGameStore((s) => s.setScreen)

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-yellow-200 via-orange-200 to-rose-200">
      {Array.from({ length: 36 }).map((_, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute text-xl sm:text-2xl"
          style={{ left: `${(i * 13) % 100}%`, top: '-10%' }}
          animate={{ y: ['0vh', '110vh'], rotate: [0, 360], opacity: [1, 1, 0] }}
          transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: (i % 12) * 0.3, ease: 'linear' }}
        >
          {['🎉', '⭐', '🎊', '✨', '🏆'][i % 5]}
        </motion.div>
      ))}

      <div className="absolute right-4 top-4 z-20">
        <TopControls />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 py-10 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 10 }}
          className="text-8xl sm:text-9xl drop-shadow-xl"
        >
          🏆
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-rose-600 to-purple-600 drop-shadow"
        >
          {t('victory.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-3 text-lg sm:text-2xl font-bold text-gray-700"
        >
          {t('victory.text')}
        </motion.p>

        <div className="mt-8 grid w-full grid-cols-3 gap-2 sm:mt-10 sm:gap-3">
          {MEDALS.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ y: 40, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 180 }}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white/70 p-2 shadow-lg backdrop-blur sm:gap-2 sm:p-4"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${m.color} text-2xl shadow-inner ring-4 ring-yellow-300 sm:h-20 sm:w-20 sm:text-4xl`}
              >
                {m.emoji}
              </motion.div>
              <span className="text-[10px] font-black text-gray-700 sm:text-sm">{t(`game.${m.id}`)}</span>
              <span className="text-[9px] font-bold text-yellow-600 sm:text-xs">🎖 {t('victory.medal')}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button
            onClick={resetAll}
            className="h-14 rounded-full border-4 border-white bg-gradient-to-b from-orange-400 to-orange-600 px-10 text-lg font-black text-white shadow-xl hover:scale-105 active:scale-95 sm:text-xl"
          >
            {t('victory.again')}
          </Button>
          <Button
            onClick={() => setScreen('menu')}
            className="h-14 rounded-full border-2 border-orange-400 bg-white/90 px-8 text-lg font-black text-orange-600 shadow-md hover:bg-white"
          >
            {t('victory.home')}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
