import { useEffect, useRef, useState } from 'react'

export function useRevealFocus(items, options = {}) {
  const displayMs = options.displayMs || 5000
  const hideMs = options.hideMs || 380
  const onReveal = options.onReveal

  const [focusedReveal, setFocusedReveal] = useState(null)
  const [revealSignal, setRevealSignal] = useState(0)
  const [focusPhase, setFocusPhase] = useState('idle')

  const previousMapRef = useRef(new Map())
  const hasHydratedRef = useRef(false)
  const showTimerRef = useRef(null)
  const hideTimerRef = useRef(null)

  useEffect(() => {
    if (!hasHydratedRef.current) {
      const bootstrapMap = new Map()
      for (const item of items || []) {
        bootstrapMap.set(item.id, Boolean(item?.revealed_at))
      }
      previousMapRef.current = bootstrapMap
      hasHydratedRef.current = true
      return
    }

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
    setFocusPhase('show')
    const nextSignal = Date.now()
    setRevealSignal(nextSignal)

    if (typeof onReveal === 'function') {
      onReveal(nextReveal)
    }

    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current)
    }

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
    }

    showTimerRef.current = window.setTimeout(() => {
      setFocusPhase('hide')
      hideTimerRef.current = window.setTimeout(() => {
        setFocusedReveal(null)
        setFocusPhase('idle')
        hideTimerRef.current = null
      }, hideMs)
      showTimerRef.current = null
    }, displayMs)
  }, [items, displayMs, hideMs, onReveal])

  useEffect(() => {
    return () => {
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current)
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  return {
    focusedReveal,
    revealSignal,
    focusPhase,
    isFocusMode: focusPhase !== 'idle',
  }
}
