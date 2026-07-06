'use client'

import type { GameState } from '@/lib/gameStore'
import { useGameStore } from '@/lib/gameStore'

export interface Achievement {
  id: string
  emoji: string
  check: (s: GameState) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_play', emoji: '🎮', check: (s) => Object.values(s.medals).some(Boolean) || s.memoryWinsVsCpu > 0 || s.drawingCompleted.length > 0 },
  { id: 'first_medal', emoji: '🥇', check: (s) => Object.values(s.medals).some(Boolean) },
  { id: 'all_medals', emoji: '🏆', check: (s) => Object.values(s.medals).every(Boolean) },
  { id: 'memory_win_cpu', emoji: '🧠', check: (s) => s.memoryWinsVsCpu >= 1 },
  { id: 'memory_master', emoji: '👑', check: (s) => s.memoryWinsVsCpu >= 3 },
  { id: 'memory_legend', emoji: '🧩', check: (s) => s.memoryWinsVsCpu >= 8 },
  { id: 'draw_5', emoji: '🎨', check: (s) => s.drawingCompleted.length >= 5 },
  { id: 'draw_20', emoji: '🖼️', check: (s) => s.drawingCompleted.length >= 20 },
  { id: 'puzzle_1', emoji: '🧩', check: (s) => s.puzzleCompleted.some(Boolean) },
  { id: 'puzzle_set1', emoji: '🏗️', check: (s) => s.puzzleSet >= 1 },
  { id: 'puzzle_allsets', emoji: '💎', check: (s) => s.puzzleSet >= 4 },
  { id: 'snake_1', emoji: '🐍', check: (s) => s.snakeCompleted.some(Boolean) },
  { id: 'snake_all', emoji: '🔥', check: (s) => s.snakeCompleted.every(Boolean) },
  { id: 'music_1', emoji: '🎵', check: (s) => s.musicCompleted.some(Boolean) },
  { id: 'music_all', emoji: '🎼', check: (s) => s.musicCompleted.every(Boolean) },
  { id: 'whack_1', emoji: '🔨', check: (s) => s.whackCompleted.some(Boolean) },
  { id: 'whack_all', emoji: '💥', check: (s) => s.whackCompleted.every(Boolean) },
  { id: 'runner_1', emoji: '🏃', check: (s) => s.platformerCompleted.some(Boolean) },
  { id: 'runner_all', emoji: '🏁', check: (s) => s.platformerCompleted.every(Boolean) },
  { id: 'odd_1', emoji: '🔍', check: (s) => s.oddoneoutCompleted.some(Boolean) },
  { id: 'odd_allsets', emoji: '🦉', check: (s) => s.oddoneoutSet >= 4 },
  { id: 'spot_1', emoji: '🔎', check: (s) => s.spotdiffCompleted.some(Boolean) },
  { id: 'spot_allsets', emoji: '🦅', check: (s) => s.spotdiffSet >= 4 },
  { id: 'rhy_1', emoji: '🎶', check: (s) => s.rhythmCompleted.some(Boolean) },
  { id: 'rhy_allsets', emoji: '🎹', check: (s) => s.rhythmSet >= 4 },
  { id: 'sky_1', emoji: '🏙️', check: (s) => s.skyscraperCompleted.some(Boolean) },
  { id: 'sky_all', emoji: '🏗️', check: (s) => s.skyscraperCompleted.every(Boolean) },
  { id: 'safe_1', emoji: '🔓', check: (s) => s.safecrackerCompleted.some(Boolean) },
  { id: 'safe_all', emoji: '💰', check: (s) => s.safecrackerCompleted.every(Boolean) },
  { id: 'rich', emoji: '🪙', check: (s) => s.coins >= 100 },
  { id: 'collector_skins', emoji: '👒', check: (s) => s.ownedSkins.length >= 3 },
  { id: 'half_medals', emoji: '🌟', check: (s) => Object.values(s.medals).filter(Boolean).length >= 6 },
  { id: 'explorer', emoji: '🧭', check: (s) => [s.memoryWinsVsCpu > 0, s.drawingCompleted.length > 0, s.puzzleCompleted.some(Boolean), s.snakeCompleted.some(Boolean), s.musicCompleted.some(Boolean), s.whackCompleted.some(Boolean), s.oddoneoutCompleted.some(Boolean), s.spotdiffCompleted.some(Boolean), s.rhythmCompleted.some(Boolean), s.platformerCompleted.some(Boolean)].filter(Boolean).length >= 8 },
  { id: 'collector', emoji: '🛄', check: (s) => Object.values(s.medals).filter(Boolean).length >= 8 },
  { id: 'custom_melody', emoji: '🎧', check: (s) => s.customMelody.length >= 4 },
  { id: 'night_owl', emoji: '🌙', check: (s) => s.theme === 'dark' },
  { id: 'legend', emoji: '👑', check: (s) => Object.values(s.medals).every(Boolean) && s.coins >= 200 && s.ownedSkins.length >= 5 },
]

