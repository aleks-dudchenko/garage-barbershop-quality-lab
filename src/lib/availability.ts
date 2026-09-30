export type ServiceKey = 'haircut' | 'beard' | 'combo' | 'kids'

export type Slot = { dayOffset?: number; time?: string; datetime?: string }

export type MasterSlots = {
  id: number
  name: string
  level: string
  rating?: number
  reviews?: number
  services: Partial<Record<ServiceKey, { id: number; price: number }>>
  slots?: Slot[]
  /* Живі дані: вікна залежать від тривалості послуги, тож свої на кожну.
     У макеті їх немає, там на всі послуги спільні slots. */
  slots_by_service?: Partial<Record<ServiceKey, Slot[]>>
  nearest_date?: string
}

export type Availability = {
  widget: { base: string; company_id: number }
  masters: MasterSlots[]
  generated_at?: string
  stale?: boolean
  mock_slots?: boolean
}

const pad = (n: number) => (n < 10 ? '0' : '') + n

/** Мок тримає dayOffset + time, щоб ніколи не протухати; проксі віддаватиме datetime. */
export function slotDate(slot: Slot): Date {
  if (slot.datetime) return new Date(slot.datetime)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + (slot.dayOffset ?? 0))
  const [h, m] = String(slot.time ?? '00:00').split(':')
  d.setHours(Number(h), Number(m), 0, 0)
  return d
}

export function dayLabel(d: Date): string {
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((+b - +a) / 864e5)
  if (diff === 0) return 'Сьогодні'
  if (diff === 1) return 'Завтра'
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
}

export function clock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Формат, верифікований на живому віджеті: ?o=m{staff}s{service}d{YYDDMMHHmm}.
 * content іде в utm_content: зараз це варіант A/B-тесту панелі.
 */
export function deepLink(base: string, masterId: number, serviceId: number | undefined, d: Date, content?: string): string {
  let o = `m${masterId}`
  if (serviceId) o += `s${serviceId}`
  o += `d${String(d.getFullYear()).slice(-2)}${pad(d.getDate())}${pad(d.getMonth() + 1)}${pad(d.getHours())}${pad(d.getMinutes())}`
  return `${base}?o=${o}&utm_source=site&utm_medium=slots${content ? `&utm_content=${content}` : ''}`
}

export function masterLink(base: string, masterId: number): string {
  return `${base}?o=m${masterId}`
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
