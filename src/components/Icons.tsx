/** Стрілка «назовні». Раніше лежала в SVG-спрайті під id="arr". */
export function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 12.5L12.5 3.5M12.5 3.5H5.75M12.5 3.5V10.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Кругла плашка в пігулці: друга стрілка виїжджає на місце першої при наведенні. */
export function BtnIcon() {
  return (
    <span className="btn-icon" aria-hidden="true">
      <Arrow />
      <Arrow />
    </span>
  )
}

/** Те саме, але для текстового посилання. */
export function TextIcon() {
  return (
    <span className="btn-text-icon" aria-hidden="true">
      <Arrow />
      <Arrow />
    </span>
  )
}

/** Зірка рейтингу. Заливка, той самий кегль, що й стрілка, замість гліфа «★». */
export function Star() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.6l1.95 4.1 4.45.58-3.26 3.1.83 4.43L8 11.63l-3.97 2.18.83-4.43L1.6 6.28l4.45-.58z" />
    </svg>
  )
}

/** Стрілка «далі» в текстовому посиланні, замість «→». */
export function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 8h11M9.25 3.75L13.5 8l-4.25 4.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Місяць у рядку «Зараз зачинено» в герої. Суцільний, як зірка оцінки під ним. */
export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

/** Слухавка для кнопки дзвінка в шапці на вузькому екрані. */
export function PhoneIcon() {
  return (
    /* Суцільна, а не контурна: у шапці вона стоїть сама на підкладці, і
       заповнений силует читається з відстані краще за лінію 1,5 px. */
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5.1 2.5H3.3c-.6 0-1.1.5-1.1 1.1C2.2 9 7 13.8 12.4 13.8c.6 0 1.1-.5 1.1-1.1v-1.8c0-.5-.3-.9-.8-1l-1.9-.5c-.4-.1-.8 0-1 .4l-.6.8C7.5 9.8 6.2 8.5 5.4 6.8l.8-.6c.4-.2.5-.6.4-1l-.5-1.9c-.1-.5-.5-.8-1-.8z" />
    </svg>
  )
}

/** Хрестик закриття аркуша дзвінка. Та сама товщина лінії, що в стрілок. */
export function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

/** «Скопіювати номер» у вікні дзвінка: два аркуші, передній цілий. */
export function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.25" y="5.25" width="8.5" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.75 5.25v-1a2 2 0 0 0-2-2h-4.5a2 2 0 0 0-2 2v4.5a2 2 0 0 0 2 2h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Галочка на місці «Скопіювати», коли номер уже в буфері. */
export function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Позначка відео на плитці Instagram: відтворюється воно вже там. */
export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5.5 3.6v8.8c0 .5.5.8 1 .5l6.6-4.4c.4-.3.4-.8 0-1L6.5 3.1c-.5-.3-1 0-1 .5z" />
    </svg>
  )
}

/** Плюс у питанні FAQ. Вертикальна риска окремим шляхом: коли відповідь
    відкрита, вона лягає горизонтально, і плюс стає мінусом. */
export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 8h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 2.5v11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
