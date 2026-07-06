'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { useT } from '@/lib/i18n'

const FLOATERS = ['🎈', '⭐', '🎨', '🚀', '🐰', '🦊', '🌈', '🧩', '🏆', '✏️', '🐍', '🎵', '🔨', '🏙️', '🔓', '🎶', '🏓', '🍬', '🤠', '💪']

export function SplashScreen() {
  const setScreen = useGameStore((s) => s.setScreen)
  const t = useT()

  // randomize floaters positions — only on client to avoid hydration mismatch
  const [positions, setPositions] = useState(() =>
    FLOATERS.map(() => ({
      left: 50, top: 50, size: 2.5, duration: 5, delay: 0, driftX: 0, driftY: 20, rotate: 0, opacity: 0.7,
    }))
  )

  useEffect(() => {
    setPositions(FLOATERS.map(() => ({
      left: Math.random() * 85 + 3,
      top: Math.random() * 72 + 8,
      size: 1.8 + Math.random() * 2.5,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 3,
      driftX: (Math.random() - 0.5) * 30,
      driftY: 15 + Math.random() * 25,
      rotate: (Math.random() - 0.5) * 20,
      opacity: 0.5 + Math.random() * 0.4,
    })))
  }, [])

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-amber-200 via-rose-200 to-sky-200">
      {FLOATERS.map((e, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute select-none"
          style={{
            left: `${positions[i].left}%`,
            top: `${positions[i].top}%`,
            fontSize: `${positions[i].size}rem`,
            opacity: positions[i].opacity,
          }}
          animate={{
            y: [0, -positions[i].driftY, 0],
            x: [0, positions[i].driftX, 0],
            rotate: [0, positions[i].rotate, -positions[i].rotate, 0],
          }}
          transition={{
            duration: positions[i].duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: positions[i].delay,
          }}
        >
          {e}
        </motion.div>
      ))}

      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-yellow-300/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-rose-300/50 blur-3xl" />

      <div className="absolute right-4 top-4 z-20">
        <TopControls />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12 }}
          className="mb-2 text-7xl sm:text-8xl drop-shadow-lg"
        >
          🎮
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-5xl sm:text-7xl font-black tracking-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.15)]"
          style={{ WebkitTextStroke: '2px rgba(255,255,255,0.4)' }}
        >
          <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-500 bg-clip-text text-transparent">
            {t('splash.title')}
          </span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 max-w-md text-lg sm:text-2xl font-bold text-white/90 drop-shadow"
        >
          {t('splash.sub')}
        </motion.p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 200 }}
          className="mt-10"
        >
          <Button
            onClick={() => setScreen('menu')}
            className="h-20 rounded-full border-4 border-white bg-gradient-to-b from-orange-400 to-orange-600 px-16 text-3xl font-black text-white shadow-2xl transition-all hover:scale-110 hover:from-orange-500 hover:to-orange-700 active:scale-95"
          >
            {t('splash.start')}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-3xl sm:text-4xl select-none">
            🧠🎨🏃🧩🐍🎵🔨
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
