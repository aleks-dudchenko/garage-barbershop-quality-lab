import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Reveal } from './Reveal'
import { PlusIcon } from './Icons'
import { BOOKING, PHONE, PHONE_LABEL } from './Header'
import { track } from '@/lib/track'
import { useBookingClick } from '@/lib/booking'
import { staggerIndex } from '@/lib/utils'

/**
 * Часті питання.
 *
 * Тут лише відповіді, звірені з онлайн-записом. Про прихід без запису,
 * оплату, запізнення і термін сертифіката спершу скаже власник: відповідь у FAQ
 * людина читає як правило закладу, тож вгадувати її не можна.
 *
 * Про запис навмисно не пишемо «оберіть вільне вікно на сайті»: панель вікон
 * поки показує демонстраційні години, а не справжній розклад.
 *
 * Питання це нативні <details>. Вони відкриваються без скриптів, а відповіді
 * лежать у пререндері, тож пошук їх бачить, хоч на екрані вони згорнуті.
 * Спільне name робить з них акордеон: відкрите питання закриває попереднє,
 * і це теж робить сам браузер. Старі браузери просто лишать відкритими обидва.
 */
export function FaqSection() {
  const bookingClick = useBookingClick()
  const ref = useRef<HTMLElement>(null)
  useSmoothAnswers(ref)

  const items: { id: string; q: string; a: ReactNode }[] = [
    {
      id: 'duration',
      q: 'Скільки триває стрижка?',
      a: 'Чоловіча стрижка займає близько години, разом із бородою півтори-дві. Точний час видно під час запису.',
    },
    {
      id: 'kids',
      q: 'До якого віку дитяча стрижка?',
      a: 'До 10\u00a0років включно. Якщо приходите із сином, є «Батько\u00a0+\u00a0син»: один запис на двох, близько двох годин.',
    },
    {
      id: 'levels',
      q: 'Чим відрізняються рівні барберів?',
      a: 'Рівні відрізняються досвідом і ціною. Вартість послуги для кожного майстра видно під час запису.',
    },
    {
      id: 'booking',
      q: 'Як записатися?',
      a: (
        <>
          Відкрийте{' '}
          <a
            href={BOOKING}
            target="_blank"
            rel="noopener"
            onClick={(e) => {
              track('booking_open', { source: 'faq' })
              bookingClick(e)
            }}
          >
            онлайн-запис
          </a>
          , оберіть послугу, майстра та зручний час. Або зателефонуйте:{' '}
          <a className="faq__tel" href={`tel:${PHONE}`} onClick={() => track('tel_click', { source: 'faq' })}>
            {PHONE_LABEL}
          </a>
          .
        </>
      ),
    },
  ]

  return (
    <section className="band band--paper2 sec" id="faq" data-logo="dark" aria-labelledby="faq-title" ref={ref}>
      <div className="faq">
        <Reveal className="sec__head" blur>
          <h2 id="faq-title">Часті питання</h2>
        </Reveal>
        <Reveal className="faq__list stagger" delay={0.06} list>
          {items.map(({ id, q, a }, i) => (
            <details className="faq__item" name="faq" key={id} style={staggerIndex(i)}>
              <summary className="faq__q">
                <span>{q}</span>
                <span className="faq__icon" aria-hidden="true">
                  <PlusIcon />
                </span>
              </summary>
              <div className="faq__a">
                <p>{a}</p>
              </div>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

/* Та сама крива й тривалість, що в CSS-переходах питання (garage.css). */
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const MS = 450

/**
 * Висота відповіді там, де браузер не вміє анімувати до auto.
 *
 * Chrome розгортає відповідь сам, через interpolate-size у garage.css.
 * Safari, тобто кожен iPhone, цього не вміє і відкривав відповідь стрибком,
 * хоча кружок і поле питання в той самий момент їхали плавно. Тут висоту
 * міряємо руками, як Disclosure з motion-primitives без бібліотеки:
 * зафіксувати поточну, змусити розкладку, націлити, а в кінці віддати
 * назад auto, щоб текст, що переноситься інакше, не різався числом.
 *
 * Акордеон за спільним name у цьому разі ведемо самі: браузер закривав би
 * попереднє питання миттєво, ще до анімації.
 */
function useSmoothAnswers(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const box = root.current
    if (!box || typeof CSS === 'undefined' || CSS.supports('interpolate-size', 'allow-keywords')) return
    const items = [...box.querySelectorAll<HTMLDetailsElement>('details.faq__item')]
    items.forEach((d) => d.removeAttribute('name'))
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stops = new Map<HTMLElement, () => void>()

    const run = (d: HTMLDetailsElement, open: boolean) => {
      const a = d.querySelector<HTMLElement>('.faq__a')
      if (!a || still.matches) {
        delete d.dataset.closing
        d.open = open
        return
      }
      /* Натиснули посеред руху: стартуємо з тієї висоти, де він зупинився. */
      stops.get(a)?.()
      const from = d.open ? a.getBoundingClientRect().height : 0
      if (open) {
        delete d.dataset.closing
        d.open = true
      } else {
        d.dataset.closing = ''
      }
      const to = open ? a.scrollHeight : 0
      a.style.overflow = 'hidden'
      a.style.transition = 'none'
      a.style.height = `${from}px`
      void a.offsetHeight
      a.style.transition = `height ${MS}ms ${EASE}, opacity 0.35s ${EASE}`
      a.style.opacity = open ? '' : '0'
      a.style.height = `${to}px`

      let timer = 0
      const cancel = () => {
        window.clearTimeout(timer)
        a.removeEventListener('transitionend', onEnd)
        stops.delete(a)
      }
      const finish = () => {
        cancel()
        a.style.height = a.style.overflow = a.style.transition = a.style.opacity = ''
        if (!open) {
          d.open = false
          delete d.dataset.closing
        }
      }
      const onEnd = (e: TransitionEvent) => {
        if (e.target === a && e.propertyName === 'height') finish()
      }
      a.addEventListener('transitionend', onEnd)
      timer = window.setTimeout(finish, MS + 100)
      stops.set(a, cancel)
    }

    const onClick = (e: MouseEvent) => {
      const summary = (e.target as Element).closest('summary')
      const d = summary?.parentElement
      if (!(d instanceof HTMLDetailsElement) || !items.includes(d)) return
      e.preventDefault()
      const opening = !d.open || d.dataset.closing !== undefined
      if (opening) items.forEach((other) => other !== d && other.open && run(other, false))
      run(d, opening)
    }
    box.addEventListener('click', onClick)
    return () => box.removeEventListener('click', onClick)
  }, [root])
}
