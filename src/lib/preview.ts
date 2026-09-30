import { useSyncExternalStore } from 'react'

/**
 * Показ станів панелі вільних вікон.
 *
 * Це інструмент для розмови з власником, не частина сайту: він відповідає на
 * питання «а як воно виглядає, коли в мене все зайнято». Вмикається лише
 * адресою з `?demo`, тому звичайний відвідувач його не побачить і не
 * перемкне. Вибір живе в цій вкладці й нікому більше не видно: сам розклад,
 * запис і вміст сайту від нього не міняються.
 */

export type Scenario = 'auto' | 'few' | 'none' | 'off'

export const SCENARIOS: ReadonlyArray<{ key: Scenario; short: string; what: string }> = [
  { key: 'auto', short: 'Як є', what: 'Справжні вільні вікна' },
  { key: 'few', short: 'Майже все', what: 'Лишились поодинокі пізні вікна' },
  /* Підписи короткі навмисно: у пігулці на телефоні поміщається близько
     десяти знаків, довше переноситься на два рядки і ряд стає кривим.
     Повне пояснення стоїть рядком нижче, під самою смугою. */
  { key: 'none', short: 'Зайнято', what: 'Вікон немає ні в кого' },
  { key: 'off', short: 'Без панелі', what: 'Перший екран, якщо Altegio недоступний' },
]

const PARAM = 'demo'

let scenario: Scenario | null = null
let enabled = false
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* На сервері показу немає, і перший кадр у браузері такий самий, інакше
   гідрація сварилася б на різну розмітку. Вмикаємо вже після монтування. */
export function armPreview() {
  if (typeof window === 'undefined') return false
  const on = new URLSearchParams(window.location.search).has(PARAM)
  if (on !== enabled) {
    enabled = on
    emit()
  }
  return on
}

export function setScenario(next: Scenario) {
  if (scenario === next) return
  scenario = next
  emit()
}

export function usePreviewEnabled(): boolean {
  return useSyncExternalStore(subscribe, () => enabled, () => false)
}

/** null означає «показу немає, бери справжній стан». */
export function usePreviewScenario(): Scenario | null {
  return useSyncExternalStore(subscribe, () => scenario, () => null)
}
