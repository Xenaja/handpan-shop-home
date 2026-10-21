/* Handpan Shop — главная 2a: звук, интерактив, формы. Без зависимостей. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const DEV = root.dataset.env === 'dev';
  const C = JSON.parse($('#content').textContent);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wide = matchMedia('(min-width:1200px)');

  // Куда отправлять заявки (Cloudflare Worker → Telegram). null — эндпоинта ещё нет, см. PENDING.md P-08.
  const ENDPOINT = null;

  /* ---------- звук: синтез D Kurd (заглушка до аудиофайла композиции, P-01) ---------- */
  const FREQS = [146.83, 220, 233.08, 261.63, 293.66, 329.63, 349.23, 392, 440];
  const NAMES = ['A3', 'B♭3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'];
  const ANGLES = [100, 60, 145, 20, 195, 335, 245, 290];
  const PATTERN = [0, -1, 4, 5, 6, 5, 4, -1, 0, 2, 3, 4, 3, 2, 1, -1, 0, 5, 6, 7, 8, 7, 6, 5, 0, -1, 4, 3, 2, 3, 1, -1];
  const DURATION = 80;

  let ac;
  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, vol = 0.22, dur = 4, delay = 0) {
    try {
      const a = ctx(), t = a.currentTime + delay, out = a.createGain();
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(vol, t + 0.006);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(a.destination);
      [[1, 1], [2, 0.32], [3, 0.14], [4.02, 0.04]].forEach(([m, g]) => {
        const o = a.createOscillator(), gg = a.createGain();
        o.type = 'sine'; o.frequency.value = f * m; gg.gain.value = g;
        o.connect(gg); gg.connect(out); o.start(t); o.stop(t + dur + 0.05);
      });
    } catch (e) { /* без звука */ }
  }

  /* ---------- плеер: общий для первого экрана и липкой панели ---------- */
  let playing = false, t = 0, iv = null;
  const fmt = s => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function renderPlayer() {
    document.body.classList.toggle('is-playing', playing);
    $$('[data-time]').forEach(el => { el.textContent = fmt(t); });
    $$('[data-progress]').forEach(el => { el.style.width = (t / DURATION * 100).toFixed(2) + '%'; });
    $$('[data-play]').forEach(el => {
      el.setAttribute('aria-label', playing ? 'Пауза' : 'Послушать, как звучит ханг');
      el.setAttribute('aria-pressed', String(playing));
    });
  }
  function stop() { clearInterval(iv); iv = null; playing = false; renderPlayer(); }
  function togglePlay() {
    if (playing) { stop(); return; }
    ctx();
    playing = true;
    let beat = Math.round(t / 0.5);
    iv = setInterval(() => {
      const n = PATTERN[beat % PATTERN.length];
      if (n >= 0) tone(FREQS[n], n === 0 ? 0.2 : 0.14, n === 0 ? 5 : 3.2);
      beat++;
      t += 0.5;
      if (t >= DURATION) { t = 0; stop(); } else renderPlayer();
    }, 500);
    renderPlayer();
  }
  const ICON = '<svg class="ic-play" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 3 L19 11 L6 19 Z" fill="currentColor"/></svg>' +
    '<svg class="ic-pause" viewBox="0 0 22 22" aria-hidden="true"><rect x="4" y="3" width="4" height="16" fill="currentColor"/><rect x="14" y="3" width="4" height="16" fill="currentColor"/></svg>';
  $$('[data-play]').forEach(b => { b.insertAdjacentHTML('afterbegin', ICON); b.addEventListener('click', togglePlay); });

  $$('[data-wave]').forEach(w => {
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('span');
      s.style.height = Math.round(14 + 30 * Math.abs(Math.sin(i * 0.7)) * (0.5 + 0.5 * Math.sin(i * 0.23))) + 'px';
      s.style.setProperty('--d', (0.5 + (i * 37 % 11) / 14).toFixed(2) + 's');
      s.style.setProperty('--dl', ((i * 13 % 9) / 10).toFixed(2) + 's');
      w.appendChild(s);
    }
  });

  /* ---------- бегущие строки: контент продублирован для бесшовного цикла ---------- */
  $$('[data-marquee]').forEach(m => {
    const words = Array.from({ length: 8 }, () => m.dataset.marquee.split('|')).flat();
    m.innerHTML = words.map(w => `<span>${esc(w)}<i></i></span>`).join('');
  });

  /* ---------- схема ханга: поля кликабельны ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  $$('[data-hang]').forEach(svg => {
    const add = (shape, label, x, y, size, i, aria) => {
      const g = svgEl('g', { class: 'hang-hit', tabindex: '0', role: 'button', 'aria-label': aria });
      shape.setAttribute('fill', 'transparent');
      const tx = svgEl('text', { x, y, 'text-anchor': 'middle', 'font-family': "'JetBrains Mono', monospace", 'font-size': size, fill: '#F2EEE8', 'pointer-events': 'none' });
      tx.textContent = label;
      g.append(shape, tx);
      const go = e => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        tone(FREQS[i], 0.25, i === 0 ? 6 : 4);
        shape.setAttribute('fill', '#2F3CFF');
        clearTimeout(shape._t);
        shape._t = setTimeout(() => shape.setAttribute('fill', 'transparent'), 450);
      };
      g.addEventListener('pointerdown', go);
      g.addEventListener('keydown', go);
      svg.appendChild(g);
    };
    ANGLES.forEach((a, i) => {
      const r = a * Math.PI / 180, cx = +(200 + 132 * Math.cos(r)).toFixed(1), cy = +(200 + 132 * Math.sin(r)).toFixed(1);
      add(svgEl('ellipse', { cx, cy, rx: 36, ry: 27, transform: `rotate(${a + 90} ${cx} ${cy})`, stroke: 'rgba(242,238,232,.55)', 'stroke-width': 1 }),
        NAMES[i], cx, cy + 3.5, 10, i + 1, 'Нота ' + NAMES[i]);
    });
    add(svgEl('circle', { cx: 200, cy: 200, r: 54, stroke: 'rgba(242,238,232,.7)', 'stroke-width': 1 }), 'D3', 200, 204, 11, 0, 'Динг, нота D3');
  });

  /* ---------- раскрывашки и тултип ---------- */
  $$('[data-toggle]').forEach(b => {
    const panel = $(`[data-panel="${b.dataset.toggle}"]`);
    const sign = $('[data-sign]', b);
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

  /* ---------- меню (компакт) ---------- */
  const burger = $('.burger'), menu = $('#menu');
  const setMenu = open => {
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
  };
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('#menu, .burger')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  wide.addEventListener('change', () => setMenu(false));

  /* переключатель города (десктоп) */
  $$('.city button').forEach(b => b.addEventListener('click', () => {
    $$('.city button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));

  /* ---------- 05: кому подходит ---------- */
  const tabsEl = $('[data-tabs]'), panel = $('#aud-panel');
  const A = C.audiences;
  tabsEl.innerHTML = A.map((a, i) =>
    `<button type="button" class="tab" role="tab" id="tab-${i}" aria-controls="aud-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(a.name)}</button>`).join('');
  const tabs = $$('.tab', tabsEl);
  let tab = 0;
  function setTab(i, focus, hash = true) {
    tab = i;
    const a = A[i];
    tabs.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'tab-' + i);
    $('[data-aud="name"]', panel).textContent = a.name;
    $('[data-aud="text"]', panel).textContent = a.text;
    $('[data-aud="link"]', panel).textContent = a.link;
    const img = $('[data-aud-img]');
    img.src = a.img; img.alt = a.alt; img.style.objectPosition = a.pos;
    const fit = $('[data-aud-fit]', panel);
    $('[data-aud="fit"]', fit).textContent = a.fit || 'уточнить';
    pend(fit, a.fitPending, !a.fit);
    const rec = $('[data-aud-rec]');
    $('[data-aud="rec"]', rec).textContent = a.rec || 'уточнить';
    pend(rec, a.recPending, !a.rec);
    if (focus) tabs[i].focus();
    if (hash) try { history.replaceState(null, '', '#' + encodeURIComponent(a.name.toLowerCase())); } catch (e) {}
  }
  // pending: в dev — пунктирная рамка; если значения нет совсем, в prod элемент скрыт (план Б).
  function pend(el, id, missing) {
    if (id && (missing || DEV)) el.dataset.pending = id; else delete el.dataset.pending;
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
  // заранее подгружаем фото вкладок, чтобы смена была без мигания
  addEventListener('load', () => A.forEach(a => { new Image().src = a.img; }));
  $('[data-aud-play]').addEventListener('click', () => {
    const s = A[tab].snd, F = FREQS;
    if (s === 'long') tone(F[0], 0.28, 10);
    else if (s === 'fast') [0, 5, 6, 7, 8, 6, 4].forEach((n, i) => tone(F[n], 0.16, 3, i * 0.16));
    else [0, 4, 5, 6, 4].forEach((n, i) => tone(F[n], 0.17, 3.5, i * 0.38));
  });

  /* ---------- 06: цифры досчитываются при появлении ---------- */
  const statsEl = $('[data-stats]');
  const fmtN = n => n >= 1000 ? Math.round(n).toLocaleString('ru-RU') : String(Math.round(n));
  statsEl.innerHTML = C.stats.map(s =>
    `<div class="stat"><div class="stat-v" data-n="${s.n}" data-suf="${esc(s.suf)}">${fmtN(s.n)}${esc(s.suf)}</div><div class="stat-l">${esc(s.label)}</div></div>`).join('');
  const vals = $$('.stat-v', statsEl);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    const paint = k => vals.forEach(v => { v.textContent = fmtN(+v.dataset.n * k) + v.dataset.suf; });
    paint(0);
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1600);
        paint(1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.2 });
    io.observe(statsEl);
  }

  /* ---------- 07: преподаватели ---------- */
  const track = $('[data-track]');
  track.innerHTML = C.teachers.map(p =>
    `<li class="tcard"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" style="object-position:${esc(p.pos)}"><div class="tname">${esc(p.name)}</div><div class="trole">${esc(p.role)}</div></li>`).join('');
  $('[data-track-prev]').addEventListener('click', () => track.scrollBy({ left: -376, behavior: 'smooth' }));
  $('[data-track-next]').addEventListener('click', () => track.scrollBy({ left: 376, behavior: 'smooth' }));

  /* ---------- 10: города и контакты ---------- */
  $('[data-cities]').innerHTML = C.cities.map(c => {
    const addr = c.address
      ? `<div class="cityc-a">${esc(c.address)}${c.metro ? '<br>' + esc(c.metro) : ''}</div>`
      : `<div class="cityc-a cityc-a--pending" data-pending="P-02">Адрес – уточнить</div>`;
    return `<div class="cityc"><div class="cityc-n">${esc(c.name)}</div>${addr}</div>`;
  }).join('');
  const K = C.contacts;
  const phoneHref = p => 'tel:+' + p.replace(/\D/g, '');
  const contactList = [
    { key: 'phone', label: K.phone || '+7 (___) ___-__-__', href: K.phone ? phoneHref(K.phone) : '#' },
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

  /* ---------- липкая панель ---------- */
  const bar = $('[data-sticky]');
  const onScroll = () => bar.classList.toggle('show', scrollY > (wide.matches ? 640 : 560));
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- формы ---------- */
  const TITLES = {
    'Частный визит': 'Визит в студию',
    'Пробное занятие': 'Пробное занятие',
    'Покупка инструмента': 'Консультация мастера',
    'Помочь определиться': 'Поможем определиться'
  };
  const utm = (() => {
    const p = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => { if (p.get(k)) o[k] = p.get(k); });
    return o;
  })();

  function maskPhone(input) {
    input.addEventListener('input', () => {
      let d = input.value.replace(/\D/g, '');
      if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1);
      d = d.slice(0, 10);
      let v = '+7';
      if (d.length) v += ' (' + d.slice(0, 3);
      if (d.length >= 3) v += ')';
      if (d.length > 3) v += ' ' + d.slice(3, 6);
      if (d.length > 6) v += '-' + d.slice(6, 8);
      if (d.length > 8) v += '-' + d.slice(8, 10);
      input.value = v;
      if (input.getAttribute('aria-invalid') === 'true') validatePhone(input);
    });
    input.addEventListener('focus', () => { if (!input.value) input.value = '+7 '; });
    input.addEventListener('blur', () => { if (input.value.trim() === '+7') input.value = ''; validatePhone(input, true); });
  }
  function setErr(input, msg) {
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
  }
  function validatePhone(input, soft) {
    const n = input.value.replace(/\D/g, '').length;
    if (soft && n === 0) { setErr(input, ''); return false; }
    const ok = n === 11;
    setErr(input, ok ? '' : 'Введите номер полностью: +7 (XXX) XXX-XX-XX');
    return ok;
  }

  async function send(data) {
    if (!ENDPOINT) {
      if (DEV) console.info('[форма] эндпоинт не подключён (P-08), заявка:', data);
      await new Promise(r => setTimeout(r, 500));
      return;
    }
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(r.status);
  }

  function bindForm(form, onSuccess) {
    const phone = $('input[name="phone"]', form), name = $('input[name="name"]', form);
    const consent = $('input[name="consent"]', form), status = $('.form-status', form), btn = $('button[type="submit"]', form);
    const opened = Date.now();
    maskPhone(phone);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      status.textContent = '';
      if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
      name.setAttribute('aria-invalid', 'false');
      if (!validatePhone(phone)) { phone.focus(); return; }
      if (!consent.checked) { status.textContent = 'Нужно согласие на обработку персональных данных'; consent.focus(); return; }
      if ($('.hp', form).value || Date.now() - opened < 1500) { onSuccess(); return; } // бот
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
      const label = btn.textContent; btn.textContent = 'Отправляем…';
      try {
        await send({ name: name.value.trim(), phone: phone.value, route: $('select', form).value, page: location.pathname, ...utm });
        onSuccess();
      } catch (err) {
        status.textContent = 'Не получилось отправить. Попробуйте ещё раз или позвоните нам.';
      } finally {
        btn.removeAttribute('aria-busy'); btn.disabled = false; btn.textContent = label;
      }
    });
  }

  // форма на финальном экране
  const finalForm = $('.s10 [data-form]'), finalThanks = $('.s10 [data-thanks]');
  bindForm(finalForm, () => { finalForm.hidden = true; finalThanks.hidden = false; finalThanks.focus(); });

  // модалка / bottom sheet
  const sheet = $('[data-sheet]'), card = $('.sheet-card', sheet);
  const sForm = $('[data-form]', sheet), sThanks = $('[data-thanks]', sheet);
  const sTitle = $('[data-sheet-title]', sheet), sHelp = $('[data-sheet-help]', sheet), sRoute = $('[data-sheet-route]', sheet);
  let lastFocus = null, hideT = null;
  const setRoute = r => {
    sRoute.value = r;
    sTitle.textContent = TITLES[r];
    sHelp.hidden = r !== 'Помочь определиться' || !sThanks.hidden;
  };
  function openSheet(r) {
    lastFocus = document.activeElement;
    sForm.hidden = false; sThanks.hidden = true; sForm.reset();
    $$('[aria-invalid]', sForm).forEach(i => setErr(i, ''));
    setRoute(r);
    clearTimeout(hideT);
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
    root.classList.add('locked');
    setTimeout(() => $('input', sForm).focus({ preventScroll: true }), 60);
  }
  function closeSheet() {
    sheet.classList.remove('open');
    root.classList.remove('locked');
    hideT = setTimeout(() => { sheet.hidden = true; }, 200);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  bindForm(sForm, () => { sForm.hidden = true; sHelp.hidden = true; sThanks.hidden = false; sThanks.focus(); });
  $$('[data-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openSheet(b.dataset.open); }));
  $$('[data-close]', sheet).forEach(b => b.addEventListener('click', closeSheet));
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  sRoute.addEventListener('change', () => setRoute(sRoute.value));
  addEventListener('keydown', e => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key === 'Tab') { // фокус не уходит из модалки
      const f = $$('button, input:not(.hp), select, a[href]', card).filter(x => !x.closest('[hidden]'));
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  renderPlayer();
})();
