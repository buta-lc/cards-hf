import { useCallback, useEffect, useMemo, useRef } from 'react'
import Card from '../components/Card'
import { useRevealFocus } from '../hooks/useRevealFocus'
import { sortAttributions } from '../lib/attributionSort'
import { getRevealSoundUrl } from '../lib/backStyle'
import { usePublicAttributions } from '../hooks/usePublicAttributions'
import { ACTIVE_SEASON } from '../lib/constants'

export default function ObsOverlay() {
  const { items, error } = usePublicAttributions(ACTIVE_SEASON, {
    fallbackRefreshMs: 500,
  })
  const revealAudioRef = useRef(null)

  const sortedItems = useMemo(() => sortAttributions(items, 'default', 'asc'), [items])
  const fallbackSoundUrl = import.meta.env.VITE_REVEAL_SOUND_URL || ''

  const onReveal = useCallback(
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

  const { focusedReveal, revealSignal, isFocusMode, focusPhase } = useRevealFocus(sortedItems, {
    displayMs: 5000,
    hideMs: 420,
    onReveal,
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
