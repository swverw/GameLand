'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, Sparkles, RotateCcw, Brush, Pencil, Eraser } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

const CANVAS = 460
const PALETTE = [
  '#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e', '#06b6d4',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#92400e', '#1f2937', '#ffffff',
]
const SIZES = [8, 16, 28, 48]
const COMPLETE_THRESHOLD = 0.90

interface Pic { id: number; name: string; emoji: string }
const PICTURES: Pic[] = [
  { id: 1, name: 'rocket', emoji: '🚀' }, { id: 2, name: 'sun', emoji: '☀️' },
  { id: 3, name: 'house', emoji: '🏠' }, { id: 4, name: 'tree', emoji: '🌳' },
  { id: 5, name: 'fish', emoji: '🐟' }, { id: 6, name: 'star', emoji: '⭐' },
  { id: 7, name: 'flower', emoji: '🌸' }, { id: 8, name: 'car', emoji: '🚗' },
  { id: 9, name: 'boat', emoji: '⛵' }, { id: 10, name: 'balloon', emoji: '🎈' },
  { id: 11, name: 'apple', emoji: '🍎' }, { id: 12, name: 'rainbow', emoji: '🌈' },
  { id: 13, name: 'cloud', emoji: '☁️' }, { id: 14, name: 'mountain', emoji: '⛰️' },
  { id: 15, name: 'icecream', emoji: '🍦' }, { id: 16, name: 'butterfly', emoji: '🦋' },
  { id: 17, name: 'bird', emoji: '🐦' }, { id: 18, name: 'mushroom', emoji: '🍄' },
  { id: 19, name: 'umbrella', emoji: '☂️' }, { id: 20, name: 'cat', emoji: '🐱' },
]
const GREY = '#d8d8d8'

type Mode = 'choose' | 'color' | 'free'
type Tool = 'brush' | 'pencil' | 'eraser' | 'neon' | 'sparkle' | 'rainbow' | 'spray' | 'fill'

