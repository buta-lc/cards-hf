import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { useRevealFocus } from '../hooks/useRevealFocus'
import { getAttributionStatus, sortAttributions } from '../lib/attributionSort'
import { usePublicAttributions } from '../hooks/usePublicAttributions'
import { ACTIVE_SEASON } from '../lib/constants'

export default function PublicBoard() {
  const { items, loading, error } = usePublicAttributions(ACTIVE_SEASON, {
    fallbackRefreshMs: 1500,
  })

  const [sortBy, setSortBy] = useState('default')
  const [sortDirection, setSortDirection] = useState('asc')

  const sortedItems = useMemo(
    () => sortAttributions(items, sortBy, sortDirection),
    [items, sortBy, sortDirection],
  )

  const { focusedReveal, revealSignal, isFocusMode, focusPhase } = useRevealFocus(sortedItems, {
    displayMs: 5000,
    hideMs: 420,
  })

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Tournoi en cours</p>
        <h1>Tableau des hauts-faits</h1>
        <p>Saison active: {ACTIVE_SEASON}</p>
      </header>

      <section className="sort-toolbar">
        <label>
          Trier par
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="default">Par defaut (non revelees d'abord)</option>
            <option value="rarity">Rarete</option>
            <option value="name">Nom</option>
            <option value="status">Statut</option>
          </select>
        </label>

        <label>
          Sens
          <select
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value)}
          >
            <option value="asc">Ascendant</option>
            <option value="desc">Descendant</option>
          </select>
        </label>
      </section>

      {loading ? <p>Chargement des hauts-faits...</p> : null}
      {error ? <p className="error-text">Erreur: {error}</p> : null}

      <section className={`board-stage ${isFocusMode ? 'is-focus-mode' : ''}`}>
        <section className={`card-grid ${isFocusMode ? 'is-hidden-for-reveal' : ''}`}>
          {sortedItems.map((item) => (
            <div key={item.id} className="card-stack-item">
              <Card attribution={item} />
              <p className="card-status-chip">{getAttributionStatus(item)}</p>
            </div>
          ))}
        </section>

        {focusedReveal ? (
          <section
            className={`reveal-focus-stage ${focusPhase === 'hide' ? 'is-leaving' : ''}`}
            aria-label="Carte en reveal"
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
