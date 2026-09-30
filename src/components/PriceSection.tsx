import { useState } from 'react'
import { Reveal } from './Reveal'
import { BtnIcon } from './Icons'
import { BOOKING } from './Header'
import { track } from '@/lib/track'
import { useBookingClick } from '@/lib/booking'
import { priceColumns } from '@/lib/prices'
import type { PriceRow } from '@/lib/prices'
import { useLive, livePrices, type Live } from '@/lib/live'
import { staggerIndex } from '@/lib/utils'

/* Дата мусить іти за живим прайсом: щойно власник міняє суму з телеграма,
   «актуальні на» від дня збірки стає неправдою. Без правок лишається день,
   коли ціни зняті з Altegio. Час закладу, а не відвідувача. */
const BUILT = '21.09.2026'
const KYIV = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'Europe/Kyiv',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function priceDate(live: Live) {
  if (!live.updatedAt) return BUILT
  const when = new Date(live.updatedAt)
  return Number.isNaN(+when) ? BUILT : KYIV.format(when)
}

/**
 * На телефоні чотири колонки не влазять, тому рівень обирається перемикачем
 * над списком, як послуга в плашці вільних вікон, а в рядку стоїть точна
 * ціна саме цього рівня. Раніше тут була одна колонка «від …», і з телефона
 * не можна було дізнатись, скільки коштує, скажімо, топ (правка власника,
 * 23.09.2026). З 768px замість нього повна таблиця.
 */
function PriceLevels({ rows }: { rows: PriceRow[] }) {
  const [level, setLevel] = useState(0)
  const levels = priceColumns.slice(1)
  return (
    <>
      {/* Пігулки перші в черзі появи, рядки за ними: див. .stagger-item. */}
      <fieldset className="levels stagger-item" style={staggerIndex(0)}>
        <legend className="sr-only">Рівень барбера</legend>
        {levels.map((name, i) => (
          <label className="levels__item" key={name}>
            <input
              type="radio"
              name="price-level"
              value={i}
              checked={level === i}
              onChange={() => setLevel(i)}
            />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>
      <ul className="price-list stagger">
        {rows.map((row, i) => (
          <li className="price-list__row" key={row.service} style={staggerIndex(i + 1)}>
            <span>{row.service}</span>
            {/* Рівень у ключі: на перемиканні цифра коротко проявляється
                наново, і видно, що ціни змінились, а не лишились ті самі. */}
            <strong key={level}>{row.prices[level] ?? row.prices[0]}</strong>
          </li>
        ))}
      </ul>
    </>
  )
}

function PriceTable({ rows }: { rows: PriceRow[] }) {
  return (
    <table className="price-table">
      <caption className="sr-only">Ціни на послуги за рівнями барберів, у гривнях</caption>
      <thead>
        <tr className="stagger-item stagger-item--fade" style={staggerIndex(0)}>
          {priceColumns.map((c) => (
            <th scope="col" key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody className="stagger stagger--fade">
        {rows.map((row, i) => (
          <tr key={row.service} style={staggerIndex(i + 1)}>
            {/* Назва в окремому елементі: на ховері їде вона, а не клітинка.
                Коли зсувалась клітинка, разом із нею їхав її фон, і смуга
                підсвітки розривалась. */}
            <th scope="row"><span className="price-table__name">{row.service}</span></th>
            {row.prices.map((p, i) => (
              <td key={i}>{p}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PriceSection() {
  const bookingClick = useBookingClick()
  const live = useLive()
  const rows = livePrices(live)
  return (
    <section className="band band--paper2 sec" id="services" data-logo="dark" aria-labelledby="services-title">
      {/* Прайс це просто ціни. Раніше блок відкривався поясненням рівнів
          («Ціна залежить від барбера. Рівень показує досвід, а не якість.»),
          і виходило, що ми виправдовуємось ще до того, як людина побачила
          цифри. Пояснення рівнів живе тепер біля фото майстрів, де самі
          рівні й видно. Мітка над заголовком тут не потрібна: вона
          повторювала б те саме слово.
          Виняток телефон: там рівень перемикають пігулками під заголовком,
          і один рядок каже, навіщо вони. На десктопі це видно з таблиці.
          Обидва варіанти прайсу лежать у розмітці, потрібний показує CSS
          (.price-narrow і .price-wide у garage.css). Коли вибирав скрипт,
          пререндер віддавав таблицю, і на телефоні вона стояла, поки
          вантажився застосунок, а потім стрибком мінялась на список. */}
      <Reveal className="sec__head" blur>
        <h2 id="services-title">Прайс</h2>
        <p className="lead price-narrow">Ціна залежить від рівня майстра.</p>
      </Reveal>

      <Reveal className="table-wrap" list>
        <div className="price-narrow">
          <PriceLevels rows={rows} />
        </div>
        <div className="price-wide">
          <PriceTable rows={rows} />
        </div>
      </Reveal>

      <Reveal className="section__foot">
        <a
          className="btn btn-primary btn-pill"
          href={BOOKING}
          target="_blank"
          rel="noopener"
          onClick={(e) => {
            track('booking_open', { source: 'price' })
            bookingClick(e)
          }}
        >
          <span>Записатись</span>
          <BtnIcon />
        </a>
        <p className="section__note">
          Ціни в гривнях, актуальні на {priceDate(live)} за даними онлайн-запису.
        </p>
      </Reveal>
    </section>
  )
}
