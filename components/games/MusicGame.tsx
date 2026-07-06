'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, RotateCcw, Play, Trash2, Music2 } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

type Phase = 'intro' | 'watch' | 'play' | 'done' | 'dead' | 'composer'

interface LevelCfg { id: number; name: string; emoji: string; pads: number; rounds: number; startNotes: number; growBy: number; tempo: number; medalPlace: string; descKey: string }
const LEVELS: LevelCfg[] = [
  { id: 0, name: 'easy', emoji: '🟢', pads: 3, rounds: 3, startNotes: 1, growBy: 1, tempo: 800, medalPlace: '🥉', descKey: 'music.easyDesc' },
  { id: 1, name: 'medium', emoji: '🟡', pads: 5, rounds: 4, startNotes: 4, growBy: 2, tempo: 620, medalPlace: '🥈', descKey: 'music.medDesc' },
  { id: 2, name: 'hard', emoji: '🔴', pads: 5, rounds: 5, startNotes: 6, growBy: 2, tempo: 480, medalPlace: '🥇', descKey: 'music.hardDesc' },
]

// 8-note scale for memory (C D E F G A B C) and composer (full octave+)
const NOTES = [
  { id: 0, color: 'from-rose-400 to-rose-600', freq: 523.25 },
  { id: 1, color: 'from-amber-400 to-amber-600', freq: 587.33 },
  { id: 2, color: 'from-emerald-400 to-emerald-600', freq: 659.25 },
  { id: 3, color: 'from-sky-400 to-sky-600', freq: 698.46 },
  { id: 4, color: 'from-violet-400 to-violet-600', freq: 783.99 },
  { id: 5, color: 'from-pink-400 to-pink-600', freq: 880.0 },
  { id: 6, color: 'from-lime-400 to-lime-600', freq: 987.77 },
  { id: 7, color: 'from-indigo-400 to-indigo-600', freq: 1046.5 },
]

// composer keys (white piano keys)
const COMP_NOTES = [
  { freq: 261.63, label: 'До' }, { freq: 293.66, label: 'Ре' }, { freq: 329.63, label: 'Ми' },
  { freq: 349.23, label: 'Фа' }, { freq: 392.0, label: 'Соль' }, { freq: 440.0, label: 'Ля' },
  { freq: 493.88, label: 'Си' }, { freq: 523.25, label: 'До' }, { freq: 587.33, label: 'Ре' },
  { freq: 659.25, label: 'Ми' }, { freq: 698.46, label: 'Фа' }, { freq: 783.99, label: 'Соль' },
]

