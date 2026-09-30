import { useSyncExternalStore } from 'react'
import { priceRows, type PriceRow } from './prices'
import { barbers, type Barber } from './barbers'

/**
 * Живий вміст: те, що власник міняє з телеграма. Двi речі, більше нічого:
 * ціни і склад майстрів.
 *
 * Повні дані лежать у самій збірці (prices.ts, barbers.ts) — саме вони йдуть
 * у пререндер, тож пошуковик і перший кадр ніколи не порожні. Поверх них
 * накладається /data/content.json, який пише бот. Файла немає, мережа впала,
 * JSON побитий — сайт мовчки лишається на вбудованих даних.
 *
 * Опитуємо файл, а не тримаємо зʼєднання: сайт статичний і має таким лишитись,
 * щоб їхати на будь-який хостинг без Node. Поки вкладка на очах — раз на три
 * секунди, щоб правка в чаті була видна одразу; у фоні — раз на пів хвилини.
 */

/** Звідки брати фото: у своїх майстрів є webp і подвійний розмір, у доданих ботом лише jpg. */
export type PhotoKind = 'srcset' | 'jpg' | 'none'

export type LiveBarber = Barber & { hidden?: boolean; photo?: PhotoKind }

export type Live = {
  updatedAt?: string
  prices?: Record<string, string[]>
  barbers?: LiveBarber[]
}

const SOURCE = '/data/content.json'
const FAST = 3000
const SLOW = 30000
const EMPTY: Live = {}

let snapshot: Live = EMPTY
let raw = ''
let timer: number | undefined
const listeners = new Set<() => void>()

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)

function saneBarber(value: unknown): LiveBarber | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const slug = str(v.slug).trim()
  const name = str(v.name).trim()
  /* Без слуга нема звідки взяти фото, без імені нема що показати. */
  if (!slug || !name) return null
  const photo = v.photo === 'jpg' || v.photo === 'none' ? v.photo : 'srcset'
  return {
    id: str(v.id, slug),
    slug,
    name,
    level: str(v.level),
    top: v.top === true,
    rating: str(v.rating),
    votes: str(v.votes),
    href: str(v.href),
    eager: v.eager === true,
    hidden: v.hidden === true,
    photo,
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((p) => typeof p === 'string')

/** Ціни: лишаємо лише послуги, де значення це список рядків. */
function sanePrices(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined
  const prices = Object.fromEntries(Object.entries(value).filter(([, list]) => isStringList(list)))
  return Object.keys(prices).length ? (prices as Record<string, string[]>) : undefined
}

/** Майстри: відкидаємо записи без слуга чи імені, див. saneBarber. */
function saneBarbers(value: unknown): LiveBarber[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value.map(saneBarber).filter((b): b is LiveBarber => b !== null)
  return list.length ? list : undefined
}

/** Файл пише зовнішня програма, тож беремо з нього лише те, що впізнали. */
function sane(input: unknown): Live {
  if (!isRecord(input)) return EMPTY
  const out: Live = {}
  if (typeof input.updatedAt === 'string') out.updatedAt = input.updatedAt
  const prices = sanePrices(input.prices)
  if (prices) out.prices = prices
  const barbers = saneBarbers(input.barbers)
  if (barbers) out.barbers = barbers
  return out
}

async function pull() {
  try {
    const res = await fetch(SOURCE, { cache: 'no-store' })
    if (!res.ok) return
    const text = await res.text()
    /* Порівнюємо сирий текст: так знімок лишається тим самим обʼєктом, поки
       файл не змінився, і useSyncExternalStore не ганяє зайвих перемальовок. */
    if (text === raw) return
    raw = text
    snapshot = sane(JSON.parse(text))
    for (const fn of listeners) fn()
  } catch {
    /* лишаємось на вбудованих даних */
  }
}

async function tick() {
  await pull()
  if (!listeners.size) {
    timer = undefined
    return
  }
  timer = window.setTimeout(tick, document.hidden ? SLOW : FAST)
}

function onVisible() {
  if (document.visibilityState !== 'visible') return
  if (timer !== undefined) clearTimeout(timer)
  void tick()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisible)
    void tick()
  }
  return () => {
    listeners.delete(fn)
    if (listeners.size) return
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    document.removeEventListener('visibilitychange', onVisible)
  }
}

const getSnapshot = () => snapshot
/* На сервері живого вмісту немає: пререндер завжди віддає вбудовані дані,
   і перший клієнтський кадр збігається з ним, тож гідрація не свариться. */
const getServerSnapshot = () => EMPTY

export function useLive(): Live {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function livePrices(live: Live): PriceRow[] {
  const over = live.prices
  if (!over) return priceRows
  return priceRows.map((row) => {
    const next = over[row.service]
    return next && next.length === row.prices.length ? { ...row, prices: next } : row
  })
}

const BUILT_IN: LiveBarber[] = barbers.map((b) => ({ ...b, photo: 'srcset' }))

export function liveBarbers(live: Live): LiveBarber[] {
  const list = (live.barbers ?? BUILT_IN).filter((b) => !b.hidden)
  /* Порожня стрічка нікому не потрібна: якщо прибрали геть усіх, показуємо як було. */
  return list.length ? list : BUILT_IN
}

/**
 * Панель вільних вікон має свої дані з Altegio, тож звіряємось за числовим id.
 * null означає «живого списку немає, показуй усіх».
 */
export function visibleMasterIds(live: Live): Set<number> | null {
  if (!live.barbers) return null
  const ids = new Set<number>()
  for (const b of liveBarbers(live)) {
    const id = Number(b.id)
    if (Number.isFinite(id)) ids.add(id)
  }
  return ids.size ? ids : null
}
