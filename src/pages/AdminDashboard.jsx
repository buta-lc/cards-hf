import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { useAuth } from '../context/AuthContext'
import { ACTIVE_SEASON, TARGET_KINDS } from '../lib/constants'
import { supabase } from '../lib/supabaseClient'

const initialForm = {
  card_id: '',
  target_type: 'player',
  target_name: '',
  reward: '',
  season: ACTIVE_SEASON,
}

function attributionToCardData(attribution) {
  return {
    ...attribution,
    title: attribution.cards?.title,
    description: attribution.cards?.description,
    rarity: attribution.cards?.rarity,
    back_style: attribution.cards?.back_style,
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [cards, setCards] = useState([])
  const [attributions, setAttributions] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const attributedCardIds = new Set(
    attributions
      .map((item) => item.card_id)
      .filter(Boolean),
  )

  const cardsWithoutAttribution = cards.filter((card) => !attributedCardIds.has(card.id))

  const lockedAttributions = attributions.filter((item) => item.status === 'locked')
  const validatedNotRevealed = attributions.filter(
    (item) => item.status === 'validated' && !item.revealed_at,
  )
  const revealedAttributions = attributions.filter((item) => Boolean(item.revealed_at))

  async function loadData() {
    setLoading(true)
    setError('')

    const [{ data: cardsData, error: cardsError }, { data: attribData, error: attribError }] =
      await Promise.all([
        supabase
          .from('cards')
          .select('*')
          .eq('season', ACTIVE_SEASON)
          .order('created_at', { ascending: false }),
        supabase
          .from('attributions')
          .select(
            'id, card_id, target_type, target_name, status, reward, validated_at, validated_by, revealed_at, season, created_at, cards(id, title, description, rarity, back_style)',
          )
          .eq('season', ACTIVE_SEASON)
          .order('created_at', { ascending: false }),
      ])

    if (cardsError || attribError) {
      setError(cardsError?.message || attribError?.message || 'Erreur inconnue')
      setLoading(false)
      return
    }

    setCards(cardsData || [])
    setAttributions(attribData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`admin-attributions-${ACTIVE_SEASON}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attributions',
          filter: `season=eq.${ACTIVE_SEASON}`,
        },
        async () => {
          await loadData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function createAttribution(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      card_id: form.card_id,
      target_type: form.target_type,
      target_name: form.target_name,
      reward: form.reward,
      status: 'locked',
      season: form.season,
    }

    const { error: createError } = await supabase.from('attributions').insert(payload)

    if (createError) {
      setError(createError.message)
      setSaving(false)
      return
    }

    setForm(initialForm)
    await loadData()
    setSaving(false)
  }

  async function validateAttribution(attributionId) {
    const { error: validateError } = await supabase
      .from('attributions')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: user?.id,
      })
      .eq('id', attributionId)

    if (validateError) {
      setError(validateError.message)
      return
    }

    await loadData()
  }

  async function revealAttribution(attributionId) {
    const { error: revealError } = await supabase
      .from('attributions')
      .update({
        revealed_at: new Date().toISOString(),
      })
      .eq('id', attributionId)

    if (revealError) {
      setError(revealError.message)
      return
    }

    await loadData()
  }

  async function hideAttribution(attributionId) {
    const { error: hideError } = await supabase
      .from('attributions')
      .update({
        revealed_at: null,
      })
      .eq('id', attributionId)

    if (hideError) {
      setError(hideError.message)
      return
    }

    await loadData()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <h1>Admin dashboard</h1>
          <p>Saison active: {ACTIVE_SEASON}</p>
        </div>
        <nav className="admin-links">
          <Link to="/admin/cards">Gerer les cartes</Link>
          <button type="button" onClick={handleSignOut} className="secondary">
            Se deconnecter
          </button>
        </nav>
      </header>

      <section className="panel">
        <h2>Nouvelle attribution</h2>
        <p className="workflow-note">
          Une carte creee apparait d'abord en file d'attente (non attribuee). Attribuee, elle passe
          en locked. Validee, elle devient prete a reveler. Le reveal reste une action separee.
        </p>
        <form className="admin-form" onSubmit={createAttribution}>
          <label>
            Carte
            <select
              value={form.card_id}
              onChange={(event) => updateField('card_id', event.target.value)}
              required
            >
              <option value="">Selectionner une carte</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.title} ({card.rarity})
                </option>
              ))}
            </select>
          </label>

          <label>
            Type cible
            <select
              value={form.target_type}
              onChange={(event) => updateField('target_type', event.target.value)}
            >
              {TARGET_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nom cible
            <input
              value={form.target_name}
              onChange={(event) => updateField('target_name', event.target.value)}
              required
            />
          </label>

          <label>
            Recompense
            <textarea
              rows={2}
              value={form.reward}
              onChange={(event) => updateField('reward', event.target.value)}
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" disabled={saving}>
            {saving ? 'Creation...' : 'Creer attribution'}
          </button>
        </form>
      </section>

      <section className="panel admin-list">
        <h2>Cartes en attente d'attribution ({cardsWithoutAttribution.length})</h2>
        <ul>
          {cardsWithoutAttribution.map((card) => (
            <li key={card.id}>
              <div>
                <strong>{card.title}</strong>
                <p>
                  {card.rarity} - {card.season}
                </p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    card_id: card.id,
                  }))
                }
              >
                Preparer attribution
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel admin-list">
        <h2>Attributions locked ({lockedAttributions.length})</h2>
        {loading ? <p>Chargement...</p> : null}
        <ul className="attrib-list">
          {lockedAttributions.map((attribution) => {
            const isValidated = attribution.status === 'validated'
            const isRevealed = Boolean(attribution.revealed_at)
            const cardData = attributionToCardData(attribution)

            return (
              <li key={attribution.id}>
                <Card attribution={cardData} className="mini-card" />
                <div className="attrib-meta">
                  <p>
                    <strong>{attribution.target_name}</strong> ({attribution.target_type})
                  </p>
                  <p>Statut: {attribution.status}</p>
                  <p>
                    Validation: {attribution.validated_at || 'pas encore'} | Reveal:{' '}
                    {attribution.revealed_at || 'pas encore'}
                  </p>
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() => validateAttribution(attribution.id)}
                      disabled={isValidated}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => revealAttribution(attribution.id)}
                      disabled={!isValidated || isRevealed}
                    >
                      Reveler maintenant
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel admin-list">
        <h2>Validees pretes a reveler ({validatedNotRevealed.length})</h2>
        <ul className="attrib-list">
          {validatedNotRevealed.map((attribution) => {
            const cardData = attributionToCardData(attribution)

            return (
              <li key={attribution.id}>
                <Card attribution={cardData} className="mini-card" />
                <div className="attrib-meta">
                  <p>
                    <strong>{attribution.target_name}</strong> ({attribution.target_type})
                  </p>
                  <p>Statut: valide, pas encore revele</p>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => revealAttribution(attribution.id)}
                    >
                      Reveler maintenant
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel admin-list">
        <h2>Deja revelees ({revealedAttributions.length})</h2>
        <ul className="attrib-list">
          {revealedAttributions.map((attribution) => {
            const cardData = attributionToCardData(attribution)

            return (
              <li key={attribution.id}>
                <Card attribution={cardData} className="mini-card" />
                <div className="attrib-meta">
                  <p>
                    <strong>{attribution.target_name}</strong> ({attribution.target_type})
                  </p>
                  <p>Reveal: {attribution.revealed_at}</p>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="danger"
                      onClick={() => hideAttribution(attribution.id)}
                    >
                      Recacher
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
