import { useRef } from 'react'
import { motion } from 'motion/react'
import { BtnIcon, PhoneIcon } from './Icons'
import { useHeaderTone } from '@/hooks/useHeaderTone'
import { useFrameloopStalled } from '@/hooks/useFrameloopStalled'
import { useActiveSection } from '@/hooks/useActiveSection'
import { track } from '@/lib/track'
import { useBookingClick } from '@/lib/booking'
import { useCallClick } from './CallSheet'

const NAV = [
  ['Прайс', '#services'],
  ['Майстри', '#masters'],
  ['Контакти', '#contacts'],
] as const

const BOOKING = 'https://n100000.alteg.io/'
/* Головний телефон салону, lifecell. З нього салон сам дзвонить клієнтам,
   тож саме цей номер люди впізнають: на дзвінок із Київстару часом не
   відповідали, не знаючи, що це барбершоп (адміністраторка, 23.09.2026).
   Київстар лишається другим. Обидва у вікні «Подзвонити» (CallSheet) і в
   контактах, головний ще у FAQ і біля сертифіката. */
const PHONE = '+380000000001'
const PHONE_LABEL = '+380 00 000 00 01'
const PHONE_ALT = '+380000000002'
const PHONE_ALT_LABEL = '+380 00 000 00 02'
const SECTION_IDS = NAV.map(([, href]) => href.slice(1))
const EASE = [0.22, 1, 0.36, 1] as const

function Brand() {
  return (
    <>
      <span className="brand__mark" aria-hidden="true" />
      <span className="brand__word" aria-hidden="true" />
      <span className="sr-only">Garage Barbershop</span>
    </>
  )
}

/**
 * Шапка: знак, дзвінок і запис.
 *
 * Бургера тут немає навмисно. Сайт односторінковий, і меню ховало три якорі
 * тієї самої сторінки, до яких усе одно доводиться прокручувати. Замість
 * нього на вузькому екрані стоїть головна дія, кнопка запису: вона на
 * телефоні потрібніша за перехід до прайсу.
 *
 * Пункти меню лишаються з планшета й ширше, у тій самій пігулці, що номер
 * і кнопка.
 */
export function Header() {
  const headerRef = useRef<HTMLElement>(null)
  const brandRef = useRef<HTMLAnchorElement>(null)
  const callClick = useCallClick('header')
  const stalled = useFrameloopStalled()
  const active = useActiveSection(SECTION_IDS)
  const bookingClick = useBookingClick()
  useHeaderTone(brandRef, headerRef)

  return (
    <>
      <div className="header__blur" aria-hidden="true"><span /></div>
      <header className="site-header" ref={headerRef}>
        <div className="header__inner">
          <a className="brand" href="#top" ref={brandRef} aria-label="Garage Barbershop, на початок">
            <Brand />
          </a>

          {/* На вузькому екрані замість номера кнопка-слухавка: повний номер
              там не влазить, а дзвінок потрібен. Відкриває те саме вікно з
              обома номерами, що й «Подзвонити» в герої. */}
          <a className="header__call" href={`tel:${PHONE}`} aria-label="Подзвонити" onClick={callClick}>
            <PhoneIcon />
          </a>

          <nav className="nav" aria-label="Основна навігація">
            <ul className="nav__list">
              {NAV.map(([label, href]) => {
                const isActive = active === href.slice(1)
                return (
                  <li key={href}>
                    {/* Одна пігулка на весь список: layoutId змушує motion
                        перевезти її від старого пункту до нового, а не
                        згасити й запалити. Без живих кадрів стоїть на місці. */}
                    {isActive &&
                      (stalled ? (
                        <span className="nav__pill" />
                      ) : (
                        <motion.span
                          className="nav__pill"
                          layoutId="nav-pill"
                          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                        />
                      ))}
                    <a href={href} className={isActive ? 'is-active' : undefined} aria-current={isActive ? 'true' : undefined}>
                      {label}
                    </a>
                  </li>
                )
              })}
            </ul>

            {/* «Подзвонити» і кнопка запису стоять усередині тієї самої
                пігулки, що й пункти меню, як у GBI: там це один блок, а не
                три окремі елементи в рядку. Риска відділяє їх від посилань.
                Тут був один номер, а номерів у салону два, тож тепер це те
                саме вікно з обома, що й у герої та за слухавкою на телефоні. */}
            <a className="header__tel" href={`tel:${PHONE}`} onClick={callClick}>
              <PhoneIcon />
              <span>Подзвонити</span>
            </a>

            <a
              className="btn btn-primary btn-pill-sm header__cta"
              href={BOOKING}
              target="_blank"
              rel="noopener"
              onClick={(e) => {
                track('booking_open', { source: 'header', closed: 'closed' in document.documentElement.dataset })
                bookingClick(e)
              }}
            >
              <span>Записатись</span>
              <BtnIcon />
            </a>
          </nav>
        </div>
      </header>
    </>
  )
}

export { Brand, BOOKING, EASE, NAV, PHONE, PHONE_LABEL, PHONE_ALT, PHONE_ALT_LABEL }
