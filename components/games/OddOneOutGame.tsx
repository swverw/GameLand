'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

// Large pool of categories. Each round picks 3 emojis from one category + 1 from another.
// With 30+ categories, the (groupA, groupB) pairings produce 30*29 = 870 unique combos,
// and shuffling within each gives far more than 1000 distinct rounds.
const CATEGORIES: { name: string; emojis: string[] }[] = [
  { name: 'birds', emojis: ['🐦', '🦅', '🦉', '🐧', '🐥', '🦜', '🦢', '🦩', '🕊️', '🦃'] },
  { name: 'transport', emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚜', '🛵', '🏍️', '🚲', '✈️', '🚁', '🚂', '🚢', '⛵'] },
  { name: 'fruits', emojis: ['🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🍑', '🍒', '🥭', '🍍', '🥥', '🥝', '🫐', '🍈', '🍐'] },
  { name: 'sports', emojis: ['⚽', '🏀', '🏈', '🎾', '🏐', '⚾', '🥎', '🏉', '🎱', '🏓', '🏸', '🏒', '⛳', '🏹', '🎣'] },
  { name: 'flowers', emojis: ['🌸', '🌷', '🌹', '🌻', '🌼', '🍀', '☘️', '🪻', '🌿', '🍁'] },
  { name: 'buildings', emojis: ['🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🏭', '🏰', '🏯', '🏛️', '⛪'] },
  { name: 'clothes', emojis: ['👕', '👖', '👗', '👘', '🥻', '🧥', '🧦', '🧤', '🧣', '🎩', '🧢', '👟', '👠', '👢', '🎒'] },
  { name: 'music', emojis: ['🎸', '🎹', '🥁', '🎺', '🎻', '🎷', '🪕', '🪘', '🎤', '🎧', '📻'] },
  { name: 'weather', emojis: ['☀️', '☁️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '🌬️', '🌪️', '🌈', '☔', '⚡'] },
  { name: 'space', emojis: ['🌙', '⭐', '🌟', '✨', '☄️', '🪐', '🛰️', '🚀', '🛸', '🌍', '🌎', '🌏'] },
  { name: 'animals', emojis: ['🐶', '🐱', '🐰', '🐭', '🐹', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🦒', '🐘', '🦏', '🦘'] },
  { name: 'sea', emojis: ['🐟', '🐠', '🐡', '🦈', '🐙', '🦑', '🦐', '🦞', '🦀', '🐚', '🐢', '🐬', '🐳', '🐋'] },
  { name: 'bugs', emojis: ['🦋', '🐝', '🐞', '🦗', '🕷️', '🦂', '🦟', '🐜', '🐛'] },
  { name: 'veggies', emojis: ['🥕', '🥔', '🌽', '🥦', '🥬', '🥒', '🍆', '🧅', '🧄', '🫑', '🍄', '🥑'] },
  { name: 'food', emojis: ['🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥙', '🍳', '🥞', '🧇', '🍗', '🍖', '🍜', '🍝'] },
  { name: 'dessert', emojis: ['🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🍦', '🍨'] },
  { name: 'tech', emojis: ['💻', '🖥️', '🖨️', '⌨️', '🖱️', '💾', '💿', '📱', '📞', '📟', '🔋', '🔌', '💡', '📺', '📷'] },
  { name: 'toys', emojis: ['🎈', '🎉', '🎊', '🎀', '🎁', '🎎', '🏮', '🎐', '🪁', '🧸', '🎯', '🎲'] },
  { name: 'nature', emojis: ['🌳', '🌲', '🌴', '🌵', '🪵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃'] },
  { name: 'faces', emojis: ['😀', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘'] },
  { name: 'hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💗', '💓', '💞', '💕', '💘'] },
  { name: 'time', emojis: ['⌚', '⏰', '⏱️', '⏲️', '🕰️', '⏳', '⌛', '📅', '📆', '🗓️'] },
  { name: 'office', emojis: ['📎', '📌', '📍', '✂️', '🖊️', '✏️', '📝', '📁', '📂', '🗂️', '📊', '📈', '🗒️', '🗓️'] },
  { name: 'tools', emojis: ['🔨', '🪓', '⚒️', '🛠️', '🔧', '🔩', '⚙️', '🗜️', '⚖️', '🧰', '🧲'] },
  { name: 'signs', emojis: ['♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴'] },
  { name: 'party', emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🧧', '🏮', '🎐', '🪩', '🥳'] },
  { name: 'flags', emojis: ['🚩', '🎌', '🎏', '🎐', '🎌', '🏁', '🏳️', '🏴'] },
  { name: 'money', emojis: ['💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💎'] },
  { name: 'drink', emojis: ['☕', '🍵', '🧃', '🥤', '🧋', '🍺', '🍷', '🥂', '🍸', '🍹', '🍾'] },
  { name: 'books', emojis: ['📚', '📖', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📑', '📜'] },
  { name: 'art', emojis: ['🎨', '🖼️', '✏️', '✒️', '🖌️', '🖍️', '📝', '✍️'] },
  { name: 'travel', emojis: ['✈️', '🚂', '🚢', '⛵', '🗺️', '🧭', '📍', '🏕️', '🏖️', '⛰️', '🏔️'] },
]

interface LevelCfg { id: number; name: string; emoji: string; rounds: number; cols: number; medalPlace: string }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', rounds: 4, cols: 2, medalPlace: '🥉' },
  { id: 1, name: 'medium', emoji: '🟡', rounds: 5, cols: 2, medalPlace: '🥈' },
  { id: 2, name: 'hard', emoji: '🔴', rounds: 6, cols: 2, medalPlace: '🥇' },
]

const SHUFFLE = <T,>(a: T[]): T[] => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] } return x }

type Phase = 'intro' | 'playing' | 'done'

export function OddOneOutGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.oddoneoutCompleted)
  const set = useGameStore((s) => s.oddoneoutSet)
  const completeOdd = useGameStore((s) => s.completeOddLevel)
  const resetSet = useGameStore((s) => s.resetOddSet)
  const resetGame = useGameStore((s) => s.resetGame)
  const medals = useGameStore((s) => s.medals)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [round, setRound] = useState(0)
  const [items, setItems] = useState<string[]>([])
  const [oddIdx, setOddIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [showMedal, setShowMedal] = useState(false)

  const cfg = LEVELS[level]

  const makeRound = useCallback((lv: number, setIdx: number) => {
    // pick two distinct categories at random from the large pool
    const indices = SHUFFLE(CATEGORIES.map((_, i) => i))
    const catA = CATEGORIES[indices[0]]
    const catB = CATEGORIES[indices[1]]
    // group A provides 3 emojis, group B provides 1 (the odd one)
    const three = SHUFFLE(catA.emojis).slice(0, 3)
    const one = SHUFFLE(catB.emojis)[0]
    const all = SHUFFLE([...three, one])
    const odd = all.indexOf(one)
    setItems(all); setOddIdx(odd); setPicked(null); setWrong(null)
  }, [])

  const startLevel = useCallback((lv: number) => {
    setLevel(lv); setRound(0); setShowMedal(false); setPhase('playing')
    makeRound(lv, set)
  }, [makeRound, set])

  useEffect(() => {
    if (phase === 'playing') makeRound(level, set)
  }, [phase, level, set, makeRound, round])

  const handlePick = (idx: number) => {
    if (picked !== null) return
    setPicked(idx)
    if (idx === oddIdx) {
      music.sfx('coin')
      // next round or level done
      if (round + 1 >= cfg.rounds) {
        // level complete
        const wasComplete = completed[level]
        completeOdd(level)
        const allDone = LEVELS.every((_, i) => (i === level ? true : completed[i]))
        if (allDone && !wasComplete && !medals.oddoneout) setTimeout(() => setShowMedal(true), 600)
        setTimeout(() => setPhase('done'), 900)
      } else {
        // next round: clear picked immediately so UI is responsive, then advance round
        setTimeout(() => { setPicked(null); setWrong(null); setRound((r) => r + 1) }, 700)
      }
    } else {
      setWrong(idx); music.sfx('hurt')
      setTimeout(() => { setPicked(null); setWrong(null) }, 600)
    }
  }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🔍</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-sky-800">{t('game.oddoneout')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-sky-700">{t('odd.desc')}</p>
          <div className="mt-2 text-sm font-black text-sky-600">{t('odd.set')}: {set + 1}/5</div>
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => {
              const done = completed[i]
              const locked = i > 0 && !completed[i - 1] && !medals.oddoneout
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-sky-400 bg-sky-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`music.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-sky-600">{l.rounds} {t('odd.round')}</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-sky-600">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          {completed.every(Boolean) && set < 4 && (
            <button onClick={() => { resetSet(); music.sfx('whoosh') }} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-sky-500 to-blue-700 px-5 py-2.5 text-sm font-black text-white shadow-lg hover:scale-105"><RotateCcw className="h-4 w-4" /> {t('odd.resetSet')} ({set + 2}/5)</button>
          )}
          {set >= 4 && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">{t('odd.allSets')}</span>}
          {medals.oddoneout && <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('odd.medalSub')}</span>}
          {(completed.some(Boolean) || set > 0) && (
            <button onClick={() => { if (confirm(t('common.confirmReset'))) { resetGame('oddoneout'); music.sfx('whoosh') } }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2 text-xs font-black text-rose-600 shadow hover:bg-rose-200">
              <RotateCcw className="h-3.5 w-3.5" /> {t('common.fullReset')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-200">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-4 py-12">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-sky-700">
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">{cfg.emoji} {t(`music.${cfg.name}`)}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">{t('odd.round')} {round + 1}/{cfg.rounds}</span>
        </div>
        <h1 className="text-lg font-black text-sky-800 sm:text-2xl">🔍 {t('game.oddoneout')}</h1>
        <p className="mt-1 text-xs font-bold text-sky-700 sm:text-sm">{t('odd.tip')}</p>

        {/* Card-style grid — distinct from SpotDiff: tilted playing cards */}
        <div className="mt-5 grid w-full grid-cols-2 gap-3">
          {items.map((emoji, i) => {
            const isOdd = i === oddIdx
            const isPicked = picked === i
            const isWrong = wrong === i
            const tilt = (i % 2 === 0 ? -1 : 1) * (2 + (i % 3))
            return (
              <motion.button
                key={i}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1, rotate: tilt }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
                whileTap={{ scale: 0.92, rotate: 0 }}
                whileHover={{ scale: 1.06, rotate: 0, zIndex: 10 }}
                onPointerDown={() => handlePick(i)}
                className={`relative flex aspect-[3/4] items-center justify-center rounded-xl border-[3px] shadow-2xl transition-colors ${
                  isPicked && isOdd ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-200' :
                  isWrong ? 'border-rose-500 bg-gradient-to-br from-rose-50 to-rose-200' :
                  'border-amber-800/30 bg-gradient-to-br from-amber-50 to-orange-100'
                }`}
                style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}
              >
                {/* playing card corner decorations */}
                <span className="absolute left-1.5 top-1 text-[10px] font-black text-amber-800/40">?</span>
                <span className="absolute bottom-1 right-1 text-[10px] font-black text-amber-800/40">?</span>
                <span className="text-5xl drop-shadow-lg sm:text-6xl">{emoji}</span>
                {isPicked && isOdd && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center rounded-xl bg-emerald-400/40 text-5xl backdrop-blur-sm">✅</motion.div>
                )}
                {isWrong && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center rounded-xl bg-rose-400/40 text-5xl backdrop-blur-sm">❌</motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('common.levelDone')}</h2>
              <p className="mt-1 font-bold">{cfg.emoji} {t(`music.${cfg.name}`)}</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('odd.medalSub')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1); else setPhase('intro') }} className="h-12 rounded-full bg-white text-base font-black text-sky-700 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
