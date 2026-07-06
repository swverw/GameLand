'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'
import { addScore, getScores, formatValue } from '@/lib/leaderboard'

const W = 360, H = 460
const LANES = 3
const LANE_W = W / LANES
const HIT_Y = H - 70
const NOTE_H = 26

const LANE_COLORS = ['#ef4444', '#22c55e', '#3b82f6']
const LANE_FREQS = [523.25, 659.25, 783.99] // C E G

interface LevelCfg { id: number; name: string; emoji: string; fallMs: number; gapMs: number; notes: number; medalPlace: string; endless?: boolean }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', fallMs: 1700, gapMs: 820, notes: 12, medalPlace: '🥉' },
  { id: 1, name: 'medium', emoji: '🟡', fallMs: 1250, gapMs: 580, notes: 16, medalPlace: '🥈' },
  { id: 2, name: 'hard', emoji: '🔴', fallMs: 900, gapMs: 420, notes: 22, medalPlace: '🥇' },
  { id: 3, name: 'endless', emoji: '♾️', fallMs: 1400, gapMs: 700, notes: 999, medalPlace: '🌟', endless: true },
]

// seeded RNG for reproducible patterns per set
function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) % 0xffffffff; return s / 0xffffffff }
}

interface Note { lane: number; spawn: number; hit: boolean; missed: boolean }
interface Active { lane: number; y: number; hit: boolean; missed: boolean; idx: number }

type Phase = 'intro' | 'playing' | 'done' | 'dead'

