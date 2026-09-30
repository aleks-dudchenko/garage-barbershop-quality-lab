import { useEffect, type RefObject } from 'react'

/**
 * Шапка міняє тон за ґрунтом, який реально лежить під логотипом.
 * Питаємо документ через elementsFromPoint, а не перебираємо прямокутники
 * секцій: на межі перебір промахується, і одного разу він уже застряг на
 * <body>, чий прямокутник накриває всю сторінку. Прийом узятий із GBI.
 * Результат пишемо в data-logo на <body>, звідки його читає CSS.
 */
export function useHeaderTone(brandRef: RefObject<HTMLElement | null>, headerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const sync = () => {
      const brand = brandRef.current
      if (!brand) return
      /* Поки відкрите модальне вікно (дзвінок, запис), решта сторінки
         інертна, і elementsFromPoint її не бачить: під логотипом не
         знаходилось жодної секції, тон скидався на темний, і шапка
         міняла колір просто від натиску «Подзвонити». Під вікном нічого не
         рухається, тож тон лишаємо як був, доки вікно не закриють. */
      if (document.querySelector('dialog[open]')) return
      const box = brand.getBoundingClientRect()
      const stack = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      let tone = 'dark'
      for (const el of stack) {
        if (headerRef.current?.contains(el)) continue
        const zone = el.closest<HTMLElement>('[data-logo]:not(body)')
        if (zone?.dataset.logo) {
          tone = zone.dataset.logo
          break
        }
      }
      if (document.body.dataset.logo !== tone) document.body.dataset.logo = tone
      /* Прапорець для смуги блюру: є що розмивати лише після прокрутки. */
      const scrolled = window.scrollY > 24 ? 'true' : 'false'
      if (document.body.dataset.scrolled !== scrolled) document.body.dataset.scrolled = scrolled

      /* Прапорець для кнопки запису в шапці. На телефоні вона ховається,
         поки на екрані видно таку саму кнопку в герої: дві однакові
         пігулки на одному екрані це той самий заклик двічі. Міряємо саме
         кнопку, а не висоту героя: герой буває різної висоти. */
      const cta = document.querySelector('.hero__cta')?.getBoundingClientRect()
      const heroCta = cta && cta.bottom > box.bottom && cta.top < window.innerHeight ? 'on' : 'off'
      if (document.body.dataset.heroCta !== heroCta) document.body.dataset.heroCta = heroCta
    }

    /* Поки людина гортає, кнопка запису в шапці зʼявляється плавно; щойно
       перестала, анімацію знову вимкнено (див. .is-scrolling у garage.css).
       Пів секунди, щоб не обірвати перехід на 0,4 с посередині. */
    const root = document.documentElement
    let settle = 0
    const onScroll = () => {
      root.classList.add('is-scrolling')
      window.clearTimeout(settle)
      settle = window.setTimeout(() => root.classList.remove('is-scrolling'), 500)
      sync()
    }

    sync()
    const frame = requestAnimationFrame(sync)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', sync, { passive: true })
    /* Запасний тік: rAF не викликається у вкладці без композитингу. */
    const beat = window.setInterval(sync, 400)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(beat)
      window.clearTimeout(settle)
      root.classList.remove('is-scrolling')
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', sync)
    }
  }, [brandRef, headerRef])
}
