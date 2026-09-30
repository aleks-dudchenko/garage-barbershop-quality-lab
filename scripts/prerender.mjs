import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Вкладаємо готову розмітку в dist/index.html.
 * Без цього пошуковик і превʼю в месенджерах бачать порожній <div id="root">,
 * а стара версія віддавала всю сторінку текстом. React потім підхоплює
 * ту саму розмітку через hydrateRoot.
 */
const root = resolve(import.meta.dirname, '..')
const { render } = await import(resolve(root, 'dist/server/entry-server.js'))

const file = resolve(root, 'dist/index.html')
const html = readFileSync(file, 'utf8')
const markup = render()

writeFileSync(file, html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`))
rmSync(resolve(root, 'dist/server'), { recursive: true, force: true })

const text = markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
console.log(`пререндер: ${markup.length} символів розмітки, ${text.length} символів тексту`)
