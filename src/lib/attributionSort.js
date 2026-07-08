const RARITY_WEIGHT = {
  commune: 1,
  rare: 2,
  epique: 3,
  legendaire: 4,
}

const STATUS_WEIGHT = {
  non_attribuee: 1,
  verrouillee: 2,
  validee: 3,
  revelee: 4,
}

export function getAttributionStatus(item) {
  if (item?.is_unassigned) {
    return 'non_attribuee'
  }

  if (item?.revealed_at) {
    return 'revelee'
  }

  if (item?.status === 'validated') {
    return 'validee'
  }

  return 'verrouillee'
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'fr', { sensitivity: 'base' })
}

export function sortAttributions(items, sortBy = 'default', sortDirection = 'asc') {
  const factor = sortDirection === 'desc' ? -1 : 1
  const list = [...(items || [])]

  list.sort((left, right) => {
    const leftStatus = getAttributionStatus(left)
    const rightStatus = getAttributionStatus(right)
    const leftRevealed = Boolean(left?.revealed_at)
    const rightRevealed = Boolean(right?.revealed_at)

    if (sortBy === 'default') {
      if (leftRevealed !== rightRevealed) {
        return leftRevealed ? 1 : -1
      }

      const statusDelta = STATUS_WEIGHT[leftStatus] - STATUS_WEIGHT[rightStatus]
      if (statusDelta !== 0) {
        return statusDelta
      }

      const rarityDelta = (RARITY_WEIGHT[right?.rarity] || 0) - (RARITY_WEIGHT[left?.rarity] || 0)
      if (rarityDelta !== 0) {
        return rarityDelta
      }

      return compareText(left?.title, right?.title)
    }

    if (sortBy === 'rarity') {
      return ((RARITY_WEIGHT[left?.rarity] || 0) - (RARITY_WEIGHT[right?.rarity] || 0)) * factor
    }

    if (sortBy === 'status') {
      return (STATUS_WEIGHT[leftStatus] - STATUS_WEIGHT[rightStatus]) * factor
    }

    return compareText(left?.title, right?.title) * factor
  })

  return list
}
