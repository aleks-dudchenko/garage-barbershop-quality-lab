/**
 * Тонкий шар поверх статичної збірки.
 *
 * Сайт лишається статичним: Cloudflare віддає dist напряму, і воркер на цих
 * запитах узагалі не запускається. Він втручається лише на адресах, перелічених
 * у run_worker_first у wrangler.jsonc:
 *
 *   GET  /data/content.json       живий вміст із KV, з відкотом на файл зі збірки
 *   GET  /data/availability.json  живі вільні вікна з Altegio, див. нижче
 *   GET  /uploads/<slug>.jpg      фото майстрів, доданих із телеграма
 *   POST /api/telegram            вебхук телеграм-бота, див. bot.js
 *   POST /api/content             сюди писав бот з ноутбука, під спільним секретом
 *   PUT  /api/photo/<slug>        фото від бота з ноутбука
 *
 * Дві останні адреси лишаються для відкату: якщо хмарний бот зламається,
 * бот із ноутбука запрацює знову за хвилину, див. bot/README.md.
 *
 * Фото своїх майстрів лежать у /img/barbers/ і йдуть повз воркер як звичайні
 * файли: там нічого не міняється, і зайвий виклик на кожну картинку ні до чого.
 */

export { BotState } from './bot.js'

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  /* Кеш тут зробив би правки невидимими: сторінка опитувала б CDN, а той
     віддавав би стару копію, доки не протухне. */
  'cache-control': 'no-store',
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/
const MAX_CONTENT = 512 * 1024
const MAX_PHOTO = 6 * 1024 * 1024

const no = (status, text) => new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })
const ok = (body) => new Response(JSON.stringify(body), { headers: JSON_HEADERS })

