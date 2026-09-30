import { useEffect, useState } from 'react'

/**
 * Яка секція зараз під шапкою. Лінія відліку трохи нижче за шапку, щоб
 * пункт спалахував, коли заголовок секції реально зайшов під неї, а не
 * коли її верх торкнувся краю вікна. На герої активного пункту немає.
 */
export function useActiveSection(ids: readonly string[], offset = 120) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!sections.length) return
    const sync = () => {
      let current: string | null = null
      for (const el of sections) {
        const r = el.getBoundingClientRect()
        if (r.top <= offset && r.bottom > offset) current = el.id
      }
      setActive((prev) => (prev === current ? prev : current))
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync, { passive: true })
    /* Запасний тік: у вкладці без композитингу події прокрутки рідкі. */
    const beat = window.setInterval(sync, 400)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.clearInterval(beat)
    }
  }, [ids, offset])

  return active
}
