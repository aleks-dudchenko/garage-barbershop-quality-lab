import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Потрібен компонентам motion-primitives: зливає класи Tailwind без конфліктів. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Номер пункту в списку, що зʼявляється по черзі (.stagger у garage.css).
 * Після шостого пункти йдуть разом із шостим: довший хвіст уже не читається
 * як ритм, а як очікування.
 */
export function staggerIndex(i: number) {
  return { '--i': Math.min(i, 6) } as React.CSSProperties
}
