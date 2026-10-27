// sitemap.xml при сборке: только индексируемые страницы с кодом 200 (SEO-MIGRATION.md, раздел 8).
// Новая страница попадает сюда, когда её добавят в PAGES.
const PAGES = ['/', '/cources'];

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map(p => `  <url><loc>https://handpanshop.pro${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
