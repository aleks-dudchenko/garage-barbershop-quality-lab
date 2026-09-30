/** Вісім барберів, зняті з Altegio 21.09.2026. Рівень визначає і ціну, і id послуги. */
export type Barber = {
  id: string
  slug: string
  name: string
  level: string
  top: boolean
  rating: string
  votes: string
  href: string
  eager: boolean
}

export const barbers: Barber[] = [
  {
    "id": "1000107",
    "slug": "plakhotniuk",
    "name": "Анна Плахотнюк",
    "level": "Топ Барбер",
    "top": true,
    "rating": "4,99",
    "votes": "930 оцінок",
    "href": "https://n100000.alteg.io/?o=m1000107",
    "eager": true
  },
  {
    "id": "1000110",
    "slug": "devotchenkova",
    "name": "Яна Девотченкова",
    "level": "Топ Барбер",
    "top": true,
    "rating": "4,99",
    "votes": "542 оцінки",
    "href": "https://n100000.alteg.io/?o=m1000110",
    "eager": true
  },
  {
    "id": "1000111",
    "slug": "zubenko",
    "name": "Анна Зубенко",
    "level": "Топ Барбер",
    "top": true,
    "rating": "4,99",
    "votes": "415 оцінок",
    "href": "https://n100000.alteg.io/?o=m1000111",
    "eager": true
  },
  {
    "id": "1000109",
    "slug": "kuznetsov",
    "name": "Максим Кузнецов",
    "level": "Старший Барбер",
    "top": false,
    "rating": "5,0",
    "votes": "464 оцінки",
    "href": "https://n100000.alteg.io/?o=m1000109",
    "eager": false
  },
  {
    "id": "1000113",
    "slug": "hudyma",
    "name": "Надія Гудима",
    "level": "Барбер",
    "top": false,
    "rating": "4,95",
    "votes": "212 оцінок",
    "href": "https://n100000.alteg.io/?o=m1000113",
    "eager": false
  },
  {
    "id": "1000112",
    "slug": "chernyshenko",
    "name": "Олена Чернишенко",
    "level": "Барбер",
    "top": false,
    "rating": "4,93",
    "votes": "149 оцінок",
    "href": "https://n100000.alteg.io/?o=m1000112",
    "eager": false
  },
  {
    "id": "1000114",
    "slug": "shevchenko",
    "name": "Анна Шевченко",
    "level": "Барбер",
    "top": false,
    "rating": "4,99",
    "votes": "91 оцінка",
    "href": "https://n100000.alteg.io/?o=m1000114",
    "eager": false
  },
  {
    "id": "1000115",
    "slug": "bartashova",
    "name": "Марія Барташова",
    "level": "Молодший Барбер",
    "top": false,
    "rating": "4,89",
    "votes": "36 оцінок",
    "href": "https://n100000.alteg.io/?o=m1000115",
    "eager": false
  }
]
