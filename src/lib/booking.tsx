import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Booking = { url: string; label: string }
const BookingCtx = createContext<(b: Booking) => void>(() => {})

export const useBooking = () => useContext(BookingCtx)

/**
 * Обробник для будь-якого посилання на запис, щоб усі кнопки поводились
 * однаково: раніше чіп часу відкривав віджет поверх сайту, а кожна
 * «Записатись» вела в нову вкладку.
 *
 * Звичайний клік відкриває вікно. Cmd, Ctrl, Shift і середня кнопка лишаються
 * за браузером, тобто «відкрити в новій вкладці» працює як і раніше, а без
 * скриптів посилання просто веде на Altegio.
 */
export function useBookingClick() {
  const open = useBooking()
  return useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, label = 'Онлайн-запис') => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      open({ url: e.currentTarget.href, label })
    },
    [open],
  )
}

/**
 * Віджет Altegio відкриваємо в нативному <dialog>, а не новою вкладкою:
 * людина лишається на сайті, а вихід назад це одна клавіша Esc.
 */
export function BookingProvider({ children }: { children: ReactNode }) {
  const [booking, setBooking] = useState<Booking | null>(null)
  /* Віджет Altegio малюється за 1,5–2,5 с, і весь цей час вікно було
     суцільно білим посеред темного сайту. Тепер до готовності стоїть темне
     тло з індикатором, а віджет проявляється, коли сам скаже, що готовий. */
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const open = useCallback((b: Booking) => {
    if (typeof dialogRef.current?.showModal !== 'function') {
      window.open(b.url, '_blank', 'noopener')
      return
    }
    setReady(false)
    setLoaded(false)
    setBooking(b)
  }, [])

  const close = useCallback(() => {
    dialogRef.current?.close()
    setBooking(null)
  }, [])

  useEffect(() => {
    if (booking) dialogRef.current?.showModal()
  }, [booking])

  /* Подія load тут зарано: після неї сторінка Altegio ще близько секунди
     порожня й біла. Готовність віджет повідомляє сам (inited і
     widget_loaded через postMessage), саме тоді, коли білий екран змінюється
     його власним темним. Якщо повідомлення не прийде, показуємо за 2,5 с
     після load, а без load за 8 с від відкриття: людина не має лишитись
     перед індикатором. */
  useEffect(() => {
    if (!booking || ready) return
    let origin = ''
    try { origin = new URL(booking.url).origin } catch { /* лишається порожнім */ }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin) return
      /* Приходить обʼєктом ({ type: 'inited' }, { action: 'widget_loaded' }),
         на випадок рядка теж дивимось. */
      let m: unknown = e.data
      if (typeof m === 'string') {
        try { m = JSON.parse(m) } catch { return }
      }
      const { type, action } = (m ?? {}) as { type?: unknown; action?: unknown }
      if ([type, action].some((v) => v === 'inited' || v === 'widget_loaded')) setReady(true)
    }
    window.addEventListener('message', onMessage)
    const t = window.setTimeout(() => setReady(true), loaded ? 2500 : 8000)
    return () => {
      window.removeEventListener('message', onMessage)
      window.clearTimeout(t)
    }
  }, [booking, ready, loaded])

  return (
    <BookingCtx.Provider value={open}>
      {children}
      <dialog
        className="booking"
        ref={dialogRef}
        aria-label="Онлайн-запис"
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) close()
        }}
      >
        <div className="booking__bar">
          <span className="booking__title">{booking?.label ?? 'Онлайн-запис'}</span>
          <a className="booking__ext" href={booking?.url ?? '#'} target="_blank" rel="noopener">
            Відкрити у новій вкладці
          </a>
          <button className="booking__close" type="button" aria-label="Закрити" onClick={close}>
            ×
          </button>
        </div>
        <div className="booking__body" aria-busy={booking ? !ready : undefined}>
          {booking && !ready && <span className="booking__wait" aria-hidden="true" />}
          <iframe
            className={`booking__frame${ready ? ' is-ready' : ''}`}
            title="Віджет онлайн-запису Altegio"
            src={booking?.url ?? 'about:blank'}
            onLoad={() => {
              /* about:blank після закриття теж «завантажується», його не рахуємо. */
              if (booking) setLoaded(true)
            }}
          />
        </div>
      </dialog>
    </BookingCtx.Provider>
  )
}
