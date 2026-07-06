'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, Eye, RotateCcw, Check, Timer } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'
import { addScore, getScores, formatValue } from '@/lib/leaderboard'

interface LevelCfg { id: number; grid: number; emoji: string; medalPlace: string; nameKey: string; descKey: string }
const LEVELS: LevelCfg[] = [
  { id: 0, grid: 3, emoji: '🐠', medalPlace: '🥉', nameKey: 'puzzle.easy', descKey: 'puzzle.easyDesc' },
  { id: 1, grid: 4, emoji: '🏰', medalPlace: '🥈', nameKey: 'puzzle.medium', descKey: 'puzzle.medDesc' },
  { id: 2, grid: 5, emoji: '🦋', medalPlace: '🥇', nameKey: 'puzzle.hard', descKey: 'puzzle.hardDesc' },
]
// 10 puzzle images available (1..10); each set picks 3 distinct images
const PUZZLE_IMG_NAMES = ['ocean','farm','dino','safari','space','castle','forest','beach','circus','garden']
function imgForSet(set: number, level: number): number { return ((set * 3) + level) % 10 + 1 }

const TRAY_PIECE = 40

interface Piece { id: number; placed: boolean }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

type Drag = { pieceId: number; x: number; y: number } | null

export function PuzzleGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.puzzleCompleted)
  const puzzleSet = useGameStore((s) => s.puzzleSet)
  const completePuzzleLevel = useGameStore((s) => s.completePuzzleLevel)
  const resetPuzzleSet = useGameStore((s) => s.resetPuzzleSet)
  const resetGame = useGameStore((s) => s.resetGame)
  const medals = useGameStore((s) => s.medals)

  const [current, setCurrent] = useState<number | null>(null) // level id
  const [pieces, setPieces] = useState<Piece[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [slots, setSlots] = useState<(number | null)[]>([])
  const [drag, setDrag] = useState<Drag>(null)
  const [shake, setShake] = useState<number | null>(null)
  const [peek, setPeek] = useState(false)
  const [showMedal, setShowMedal] = useState(false)
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [namePrompt, setNamePrompt] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [best, setBest] = useState<number | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const startRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishedRef = useRef(false)

  const cfg = LEVELS[current ?? 0]
  const GRID = cfg.grid

  const startLevel = useCallback((lv: number) => {
    const c = LEVELS[lv]
    const n = c.grid * c.grid
    const arr: Piece[] = Array.from({ length: n }, (_, i) => ({ id: i, placed: false }))
    setPieces(arr)
    setOrder(shuffle(arr.map((p) => p.id)))
    setSlots(Array(n).fill(null))
    setDone(false); setShowMedal(false); setPeek(false); setShake(null); setDrag(null)
    finishedRef.current = false
    setElapsed(0); startRef.current = Date.now()
    setCurrent(lv)
    setBest(getScores('puzzle')[0]?.value ?? null)
  }, [])

  useEffect(() => {
    if (current == null || done) return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 250)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [current, done])

  const allPlaced = slots.length > 0 && slots.every((s) => s !== null)

  useEffect(() => {
    if (!allPlaced || done || current == null || finishedRef.current) return
    finishedRef.current = true
    setDone(true)
    music.blip('win')
    const time = Math.floor((Date.now() - startRef.current) / 1000)
    setElapsed(time)
    const wasComplete = completed[current] ?? false
    completePuzzleLevel(current)
    const allDone = LEVELS.every((_, i) => (i === current ? true : completed[i]))
    if (allDone && !wasComplete && !medals.puzzle) setTimeout(() => setShowMedal(true), 800)
    setTimeout(() => setNamePrompt(true), 1200)
  }, [allPlaced, done, current, completed, completePuzzleLevel, medals.puzzle])

  const onPiecePointerDown = (e: React.PointerEvent, pieceId: number) => {
    if (done) return
    e.preventDefault()
    setDrag({ pieceId, x: e.clientX, y: e.clientY })
  }
  const onPointerMove = (e: React.PointerEvent) => { if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY }) }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return
    const board = boardRef.current
    if (board) {
      const r = board.getBoundingClientRect()
      const relX = e.clientX - r.left, relY = e.clientY - r.top
      if (relX >= 0 && relX < r.width && relY >= 0 && relY < r.height) {
        const col = Math.floor(relX / (r.width / GRID))
        const row = Math.floor(relY / (r.height / GRID))
        const slot = row * GRID + col
        if (slot === drag.pieceId && slots[slot] === null) {
          setSlots((prev) => { const next = [...prev]; next[slot] = drag.pieceId; return next })
          setOrder((prev) => prev.filter((id) => id !== drag.pieceId))
          setPieces((prev) => prev.map((p) => (p.id === drag.pieceId ? { ...p, placed: true } : p)))
          music.sfx('place')
        } else {
          setShake(drag.pieceId); music.sfx('hurt')
          setTimeout(() => setShake(null), 400)
        }
      }
    }
    setDrag(null)
  }

  const pieceStyle = (pieceId: number, size: number): React.CSSProperties => {
    const col = pieceId % GRID, row = Math.floor(pieceId / GRID)
    return {
      backgroundImage: current != null ? `url(/puzzles/${imgForSet(puzzleSet, current)}.png)` : undefined,
      backgroundSize: `${size * GRID}px ${size * GRID}px`,
      backgroundPosition: `-${col * size}px -${row * size}px`,
      backgroundRepeat: 'no-repeat',
    }
  }

  const saveScore = () => {
    addScore('puzzle', playerName || 'Игрок', elapsed, true)
    setNamePrompt(false)
    setBest(getScores('puzzle')[0]?.value ?? null)
  }

  // ---------- INTRO ----------
  if (current == null) {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🧩</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-amber-800">{t('game.puzzle')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-amber-700">{t('puzzle.desc')}</p>
          <div className="mt-2 text-sm font-black text-amber-600">{t('odd.set')}: {puzzleSet + 1}/5 · {completed.filter(Boolean).length}/3</div>
          {completed.every(Boolean) && puzzleSet < 4 && (
            <button onClick={() => { resetPuzzleSet(); music.sfx('whoosh') }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-black text-white shadow-lg hover:scale-105"><RotateCcw className="h-4 w-4" /> {t('odd.resetSet')} ({puzzleSet + 2}/5)</button>
          )}
          {puzzleSet >= 4 && completed.every(Boolean) && <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">{t('odd.allSets')}</span>}
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => {
              const isDone = completed[i]
              const locked = i > 0 && !completed[i - 1] && !medals.puzzle
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 overflow-hidden rounded-2xl border-2 p-3 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : isDone ? 'border-amber-400 bg-amber-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <div className="h-16 w-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(/puzzles/${imgForSet(puzzleSet, i)}.png)` }} />
                  <span className="text-2xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{t(l.nameKey)}</span>
                  <span className="text-xs font-semibold text-amber-600">{t(l.descKey)}</span>
                  {isDone && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!isDone && !locked && <span className="text-xs font-bold text-amber-600">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          {/* leaderboard preview */}
          <div className="mt-6 w-full max-w-sm rounded-2xl bg-white/70 p-3 shadow-md">
            <div className="mb-1 text-center text-sm font-black text-amber-800">🏅 {t('menu.leadersTitle')}</div>
            {getScores('puzzle').length === 0 ? (
              <div className="text-center text-xs font-semibold text-gray-500">{t('menu.leadersEmpty')}</div>
            ) : (
              <div className="space-y-1">
                {getScores('puzzle').slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1 text-sm">
                    <span className="font-black text-amber-700">{i + 1}. {e.name}</span>
                    <span className="font-bold text-gray-700">⏱ {formatValue('puzzle', e.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {medals.puzzle && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('puzzle.medalSub')}</span>}
          {(completed.some(Boolean) || puzzleSet > 0) && (
            <button onClick={() => { if (confirm(t('common.confirmReset'))) { resetGame('puzzle'); music.sfx('whoosh') } }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2 text-xs font-black text-rose-600 shadow hover:bg-rose-200"><RotateCcw className="h-3.5 w-3.5" /> {t('common.fullReset')}</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setPeek(true)} className="rounded-full bg-white/90"><Eye className="h-4 w-4" /> {t('puzzle.hint')}</Button>
        <TopControls />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center px-3 py-14">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-black text-amber-800 sm:text-2xl">🧩 {cfg.emoji} {t(cfg.nameKey)}</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-xs font-black text-amber-700 shadow"><Timer className="h-3.5 w-3.5" /> {formatValue('puzzle', elapsed)}</span>
        </div>
        <p className="mt-1 text-center text-xs font-bold text-amber-600 sm:text-sm">{t('puzzle.dragTip')}</p>

        <div className="mt-3">
          <div ref={boardRef} className="relative rounded-2xl border-4 border-white bg-amber-50/60 shadow-xl" style={{ width: 'min(80vw, 360px)', aspectRatio: '1 / 1' }}>
            <div className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.12]" style={{ backgroundImage: `url(/puzzles/${imgForSet(puzzleSet, current ?? 0)}.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            {Array.from({ length: GRID * GRID }).map((_, idx) => {
              const col = idx % GRID, row = Math.floor(idx / GRID)
              const lockedId = slots[idx]
              return (
                <div key={idx} className="absolute border border-amber-200/70" style={{ left: `${(col / GRID) * 100}%`, top: `${(row / GRID) * 100}%`, width: `${100 / GRID}%`, height: `${100 / GRID}%` }}>
                  {lockedId !== null && <div className="h-full w-full" style={{ ...pieceStyle(lockedId, 360 / GRID), backgroundSize: '360px 360px' }} />}
                </div>
              )
            })}
            {done && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center rounded-xl bg-emerald-400/30 backdrop-blur-[1px]">
                <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} className="rounded-full bg-white px-4 py-2 text-lg font-black text-emerald-600 shadow-2xl sm:text-2xl">✅ {t('common.done')}</motion.div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-4 w-full max-w-[420px]">
          <div className="mb-1 text-center text-xs font-bold text-amber-600 sm:text-sm">{t('puzzle.piecesLeft')} {order.length}</div>
          <div className="flex max-h-[120px] flex-wrap items-center justify-center gap-1.5 overflow-y-auto rounded-2xl bg-white/60 p-2 shadow-inner">
            <AnimatePresence>
              {order.map((pid) => (
                <motion.div key={pid} layout animate={shake === pid ? { x: [0, -5, 5, -3, 3, 0] } : {}} transition={{ duration: 0.4 }} onPointerDown={(e) => onPiecePointerDown(e, pid)} className="cursor-grab touch-none rounded border-2 border-white shadow active:cursor-grabbing" style={{ ...pieceStyle(pid, TRAY_PIECE), width: TRAY_PIECE, height: TRAY_PIECE, opacity: drag?.pieceId === pid ? 0.3 : 1 }} />
              ))}
            </AnimatePresence>
            {order.length === 0 && <span className="text-sm font-bold text-emerald-600">{t('puzzle.allPlaced')}</span>}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button onClick={() => startLevel(current)} variant="outline" className="rounded-full bg-white/90"><RotateCcw className="h-4 w-4" /> {t('puzzle.again')}</Button>
          <Button onClick={() => setCurrent(null)} variant="outline" className="rounded-full bg-white/90">{t('puzzle.toPuzzles')}</Button>
        </div>
      </div>

      {drag && <div className="pointer-events-none fixed z-50 rounded border-2 border-amber-300 shadow-2xl" style={{ ...pieceStyle(drag.pieceId, 360 / GRID), width: 360 / GRID, height: 360 / GRID, left: drag.x - (360 / GRID) / 2, top: drag.y - (360 / GRID) / 2 }} />}

      <AnimatePresence>
        {peek && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPeek(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="relative w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl">
              <div className="text-center text-base font-black text-amber-800 sm:text-lg">{cfg.emoji} {t(cfg.nameKey)} — {t('puzzle.sample')}</div>
              <img src={`/puzzles/${imgForSet(puzzleSet, current ?? 0)}.png`} alt="puzzle" className="mt-2 w-full rounded-xl" />
              <Button onClick={() => setPeek(false)} className="mt-3 w-full rounded-full">{t('puzzle.close')}</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('puzzle.assembled')}</h2>
              <p className="mt-1 text-sm font-bold sm:text-base">⏱ {t('puzzle.yourTime')}: {formatValue('puzzle', elapsed)}</p>
              {best != null && <p className="text-xs font-semibold">🏅 {t('puzzle.best')}: {formatValue('puzzle', best)}</p>}
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('puzzle.medalSub')}</div></motion.div>}
              {namePrompt ? (
                <div className="mt-4 rounded-2xl bg-white/20 p-3">
                  <div className="text-xs font-bold">{t('menu.namePrompt')}</div>
                  <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={12} className="mt-2 w-full rounded-full border-2 border-white bg-white/90 px-3 py-2 text-center text-sm font-bold text-gray-800 outline-none" placeholder="..." />
                  <Button onClick={saveScore} className="mt-2 w-full rounded-full bg-white text-sm font-black text-orange-600">{t('menu.save')}</Button>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3">
                  <Button onClick={() => { if (current + 1 < LEVELS.length) startLevel(current + 1); else setCurrent(null) }} className="h-12 rounded-full bg-white text-base font-black text-orange-600 shadow-lg hover:bg-white/90 sm:text-lg">{current + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                  <Button onClick={() => setCurrent(null)} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('puzzle.toPuzzles')}</Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
