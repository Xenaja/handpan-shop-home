# Сайт U-GENE sound vibe на Astro

Исходники главной (`/`) и «Обучения» (`/cources`). Правила — `../../SEO/SEO-MIGRATION.md`.

- `src/data/site.json` — тексты и данные: аудитории, цифры, преподаватели, форматы, FAQ, контакты. `null` — данных ещё нет (`../light/PENDING.md`).
- `src/pages/` — страницы, `src/layouts/Base.astro` — общий `<head>`, `src/components/` — общие куски.
- `public/` — CSS, JS и картинки, копируются как есть.

Команды:
- `npm run dev` — локальный сервер с перезагрузкой;
- `npm run preview` — сборка превью для GitHub Pages в `../astro` (адреса `/handpan-shop-home/astro/…`);
- `npm run build` — сборка для боевого сайта в `dist/`.

Линии из знака (`public/img/lines/line-inner|middle|outer.svg`) — центральные линии колец логотипа, по одной на экран, класс `.contour` в `common.css`. Пересобрать из исходного знака: `python -I scripts/logo-lines.py ../../logo/svg/U-GENE-icon.svg public/img/lines`.

## Перед запуском

- `seo/url-map.csv` — карта адресов старого сайта (единственный источник правды для редиректов). `TODO` — страницы, которых ещё нет или по которым ждём решения заказчика.
- `node scripts/seo-check.mjs <адрес>` — проверка по разделу 14 SEO-документа. Для превью: `node scripts/seo-check.mjs https://xenaja.github.io/handpan-shop-home/astro --staging --skip-todo`.
- `node scripts/fetch-fonts.mjs` — заново скачать шрифты (кириллица и латиница) в `public/fonts`.
- Яндекс Метрика 90206720 включается только на домене handpanshop.pro; цели — `lead_submit`, `click_phone|tg|wa|email|max`, `audio_play` (`HS.goal` в `common.js`). На превью цели видны в консоли с `?dev`.
- Заявки уходят на `ENDPOINT` в `common.js` — пока `null`, обработчика нет до появления хостинга.
- Боевая сборка (`npm run build`) снимает общий `noindex`; у `/consent`, `/politikaconfidencialnosti` и 404 он остаётся.
