import { Reveal } from './Reveal'
import { BtnIcon, PlayIcon } from './Icons'
import { track } from '@/lib/track'
import { staggerIndex } from '@/lib/utils'
import { INSTAGRAM_POSTS, INSTAGRAM_URL, postLabel, postUrl } from '@/lib/instagram'

/**
 * Про нас.
 *
 * Заголовок, один рядок під ним і роботи майстрів. «Бо тут знають, як вас
 * стригти.» продовжує заголовок як одну думку, без цифр і фактів, які вже є
 * в інших секціях; доводять обидва рядки самі стрижки під ними. Раніше тут були спершу рейтинг і сума оцінок (уже
 * показані в герої й у майстрів), потім ціни дитячої стрижки й «Батько +
 * син» (уже є в прайсі). Обидва варіанти повторювали сусідні секції.
 *
 * Кнопка каже, що людина побачить в Instagram, а не просто куди веде.
 */
export function AboutSection() {
  return (
    <section className="band band--paper2 sec" id="about" data-logo="dark" aria-labelledby="about-title">
      <div className="about">
        <Reveal className="about__text" blur>
          <p className="eyebrow">Про нас</p>
          <h2 id="about-title">Сюди ходять роками.</h2>
          <p className="lead">Бо тут знають, як вас стригти.</p>
          <a
            className="btn btn-outline btn-pill"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            onClick={() => track('social_click', { network: 'instagram' })}
          >
            <span>Роботи майстрів в Instagram</span>
            <BtnIcon />
          </a>
        </Reveal>

        {/* Шість останніх постів з Instagram закладу, кожен веде на себе. Поки
            це знімок від 24.09.2026, див. src/lib/instagram.ts. Плитки
            вертикальні 3:4, як сітка самого Instagram, тож фото не
            обрізаються сильніше, ніж там. */}
        <Reveal className="works" delay={0.08} list>
          <div className="works__viewport">
            <ul className="works__track stagger">
              {INSTAGRAM_POSTS.map((p, i) => (
                <li key={p.code} style={staggerIndex(i)}>
                  <a
                    className="works__tile"
                    href={postUrl(p)}
                    target="_blank"
                    rel="noopener"
                    onClick={() => track('social_click', { network: 'instagram', source: 'feed', post: p.code })}
                  >
                    <picture>
                      <source type="image/webp" srcSet={`/img/instagram/${p.code}.webp`} />
                      <img
                        src={`/img/instagram/${p.code}.jpg`}
                        width={p.w}
                        height={p.h}
                        alt={postLabel(p)}
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                    {p.kind === 'video' && (
                      <span className="works__play" aria-hidden="true">
                        <PlayIcon />
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
