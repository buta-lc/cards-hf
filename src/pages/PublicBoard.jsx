import Card from '../components/Card'
import { usePublicAttributions } from '../hooks/usePublicAttributions'
import { ACTIVE_SEASON } from '../lib/constants'

export default function PublicBoard() {
  const { items, loading, error } = usePublicAttributions(ACTIVE_SEASON, {
    fallbackRefreshMs: 1500,
  })

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Tournoi en cours</p>
        <h1>Tableau des hauts-faits</h1>
        <p>Saison active: {ACTIVE_SEASON}</p>
      </header>

      {loading ? <p>Chargement des hauts-faits...</p> : null}
      {error ? <p className="error-text">Erreur: {error}</p> : null}

      <section className="card-grid">
        {items.map((item) => (
          <Card key={item.id} attribution={item} />
        ))}
      </section>
    </main>
  )
}
