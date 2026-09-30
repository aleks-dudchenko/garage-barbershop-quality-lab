import { HeroMedia } from './HeroMedia'
import { SlotsPanel } from './SlotsPanel'
import { BtnIcon, Star } from './Icons'
import { BOOKING, PHONE } from './Header'
import { track } from '@/lib/track'
import { useBookingClick } from '@/lib/booking'
import { useCallClick } from './CallSheet'
import { PhoneIcon } from './Icons'

const MAPS =
  'https://www.google.com/maps/search/?api=1&query=Garage%20Barbershop&query_place_id=ChIJ1xMBqjIyK0cRwRWlahjkupQ'

/**
 * Заголовок героя. Три рядки на десктопі, два на телефоні, і це робить CSS,
 * а не два набори рядків у скрипті: розмітка на сервері й у браузері одна,
 * тож заголовок не перебудовується після завантаження.
 *
 * Пробіли між рядками це справжні текстові вузли. Між блоками браузер їх не
 * малює, а читалка й пошук отримують «Перший барбершоп Ірпеня.», а не
 * злиплі слова, як було, коли рядки стояли впритул.
 *
 * Проявлення теж на CSS (hero-line-in у garage.css), тому заголовок видно
 * одразу з пререндера, без очікування скриптів.
 */
function HeroTitle() {
  return (
    <h1 id="hero-title">
      <span className="hero__line">Перший</span>{' '}
      <span className="hero__line">барбершоп</span>{' '}
      <span className="hero__line">Ірпеня.</span>
    </h1>
  )
}

export function Hero() {
  const bookingClick = useBookingClick()
  const callClick = useCallClick('hero')
  return (
    <section className="hero" id="top" data-logo="light" aria-labelledby="hero-title">
      <HeroMedia />
      <div className="hero__veil" aria-hidden="true" />

      <div className="hero__inner">
        {/* Сітка з іменованими зонами: оцінка над заголовком, під текстом
            кнопка й телефон в один рядок, на найвужчих екранах телефон під
            кнопкою. Вхід усіх частин описаний у garage.css (rise-in) і йде
            в порядку читання, без скриптів. */}
        <div className="hero__copy">
          {/* Оцінка більше не стоїть упритул до головної кнопки: посилання
              на Google поруч із «Записатись» виводило людину з сайту рівно
              там, де вона найближче до запису. Лишаємо його, щоб недовірливий
              міг перевірити, але не в рядку дій. */}
          <p className="hero__proof-line">
            <a
              className="hero__proof"
              href={MAPS}
              target="_blank"
              rel="noopener"
              onClick={() => track('social_click', { network: 'google' })}
            >
              <span className="hero__star" aria-hidden="true"><Star /></span>
              <strong>4,8</strong>
              <span>611 відгуків у Google</span>
            </a>
          </p>

          <HeroTitle />

          <p className="hero__sub">Звучить голосно або ж пафосно, але факт залишається фактом.</p>

          <div className="hero__cta">
            <a
              className="btn btn-primary btn-pill"
              href={BOOKING}
              target="_blank"
              rel="noopener"
              onClick={(e) => {
                track('booking_open', { source: 'hero', closed: 'closed' in document.documentElement.dataset })
                bookingClick(e)
              }}
            >
              <span>Записатись</span>
              <BtnIcon />
            </a>
          </div>

          {/* Друга дія, але тихіша за кнопку: частина людей не хоче форму,
              їм швидше подзвонити, а телефон досі жив аж у контактах.
              Номерів у салону два, тож кнопка одна, а обидва номери у вікні
              (CallSheet), lifecell першим. Без скриптів вона просто дзвонить
              на lifecell. */}
          <div className="hero__tel-wrap">
            <a className="btn btn-call" href={`tel:${PHONE}`} onClick={callClick}>
              <PhoneIcon />
              <span>Подзвонити</span>
            </a>
          </div>
        </div>

        <div className="hero__slots">
          <SlotsPanel />
        </div>
      </div>
    </section>
  )
}
