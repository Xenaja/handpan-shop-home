// Шрифты со своего сервера (SEO-MIGRATION.md, раздел 9): скачивает woff2 с Google Fonts,
// оставляет только кириллицу и латиницу, пишет public/fonts/*.woff2 и public/fonts.css.
// Запуск: node scripts/fetch-fonts.mjs
import { writeFileSync } from 'node:fs';

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;500&family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const KEEP = ['cyrillic', 'latin'];

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const blocks = [...css.matchAll(/\/\* ([\w-]+) \*\/\s*(@font-face \{[^}]+\})/g)];
let out = '/* Шрифты со своего сервера: кириллица и латиница (scripts/fetch-fonts.mjs) */\n';
for (const [, subset, face] of blocks) {
  if (!KEEP.includes(subset)) continue;
  const family = face.match(/font-family: '([^']+)'/)[1];
  const weight = face.match(/font-weight: (\d+)/)[1];
  const url = face.match(/url\((https:[^)]+)\)/)[1];
  const name = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}-${subset}.woff2`;
  writeFileSync(new URL(`../public/fonts/${name}`, import.meta.url), Buffer.from(await (await fetch(url)).arrayBuffer()));
  out += `/* ${subset} */\n` + face.replace(url, `fonts/${name}`) + '\n';
}
writeFileSync(new URL('../public/fonts.css', import.meta.url), out);
console.log('ok', blocks.filter(b => KEEP.includes(b[1])).length, 'faces');
