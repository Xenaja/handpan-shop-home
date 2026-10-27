# Сайт U-GENE sound vibe на Astro

Исходники главной (`/`) и «Обучения» (`/cources`). Правила — `../../SEO/SEO-MIGRATION.md`.

- `src/data/site.json` — тексты и данные: аудитории, цифры, преподаватели, форматы, FAQ, контакты. `null` — данных ещё нет (`../light/PENDING.md`).
- `src/pages/` — страницы, `src/layouts/Base.astro` — общий `<head>`, `src/components/` — общие куски.
- `public/` — CSS, JS и картинки, копируются как есть.

Команды:
- `npm run dev` — локальный сервер с перезагрузкой;
- `npm run preview` — сборка превью для GitHub Pages в `../astro` (адреса `/handpan-shop-home/astro/…`);
- `npm run build` — сборка для боевого сайта в `dist/`.