export function DrawingGame() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const completed = useGameStore((s) => s.drawingCompleted)
  const completeDrawing = useGameStore((s) => s.completeDrawing)
  const medals = useGameStore((s) => s.medals)

  const [mode, setMode] = useState<Mode>('choose')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskRef = useRef<Uint8Array | null>(null)
  const totalTargetRef = useRef<number>(0)
  const targetColorsRef = useRef<Uint8Array | null>(null) // original pixel colors for the silhouette
  const drawing = useRef(false)
  const lastPt = useRef<{ x: number; y: number } | null>(null)
  const imgCache = useRef<Map<number, HTMLImageElement>>(new Map())

  const [color, setColor] = useState(PALETTE[0])
  const [size, setSize] = useState(SIZES[1])
  const [tool, setTool] = useState<Tool>('brush')
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [showMedal, setShowMedal] = useState(false)
  const [imgError, setImgError] = useState(false)

  const [idx, setIdx] = useState(() => {
    const uncompleted = PICTURES.filter((p) => !completed.includes(p.id))
    const pool = uncompleted.length ? uncompleted : PICTURES
    return pool[Math.floor(Math.random() * pool.length)].id
  })
  const picture = PICTURES.find((p) => p.id === idx)!

  const loadImage = useCallback((id: number): Promise<HTMLImageElement> => {
    if (imgCache.current.has(id)) return Promise.resolve(imgCache.current.get(id)!)
    return new Promise((resolve, reject) => {
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => { imgCache.current.set(id, img); resolve(img) }
      img.onerror = reject; img.src = `/drawing/${id}.png`
    })
  }, [])

  const setupPicture = useCallback(async (id: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!; setImgError(false)
    try {
      const img = await loadImage(id)
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CANVAS, CANVAS)
      ctx.drawImage(img, 0, 0, CANVAS, CANVAS)
      const imgData = ctx.getImageData(0, 0, CANVAS, CANVAS)
      const data = imgData.data
      // raw mask: 1 if pixel is not near-white (part of the silhouette)
      const rawMask = new Uint8Array(CANVAS * CANVAS)
      for (let i = 0; i < rawMask.length; i++) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
        if (!(r > 238 && g > 238 && b > 238)) rawMask[i] = 1
      }
      // erode mask by 1px: only keep pixels whose 4 neighbours are also in the mask.
      // This removes anti-aliased edge pixels that can never be fully painted, so the
      // total target is achievable and progress can reach 100%.
      const mask = new Uint8Array(CANVAS * CANVAS); let total = 0
      for (let y = 0; y < CANVAS; y++) {
        for (let x = 0; x < CANVAS; x++) {
          const i = y * CANVAS + x
          if (!rawMask[i]) continue
          const up = y > 0 ? rawMask[i - CANVAS] : 0
          const down = y < CANVAS - 1 ? rawMask[i + CANVAS] : 0
          const left = x > 0 ? rawMask[i - 1] : 0
          const right = x < CANVAS - 1 ? rawMask[i + 1] : 0
          if (up && down && left && right) { mask[i] = 1; total++ }
        }
      }
      // draw grey silhouette using the eroded mask
      // ALSO save original target colors for progress comparison
      const targetColors = new Uint8Array(CANVAS * CANVAS * 3)
      for (let i = 0; i < mask.length; i++) {
        if (mask[i]) {
          // save original color
          targetColors[i * 3] = data[i * 4]
          targetColors[i * 3 + 1] = data[i * 4 + 1]
          targetColors[i * 3 + 2] = data[i * 4 + 2]
          // replace with grey
          data[i * 4] = 216; data[i * 4 + 1] = 216; data[i * 4 + 2] = 216
        } else {
          data[i * 4] = 255; data[i * 4 + 1] = 255; data[i * 4 + 2] = 255
        }
        data[i * 4 + 3] = 255
      }
      ctx.putImageData(imgData, 0, 0); maskRef.current = mask; totalTargetRef.current = total
      targetColorsRef.current = targetColors
      setProgress(0); setDone(false)
    } catch {
      setImgError(true)
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CANVAS, CANVAS)
      ctx.fillStyle = GREY
      ctx.beginPath(); ctx.arc(CANVAS / 2, CANVAS / 2, CANVAS * 0.3, 0, Math.PI * 2); ctx.fill()
      const imgData = ctx.getImageData(0, 0, CANVAS, CANVAS); const data = imgData.data
      const mask = new Uint8Array(CANVAS * CANVAS); let total = 0
      for (let i = 0; i < mask.length; i++) { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; if (!(r > 238 && g > 238 && b > 238)) { mask[i] = 1; total++ } }
      maskRef.current = mask; totalTargetRef.current = total; setProgress(0); setDone(false)
    }
  }, [loadImage])

  const setupFree = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CANVAS, CANVAS)
    maskRef.current = null; totalTargetRef.current = 0
    setProgress(0); setDone(false)
  }, [])

  useEffect(() => {
    if (mode === 'color') setupPicture(idx)
    else if (mode === 'free') setupFree()
  }, [idx, mode, setupPicture, setupFree])

  const computeProgress = useCallback(() => {
    if (mode !== 'color') return 0
    const canvas = canvasRef.current; if (!canvas || !maskRef.current || !targetColorsRef.current) return 0
    const ctx = canvas.getContext('2d')!
    const img = ctx.getImageData(0, 0, CANVAS, CANVAS).data
    const mask = maskRef.current; const targets = targetColorsRef.current; let painted = 0
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        const r = img[i * 4], g = img[i * 4 + 1], b = img[i * 4 + 2]
        // pixel is "painted" if it's no longer grey (changed from 216,216,216)
        const greyDiff = Math.abs(r - 216) + Math.abs(g - 216) + Math.abs(b - 216)
        if (greyDiff > 25) painted++
      }
    }
    const pct = totalTargetRef.current ? painted / totalTargetRef.current : 0
    setProgress(Math.min(1, pct)); return pct
  }, [mode])

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!; const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (CANVAS / rect.width), y: (e.clientY - rect.top) * (CANVAS / rect.height) }
  }

  const applyStroke = (ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'; ctx.lineWidth = size * 1.3
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
    } else if (tool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color; ctx.lineWidth = size * 0.5; ctx.globalAlpha = 0.6
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
    } else if (tool === 'neon') {
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowColor = color; ctx.shadowBlur = size
      ctx.strokeStyle = color; ctx.lineWidth = size * 0.6; ctx.globalAlpha = 0.9
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
      ctx.shadowBlur = 0
    } else if (tool === 'rainbow') {
      ctx.globalCompositeOperation = 'source-over'
      const hue = (Date.now() / 10) % 360
      ctx.strokeStyle = `hsl(${hue},90%,55%)`; ctx.lineWidth = size
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
    } else if (tool === 'spray') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = color
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * size * 0.8
        ctx.fillRect(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, 1.5, 1.5)
      }
    } else if (tool === 'sparkle') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(to.x, to.y, size * 0.35, 0, Math.PI * 2); ctx.fill()
      // sparkles
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, r = size * (0.4 + Math.random() * 0.5)
        ctx.beginPath(); ctx.arc(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, 1.2, 0, Math.PI * 2); ctx.fill()
      }
    } else {
      // brush (default)
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color; ctx.lineWidth = size
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0
  }

  // flood fill at point with current color
  const floodFill = (ctx: CanvasRenderingContext2D, sx: number, sy: number) => {
    const img = ctx.getImageData(0, 0, CANVAS, CANVAS)
    const data = img.data
    const x0 = Math.floor(sx), y0 = Math.floor(sy)
    const startIdx = (y0 * CANVAS + x0) * 4
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2], sa = data[startIdx + 3]
    // parse target color
    const hex = color.replace('#', '')
    const tr = parseInt(hex.slice(0, 2), 16), tg = parseInt(hex.slice(2, 4), 16), tb = parseInt(hex.slice(4, 6), 16)
    if (sr === tr && sg === tg && sb === tb) return
    const match = (i: number) => Math.abs(data[i] - sr) < 30 && Math.abs(data[i + 1] - sg) < 30 && Math.abs(data[i + 2] - sb) < 30 && Math.abs(data[i + 3] - sa) < 30
    const stack = [[x0, y0]]
    let count = 0
    while (stack.length && count < CANVAS * CANVAS) {
      const [x, y] = stack.pop()!
      if (x < 0 || x >= CANVAS || y < 0 || y >= CANVAS) continue
      const i = (y * CANVAS + x) * 4
      if (!match(i)) continue
      data[i] = tr; data[i + 1] = tg; data[i + 2] = tb; data[i + 3] = 255
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
      count++
    }
    ctx.putImageData(img, 0, 0)
  }

  const onDown = (e: React.PointerEvent) => {
    if (mode === 'color' && done) return
    e.preventDefault()
    const canvas = canvasRef.current!; canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')!
    const p = getPos(e)
    if (tool === 'fill') {
      floodFill(ctx, p.x, p.y)
      music.sfx('pop')
      if (mode === 'color') { const pct = computeProgress(); if (pct >= COMPLETE_THRESHOLD && !done) finishPicture() }
      return
    }
    drawing.current = true
    lastPt.current = p
    // initial dot
    applyStroke(ctx, p, p)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current!; const ctx = canvas.getContext('2d')!
    const p = getPos(e); const last = lastPt.current || p
    applyStroke(ctx, last, p); lastPt.current = p
  }
  const onUp = () => {
    if (!drawing.current) return
    drawing.current = false; lastPt.current = null
    if (mode === 'color') { const pct = computeProgress(); if (pct >= COMPLETE_THRESHOLD && !done) finishPicture() }
  }

  const finishPicture = () => {
    setDone(true); music.blip('win')
    const wasCompleted = completed.includes(idx); const isFirst = !medals.drawing
    completeDrawing(idx)
    const newCompletedCount = wasCompleted ? completed.length : completed.length + 1
    if (newCompletedCount >= 20 && isFirst) setTimeout(() => setShowMedal(true), 700)
  }
  const nextPicture = () => {
    setShowMedal(false)
    const uncompleted = PICTURES.filter((p) => !completed.includes(p.id) && p.id !== idx)
    setIdx(uncompleted.length ? uncompleted[Math.floor(Math.random() * uncompleted.length)].id : PICTURES[Math.floor(Math.random() * PICTURES.length)].id)
  }
  const clearCanvas = () => { if (mode === 'color') setupPicture(idx); else setupFree() }

  // ---------- CHOOSE MODE ----------
  if (mode === 'choose') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-orange-100">
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col items-center justify-center px-4 py-12">
          <div className="text-7xl">🎨</div>
          <h1 className="mt-2 text-4xl sm:text-5xl font-black text-rose-700">{t('game.drawing')}</h1>
          <p className="mt-2 max-w-md text-center font-semibold text-rose-600">{t('drawing.progress')}: {completed.length}/20</p>
          <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
            <motion.button whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => { setMode('color'); music.sfx('pop') }} className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-600 p-6 text-white shadow-xl ring-4 ring-rose-200">
              <span className="text-5xl">🖼️</span>
              <span className="text-xl font-black">{t('drawing.modeColor')}</span>
              <span className="text-xs font-semibold opacity-90">20/20 🏆</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => { setMode('free'); music.sfx('pop') }} className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-fuchsia-400 to-purple-600 p-6 text-white shadow-xl ring-4 ring-fuchsia-200">
              <span className="text-5xl">🖌️</span>
              <span className="text-xl font-black">{t('drawing.modeFree')}</span>
              <span className="text-xs font-semibold opacity-90">🎨 ✏️ 🧽</span>
            </motion.button>
          </div>
          {medals.drawing && <span className="mt-5 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-yellow-900">🏆 {completed.length}/20</span>}
        </div>
      </div>
    )
  }

  // ---------- CANVAS MODE (color or free) ----------
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-orange-100">
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setMode('choose')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"><TopControls /></div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-3 py-14 sm:px-4">
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-black text-rose-700">🎨 {mode === 'free' ? t('drawing.modeFree') : `${picture.emoji} ${t(`draw.${picture.name}`)}`}</h1>
          {mode === 'color' && <p className="mt-1 font-bold text-rose-600">{t('drawing.progress')}: {completed.length}/20</p>}
        </div>

        <div className="mt-3 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_200px]">
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[460px]">
              <canvas ref={canvasRef} width={CANVAS} height={CANVAS} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} className="w-full touch-none rounded-2xl border-4 border-white bg-white shadow-xl" style={{ aspectRatio: '1 / 1' }} />
              {done && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-400/40 backdrop-blur-[1px]">
                  <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="rounded-full bg-white px-6 py-3 text-2xl font-black text-emerald-600 shadow-2xl sm:text-3xl">✅ {t('drawing.hundred')}</motion.div>
                </motion.div>
              )}
            </div>

            {mode === 'color' && (
              <div className="mt-3 w-full max-w-[460px]">
                <div className="flex items-center justify-between text-xs font-black text-rose-700 sm:text-sm"><span>{t('drawing.progress') === 'Готово' ? 'Прогресс' : 'Progress'}</span><span>{Math.round(progress * 100)}%</span></div>
                <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-rose-400 via-pink-500 to-purple-500" animate={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            )}

            {/* TOOLS */}
            <div className="mt-3 w-full max-w-[460px] rounded-2xl bg-white/70 p-2.5 shadow-md backdrop-blur sm:p-3">
              {/* tool selector */}
              <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
                <button onClick={() => { setTool('brush'); music.sfx('pop') }} className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'brush' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}><Brush className="h-3.5 w-3.5" /> {t('drawing.brush')}</button>
                <button onClick={() => { setTool('pencil'); music.sfx('pop') }} className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'pencil' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}><Pencil className="h-3.5 w-3.5" /> {t('drawing.pencil')}</button>
                <button onClick={() => { setTool('neon'); music.sfx('pop') }} className={`rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'neon' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}>✨ {t('drawing.brushNeon')}</button>
                <button onClick={() => { setTool('sparkle'); music.sfx('pop') }} className={`rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'sparkle' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}>💫 {t('drawing.brushSparkle')}</button>
                <button onClick={() => { setTool('rainbow'); music.sfx('pop') }} className={`rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'rainbow' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}>🌈 {t('drawing.brushRainbow')}</button>
                <button onClick={() => { setTool('spray'); music.sfx('pop') }} className={`rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'spray' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}>🎨 {t('drawing.brushSpray')}</button>
                <button onClick={() => { setTool('fill'); music.sfx('pop') }} className={`rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'fill' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}>🪣 {t('drawing.fill')}</button>
                <button onClick={() => { setTool('eraser'); music.sfx('pop') }} className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${tool === 'eraser' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600'}`}><Eraser className="h-3.5 w-3.5" /> {t('drawing.eraser')}</button>
              </div>
              {/* palette */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {PALETTE.map((c) => (
                  <button key={c} onClick={() => { setColor(c); music.sfx('pop') }} className={`h-7 w-7 rounded-full border-2 shadow transition-transform hover:scale-110 sm:h-8 sm:w-8 ${color === c && tool !== 'eraser' ? 'border-gray-800 scale-110 ring-2 ring-gray-400' : 'border-white'}`} style={{ backgroundColor: c }} aria-label={c} />
                ))}
              </div>
              {/* sizes */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-xs font-bold text-gray-600">{t('drawing.size')}:</span>
                {SIZES.map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${size === s ? 'border-rose-500 bg-rose-100' : 'border-gray-300 bg-white'}`} aria-label={`size ${s}`}>
                    <span className="block rounded-full bg-gray-700" style={{ width: Math.max(4, s * 0.45), height: Math.max(4, s * 0.45) }} />
                  </button>
                ))}
                <button onClick={clearCanvas} className="ml-1 inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-300"><RotateCcw className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>

          {/* side panel: reference (color mode) */}
          {mode === 'color' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-[200px] rounded-2xl bg-white/70 p-3 shadow-md backdrop-blur">
                <div className="text-center text-xs font-black text-rose-700 sm:text-sm">{picture.emoji} {t(`draw.${picture.name}`)}</div>
                <div className="text-center text-[10px] font-semibold text-gray-500 sm:text-xs">{t('drawing.sample')}</div>
                <div className="relative mt-2 w-full overflow-hidden rounded-xl border-2 border-rose-100" style={{ aspectRatio: '1 / 1' }}>
                  <img src={`/drawing/${idx}.png`} alt={picture.name} className="h-full w-full object-cover" />
                  {imgError && <div className="absolute inset-0 flex items-center justify-center bg-rose-50 text-xs font-bold text-rose-400">...</div>}
                </div>
              </div>
              {done ? (
                <Button onClick={nextPicture} className="w-full max-w-[200px] rounded-full bg-gradient-to-b from-emerald-400 to-green-600 text-sm font-black text-white shadow-lg hover:scale-105 sm:text-base"><Sparkles className="h-5 w-5" /> {t('drawing.nextPicture')}</Button>
              ) : (
                <div className="w-full max-w-[200px] rounded-2xl bg-white/60 p-3 text-center text-[11px] font-semibold text-gray-600 sm:text-xs">{t('drawing.tipColor')}</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-[200px] rounded-2xl bg-white/70 p-3 text-center shadow-md backdrop-blur">
                <div className="text-3xl">🖌️</div>
                <div className="mt-1 text-sm font-black text-fuchsia-700">{t('drawing.modeFree')}</div>
                <div className="mt-1 text-[11px] font-semibold text-gray-600 sm:text-xs">
                  {t('drawing.brush')} · {t('drawing.pencil')} · {t('drawing.eraser')}
                </div>
              </div>
              <Button onClick={() => setMode('choose')} variant="outline" className="w-full max-w-[200px] rounded-full">{t('common.menu')}</Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showMedal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.6, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-400 to-pink-600 p-6 text-center text-white shadow-2xl sm:p-8">
              <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-7xl">🏅</motion.div>
              <h2 className="mt-3 text-2xl font-black drop-shadow sm:text-3xl">{t('common.medalEarned')}</h2>
              <p className="mt-2 font-bold">20/20 🎨</p>
              <div className="mt-6">
                <Button onClick={() => setScreen('menu')} className="h-12 rounded-full bg-white text-base font-black text-rose-600 shadow-lg hover:bg-white/90 sm:text-lg">{t('common.menu')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
