'use client'

import { useGameStore } from '@/lib/gameStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const medals = useGameStore((s) => s.medals)
  const allMedals = Object.values(medals).every(Boolean)

  return (
    <>
      {children}
      {allMedals && <div className="rainbow-frame" aria-hidden />}
    </>
  )
}
