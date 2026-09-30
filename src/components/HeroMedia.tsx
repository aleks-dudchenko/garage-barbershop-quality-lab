import { useEffect, useRef } from 'react'

/**
 * Постер малюється одразу, відео проявляється лише коли справді пішло.
 * Телефонам відео не віддаємо взагалі: на старому сайті 4,3 МБ качались
 * повністю і не гралися. Так само поважаємо економію трафіку і прохання
 * без анімації.
 */
export function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    type Conn = { saveData?: boolean; effectiveType?: string }
    const conn = (navigator as Navigator & { connection?: Conn }).connection ?? {}
    if (window.innerWidth < 768 || conn.saveData || /2g/.test(conn.effectiveType ?? '')) return

    const onPlaying = () => v.classList.add('is-playing')
    v.addEventListener('playing', onPlaying, { once: true })

    /* muted лише атрибутом недостатньо: політика автогри дивиться на властивість. */
    v.muted = true
    v.defaultMuted = true
    v.src = '/img/hero.mp4'
    /* З preload="none" саме призначення src не починає завантаження. */
    v.load()

    const tryPlay = () => void v.play().catch(() => {})
    if (v.readyState >= 2) tryPlay()
    v.addEventListener('canplay', tryPlay, { once: true })
    document.addEventListener('pointerdown', tryPlay, { once: true, passive: true })

    return () => {
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('canplay', tryPlay)
    }
  }, [])

  return (
    <div className="hero__media">
      <picture>
        <source
          type="image/webp"
          srcSet="/img/hero-poster-800.webp 800w, /img/hero-poster.webp 1280w"
          sizes="100vw"
        />
        <img
          className="hero__img"
          src="/img/hero-poster.jpg"
          srcSet="/img/hero-poster-800.jpg 800w, /img/hero-poster.jpg 1280w"
          sizes="100vw"
          width={1280}
          height={800}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <video
        className="hero__video"
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      />
    </div>
  )
}
