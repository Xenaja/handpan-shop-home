/* U-GENE sound vibe — версия Navy: общая логика обеих страниц (типограф, звук, меню, город, липкая панель, формы).
   Без зависимостей. Страничные скрипты берут всё из window.HS. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const DEV = root.dataset.env === 'dev';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wide = matchMedia('(min-width:1000px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Куда отправлять заявки: обработчик на российском хостинге (152-ФЗ). null — хостинга ещё нет, см. PENDING.md P-08.
  const ENDPOINT = null;

  /* ---------- цели Яндекс Метрики (SEO-MIGRATION.md, раздел 10); счётчик подключается только на боевом домене ---------- */
  function goal(name, params) {
    if (typeof window.ym === 'function') window.ym(90206720, 'reachGoal', name, params);
    else if (DEV) console.info('[Метрика]', name, params || '');
  }
  const CONTACT_GOALS = [[/^tel:/, 'click_phone'], [/^mailto:/, 'click_email'], [/t\.me\//, 'click_tg'], [/wa\.me\/|whatsapp/, 'click_wa'], [/max\.ru/, 'click_max']];
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const hit = CONTACT_GOALS.find(([re]) => re.test(a.getAttribute('href')));
    if (hit) goal(hit[1], { page: location.pathname });
  });

  /* ---------- типограф: без висящих предлогов, неразрывный пробел перед тире и после чисел ---------- */
  const NB_RE = /(^|[\s«( ])([а-яё]{1,2}|без|для|при|над|под|что|как|или|про|если)\s/gi;
  const nb = s => String(s).replace(NB_RE, '$1$2 ').replace(NB_RE, '$1$2 ')
    .replace(/(^|[\s ])(м|г|ул|пер|им)\. /g, '$1$2. ').replace(/ ([–→])/g, ' $1').replace(/(\d) (?=\S)/g, '$1 ');
  function typo(el = document.body) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentNode.closest('script, style, svg, textarea, option') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    for (let n; (n = w.nextNode());) { const v = nb(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  }

  /* ---------- звук: синтез D Kurd (заглушка до аудиофайла, P-01) ---------- */
  const FREQS = [146.83, 220, 233.08, 261.63, 293.66, 329.63, 349.23, 392, 440];
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
        o.frequency.value = f * m; gg.gain.value = g;
        o.connect(gg); gg.connect(out); o.start(t); o.stop(t + dur + 0.05);
      });
    } catch (e) { /* без звука */ }
  }
  const ICON = '<svg class="ic-play" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 3 L19 11 L6 19 Z" fill="currentColor"/></svg>' +
    '<svg class="ic-pause" viewBox="0 0 22 22" aria-hidden="true"><rect x="4" y="3" width="4" height="16" fill="currentColor"/><rect x="14" y="3" width="4" height="16" fill="currentColor"/></svg>';

  /* плеер: композиция-заглушка; onTick(t) — для времени и прогресса */
  function player({ pattern, step = 0.5, duration, onTick }) {
    let playing = false, t = 0, iv = null;
    const render = () => {
      document.body.classList.toggle('is-playing', playing);
      $$('[data-play]').forEach(b => {
        b.setAttribute('aria-pressed', String(playing));
        b.setAttribute('aria-label', playing ? 'Пауза' : 'Послушать, как звучит ханг');
      });
      $$('[data-play-label]').forEach(el => { el.textContent = playing ? el.dataset.on : el.dataset.off; });
      if (onTick) onTick(t, duration);
    };
    const stop = () => { clearInterval(iv); iv = null; playing = false; render(); };
    const toggle = () => {
      if (playing) { stop(); return; }
      ctx(); playing = true;
      if (t === 0) goal('audio_play', { page: location.pathname });
      let beat = Math.round(t / step);
      iv = setInterval(() => {
        const n = pattern[beat % pattern.length];
        if (n >= 0) tone(FREQS[n], n === 0 ? 0.2 : 0.14, n === 0 ? 5 : 3.2);
        beat++; t += step;
        if (t >= duration) { t = 0; stop(); } else render();
      }, step * 1000);
      render();
    };
    $$('[data-play]').forEach(b => { ($('[data-play-ic]', b) || b).insertAdjacentHTML('afterbegin', ICON); b.addEventListener('click', toggle); });
    $$('[data-wave]').forEach(w => {
      const n = +w.dataset.wave || 40;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.style.height = Math.round(8 + 14 * Math.abs(Math.sin(i * 0.7)) * (0.5 + 0.5 * Math.sin(i * 0.23))) + 'px';
        s.style.setProperty('--d', (0.5 + (i * 37 % 11) / 14).toFixed(2) + 's');
        s.style.setProperty('--dl', ((i * 13 % 9) / 10).toFixed(2) + 's');
        w.appendChild(s);
      }
    });
    render();
  }
  const fmtTime = s => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- бегущие строки: контент продублирован для бесшовного цикла ---------- */
  $$('[data-marquee]').forEach(m => {
    const words = Array.from({ length: 8 }, () => m.dataset.marquee.split('|')).flat();
    m.innerHTML = words.map(w => `<span>${esc(w)}<i></i></span>`).join('');
  });

  /* ---------- город: шапка, меню и форма в одном состоянии, помним между страницами ---------- */
  let city = 'msk';
  try { city = sessionStorage.getItem('hs-city') || 'msk'; } catch (e) {}
  function setCity(c) {
    city = c;
    try { sessionStorage.setItem('hs-city', c); } catch (e) {}
    $$('[data-city]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.city === c)));
    $$(`input[name="city"][value="${c}"]`).forEach(r => { r.checked = true; });
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-city]'); if (b) setCity(b.dataset.city); });
  document.addEventListener('change', e => { if (e.target.name === 'city' && e.target.value !== 'online') setCity(e.target.value); });

  /* ---------- меню на весь экран (< 1000) ---------- */
  const burger = $('.burger'), menu = $('#menu');
  let menuFocus = null;
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    root.classList.toggle('locked', open);
    onScroll();
    if (open) { menuFocus = document.activeElement; $('[data-menu-close]', menu).focus(); }
    else if (menuFocus) menuFocus.focus({ preventScroll: true });
  }
  if (menu) {
    burger.addEventListener('click', () => setMenu(true));
    $('[data-menu-close]', menu).addEventListener('click', () => setMenu(false));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    wide.addEventListener('change', e => { if (e.matches && !menu.hidden) setMenu(false); });
  }

  /* ---------- липкая панель ---------- */
  const bar = $('[data-sticky]'), sheet = $('[data-sheet]');
  const barFrom = bar ? +bar.dataset.sticky || 560 : 0;
  const hero = $('header.s1,header.e1');
  const conversionZones = $$('.s10,.e6,.e11');
  const pageActions = $$('.sec .btn[data-open],.sec .btn[href]');
  function onScroll() {
    const busy = root.classList.contains('locked') || (sheet && !sheet.hidden) || (menu && !menu.hidden)
      || !!$('.s3-info-panel:not([hidden])');
    if (bar) {
      const mobile = !wide.matches;
      const pastHero = mobile && hero ? hero.getBoundingClientRect().bottom <= 0 : scrollY > barFrom;
      const nearConversion = mobile && conversionZones.some(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.top < innerHeight * .85 && rect.bottom > 0;
      });
      const nearAction = mobile && pageActions.some(el => {
        const rect = el.getBoundingClientRect();
        return rect.height > 0 && rect.top < innerHeight - 8 && rect.bottom > innerHeight - 92;
      });
      const typing = mobile && document.activeElement?.matches('input:not([type="radio"]):not([type="checkbox"]),textarea,select');
      bar.classList.toggle('show', pastHero && !busy && !nearConversion && !nearAction && !typing);
    }
    root.classList.toggle('scrolled', scrollY > 40);
  }
  let scrollFrame = 0;
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; onScroll(); });
  }, { passive: true });
  addEventListener('resize', onScroll);
  document.addEventListener('focusin', onScroll);
  document.addEventListener('focusout', () => requestAnimationFrame(onScroll));

  /* ---------- формы ---------- */
  const utm = (() => {
    const p = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => { if (p.get(k)) o[k] = p.get(k); });
    return o;
  })();
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
  async function send(data) {
    if (!ENDPOINT) {
      if (DEV) console.info('[форма] эндпоинт не подключён (P-08), заявка:', data);
      await new Promise(r => setTimeout(r, 500));
      return;
    }
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(r.status);
  }
  /* form — <form data-form>; onSuccess — показать «Спасибо» */
  function bindForm(form, onSuccess) {
    const phone = $('input[name="phone"]', form), name = $('input[name="name"]', form);
    const consent = $('input[name="consent"]', form), status = $('.form-status', form), btn = $('button[type="submit"]', form);
    form._opened = Date.now();
    maskPhone(phone);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      status.textContent = '';
      if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
      name.setAttribute('aria-invalid', 'false');
      if (!validatePhone(phone)) { phone.focus(); return; }
      if (!consent.checked) { status.textContent = 'Нужно согласие на обработку персональных данных'; consent.focus(); return; }
      if ($('.hp', form).value || Date.now() - form._opened < 1500) { onSuccess(); return; } // бот
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
      const label = btn.textContent; btn.textContent = 'Отправляем…';
      try {
        const fd = Object.fromEntries(new FormData(form));
        delete fd.company; delete fd.consent;
        await send({ ...fd, name: name.value.trim(), page: location.pathname, ...utm });
        goal('lead_submit', { interest: fd.format || fd.interest, city: fd.city, page: location.pathname });
        onSuccess();
      } catch (err) {
        status.textContent = 'Не получилось отправить. Попробуйте ещё раз или позвоните нам.';
      } finally {
        btn.removeAttribute('aria-busy'); btn.disabled = false; btn.textContent = label;
      }
    });
  }

  /* модалка / bottom sheet. onOpen(key) — страница подставляет заголовок и предвыбор */
  function initSheet(onOpen) {
    const card = $('.sheet-card', sheet), form = $('[data-form]', sheet), thanks = $('[data-thanks]', sheet);
    let lastFocus = null, hideT = null;
    bindForm(form, () => { form.hidden = true; $$('[data-sheet-help]', sheet).forEach(h => { h.hidden = true; }); thanks.hidden = false; thanks.focus(); });
    function open(key) {
      lastFocus = document.activeElement;
      if (menu && !menu.hidden) setMenu(false);
      form.reset(); form.hidden = false; thanks.hidden = true;
      $$('[aria-invalid]', form).forEach(i => setErr(i, ''));
      $('.form-status', form).textContent = '';
      form._opened = Date.now();
      setCity(city);
      onOpen(key);
      clearTimeout(hideT);
      sheet.hidden = false;
      requestAnimationFrame(() => sheet.classList.add('open'));
      root.classList.add('locked');
      onScroll();
      setTimeout(() => $('input[name="name"]', form).focus({ preventScroll: true }), 60);
    }
    function close() {
      sheet.classList.remove('open');
      root.classList.remove('locked');
      hideT = setTimeout(() => { sheet.hidden = true; onScroll(); }, 200);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-open]');
      if (b) { e.preventDefault(); open(b.dataset.open); }
    });
    $$('[data-close]', sheet).forEach(b => b.addEventListener('click', close));
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
    addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!sheet.hidden) close(); else if (menu && !menu.hidden) setMenu(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const box = !sheet.hidden ? card : menu && !menu.hidden ? menu : null;
      if (!box) return;
      const f = $$('button, input:not(.hp), select, a[href]', box).filter(x => !x.closest('[hidden]') && x.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* Лёгкое движение: однократное появление блоков, без скрытия контента в HTML. */
  function initMotion() {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const selector = '.sec-head,.g-head,.s3-heading,.route,.aud,.stage,.need,.s8-text,.s8-copy,.s9-text,.s10-head,.s10-grid,.e11-l,.e11-r';
    const targets = $$(selector).filter(el => !el.parentElement.closest(selector));
    const seen = new WeakSet(), active = new Map();
    const entrances = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || preference.matches) return;
        const el = entry.target;
        entrances.unobserve(el); seen.add(el);
        // При переходе по якорю или с клавиатуры управление сразу доступно.
        if (el.contains(document.activeElement)) return;
        const stagger = el.matches('.route,.aud,.stage,.need')
          ? ([...el.parentElement.children].indexOf(el) % 3) * 45 : 0;
        const animation = el.animate([
          { opacity: .25, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 520, delay: stagger, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        active.set(el, animation);
        animation.finished.then(() => active.delete(el), () => active.delete(el));
      });
    }, { threshold: .08 });
    const hint = $('[data-sculpture-trigger]');
    const pulse = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.toggleAttribute('data-pulse-visible', entry.isIntersecting));
    });
    const applyPreference = () => {
      entrances.disconnect(); pulse.disconnect();
      if (hint) hint.removeAttribute('data-pulse-visible');
      if (preference.matches) {
        active.forEach(animation => animation.cancel()); active.clear();
        return;
      }
      targets.forEach(el => { if (!seen.has(el)) entrances.observe(el); });
      if (hint) pulse.observe(hint);
    };
    preference.addEventListener('change', applyPreference);
    // Скрытая вкладка не тратит ресурсы на повторяющуюся пульсацию.
    document.addEventListener('visibilitychange', () => {
      root.toggleAttribute('data-motion-paused', document.hidden);
    });
    const stopAtInteraction = event => {
      active.forEach((animation, el) => { if (el.contains(event.target)) animation.cancel(); });
    };
    document.addEventListener('focusin', stopAtInteraction);
    document.addEventListener('pointerdown', stopAtInteraction, { passive: true });
    applyPreference();
  }

  /* после отрисовки страницы: типограф и начальные состояния */
  function ready() {
    setCity(city);
    onScroll();
    typo();
    initMotion();
  }

  window.HS = { $, $$, esc, nb, typo, DEV, wide, reduce, FREQS, tone, player, fmtTime, bindForm, initSheet, setCity, goal, ready, updateSticky: onScroll };
})();
