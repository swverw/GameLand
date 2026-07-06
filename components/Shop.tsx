'use client'

import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/gameStore'
import { Button } from '@/components/ui/button'
import { TopControls } from '@/components/TopControls'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { music } from '@/lib/audio'
import { useT } from '@/lib/i18n'

interface Skin {
  id: string
  name: { ru: string; en: string }
  emoji: string
  price: number
  // a visual descriptor for how the skin modifies the runner character
  hat: string // emoji hat rendered on top
  color: string // tint
}

const SKINS: Skin[] = [
  { id: 'crown', name: { ru: 'Корона', en: 'Crown' }, emoji: '👑', price: 30, hat: '👑', color: '#fbbf24' },
  { id: 'party', name: { ru: 'Колпак', en: 'Party Hat' }, emoji: '🎉', price: 20, hat: '🎩', color: '#a855f7' },
  { id: 'wizard', name: { ru: 'Шляпа Волшебника', en: 'Wizard Hat' }, emoji: '🧙', price: 40, hat: '🧙', color: '#6366f1' },
  { id: 'cowboy', name: { ru: 'Ковбойская Шляпа', en: 'Cowboy Hat' }, emoji: '🤠', price: 25, hat: '🤠', color: '#92400e' },
  { id: 'helmet', name: { ru: 'Космошлем', en: 'Space Helmet' }, emoji: '👨‍🚀', price: 50, hat: '🚀', color: '#06b6d4' },
  { id: 'pirate', name: { ru: 'Пиратская Бандана', en: 'Pirate Bandana' }, emoji: '🏴‍☠️', price: 35, hat: '🏴‍☠️', color: '#1e293b' },
  { id: 'rainbow', name: { ru: 'Радужный', en: 'Rainbow' }, emoji: '🌈', price: 80, hat: '🌈', color: '#ec4899' },
  { id: 'ninja', name: { ru: 'Ниндзя', en: 'Ninja' }, emoji: '🥷', price: 60, hat: '🥷', color: '#1f2937' },
  { id: 'graduate', name: { ru: 'Выпускник', en: 'Graduate' }, emoji: '🎓', price: 45, hat: '🎓', color: '#3b82f6' },
  { id: 'santa', name: { ru: 'Санта', en: 'Santa' }, emoji: '🎅', price: 55, hat: '🎅', color: '#dc2626' },
]

export function Shop() {
  const t = useT()
  const setScreen = useGameStore((s) => s.setScreen)
  const coins = useGameStore((s) => s.coins)
  const ownedSkins = useGameStore((s) => s.ownedSkins)
  const equippedSkin = useGameStore((s) => s.equippedSkin)
  const buySkin = useGameStore((s) => s.buySkin)
  const equipSkin = useGameStore((s) => s.equipSkin)
  const lang = useGameStore((s) => s.lang)

  const handleBuy = (skin: Skin) => {
    if (buySkin(skin.id, skin.price)) {
      music.sfx('star')
    } else {
      music.sfx('hurt')
    }
  }
  const handleEquip = (skin: Skin) => {
    equipSkin(equippedSkin === skin.id ? null : skin.id)
    music.sfx('pop')
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100">
      <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-orange-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-rose-200/50 blur-3xl" />

      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Button variant="outline" size="sm" onClick={() => setScreen('menu')} className="rounded-full bg-white/90"><ArrowLeft className="h-4 w-4" /> {t('common.menu')}</Button>
      </div>
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-300 px-3 py-1.5 text-sm font-black text-yellow-900 shadow-md">
          🪙 {coins}
        </span>
        <TopControls />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-3 py-14 sm:px-6">
        <div className="text-center">
          <div className="text-6xl">🛒</div>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black text-orange-700">{t('shop.title')}</h1>
          <p className="mt-1 text-sm font-bold text-orange-600 sm:text-base">
            🪙 {coins} {t('shop.coins')} · {t('shop.earnMore')}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {SKINS.map((skin, i) => {
            const owned = ownedSkins.includes(skin.id)
            const equipped = equippedSkin === skin.id
            const canAfford = coins >= skin.price
            return (
              <motion.div
                key={skin.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 shadow-lg transition-all ${equipped ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300' : owned ? 'border-amber-300 bg-white' : 'border-white bg-white/80'}`}
              >
                {equipped && <span className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow"><Check className="h-4 w-4" /></span>}
                <div className="text-5xl drop-shadow-lg">{skin.emoji}</div>
                <span className="text-xs font-black text-gray-700 text-center leading-tight">{skin.name[lang]}</span>
                {owned ? (
                  <button
                    onClick={() => handleEquip(skin)}
                    className={`w-full rounded-full px-3 py-1.5 text-xs font-black shadow transition ${equipped ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white hover:bg-amber-500'}`}
                  >
                    {equipped ? t('shop.equipped') : t('shop.equip')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(skin)}
                    disabled={!canAfford}
                    className={`w-full rounded-full px-3 py-1.5 text-xs font-black shadow transition ${canAfford ? 'bg-gradient-to-b from-orange-400 to-orange-600 text-white hover:scale-105' : 'bg-gray-200 text-gray-400'}`}
                  >
                    {canAfford ? `🪙 ${skin.price}` : <><Lock className="mr-1 inline h-3 w-3" />{skin.price}</>}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>

        <p className="mt-6 text-center text-xs font-semibold text-gray-500">
          💡 {t('shop.earnMore')} 50 🪙 за медаль, 10 🪙 за уровень!
        </p>
      </div>
    </div>
  )
}
