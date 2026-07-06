'use client'

// Local leaderboard: top entries per game, stored in localStorage.
// For time-based games (puzzle, dots, runner), lower time is better.
// For score-based games (whack, snake), higher score is better.

export type GameKey = 'puzzle' | 'dots' | 'runner' | 'whack' | 'snake' | 'memory' | 'music'

export interface ScoreEntry {
  name: string
  value: number // seconds (lower better) or score (higher better)
  date: number
}

const KEY = 'kids-game-leaderboard'
const MAX = 5

type Board = Record<string, ScoreEntry[]>

function read(): Board {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function write(b: Board) {
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch {}
}

export function getScores(game: string): ScoreEntry[] {
  return read()[game] || []
}

export function addScore(game: string, name: string, value: number, lowerBetter = true): ScoreEntry[] {
  const b = read()
  const list = b[game] || []
  list.push({ name: name.slice(0, 12) || 'Игрок', value, date: Date.now() })
  list.sort((a, c) => (lowerBetter ? a.value - c.value : c.value - a.value))
  const top = list.slice(0, MAX)
  b[game] = top
  write(b)
  return top
}

export function formatValue(game: string, value: number): string {
  if (game === 'puzzle' || game === 'dots' || game === 'runner') {
    const m = Math.floor(value / 60)
    const s = value % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  return `${value}`
}
