/**
 * Останні пости з Instagram закладу для стрічки в «Про нас».
 *
 * Поки це знімок, зібраний вручну 24.09.2026 з публічного профілю: ключа до
 * API Meta ще немає (див. «Інструкція Instagram для сайту Garage.pdf»). Фото
 * лежать у public/img/instagram/ під кодом поста, кожна плитка веде на сам
 * пост. Порядок за датою, як віддає API, а не як у профілі: закріплений пост
 * там стоїть першим, в API ні.
 *
 * Оновити вручну: відкрити профіль, узяти коди й мініатюри шести останніх
 * постів (480 px завширшки, як у сітці Instagram), покласти webp і jpg.
 */
export const INSTAGRAM_URL = 'https://www.instagram.com/barbershop_garage_irpin/'

export type InstaPost = {
  /* Код із посилання instagram.com/p/<code>/ */
  code: string
  kind: 'photo' | 'video'
  date: string
  w: number
  h: number
}

export const INSTAGRAM_POSTS: InstaPost[] = [
  { code: 'Ddqu4ZzirEf', kind: 'photo', date: '2026-09-24', w: 480, h: 640 },
  { code: 'Ddi9vs9Crrx', kind: 'photo', date: '2026-09-21', w: 480, h: 640 },
  { code: 'DdYWcNwiuny', kind: 'photo', date: '2026-09-17', w: 480, h: 640 },
  { code: 'DdTN340ivcG', kind: 'photo', date: '2026-09-15', w: 480, h: 640 },
  { code: 'DdMF7uRK6Y_', kind: 'video', date: '2026-09-12', w: 360, h: 640 },
  { code: 'DdEK9ulqj09', kind: 'photo', date: '2026-09-09', w: 640, h: 640 },
]

/* Відео в Instagram живуть під /reel/, решта під /p/. */
export const postUrl = (p: InstaPost) =>
  `https://www.instagram.com/${p.kind === 'video' ? 'reel' : 'p'}/${p.code}/`

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']

/** Підпис для читача екрана: що це і коли, бо сама плитка це лише фото. */
export function postLabel(p: InstaPost) {
  const [, m, d] = p.date.split('-').map(Number)
  return `${p.kind === 'video' ? 'Відео' : 'Пост'} в Instagram від ${d} ${MONTHS[m - 1]}`
}
