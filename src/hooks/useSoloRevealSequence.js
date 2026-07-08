import { useEffect, useRef, useState } from 'react'

export function useSoloRevealSequence(items, options = {}) {
  const backMs = options.backMs || 3000
  const flipMs = options.flipMs || 1700
  const frontMs = options.frontMs || 6000
  const outroMs = options.outroMs || 700
  const onFlipStart = options.onFlipStart

  const [activeItem, setActiveItem] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [revealSignal, setRevealSignal] = useState(0)

  const previousMapRef = useRef(new Map())
  const timersRef = useRef([])

  function clearTimers() {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer)
    }
    timersRef.current = []
  }

  useEffect(() => {
    const transitionedToRevealed = []

    for (const item of items || []) {
      const isRevealed = Boolean(item?.revealed_at)
      const wasRevealed = previousMapRef.current.get(item.id) || false

      if (!wasRevealed && isRevealed && !item?.is_unassigned) {
        transitionedToRevealed.push(item)
      }
    }

    const updatedMap = new Map()
    for (const item of items || []) {
      updatedMap.set(item.id, Boolean(item?.revealed_at))
    }
    previousMapRef.current = updatedMap

    if (!transitionedToRevealed.length) {
      return
    }

    const newestReveal = transitionedToRevealed.sort((left, right) => {
      return new Date(right.revealed_at).getTime() - new Date(left.revealed_at).getTime()
    })[0]

    clearTimers()

    setActiveItem(newestReveal)
    setPhase('intro-back')

    const toRevealTimer = window.setTimeout(() => {
      setPhase('reveal-flip')
      const nextSignal = Date.now()
      setRevealSignal(nextSignal)
      if (typeof onFlipStart === 'function') {
        onFlipStart(newestReveal)
      }
    }, backMs)

    const toFrontTimer = window.setTimeout(() => {
      setPhase('front-hold')
    }, backMs + flipMs)

    const toOutroTimer = window.setTimeout(() => {
      setPhase('outro')
    }, backMs + flipMs + frontMs)

    const toIdleTimer = window.setTimeout(() => {
      setPhase('idle')
      setActiveItem(null)
    }, backMs + flipMs + frontMs + outroMs)

    timersRef.current = [toRevealTimer, toFrontTimer, toOutroTimer, toIdleTimer]
  }, [items, backMs, flipMs, frontMs, outroMs, onFlipStart])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  return {
    activeItem,
    phase,
    revealSignal,
    isActive: phase !== 'idle' && Boolean(activeItem),
  }
}
