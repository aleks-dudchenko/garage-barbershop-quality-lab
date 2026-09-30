import { useState } from 'react'
import { SCENARIOS, setScenario, usePreviewEnabled, usePreviewScenario } from '@/lib/preview'

/**
 * Перемикач станів панелі вільних вікон.
 *
 * Видно лише за адресою з `?demo`, тобто на зустрічі й ніколи у відвідувача.
 *
 * Згорнутий за замовчуванням: розгорнута смуга стояла знизу рівно там, де
 * і сама панель вікон, і заважала дивитись саме те, що показує. Тепер у
 * кутку лежить маленька пігулка, і вона ж підказує поточний стан.
 */
export function SlotsPreview() {
  const enabled = usePreviewEnabled()
  const current = usePreviewScenario() ?? 'auto'
  const [open, setOpen] = useState(false)

  if (!enabled) return null
  const active = SCENARIOS.find((s) => s.key === current)

  if (!open) {
    /* На телефоні панель вікон на всю ширину, тож будь-що плаваюче щось та
       накриє. Лишаємо мінімум: кружечок у кутку. Він світиться, коли
       увімкнений не справжній стан, щоб не забути вимкнути показ. */
    return (
      <button
        className={`preview-toggle${current === 'auto' ? '' : ' is-fake'}`}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
        aria-label={`Показ станів панелі: ${active?.short}. Розгорнути`}
        title={`Показ станів: ${active?.short}`}
      >
        <span className="preview__dot" aria-hidden="true" />
      </button>
    )
  }

  return (
    <aside className="preview" aria-label="Показ станів панелі вільних вікон">
      <p className="preview__hint">
        <span className="preview__dot" aria-hidden="true" />
        Показ станів. Розклад і запис не міняються
        <button
          className="preview__close"
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Згорнути"
        >
          ✕
        </button>
      </p>
      <fieldset className="seg preview__seg">
        <legend className="sr-only">Стан панелі вільних вікон</legend>
        {SCENARIOS.map(({ key, short, what }) => (
          <label className="seg__item" key={key} title={what}>
            <input
              type="radio"
              name="preview-scenario"
              value={key}
              checked={current === key}
              onChange={() => setScenario(key)}
            />
            <span>{short}</span>
          </label>
        ))}
      </fieldset>
      <p className="preview__what">{active?.what}</p>
    </aside>
  )
}