/** Порівняння за сталий час: щоб за швидкістю відповіді не можна було підбирати секрет. */
function same(given, secret) {
  if (!secret || typeof given !== 'string' || given.length !== secret.length) return false
  let diff = 0
  for (let i = 0; i < secret.length; i += 1) {
    diff |= given.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return diff === 0
}

function authorized(request, env) {
  const header = request.headers.get('authorization') ?? ''
  return same(header.startsWith('Bearer ') ? header.slice(7) : '', env.WRITE_SECRET)
}

/*
 * Вільні вікна.
 *
 * Раз на десять хвилин (крон у wrangler.jsonc) питаємо Altegio найближчі
 * вікна кожного майстра на кожну з чотирьох послуг панелі і кладемо готовий
 * JSON у KV. Сторінка читає його звідти, до Altegio напряму не ходить:
 * партнерський ключ лишається тут, а відвідувач не чекає тридцяти двох
 * запитів поспіль.
 *
 * Хто в панелі, з якими послугами й цінами, бере шаблон
 * public/data/availability.json. Його ж вікна (dayOffset) це макет для
 * розробки: на живому сайті вони не показуються ніколи. Якщо свіжих живих
 * даних немає, відповідь 503, і панель просто ховається. Показати вигадане
 * вікно гірше, ніж не показати жодного.
 */
const ALTEGIO_API = 'https://api.alteg.io/api/v1'
const SLOTS_KEY = 'availability'
/* Крон раз на 10 хвилин, тож пів години це три пропущені поспіль запуски.
   Старіше вважаємо протухлим: вікно, яке зайняли годину тому, ще й веде
   людину у віджет, де його вже немає. */
const SLOTS_MAX_AGE = 30 * 60 * 1000
/* Altegio пускає до пʼяти запитів на секунду; тримаємось із запасом. */
const ALTEGIO_GAP = 250
const SERVICE_KEYS = ['haircut', 'combo', 'kids', 'beard']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function altegio(env, path) {
  const res = await fetch(ALTEGIO_API + path, {
    headers: {
      accept: 'application/vnd.api.v2+json',
      authorization: `Bearer ${env.ALTEGIO_TOKEN}`,
    },
  })
  if (!res.ok) throw new Error(`Altegio ${res.status} на ${path}`)
  const json = await res.json()
  if (!json || json.success !== true) throw new Error(`Altegio success=false на ${path}`)
  return json.data
}

async function buildAvailability(env) {
  const tpl = await (await env.ASSETS.fetch('https://assets.invalid/data/availability.json')).json()
  const company = tpl.widget.company_id
  let answered = 0
  const errors = []
  const masters = []
  for (const master of tpl.masters) {
    const bySvc = {}
    for (const key of SERVICE_KEYS) {
      const svc = master.services?.[key]
      if (!svc?.id) continue
      try {
        /* Найближчий день, у який майстер вільний, з усіма вікнами цього дня.
           Вікна залежать від тривалості послуги, тому окремо на кожну. */
        const data = await altegio(env, `/book_staff_seances/${company}/${master.id}?service_ids%5B%5D=${svc.id}`)
        bySvc[key] = (data?.seances ?? [])
          .filter((s) => typeof s?.datetime === 'string')
          .map((s) => ({ datetime: s.datetime }))
        answered += 1
      } catch (err) {
        errors.push(String(err))
      }
      await sleep(ALTEGIO_GAP)
    }
    masters.push({ ...master, slots: bySvc.haircut ?? [], slots_by_service: bySvc })
  }
  if (errors.length) console.warn(`Altegio: ${errors.length} помилок`, errors.slice(0, 3))
  /* Жодної відповіді означає, що зламався ключ чи сам Altegio. Тоді краще
     дати старим даним протухнути, ніж записати всім «вікон немає». */
  if (!answered) throw new Error('Altegio не відповів жодного разу')
  const { _note, mock_slots, ...rest } = tpl
  return { ...rest, masters, mock_slots: false, generated_at: new Date().toISOString() }
}

let refreshing = null
let lastAttempt = 0

/** Один запуск на ізолят за раз і не частіше ніж раз на хвилину. */
function refreshAvailability(env) {
  if (!env.ALTEGIO_TOKEN) return Promise.resolve()
  if (refreshing || Date.now() - lastAttempt < 60 * 1000) return refreshing ?? Promise.resolve()
  lastAttempt = Date.now()
  refreshing = buildAvailability(env)
    .then((doc) => env.CONTENT.put(SLOTS_KEY, JSON.stringify(doc), { metadata: { at: Date.now() } }))
    .catch((err) => console.error('Вільні вікна не оновились:', String(err)))
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshAvailability(env))
  },

  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    const method = request.method

    if (pathname === '/data/availability.json') {
      if (method !== 'GET' && method !== 'HEAD') return no(405, 'лише GET')
      const { value, metadata } = await env.CONTENT.getWithMetadata(SLOTS_KEY)
      const fresh = value !== null && Date.now() - (metadata?.at ?? 0) < SLOTS_MAX_AGE
      if (fresh) return new Response(value, { headers: JSON_HEADERS })
      /* Порожньо чи протухло: запускаємо оновлення у фоні, а цьому
         відвідувачу чесно кажемо, що вікон зараз немає. */
      ctx.waitUntil(refreshAvailability(env))
      return no(503, 'вікна оновлюються')
    }

    if (pathname === '/data/content.json') {
      if (method !== 'GET' && method !== 'HEAD') return no(405, 'лише GET')
      const body = await env.CONTENT.get('content')
      /* Нічого ще не писали: віддаємо те, що лежить у збірці. Сайт так само
         має вбудовані дані, тож навіть повна відмова KV його не ламає. */
      if (body === null) return env.ASSETS.fetch(request)
      return new Response(body, { headers: JSON_HEADERS })
    }

    if (pathname.startsWith('/uploads/')) {
      if (method !== 'GET' && method !== 'HEAD') return no(405, 'лише GET')
      const slug = pathname.slice('/uploads/'.length).replace(/\.jpg$/, '')
      if (!SLUG.test(slug)) return no(404, 'нема')
      const photo = await env.CONTENT.get(`photo:${slug}`, 'arrayBuffer')
      if (!photo) return no(404, 'нема')
      return new Response(photo, {
        headers: {
          'content-type': 'image/jpeg',
          /* Власник може замінити фото, тож хвилина, а не рік. */
          'cache-control': 'public, max-age=60, must-revalidate',
        },
      })
    }

    if (pathname === '/api/telegram') {
      if (method !== 'POST') return no(405, 'лише POST')
      /* Telegram підписує кожен запит секретом, який ми дали йому в setWebhook. */
      const given = request.headers.get('x-telegram-bot-api-secret-token') ?? ''
      if (!env.BOT || !same(given, env.TG_SECRET)) return no(401, 'ні')
      let update
      try {
        update = await request.json()
      } catch {
        return no(400, 'не JSON')
      }
      try {
        await env.BOT.get(env.BOT.idFromName('garage')).handleUpdate(update)
      } catch (err) {
        /* Відповідаємо 200 і тоді: інакше Telegram слав би те саме оновлення
           знову й знову. Помилку видно в логах воркера. */
        console.error('бот:', String(err))
      }
      return new Response('ok')
    }

    if (pathname === '/api/content') {
      if (method !== 'POST') return no(405, 'лише POST')
      if (!authorized(request, env)) return no(401, 'ні')
      const text = await request.text()
      if (text.length > MAX_CONTENT) return no(413, 'завелике')
      let doc
      try {
        doc = JSON.parse(text)
      } catch {
        return no(400, 'не JSON')
      }
      /* Мінімальна перевірка форми: сайт усе одно бере з файла лише те, що
         впізнав, але класти в KV очевидне сміття немає сенсу. */
      if (!doc || typeof doc !== 'object' || typeof doc.prices !== 'object' || !Array.isArray(doc.barbers)) {
        return no(400, 'не той формат')
      }
      await env.CONTENT.put('content', text)
      return ok({ ok: true, updatedAt: doc.updatedAt ?? null, barbers: doc.barbers.length })
    }

    const photoPath = pathname.match(/^\/api\/photo\/([^/]+)$/)
    if (photoPath) {
      if (method !== 'PUT') return no(405, 'лише PUT')
      if (!authorized(request, env)) return no(401, 'ні')
      const slug = photoPath[1]
      if (!SLUG.test(slug)) return no(400, 'кривий слуг')
      const bytes = await request.arrayBuffer()
      if (bytes.byteLength > MAX_PHOTO) return no(413, 'завелике')
      if (bytes.byteLength === 0) return no(400, 'порожнє')
      await env.CONTENT.put(`photo:${slug}`, bytes)
      return ok({ ok: true, bytes: bytes.byteLength })
    }

    if (pathname.startsWith('/api/')) return no(404, 'нема')

    return env.ASSETS.fetch(request)
  },
}
