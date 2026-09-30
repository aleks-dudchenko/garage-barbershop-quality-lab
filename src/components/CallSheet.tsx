import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { BOOKING, PHONE, PHONE_LABEL, PHONE_ALT, PHONE_ALT_LABEL } from './Header'
import { BtnIcon, CheckIcon, CloseIcon, CopyIcon, MoonIcon, PhoneIcon } from './Icons'
import { useBookingClick } from '@/lib/booking'
import { closedNow, OPENS, type Closed } from '@/lib/hours'
import { track } from '@/lib/track'

/**
 * «Подзвонити»: одна кнопка замість двох номерів у герої, а по ній вікно з
 * обома, lifecell першим, бо з нього салон дзвонить клієнтам. Те саме вікно
 * відкриває слухавка в шапці на телефоні.
 *
 * Вікно по центру на будь-якій ширині: кнопка стоїть посеред екрана, і вибір
 * зʼявляється там, де палець. Порівнювали ще аркуш знизу і системний список
 * телефона, обрали це (23.09.2026).
 *
 * Кнопка лишається посиланням tel: на головний номер: без скриптів вона
 * просто дзвонить, а зі скриптами відкриває вікно.
 */
type Open = (source: string) => boolean

/* lifecell першим: з нього салон сам дзвонить клієнтам, тож його впізнають. */
const LINES = [
  { tel: PHONE, label: PHONE_LABEL, op: 'lifecell · основний', line: 'lifecell' },
  { tel: PHONE_ALT, label: PHONE_ALT_LABEL, op: 'Київстар', line: 'kyivstar' },
] as const
const CallCtx = createContext<Open>(() => false)

/**
 * У буфер обміну. Вбудовані переглядачі (телеграм, інстаграм) і старі
 * браузери Clipboard API не мають або не пускають, тоді через тимчасове поле.
 * Поле кладемо всередину вікна: усе поза модальним вікном інертне.
 */
async function copyText(text: string, host: Element | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const back = document.activeElement as HTMLElement | null
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
    ;(host ?? document.body).appendChild(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    back?.focus({ preventScroll: true })
    return ok
  }
}

/**
 * «Скопіювати» біля номера. Уночі дзвонити нема кому, тож номер можна
 * забрати собі й набрати, коли відкриються; удень це шлях для ноутбука, з
 * якого не подзвониш. Після копіювання дві секунди стоїть галочка. Якщо
 * буфер недоступний, номер виділяється, щоб скопіювати його вручну.
 */
