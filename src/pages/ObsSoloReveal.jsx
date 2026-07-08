import { useCallback, useEffect, useMemo, useRef } from 'react'
import Card from '../components/Card'
import { usePublicAttributions } from '../hooks/usePublicAttributions'
import { useSoloRevealSequence } from '../hooks/useSoloRevealSequence'
import { sortAttributions } from '../lib/attributionSort'
import { ACTIVE_SEASON } from '../lib/constants'

export default function ObsSoloReveal() {
  const revealAudioRef = useRef(null)

  const { items, error } = usePublicAttributions(ACTIVE_SEASON, {
    fallbackRefreshMs: 400,
  })

  const sortedItems = useMemo(() => sortAttributions(items, 'default', 'asc'), [items])

  const onFlipStart = useCallback(() => {
    if (!revealAudioRef.current) {
      return
    }

    revealAudioRef.current.currentTime = 0
    revealAudioRef.current.play().catch(() => {})
  }, [])

  const { activeItem, phase, revealSignal, isActive } = useSoloRevealSequence(sortedItems, {
    backMs: 3000,
    flipMs: 1700,
    frontMs: 6200,
    outroMs: 700,
    onFlipStart,
  })

  useEffect(() => {
    const revealSoundUrl = import.meta.env.VITE_REVEAL_SOUND_URL || ''
    if (!revealSoundUrl) {
      revealAudioRef.current = null
      return
    }

    const audio = new Audio(revealSoundUrl)
    audio.preload = 'auto'
    revealAudioRef.current = audio

    return () => {
      audio.pause()
      revealAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    document.body.classList.add('obs-mode', 'obs-solo-mode')
    return () => {
      document.body.classList.remove('obs-mode', 'obs-solo-mode')
    }
  }, [])

  return (
    <main className="obs-solo-shell" aria-label="OBS solo reveal overlay">
      {error ? <p className="error-text">Erreur overlay: {error}</p> : null}

      {isActive && activeItem ? (
        <section className={`solo-stage phase-${phase}`}>
          {phase === 'intro-back' ? (
            <Card
              key={`solo-back-${activeItem.id}-${revealSignal}`}
              attribution={activeItem}
              className="solo-reveal-card"
              backOnly
            />
          ) : (
            <Card
              key={`solo-front-${activeItem.id}-${revealSignal}`}
              attribution={activeItem}
              className="solo-reveal-card"
              revealSignal={revealSignal}
            />
          )}
        </section>
      ) : null}
    </main>
  )
}
