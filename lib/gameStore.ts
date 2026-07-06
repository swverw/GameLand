'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Screen =
  | 'splash' | 'menu' | 'memory' | 'drawing' | 'platformer' | 'puzzle'
  | 'snake' | 'music' | 'whack' | 'oddoneout' | 'spotdiff' | 'rhythm'
  | 'skyscraper' | 'safecracker' | 'pingpong' | 'candyrace' | 'duel' | 'tapbattle' | 'shop' | 'victory'

export type GameId = 'memory' | 'drawing' | 'platformer' | 'puzzle' | 'snake' | 'music' | 'whack' | 'oddoneout' | 'spotdiff' | 'rhythm' | 'skyscraper' | 'safecracker' | 'pingpong' | 'candyrace' | 'duel' | 'tapbattle'

export interface MedalState {
  memory: boolean
  drawing: boolean
  platformer: boolean
  puzzle: boolean
  snake: boolean
  music: boolean
  whack: boolean
  oddoneout: boolean
  spotdiff: boolean
  rhythm: boolean
  skyscraper: boolean
  safecracker: boolean
  pingpong: boolean
  candyrace: boolean
  duel: boolean
  tapbattle: boolean
}

export type RunnerCharacter = 'hero' | 'robot' | 'piastri' | 'puk' | 'knight'
export type Lang = 'ru' | 'en'
export type Theme = 'light' | 'dark'

export interface GameState {
  screen: Screen
  medals: MedalState
  theme: Theme
  customMelody: number[] // composer melody saved as bg (freq indices)

  memoryWinsVsCpu: number

  drawingCompleted: number[]
  drawingCurrentIndex: number

  platformerCompleted: boolean[]
  runnerCharacter: RunnerCharacter

  puzzleCompleted: boolean[] // 3 levels of current set
  puzzleSet: number // 0..4 (5 sets)

  snakeCompleted: boolean[]

  musicCompleted: boolean[]

  whackCompleted: boolean[]

  oddoneoutCompleted: boolean[]
  oddoneoutSet: number

  spotdiffCompleted: boolean[]
  spotdiffSet: number

  rhythmCompleted: boolean[]
  rhythmSet: number

  // --- Skyscraper ---
  skyscraperCompleted: boolean[]

  // --- Safecracker ---
  safecrackerCompleted: boolean[]

  // --- Coins & Shop ---
  coins: number
  ownedSkins: string[]
  equippedSkin: string | null

  musicOn: boolean
  sfxOn: boolean
  lang: Lang
  savedMelodies: (number[] | null)[] // 5 slots

  setScreen: (s: Screen) => void
  setMusic: (on: boolean) => void
  setSfx: (on: boolean) => void
  setRunnerCharacter: (c: RunnerCharacter) => void
  setLang: (l: Lang) => void
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  setCustomMelody: (m: number[]) => void
  saveMelody: (slot: number, melody: number[]) => void
  deleteMelody: (slot: number) => void

  awardMedal: (g: GameId) => void
  addMemoryWin: () => void
  completeDrawing: (index: number) => void
  setDrawingIndex: (i: number) => void
  completePlatformerLevel: (idx: number) => void
  completePuzzleLevel: (idx: number) => void
  resetPuzzleSet: () => void
  completeSnakeLevel: (idx: number) => void
  completeMusicLevel: (idx: number) => void
  completeWhackLevel: (idx: number) => void
  completeOddLevel: (idx: number) => void
  resetOddSet: () => void
  completeSpotLevel: (idx: number) => void
  resetSpotSet: () => void
  completeRhythmLevel: (idx: number) => void
  resetRhythmSet: () => void
  completeSkyscraperLevel: (idx: number) => void
  completeSafecrackerLevel: (idx: number) => void
  addCoins: (n: number) => void
  spendCoins: (n: number) => boolean
  buySkin: (skinId: string, price: number) => boolean
  equipSkin: (skinId: string | null) => void

  resetAll: () => void
  resetGame: (g: GameId) => void
}

const allMedals = (m: MedalState) =>
  m.memory && m.drawing && m.platformer && m.puzzle && m.snake && m.music && m.whack && m.oddoneout && m.spotdiff && m.rhythm && m.skyscraper && m.safecracker && m.pingpong && m.candyrace && m.duel && m.tapbattle

