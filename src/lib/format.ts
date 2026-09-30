/** 2800 -> «2 800» з нерозривним пробілом. Однаково в Node і в браузері. */
export function groupDigits(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
}

/* Заголовок «Вісім барберів» мусить іти за живим списком: власник додає і
   прибирає майстрів із телеграма, а число словом лишалось би від збірки. */
const SPELLED = [
  'нуль', 'один', 'два', 'три', 'чотири', 'пʼять', 'шість', 'сім', 'вісім',
  'девʼять', 'десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять',
  'пʼятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'девʼятнадцять', 'двадцять',
]

/** Число словом до двадцяти, далі цифрами: «вісім», «двадцять», «24». */
export function spellCount(n: number): string {
  return Number.isInteger(n) && n >= 0 && n <= 20 ? SPELLED[n] : String(n)
}

/** «930 оцінок» → 930. Рядок приходить із телеграма, тому беремо самі цифри. */
export function votesCount(v: string): number {
  const n = Number(v.replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Сума оцінок команди, округлена вниз до сотні.
 *
 * Число стояло в тексті цифрою поруч із живою кількістю барберів: додали
 * майстра, половина речення оновилась, друга ні. Вниз, а не до найближчого,
 * бо «понад» не має брехати вгору.
 */
export function votesTotal(votes: readonly string[]): number {
  return Math.floor(votes.reduce((sum, v) => sum + votesCount(v), 0) / 100) * 100
}

/** Форма іменника за числом: 1 барбер, 2 барбери, 5 барберів, 11 барберів. */
export function plural(n: number, one: string, few: string, many: string): string {
  const hundred = Math.abs(n) % 100
  if (hundred >= 11 && hundred <= 14) return many
  const ten = hundred % 10
  if (ten === 1) return one
  if (ten >= 2 && ten <= 4) return few
  return many
}
