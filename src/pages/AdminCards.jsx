import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import { useAuth } from '../context/AuthContext'
import { ACTIVE_SEASON, RARITIES } from '../lib/constants'
import { normalizeBackStyle } from '../lib/backStyle'
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
  revealSoundPath: '',
}

const RECOMMENDED_SOUND_SIZE_BYTES = 1024 * 1024
const MAX_SOUND_SIZE_BYTES = 5 * 1024 * 1024
const SOUND_BUCKET = import.meta.env.VITE_REVEAL_SOUND_BUCKET || 'reveal-sounds'
const SOUND_FOLDER = 'cards'

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function formatBytes(sizeInBytes) {
  if (!Number.isFinite(sizeInBytes)) {
    return 'taille inconnue'
  }
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`
  }
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function AdminCards() {
  const { user } = useAuth()
  const [form, setForm] = useState(defaultForm)
  const [cards, setCards] = useState([])
  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingSound, setUploadingSound] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [soundName, setSoundName] = useState('')
  const [soundFile, setSoundFile] = useState(null)
  const [soundMessage, setSoundMessage] = useState('')
  const [error, setError] = useState('')
  const [soundError, setSoundError] = useState('')

  const selectedSound = useMemo(
    () => sounds.find((sound) => sound.path === form.revealSoundPath) || null,
    [sounds, form.revealSoundPath],
  )

  async function loadCards({ withLoading = true } = {}) {
    if (withLoading) {
      setLoading(true)
    }

    const { data, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('season', ACTIVE_SEASON)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      if (withLoading) {
        setLoading(false)
      }
      return
    }

    setCards(data || [])
    if (withLoading) {
      setLoading(false)
    }
  }

  async function loadSounds() {
    const { data, error: listError } = await supabase.storage
      .from(SOUND_BUCKET)
      .list(SOUND_FOLDER, {
        limit: 200,
        sortBy: { column: 'updated_at', order: 'desc' },
      })

    if (listError) {
      setSoundError(`Bibliotheque audio indisponible: ${listError.message}`)
      return
    }

    const mappedSounds = (data || [])
      .filter((entry) => Boolean(entry.name))
      .map((entry) => {
        const path = `${SOUND_FOLDER}/${entry.name}`
        const {
          data: { publicUrl },
        } = supabase.storage.from(SOUND_BUCKET).getPublicUrl(path)

        return {
          id: entry.id || path,
          path,
          name: entry.name,
          size: entry.metadata?.size || 0,
          updatedAt: entry.updated_at || '',
          url: publicUrl,
        }
      })

    setSounds(mappedSounds)
    setSoundError('')
  }

  useEffect(() => {
    async function boot() {
      setLoading(true)
      setError('')
      await Promise.all([loadCards({ withLoading: false }), loadSounds()])
      setLoading(false)
    }

    boot()
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
        reveal_sound_path: form.revealSoundPath || '',
        reveal_sound_url: selectedSound?.url || '',
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

    await loadCards({ withLoading: false })
    resetForm()
    setSubmitting(false)
  }

  async function uploadSound(event) {
    event.preventDefault()
    setUploadingSound(true)
    setSoundError('')
    setSoundMessage('')

    if (!soundFile) {
      setSoundError('Selectionne un fichier audio avant upload.')
      setUploadingSound(false)
      return
    }

    if (soundFile.size > MAX_SOUND_SIZE_BYTES) {
      setSoundError('Fichier trop lourd: maximum 5 MB.')
      setUploadingSound(false)
      return
    }

    const isAudio = soundFile.type.startsWith('audio/')
    if (!isAudio) {
      setSoundError('Format non supporte. Utilise mp3, wav, ogg, etc.')
      setUploadingSound(false)
      return
    }

    const prefixedName = soundName.trim() || soundFile.name
    const finalFilename = `${Date.now()}-${sanitizeFilename(prefixedName)}`
    const path = `${SOUND_FOLDER}/${finalFilename}`

    const { error: uploadError } = await supabase.storage
      .from(SOUND_BUCKET)
      .upload(path, soundFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      setSoundError(uploadError.message)
      setUploadingSound(false)
      return
    }

    await loadSounds()
    setForm((previous) => ({
      ...previous,
      revealSoundPath: path,
    }))

    const sizeHint =
      soundFile.size > RECOMMENDED_SOUND_SIZE_BYTES
        ? `Upload reussi (${formatBytes(soundFile.size)}). Conseil stream: idealement < 1 MB.`
        : `Upload reussi (${formatBytes(soundFile.size)}).`

    setSoundMessage(sizeHint)
    setSoundFile(null)
    setSoundName('')
    setUploadingSound(false)
  }

  function startEdit(card) {
    const style = normalizeBackStyle(card.back_style)
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
      revealSoundPath: style.reveal_sound_path || '',
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
      reveal_sound_path: form.revealSoundPath,
      reveal_sound_url: selectedSound?.url || '',
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

          <label>
            Son de reveal
            <select
              value={form.revealSoundPath}
              onChange={(event) => updateField('revealSoundPath', event.target.value)}
            >
              <option value="">Aucun son specifique (fallback global)</option>
              {sounds.map((sound) => (
                <option key={sound.path} value={sound.path}>
                  {sound.name} ({formatBytes(sound.size)})
                </option>
              ))}
            </select>
          </label>

          {selectedSound ? (
            <div className="sound-preview-box">
              <p className="sound-preview-title">Pre-ecoute: {selectedSound.name}</p>
              <audio controls preload="none" src={selectedSound.url} />
            </div>
          ) : null}

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
        <h2>Bibliotheque audio reveal</h2>
        <p className="workflow-note">
          Upload dans le bucket Supabase <strong>{SOUND_BUCKET}</strong>. Recommande: &lt; 1 MB.
          Limite stricte: 5 MB.
        </p>

        <form className="admin-form sound-upload-form" onSubmit={uploadSound}>
          <label>
            Nom de fichier (optionnel)
            <input
              value={soundName}
              onChange={(event) => setSoundName(event.target.value)}
              placeholder="reveal-legendaire.mp3"
            />
          </label>

          <label>
            Fichier audio
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg"
              onChange={(event) => setSoundFile(event.target.files?.[0] || null)}
            />
          </label>

          {soundFile ? (
            <p className="workflow-note">
              Selection: {soundFile.name} ({formatBytes(soundFile.size)})
              {soundFile.size > RECOMMENDED_SOUND_SIZE_BYTES
                ? ' - avertissement: > 1 MB peut retarder le playback en stream.'
                : ''}
            </p>
          ) : null}

          {soundError ? <p className="error-text">{soundError}</p> : null}
          {soundMessage ? <p className="ok-text">{soundMessage}</p> : null}

          <button type="submit" disabled={uploadingSound}>
            {uploadingSound ? 'Upload en cours...' : 'Uploader le son'}
          </button>
        </form>

        <ul className="sound-library-list">
          {sounds.map((sound) => (
            <li key={sound.path}>
              <div>
                <strong>{sound.name}</strong>
                <p>
                  {formatBytes(sound.size)} {sound.updatedAt ? `- MAJ ${sound.updatedAt}` : ''}
                </p>
              </div>
              <div className="row-actions sound-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => updateField('revealSoundPath', sound.path)}
                >
                  Utiliser sur la carte
                </button>
                <audio controls preload="none" src={sound.url} />
              </div>
            </li>
          ))}
        </ul>
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
