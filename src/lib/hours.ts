/**
 * Години роботи салону: щодня з 09:00 до 20:00, як у контактах.
 *
 * Та сама перевірка є ще в index.html, у скрипті в <head>: там вона ставить
 * data-closed ще до першого кадру, щоб смуга «зачинено» не штовхала сторінку вниз
 * уже після того, як людина почала читати. Змінюючи години, міняти
 * обидва місця.
 */
export const OPENS = 9
export const CLOSES = 20

/** Коли салон відкриється, якщо зараз зачинено: сьогодні вранці чи завтра. */
export type Closed = 'today' | 'tomorrow' | null

/**
 * Годинник салону, а не відвідувача: людина може бути в іншому поясі.
 * Старі браузери знають пояс лише під давньою назвою Europe/Kiev.
 */
function salonHour(): number | null {
  for (const timeZone of ['Europe/Kyiv', 'Europe/Kiev']) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date())
      const hour = Number(parts.find((p) => p.type === 'hour')?.value)
      if (Number.isFinite(hour)) return hour
    } catch {
      /* пояс невідомий, пробуємо стару назву */
    }
  }
  return null
}

/**
 * Подивитись нічний вигляд удень: ?closed=tomorrow (вечір) або ?closed=today
 * (ранок до відкриття). Лише для перегляду, нічого не запамʼятовується.
 */
function forced(): Closed | undefined {
  if (typeof window === 'undefined') return undefined
  const v = new URLSearchParams(window.location.search).get('closed')
  return v === 'tomorrow' || v === 'today' ? v : undefined
}

export function closedNow(): Closed {
  const preview = forced()
  if (preview) return preview
  const hour = salonHour()
  if (hour === null) return null
  if (hour >= CLOSES) return 'tomorrow'
  if (hour < OPENS) return 'today'
  return null
}

