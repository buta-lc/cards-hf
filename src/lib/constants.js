export const ACTIVE_SEASON = import.meta.env.VITE_ACTIVE_SEASON || 'saison-1'

export const RARITIES = [
  { value: 'commune', label: 'Commune' },
  { value: 'rare', label: 'Rare' },
  { value: 'epique', label: 'Epique' },
  { value: 'legendaire', label: 'Legendaire' },
]

export const TARGET_KINDS = [
  { value: 'player', label: 'Joueur' },
  { value: 'team', label: 'Equipe' },
]
