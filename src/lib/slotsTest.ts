import type { MasterSlots } from './availability'
import { setSuperProperty } from './analytics'

/**
 * A/B-тест порядку майстрів у панелі вільних вікон (погоджено 24.09.2026).
 *
 * A: хто звільниться найраніше, той і вгорі. Так найкраще заповнюється
 *    вільний час, але топи, зайняті на кілька днів наперед, на перший
 *    екран майже не потрапляють.
 * B: рядки з різних рівнів, і один із них завжди топ. Людина бачить вибір:
 *    швидше й дешевше або топ, але пізніше.
 *
 * Кожен відвідувач отримує варіант випадково, і браузер його памʼятає, тож
 * людина не бачить, як панель міняється від візиту до візиту. Варіант іде
 * з кожною подією PostHog і міткою utm_content у посиланні на запис.
 *
 * Дивитись результат через місяць після переїзду домену: яка частка
 * показів панелі закінчилась натиском на вікно, до яких рівнів записались і
 * на скільки гривень. Трафік малий, тож тест помітить лише велику різницю;
 * якщо її немає, варіант обирає власник.
 *
 * Подивитись обидва можна адресою з ?slots=a або ?slots=b: так варіант
 * міняється лише в цьому завантаженні і ніде не запамʼятовується.
 */

export type SlotsVariant = 'A' | 'B'

const KEY = 'garage.slots-variant'

let resolved: SlotsVariant | null = null

function forced(): SlotsVariant | null {
  const v = new URLSearchParams(window.location.search).get('slots')?.toUpperCase()
  return v === 'A' || v === 'B' ? v : null
}

function stored(): SlotsVariant | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'A' || v === 'B' ? v : null
  } catch {
    return null
  }
}

/** Лише в браузері й лише коли панель має що показати: це і є участь у тесті. */
export function slotsVariant(): SlotsVariant {
  if (resolved) return resolved
  const override = forced()
  let v = override ?? stored()
  if (!v) {
    v = Math.random() < 0.5 ? 'A' : 'B'
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* Приватне вікно: варіант живе до кінця сесії, і цього досить. */
    }
  }
  resolved = v
  setSuperProperty('slots_variant', v)
  return v
}

type Row = { master: MasterSlots; next: number }

const isTop = (level: string) => /топ/i.test(level)

/* Сталий випадковий ключ на майстра: при однаковому часі порядок
   випадковий, щоб записи розходились між рівними, але не стрибав від
   кожної перемальовки панелі. */
const tieKeys = new Map<number, number>()
function tieKey(id: number) {
  let k = tieKeys.get(id)
  if (k === undefined) {
    k = Math.random()
    tieKeys.set(id, k)
  }
  return k
}

/**
 * Варіант B. Приймає рядки, уже впорядковані за найближчим вікном.
 * Майстер, до якого людина записувалась минулого разу, стоїть першим,
 * як і у варіанті A.
 */
export function pickByLevels<T extends Row>(rows: T[], limit: number, pinnedId?: number): T[] {
  const byTime = [...rows].sort((a, b) => a.next - b.next || tieKey(a.master.id) - tieKey(b.master.id))
  const free = byTime.filter((r) => r.next !== Infinity)
  const pinned = pinnedId === undefined ? undefined : byTime.find((r) => r.master.id === pinnedId)
  const chosen: T[] = pinned ? [pinned] : []
  const levels = new Set(chosen.map((r) => r.master.level))
  const take = (r: T) => {
    chosen.push(r)
    levels.add(r.master.level)
  }

  /* Топ обовʼязково, якщо в когось із топів взагалі є вікно. */
  if (!chosen.some((r) => isTop(r.master.level))) {
    const top = free.find((r) => isTop(r.master.level))
    if (top && chosen.length < limit) take(top)
  }
  /* Далі найближчі з рівнів, яких ще немає. */
  for (const r of free) {
    if (chosen.length >= limit) break
    if (!chosen.includes(r) && !levels.has(r.master.level)) take(r)
  }
  /* Рівнів із вікнами менше, ніж рядків: добираємо найближчих будь-якого. */
  for (const r of byTime) {
    if (chosen.length >= limit) break
    if (!chosen.includes(r)) take(r)
  }

  const rest = chosen.filter((r) => r !== pinned).sort((a, b) => a.next - b.next)
  return pinned ? [pinned, ...rest] : rest
}
