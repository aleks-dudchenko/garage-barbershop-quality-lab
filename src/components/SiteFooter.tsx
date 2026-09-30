import { Brand, NAV } from './Header'
import { track } from '@/lib/track'

export function SiteFooter() {
  return (
    <footer className="band band--ink site-footer" data-logo="light">
      <hr className="rule" />
      <div className="footer__inner" style={{ paddingTop: 28 }}>
        <a className="brand" href="#top" aria-label="Garage Barbershop, на початок">
          <Brand />
        </a>
        <ul className="footer__nav">
          {NAV.map(([label, href]) => (
            <li key={href}><a href={href}>{label}</a></li>
          ))}
        </ul>
        <ul className="footer__social">
          <li>
            <a
              href="https://www.instagram.com/barbershop_garage_irpin/"
              target="_blank"
              rel="noopener"
              onClick={() => track('social_click', { network: 'instagram' })}
            >Instagram</a>
          </li>
          <li>
            <a
              href="https://www.facebook.com/barbershop.garageirpin/"
              target="_blank"
              rel="noopener"
              onClick={() => track('social_click', { network: 'facebook' })}
            >Facebook</a>
          </li>
        </ul>
        <p className="footer__credit">
          <span>Розробка і дизайн:</span>
          {/* Веде в Telegram розробника, а не на Behance: звідти одразу можна
              написати, і для цього не треба бути в контактах. */}
          <a href="https://t.me/ad23design" target="_blank" rel="noopener" aria-label="ad23design у Telegram">
            <img src="/img/dev.svg" width={24} height={37} alt="" />
          </a>
        </p>
      </div>
    </footer>
  )
}
