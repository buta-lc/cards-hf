import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const DEFAULT_FALLBACK_REFRESH_MS = Number(import.meta.env.VITE_PUBLIC_REFRESH_MS || 1500)

export function usePublicAttributions(season, options = {}) {
  const fallbackRefreshMs = options.fallbackRefreshMs || DEFAULT_FALLBACK_REFRESH_MS
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAttributions = useCallback(async () => {
    const [cardsResponse, attributionsResponse] = await Promise.all([
      supabase.from('cards').select('*').eq('season', season),
      supabase.from('public_attributions').select('*').eq('season', season),
    ])

    if (cardsResponse.error || attributionsResponse.error) {
      setError(cardsResponse.error?.message || attributionsResponse.error?.message || 'Erreur')
      return
    }

    const cards = cardsResponse.data || []
    const attributions = attributionsResponse.data || []

    const assignedCardIds = new Set(
      attributions
        .map((row) => row.card_id)
        .filter(Boolean),
    )

    const unassignedCards = cards
      .filter((card) => !assignedCardIds.has(card.id))
      .map((card) => ({
        id: `card-${card.id}`,
        card_id: card.id,
        title: card.title,
        description: card.description,
        rarity: card.rarity,
        back_style: card.back_style,
        target_type: 'player',
        target_name: 'A venir',
        status: 'locked',
        revealed_at: null,
        reward: null,
        season: card.season,
        is_unassigned: true,
      }))

    setError('')
    setItems([...attributions, ...unassignedCards])
  }, [season])

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      await fetchAttributions()
      if (mounted) {
        setLoading(false)
      }
    }

    load()

    function shouldRefreshForSeason(payload) {
      const payloadSeason = payload?.new?.season || payload?.old?.season
      return payloadSeason === season
    }

    const channel = supabase
      .channel(`public-attributions-${season}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attributions',
        },
        async (payload) => {
          if (!shouldRefreshForSeason(payload)) {
            return
          }
          await fetchAttributions()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
        },
        async (payload) => {
          if (!shouldRefreshForSeason(payload)) {
            return
          }
          await fetchAttributions()
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setError('Realtime indisponible sur ce client.')
        }
      })

    const intervalId = window.setInterval(() => {
      fetchAttributions()
    }, fallbackRefreshMs)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAttributions()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [season, fetchAttributions, fallbackRefreshMs])

  return { items, loading, error, refresh: fetchAttributions }
}
