'use client'

import { useGameStore } from '@/lib/gameStore'
import { SplashScreen } from '@/components/SplashScreen'
import { MainMenu } from '@/components/MainMenu'
import { MemoryGame } from '@/components/games/MemoryGame'
import { DrawingGame } from '@/components/games/DrawingGame'
import { PlatformerGame } from '@/components/games/PlatformerGame'
import { PuzzleGame } from '@/components/games/PuzzleGame'
import { SnakeGame } from '@/components/games/SnakeGame'
import { MusicGame } from '@/components/games/MusicGame'
import { WhackGame } from '@/components/games/WhackGame'
import { OddOneOutGame } from '@/components/games/OddOneOutGame'
import { SpotDiffGame } from '@/components/games/SpotDiffGame'
import { RhythmGame } from '@/components/games/RhythmGame'
import { SkyscraperGame } from '@/components/games/SkyscraperGame'
import { SafecrackerGame } from '@/components/games/SafecrackerGame'
import { PingPongGame } from '@/components/games/PingPongGame'
import { CandyRaceGame } from '@/components/games/CandyRaceGame'
import { DuelGame } from '@/components/games/DuelGame'
import { TapBattleGame } from '@/components/games/TapBattleGame'
import { Shop } from '@/components/Shop'
import { VictoryScreen } from '@/components/VictoryScreen'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AudioSync } from '@/components/AudioSync'
import { RotateButton } from '@/components/RotateButton'

export default function Home() {
  const screen = useGameStore((s) => s.screen)

  return (
    <main className="min-h-[100dvh] w-full">
      <AudioSync />
      <RotateButton />
      <ThemeProvider>
        {screen === 'splash' && <SplashScreen />}
        {screen === 'menu' && <MainMenu />}
        {screen === 'memory' && <MemoryGame />}
        {screen === 'drawing' && <DrawingGame />}
        {screen === 'platformer' && <PlatformerGame />}
        {screen === 'puzzle' && <PuzzleGame />}
        {screen === 'snake' && <SnakeGame />}
        {screen === 'music' && <MusicGame />}
        {screen === 'whack' && <WhackGame />}
        {screen === 'oddoneout' && <OddOneOutGame />}
        {screen === 'spotdiff' && <SpotDiffGame />}
        {screen === 'rhythm' && <RhythmGame />}
        {screen === 'skyscraper' && <SkyscraperGame />}
        {screen === 'safecracker' && <SafecrackerGame />}
        {screen === 'pingpong' && <PingPongGame />}
        {screen === 'candyrace' && <CandyRaceGame />}
        {screen === 'duel' && <DuelGame />}
        {screen === 'tapbattle' && <TapBattleGame />}
        {screen === 'shop' && <Shop />}
        {screen === 'victory' && <VictoryScreen />}
      </ThemeProvider>
    </main>
  )
}