function CopyNumber({ label, onCopied }: { label: string; onCopied: (ok: boolean) => void }) {
  const [done, setDone] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className="call-copy"
      data-done={done || undefined}
      aria-label={`Скопіювати номер ${label}`}
      title="Скопіювати"
      onClick={async (e) => {
        const btn = e.currentTarget
        const ok = await copyText(label, btn.closest('dialog'))
        onCopied(ok)
        if (!ok) {
          const num = btn.closest('.call-opt')?.querySelector('.call-opt__num')
          if (num) window.getSelection()?.selectAllChildren(num)
          return
        }
        setDone(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setDone(false), 2000)
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

/**
 * Обробник для посилання-кнопки. Cmd, Ctrl, Shift і середня кнопка лишаються
 * за браузером; вікно відкриваємо лише на звичайний натиск.
 */
export function useCallClick(source: string) {
  const open = useContext(CallCtx)
  return useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (open(source)) e.preventDefault()
    },
    [open, source],
  )
}

export function CallProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [source, setSource] = useState('')
  const [closed, setClosed] = useState<Closed>(null)
  /* Для читача екрана: галочку він не побачить. Спершу порожньо, потім
     текст, щоб і повторне копіювання прозвучало. */
  const [said, setSaid] = useState('')
  const bookingClick = useBookingClick()

  const copied = useCallback(
    (line: string, ok: boolean) => {
      track('tel_copy', { source, line, closed: Boolean(closed), ok })
      setSaid('')
      if (ok) window.setTimeout(() => setSaid('Номер скопійовано'), 60)
    },
    [source, closed],
  )

  /* Повертає false, якщо вікно відкрити нема як: тоді посилання дзвонить
     на головний номер саме. */
  const open = useCallback<Open>((from) => {
    const d = ref.current
    if (!d || typeof d.showModal !== 'function') return false
    setSource(from)
    setClosed(closedNow())
    setSaid('')
    if (!d.open) {
      d.showModal()
      /* Сам showModal ставить фокус на першу кнопку всередині, тобто на
         хрестик, і на телефоні він одразу світився виділеним. Фокус
         забираємо на саме вікно: воно без обводки, а Tab далі веде до
         хрестика й номерів, як і має. */
      bodyRef.current?.focus({ preventScroll: true })
    }
    return true
  }, [])
  const close = useCallback(() => ref.current?.close(), [])

  return (
    <CallCtx.Provider value={open}>
      {children}
      <dialog
        className="call-sheet"
        ref={ref}
        aria-labelledby="call-sheet-title"
        onClick={(e) => {
          if (e.target === ref.current) close()
        }}
      >
        <div className="call-sheet__body" ref={bodyRef} tabIndex={-1}>
          <div className="call-sheet__head">
            <p className="call-sheet__title" id="call-sheet-title">Подзвонити в Garage</p>
            <button className="call-close" type="button" aria-label="Закрити" onClick={close}>
              <CloseIcon />
            </button>
          </div>
          {/* Третину онлайн-записів роблять з 20:00 до 9:00 (Altegio, вересень
              2026), коли слухавку ніхто не візьме. Тоді головна дія тут запис,
              а номери перестають бути посиланнями: дзвінок уночі або лишиться
              без відповіді, або розбудить адміністратора. Самі номери видно,
              поруч іконка «Скопіювати», а праворуч, з котрої години дзвонити. */}
          {closed && (
            <div className="call-closed">
              <p className="call-closed__text">
                <span className="moon-badge" aria-hidden="true"><MoonIcon /></span>
                <span>Зараз зачинено, відкриємося {closed === 'tomorrow' ? 'завтра ' : ''}о {OPENS}:00.</span>
              </p>
              <a
                className="btn btn-primary btn-pill btn-block"
                href={BOOKING}
                target="_blank"
                rel="noopener"
                onClick={(e) => {
                  track('booking_open', { source: 'call-closed', from: source })
                  close()
                  bookingClick(e)
                }}
              >
                <span>Записатись онлайн</span>
                <BtnIcon />
              </a>
            </div>
          )}
          {/* Удень дзвонить уся смужка: посилання розтягнуте на неї через
              ::after, а «Скопіювати» лежить зверху окремою кнопкою. */}
          {LINES.map((l) => (
            <div className={closed ? 'call-opt is-off' : 'call-opt'} key={l.line}>
              {closed ? (
                <span className="call-opt__text">
                  <span className="call-opt__num">{l.label}</span>
                  <span className="call-opt__op">{l.op}</span>
                </span>
              ) : (
                <a
                  className="call-opt__text call-opt__tel"
                  href={`tel:${l.tel}`}
                  onClick={() => {
                    track('tel_click', { source, line: l.line })
                    close()
                  }}
                >
                  <span className="call-opt__num">{l.label}</span>
                  <span className="call-opt__op">{l.op}</span>
                </a>
              )}
              <span className="call-opt__acts">
                <CopyNumber label={l.label} onCopied={(ok) => copied(l.line, ok)} />
                {closed ? (
                  <span className="call-opt__later">з {OPENS}:00</span>
                ) : (
                  <span className="call-opt__dial" aria-hidden="true"><PhoneIcon /></span>
                )}
              </span>
            </div>
          ))}
          <p className="sr-only" aria-live="polite">{said}</p>
        </div>
      </dialog>
    </CallCtx.Provider>
  )
}
