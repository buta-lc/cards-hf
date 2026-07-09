export const DEFAULT_BACK_STYLE = {
  color: '#1f2937',
  icon: '*',
  title: 'Haut-fait',
  image_url: '',
  reveal_sound_path: '',
  reveal_sound_url: '',
}

export function normalizeBackStyle(backStyle) {
  if (!backStyle) {
    return DEFAULT_BACK_STYLE
  }

  let source = backStyle
  if (typeof backStyle === 'string') {
    try {
      source = JSON.parse(backStyle)
    } catch {
      source = {}
    }
  }

  return {
    color: source.color || DEFAULT_BACK_STYLE.color,
    icon: source.icon || DEFAULT_BACK_STYLE.icon,
    title: source.title || DEFAULT_BACK_STYLE.title,
    image_url: source.image_url || '',
    reveal_sound_path: source.reveal_sound_path || '',
    reveal_sound_url: source.reveal_sound_url || '',
  }
}

export function getRevealSoundUrl(attribution, fallbackUrl = '') {
  const style = normalizeBackStyle(attribution?.back_style)
  return style.reveal_sound_url || fallbackUrl
}
