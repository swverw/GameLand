'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const W = 400, H = 300

interface LevelCfg { id: number; name: string; emoji: string; diffs: number; medalPlace: string }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', diffs: 5, medalPlace: '🥉' },
  { id: 1, name: 'medium', emoji: '🟡', diffs: 7, medalPlace: '🥈' },
  { id: 2, name: 'hard', emoji: '🔴', diffs: 9, medalPlace: '🥇' },
]

interface Diff { x: number; y: number; r: number; found: boolean }

type Phase = 'intro' | 'playing' | 'done'

export function SpotDiffGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.spotdiffCompleted)
  const set = useGameStore((s) => s.spotdiffSet)
  const completeSpot = useGameStore((s) => s.completeSpotLevel)
  const resetSet = useGameStore((s) => s.resetSpotSet)
  const resetGame = useGameStore((s) => s.resetGame)
  const medals = useGameStore((s) => s.medals)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [diffs, setDiffs] = useState<Diff[]>([])
  const [showMedal, setShowMedal] = useState(false)
  const [missFlash, setMissFlash] = useState(false)
  const leftRef = useRef<HTMLCanvasElement>(null)
  const rightRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const imgLoaded = useRef(false)

  const cfg = LEVELS[level]
  const imgId = (set % 5) + 1 // images 1..5

  const buildDiff = useCallback((lv: number) => {
    const c = LEVELS[lv]
    const arr: Diff[] = []
    const n = c.diffs
    // generate well-spaced diff spots (in image px)
    let attempts = 0
    while (arr.length < n && attempts < 400) {
      attempts++
      const r = 16 + Math.random() * 8
      const x = 40 + Math.random() * (W - 80)
      const y = 40 + Math.random() * (H - 80)
      if (arr.every((d) => Math.hypot(d.x - x, d.y - y) > r + d.r + 10)) arr.push({ x, y, r, found: false })
    }
    setDiffs(arr)
  }, [])

  const drawCanvases = useCallback(() => {
    const lc = leftRef.current, rc = rightRef.current
    const img = imgRef.current
    if (!lc || !rc || !img || !imgLoaded.current) return
    const lctx = lc.getContext('2d')!, rctx = rc.getContext('2d')!
    // left = full image
    lctx.clearRect(0, 0, W, H)
    lctx.drawImage(img, 0, 0, W, H)
    // right = image with subtle differences (cloned surrounding region so they're hard to spot)
    rctx.clearRect(0, 0, W, H)
    rctx.drawImage(img, 0, 0, W, H)
    for (const d of diffs) {
      if (d.found) continue
      // sample a patch from a nearby offset region and stamp it over the diff spot,
      // making the missing detail blend in with its surroundings (subtle, not a white blob)
      const offsetX = (Math.random() - 0.5) * 40 + (d.x > W / 2 ? -30 : 30)
      const offsetY = (Math.random() - 0.5) * 40 + (d.y > H / 2 ? -20 : 20)
      const sx = Math.max(0, Math.min(W - d.r * 2, d.x + offsetX - d.r))
      const sy = Math.max(0, Math.min(H - d.r * 2, d.y + offsetY - d.r))
      // clip to circle and draw the sampled patch
      rctx.save()
      rctx.beginPath()
      rctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      rctx.clip()
      rctx.drawImage(rc, sx, sy, d.r * 2, d.r * 2, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2)
      rctx.restore()
      // very subtle feathering at the edge so it's not a hard circle
      rctx.save()
      const grad = rctx.createRadialGradient(d.x, d.y, d.r * 0.6, d.x, d.y, d.r)
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(1, 'rgba(255,255,255,0.08)')
      rctx.fillStyle = grad
      rctx.beginPath()
      rctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      rctx.fill()
      rctx.restore()
    }
    // draw found markers on both
    for (const d of diffs) {
      if (!d.found) continue
      lctx.strokeStyle = '#22c55e'; lctx.lineWidth = 4
      lctx.beginPath(); lctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); lctx.stroke()
      rctx.strokeStyle = '#22c55e'; rctx.lineWidth = 4
      rctx.beginPath(); rctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); rctx.stroke()
    }
  }, [diffs])

  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgLoaded.current = true; imgRef.current = img; drawCanvases() }
    img.src = `/puzzles/${imgId}.png`
    return () => { imgLoaded.current = false }
  }, [imgId, drawCanvases])

  useEffect(() => { drawCanvases() }, [diffs, drawCanvases])

  const startLevel = useCallback((lv: number) => {
    setLevel(lv); setShowMedal(false); setPhase('playing'); imgLoaded.current = false
    buildDiff(lv)
  }, [buildDiff])

  // when entering playing, ensure image reload + rebuild
  useEffect(() => {
    if (phase === 'playing') {
      const img = new Image()
      img.onload = () => { imgLoaded.current = true; imgRef.current = img; drawCanvases() }
      img.src = `/puzzles/${imgId}.png`
    }
  }, [phase, imgId, drawCanvases])

  const handleTap = (e: React.PointerEvent) => {
    if (phase !== 'playing') return
    const c = rightRef.current!; const r = c.getBoundingClientRect()
    const x = (e.clientX - r.left) * (W / r.width)
    const y = (e.clientY - r.top) * (H / r.height)
    let hit = false
    const next = diffs.map((d) => {
      if (!d.found && Math.hypot(d.x - x, d.y - y) < d.r + 6) { hit = true; return { ...d, found: true } }
      return d
    })
    if (hit) {
      music.sfx('coin'); setDiffs(next)
      if (next.every((d) => d.found)) {
        const wasComplete = completed[level]
        completeSpot(level)
        const allDone = LEVELS.every((_, i) => (i === level ? true : completed[i]))
        if (allDone && !wasComplete && !medals.spotdiff) setTimeout(() => setShowMedal(true), 600)
        setTimeout(() => setPhase('done'), 800)
      }
    } else {
      setMissFlash(true); music.sfx('hurt')
      setTimeout(() => setMissFlash(false), 300)
    }
  }

  const foundCount = diffs.filter((d) => d.found).length

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-fuchsia-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🔎</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-rose-800">{t('game.spotdiff')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-rose-700">{t('spot.desc')}</p>
          <div className="mt-2 text-sm font-black text-rose-600">{t('spot.set')}: {set + 1}/5</div>
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => {
              const done = completed[i]
              const locked = i > 0 && !completed[i - 1] && !medals.spotdiff
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-rose-400 bg-rose-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`music.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-rose-600">{l.diffs} 🔍</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-rose-600">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          {completed.every(Boolean) && set < 4 && (
            <button onClick={() => { resetSet(); music.sfx('whoosh') }} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-rose-500 to-pink-700 px-5 py-2.5 text-sm font-black text-white shadow-lg hover:scale-105"><RotateCcw className="h-4 w-4" /> {t('spot.resetSet')} ({set + 2}/5)</button>
          )}
          {set >= 4 && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">{t('spot.allSets')}</span>}
          {medals.spotdiff && <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('spot.medalSub')}</span>}
          {(completed.some(Boolean) || set > 0) && (
            <button onClick={() => { if (confirm(t('common.confirmReset'))) { resetGame('spotdiff'); music.sfx('whoosh') } }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2 text-xs font-black text-rose-600 shadow hover:bg-rose-200"><RotateCcw className="h-3.5 w-3.5" /> {t('common.fullReset')}</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-fuchsia-200">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center justify-center px-3 py-12">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-rose-700 sm:text-sm">
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">{cfg.emoji} {t(`music.${cfg.name}`)}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">🔍 {foundCount} {t('spot.of')} {cfg.diffs}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">{t('spot.set')} {set + 1}/5</span>
        </div>
        <h1 className="text-base font-black text-rose-800 sm:text-2xl">🔎 {t('game.spotdiff')}</h1>
        <p className="mt-1 text-xs font-bold text-rose-700 sm:text-sm">{t('spot.tip')}</p>

        <div className="mt-3 grid w-full grid-cols-2 gap-2 sm:gap-3">
          <div className="overflow-hidden rounded-2xl border-4 border-white shadow-xl">
            <canvas ref={leftRef} width={W} height={H} className="w-full" style={{ aspectRatio: `${W}/${H}` }} />
          </div>
          <div className={`relative overflow-hidden rounded-2xl border-4 border-white shadow-xl ${missFlash ? 'ring-4 ring-rose-400' : ''}`}>
            <canvas ref={rightRef} width={W} height={H} onPointerDown={handleTap} className="w-full touch-none cursor-pointer" style={{ aspectRatio: `${W}/${H}` }} />
          </div>
        </div>
        <div className="mt-1 flex w-full justify-between text-[10px] font-bold text-rose-600 sm:text-xs">
          <span>🖼️ {t('spot.of')}</span>
          <span>👆 {t('spot.tip').replace('💡 ', '')}</span>
        </div>
      </div>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-400 to-pink-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('common.levelDone')}</h2>
              <p className="mt-1 font-bold">{cfg.emoji} {t(`music.${cfg.name}`)} · {cfg.diffs} 🔍</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('spot.medalSub')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1); else setPhase('intro') }} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
