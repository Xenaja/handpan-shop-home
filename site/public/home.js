/* Главная: схема ханга, вкладки, счётчик, карусель преподавателей, формы.
   Тексты уже в HTML (собирает Astro), скрипт их только переключает. */
(() => {
  'use strict';
  const { $, $$, tone, FREQS, reduce } = HS;

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

  /* ---------- 02: зоны над фото, координаты в viewBox 400×400 ----------
     Звук — прежний синтезированный пример, не запись строя инструмента на фото.
     Ноты на фото не подписываем до получения достоверной карты строя. */
  const FIELDS = [
    [184, 170, 30, 33, 0, 0],
    [119, 295, 30, 29, -25, 1], [241, 298, 30, 29, 25, 2],
    [52, 203, 23, 30, 10, 3], [327, 211, 23, 30, -10, 4],
    [78, 108, 25, 23, -45, 5], [302, 105, 25, 23, 45, 6],
    [146, 53, 24, 20, -10, 7], [228, 54, 24, 20, 10, 8]
  ];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  $$('svg[data-hang]').forEach(svg => {
    FIELDS.forEach(([x, y, rx, ry, angle, i]) => {
      const label = i === 0 ? 'Центральный купол: послушать звук' : `Тональное поле ${i}: послушать звук`;
      const g = svgEl('g', { class: 'hang-hit', tabindex: '0', role: 'button', 'aria-label': label });
      const shape = svgEl('ellipse', { cx:x, cy:y, rx, ry, transform:`rotate(${angle} ${x} ${y})` });
      const title = svgEl('title', {}); title.textContent = label;
      g.append(title, shape);
      let timer;
      const play = e => {
        if (e.type === 'keydown' && (e.repeat || !['Enter', ' '].includes(e.key))) return;
        e.preventDefault();
        tone(FREQS[i], .25, i === 0 ? 6 : 4);
        g.classList.add('is-active');
        clearTimeout(timer); timer = setTimeout(() => g.classList.remove('is-active'), 450);
      };
      g.addEventListener('click', play);
      g.addEventListener('keydown', play);
      svg.append(g);
    });
  });

  /* ---------- 05: примеры звучания в карточках аудиторий ---------- */
  $$('[data-aud-play]').forEach(b => b.addEventListener('click', () => {
    const s = b.closest('[data-snd]').dataset.snd, F = FREQS;
    if (s === 'long') tone(F[0], 0.28, 10);
    else if (s === 'fast') [0, 5, 6, 7, 8, 6, 4].forEach((n, i) => tone(F[n], 0.16, 3, i * 0.16));
    else [0, 4, 5, 6, 4].forEach((n, i) => tone(F[n], 0.17, 3.5, i * 0.38));
  }));

  /* ---------- 06: одна большая цифра, столбик прокручивается вверх ---------- */
  const sWrap = $('[data-stats-wrap]'), col = $('[data-stat-col]');
  const nums = $$('span', col), labels = $$('[data-stat-label] > span'), dots = $$('.s6-dot', sWrap), N = nums.length;
  const fmtN = n => n >= 1000 ? Math.round(n).toLocaleString('ru-RU') : String(Math.round(n));
  let si = 0, siv = null, seen = false, hold = false;
  function setStat(i) {
    si = i;
    col.style.transform = `translateY(${0.55 - i}em)`;
    nums.forEach((n, k) => n.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    labels.forEach((l, k) => { l.hidden = k !== i; });
    $('[data-stat-count]').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
  }
  // автосмена каждые 3 с после появления; пауза под курсором и фокусом; без неё при reduced-motion
  function run() {
    clearInterval(siv);
    if (reduce || !seen) return;
    siv = setInterval(() => { if (!hold) setStat((si + 1) % N); }, 3000);
  }
  dots.forEach((d, i) => d.addEventListener('click', () => { setStat(i); run(); }));
  sWrap.addEventListener('pointerenter', () => { hold = true; });
  sWrap.addEventListener('pointerleave', () => { hold = false; });
  sWrap.addEventListener('focusin', () => { hold = true; });
  sWrap.addEventListener('focusout', () => { hold = false; });
  setStat(0);
  if ('IntersectionObserver' in window && !reduce) {
    // первая цифра «набегает» от нуля; число и суффикс берём из HTML
    const first = nums[0], [, num, suf] = first.textContent.match(/^([\d\s ]+)(.*)$/), target = +num.replace(/\D/g, '');
    first.textContent = '0' + suf;
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect(); seen = true; run();
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1600);
        first.textContent = fmtN(target * (1 - Math.pow(1 - k, 3))) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.2 });
    io.observe(sWrap);
  }

  /* ---------- 07: карусель преподавателей, бесконечная ---------- */
  const car = $('[data-tcar]'), cards = $$('.tcard', car), n = cards.length;
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

  /* ---------- 10: карта по клику ---------- */
  $$('[data-map-show]').forEach(b => b.addEventListener('click', () => {
    const box = b.closest('[data-map]');
    box.innerHTML = `<iframe title="Карта: ${box.querySelector('.map-addr').textContent}" src="${box.dataset.map}" allowfullscreen></iframe>`;
  }));

  /* ---------- тест «Поможем определиться»: окно, quiz.js — по первому открытию ---------- */
  const qm = $('[data-quiz-modal]');
  let qmFocus = null;
  const qmClose = () => {
    qm.classList.remove('open');
    document.documentElement.classList.remove('locked');
    setTimeout(() => { qm.hidden = true; }, 200);
    if (qmFocus) qmFocus.focus({ preventScroll: true });
  };
  const qmOpen = () => {
    qmFocus = document.activeElement;
    qm.hidden = false;
    requestAnimationFrame(() => qm.classList.add('open'));
    document.documentElement.classList.add('locked');
    setTimeout(() => { const f = qm.querySelector('.quiz-step:not([hidden]) input'); if (f) f.focus({ preventScroll: true }); }, 60);
  };
  $$('[data-quiz-open]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (window.Quiz) { qmOpen(); return; }
    const sc = document.createElement('script');
    sc.src = a.closest('html').querySelector('script[src*="home.js"]').src.replace('home.js', 'quiz.js');
    sc.onload = qmOpen;
    document.body.appendChild(sc);
  }));
  $('[data-quiz-close]', qm).addEventListener('click', qmClose);
  qm.addEventListener('click', e => { if (e.target === qm || e.target.closest('[data-quiz-cta]')) qmClose(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !qm.hidden) qmClose(); });

  /* ---------- формы ---------- */
  const fin = $('[data-final] form'), finThanks = $('.s10-form [data-thanks]');
  HS.bindForm(fin, () => { fin.hidden = true; finThanks.hidden = false; finThanks.focus(); });

  // модалка: кнопка на странице заранее выбирает «Что интересно»
  const TITLES = {
    visit: 'Визит в студию',
    trial: 'Пробное занятие',
    buy: 'Консультация мастера',
    rent: 'Аренда инструмента',
    help: 'Поможем определиться',
    community: 'Присоединиться к комьюнити'
  };
  const sheet = $('[data-sheet]'), sRoute = $('[data-interest]', sheet);
  const setRoute = r => {
    if (!TITLES[r]) r = 'help';
    sRoute.value = r;
    $('[data-sheet-title]', sheet).textContent = TITLES[r];
    $('[data-sheet-help]', sheet).hidden = r !== 'help';
  };
  sRoute.addEventListener('change', () => setRoute(sRoute.value));
  HS.initSheet(setRoute);

  HS.ready();
})();
