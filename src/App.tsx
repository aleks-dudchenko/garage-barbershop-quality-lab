import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { BookingProvider } from '@/lib/booking'
import { CallProvider } from './components/CallSheet'
import { Header } from './components/Header'
import { ClosedBar } from './components/ClosedBar'
import { Hero } from './components/Hero'
import { PriceSection } from './components/PriceSection'
import { MastersSection } from './components/MastersSection'
import { AboutSection } from './components/AboutSection'
import { CertificateSection } from './components/CertificateSection'
import { FaqSection } from './components/FaqSection'
import { ContactsSection } from './components/ContactsSection'
import { SiteFooter } from './components/SiteFooter'
import { SlotsPreview } from './components/SlotsPreview'
import { armPreview } from '@/lib/preview'
import { startAnalytics } from '@/lib/analytics'

export function App() {
  /* Радіокнопки показують кільце фокуса і після кліку мишею. Запамʼятовуємо,
     чим людина керує, і малюємо кільце лише з клавіатури. */
  useEffect(() => {
    const root = document.documentElement
    const byKey = (e: KeyboardEvent) => { if (e.key === 'Tab') root.dataset.input = 'keyboard' }
    const byPointer = () => { root.dataset.input = 'pointer' }
    window.addEventListener('keydown', byKey)
    window.addEventListener('pointerdown', byPointer, { passive: true })
    return () => {
      window.removeEventListener('keydown', byKey)
      window.removeEventListener('pointerdown', byPointer)
    }
  }, [])

  /* Смуга показу станів панелі. Вмикається лише адресою з ?demo і лише після
     монтування, щоб перший кадр збігався з пререндером. */
  useEffect(() => { armPreview() }, [])

  /* Застосунок піднявся: запобіжник в index.html більше не знімає клас js,
     і блоки зʼявляються при прокрутці, як задумано. */
  useEffect(() => { document.documentElement.dataset.app = 'ready' }, [])

  /* Аналітика вантажиться окремим шматком і лише коли браузер звільниться:
     перший екран її не чекає. Без ключа не робить нічого. */
  useEffect(() => { startAnalytics() }, [])

  return (
    <MotionConfig reducedMotion="user">
      <BookingProvider>
        <CallProvider>
        <a className="skip" href="#main">До змісту</a>
        <ClosedBar />
        <Header />
        <main id="main">
          <Hero />
          <PriceSection />
          <MastersSection />
          <AboutSection />
          <CertificateSection />
          <FaqSection />
          <ContactsSection />
        </main>
        <SiteFooter />
        <SlotsPreview />
        </CallProvider>
      </BookingProvider>
    </MotionConfig>
  )
}
