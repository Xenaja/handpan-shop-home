/* Главная — светлая версия: схема ханга, вкладки, счётчик, карусель преподавателей, контакты, формы. */
(() => {
  'use strict';
  const { $, $$, esc, nb, tone, FREQS, reduce } = HS;
  const C = JSON.parse($('#content').textContent);
  const DEV = HS.DEV;

  /* ---------- звук: композиция-заглушка 1:20 (P-01) ---------- */
  const PATTERN = [0, -1, 4, 5, 6, 5, 4, -1, 0, 2, 3, 4, 3, 2, 1, -1, 0, 5, 6, 7, 8, 7, 6, 5, 0, -1, 4, 3, 2, 3, 1, -1];
  HS.player({
    pattern: PATTERN, duration: 80,
    onTick(t, d) {
      const on = document.body.classList.contains('is-playing');
      $$('[data-time]').forEach(el => { el.textContent = HS.fmtTime(t); });
      $$('[data-time-wrap]').forEach(el => { el.hidden = !on; });
      $$('[data-progress]').forEach(el => { el.style.width = (t / d * 100).toFixed(2) + '%'; });
    }
  });

  /* ---------- раскрывашки и звёздочка ---------- */
  $$('[data-toggle]').forEach(b => {
    const panel = $(`[data-panel="${b.dataset.toggle}"]`), sign = $('[data-sign]', b);
    if (!panel.id) panel.id = 'panel-' + b.dataset.toggle;
    b.setAttribute('aria-controls', panel.id);
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      if (sign) sign.textContent = open ? '−' : '+';
    });
  });

  /* ---------- 02: схема ханга, поля кликабельны ---------- */
  const NAMES = ['A3', 'B♭3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'];
  const ANGLES = [100, 60, 145, 20, 195, 335, 245, 290];
  const NS = 'http://www.w3.org/2000/svg';
  const REST = 'rgba(0,0,0,.16)';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  $$('[data-hang]').forEach(svg => {
    const add = (shape, label, x, y, size, i, aria) => {
      const g = svgEl('g', { class: 'hang-hit', tabindex: '0', role: 'button', 'aria-label': aria });
      shape.setAttribute('fill', REST);
      const tx = svgEl('text', { x, y, 'text-anchor': 'middle', 'font-family': "'JetBrains Mono', monospace", 'font-size': size, fill: '#E8EEF4', 'pointer-events': 'none' });
      tx.textContent = label;
      g.append(shape, tx);
      const go = e => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        tone(FREQS[i], 0.25, i === 0 ? 6 : 4);
        shape.setAttribute('fill', getComputedStyle(svg.parentNode).getPropertyValue('--hang-hit').trim());
        clearTimeout(shape._t);
        shape._t = setTimeout(() => shape.setAttribute('fill', REST), 450);
      };
      g.addEventListener('pointerdown', go);
      g.addEventListener('keydown', go);
      svg.appendChild(g);
    };
    ANGLES.forEach((a, i) => {
      const r = a * Math.PI / 180, cx = +(200 + 132 * Math.cos(r)).toFixed(1), cy = +(200 + 132 * Math.sin(r)).toFixed(1);
      add(svgEl('ellipse', { cx, cy, rx: 38, ry: 29, transform: `rotate(${a + 90} ${cx} ${cy})`, stroke: 'rgba(232,238,244,.55)', 'stroke-width': 1 }),
        NAMES[i], cx, cy + 4, 11, i + 1, 'Нота ' + NAMES[i]);
    });
    add(svgEl('circle', { cx: 200, cy: 200, r: 54, stroke: 'rgba(232,238,244,.7)', 'stroke-width': 1 }), 'D3', 200, 204, 12, 0, 'Динг, нота D3');
  });

  /* ---------- 05: кому подходит ---------- */
  const tabsEl = $('[data-tabs]'), panel = $('#aud-panel'), A = C.audiences;
  tabsEl.innerHTML = A.map((a, i) =>
    `<button type="button" class="chip" role="tab" id="tab-${i}" aria-controls="aud-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(a.name)}</button>`).join('');
  const tabs = $$('.chip', tabsEl);
  let tab = 0;
  // pending: в dev — пунктирная рамка; если значения нет совсем, в prod элемент скрыт (план Б)
  const pend = (el, id, missing) => { if (id && (missing || DEV)) el.dataset.pending = id; else delete el.dataset.pending; };
  function setTab(i, focus, hash = true) {
    tab = i;
    const a = A[i];
    tabs.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'tab-' + i);
    $('[data-aud="name"]', panel).textContent = a.name;
    $('[data-aud="text"]', panel).textContent = nb(a.text);
    $('[data-aud="link"]', panel).textContent = nb(a.link);
    const img = $('[data-aud-img]');
    img.src = a.img; img.alt = a.alt; img.style.objectPosition = a.pos;
    const fit = $('[data-aud-fit]', panel);
    $('[data-aud="fit"]', fit).textContent = nb(a.fit || 'уточнить');
    pend(fit, a.fitPending, !a.fit);
    const rec = $('[data-aud-rec]');
    $('[data-aud="rec"]', rec).textContent = a.rec || 'уточнить';
    pend(rec, a.recPending, !a.rec);
    if (focus) tabs[i].focus();
    if (hash) try { history.replaceState(null, '', '#' + encodeURIComponent(a.name.toLowerCase())); } catch (e) {}
  }
  tabs.forEach((b, i) => b.addEventListener('click', () => setTab(i)));
  tabsEl.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); setTab((tab + k + A.length) % A.length, true); }
    else if (e.key === 'Home') { e.preventDefault(); setTab(0, true); }
    else if (e.key === 'End') { e.preventDefault(); setTab(A.length - 1, true); }
  });
  const fromHash = A.findIndex(a => '#' + encodeURIComponent(a.name.toLowerCase()) === location.hash);
  setTab(fromHash >= 0 ? fromHash : 0, false, false);
  addEventListener('load', () => A.forEach(a => { new Image().src = a.img; }));
  $('[data-aud-play]').addEventListener('click', () => {
    const s = A[tab].snd, F = FREQS;
    if (s === 'long') tone(F[0], 0.28, 10);
    else if (s === 'fast') [0, 5, 6, 7, 8, 6, 4].forEach((n, i) => tone(F[n], 0.16, 3, i * 0.16));
    else [0, 4, 5, 6, 4].forEach((n, i) => tone(F[n], 0.17, 3.5, i * 0.38));
  });

  /* ---------- 06: одна большая цифра, столбик прокручивается вверх ---------- */
  const S = C.stats, sWrap = $('[data-stats-wrap]'), col = $('[data-stat-col]');
  const fmtN = n => n >= 1000 ? Math.round(n).toLocaleString('ru-RU') : String(Math.round(n));
  col.innerHTML = S.map(s => `<span>${fmtN(s.n)}${esc(s.suf)}</span>`).join('');
  const nums = $$('span', col);
  $('[data-stat-dots]').innerHTML = S.map((s, i) => `<button type="button" class="s6-dot" aria-label="Цифра ${i + 1}: ${esc(fmtN(s.n) + s.suf)}"></button>`).join('');
  const dots = $$('.s6-dot', sWrap);
  let si = 0, siv = null, seen = false, hold = false;
  function setStat(i) {
    si = i;
    col.style.transform = `translateY(${0.55 - i}em)`;
    nums.forEach((n, k) => n.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    $('[data-stat-label]').textContent = nb(S[i].label);
    $('[data-stat-count]').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(S.length).padStart(2, '0');
  }
  // автосмена каждые 3 с после появления; пауза под курсором и фокусом; без неё при reduced-motion
  function run() {
    clearInterval(siv);
    if (reduce || !seen) return;
    siv = setInterval(() => { if (!hold) setStat((si + 1) % S.length); }, 3000);
  }
  dots.forEach((d, i) => d.addEventListener('click', () => { setStat(i); run(); }));
  sWrap.addEventListener('pointerenter', () => { hold = true; });
  sWrap.addEventListener('pointerleave', () => { hold = false; });
  sWrap.addEventListener('focusin', () => { hold = true; });
  sWrap.addEventListener('focusout', () => { hold = false; });
  setStat(0);
  if ('IntersectionObserver' in window && !reduce) {
    const first = nums[0];
    first.textContent = '0' + S[0].suf;
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect(); seen = true; run();
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1600);
        first.textContent = fmtN(S[0].n * (1 - Math.pow(1 - k, 3))) + S[0].suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.2 });
    io.observe(sWrap);
  }

  /* ---------- 07: карусель преподавателей, бесконечная ---------- */
  const T = C.teachers, car = $('[data-tcar]'), n = T.length;
  const initials = s => s.split(/\s+/).map(w => w[0]).join('').slice(0, 2);
  car.innerHTML = T.map((p, i) =>
    `<button type="button" class="tcard" data-i="${i}" aria-label="${esc(p.name)}">` +
    (p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" style="object-position:${esc(p.pos || '50% 30%')}">`
      : `<span class="tcard-ini" aria-hidden="true"${DEV ? ' data-pending-link="P-13"' : ''}>${esc(initials(p.name))}</span>`) +
    `<span class="tcard-shade"></span><span class="tcard-cap"><span class="tcard-name">${esc(p.name)}</span><span class="tcard-role">${esc(nb(p.role))}</span></span></button>`).join('');
  const cards = $$('.tcard', car);
  let ti = 0;
  const off = i => { let o = ((i - ti) % n + n) % n; if (o > n / 2) o -= n; return o; };
  function setT(next) {
    const prev = cards.map((c, i) => off(i));
    ti = ((next % n) + n) % n;
    cards.forEach((c, i) => {
      const o = off(i), key = Math.abs(o) <= 2 ? String(o) : 'far';
      // карточка, которая переезжает через край, не летит через всю ленту, а проявляется на новом месте
      if (Math.abs(o - prev[i]) > 1) {
        c.style.transition = 'none'; c.style.opacity = '0'; c.dataset.o = key;
        void c.offsetWidth;
        c.style.transition = ''; c.style.opacity = '';
      } else c.dataset.o = key;
      c.tabIndex = o === 0 || Math.abs(o) === 1 ? 0 : -1;
      c.setAttribute('aria-current', String(o === 0));
    });
    $('[data-t-count]').textContent = String(ti + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
  }
  cards.forEach((c, i) => c.addEventListener('click', () => { if (off(i)) setT(ti + off(i)); }));
  $('[data-t-prev]').addEventListener('click', () => setT(ti - 1));
  $('[data-t-next]').addEventListener('click', () => setT(ti + 1));
  let tx = null;
  car.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  car.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 40) setT(ti + (dx < 0 ? 1 : -1));
  });
  car.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); setT(ti + k); cards[ti].focus({ preventScroll: true }); }
  });
  setT(0);

  /* ---------- 10: города и контакты ---------- */
  $('[data-cities]').innerHTML = C.cities.map(c => {
    const addr = c.address
      ? `<div class="cityc-a">${esc(c.address)}${c.metro ? '<br>' + esc(c.metro) : ''}</div>`
      : `<div class="cityc-a" data-pending="P-02">Адрес – уточнить</div>`;
    return `<div class="cityc"><div class="cityc-n">${esc(c.name)}</div>${addr}</div>`;
  }).join('');
  const K = C.contacts;
  const contactList = [
    { key: 'phone', label: K.phone || '+7 (___) ___-__-__', href: K.phone ? 'tel:+' + K.phone.replace(/\D/g, '') : '#' },
    { key: 'telegram', label: 'Telegram', href: K.telegram },
    { key: 'whatsapp', label: 'WhatsApp', href: K.whatsapp },
    { key: 'vk', label: 'ВКонтакте', href: K.vk },
    { key: 'youtube', label: 'YouTube', href: K.youtube }
  ];
  $('[data-contacts]').innerHTML = contactList.map(c => {
    const ok = !!K[c.key];
    const ext = ok && c.key !== 'phone' ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${esc(ok ? c.href : '#')}"${ext}${ok ? '' : ' data-pending="P-03"'}>${esc(c.label)}</a>`;
  }).join('');

  /* ---------- формы ---------- */
  const fin = $('[data-final]'), finThanks = fin.parentNode.querySelector('[data-thanks]');
  HS.bindForm(fin, () => { fin.hidden = true; finThanks.hidden = false; finThanks.focus(); });

  const TITLES = {
    'Частный визит': 'Визит в студию',
    'Пробное занятие': 'Пробное занятие',
    'Покупка инструмента': 'Консультация мастера',
    'Помочь определиться': 'Поможем определиться'
  };
  const sheet = $('[data-sheet]'), sRoute = $('[data-sheet-route]', sheet);
  const setRoute = r => {
    sRoute.value = r;
    $('[data-sheet-title]', sheet).textContent = TITLES[r];
    $('[data-sheet-help]', sheet).hidden = r !== 'Помочь определиться';
  };
  sRoute.addEventListener('change', () => setRoute(sRoute.value));
  HS.initSheet(setRoute);

  HS.ready();
})();
