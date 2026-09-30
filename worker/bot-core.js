import { createBot } from '../../bot/flows.mjs'
import { createAccessCore } from '../../bot/access-core.mjs'
import { EMPTY, clone, shape } from '../../bot/content.mjs'

/**
 * Телеграм-бот у хмарі.
 *
 * Розмова та сама, що на ноутбуці: bot/flows.mjs їде без змін. Інше лише
 * те, що довкола неї:
 *
 *   довге опитування   вебхук: Telegram сам шле кожне повідомлення сюди
 *   content.json       KV, той самий ключ content, який читає сайт
 *   фото на диску      KV, photo:<slug>, як і фото з бота досі
 *   access.json, стан розмов, знімок для /undo   сховище Durable Object
 *
 * Durable Object потрібен, бо KV показує свіжий запис не одразу всюди, і
 * наступний крок розмови міг би прочитати застарілий стан. Обʼєкт один на
 * весь бот, оновлення він обробляє суворо по черзі (worker/bot.js).
 *
 * Від Cloudflare тут нічого немає: сховища передаються ззовні, тож файл
 * ганяється тестами в Node, див. bot/cloudtest.mjs.
 */

/* Незакінчена дія живе дві години. Потім випадкове «привіт» уже не
   сприйметься як імʼя нового майстра з позавчорашньої розмови. */
const SESSION_TTL = 2 * 60 * 60 * 1000
/* Чужий, якого власник не впустив, може попросити знову через три дні. На
   ноутбуці це робив перезапуск бота, у хмарі перезапусків немає. */
const ASKED_TTL = 3 * 24 * 60 * 60 * 1000
const MAX_PHOTO = 6 * 1024 * 1024

const ids = (list) =>
  String(list ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

function createKvStore({ kv, state, assets }) {
  async function read() {
    const doc = await kv.get('content', 'json')
    if (doc) return shape(doc)
    /* KV ще порожній: беремо вбудований у збірку файл, як робить і сайт. */
    if (assets) {
      const res = await assets.fetch('https://assets.invalid/data/content.json')
      if (res.ok) return shape(await res.json())
    }
    return clone(EMPTY)
  }

  return {
    remote: true,
    kind: 'KV',
    read,

    async write(next) {
      const doc = shape(next)
      doc.updatedAt = new Date().toISOString()
      /* Знімок для /undo беремо до запису, як і на ноутбуці. */
      await state.put('previous', await read())
      await kv.put('content', JSON.stringify(doc, null, 2))
      return { doc, written: ['KV'] }
    },

    async rollback() {
      /* bot:previous це знімок, перенесений з ноутбука: /undo одразу після
         переїзду відкочує останню правку, зроблену ще звідти. */
      const prev = (await state.get('previous')) ?? (await kv.get('bot:previous', 'json'))
      if (!prev) return null
      const doc = shape(prev)
      await kv.put('content', JSON.stringify({ ...doc, updatedAt: new Date().toISOString() }, null, 2))
      return doc
    },
  }
}

function createKvMedia({ api, kv, token, fetch }) {
  return {
    kind: 'KV',
    async savePhoto(fileId, slug) {
      const file = await api.call('getFile', { file_id: fileId })
      const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`)
      if (!res.ok) throw new Error(`фото: Telegram відповів ${res.status}`)
      const bytes = await res.arrayBuffer()
      if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO) {
        throw new Error(`фото: ${bytes.byteLength} байт`)
      }
      await kv.put(`photo:${slug}`, bytes)
      return true
    },
  }
}

/**
 * Одне оновлення від Telegram, від початку до кінця: підняти стан, дати його
 * розмові, надіслати відповіді, зберегти стан назад.
 *
 * api     клієнт Telegram з bot/telegram.mjs
 * kv      KV сайту (CONTENT)
 * state   сховище з get і put: у хмарі це storage Durable Object
 * env     BOT_TOKEN, BOT_ALLOWED, BOT_OWNER
 * assets  збірка сайту, запасне джерело вмісту
 */
export async function processUpdate(update, { api, kv, state, env, assets, fetch = globalThis.fetch }) {
  const now = Date.now()

  const allowed = new Set(ids(env.BOT_ALLOWED))
  const access = createAccessCore({
    allowed,
    seedOwner: env.BOT_OWNER,
    async loadDoc() {
      const saved = await state.get('access')
      if (saved) return saved
      /* Перший запуск у хмарі: список, перенесений з ноутбука. */
      const moved = await kv.get('bot:access', 'json')
      if (moved) await state.put('access', moved)
      return moved
    },
    saveDoc: (doc) => state.put('access', doc),
  })
  await access.load()

  const sessions = new Map()
  for (const [chat, s] of Object.entries((await state.get('sessions')) ?? {})) {
    if (s && now - (s.at ?? 0) < SESSION_TTL) sessions.set(Number(chat), s)
  }
  const askedSaved = (await state.get('asked')) ?? {}
  const asked = new Map()
  for (const [id, v] of Object.entries(askedSaved)) {
    if (v && now - (v.at ?? 0) < ASKED_TTL) asked.set(id, String(v.name ?? ''))
  }

  const bot = createBot({
    store: createKvStore({ kv, state, assets }),
    config: { allowed },
    media: createKvMedia({ api, kv, token: env.BOT_TOKEN, fetch }),
    access,
    sessions,
    asked,
  })

  const chat = update?.message?.chat?.id ?? update?.callback_query?.message?.chat?.id
  /* Як і на ноутбуці: id того, хто пише без прав, видно в логах воркера. */
  if (chat && !allowed.has(String(chat))) {
    const from = update.message?.from ?? update.callback_query?.from
    const who = from?.username ? `@${from.username}` : (from?.first_name ?? 'невідомо')
    console.log(`Пише ${who}, chat id: ${chat} (прав немає)`)
  }

  let actions = []
  try {
    actions = await bot.handle(update)
  } catch (err) {
    console.error('обробка оновлення:', String(err?.message ?? err))
    if (chat) actions = [{ kind: 'send', chat, text: 'Щось пішло не так. Спробуй ще раз або /cancel.' }]
  }

  if (chat && sessions.has(chat)) sessions.get(chat).at = now
  await state.put('sessions', Object.fromEntries(sessions))
  const keep = {}
  for (const [id, name] of asked) keep[id] = { name, at: askedSaved[id]?.at ?? now }
  await state.put('asked', keep)

  for (const act of actions) {
    try {
      if (act.kind === 'send') await api.send(act.chat, act.text, act.keyboard)
      else if (act.kind === 'answer') await api.answer(act.id, act.text)
    } catch (err) {
      console.error(`${act.kind}:`, String(err?.message ?? err))
    }
  }
  return actions
}
