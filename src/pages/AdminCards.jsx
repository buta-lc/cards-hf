import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import { useAuth } from '../context/AuthContext'
import { ACTIVE_SEASON, RARITIES } from '../lib/constants'
import { supabase } from '../lib/supabaseClient'

const defaultForm = {
  title: '',
  description: '',
  rarity: 'commune',
  season: ACTIVE_SEASON,
  backColor: '#133047',
  backIcon: '*',
  backTitle: 'Haut-fait',
  backImageUrl: '',
}

function parseBackStyle(backStyle) {
  if (!backStyle) {
    return {}
  }

  if (typeof backStyle === 'string') {
    try {
      return JSON.parse(backStyle)
    } catch {
      return {}
    }
  }

  return backStyle
}

export default function AdminCards() {
  const { user } = useAuth()
  const [form, setForm] = useState(defaultForm)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')

  async function loadCards() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('season', ACTIVE_SEASON)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setCards(data || [])
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    loadCards()
  }, [])

  function updateField(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  function resetForm() {
    setForm(defaultForm)
    setEditingId('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      title: form.title,
      description: form.description,
      rarity: form.rarity,
      season: form.season,
      back_style: {
        color: form.backColor,
        icon: form.backIcon,
        title: form.backTitle,
        image_url: form.backImageUrl,
      },
    }

    const query = editingId
      ? supabase.from('cards').update(payload).eq('id', editingId)
      : supabase.from('cards').insert(payload)

    const { error: saveError } = await query

    if (saveError) {
      setError(saveError.message)
      setSubmitting(false)
      return
    }

    await loadCards()
    resetForm()
    setSubmitting(false)
  }

  function startEdit(card) {
    const style = parseBackStyle(card.back_style)
    setEditingId(card.id)
    setForm({
      title: card.title || '',
      description: card.description || '',
      rarity: card.rarity || 'commune',
      season: card.season || ACTIVE_SEASON,
      backColor: style.color || '#133047',
      backIcon: style.icon || '*',
      backTitle: style.title || 'Haut-fait',
      backImageUrl: style.image_url || '',
    })
  }

  async function removeCard(cardId) {
    const confirmed = window.confirm('Supprimer cette carte ?')
    if (!confirmed) {
      return
    }

    const { error: deleteError } = await supabase.from('cards').delete().eq('id', cardId)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setCards((previous) => previous.filter((card) => card.id !== cardId))
  }

  const preview = {
    title: form.title || 'Nouveau haut-fait',
    description: form.description || 'Description de la carte',
    rarity: form.rarity,
    back_style: {
      color: form.backColor,
      icon: form.backIcon,
      title: form.backTitle || 'Haut-fait',
      image_url: form.backImageUrl,
    },
    target_name: 'Equipe exemple',
    target_type: 'team',
    reward: 'Recompense exemple',
    revealed_at: null,
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <h1>Admin cartes</h1>
          <p>{user?.email}</p>
        </div>
        <nav className="admin-links">
          <Link to="/admin">Dashboard</Link>
        </nav>
      </header>

      <section className="admin-grid">
        <form className="panel admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Modifier une carte' : 'Creer une carte'}</h2>

          <label>
            Titre
            <input
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              required
            />
          </label>

          <label>
            Rarete
            <select
              value={form.rarity}
              onChange={(event) => updateField('rarity', event.target.value)}
            >
              {RARITIES.map((rarity) => (
                <option key={rarity.value} value={rarity.value}>
                  {rarity.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Saison
            <input
              value={form.season}
              onChange={(event) => updateField('season', event.target.value)}
              required
            />
          </label>

          <label>
            Couleur du dos
            <input
              type="color"
              value={form.backColor}
              onChange={(event) => updateField('backColor', event.target.value)}
            />
          </label>

          <label>
            Icone
            <input
              value={form.backIcon}
              onChange={(event) => updateField('backIcon', event.target.value)}
              maxLength={3}
            />
          </label>

          <label>
            Titre du dos
            <input
              value={form.backTitle}
              onChange={(event) => updateField('backTitle', event.target.value)}
              required
            />
          </label>

          <label>
            Image URL (optionnel)
            <input
              value={form.backImageUrl}
              onChange={(event) => updateField('backImageUrl', event.target.value)}
              placeholder="https://..."
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <div className="row-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement...' : editingId ? 'Mettre a jour' : 'Creer'}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="secondary">
                Annuler
              </button>
            ) : null}
          </div>
        </form>

        <section className="panel">
          <h2>Apercu du dos</h2>
          <Card attribution={preview} backOnly />
        </section>
      </section>

      <section className="panel admin-list">
        <h2>Cartes existantes</h2>
        {loading ? <p>Chargement des cartes...</p> : null}
        <ul>
          {cards.map((card) => (
            <li key={card.id}>
              <div>
                <strong>{card.title}</strong>
                <p>
                  {card.rarity} - {card.season}
                </p>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => startEdit(card)} className="secondary">
                  Editer
                </button>
                <button type="button" onClick={() => removeCard(card.id)} className="danger">
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
