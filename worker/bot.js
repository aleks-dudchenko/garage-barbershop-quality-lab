import { DurableObject } from 'cloudflare:workers'
import { createApi } from '../../bot/telegram.mjs'
import { processUpdate } from './bot-core.js'

/**
 * Стан телеграм-бота: доступи, незакінчені дії, знімок для /undo.
 *
 * Обʼєкт один на весь бот (idFromName('garage') у worker/index.js), тож усі
 * оновлення проходять через одне місце. Черга нижче тримає їх по одному:
 * інакше два швидкі натиски могли б прочитати той самий стан і затерти
 * один одного. Сама розмова в bot-core.js.
 */
export class BotState extends DurableObject {
  queue = Promise.resolve()

  handleUpdate(update) {
    const run = () =>
      processUpdate(update, {
        api: createApi(this.env.BOT_TOKEN),
        kv: this.env.CONTENT,
        state: this.ctx.storage,
        env: this.env,
        assets: this.env.ASSETS,
      })
    const done = this.queue.then(run, run)
    /* Помилка одного оновлення не має зупиняти чергу для наступних. */
    this.queue = done.catch(() => {})
    return done.then(() => true)
  }
}
