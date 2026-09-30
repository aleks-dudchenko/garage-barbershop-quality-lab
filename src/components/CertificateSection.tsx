import { Reveal } from './Reveal'
import { BtnIcon } from './Icons'
import { PHONE } from './Header'
import { track } from '@/lib/track'

/**
 * Подарунковий сертифікат.
 *
 * Купується дзвінком, не онлайн: Altegio сертифікатами не торгує, а окрему
 * оплату на сайт заради кількох продажів на місяць ставити нема сенсу. Тому
 * головна дія тут це телефон, а не форма.
 *
 * Сума не називається навмисно. Сертифікат Garage виписується на послугу й
 * рівень барбера (чоловіча стрижка, машинкою, борода та вуса), а не на суму,
 * тому «на 500 та 1000 грн», як у сусідів, тут було б неправдою.
 *
 * Термін дії на бланку заповнюють від руки, скільки саме він діє, клієнт ще
 * не сказав. Поки не пишемо нічого: вигадане число тут коштувало б довіри.
 */
export function CertificateSection() {
  return (
    <section
      className="band band--pad sec cert-band"
      id="certificate"
      data-logo="dark"
      aria-labelledby="cert-title"
    >
      {/* Картка з фото приходить блоком, як великі блоки скрізь, а текст у
          ній трохи слідом і з розмиттям, як заголовки інших розділів. Коли
          все їхало одним куском, заголовок тут єдиний на сайті зʼявлявся
          без розмиття. */}
      <Reveal className="cert">
        <Reveal className="cert__card" blur delay={0.08}>
          <p className="eyebrow cert__eyebrow">Сертифікат</p>
          <h2 id="cert-title">Подарунок, який не треба вгадувати.</h2>
          <p className="cert__text">
            Сертифікат на стрижку, бороду або комплекс. Ви обираєте рівень барбера,
            а той, кому дарують, сам обирає день і майстра.
          </p>
          <p className="cert__text">
            Замовити можна дзвінком, забрати в барбершопі на Шевченка, 4Д.
          </p>

          <a
            className="btn btn-light btn-pill cert__cta"
            href={`tel:${PHONE}`}
            onClick={() => track('tel_click', { source: 'certificate' })}
          >
            <span>Замовити дзвінком</span>
            <BtnIcon />
          </a>
        </Reveal>

        {/* Фото самого бланка: на ньому видно, що саме отримує людина, тобто
            послуги й рівень барбера чекбоксами. Обрізаємо по висоті картки,
            щоб колонки стояли врівень. */}
        <picture className="cert__shot">
          <source
            type="image/webp"
            srcSet="/img/certificate-700.webp 700w, /img/certificate.webp 1120w"
            sizes="(min-width: 768px) 46vw, 92vw"
          />
          <img
            src="/img/certificate-700.jpg"
            srcSet="/img/certificate-700.jpg 700w, /img/certificate.jpg 1120w"
            sizes="(min-width: 768px) 46vw, 92vw"
            width={700}
            height={918}
            alt="Подарунковий сертифікат Garage: чекбокси на послугу й рівень барбера"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </Reveal>
    </section>
  )
}
