import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

type RevealWindow = Window & { garageReveal?: (el: Element) => void }

/**
 * Поява блоку при прокрутці.
 *
 * У розмітці блок видимий, ховає його лише CSS і лише тоді, коли на сторінці
 * працює скрипт: клас js на <html> ставить рядок в index.html. Раніше появу
 * робив motion, і пререндер віддавав блоки з opacity: 0, тож поки не
 * завантажиться JS, а без нього взагалі, сторінка під героєм була порожня.
 * CSS ще й не залежить від кадрового циклу: у фоновій вкладці перехід
 * просто завершується, а не застрягає на нулі.
 *
 * Показує блок (клас is-in) теж скрипт з index.html, а не цей компонент:
 * той спрацьовує, щойно браузер розібрав розмітку, і не чекає, поки
 * завантажиться й оживе весь застосунок. Коли чекав, на повільному
 * мобільному розділи під героєм по кілька секунд лишались порожніми.
 * Тут блок лише реєструється, якщо зʼявився вже після того скрипта
 * (розробка без пререндера, перемонтування). className навмисно
 * незмінний: React не чіпає атрибут, поки значення те саме, тож не знімає
 * is-in, поставлений поза ним.
 *
 * Сам рух описаний у garage.css (.reveal).
 * blur: розмиття лишаємо лише текстовим блокам із заголовком, на великих
 * блоках із фото, таблицею чи картою воно найдорожче для телефона.
 * list: блок стоїть на місці, а по черзі приходять пункти всередині
 * (.stagger, у кожного свій --i).
 */
export function Reveal({
  children,
  className,
  id,
  delay = 0,
  blur = false,
  list = false,
}: {
  children: ReactNode
  className?: string
  id?: string
  delay?: number
  blur?: boolean
  list?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const watch = (window as RevealWindow).garageReveal
    /* Без спостерігача блок просто показуємо: інакше відкрити його нікому. */
    if (watch) watch(el)
    else el.classList.add('is-in')
  }, [])

  const cls = ['reveal', blur && 'reveal--blur', list && 'reveal--list', className].filter(Boolean).join(' ')
  const style = delay ? ({ '--reveal-delay': `${delay}s` } as CSSProperties) : undefined

  return (
    <div ref={ref} className={cls} id={id} style={style} suppressHydrationWarning>
      {children}
    </div>
  )
}
