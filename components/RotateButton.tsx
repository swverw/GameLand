'use client'

import { useState, useEffect } from 'react'
import { Smartphone, RotateCw } from 'lucide-react'

// Floating button to toggle screen orientation on mobile
export function RotateButton() {
  const [show, setShow] = useState(false)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    // only show on touch devices
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setShow(isTouch)
    const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight)
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {}
  }

  if (!show) return null

  return (
    <button
      onClick={toggle}
      aria-label="Rotate screen"
      className="fixed bottom-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/60 bg-white/80 text-gray-600 shadow-lg backdrop-blur hover:bg-white sm:hidden"
    >
      <RotateCw className="h-4 w-4" />
    </button>
  )
}
