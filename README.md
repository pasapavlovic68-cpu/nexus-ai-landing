# Nexus AI Landing Page

Лендинг компании **Nexus AI** — разработка Chrome-расширений, веб-сайтов и инструментов автоматизации с использованием искусственного интеллекта. Сайт: [nexusnova.app](https://nexusnova.app).

## Как открыть локально

Просто откройте `index.html` в браузере — сборка не требуется. Гео-функция локально не работает — язык берётся по умолчанию.

## Стек

- Vanilla HTML / CSS / JS — один файл, без зависимостей, сборщиков и npm-пакетов
- Анимированный фон — сеть узлов на `<canvas>`
- Эстетика liquid glass, тёмный premium-фон `#05060a`, фирменный цвет electric blue `#4f8cff`
- Два языка (RU / EN) — словари прямо в `index.html`

## Структура

- `index.html` — весь лендинг
- `functions/api/geo.js` — Cloudflare Pages Function `/api/geo`: читает заголовок `cf-ipcountry` и возвращает `{ country, lang }` — `ru` для стран СНГ, иначе `en`
- `api/geo.js` — старая версия гео-функции для Vercel, оставлена для истории (как и `vercel.json`)
- `404.html` — страница «не найдено» (RU + EN, `noindex`); без неё Cloudflare Pages отдаёт `index.html` на любой путь
- `robots.txt`, `sitemap.xml` — для поисковиков
- `favicon.svg`, `og-image.png`, `assets/` — иконка, превью для соцсетей, медиа

## Деплой

Сайт размещён на [Cloudflare Pages](https://pages.cloudflare.com) как статичный проект без сборки. Автодеплой — при каждом push в `main`.
