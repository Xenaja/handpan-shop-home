// Сборка превью для GitHub Pages: страницы в ../astro, адреса с префиксом /handpan-shop-home/astro.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const out = new URL('../../astro/', import.meta.url);
rmSync(out, { recursive: true, force: true });
execSync('npx astro build', {
  stdio: 'inherit',
  env: { ...process.env, SITE_BASE: '/handpan-shop-home/astro', SITE_OUT: '../astro' }
});
// служебные файлы Astro, которые он оставляет при сборке вне папки проекта
for (const f of ['content-assets.mjs', 'content-modules.mjs']) rmSync(new URL(f, out), { force: true });
