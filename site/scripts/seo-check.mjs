// Проверка сайта перед запуском (SEO-MIGRATION.md, раздел 14). Node 18+, без зависимостей.
//
//   node scripts/seo-check.mjs https://handpanshop.pro                     — боевой сайт
//   node scripts/seo-check.mjs https://test.handpanshop.pro --staging --auth user:pass
//   node scripts/seo-check.mjs https://xenaja.github.io/handpan-shop-home/astro --staging --skip-todo
//
// --staging    тестовая версия: noindex допустим, редиректы домена не проверяются
// --skip-todo  пропустить строки url-map.csv с пометкой TODO (страницы, которых ещё нет)
// Код выхода 1, если есть ошибки.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const base = (args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--auth') || '').replace(/\/$/, '');
const staging = args.includes('--staging'), skipTodo = args.includes('--skip-todo');
const auth = args.includes('--auth') ? 'Basic ' + Buffer.from(args[args.indexOf('--auth') + 1]).toString('base64') : null;
if (!base) { console.error('Укажите адрес сайта: node scripts/seo-check.mjs https://…'); process.exit(2); }
const prefix = new URL(base).pathname.replace(/\/$/, '');

const errors = [], warns = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warns.push(`${where}: ${msg}`);
const get = (path, opts = {}) => fetch(base + path, { redirect: 'manual', headers: auth ? { Authorization: auth } : {}, ...opts });
// GitHub Pages и т.п. отдают страницу по адресу с префиксом — сравниваем пути без него
const strip = p => (p.startsWith(prefix) ? p.slice(prefix.length) : p) || '/';

/* ---------- 1. карта адресов ---------- */
const rows = readFileSync(new URL('../seo/url-map.csv', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1)
  .map(l => { const [old_path, new_path, action, ...note] = l.split(','); return { old_path, new_path, action, note: note.join(',') }; });
const pages = new Set();
for (const r of rows) {
  if (skipTodo && r.note.startsWith('TODO')) continue;
  const path = r.old_path || r.new_path;
  const res = await get(path);
  if (r.action === 'keep' || r.action === 'new' || r.action === 'noindex') {
    if (res.status !== 200) { err(path, `ожидали 200, получили ${res.status}`); continue; }
    if (r.action !== 'noindex') pages.add(path);
    if (r.action === 'noindex') {
      const html = await res.text();
      if (!/<meta name="robots" content="[^"]*noindex/.test(html) && !/noindex/.test(res.headers.get('x-robots-tag') || '')) err(path, 'ожидали noindex');
    }
  } else if (r.action === '301') {
    const loc = res.headers.get('location');
    if (res.status !== 301) err(path, `ожидали 301, получили ${res.status}`);
    else if (!loc || strip(new URL(loc, base + path).pathname) !== r.new_path) err(path, `301 ведёт на ${loc}, а нужно на ${r.new_path}`);
    else {
      const next = await get(r.new_path);
      if (next.status !== 200) err(path, `цепочка редиректов: ${r.new_path} отдаёт ${next.status}`);
    }
  } else if (r.action === '410') {
    if (res.status !== 410) err(path, `ожидали 410, получили ${res.status}`);
  }
}

/* ---------- 2. каждая индексируемая страница ---------- */
const titles = new Map(), descs = new Map();
const MIXED = /[а-яё][a-z]|[a-z][а-яё]/i;   // латиница внутри русского слова: «Cталь», «Нandpan»
for (const path of pages) {
  const html = await (await get(path)).text();
  const text = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/<html[^>]*lang="ru"/.test(html)) err(path, 'нет lang="ru"');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (title.length < 30 || title.length > 70) err(path, `title ${title.length} символов (нужно 30–70): «${title}»`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (desc.length < 100 || desc.length > 170) err(path, `description ${desc.length} символов (нужно 100–170)`);
  titles.set(title, [...(titles.get(title) || []), path]);
  descs.set(desc, [...(descs.get(desc) || []), path]);
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canon) err(path, 'нет canonical');
  else if (new URL(canon).pathname !== path) err(path, `canonical ведёт на ${canon}`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(path, `H1: ${h1}, нужен ровно один`);
  if (!staging && /<meta name="robots" content="[^"]*noindex/.test(html)) err(path, 'на боевом сайте стоит noindex');
  for (const img of html.match(/<img\b[^>]*>/g) || []) {
    const src = (img.match(/src="([^"]+)"/) || [])[1];
    if (!/\salt=/.test(img)) err(path, `картинка без alt: ${src}`);
    if (!/\swidth=/.test(img) || !/\sheight=/.test(img)) warn(path, `картинка без width/height: ${src}`);
  }
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch (e) { err(path, 'JSON-LD не разбирается: ' + e.message); }
  }
  const body = text(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' '));
  for (const w of new Set(body.match(/[A-Za-zА-Яа-яЁё]+/g) || [])) if (MIXED.test(w)) err(path, `латиница внутри русского слова: «${w}»`);
}

/* ---------- 3. повторы title и description ---------- */
for (const [t, ps] of titles) if (ps.length > 1) err(ps.join(', '), `одинаковый title «${t}»`);
for (const [d, ps] of descs) if (ps.length > 1) err(ps.join(', '), 'одинаковый description');

/* ---------- 4. sitemap.xml ---------- */
const sm = await get('/sitemap.xml');
if (sm.status !== 200) err('/sitemap.xml', `код ${sm.status}`);
else for (const [, loc] of (await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const path = new URL(loc).pathname;
  const res = await get(path);
  if (res.status !== 200) { err('sitemap', `${path} отдаёт ${res.status}`); continue; }
  const html = await res.text();
  if (!staging && /<meta name="robots" content="[^"]*noindex/.test(html)) err('sitemap', `${path} закрыт noindex`);
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canon || new URL(canon).pathname !== path) err('sitemap', `${path}: canonical не на себя`);
}

/* ---------- 5. robots.txt ---------- */
const rb = await get('/robots.txt');
if (rb.status !== 200) err('/robots.txt', `код ${rb.status}`);
else {
  const t = await rb.text();
  if (!/^Sitemap:/m.test(t)) err('/robots.txt', 'нет строки Sitemap');
  if (!staging && /^Disallow:\s*\/\s*$/m.test(t)) err('/robots.txt', 'на боевом сайте закрыт весь сайт (Disallow: /)');
}

/* ---------- 6. домен, слеш, 404 (только боевой) ---------- */
if (!staging) {
  const host = new URL(base).host;
  const one = async (url, want) => {
    const r = await fetch(url, { redirect: 'manual' });
    const loc = r.headers.get('location');
    if (r.status !== 301 || loc !== want) err(url, `ожидали 301 на ${want}, получили ${r.status} ${loc || ''}`);
  };
  await one(`http://${host}/cources`, `https://${host}/cources`);
  await one(`https://www.${host}/cources`, `https://${host}/cources`);
  await one(`${base}/cources/`, `${base}/cources`);
  const nf = await get('/net-takoy-stranicy-' + Date.now());
  if (nf.status !== 404) err('404', `несуществующий адрес отдаёт ${nf.status}`);
}

/* ---------- итог ---------- */
for (const w of warns) console.log('  предупреждение · ' + w);
for (const e of errors) console.log('  ошибка · ' + e);
console.log(`\n${errors.length ? '✗' : '✓'} ${base}: ${pages.size} стр., ошибок ${errors.length}, предупреждений ${warns.length}`);
process.exit(errors.length ? 1 : 0);
