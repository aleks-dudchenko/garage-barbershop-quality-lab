import { sendEvent } from './analytics'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Єдина точка аналітики. Мовчить, доки нікуди не підключено.
 *
 * Це події, які ми назвали самі: відкриття запису, тап по вільному вікну,
 * дзвінок, соцмережі, маршрут. Крім них PostHog сам записує кожен клік по
 * будь-якому елементу, тож розмічати решту сторінки руками не треба.
 *
 * Блок gtag лишається на випадок, якщо колись знадобиться ще й GA4: він
 * нічого не робить, доки в index.html не розкоментований лічильник.
 */
export function track(name: string, params: Record<string, unknown> = {}) {
  sendEvent(name, params)
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...params })
  if (typeof window.gtag === 'function') window.gtag('event', name, params)
}