export const ACHIEVEMENT_LABELS: Record<string, { ru: string; en: string }> = {
  first_play: { ru: 'Первый шаг — сыграй в игру', en: 'First step — play a game' },
  first_medal: { ru: 'Первая медаль', en: 'First medal' },
  all_medals: { ru: 'Все 10 медалей!', en: 'All 10 medals!' },
  memory_win_cpu: { ru: 'Победил компьютер', en: 'Beat the computer' },
  memory_master: { ru: 'Мастер памяти — 3 победы', en: 'Memory master — 3 wins' },
  memory_legend: { ru: 'Легенда памяти — 8 побед', en: 'Memory legend — 8 wins' },
  draw_5: { ru: 'Художник — 5 картинок', en: 'Artist — 5 pictures' },
  draw_20: { ru: 'Гений цвета — 20 картинок', en: 'Color genius — 20 pictures' },
  puzzle_1: { ru: 'Собрал первый пазл', en: 'Assembled first puzzle' },
  puzzle_set1: { ru: 'Сбросил пазлы — новый набор', en: 'Reset puzzles — new set' },
  puzzle_allsets: { ru: 'Все 5 наборов пазлов!', en: 'All 5 puzzle sets!' },
  snake_1: { ru: 'Выжил на змейке', en: 'Survived the snake' },
  snake_all: { ru: 'Все 3 уровня змейки', en: 'All 3 snake levels' },
  music_1: { ru: 'Повторил мелодию', en: 'Repeated a melody' },
  music_all: { ru: 'Все 3 уровня музыки', en: 'All 3 music levels' },
  whack_1: { ru: 'Прихлопнул крота', en: 'Whacked a mole' },
  whack_all: { ru: 'Все 3 уровня крота', en: 'All 3 whack levels' },
  runner_1: { ru: 'Пробежал локацию', en: 'Ran a level' },
  runner_all: { ru: 'Все 3 локации', en: 'All 3 locations' },
  odd_1: { ru: 'Нашёл лишнюю картинку', en: 'Found the odd one' },
  odd_allsets: { ru: 'Все 5 наборов «Лишней»!', en: 'All 5 Odd sets!' },
  spot_1: { ru: 'Нашёл отличие', en: 'Found a difference' },
  spot_allsets: { ru: 'Все 5 наборов «Отличий»!', en: 'All 5 Spot sets!' },
  rhy_1: { ru: 'Поймал ноту', en: 'Caught a note' },
  rhy_allsets: { ru: 'Все 5 наборов «Ритма»!', en: 'All 5 Rhythm sets!' },
  sky_1: { ru: 'Построил этаж', en: 'Built a floor' },
  sky_all: { ru: 'Все 3 уровня небоскрёба', en: 'All 3 skyscraper levels' },
  safe_1: { ru: 'Взломал точку', en: 'Cracked a dot' },
  safe_all: { ru: 'Все 3 уровня сейфа', en: 'All 3 safe levels' },
  rich: { ru: 'Богач — 100 монет', en: 'Rich — 100 coins' },
  collector_skins: { ru: 'Коллекционер скинов — 3 шт', en: 'Skin collector — 3 items' },
  half_medals: { ru: 'Половина медалей', en: 'Half the medals' },
  explorer: { ru: 'Исследователь — 8 игр', en: 'Explorer — 8 games' },
  collector: { ru: 'Коллекционер — 8 медалей', en: 'Collector — 8 medals' },
  custom_melody: { ru: 'Композитор — своя мелодия', en: 'Composer — custom melody' },
  night_owl: { ru: 'Сова — ночной режим', en: 'Night owl — night mode' },
  legend: { ru: '👑 ЛЕГЕНДА — все 12 медалей + 200 монет + 5 скинов', en: '👑 LEGEND — all 12 medals + 200 coins + 5 skins' },
}

export function useAchievementLabels() {
  const lang = useGameStore((s) => s.lang)
  return (id: string) => {
    const e = ACHIEVEMENT_LABELS[id]
    return e ? e[lang] : id
  }
}
