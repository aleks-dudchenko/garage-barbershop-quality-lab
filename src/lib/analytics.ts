import type posthogType from 'posthog-js'

/**
 * PostHog: куди люди тиснуть і де зупиняються.
 *
 * Обрано замість Google Analytics, бо власнику потрібні не лічильники, а
 * записи сесій і теплові карти, чого GA4 не вміє взагалі.
 *
 * Що з цього виходить без жодної додаткової розмітки: autocapture запамʼятовує
 * кожен клік по будь-якому елементу, а не лише по тих, які ми позначили; записи
 * сесій дають подивитись очима відвідувача; теплові карти будуються з тих самих
 * кліків.
 *
 * Приватність: сховище тільки localStorage, тобто куків немає. Але це не те
 * саме, що «банер не потрібен»: ePrivacy вимагає згоди на будь-який запис у
 * памʼять пристрою, не лише на куки. Для відвідувачів з України ризик низький,
 * і поки рішення таке: банера немає. Якщо колись підуть відвідувачі з ЄС, це
 * треба перерішити свідомо, а не мовчки.
 *
 * Профілі людей не заводяться, бо ми нікого не ідентифікуємо. Поля вводу
 * маскуються самим PostHog, та їх тут і немає: запис відбувається на боці
 * Altegio, ми лише відкриваємо посилання.
 *
 * Вага: бібліотека важка, тому вантажиться окремим шматком і лише коли браузер
 * звільниться. Перший екран її не чекає.
 */

/* Публічний ключ проєкту: він і так лежить у кожній збірці, яку бачить
   відвідувач, тому тримати його в таємниці немає сенсу й можливості.
   Порожній рядок означає, що аналітики немає і нічого не вантажиться. */
const KEY = 'phc_DEMO_KEY_REPLACE_ME'

/* Європейська хмара: відвідувачі з України, дані лишаються в ЄС. */
const HOST = 'https://eu.i.posthog.com'

/**
 * Google Analytics, якщо знадобиться ще й він: вписати сюди «G-…».
 *
 * Обидва працюють разом, події йдуть в обидва. Але ціна нерівна: gtag.js
 * важить 152 КБ gzip, тобто більше за весь PostHog, і ставить куку `_ga`
 * на два роки, а це вже той випадок, заради якого й існують банери згоди.
 *
 * Має сенс, тільки якщо колись підуть Google Ads або треба звʼязка з
 * Search Console. Для «куди тиснуть люди» PostHog відповідає сам.
 */
const GA4 = ''

type Props = Record<string, unknown>

let client: typeof posthogType | null = null
let starting = false
/* Події до завантаження не губимо: найцікавіше часто трапляється в перші
   секунди, ще до того, як браузер звільниться. */
const pending: Array<[string, Props]> = []
/* Властивості, що їдуть з кожною подією, зокрема з автоматичними кліками
   PostHog. Так будь-яку воронку можна розбити, наприклад, за варіантом
   A/B-тесту панелі вікон. */
const superProps: Props = {}

async function boot() {
  try {
    const mod = await import('posthog-js')
    const ph = mod.default
    ph.init(KEY, {
      api_host: HOST,
      persistence: 'localStorage',
      person_profiles: 'identified_only',
      autocapture: true,
      capture_pageview: true,
      disable_session_recording: false,
      respect_dnt: true,
    })
    client = ph
    if (Object.keys(superProps).length) ph.register(superProps)
    for (const [name, props] of pending) ph.capture(name, props)
    pending.length = 0
  } catch {
    /* Блокувальник реклами, збій мережі, що завгодно: сайт це не обходить. */
  }
}

/* GA4 вантажимо так само осторонь, а не синхронним скриптом у <head>, як
   радить Google: там він стає в чергу перед першим екраном. */
function bootGa4() {
  window.dataLayer = window.dataLayer ?? []
  /* Саме function, а не стрілка: gtag передає аргументи через arguments,
     і Google очікує рівно цей обʼєкт у dataLayer. */
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA4)
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4}`
  document.head.append(script)
}

export function startAnalytics() {
  if (starting || typeof window === 'undefined') return
  if (!KEY && !GA4) return
  starting = true
  const run = () => {
    if (KEY) void boot()
    if (GA4) bootGa4()
  }
  const idle = window.requestIdleCallback
  if (idle) idle(run, { timeout: 2500 })
  else window.setTimeout(run, 1200)
}

export function setSuperProperty(key: string, value: unknown) {
  superProps[key] = value
  client?.register({ [key]: value })
}

export function sendEvent(name: string, props: Props) {
  if (!KEY) return
  if (client) client.capture(name, props)
  /* Черга обмежена: якщо бібліотека так і не завантажилась, памʼять не росте. */
  else if (pending.length < 50) pending.push([name, props])
}
