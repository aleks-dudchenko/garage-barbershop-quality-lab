import { useEffect, useRef } from 'react'
import { MoonIcon } from './Icons'
import { closedNow, OPENS } from '@/lib/hours'

/**
 * Смуга над шапкою з 20:00 до 9:00: «Зараз зачинено, дзвінки приймаємо з
 * 9:00». Третину онлайн-записів роблять саме в цей час (Altegio, вересень
 * 2026), і людина має одразу знати, що слухавку не візьмуть. Кнопки тут
 * немає: запис стоїть під смугою, у герої, і вночі там лише він.
 * Світла на темному верху, щоб її помітили; місяць у темному колі, як
 * значки в кнопках сайту.
 *
 * Розмітка є завжди, а показує її CSS за data-closed на <html>. Цей атрибут
 * ставить скрипт у <head> до першого кадру, тож смуга не штовхає сторінку
 * вже після завантаження. Тут перевіряємо годинник знову щохвилини, бо
 * вкладка буває відкрита і о 20:00, і о 9:00.
 *
 * Смуга прокручується разом зі сторінкою, а шапка стоїть під нею, доки смуга
 * не сховається: --bar-offset каже шапці, де зараз низ смуги.
 */
export function ClosedBar() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    const place = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const bar = ref.current
        const bottom = bar && root.dataset.closed ? Math.max(0, bar.getBoundingClientRect().bottom) : 0
        root.style.setProperty('--bar-offset', `${Math.round(bottom)}px`)
      })
    }
    const check = () => {
      const closed = closedNow()
      if (closed) root.dataset.closed = closed
      else delete root.dataset.closed
      place()
    }
    check()
    const timer = window.setInterval(check, 60 * 1000)
    window.addEventListener('scroll', place, { passive: true })
    window.addEventListener('resize', place, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(timer)
      window.removeEventListener('scroll', place)
      window.removeEventListener('resize', place)
    }
  }, [])

  return (
    <div className="closed-bar" ref={ref}>
      <div className="closed-bar__inner">
        <span className="moon-badge" aria-hidden="true"><MoonIcon /></span>
        <p>Зараз зачинено, дзвінки приймаємо з {OPENS}:00</p>
      </div>
    </div>
  )
}