export function RhythmGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.rhythmCompleted)
  const set = useGameStore((s) => s.rhythmSet)
  const completeRhythm = useGameStore((s) => s.completeRhythmLevel)
  const resetSet = useGameStore((s) => s.resetRhythmSet)
  const resetGame = useGameStore((s) => s.resetGame)
  const medals = useGameStore((s) => s.medals)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [missed, setMissed] = useState(0)
  const [showMedal, setShowMedal] = useState(false)
  const [perfectStreak, setPerfectStreak] = useState(0)
  const perfectStreakRef = useRef(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const notesRef = useRef<Note[]>([])
  const startTimeRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const cfgRef = useRef(LEVELS[0])
  const hitFlashRef = useRef<number[]>([]) // lanes flashing on hit
  const sparkRef = useRef<{ lane: number; life: number }[]>([])
  const finishedRef = useRef(false)
  const scoreRef = useRef(0)

  const cfg = LEVELS[level]

  const buildPattern = useCallback((lv: number, _setIdx: number) => {
    const c = LEVELS[lv]
    // pure random — different every launch
    const notes: Note[] = []
    let time = 800
    let lastLane = -1
    for (let i = 0; i < c.notes; i++) {
      // avoid same lane twice in a row for fairness
      let lane = Math.floor(Math.random() * LANES)
      if (lane === lastLane) lane = (lane + 1) % LANES
      lastLane = lane
      notes.push({ lane, spawn: time, hit: false, missed: false })
      time += c.gapMs * (0.75 + Math.random() * 0.5)
    }
    return notes
  }, [])

  const startLevel = useCallback((lv: number) => {
    setLevel(lv); cfgRef.current = LEVELS[lv]
    setScore(0); setCombo(0); setMissed(0); setShowMedal(false); finishedRef.current = false; perfectStreakRef.current = 0; setPerfectStreak(0)
    notesRef.current = buildPattern(lv, set)
    startTimeRef.current = performance.now()
    hitFlashRef.current = []
    setPhase('playing'); phaseRef.current = 'playing'
  }, [buildPattern, set])

  // main loop
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let last = performance.now()

    const finish = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null
      phaseRef.current = 'done'; setPhase('done')
      music.blip('win')
      if (cfgRef.current.endless) {
        // endless: save score to leaderboard
        try { addScore('rhythm', 'Игрок', scoreRef.current, false) } catch {}
      } else {
        const wasComplete = completed[level]
        completeRhythm(level)
        const allDone = LEVELS.slice(0, 3).every((_, i) => (i === level ? true : completed[i]))
        if (allDone && !wasComplete && !medals.rhythm) setTimeout(() => setShowMedal(true), 600)
      }
    }

    const step = (now: number) => {
      const c = cfgRef.current
      const elapsed = now - startTimeRef.current
      // update missed notes (passed hit zone without hit)
      let allResolved = true
      let missCount = 0
      for (const n of notesRef.current) {
        if (n.hit) continue
        if (n.missed) missCount++
        const noteY = (elapsed - n.spawn) / c.fallMs * H
        if (!n.missed && noteY > HIT_Y + NOTE_H + 8) {
          n.missed = true; missCount++; setMissed((m) => m + 1); setCombo(0); perfectStreakRef.current = 0; setPerfectStreak(0)
        }
        if (!n.hit && !n.missed) allResolved = false
        if (!n.hit && n.missed && noteY < H + 60) allResolved = false
      }
      // lose if more than 5 misses
      if (missCount > 5 && !finishedRef.current) {
        finishedRef.current = true
        setTimeout(() => { phaseRef.current = 'dead'; setPhase('dead'); music.sfx('hurt') }, 200)
        return
      }
      // decay hit flashes & sparks
      hitFlashRef.current = hitFlashRef.current.map((v) => v - 1).filter((v) => v > 0)
      sparkRef.current = sparkRef.current.map((s) => ({ ...s, life: s.life - 1 })).filter((s) => s.life > 0)

      // draw
      ctx.clearRect(0, 0, W, H)
      // lanes bg
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'
        ctx.fillRect(i * LANE_W, 0, LANE_W, H)
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.fillRect(i * LANE_W - 1, 0, 2, H)
      }
      // hit zone
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(0, HIT_Y - 4, W, NOTE_H + 8)
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, HIT_Y); ctx.lineTo(W, HIT_Y); ctx.stroke()

      // notes
      for (const n of notesRef.current) {
        if (n.hit) continue
        const noteY = (elapsed - n.spawn) / c.fallMs * H
        if (noteY < -NOTE_H || noteY > H + 40) continue
        const x = n.lane * LANE_W + 8
        const w = LANE_W - 16
        ctx.fillStyle = n.missed ? 'rgba(150,150,150,0.4)' : LANE_COLORS[n.lane]
        roundRect(ctx, x, noteY, w, NOTE_H, 8); ctx.fill()
        if (!n.missed) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; roundRect(ctx, x, noteY, w, 6, 6); ctx.fill() }
      }
      // hit flash on lane buttons zone
      if (hitFlashRef.current.length > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        for (let i = 0; i < LANES; i++) ctx.fillRect(i * LANE_W, HIT_Y - 30, LANE_W, 60)
      }
      // PERFECT sparks
      for (const sp of sparkRef.current) {
        const cx = sp.lane * LANE_W + LANE_W / 2
        const cy = HIT_Y + NOTE_H / 2
        const t = 1 - sp.life / 30
        const r = 10 + t * 30
        ctx.save()
        ctx.globalAlpha = 1 - t
        // burst rays
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2 + t * 2
          ctx.strokeStyle = `hsl(${(a * 45 + sp.life * 12) % 360}, 90%, 60%)`
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(ang) * r * 0.4, cy + Math.sin(ang) * r * 0.4)
          ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r)
          ctx.stroke()
        }
        // PERFECT text
        ctx.fillStyle = '#fde047'
        ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3
        ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.strokeText('PERFECT!', cx, cy - r - 6)
        ctx.fillText('PERFECT!', cx, cy - r - 6)
        ctx.restore()
      }

      // check finished
      if (allResolved && !finishedRef.current) {
        finishedRef.current = true
        setTimeout(finish, 400)
      }
      if (phaseRef.current !== 'playing') return
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [phase, level])

  const tapLane = (lane: number) => {
    if (phase !== 'playing') return
    const c = cfgRef.current
    const elapsed = performance.now() - startTimeRef.current
    let best: Note | null = null
    let bestDist = Infinity
    for (const n of notesRef.current) {
      if (n.hit || n.lane !== lane) continue
      const noteY = (elapsed - n.spawn) / c.fallMs * H
      const dist = Math.abs(noteY - HIT_Y)
      if (dist < bestDist) { bestDist = dist; best = n }
    }
    const HIT_WINDOW = 60
    const PERFECT_WINDOW = 22
    if (best && bestDist < HIT_WINDOW) {
      best.hit = true
      const isPerfect = bestDist < PERFECT_WINDOW
      if (isPerfect) {
        perfectStreakRef.current += 1
        setPerfectStreak(perfectStreakRef.current)
        // PERFECT-streak multiplier: 10+ in a row = 3x, 5+ = 2x
        const mult = perfectStreakRef.current >= 10 ? 3 : perfectStreakRef.current >= 5 ? 2 : 1
        setScore((s) => { scoreRef.current = s + 5 * mult; return scoreRef.current })
        music.sfx('perfect')
        sparkRef.current.push({ lane, life: 30 })
        if (perfectStreakRef.current === 10) {
          // big celebration burst
          sparkRef.current.push({ lane, life: 50 })
          music.sfx('star')
        }
      } else {
        perfectStreakRef.current = 0
        setPerfectStreak(0)
        setScore((s) => { scoreRef.current = s + 2; return scoreRef.current })
      }
      setCombo((c) => c + 1)
      music.playTone(LANE_FREQS[lane], 0.2)
      hitFlashRef.current.push(8)
    } else {
      setCombo(0)
      perfectStreakRef.current = 0
      setPerfectStreak(0)
      music.sfx('hurt')
    }
  }

  // keyboard A/S/D for lanes
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (phase !== 'playing') return
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { tapLane(0); e.preventDefault() }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { tapLane(1); e.preventDefault() }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { tapLane(2); e.preventDefault() }
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  })

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-purple-100 via-fuchsia-100 to-pink-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🎶</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-purple-800">{t('game.rhythm')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-purple-700">{t('rhy.desc')}</p>
          <div className="mt-2 text-sm font-black text-purple-600">{t('rhy.set')}: {set + 1}/5</div>
          <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l, i) => {
              const done = !l.endless && completed[i]
              const locked = i > 0 && i < 3 && !completed[i - 1] && !medals.rhythm
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-purple-400 bg-purple-50 hover:scale-105' : l.endless ? 'border-fuchsia-400 bg-fuchsia-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`music.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-purple-600">{l.endless ? '∞' : `${l.notes} 🎵`}</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-purple-600">{t('common.play')}</span>}
                  {l.endless && <span className="text-xs font-bold text-fuchsia-600">∞ 🏆</span>}
                </button>
              )
            })}
          </div>
          {completed.every(Boolean) && set < 4 && (
            <button onClick={() => { resetSet(); music.sfx('whoosh') }} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-700 px-5 py-2.5 text-sm font-black text-white shadow-lg hover:scale-105"><RotateCcw className="h-4 w-4" /> {t('rhy.resetSet')} ({set + 2}/5)</button>
          )}
          {set >= 4 && <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">{t('rhy.allSets')}</span>}
          {medals.rhythm && <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('rhy.medalSub')}</span>}
          {(completed.some(Boolean) || set > 0) && (
            <button onClick={() => { if (confirm(t('common.confirmReset'))) { resetGame('rhythm'); music.sfx('whoosh') } }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2 text-xs font-black text-rose-600 shadow hover:bg-rose-200"><RotateCcw className="h-3.5 w-3.5" /> {t('common.fullReset')}</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-purple-200 via-fuchsia-200 to-indigo-300">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4"><Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button></div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-3 py-10">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-purple-800 sm:text-sm">
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">{cfg.emoji} {t(`music.${cfg.name}`)}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">⭐ {score}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">{t('rhy.combo')}: {combo} 🔥</span>
          {perfectStreak >= 5 && (
            <span className={`rounded-full px-3 py-1 shadow font-black ${perfectStreak >= 10 ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white animate-pulse' : 'bg-amber-200 text-amber-800'}`}>
              ✨ PERFECT x{perfectStreak}{perfectStreak >= 10 ? ' (3x!)' : perfectStreak >= 5 ? ' (2x!)' : ''}
            </span>
          )}
        </div>

        <div className="w-full max-w-[360px] overflow-hidden rounded-3xl border-4 border-white shadow-2xl" style={{ background: 'linear-gradient(180deg,#1e1b4b,#312e81)' }}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full" style={{ aspectRatio: `${W}/${H}` }} />
        </div>

        {/* lane buttons */}
        <div className="mt-3 grid w-full max-w-[360px] grid-cols-3 gap-2">
          {LANE_COLORS.map((c, i) => (
            <button
              key={i}
              onPointerDown={(e) => { e.preventDefault(); tapLane(i) }}
              className="h-16 rounded-2xl border-4 border-white text-lg font-black text-white shadow-lg active:scale-95"
              style={{ backgroundColor: c }}
            >
              {['A', 'S', 'D'][i]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-bold text-purple-700">{t('rhy.tip')}</p>
      </div>

      <AnimatePresence>
        {phase === 'dead' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-400 to-red-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <div className="text-7xl">😵</div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('rhy.missed')} &gt; 5</h2>
              <p className="mt-1 font-bold">⭐ {score}</p>
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => startLevel(level)} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-purple-400 to-fuchsia-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('common.levelDone')}</h2>
              <p className="mt-1 font-bold">⭐ {score} · {t('rhy.missed')}: {missed}</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('rhy.medalSub')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1); else setPhase('intro') }} className="h-12 rounded-full bg-white text-base font-black text-purple-700 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
