import { useEffect, useRef, useState } from 'react'

export function useRevealFocus(items, options = {}) {
  const displayMs = options.displayMs || 5000
  const onReveal = options.onReveal

  const [focusedReveal, setFocusedReveal] = useState(null)
  const [revealSignal, setRevealSignal] = useState(0)

  const previousMapRef = useRef(new Map())
  const timerRef = useRef(null)

  useEffect(() => {
    let nextReveal = null

    for (const item of items || []) {
      const isRevealed = Boolean(item?.revealed_at)
      const wasRevealed = previousMapRef.current.get(item.id) || false

      if (!wasRevealed && isRevealed && !item?.is_unassigned) {
        nextReveal = item
        break
      }
    }

    const updatedMap = new Map()
    for (const item of items || []) {
      updatedMap.set(item.id, Boolean(item?.revealed_at))
    }
    previousMapRef.current = updatedMap

    if (!nextReveal) {
      return
    }

    setFocusedReveal(nextReveal)
    const nextSignal = Date.now()
    setRevealSignal(nextSignal)

    if (typeof onReveal === 'function') {
      onReveal(nextReveal)
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(() => {
      setFocusedReveal(null)
      timerRef.current = null
    }, displayMs)
  }, [items, displayMs, onReveal])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    focusedReveal,
    revealSignal,
    isFocusMode: Boolean(focusedReveal),
  }
}
