import { useSyncExternalStore } from 'react'

/**
 * Барбер, якого відвідувач обрав минулого разу.
 *
 * **Ми не знаємо, чи запис відбувся.** Сайт лише відкриває Altegio, а далі
 * людина може передумати, закрити вкладку або записатись до іншого. Тому
 * ніде не пишемо «ваш наступний запис», а кажемо рівно те, що знаємо:
 * цього майстра тут обирали востаннє. Він підіймається першим у панелі,
 * щоб постійному клієнту не доводилось шукати серед дев'яти.
 *
 * Памʼять живе лише в браузері цієї людини, нікуди не шлеться і нікому не
 * видна. Через дев'яносто днів забувається: барбер міг звільнитись, та й
 * підказка річної давнини вже не підказка.
 */

const KEY = 'garage.last-master'
const TTL = 90 * 24 * 60 * 60 * 1000

export type LastMaster = { id: number; name: string; at: number }

let cached: LastMaster | null = null
let loaded = false
const listeners = new Set<() => void>()

function read(): LastMaster | null {
  /* Приватне вікно, вимкнені дані сайту, повний диск: будь-що з цього кидає
     виняток або віддає сміття. Підказка не варта зламаної сторінки. */
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<LastMaster>
    if (typeof value?.id !== 'number' || typeof value?.name !== 'string') return null
    if (typeof value.at !== 'number' || Date.now() - value.at > TTL) return null
    return { id: value.id, name: value.name, at: value.at }
  } catch {
    return null
  }
}

function snapshot(): LastMaster | null {
  if (!loaded) {
    cached = read()
    loaded = true
  }
  return cached
}

export function rememberMaster(id: number, name: string) {
  const next: LastMaster = { id, name, at: Date.now() }
  cached = next
  loaded = true
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* памʼять не обовʼязкова: у цій сесії підказка все одно спрацює */
  }
  for (const fn of listeners) fn()
}

export function forgetMaster() {
  cached = null
  loaded = true
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* нічого страшного */
  }
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* На сервері памʼяті немає, і перший кадр у браузері такий самий, інакше
   гідрація сварилася б на різний порядок майстрів. */
export function useLastMaster(): LastMaster | null {
  return useSyncExternalStore(subscribe, snapshot, () => null)
}
