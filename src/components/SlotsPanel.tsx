import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useFrameloopStalled } from '@/hooks/useFrameloopStalled'
import { ArrowRight, Star, TextIcon } from './Icons'
import { barbers } from '@/lib/barbers'
import { useLive, visibleMasterIds } from '@/lib/live'
import { usePreviewScenario } from '@/lib/preview'
import { rememberMaster, useLastMaster } from '@/lib/lastMaster'
import { groupDigits } from '@/lib/format'
import { useBooking, useBookingClick } from '@/lib/booking'
import { track } from '@/lib/track'
import { pickByLevels, slotsVariant } from '@/lib/slotsTest'
import { EASE } from './Header'
import {
  clock,
  dayLabel,
  deepLink,
  masterLink,
  slotDate,
  type Availability,
  type ServiceKey,
} from '@/lib/availability'

/* Скільки вікон показуємо в рядку. Коли їх більше, останнє місце віддаємо
   чіпу «усі»: у полі 446 px чотири чіпи разом з «усі» дають 488 px, і він
   ріже правий край плашки. Три плюс «усі» це 364 px, влазить із запасом. */
const MAX_CHIPS = 4
const MAX_WITH_MORE = 3
/* Фото беремо з картки майстра: id в Altegio ті самі. */
const slugById = new Map(barbers.map((b) => [Number(b.id), b.slug]))
/* За тим, як часто їх замовляють (Altegio, 30 днів до 23.09.2026): стрижка
   52%, стрижка з бородою 20%, дитяча 9%, борода 7%. */
const SERVICES: Array<[ServiceKey, string]> = [
  ['haircut', 'Стрижка'],
  ['combo', 'Комплекс'],
  ['kids', 'Дитяча'],
  ['beard', 'Борода'],
]

/**
 * Троє майстрів, бо двоє виглядали як «більше нікого немає». На зовсім
 * низьких екранах лишаємо двох: там третій рядок виштовхував кнопку запису
 * за межі першого екрана.
 */
/**
 * У списку барберів слово «Барбер» у рівні нічого не додає, зате «Молодший
 * Барбер» не влазить у колонку на телефоні й переносить рядок, через що
 * картка стає вищою за сусідні. Лишається Молодший / Барбер / Старший / Топ.
 * У картках майстрів і в прайсі рівень пишеться повністю.
 */
function shortLevel(level: string) {
  return level.replace(' Барбер', '')
}

function maxMasters() {
  return window.innerHeight < 700 ? 2 : 3
}

/* На вузькому екрані три чіпи разом із «усі» не влазять у плашку і чіп
   ріжеться правим краєм, тому там показуємо два. */
function maxWithMore() {
  return window.innerWidth < 640 ? 2 : MAX_WITH_MORE
}

