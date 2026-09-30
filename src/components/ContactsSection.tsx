import { Reveal } from './Reveal'
import { PHONE, PHONE_LABEL, PHONE_ALT, PHONE_ALT_LABEL } from './Header'
import { TextIcon } from './Icons'
import { track } from '@/lib/track'

const EMBED =
  'https://maps.google.com/maps?q=Garage%20Barbershop%20%D0%86%D1%80%D0%BF%D1%96%D0%BD%D1%8C&z=16&hl=uk&output=embed'
const MAPS =
  'https://www.google.com/maps/search/?api=1&query=Garage%20Barbershop&query_place_id=ChIJ1xMBqjIyK0cRwRWlahjkupQ'

export function ContactsSection() {
  return (
    <section className="band band--ink sec" id="contacts" data-logo="light" aria-labelledby="contacts-title">
      <div className="contacts">
        <Reveal className="contacts__info" blur>
          <p className="eyebrow">Контакти</p>
          <h2 id="contacts-title">Ірпінь, Шевченка 4-Д</h2>
          <a
            className="btn-text"
            href={MAPS}
            target="_blank"
            rel="noopener"
            onClick={() => track('route_click')}
          >
            <span>Прокласти маршрут</span>
            <TextIcon />
          </a>
          <div className="contacts__blocks">
            <div className="contacts__block">
              <span className="contacts__label">Телефони</span>
              <p><a href={`tel:${PHONE}`} onClick={() => track('tel_click', { source: 'contacts' })}>{PHONE_LABEL}</a></p>
              <p><a href={`tel:${PHONE_ALT}`} onClick={() => track('tel_click', { source: 'contacts' })}>{PHONE_ALT_LABEL}</a></p>
            </div>
            <div className="contacts__block">
              <span className="contacts__label">Графік</span>
              <p>Щодня з 09:00 до 20:00</p>
            </div>
            <div className="contacts__block">
              <span className="contacts__label">Соцмережі</span>
              <p>
                <a href="https://www.instagram.com/barbershop_garage_irpin/" target="_blank" rel="noopener" onClick={() => track('social_click', { network: 'instagram' })}>Instagram</a>
                <a href="https://www.facebook.com/barbershop.garageirpin/" target="_blank" rel="noopener" onClick={() => track('social_click', { network: 'facebook' })}>Facebook</a>
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="contacts__map" delay={0.06}>
          {/* Питаємо сам заклад, а не адресу: текстовий запит зводив на чужу
              будівлю «Шевченка, 4в». */}
          <iframe
            title="Garage Barbershop на карті Google"
            src={EMBED}
            width={600}
            height={450}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </Reveal>
      </div>
    </section>
  )
}
