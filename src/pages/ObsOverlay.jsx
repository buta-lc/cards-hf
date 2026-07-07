import { useEffect } from 'react'
import Card from '../components/Card'
import { usePublicAttributions } from '../hooks/usePublicAttributions'
import { ACTIVE_SEASON } from '../lib/constants'

export default function ObsOverlay() {
  const { items, error } = usePublicAttributions(ACTIVE_SEASON, {
    fallbackRefreshMs: 500,
  })

  useEffect(() => {
    document.body.classList.add('obs-mode')
    return () => {
      document.body.classList.remove('obs-mode')
    }
  }, [])

  return (
    <main className="obs-shell" aria-label="OBS overlay">
      {error ? <p className="error-text">Erreur overlay: {error}</p> : null}
      <section className="obs-card-grid">
        {items.map((item) => (
          <Card key={item.id} attribution={item} className="obs-card" />
        ))}
      </section>
    </main>
  )
}
