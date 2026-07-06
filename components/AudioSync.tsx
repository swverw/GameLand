'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/lib/gameStore'
import { music } from '@/lib/audio'

export function AudioSync() {
  const musicOn = useGameStore((s) => s.musicOn)
  const sfxOn = useGameStore((s) => s.sfxOn)
  const customMelody = useGameStore((s) => s.customMelody)

  // Manually rehydrate from localStorage on mount (skipHydration is true)
  useEffect(() => {
    useGameStore.persist.rehydrate()
  }, [])

  useEffect(() => { music.setMusicOn(musicOn) }, [musicOn])
  useEffect(() => { music.setSfxOn(sfxOn) }, [sfxOn])
  useEffect(() => { music.setMelody(customMelody.length ? customMelody : null) }, [customMelody])

  useEffect(() => {
    const resume = () => music.resume()
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    window.addEventListener('touchstart', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      window.removeEventListener('touchstart', resume)
    }
  }, [])

  return null
}
