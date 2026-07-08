import { useEffect, useMemo, useRef, useState } from 'react'

const FALLBACK_BACK_STYLE = {
  color: '#1f2937',
  icon: '*',
  title: 'Haut-fait',
  image_url: '',
}

function normalizeBackStyle(backStyle) {
  if (!backStyle) {
    return FALLBACK_BACK_STYLE
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
    color: source.color || FALLBACK_BACK_STYLE.color,
    icon: source.icon || FALLBACK_BACK_STYLE.icon,
    title: source.title || FALLBACK_BACK_STYLE.title,
    image_url: source.image_url || '',
  }
}

function createRevealParticles(rarity) {
  if (rarity !== 'epique' && rarity !== 'legendaire') {
    return []
  }

  const count = rarity === 'legendaire' ? 14 : 10
  const color = rarity === 'legendaire' ? 'rgba(255, 211, 105, 0.95)' : 'rgba(196, 113, 255, 0.95)'

  return Array.from({ length: count }).map((_, index) => {
    const angle = Math.random() * Math.PI * 2
    const distance = rarity === 'legendaire' ? 145 + Math.random() * 80 : 100 + Math.random() * 65
    const tx = Math.cos(angle) * distance
    const ty = Math.sin(angle) * distance
    const duration = 620 + Math.floor(Math.random() * 320)
    const delay = Math.floor(Math.random() * 120)
    const size = rarity === 'legendaire' ? 10 + Math.floor(Math.random() * 7) : 8 + Math.floor(Math.random() * 6)

    return {
      id: `${Date.now()}-${index}`,
      tx,
      ty,
      duration,
      delay,
      size,
      color,
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
  const previousRevealSignal = useRef(revealSignal)
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
      }, 850)

      const hypeStartTimeout = window.setTimeout(() => {
        setIsHypeWindow(true)
      }, 850)

      const hypeStopTimeout = window.setTimeout(() => {
        setIsHypeWindow(false)
      }, 1150)

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