export function MusicGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const musicCompleted = useGameStore((s) => s.musicCompleted)
  const completeMusicLevel = useGameStore((s) => s.completeMusicLevel)
  const medals = useGameStore((s) => s.medals)
  const setCustomMelody = useGameStore((s) => s.setCustomMelody)
  const customMelody = useGameStore((s) => s.customMelody)
  const sfxOn = useGameStore((s) => s.sfxOn)
  const setSfx = useGameStore((s) => s.setSfx)

  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(0)
  const [sequence, setSequence] = useState<number[]>([])
  const [round, setRound] = useState(0)
  const [active, setActive] = useState<number | null>(null)
  const [userIdx, setUserIdx] = useState(0)
  const [showMedal, setShowMedal] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // remember the global sfx state when entering the game so we can restore it on exit
  const prevSfx = useRef<boolean | null>(null)

  // when entering active play/composer, force SFX on so notes are audible
  useEffect(() => {
    if (phase !== 'intro') {
      if (!sfxOn) { if (prevSfx.current === null) prevSfx.current = false; setSfx(true) }
    }
  }, [phase])

  // restore previous sfx state when leaving the game entirely
  useEffect(() => {
    return () => { if (prevSfx.current === false) setSfx(false); prevSfx.current = null }
  }, [])

  const exitGame = () => {
    if (prevSfx.current === false) setSfx(false)
    prevSfx.current = null
    setScreen('menu')
  }

  // composer state
  const [compSeq, setCompSeq] = useState<number[]>([]) // indices into COMP_NOTES
  const [compActive, setCompActive] = useState<number | null>(null)
  const [recording, setRecording] = useState(false)
  const recordingRef = useRef(false) // ref for keyboard handler to access current value
  const savedMelodies = useGameStore((s) => s.savedMelodies)
  const saveMelody = useGameStore((s) => s.saveMelody)
  const deleteMelody = useGameStore((s) => s.deleteMelody)

  const cfg = LEVELS[level]

  const startLevel = useCallback((lv: number) => {
    setLevel(lv)
    const c = LEVELS[lv]
    // generate sequence long enough for the final round
    const maxNotes = c.startNotes + (c.rounds - 1) * c.growBy
    const seq = Array.from({ length: maxNotes }, () => Math.floor(Math.random() * c.pads))
    setSequence(seq); setRound(1); setUserIdx(0); setShowMedal(false); setPhase('watch')
  }, [])

  useEffect(() => {
    if (phase !== 'watch') return
    const c = LEVELS[level]
    const notesThisRound = c.startNotes + (round - 1) * c.growBy
    let i = 0
    const toLight = () => {
      if (i >= notesThisRound) { timerRef.current = setTimeout(() => { setActive(null); setPhase('play'); setUserIdx(0) }, c.tempo); return }
      const noteId = sequence[i]
      setActive(noteId)
      music.playTone(NOTES[noteId].freq, 0.3)
      timerRef.current = setTimeout(() => {
        setActive(null)
        timerRef.current = setTimeout(() => { i++; toLight() }, c.tempo * 0.3)
      }, c.tempo * 0.7)
    }
    timerRef.current = setTimeout(toLight, 600)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, round, sequence, level])

  const handleNote = (noteId: number) => {
    if (phase !== 'play') return
    setActive(noteId); music.playTone(NOTES[noteId].freq, 0.3)
    setTimeout(() => setActive(null), 250)
    if (noteId !== sequence[userIdx]) { music.sfx('hurt'); setPhase('dead'); return }
    const c = LEVELS[level]
    const notesThisRound = c.startNotes + (round - 1) * c.growBy
    const nextIdx = userIdx + 1
    if (nextIdx >= notesThisRound) {
      if (round >= c.rounds) {
        setPhase('done'); music.blip('win')
        const wasComplete = musicCompleted[level]
        completeMusicLevel(level)
        const allDone = LEVELS.every((_, i) => (i === level ? true : musicCompleted[i]))
        if (allDone && !wasComplete && !medals.music) setTimeout(() => setShowMedal(true), 700)
      } else {
        setUserIdx(0); setTimeout(() => setPhase('watch'), 500); setRound((r) => r + 1)
      }
    } else setUserIdx(nextIdx)
  }

  // composer
  const compTap = (idx: number) => {
    setCompActive(idx); music.playTone(COMP_NOTES[idx].freq, 0.4)
    setTimeout(() => setCompActive(null), 300)
    if (recordingRef.current) setCompSeq((s) => [...s, idx])
  }

  // keyboard mapping for composer: QWERTYUIOP[] (EN) / ЙЦУКЕНГШЩЗХЪ (RU) → notes 1..12
  useEffect(() => {
    if (phase !== 'composer') return
    const KEY_MAP: Record<string, number> = {
      'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4, 'y': 5, 'u': 6, 'i': 7, 'o': 8, 'p': 9, '[': 10, ']': 11,
      'й': 0, 'ц': 1, 'у': 2, 'к': 3, 'е': 4, 'н': 5, 'г': 6, 'ш': 7, 'щ': 8, 'з': 9, 'х': 10, 'ъ': 11,
    }
    const kd = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in KEY_MAP) { e.preventDefault(); compTap(KEY_MAP[key]) }
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [phase])
  const playComp = () => {
    if (compSeq.length === 0) return
    compSeq.forEach((idx, i) => {
      setTimeout(() => { setCompActive(idx); music.playTone(COMP_NOTES[idx].freq, 0.35); setTimeout(() => setCompActive(null), 300) }, i * 380)
    })
  }

  if (phase === 'intro') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-fuchsia-100 via-purple-100 to-violet-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={exitGame} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🎵</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-fuchsia-800">{t('game.music')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-fuchsia-700">{t('music.desc')}</p>
          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {LEVELS.map((l, i) => {
              const done = musicCompleted[i]
              const locked = i > 0 && !musicCompleted[i - 1] && !medals.music
              return (
                <button key={i} disabled={locked} onClick={() => startLevel(i)} className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center shadow-md transition ${locked ? 'border-gray-200 bg-gray-100 opacity-60' : done ? 'border-fuchsia-400 bg-fuchsia-50 hover:scale-105' : 'border-white bg-white/80 hover:scale-105'}`}>
                  <span className="text-3xl">{l.medalPlace}</span>
                  <span className="text-sm font-black text-gray-800">{l.emoji} {t(`music.${l.name}`)}</span>
                  <span className="text-xs font-semibold text-fuchsia-600">{l.rounds} {t('music.noteCount')}</span>
                  {done && <span className="text-xs font-bold text-emerald-600">{t('common.completed')}</span>}
                  {locked && <span className="text-xs font-bold text-gray-400">{t('common.locked')}</span>}
                  {!done && !locked && <span className="text-xs font-bold text-fuchsia-600">{t('common.play')}</span>}
                </button>
              )
            })}
          </div>
          <button onClick={() => { setCompSeq([]); setRecording(false); setPhase('composer'); music.sfx('pop') }} className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-700 px-6 py-3 text-base font-black text-white shadow-xl hover:scale-105 sm:text-lg">
            <Music2 className="h-5 w-5" /> {t('music.composer')}
          </button>
          <p className="mt-1 text-xs font-semibold text-fuchsia-600">{t('music.composerDesc')}</p>
          {medals.music && <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {t('music.medalSub')}</span>}
        </div>
      </div>
    )
  }

  if (phase === 'composer') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-fuchsia-100 via-purple-100 to-violet-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={() => setPhase('intro')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center justify-center px-4 py-12">
          <h1 className="text-xl font-black text-fuchsia-800 sm:text-3xl">🎼 {t('music.composer')}</h1>
          <p className="mt-1 text-center text-xs font-semibold text-fuchsia-700 sm:text-sm">{t('music.composerDesc')}</p>

          {/* piano keys */}
          <div className="mt-5 flex w-full max-w-lg justify-center gap-1 overflow-x-auto pb-2">
            {COMP_NOTES.map((n, i) => {
              const keyLabel = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'][i]
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.93 }}
                  onPointerDown={() => compTap(i)}
                  className={`relative flex h-28 w-10 flex-col items-center justify-end rounded-b-lg border-2 border-gray-400 bg-white pb-1.5 shadow-md transition-all sm:h-36 sm:w-11 ${compActive === i ? 'bg-fuchsia-200 scale-95 border-fuchsia-400' : ''}`}
                >
                  <span className="text-[9px] font-black text-fuchsia-500 sm:text-[10px]">{keyLabel}</span>
                  <span className="text-[9px] font-bold text-gray-600 sm:text-[11px]">{n.label}</span>
                </motion.button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => { const next = !recording; setRecording(next); recordingRef.current = next; if (next) music.sfx('whoosh') }} className={`rounded-full ${recording ? 'bg-red-500 text-white' : 'bg-white text-fuchsia-700'}`}>
              {t('music.record')} {recording ? '⏺' : ''}
            </Button>
            <Button onClick={playComp} className="rounded-full bg-fuchsia-600 text-white"><Play className="h-4 w-4" /> {t('music.play')}</Button>
            <Button onClick={() => setCompSeq([])} variant="outline" className="rounded-full bg-white/90"><Trash2 className="h-4 w-4" /> {t('music.clear')}</Button>
            {compSeq.length >= 2 && (
              <Button
                onClick={() => { setCustomMelody(compSeq.map((i) => COMP_NOTES[i].freq)); music.sfx('star') }}
                className="rounded-full bg-gradient-to-b from-amber-400 to-orange-500 text-white"
              >
                🎵 {t('music.saveBg')}
              </Button>
            )}
            {customMelody.length > 0 && (
              <Button onClick={() => { setCustomMelody([]); music.sfx('pop') }} variant="outline" className="rounded-full bg-white/90">{t('music.clearBg')}</Button>
            )}
          </div>
          {customMelody.length > 0 && <div className="mt-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-black text-emerald-700">{t('music.bgSet')}</div>}

          <div className="mt-3 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-fuchsia-700">
            {compSeq.length} {t('music.noteCount')}
          </div>
          {compSeq.length > 0 && (
            <div className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-1">
              {compSeq.map((idx, i) => (
                <span key={i} className="rounded bg-fuchsia-200 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-800">{COMP_NOTES[idx].label}</span>
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-[11px] font-semibold text-fuchsia-600">💡 Жми «Запись», играй на клавишах, потом «Играть» — услышишь свою мелодию!</p>

          {/* 5 saved melody slots */}
          <div className="mt-4 w-full max-w-lg rounded-2xl bg-white/60 p-3 shadow-md">
            <div className="mb-2 text-center text-xs font-black text-fuchsia-700">💾 {t('music.savedTitle')}</div>
            <div className="grid grid-cols-5 gap-2">
              {savedMelodies.map((mel, slot) => (
                <div key={slot} className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => {
                      if (mel) {
                        // load: play it
                        mel.forEach((freq, i) => {
                          setTimeout(() => { music.playTone(freq, 0.35) }, i * 350)
                        })
                      } else if (compSeq.length >= 2) {
                        // save current
                        saveMelody(slot, compSeq.map((i) => COMP_NOTES[i].freq))
                        music.sfx('star')
                      }
                    }}
                    disabled={!mel && compSeq.length < 2}
                    className={`flex h-12 w-full items-center justify-center rounded-xl border-2 text-lg font-black shadow-sm transition ${
                      mel ? 'border-fuchsia-400 bg-fuchsia-100 text-fuchsia-700 hover:scale-105' :
                      compSeq.length >= 2 ? 'border-dashed border-fuchsia-300 bg-white text-fuchsia-400 hover:bg-fuchsia-50' :
                      'border-dashed border-gray-200 bg-gray-50 text-gray-300'
                    }`}
                  >
                    {mel ? '▶' : '💾'}
                  </button>
                  <span className="text-[9px] font-bold text-gray-500">#{slot + 1}{mel ? ` (${mel.length})` : ''}</span>
                  {mel && (
                    <button onClick={() => { deleteMelody(slot); music.sfx('pop') }} className="text-[9px] font-bold text-rose-400 hover:text-rose-600">✕</button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] font-semibold text-gray-500">
              {compSeq.length >= 2 ? '💾 = сохранить здесь' : 'Запиши мелодию, чтобы сохранить'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'dead') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-fuchsia-100 to-purple-200">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={exitGame} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-sm flex-col items-center justify-center px-6 text-center">
          <div className="text-7xl">😵</div>
          <h2 className="mt-3 text-2xl font-black text-fuchsia-800 sm:text-3xl">{t('music.wrong')}</h2>
          <p className="mt-2 font-bold text-fuchsia-700">{t('music.round')}: {round}/{cfg.rounds}</p>
          <div className="mt-6 flex w-full flex-col gap-3">
            <Button onClick={() => startLevel(level)} className="h-12 rounded-full bg-fuchsia-600 text-base font-black text-white shadow-lg hover:bg-fuchsia-700 sm:text-lg"><RotateCcw className="h-5 w-5" /> {t('common.retry')}</Button>
            <Button onClick={() => setPhase('intro')} variant="outline" className="h-12 rounded-full bg-white/90 text-base font-black text-fuchsia-700 sm:text-lg">{t('common.toLevels')}</Button>
          </div>
        </div>
      </div>
    )
  }

  // playing / watch / done
  const cols = Math.min(cfg.pads, 3)
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-fuchsia-100 via-purple-100 to-violet-200">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={exitGame} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-4 py-12">
        <div className="text-center">
          <h1 className="text-lg font-black text-fuchsia-800 sm:text-2xl">🎵 {t('game.music')}</h1>
          <div className="mt-1 text-sm font-black text-fuchsia-700">{t('music.round')} {round}/{cfg.rounds} · {cfg.emoji} {t(`music.${cfg.name}`)}</div>
          <div className="mt-1 text-sm font-bold text-fuchsia-600">{phase === 'watch' ? t('music.watch') : phase === 'play' ? t('music.yourTurn') : ''}</div>
        </div>
        <div className="mt-6 grid w-full max-w-xs gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {NOTES.slice(0, cfg.pads).map((n) => {
            const lit = active === n.id
            return (
              <motion.button key={n.id} whileTap={{ scale: 0.94 }} onPointerDown={() => handleNote(n.id)} disabled={phase !== 'play'} className={`h-24 rounded-2xl bg-gradient-to-br ${n.color} shadow-xl ring-2 ring-white/60 transition-all sm:h-28 ${lit ? 'scale-95 ring-4 ring-white brightness-125' : ''} ${phase !== 'play' ? 'opacity-80' : ''}`} aria-label={`note ${n.id}`} />
            )
          })}
        </div>
        <p className="mt-6 text-center text-xs font-bold text-fuchsia-700">{phase === 'watch' ? '👂' : phase === 'play' ? '👆' : ''}</p>
      </div>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-fuchsia-400 to-purple-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">{cfg.medalPlace}</motion.div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{t('music.levelDone')}</h2>
              <p className="mt-1 font-bold">{cfg.emoji} {t(`music.${cfg.name}`)}</p>
              {showMedal && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 rounded-2xl bg-yellow-300 p-4 text-yellow-900 shadow-lg"><div className="text-5xl">🏅</div><div className="mt-1 font-black">{t('common.medalEarned')}</div><div className="text-xs font-semibold">{t('music.medalSub')}</div></motion.div>}
              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => { setShowMedal(false); if (level + 1 < LEVELS.length) startLevel(level + 1); else setPhase('intro') }} className="h-12 rounded-full bg-white text-base font-black text-fuchsia-700 shadow-lg hover:bg-white/90 sm:text-lg">{level + 1 < LEVELS.length ? t('common.next') : t('common.done')}</Button>
                <Button onClick={() => setPhase('intro')} className="h-12 rounded-full border-2 border-white bg-white/15 text-base font-black text-white backdrop-blur hover:bg-white/25 sm:text-lg">{t('common.toLevels')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
