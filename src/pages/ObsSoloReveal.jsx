import { useCallback, useEffect, useMemo, useRef } from 'react'
import Card from '../components/Card'
import { usePublicAttributions } from '../hooks/usePublicAttributions'
import { useSoloRevealSequence } from '../hooks/useSoloRevealSequence'
import { sortAttributions } from '../lib/attributionSort'
import { getRevealSoundUrl } from '../lib/backStyle'
import { ACTIVE_SEASON } from '../lib/constants'

export default function ObsSoloReveal() {
  const revealAudioRef = useRef(null)

  const { items, error } = usePublicAttributions(ACTIVE_SEASON, {
    fallbackRefreshMs: 400,
  })

  const sortedItems = useMemo(() => sortAttributions(items, 'default', 'asc'), [items])
  const fallbackSoundUrl = import.meta.env.VITE_REVEAL_SOUND_URL || ''

  const onFlipStart = useCallback(
    (item) => {
      const soundUrl = getRevealSoundUrl(item, fallbackSoundUrl)
      if (!soundUrl) {
        return
      }

      if (!revealAudioRef.current) {
        const audio = new Audio()
        audio.preload = 'auto'
        revealAudioRef.current = audio
      }

      const audio = revealAudioRef.current
      if (!audio) {
        return
      }

      if (audio.src !== soundUrl) {
        audio.src = soundUrl
      }

      audio.currentTime = 0
      audio.play().catch(() => {})
    },
    [fallbackSoundUrl],
  )

  const { activeItem, phase, revealSignal, isActive } = useSoloRevealSequence(sortedItems, {
    backMs: 3000,
    flipMs: 1700,
    frontMs: 6200,
    outroMs: 700,
    onFlipStart,
  })

  useEffect(() => {
    return () => {
      if (!revealAudioRef.current) {
        return
      }

      revealAudioRef.current.pause()
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
