/* Страница «Обучение»: город, меню, преподаватели, FAQ, форматы, форма записи. Без зависимостей. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const DEV = root.dataset.env === 'dev';
  const C = JSON.parse($('#content').textContent);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Куда отправлять заявки (Cloudflare Worker → Telegram). null — эндпоинта ещё нет, см. PENDING.md P-08.
  const ENDPOINT = null;

  /* ---------- город: шапка, меню и форма в одном состоянии ---------- */
  let city = 'msk';
  function setCity(c) {
    city = c;
    $$('[data-city]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.city === c)));
    const r = $(`.sheet input[name="city"][value="${c}"]`);
    if (r) r.checked = true;
  }
  $$('[data-city]').forEach(b => b.addEventListener('click', () => setCity(b.dataset.city)));

  /* адреса в финале: без адреса показываем только город (P-02) */
  $('[data-addr]').innerHTML = Object.values(C.cities).map(c =>
    `<span>${esc(c.name)}${c.address ? ' · ' + esc(c.address) : ''}</span>`).join('');

  /* ---------- меню на весь экран (< 1000) ---------- */
  const burger = $('.e-burger'), menu = $('#e-menu');
  let menuFocus = null;
  function setMenu(open) {
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    root.classList.toggle('locked', open);
    if (open) { menuFocus = document.activeElement; $('[data-menu-close]').focus(); }
    else if (menuFocus) menuFocus.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => setMenu(true));
  $('[data-menu-close]').addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  matchMedia('(min-width:1000px)').addEventListener('change', e => { if (e.matches && !menu.hidden) setMenu(false); });

  /* ---------- 06: форматы ---------- */
  const fmtsEl = $('[data-formats]');
  fmtsEl.insertAdjacentHTML('beforeend', C.formats.map(f =>
    `<div class="fmt"><span class="fmt-name">${esc(f.name)}</span><span class="fmt-price">${esc(f.price)} <span class="mono">${esc(f.unit)}</span></span><span class="fmt-who">${esc(f.who)}</span><button type="button" class="btn btn--ghost-d fmt-btn" data-open="${f.key}">Записаться</button></div>`).join(''));

  /* ---------- 08: преподаватели ---------- */
  const T = C.teachers, tlist = $('[data-tlist]'), panel = $('#t-panel');
  tlist.innerHTML = T.map((t, i) =>
    `<button type="button" class="tbtn" role="tab" id="t-${i}" aria-controls="t-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="tbtn-name">${esc(t.name)}</span><span class="mono">${esc(t.nick)}</span></button>`).join('');
  const tbtns = $$('.tbtn', tlist);
  let ti = 0;
  const initials = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2);
  function setTeacher(i, focus) {
    ti = i;
    const t = T[i];
    tbtns.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 't-' + i);
    $('[data-t="role"]', panel).textContent = t.role;
    $('[data-t="name"]', panel).textContent = t.name;
    $('[data-t="bio"]', panel).innerHTML = t.bio.map(p => `<p>${esc(p)}</p>`).join('');
    const ph = $('[data-t-photo]', panel);
    ph.innerHTML = t.img
      ? `<img src="${esc(t.img)}" alt="${esc(t.name)}" style="object-position:${esc(t.pos || '50% 30%')}">`
      : `<span class="tmono" aria-hidden="true">${esc(initials(t.name))}</span>`;
    if (t.img) delete ph.dataset.pending; else ph.dataset.pendingLink = 'P-13';
    if (focus) tbtns[i].focus();
  }
  tbtns.forEach((b, i) => b.addEventListener('click', () => setTeacher(i)));
  tlist.addEventListener('keydown', e => {
    const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); setTeacher((ti + k + T.length) % T.length, true); }
  });
  setTeacher(0);

  /* ---------- 10: FAQ — открыт один вопрос, первый по умолчанию ---------- */
  const faqEl = $('[data-faq]');
  faqEl.innerHTML = C.faq.map(([q, a], i) =>
    `<div class="faq-i"><button type="button" class="faq-q" aria-expanded="${i === 0}" aria-controls="faq-${i}"><span>${esc(q)}</span><span class="faq-sign" aria-hidden="true">+</span></button><p class="faq-a" id="faq-${i}"${i === 0 ? '' : ' hidden'}>${esc(a)}</p></div>`).join('');
  $$('.faq-q', faqEl).forEach(b => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    $$('.faq-q', faqEl).forEach(x => { x.setAttribute('aria-expanded', 'false'); $('#' + x.getAttribute('aria-controls')).hidden = true; });
    if (open) { b.setAttribute('aria-expanded', 'true'); $('#' + b.getAttribute('aria-controls')).hidden = false; }
  }));

  /* ---------- липкая панель и бургер на прокрутке ---------- */
  const bar = $('[data-sticky]'), sheet = $('[data-sheet]');
  const onScroll = () => {
    bar.classList.toggle('show', scrollY > 560 && sheet.hidden);
    root.classList.toggle('scrolled', scrollY > 40);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- форма записи ---------- */
  const chips = [['trial', 'Пробное'], ...C.formats.map(f => [f.key, f.chip])];
  $('[data-fmt-chips]').innerHTML = chips.map(([k, l], i) =>
    `<label class="chip-r"><input type="radio" name="format" value="${k}"${i === 0 ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('');

  const form = $('[data-form]', sheet), thanks = $('[data-thanks]', sheet), card = $('.sheet-card', sheet);
  const phone = $('input[name="phone"]', form), nameI = $('input[name="name"]', form);
  const consent = $('input[name="consent"]', form), status = $('.form-status', form), submitBtn = $('button[type="submit"]', form);
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
  function validatePhone(soft) {
    const n = phone.value.replace(/\D/g, '').length;
    if (soft && n === 0) { setErr(phone, ''); return false; }
    const ok = n === 11;
    setErr(phone, ok ? '' : 'Введите номер полностью: +7 (XXX) XXX-XX-XX');
    return ok;
  }
  phone.addEventListener('input', () => {
    let d = phone.value.replace(/\D/g, '');
    if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1);
    d = d.slice(0, 10);
    let v = '+7';
    if (d.length) v += ' (' + d.slice(0, 3);
    if (d.length >= 3) v += ')';
    if (d.length > 3) v += ' ' + d.slice(3, 6);
    if (d.length > 6) v += '-' + d.slice(6, 8);
    if (d.length > 8) v += '-' + d.slice(8, 10);
    phone.value = v;
    if (phone.getAttribute('aria-invalid') === 'true') validatePhone();
  });
  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 '; });
  phone.addEventListener('blur', () => { if (phone.value.trim() === '+7') phone.value = ''; validatePhone(true); });

  async function send(data) {
    if (!ENDPOINT) {
      if (DEV) console.info('[форма] эндпоинт не подключён (P-08), заявка:', data);
      await new Promise(r => setTimeout(r, 500));
      return;
    }
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(r.status);
  }

  let opened = 0, lastFocus = null, hideT = null;
  function openSheet(fmt) {
    lastFocus = document.activeElement;
    if (!menu.hidden) setMenu(false);
    form.reset(); setErr(phone, ''); status.textContent = '';
    const r = $(`input[name="format"][value="${fmt}"]`, form);
    if (r) r.checked = true;
    setCity(city);
    form.hidden = false; thanks.hidden = true;
    opened = Date.now();
    clearTimeout(hideT);
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
    root.classList.add('locked');
    onScroll();
    setTimeout(() => nameI.focus({ preventScroll: true }), 60);
  }
  function closeSheet() {
    sheet.classList.remove('open');
    root.classList.remove('locked');
    hideT = setTimeout(() => { sheet.hidden = true; onScroll(); }, 200);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) { e.preventDefault(); openSheet(b.dataset.open); }
  });
  $$('[data-close]', sheet).forEach(b => b.addEventListener('click', closeSheet));
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  form.addEventListener('change', e => { if (e.target.name === 'city') setCity(e.target.value); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.textContent = '';
    if (!nameI.value.trim()) { nameI.setAttribute('aria-invalid', 'true'); nameI.focus(); return; }
    nameI.setAttribute('aria-invalid', 'false');
    if (!validatePhone()) { phone.focus(); return; }
    if (!consent.checked) { status.textContent = 'Нужно согласие на обработку персональных данных'; consent.focus(); return; }
    const done = () => { form.hidden = true; thanks.hidden = false; thanks.focus(); };
    if ($('.hp', form).value || Date.now() - opened < 1500) { done(); return; } // бот
    submitBtn.setAttribute('aria-busy', 'true'); submitBtn.disabled = true;
    const label = submitBtn.textContent; submitBtn.textContent = 'Отправляем…';
    try {
      const fd = new FormData(form);
      await send({ name: nameI.value.trim(), phone: phone.value, format: fd.get('format'), city: fd.get('city'), page: location.pathname, ...utm });
      done();
    } catch (err) {
      status.textContent = 'Не получилось отправить. Попробуйте ещё раз или позвоните нам.';
    } finally {
      submitBtn.removeAttribute('aria-busy'); submitBtn.disabled = false; submitBtn.textContent = label;
    }
  });

  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!sheet.hidden) closeSheet();
      else if (!menu.hidden) setMenu(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const box = !sheet.hidden ? card : !menu.hidden ? menu : null;
    if (!box) return;
    const f = $$('button, input:not(.hp), select, a[href]', box).filter(x => !x.closest('[hidden]') && x.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
