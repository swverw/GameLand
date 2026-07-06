'use client'

import { useGameStore } from '@/lib/gameStore'
import { music } from '@/lib/audio'
import { Volume2, VolumeX, Music, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LANGS } from '@/lib/i18n'

export function TopControls() {
  const musicOn = useGameStore((s) => s.musicOn)
  const setMusic = useGameStore((s) => s.setMusic)
  const sfxOn = useGameStore((s) => s.sfxOn)
  const setSfx = useGameStore((s) => s.setSfx)
  const lang = useGameStore((s) => s.lang)
  const setLang = useGameStore((s) => s.setLang)

  const toggleMusic = () => { music.resume(); setMusic(!musicOn) }
  const toggleSfx = () => { music.resume(); setSfx(!sfxOn) }
  const toggleLang = () => setLang(lang === 'ru' ? 'en' : 'ru')

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <button
        onClick={toggleLang}
        aria-label="Switch language"
        className="flex h-9 items-center gap-1 rounded-full border-2 border-white/60 bg-white/80 px-2.5 text-xs font-black text-gray-700 shadow-lg backdrop-blur hover:bg-white sm:h-10 sm:px-3 sm:text-sm"
      >
        <span>{LANGS.find((l) => l.id === lang)?.flag}</span>
        <span>{LANGS.find((l) => l.id === lang)?.label}</span>
      </button>
      <Button variant="outline" size="icon" aria-label="Music" onClick={toggleMusic} className="h-9 w-9 rounded-full border-2 border-white/60 bg-white/80 backdrop-blur shadow-lg hover:bg-white sm:h-10 sm:w-10">
        {musicOn ? <Music className="h-4 w-4 text-orange-500" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
      </Button>
      <Button variant="outline" size="icon" aria-label="Sound effects" onClick={toggleSfx} className="h-9 w-9 rounded-full border-2 border-white/60 bg-white/80 backdrop-blur shadow-lg hover:bg-white sm:h-10 sm:w-10">
        {sfxOn ? <Sparkles className="h-4 w-4 text-pink-500" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
      </Button>
    </div>
  )
}