const EMPTY_3 = [false, false, false]

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'splash',
      medals: { memory: false, drawing: false, platformer: false, puzzle: false, snake: false, music: false, whack: false, oddoneout: false, spotdiff: false, rhythm: false, skyscraper: false, safecracker: false, pingpong: false, candyrace: false, duel: false, tapbattle: false },
      theme: 'light',
      customMelody: [],

      memoryWinsVsCpu: 0,
      drawingCompleted: [],
      drawingCurrentIndex: 0,
      platformerCompleted: [...EMPTY_3],
      runnerCharacter: 'hero',
      puzzleCompleted: [...EMPTY_3],
      puzzleSet: 0,
      snakeCompleted: [...EMPTY_3],
      musicCompleted: [...EMPTY_3],
      whackCompleted: [...EMPTY_3],
      oddoneoutCompleted: [...EMPTY_3],
      oddoneoutSet: 0,
      spotdiffCompleted: [...EMPTY_3],
      spotdiffSet: 0,
      rhythmCompleted: [...EMPTY_3],
      rhythmSet: 0,
      skyscraperCompleted: [...EMPTY_3],
      safecrackerCompleted: [...EMPTY_3],
      coins: 0,
      ownedSkins: [],
      equippedSkin: null,
      musicOn: true,
      sfxOn: true,
      lang: 'ru',
      savedMelodies: [null, null, null, null, null],

      setScreen: (s) => set({ screen: s }),
      setMusic: (on) => set({ musicOn: on }),
      setSfx: (on) => set({ sfxOn: on }),
      setRunnerCharacter: (c) => set({ runnerCharacter: c }),
      setLang: (l) => set({ lang: l }),
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((st) => ({ theme: st.theme === 'light' ? 'dark' : 'light' })),
      setCustomMelody: (m) => set({ customMelody: m }),
      saveMelody: (slot, melody) => set((st) => {
        const arr = [...st.savedMelodies]; arr[slot] = melody; return { savedMelodies: arr }
      }),
      deleteMelody: (slot) => set((st) => {
        const arr = [...st.savedMelodies]; arr[slot] = null; return { savedMelodies: arr }
      }),

      awardMedal: (g) =>
        set((st) => {
          if (st.medals[g]) return {} // already earned
          const medals = { ...st.medals, [g]: true }
          const coins = st.coins + 50 // reward 50 coins per medal
          if (allMedals(medals)) return { medals, coins, screen: 'victory' }
          return { medals, coins }
        }),

      addMemoryWin: () =>
        set((st) => {
          const wins = st.memoryWinsVsCpu + 1
          if (wins >= 3 && !st.medals.memory) {
            const medals = { ...st.medals, memory: true }
            if (allMedals(medals)) return { memoryWinsVsCpu: wins, medals, screen: 'victory' }
            return { memoryWinsVsCpu: wins, medals }
          }
          return { memoryWinsVsCpu: wins }
        }),

      completeDrawing: (index) =>
        set((st) => {
          const completed = st.drawingCompleted.includes(index) ? st.drawingCompleted : [...st.drawingCompleted, index]
          let medals = st.medals
          if (completed.length >= 20 && !medals.drawing) {
            medals = { ...medals, drawing: true }
            if (allMedals(medals)) return { drawingCompleted: completed, medals, screen: 'victory' }
            return { drawingCompleted: completed, medals }
          }
          return { drawingCompleted: completed }
        }),

      setDrawingIndex: (i) => set({ drawingCurrentIndex: i }),

      completePlatformerLevel: (idx) =>
        set((st) => {
          const arr = [...st.platformerCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean) && !medals.platformer) {
            medals = { ...medals, platformer: true }
            if (allMedals(medals)) return { platformerCompleted: arr, medals, screen: 'victory' }
            return { platformerCompleted: arr, medals }
          }
          return { platformerCompleted: arr }
        }),

      completePuzzleLevel: (idx) =>
        set((st) => {
          const arr = [...st.puzzleCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean)) {
            // only award medal on set 0 completion (first full clear) — but allow re-medal if not held
            if (!medals.puzzle) {
              medals = { ...medals, puzzle: true }
              if (allMedals(medals)) return { puzzleCompleted: arr, medals, screen: 'victory' }
            }
            return { puzzleCompleted: arr, medals }
          }
          return { puzzleCompleted: arr }
        }),
      resetPuzzleSet: () =>
        set((st) => ({ puzzleCompleted: [...EMPTY_3], puzzleSet: Math.min(4, st.puzzleSet + 1) })),

      completeSnakeLevel: (idx) =>
        set((st) => {
          const arr = [...st.snakeCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean) && !medals.snake) {
            medals = { ...medals, snake: true }
            if (allMedals(medals)) return { snakeCompleted: arr, medals, screen: 'victory' }
            return { snakeCompleted: arr, medals }
          }
          return { snakeCompleted: arr }
        }),

      completeMusicLevel: (idx) =>
        set((st) => {
          const arr = [...st.musicCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean) && !medals.music) {
            medals = { ...medals, music: true }
            if (allMedals(medals)) return { musicCompleted: arr, medals, screen: 'victory' }
            return { musicCompleted: arr, medals }
          }
          return { musicCompleted: arr }
        }),

      completeWhackLevel: (idx) =>
        set((st) => {
          const arr = [...st.whackCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean) && !medals.whack) {
            medals = { ...medals, whack: true }
            if (allMedals(medals)) return { whackCompleted: arr, medals, screen: 'victory' }
            return { whackCompleted: arr, medals }
          }
          return { whackCompleted: arr }
        }),

      completeOddLevel: (idx) =>
        set((st) => {
          const arr = [...st.oddoneoutCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean)) {
            if (!medals.oddoneout) {
              medals = { ...medals, oddoneout: true }
              if (allMedals(medals)) return { oddoneoutCompleted: arr, medals, screen: 'victory' }
            }
            return { oddoneoutCompleted: arr, medals }
          }
          return { oddoneoutCompleted: arr }
        }),
      resetOddSet: () => set((st) => ({ oddoneoutCompleted: [...EMPTY_3], oddoneoutSet: Math.min(4, st.oddoneoutSet + 1) })),

      completeSpotLevel: (idx) =>
        set((st) => {
          const arr = [...st.spotdiffCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean)) {
            if (!medals.spotdiff) {
              medals = { ...medals, spotdiff: true }
              if (allMedals(medals)) return { spotdiffCompleted: arr, medals, screen: 'victory' }
            }
            return { spotdiffCompleted: arr, medals }
          }
          return { spotdiffCompleted: arr }
        }),
      resetSpotSet: () => set((st) => ({ spotdiffCompleted: [...EMPTY_3], spotdiffSet: Math.min(4, st.spotdiffSet + 1) })),

      completeRhythmLevel: (idx) =>
        set((st) => {
          const arr = [...st.rhythmCompleted]; arr[idx] = true
          let medals = st.medals
          if (arr.every(Boolean)) {
            if (!medals.rhythm) {
              medals = { ...medals, rhythm: true }
              if (allMedals(medals)) return { rhythmCompleted: arr, medals, screen: 'victory' }
            }
            return { rhythmCompleted: arr, medals }
          }
          return { rhythmCompleted: arr }
        }),
      resetRhythmSet: () => set((st) => ({ rhythmCompleted: [...EMPTY_3], rhythmSet: Math.min(4, st.rhythmSet + 1) })),

      completeSkyscraperLevel: (idx) =>
        set((st) => {
          const arr = [...st.skyscraperCompleted]; arr[idx] = true
          let medals = st.medals; let coins = st.coins + 10
          if (arr.every(Boolean) && !medals.skyscraper) {
            medals = { ...medals, skyscraper: true }; coins += 50
            if (allMedals(medals)) return { skyscraperCompleted: arr, medals, coins, screen: 'victory' }
          }
          return { skyscraperCompleted: arr, medals, coins }
        }),

      completeSafecrackerLevel: (idx) =>
        set((st) => {
          const arr = [...st.safecrackerCompleted]; arr[idx] = true
          let medals = st.medals; let coins = st.coins + 10
          if (arr.every(Boolean) && !medals.safecracker) {
            medals = { ...medals, safecracker: true }; coins += 50
            if (allMedals(medals)) return { safecrackerCompleted: arr, medals, coins, screen: 'victory' }
          }
          return { safecrackerCompleted: arr, medals, coins }
        }),

      addCoins: (n) => set((st) => ({ coins: st.coins + n })),
      spendCoins: (n) => {
        const st = get()
        if (st.coins >= n) { set({ coins: st.coins - n }); return true }
        return false
      },
      buySkin: (skinId, price) => {
        const st = get()
        if (st.ownedSkins.includes(skinId)) return false
        if (st.coins < price) return false
        set({ coins: st.coins - price, ownedSkins: [...st.ownedSkins, skinId] })
        return true
      },
      equipSkin: (skinId) => set({ equippedSkin: skinId }),

      resetAll: () =>
        set({
          screen: 'menu',
          medals: { memory: false, drawing: false, platformer: false, puzzle: false, snake: false, music: false, whack: false, oddoneout: false, spotdiff: false, rhythm: false, skyscraper: false, safecracker: false, pingpong: false, candyrace: false, duel: false, tapbattle: false },
          memoryWinsVsCpu: 0,
          drawingCompleted: [], drawingCurrentIndex: 0,
          platformerCompleted: [...EMPTY_3],
          puzzleCompleted: [...EMPTY_3], puzzleSet: 0,
          snakeCompleted: [...EMPTY_3],
          musicCompleted: [...EMPTY_3],
          whackCompleted: [...EMPTY_3],
          oddoneoutCompleted: [...EMPTY_3], oddoneoutSet: 0,
          spotdiffCompleted: [...EMPTY_3], spotdiffSet: 0,
          rhythmCompleted: [...EMPTY_3], rhythmSet: 0,
          skyscraperCompleted: [...EMPTY_3],
          safecrackerCompleted: [...EMPTY_3],
          coins: 0, ownedSkins: [], equippedSkin: null,
        }),

      resetGame: (g) => {
        const st = get()
        if (g === 'memory') set({ memoryWinsVsCpu: 0, medals: { ...st.medals, memory: false } })
        if (g === 'drawing') set({ drawingCompleted: [], medals: { ...st.medals, drawing: false } })
        if (g === 'platformer') set({ platformerCompleted: [...EMPTY_3], medals: { ...st.medals, platformer: false } })
        if (g === 'puzzle') set({ puzzleCompleted: [...EMPTY_3], puzzleSet: 0, medals: { ...st.medals, puzzle: false } })
        if (g === 'snake') set({ snakeCompleted: [...EMPTY_3], medals: { ...st.medals, snake: false } })
        if (g === 'music') set({ musicCompleted: [...EMPTY_3], medals: { ...st.medals, music: false } })
        if (g === 'whack') set({ whackCompleted: [...EMPTY_3], medals: { ...st.medals, whack: false } })
        if (g === 'oddoneout') set({ oddoneoutCompleted: [...EMPTY_3], oddoneoutSet: 0, medals: { ...st.medals, oddoneout: false } })
        if (g === 'spotdiff') set({ spotdiffCompleted: [...EMPTY_3], spotdiffSet: 0, medals: { ...st.medals, spotdiff: false } })
        if (g === 'rhythm') set({ rhythmCompleted: [...EMPTY_3], rhythmSet: 0, medals: { ...st.medals, rhythm: false } })
        if (g === 'skyscraper') set({ skyscraperCompleted: [...EMPTY_3], medals: { ...st.medals, skyscraper: false } })
        if (g === 'safecracker') set({ safecrackerCompleted: [...EMPTY_3], medals: { ...st.medals, safecracker: false } })
      },
    }),
    {
      name: 'kids-game-progress',
      version: 7,
      skipHydration: true,
      partialize: (s) => ({
        medals: s.medals, theme: s.theme, customMelody: s.customMelody,
        memoryWinsVsCpu: s.memoryWinsVsCpu, drawingCompleted: s.drawingCompleted, drawingCurrentIndex: s.drawingCurrentIndex,
        platformerCompleted: s.platformerCompleted, runnerCharacter: s.runnerCharacter,
        puzzleCompleted: s.puzzleCompleted, puzzleSet: s.puzzleSet,
        snakeCompleted: s.snakeCompleted, musicCompleted: s.musicCompleted, whackCompleted: s.whackCompleted,
        oddoneoutCompleted: s.oddoneoutCompleted, oddoneoutSet: s.oddoneoutSet,
        spotdiffCompleted: s.spotdiffCompleted, spotdiffSet: s.spotdiffSet,
        rhythmCompleted: s.rhythmCompleted, rhythmSet: s.rhythmSet,
        skyscraperCompleted: s.skyscraperCompleted,
        safecrackerCompleted: s.safecrackerCompleted,
        coins: s.coins, ownedSkins: s.ownedSkins, equippedSkin: s.equippedSkin,
        musicOn: s.musicOn, sfxOn: s.sfxOn, lang: s.lang,
        savedMelodies: s.savedMelodies,
      }),
      migrate: (persisted: any, version: number) => {
        const m = { ...(persisted || {}) }
        if (version < 5) {
          delete m.dotsCompleted
        }
        if (version < 6) {
          m.oddoneoutCompleted = [false, false, false]; m.oddoneoutSet = 0
          m.spotdiffCompleted = [false, false, false]; m.spotdiffSet = 0
          m.rhythmCompleted = [false, false, false]; m.rhythmSet = 0
          m.puzzleSet = 0
          m.theme = m.theme || 'light'
          m.customMelody = m.customMelody || []
          if (m.medals) { m.medals.oddoneout = false; m.medals.spotdiff = false; m.medals.rhythm = false; delete m.medals.dots }
        }
        // v7: add skyscraper, safecracker, coins, skins
        m.skyscraperCompleted = m.skyscraperCompleted || [false, false, false]
        m.safecrackerCompleted = m.safecrackerCompleted || [false, false, false]
        m.coins = m.coins ?? 0
        m.ownedSkins = m.ownedSkins || []
        m.equippedSkin = m.equippedSkin ?? null
        if (m.medals) { m.medals.skyscraper = m.medals.skyscraper || false; m.medals.safecracker = m.medals.safecracker || false; m.medals.pingpong = m.medals.pingpong || false; m.medals.candyrace = m.medals.candyrace || false; m.medals.duel = m.medals.duel || false; m.medals.tapbattle = m.medals.tapbattle || false }
        return m
      },
    }
  )
)
