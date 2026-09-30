import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'
import { Star, TextIcon } from './Icons'
import { useLive, liveBarbers, livePrices, type LiveBarber } from '@/lib/live'
import { priceColumns } from '@/lib/prices'
import { groupDigits, plural, spellCount, votesTotal } from '@/lib/format'
import { track } from '@/lib/track'
import { useBookingClick } from '@/lib/booking'
import { staggerIndex } from '@/lib/utils'

const pad = (n: number) => (n < 10 ? '0' : '') + n

/* Послуга, ціну якої показуємо в картці майстра: та сама, що перший рядок
   прайсу, бо це те, по що приходять найчастіше. */
const HAIRCUT = 'Чоловіча стрижка'

const SIZES = '(min-width:1280px) 23vw, (min-width:1024px) 30vw, (min-width:640px) 45vw, 86vw'

/* Заголовок іде за живим списком: власник міняє склад команди з телеграма.
   Оцінки теж рахуємо з даних, інакше додали майстра і оновилась лише
   половина речення. */
function headline(count: number, votes: number) {
  const word = spellCount(count)
  return (
    word.charAt(0).toUpperCase() +
    word.slice(1) +
    ` ${plural(count, 'барбер', 'барбери', 'барберів')}, понад ${groupDigits(votes)} оцінок.`
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()

/**
 * Свої майстри мають і webp, і подвійний розмір. У доданих із телеграма є лише
 * jpg, тому для них <picture> не будуємо: браузер не відкочується на <img>,
 * якщо webp просто відсутній, і картка лишилась би з битим фото. Зовсім без
 * фото показуємо плитку з ініціалами.
 */
function BarberPhoto({ b }: { b: LiveBarber }) {
  if (b.photo === 'none') {
    return (
      <span className="barber__photo barber__photo--empty" aria-hidden="true">
        {initials(b.name)}
      </span>
    )
  }

  /* Фото, додане з телеграма, лежить не в збірці, а в сховищі, і його віддає
     воркер за адресою /uploads. Своїх майстрів це не стосується. */
  const img = (
    <img
      className="barber__photo"
      src={b.photo === 'jpg' ? `/uploads/${b.slug}.jpg` : `/img/barbers/${b.slug}.jpg`}
      width={600}
      height={800}
      alt=""
      draggable={false}
      loading={b.eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )

  if (b.photo === 'jpg') return img

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`/img/barbers/${b.slug}.webp 600w, /img/barbers/${b.slug}@2x.webp 900w`}
        sizes={SIZES}
      />
      {img}
    </picture>
  )
}

/**
 * Стрічка майстрів за каталогом GBI: палець гортає нативно, миша тягне,
 * після інерції доводимо до найближчої картки.
 *
 * Картки дробові (1.12 / 2.15 / 3.25): край наступної видно до краю екрана,
 * це підказка, що далі щось є. Ширину задає --card-w.
 *
 * CSS-снапу тут немає навмисно: він сварився з доводкою в JS, браузер тягнув
 * до своєї межі, скрипт до своєї, від того картки й сіпались.
 */
export function MastersSection() {
  /* Рівень і видимість майстра власник міняє з телеграма; поки нічого не
     міняли, це рівно той список, що лежить у збірці. */
  const live = useLive()
  const barbers = liveBarbers(live)
  const bookingClick = useBookingClick()

  /* Ціна стрижки для рівня майстра. Беремо з того самого прайсу, який
     власник править із телеграма, тому картка й таблиця нижче не розʼїдуться.
     Колонки прайсу підписані коротким рівнем, а в майстра він повний. */
  const haircut = livePrices(live).find((r) => r.service === HAIRCUT)
  const priceFor = (level: string) => {
    const i = priceColumns.indexOf(level.replace(' Барбер', '')) - 1
    return i >= 0 ? haircut?.prices[i] : undefined
  }
  const viewRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [maxIndex, setMaxIndex] = useState(0)
  /* Скільки карток видно одночасно. Потрібно лічильнику: він має називати
     останню видиму картку, а не позицію прокрутки. */
  const [visible, setVisible] = useState(1)
  const drag = useRef<{ id: number; x: number; left: number } | null>(null)
  const moved = useRef(false)
  const animating = useRef(0)
  const settle = useRef(0)
  const raf = useRef(0)
  const timer = useRef(0)

  const step = useCallback(() => {
    const track_ = viewRef.current?.firstElementChild
    if (!track_ || track_.children.length < 2) return viewRef.current?.clientWidth ?? 1
    const a = track_.children[0].getBoundingClientRect()
    const b = track_.children[1].getBoundingClientRect()
    return b.left - a.left
  }, [])

  const recalcMax = useCallback(() => {
    const v = viewRef.current
    if (!v) return
    const s = step()
    /* Вгору, а не до найближчого: інакше хвіст стрічки стає недосяжним,
       щойно остача менша за пів кроку, і доводчик тягне назад із краю, до
       якого щойно дотягли. Остання позиція упирається в кінець стрічки, це
       робить offsetFor. */
    const next = Math.max(0, Math.ceil((v.scrollWidth - v.clientWidth) / s))
    setMaxIndex(next)
    setVisible(Math.max(1, Math.round(v.clientWidth / s)))
    /* Номер беремо з реального положення стрічки, а не з памʼяті. Стрічка
       могла перемонтуватись зі scrollLeft = 0 (Reveal міняє тип елемента,
       коли браузер присипляє анімації у фоновій вкладці), а старий номер
       лишився б у кінці й гасив би стрілку «далі». */
    setIndex(Math.min(next, Math.max(0, Math.round(v.scrollLeft / s))))
  }, [step])

  /* Позиція стрічки для картки i, але не далі за її кінець. Без цього
     останній крок цілився б за межу, браузер обрізав би його, а доводчик
     повертав би назад. */
  const offsetFor = useCallback(
    (i: number) => {
      const v = viewRef.current
      if (!v) return 0
      return Math.min(i * step(), v.scrollWidth - v.clientWidth)
    },
    [step],
  )

  useEffect(() => {
    recalcMax()
    const v = viewRef.current
    if (!v) return
    /* Зміну складу команди ловить залежність barbers.length нижче: трек це
       flex без width: max-content, картки з нього виливаються, ширина боксу
       не міняється, і сам спостерігач на додавання майстра не спрацював би.
       Тут він потрібен для зміни вікна й дозавантаження шрифта, тому
       дивимось на саму картку, а не на трек. */
    const observer = new ResizeObserver(recalcMax)
    observer.observe(v)
    const card = v.firstElementChild?.firstElementChild
    if (card) observer.observe(card)
    return () => observer.disconnect()
  }, [recalcMax, barbers.length])

  /* Свій твін замість scroll-behavior: smooth. Крутимо і через rAF, і через
     таймер: у вкладці без композитингу rAF не викликається жодного разу,
     і тоді лічильник міняється, а стрічка стоїть на місці. */
  const tweenTo = useCallback((left: number, ms = 480) => {
    const v = viewRef.current
    if (!v) return
    cancelAnimationFrame(raf.current)
    clearTimeout(timer.current)
    const from = v.scrollLeft
    const delta = left - from
    const t0 = performance.now()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || ms === 0 || Math.abs(delta) < 1) {
      v.scrollLeft = left
      return
    }
    const frame = () => {
      cancelAnimationFrame(raf.current)
      clearTimeout(timer.current)
      const p = Math.min(1, (performance.now() - t0) / ms)
      v.scrollLeft = from + delta * (1 - Math.pow(1 - p, 4))
      if (p < 1) {
        raf.current = requestAnimationFrame(frame)
        timer.current = window.setTimeout(frame, 16)
      }
    }
    frame()
  }, [])

  /* Ref через функцію, а не просто useRef: якщо вузол стрічки змонтується
     наново (зі scrollLeft = 0), а сам компонент ні, ефект нижче не спрацював
     би, і номер картки лишився б від старого вузла. Раніше так робив Reveal,
     коли браузер присипляв анімації; тепер він тип елемента не міняє, але
     запобіжник дешевий. */
  const setView = useCallback(
    (node: HTMLDivElement | null) => {
      viewRef.current = node
      if (node) recalcMax()
    },
    [recalcMax],
  )

  const nearest = useCallback(() => {
    const v = viewRef.current
    if (!v) return 0
    /* Дотягнули до кінця стрічки: це остання картка, скільки б там не
       лишилось від кроку. */
    if (v.scrollLeft >= v.scrollWidth - v.clientWidth - 1) return maxIndex
    return Math.min(maxIndex, Math.max(0, Math.round(v.scrollLeft / step())))
  }, [maxIndex, step])

  const goTo = useCallback(
    (i: number) => {
      const next = Math.min(maxIndex, Math.max(0, i))
      setIndex(next)
      window.clearTimeout(animating.current)
      animating.current = window.setTimeout(() => (animating.current = 0), 700)
      tweenTo(offsetFor(next))
    },
    [maxIndex, offsetFor, tweenTo],
  )

  const onScroll = () => {
    if (animating.current) return
    setIndex(nearest())
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      if (drag.current || animating.current) return
      const i = nearest()
      setIndex(i)
      const left = offsetFor(i)
      if (Math.abs((viewRef.current?.scrollLeft ?? 0) - left) > 1) tweenTo(left, 260)
    }, 160)
  }

  return (
    <section className="band sec" id="masters" data-logo="dark" aria-labelledby="masters-title">
      <Reveal className="sec__head" blur>
        <p className="eyebrow">Майстри</p>
        <h2 id="masters-title">
          {headline(barbers.length, votesTotal(barbers.map((b) => b.votes)))}
        </h2>
        {/* Пояснення рівнів тут, а не в прайсі: рівень видно на плашці кожного
            фото, і саме тут у людини виникає питання, що він означає. */}
        <p className="lead">Рівень показує досвід, а не якість.</p>
      </Reveal>

      <Reveal className="carousel" list>
        {/* Стрічка навмисно поза табуляцією. Доки вона брала фокус, браузер
            на дотик робив із цього дві біди одразу: сам доводив її до
            видимої зони, тобто сіпав сторінку по вертикалі, і малював
            навколо рамку фокуса. Клавіатурі стрічка й без того доступна:
            Tab іде картками, і браузер підкручує стрічку сам, а кроками
            керують кнопки зі стрілками під нею. */}
        <div
          className="carousel__viewport"
          ref={setView}
          role="region"
          aria-label="Майстри, гортайте вбік"
          onScroll={onScroll}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return
            const view = e.currentTarget
            moved.current = false
            drag.current = { id: e.pointerId, x: e.clientX, left: view.scrollLeft }
            view.classList.add('is-dragging')
            /* Без setPointerCapture: із захопленням click діставався контейнеру,
               а не посиланню в картці, і майстри не відкривались. Рух і
               відпускання ловимо на window, щоб перетягування не рвалось,
               коли курсор виходить за межі стрічки. */
            const onMove = (ev: PointerEvent) => {
              const d = drag.current
              if (!d || d.id !== ev.pointerId) return
              const dist = ev.clientX - d.x
              if (Math.abs(dist) > 5) moved.current = true
              view.scrollLeft = d.left - dist
            }
            const onUp = (ev: PointerEvent) => {
              if (!drag.current || drag.current.id !== ev.pointerId) return
              drag.current = null
              view.classList.remove('is-dragging')
              window.removeEventListener('pointermove', onMove)
              window.removeEventListener('pointerup', onUp)
              window.removeEventListener('pointercancel', onUp)
              goTo(nearest())
              setTimeout(() => (moved.current = false), 0)
            }
            window.addEventListener('pointermove', onMove)
            window.addEventListener('pointerup', onUp)
            window.addEventListener('pointercancel', onUp)
          }}
          /* Перетягування не повинно спрацювати як відкриття запису. */
          onClickCapture={(e) => {
            if (moved.current) { e.preventDefault(); e.stopPropagation() }
          }}
        >
          <div className="carousel__track stagger">
            {barbers.map((b, i) => (
              <article className="barber" key={b.id} style={staggerIndex(i)}>
                <a
                  className="barber__card"
                  href={b.href}
                  target="_blank"
                  rel="noopener"
                  aria-label={
                    b.rating
                      ? `Записатись до майстра ${b.name}, ${b.level}, рейтинг ${b.rating} з ${b.votes}`
                      : `Записатись до майстра ${b.name}, ${b.level}`
                  }
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onClick={(e) => {
                    track('booking_open', { source: 'master', master: b.id })
                    bookingClick(e, b.name)
                  }}
                >
                  <span className="barber__frame">
                    <BarberPhoto b={b} />
                    <span className={`barber__level${b.top ? ' barber__level--top' : ''}`}>{b.level}</span>
                  </span>
                  <span className="barber__body">
                    <span className="barber__name">
                      <span>{b.name}</span>
                      <TextIcon />
                    </span>
                    {/* Оцінка й ціна одним рядком через крапку. Ціна стрижки
                        саме цього рівня, з того самого прайсу, що нижче на
                        сторінці: без неї картка не відповідала на перше
                        питання, яке ставлять до майстра. */}
                    <span className="barber__meta">
                      {b.rating ? (
                        <span className="barber__rate">
                          <span className="barber__star" aria-hidden="true"><Star /></span>
                          <strong>{b.rating}</strong> {b.votes}
                        </span>
                      ) : (
                        <span className="barber__rate">Новий у команді</span>
                      )}
                      {priceFor(b.level) && (
                        <span className="barber__price">Стрижка {priceFor(b.level)} грн</span>
                      )}
                    </span>
                  </span>
                </a>
              </article>
            ))}
          </div>
        </div>

        {/* Лічильник і стрілки приходять слідом за першими картками, а не
            стоять готові ще до них: див. .stagger-item. */}
        <div className="carousel__foot stagger-item" style={staggerIndex(3)}>
          {/* Називаємо останню видиму картку, а не позицію прокрутки: на
              десктопі видно три картки одразу, і при девʼяти майстрах
              лічильник застрягав на «07 / 09» при показаних усіх девʼяти. */}
          <span className="carousel__count">
            {pad(Math.min(barbers.length, index + visible))} / {pad(barbers.length)}
          </span>
          <div className="carousel__nav">
            <button
              className="btn-round"
              type="button"
              aria-label="Попередній майстер"
              disabled={index <= 0}
              onClick={() => goTo(index - 1)}
            >
              <ArrowLeft />
            </button>
            <button
              className="btn-round"
              type="button"
              aria-label="Наступний майстер"
              disabled={index >= maxIndex}
              onClick={() => goTo(index + 1)}
            >
              <ArrowRight />
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
