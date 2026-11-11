// Редиректы для nginx из seo/url-map.csv (SEO-MIGRATION.md, раздел 2.4): руками конфиг не правится.
//   node scripts/redirects.mjs            → seo/nginx/handpanshop-redirects.map и seo/nginx/handpanshop-gone.conf
// В server-блоке:  map $uri $redirect_to { include …/handpanshop-redirects.map; }
//                  if ($redirect_to) { return 301 $redirect_to; }
//                  include …/handpanshop-gone.conf;
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const rows = readFileSync(new URL('../seo/url-map.csv', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1)
  .map(line => { const [old, next, action] = line.split(','); return { old: old.trim(), next: next.trim(), action: action.trim() }; });

const moved = rows.filter(r => r.action === '301' && r.old && r.next);
const gone = rows.filter(r => r.action === '410' && r.old);
const bad = moved.filter(r => moved.some(x => x.old === r.next));
if (bad.length) { console.error('Цепочки редиректов (нужен один прыжок):', bad.map(r => r.old).join(', ')); process.exit(1); }

const dir = new URL('../seo/nginx/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('handpanshop-redirects.map', dir),
  '# сгенерировано scripts/redirects.mjs из seo/url-map.csv — не править руками\n' + moved.map(r => `${r.old} ${r.next};`).join('\n') + '\n');
writeFileSync(new URL('handpanshop-gone.conf', dir),
  '# сгенерировано scripts/redirects.mjs из seo/url-map.csv — не править руками\n' + gone.map(r => `location = ${r.old} { return 410; }`).join('\n') + '\n');
console.log(`301: ${moved.length}, 410: ${gone.length} → seo/nginx/`);
