import { useEffect, useState } from 'react'

/**
 * Чи живий кадровий цикл.
 *
 * Motion малює появу через requestAnimationFrame. Там, де вкладку не
 * композитять (фонова вкладка, вбудована панель перегляду, згорнуте вікно),
 * rAF не викликається, вміст лишається на opacity 0 і сторінка виглядає
 * порожньою. Таймери в таких умовах працюють, тому саме таймером і ловимо:
 * якщо за ms не набралось трьох кадрів, вважаємо цикл зупиненим і віддаємо
 * вміст без анімації.
 */
export function useFrameloopStalled(ms = 700) {
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    let ticks = 0
    let raf = 0
    const tick = () => {
      ticks += 1
      if (ticks < 3) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const check = window.setTimeout(() => {
      if (ticks < 3) setStalled(true)
    }, ms)

    /* Вкладку відкрили назад: кадри пішли, можна знову анімувати. */
    const onVisible = () => {
      if (document.visibilityState === 'visible') setStalled(false)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(check)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ms])

  return stalled
}
