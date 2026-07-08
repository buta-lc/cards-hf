import { useCallback, useEffect, useMemo, useRef } from 'react'
import Card from '../components/Card'
import { useRevealFocus } from '../hooks/useRevealFocus'
import { sortAttributions } from '../lib/attributionSort'
import { usePublicAttributions } from '../hooks/usePublicAttributions'
import { ACTIVE_SEASON } from '../lib/constants'

export default function ObsOverlay() {
  const { items, error } = usePublicAttributions(ACTIVE_SEASON, {
    fallbackRefreshMs: 500,
  })
  const revealAudioRef = useRef(null)

  const sortedItems = useMemo(() => sortAttributions(items, 'default', 'asc'), [items])

  const onReveal = useCallback(() => {
    if (!revealAudioRef.current) {
      return
    }

    revealAudioRef.current.currentTime = 0
    revealAudioRef.current.play().catch(() => {})
  }, [])

  const { focusedReveal, revealSignal, isFocusMode, focusPhase } = useRevealFocus(sortedItems, {
    displayMs: 5000,
    hideMs: 420,
    onReveal,
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
    document.body.classList.add('obs-mode')
    return () => {
      document.body.classList.remove('obs-mode')
    }
  }, [])

  return (
    <main className="obs-shell" aria-label="OBS overlay">
      {error ? <p className="error-text">Erreur overlay: {error}</p> : null}

      <section className={`board-stage ${isFocusMode ? 'is-focus-mode' : ''}`}>
        <section className={`obs-card-grid ${isFocusMode ? 'is-hidden-for-reveal' : ''}`}>
          {sortedItems.map((item) => (
            <Card key={item.id} attribution={item} className="obs-card" />
          ))}
        </section>

        {focusedReveal ? (
          <section
            className={`reveal-focus-stage ${focusPhase === 'hide' ? 'is-leaving' : ''}`}
            aria-label="Reveal en direct"
          >
            <Card
              key={`${focusedReveal.id}-${revealSignal}`}
              attribution={focusedReveal}
              className="focused-reveal-card"
              revealSignal={revealSignal}
            />
          </section>
        ) : null}
      </section>
    </main>
  )
}