export function SlotsPanel() {
  const [data, setData] = useState<Availability | null>(null)
  const [failed, setFailed] = useState(false)
  const [service, setService] = useState<ServiceKey>('haircut')
  const [limit, setLimit] = useState(3)
  const [chipLimit, setChipLimit] = useState(MAX_WITH_MORE)
  const openBooking = useBooking()
  const bookingClick = useBookingClick()
  const stalled = useFrameloopStalled()

  useEffect(() => {
    const apply = () => {
      setLimit(maxMasters())
      setChipLimit(maxWithMore())
    }
    apply()
    const onResize = apply
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let alive = true
    let retry = 0
    /* Мобільний інтернет часом губить запит, і одна невдача ховала плашку до
       кінця візиту: вертала її лише перезавантажена сторінка. Тому ще дві
       спроби, через 1,5 і 4 с, і лише після них плашки немає. */
    const load = (attempt: number) => {
      fetch('/data/availability.json', { cache: 'no-store' })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status))
          return r.json() as Promise<Availability>
        })
        .then((json) => {
          if (!alive) return
          setData(json)
          track('slots_shown', { mock: !!json.mock_slots, variant: slotsVariant() })
        })
        .catch(() => {
          if (!alive) return
          if (attempt < 2) retry = window.setTimeout(() => load(attempt + 1), attempt ? 4000 : 1500)
          else setFailed(true)
        })
    }
    load(0)
    return () => {
      alive = false
      window.clearTimeout(retry)
    }
  }, [])

  /* Прибрані з телеграма майстри не мають світитись і тут: у панелі свої дані
     з Altegio, тож звіряємось за числовим id, а не за слугом. null означає,
     що живого списку немає і показуємо всіх. */
  const live = useLive()
  const visible = useMemo(() => visibleMasterIds(live), [live])

  /* Спершу впорядкувати за найближчим вільним вікном, потім відрізати хвіст.
     Вікна беремо саме для обраної послуги: комплекс довший за стрижку, і
     вікно під стрижку може для нього не підійти. */
  const ranked = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    return data.masters
      .filter((m) => !visible || visible.has(Number(m.id)))
      .map((m) => {
        const upcoming = (m.slots_by_service?.[service] ?? m.slots ?? [])
          .map(slotDate)
          .filter((d) => +d > now)
          .sort((a, b) => +a - +b)
        return { master: m, upcoming, next: upcoming[0] ? +upcoming[0] : Infinity }
      })
      .sort((a, b) => a.next - b.next)
  }, [data, visible, service])

  /* Показові стани для розмови з власником: «усе зайнято», «лишилось одне
     пізнє вікно», «панелі немає». Вмикаються лише адресою з ?demo і лише в
     цій вкладці. Справжній розклад при цьому не чіпається, ми інакше
     показуємо ті самі дані. */
  const scenario = usePreviewScenario() ?? 'auto'
  const last = useLastMaster()
  const staged = useMemo(() => {
    if (scenario === 'none') return ranked.map((r) => ({ ...r, upcoming: [] }))
    /* Лишаємо по одному найпізнішому вікну у двох майстрів, решта зайняті.
       Після цього обовʼязково впорядкувати наново: сценарій вирізає вікна
       вже після сортування, і майстер із єдиним вільним завтра опинявся
       нижче за того, в кого не лишилось нічого. */
    if (scenario === 'few') {
      return ranked
        .map((r, i) => {
          const upcoming = i < 2 ? r.upcoming.slice(-1) : []
          return { ...r, upcoming, next: upcoming[0] ? +upcoming[0] : Infinity }
        })
        .sort((a, b) => a.next - b.next)
    }
    return ranked
  }, [ranked, scenario])

  if (failed || scenario === 'off') return null

  const base = data?.widget.base ?? 'https://n100000.alteg.io/'

  /* Кого людина обирала минулого разу, той іде першим: постійному клієнту
     не треба шукати свого серед дев'яти. Решта порядку не міняється. */
  const ordered = last
    ? [...staged].sort((a, b) => Number(b.master.id === last.id) - Number(a.master.id === last.id))
    : staged
  /* A/B-тест, див. slotsTest.ts. Варіант визначаємо лише тоді, коли панелі
     є що показати: відвідувач без панелі в тесті не бере участі. */
  const variant = data ? slotsVariant() : 'A'
  const shown = variant === 'B' ? pickByLevels(staged, limit, last?.id) : ordered.slice(0, limit)

  /* Найраніше вікно з тих, що на екрані. Позначка була привʼязана до першого
     рядка, але запамʼятаний майстер піднімається нагору, і вона сідала на
     слот, який не є найранішим. */
  const soonest = Math.min(...shown.map((r) => r.next))

  /* Коли порожньо в усіх, три однакові рядки «вікон немає» читаються як
     поломка сайту, а не як зайнятий день. Кажемо це один раз. */
  const allBusy = shown.length > 0 && shown.every((r) => r.upcoming.length === 0)

  return (
    <div className="slots" aria-labelledby="slots-title">
      <div className="slots__head">
        <h2 className="slots__title" id="slots-title">Вільні вікна</h2>
        {/* Не обіцяємо «сьогодні та завтра»: у зайнятий день найближче вікно
            буває через три дні, і показати його корисніше, ніж написати, що
            вікон немає. Дата стоїть на самому чипі. */}
        <span className="slots__meta">найближчі</span>
      </div>

      <fieldset className="seg">
        <legend className="sr-only">Послуга</legend>
        {SERVICES.map(([key, label]) => (
          <label className="seg__item" key={key}>
            <input
              type="radio"
              name="service"
              value={key}
              checked={service === key}
              onChange={() => setService(key)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <div className="slots__list" aria-live="polite" aria-busy={!data}>
        {/* Заглушок стільки ж, скільки буде майстрів. Було дві на три
            справжні, і коли приходили вікна, третій рядок вискакував і
            розсував плашку на весь свій зріст. */}
        {!data &&
          Array.from({ length: limit }, (_, i) => (
            <div className="master-row is-skeleton" key={i} aria-hidden="true">
              <div className="master-row__head">
                <span className="sk sk--avatar" />
                <span className="sk sk--name" />
                <span className="sk sk--price" />
              </div>
              <div className="chips">
                <span className="sk sk--chip" />
                <span className="sk sk--chip" />
                <span className="sk sk--chip" />
              </div>
            </div>
          ))}

          {allBusy && (
            /* Приходить так само, як рядки, яких тут замість нього немає. */
            <motion.p
              key={`busy:${service}:${stalled ? 1 : 0}`}
              className="slots__busy"
              initial={stalled ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
              Зараз усе розібрали. Пізніші дати відкриваються у віджеті, там же
              видно, коли хто звільняється.
            </motion.p>
          )}

          {!allBusy &&
            shown.map(({ master, upcoming }, row) => {
            const svc = master.services[service]
            /* Рядок «свого» майстра позначений і на собі: кільце довкола
               аватара читається швидше за підпис. */
            const rowClass = `master-row${last?.id === master.id ? ' is-mine' : ''}`
            /* Рядок це один і той самий motion.div, а не компонент, оголошений
               тут же: такий компонент на кожному рендері новий, і React
               перемонтовував рядки від будь-якого оновлення панелі, тож вони
               знову виїжджали, а аватарки створювались наново. Поява
               повторюється навмисно лише зі зміною послуги, бо та в ключі.
               stalled теж у ключі: без живих кадрів рядок лишився б на
               opacity 0, тож він монтується наново вже без анімації. */
            return (
              <motion.div
                key={`${service}:${master.id}:${stalled ? 1 : 0}`}
                className={rowClass}
                initial={stalled ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: EASE, delay: row * 0.04 }}
              >
                <div className="master-row__head">
                  {slugById.get(master.id) && (
                    <img
                      className="master-row__avatar"
                      src={`/img/barbers/avatar/${slugById.get(master.id)}-96.jpg`}
                      srcSet={`/img/barbers/avatar/${slugById.get(master.id)}-96.webp 1x, /img/barbers/avatar/${slugById.get(master.id)}-192.webp 2x`}
                      width={44}
                      height={44}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span className="master-row__who">
                    <span className="master-row__name">{master.name}</span>
                    <span className="master-row__meta">
                      {/* Стоїть тут, а не біля імені: поруч з імʼям позначка не
                          влазила у вузьку колонку, переносилась і розсувала
                          рядок. Тут вона в одному потоці з рівнем і рейтингом
                          і нічого не рухає. */}
                      {last?.id === master.id ? (
                        /* Замість рівня, а не поруч із ним: у колонку 182 px
                           обидва разом не влазять і переносяться, роблячи
                           картку вищою за сусідні. Та й «ваш барбер» уже
                           каже, ким ця людина є для відвідувача, а «Барбер»
                           поруч лише повторює. */
                        <span className="master-row__mine" title="Цього майстра ви обирали минулого разу">
                          Останній запис
                        </span>
                      ) : (
                        master.level && <span className="master-row__role">{shortLevel(master.level)}</span>
                      )}
                      {master.rating && (
                        <span className="master-row__rating">
                          <Star />
                          {String(master.rating).replace('.', ',')}
                          {/* У рядку з позначкою кількість відгуків знімаємо:
                              «Останній запис» ширший за рівень, який він
                              замінив, і разом вони не влазять у колонку 182 px.
                              Тому, до кого вже ходив, кількість чужих відгуків
                              потрібна найменше. */}
                          {master.reviews && last?.id !== master.id ? (
                            <span className="master-row__reviews">{groupDigits(master.reviews)}</span>
                          ) : null}
                        </span>
                      )}
                    </span>
                  </span>
                  {svc?.price && <span className="master-row__price">{svc.price} грн</span>}
                </div>

                {upcoming.length === 0 ? (
                  <p className="master-row__empty">
                    Найближчим часом вікон немає.{' '}
                    <a
                      href={masterLink(base, master.id)}
                      target="_blank"
                      rel="noopener"
                      onClick={(e) => bookingClick(e, master.name)}
                    >
                      Дивитись розклад<span className="link-arrow"><ArrowRight /></span>
                    </a>
                  </p>
                ) : (
                  <div className="chips">
                    {upcoming
                      .slice(0, upcoming.length > MAX_CHIPS ? chipLimit : MAX_CHIPS)
                      .map((d, i) => (
                      <button
                        className={`chip${+d === soonest ? ' chip--nearest' : ''}`}
                        type="button"
                        key={+d}
                        aria-label={`${master.name}, ${dayLabel(d).toLowerCase()} о ${clock(d)}`}
                        onClick={() => {
                          track('slot_tap', {
                            master: master.id,
                            level: master.level,
                            price: svc?.price ?? null,
                            service,
                            datetime: d.toISOString(),
                            position: i,
                            row,
                            variant,
                          })
                          track('booking_open', { source: 'slots', variant })
                          /* Наступного разу цей майстер буде першим у списку. */
                          rememberMaster(master.id, master.name)
                          openBooking({
                            url: deepLink(base, master.id, svc?.id, d, `slots-${variant.toLowerCase()}`),
                            label: `${master.name}, ${dayLabel(d).toLowerCase()} ${clock(d)}`,
                          })
                        }}
                      >
                        <small>{dayLabel(d)}</small>
                        {clock(d)}
                      </button>
                    ))}
                    {upcoming.length > MAX_CHIPS && (
                      <a
                        className="chip chip--more"
                        href={masterLink(base, master.id)}
                        target="_blank"
                        rel="noopener"
                        aria-label={`Усі вікна майстра ${master.name}`}
                        onClick={(e) => bookingClick(e, `${master.name}, усі вікна`)}
                      >
                        усі<span className="link-arrow"><ArrowRight /></span>
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
              )
            })}

      </div>

      <p className="slots__foot">
        <a
          className="btn-text"
          href={base}
          target="_blank"
          rel="noopener"
          onClick={(e) => {
            track('booking_open', { source: 'slots-all', variant })
            bookingClick(e, 'Усі вікна')
          }}
        >
          <span>Усі вікна у віджеті</span>
          <TextIcon />
        </a>
      </p>
    </div>
  )
}
