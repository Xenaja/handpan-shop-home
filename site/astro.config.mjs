// Сборка статического сайта. Адреса как на Тильде: без слеша на конце и без .html (SEO-MIGRATION.md, п. 1.3).
// Превью на GitHub Pages: SITE_BASE=/handpan-shop-home/astro; боевой сайт — base по умолчанию «/».
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://handpanshop.pro',
  base: process.env.SITE_BASE || '/',
  outDir: process.env.SITE_OUT || './dist',
  trailingSlash: 'never',
  build: { format: 'file', assets: 'assets' },
  compressHTML: false
});
