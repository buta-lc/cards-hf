import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeBackStyle } from '../lib/backStyle'

function createRevealParticles(rarity) {
  if (rarity !== 'rare' && rarity !== 'epique' && rarity !== 'legendaire') {
    return []
  }

  const count = rarity === 'legendaire' ? 20 : rarity === 'epique' ? 14 : 8
  const color =
    rarity === 'legendaire'
      ? 'rgba(255, 211, 105, 0.95)'
      : rarity === 'epique'
        ? 'rgba(196, 113, 255, 0.95)'
        : 'rgba(110, 206, 255, 0.95)'

  return Array.from({ length: count }).map((_, index) => {
    const angle = Math.random() * Math.PI * 2
    const distance =
      rarity === 'legendaire'
        ? 180 + Math.random() * 90
        : rarity === 'epique'
          ? 130 + Math.random() * 75
          : 95 + Math.random() * 45
    const tx = Math.cos(angle) * distance
    const ty = Math.sin(angle) * distance
    const duration = 1100 + Math.floor(Math.random() * 560)
    const delay = 320 + Math.floor(Math.random() * 260)
    const size =
      rarity === 'legendaire'
        ? 14 + Math.floor(Math.random() * 10)
        : rarity === 'epique'
          ? 11 + Math.floor(Math.random() * 8)
          : 9 + Math.floor(Math.random() * 6)
    const rotate = -65 + Math.floor(Math.random() * 130)

    return {
      id: `${Date.now()}-${index}`,
      tx,
      ty,
      duration,
      delay,
      size,
      color,
      rotate,
    }
  })
}

export default function Card({
  attribution,
  backOnly = false,
  className = '',
  revealSignal = 0,
}) {
  const {
    title,
    description,
    rarity = 'commune',
    reward,
    target_name: targetName,
    target_type: targetType,
    revealed_at: revealedAt,
  } = attribution || {}

  const revealed = !backOnly && Boolean(revealedAt)
  const backStyle = useMemo(
    () => normalizeBackStyle(attribution?.back_style),
    [attribution?.back_style],
  )

  const previousRevealed = useRef(revealed)
  const previousRevealSignal = useRef(0)
  const [isRevealAnimating, setIsRevealAnimating] = useState(false)
  const [isHypeWindow, setIsHypeWindow] = useState(false)
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const signalTriggered =
      Boolean(revealSignal) && previousRevealSignal.current !== revealSignal && revealed

    if ((!previousRevealed.current && revealed) || signalTriggered) {
      setIsRevealAnimating(true)
      setIsHypeWindow(false)
      setParticles(createRevealParticles(rarity))

      const revealDoneTimeout = window.setTimeout(() => {
        setIsRevealAnimating(false)
      }, 1700)

      const hypeStartTimeout = window.setTimeout(() => {
        setIsHypeWindow(true)
      }, 1700)

      const hypeStopTimeout = window.setTimeout(() => {
        setIsHypeWindow(false)
      }, 2000)

      previousRevealed.current = true
      previousRevealSignal.current = revealSignal

      return () => {
        window.clearTimeout(revealDoneTimeout)
        window.clearTimeout(hypeStartTimeout)
        window.clearTimeout(hypeStopTimeout)
      }
    }

    previousRevealed.current = revealed
    previousRevealSignal.current = revealSignal
    return undefined
  }, [revealed, rarity, revealSignal])

  return (
    <article
      className={`hf-card rarity-${rarity} ${revealed ? 'is-flipped' : ''} ${
        isRevealAnimating ? 'is-reveal-animating' : ''
      } ${
        isHypeWindow ? 'is-hype-window' : ''
      } ${className}`.trim()}
    >
      <div className="hf-card-border" aria-hidden="true"></div>
      <div className="hf-card-border-sheen" aria-hidden="true"></div>
      <div className="hf-card-sweep" aria-hidden="true"></div>
      <div className="hf-card-flash" aria-hidden="true"></div>
      <div className="hf-card-hype-glow" aria-hidden="true"></div>
      <div className="hf-reveal-burst" aria-hidden="true"></div>
      <div className="hf-card-ray-layer" aria-hidden="true">
        <span className="hf-card-ray"></span>
        <span className="hf-card-ray"></span>
        <span className="hf-card-ray"></span>
      </div>
      <div className="hf-card-particles" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="hf-particle"
            style={{
              '--tx': `${particle.tx}px`,
              '--ty': `${particle.ty}px`,
              '--dur': `${particle.duration}ms`,
              '--delay': `${particle.delay}ms`,
              '--size': `${particle.size}px`,
              '--particle-color': particle.color,
              '--rz': `${particle.rotate}deg`,
            }}
            onAnimationEnd={() => {
              setParticles((current) => current.filter((item) => item.id !== particle.id))
            }}
          ></span>
        ))}
      </div>
      <div className="hf-card-inner">
        <section
          className="hf-card-face hf-card-back"
          style={{
            background: `linear-gradient(145deg, ${backStyle.color}, #111827)`,
          }}
        >
          {backStyle.image_url ? (
            <img
              src={backStyle.image_url}
              alt=""
              className="hf-card-back-image"
              loading="lazy"
            />
          ) : null}
          <div className="hf-card-back-ambient" aria-hidden="true">
            <span className="ambient-dot"></span>
            <span className="ambient-dot"></span>
            <span className="ambient-dot"></span>
            <span className="ambient-dot"></span>
          </div>
          <div className="hf-card-back-content">
            <span className="hf-card-back-icon">{backStyle.icon}</span>
            <h3>{backStyle.title}</h3>
          </div>
        </section>

        <section className="hf-card-face hf-card-front">
          <div className="hf-card-front-backhint" aria-hidden="true">
            {backStyle.image_url ? (
              <img src={backStyle.image_url} alt="" className="hf-card-front-backhint-image" />
            ) : (
              <span className="hf-card-front-backhint-icon">{backStyle.icon}</span>
            )}
          </div>
          <div className="hf-card-front-head">
            <p className="hf-rarity-pill">{rarity}</p>
            <h3>{title}</h3>
          </div>
          <p className="hf-card-desc">{description}</p>
          <p className="hf-card-target">
            {targetType === 'team' ? 'Equipe' : 'Joueur'}: <strong>{targetName}</strong>
          </p>
          <p className="hf-card-reward">{reward || 'Recompense verrouillee'}</p>
        </section>
      </div>
    </article>
  )
}
