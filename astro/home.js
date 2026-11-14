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

  /* Справка у точки «Ханг»: попап с плавным появлением; закрывается повторным нажатием, Escape и нажатием мимо */
  $$('[data-pop-btn]').forEach(b => {
    const pop = $(`[data-pop="${b.dataset.popBtn}"]`), box = pop.parentElement;
    b.setAttribute('aria-controls', pop.id); b.setAttribute('aria-expanded', 'false');
    const set = open => {
      if (open) { // уголок попапа — точно под центром точки
        const bx = b.getBoundingClientRect(), px = box.getBoundingClientRect();
        pop.style.setProperty('--ax', Math.round(bx.left + bx.width / 2 - px.left) + 'px');
      }
      pop.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
    };
    b.addEventListener('click', () => set(!pop.classList.contains('is-open')));
    document.addEventListener('click', e => { if (!box.contains(e.target)) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop.classList.contains('is-open')) { set(false); b.focus(); } });
  });

  /* Звуковая скульптура: наведение, фиксация нажатием, Escape и внешнее нажатие. */
  const sculpture = $('[data-sculpture]');
  if (sculpture) {
    const trigger = $('[data-sculpture-trigger]', sculpture), panel = $('#sculpture-note');
    let pinned = false;
    const show = open => { panel.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); HS.updateSticky(); };
    const close = () => { pinned = false; show(false); };
    $('[data-sculpture-close]', panel).addEventListener('click', () => { trigger.focus(); close(); });
    sculpture.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(true); });
    sculpture.addEventListener('pointerleave', () => { if (!pinned && !sculpture.contains(document.activeElement)) show(false); });
    trigger.addEventListener('focus', () => show(true));
    trigger.addEventListener('click', () => { pinned = !pinned; show(pinned); });
    sculpture.addEventListener('focusout', e => { if (!sculpture.contains(e.relatedTarget)) close(); });
    document.addEventListener('pointerdown', e => { if (!sculpture.contains(e.target)) close(); });
    sculpture.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); if (document.activeElement === panel) trigger.focus(); close(); } });
  }

  /* ---------- 02: зоны над фото, координаты в viewBox 400×400 ----------
     Звук — прежний синтезированный пример, не запись строя инструмента на фото.
     Ноты на фото не подписываем до получения достоверной карты строя. */
  // Варианты ханга на экране 2: ?hang=bronze — бронзовый (8 полей), по умолчанию — иридисцентный (9 полей).
  // Поля в координатах viewBox 400: [x, y, rx, ry, наклон, номер ноты]
  const HANGS = {
    iridescent: { file: 'handpan-iridescent-cutout.webp', alt: 'Иридисцентный хэндпан: вид сверху на тональные поля', fields: [
      [200, 180, 33, 37, 0, 0],
      [121, 305, 34, 27, 20, 1], [264, 312, 34, 27, -20, 2],
      [54, 214, 22, 30, 5, 3], [342, 220, 22, 30, -5, 4],
      [74, 109, 25, 21, -40, 5], [325, 114, 25, 21, 40, 6],
      [153, 50, 24, 17, -8, 7], [247, 51, 24, 17, 8, 8]
    ] },
    bronze: { file: 'handpan-bronze-cutout.webp', alt: 'Бронзовый хэндпан: вид сверху на тональные поля', fields: [
      [201, 170, 40, 42, 0, 0],
      [123, 307, 32, 24, 15, 1], [273, 309, 32, 24, -20, 2],
      [55, 195, 18, 28, 5, 3], [345, 189, 18, 28, -8, 4],
      [94, 85, 25, 19, -25, 5], [299, 82, 25, 19, 20, 6],
      [193, 37, 26, 16, 0, 7]
    ] }
  };
  // с 12.11 на сайте только иридисцентный (правка Ани); бронзовый — данные на случай возврата сравнения
  let hangKey = 'iridescent';
  let FIELDS = HANGS[hangKey].fields;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const hangs = [];
  $$('svg[data-hang]').forEach(svg => {
    let hits = [], tap = null;
    // зоны нажатия под текущий вариант
    const build = () => {
      $$('.hang-hit,.hang-tap', svg).forEach(el => el.remove());
      FIELDS.forEach(([x, y, rx, ry, angle, i]) => {
        const label = i === 0 ? 'Центральный купол: послушать звук' : `Тональное поле ${i}: послушать звук`;
        const g = svgEl('g', { class: 'hang-hit', tabindex: '0', role: 'button', 'aria-label': label });
        const shape = svgEl('ellipse', { cx:x, cy:y, rx: rx * 1.12, ry: ry * 1.12, transform:`rotate(${angle} ${x} ${y})` });
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
      hits = $$('.hang-hit', svg);
      tap = svgEl('circle', { class: 'hang-tap', r: 9, cx: FIELDS[0][0], cy: FIELDS[0][1] });
      svg.append(tap);
    };
    build();
    /* Подсказка (правка 10.11): пока не трогали, поля по очереди загораются и «нажимаются». */
    let k = 0, demo = null, visible = false;
    const step = () => {
      const ORDER = [0, 3, 1, 2, 4, 5, 7, 8, 6].filter(i => i < FIELDS.length);
      hits.forEach(h => h.classList.remove('is-hint'));
      const i = ORDER[k++ % ORDER.length], [x, y] = FIELDS[i];
      hits[i].classList.add('is-hint');
      tap.setAttribute('cx', x); tap.setAttribute('cy', y);
      tap.classList.remove('is-tap'); void tap.getBBox(); tap.classList.add('is-tap');
    };
    const start = () => { if (!demo && !svg.dataset.touched && !reduce) { step(); demo = setInterval(step, 1100); } };
    const stop = () => { clearInterval(demo); demo = null; hits.forEach(h => h.classList.remove('is-hint')); if (tap) tap.classList.remove('is-tap'); };
    const done = () => { svg.dataset.touched = '1'; stop(); svg.classList.add('is-touched'); };
    svg.addEventListener('pointerdown', done); svg.addEventListener('keydown', done);
    svg.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') stop(); });
    svg.addEventListener('pointerleave', () => { if (!svg.dataset.touched && visible) start(); });
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; visible ? start() : stop(); }), { threshold: .4 }).observe(svg);
    // при смене варианта — новые зоны и короткий показ, куда нажимать
    hangs.push(() => { stop(); build(); k = 0; delete svg.dataset.touched; svg.classList.remove('is-touched'); if (visible) start(); });
  });
  function setHang(key, initial) {
    if (!HANGS[key]) return;
    hangKey = key; FIELDS = HANGS[key].fields;
    try { sessionStorage.setItem('hs-hang', key); } catch (e) {}
    $$('.hang-photo').forEach(img => {
      if (img.src.endsWith(HANGS[key].file)) return;
      const swap = () => { img.src = img.src.replace(/[^/]+\.webp$/, HANGS[key].file); img.alt = HANGS[key].alt; };
      if (initial || reduce) return swap();
      img.classList.add('is-swapping');
      setTimeout(() => { swap(); img.addEventListener('load', () => img.classList.remove('is-swapping'), { once: true }); }, 260);
    });
    $$('[data-hang-variant]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hangVariant === key)));
    if (!initial) hangs.forEach(f => f());
  }
  setHang(hangKey, true);
  $$('[data-hang-variant]').forEach(b => b.addEventListener('click', () => setHang(b.dataset.hangVariant)));

  /* ---------- 01: плеер стоит на ханге — точка в долях кадра пересчитывается под object-fit:cover ---------- */
  const hp = $('[data-hang-spot]'), hImg = $('.s1-bg');
  if (hp && hImg) {
    const wide = matchMedia('(min-width:1000px)');
    const place = () => {
      const [fx, fy] = (wide.matches ? hImg.dataset.spotD : hImg.dataset.spotM).split(',').map(Number);
      const nw = hImg.naturalWidth, nh = hImg.naturalHeight; if (!nw) return;
      const r = hImg.getBoundingClientRect(), host = hp.offsetParent.getBoundingClientRect();
      const s = Math.max(r.width / nw, r.height / nh), w = nw * s, h = nh * s;
      const [px, py] = getComputedStyle(hImg).objectPosition.split(' ').map(v => parseFloat(v) / 100);
      let x = r.left - host.left + (r.width - w) * px + fx * w;
      let y = r.top - host.top + (r.height - h) * py + fy * h;
      // на компьютере — на одной линии с кнопками «Попробовать занятие» / «Выбрать ханг» (правка 12.11)
      const btns = wide.matches && $('.s1-btns');
      if (btns) { const b = btns.getBoundingClientRect(); y = b.top - host.top + b.height / 2; }
      // на телефоне (правка 14.11) — у левого поля, посередине между заголовком и текстом с кнопками
      if (!wide.matches) {
        const a = $('.s1-h1').getBoundingClientRect(), t = $('.s1-text').getBoundingClientRect();
        y = (a.bottom + t.top) / 2 - host.top;
        x = parseFloat(getComputedStyle($('.s1-body')).paddingLeft) + hp.offsetHeight / 2;
      }
      hp.style.setProperty('--hx', Math.round(x) + 'px'); hp.style.setProperty('--hy', Math.round(y) + 'px');
      hp.classList.add('is-placed');
    };
    hImg.complete ? place() : hImg.addEventListener('load', place);
    hImg.addEventListener('load', place);
    addEventListener('resize', place); wide.addEventListener('change', place);
    document.fonts && document.fonts.ready.then(place);
  }

  /* ---------- 08: видео из мастерской в окне ---------- */
  const vd = $('[data-video]');
  if (vd) {
    const v = $('video', vd);
    const close = () => { v.pause(); vd.close(); };
    $('[data-video-open]').addEventListener('click', () => {
      if (!v.src) v.src = v.dataset.src;
      vd.showModal(); v.play().catch(() => {});
      HS.goal && HS.goal('video_play', { video: 'making' });
    });
    $('[data-video-close]', vd).addEventListener('click', close);
    vd.addEventListener('click', e => { if (e.target === vd) close(); });
    vd.addEventListener('close', () => v.pause());
  }

  /* ---------- 05: примеры звучания в карточках аудиторий ---------- */
  // Повторное нажатие выключает звук (правка 12.11, №37): запущенные ноты гаснут плавно
  const audStop = b => {
    clearTimeout(b._t); b.classList.remove('is-playing'); b.setAttribute('aria-pressed', 'false');
    (b._outs || []).forEach(o => { try {
      const t = o.context.currentTime; o.gain.cancelScheduledValues(t);
      o.gain.setValueAtTime(o.gain.value, t); o.gain.linearRampToValueAtTime(0, t + 0.15);
    } catch (e) {} });
    b._outs = [];
  };
  $$('[data-aud-play]').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('is-playing')) { audStop(b); return; }
    $$('[data-aud-play].is-playing').forEach(audStop);
    // пульсация после первого нажатия больше не нужна
    $$('[data-aud-play]').forEach(x => x.classList.add('is-tried'));
    b.classList.add('is-playing'); b.setAttribute('aria-pressed', 'true');
    const s = b.closest('[data-snd]').dataset.snd, F = FREQS;
    let notes, len;
    if (s === 'long') { notes = [tone(F[0], 0.28, 10)]; len = 10; }
    else if (s === 'fast') { notes = [0, 5, 6, 7, 8, 6, 4].map((n, i) => tone(F[n], 0.16, 3, i * 0.16)); len = 4; }
    else { notes = [0, 4, 5, 6, 4].map((n, i) => tone(F[n], 0.17, 3.5, i * 0.38)); len = 5; }
    b._outs = notes.filter(Boolean);
    b._t = setTimeout(() => audStop(b), len * 1000);
  }));

  /* ---------- 06: одна большая цифра, столбик прокручивается вверх ---------- */
  const sWrap = $('[data-stats-wrap]'), col = $('[data-stat-col]');
  const nums = $$('span', col), labels = $$('[data-stat-label] > span'), dots = $$('.s6-dot', sWrap), N = nums.length;
  const fmtN = n => n >= 1000 ? Math.round(n).toLocaleString('ru-RU') : String(Math.round(n));
  let si = 0, siv = null, seen = false, hold = false;
  function setStat(i) {
    si = i;
    col.style.transform = `translateY(${1.15 - i}em)`;
    nums.forEach((n, k) => n.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    labels.forEach((l, k) => { l.hidden = k !== i; });
    $('[data-stat-count]').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
  }
  // Автосмена каждые 3 с после появления. Курсор над блоком её не останавливает;
  // пауза остаётся при работе с клавиатуры и при reduced-motion.
  function run() {
    clearInterval(siv);
    if (reduce || !seen || document.hidden) return;
    siv = setInterval(() => { if (!hold) setStat((si + 1) % N); }, 3000);
  }
  dots.forEach((d, i) => d.addEventListener('click', () => { setStat(i); run(); }));
  sWrap.addEventListener('focusin', e => { hold = e.target.matches(':focus-visible'); });
  sWrap.addEventListener('focusout', e => {
    hold = !!(e.relatedTarget && sWrap.contains(e.relatedTarget) && e.relatedTarget.matches(':focus-visible'));
  });
  $('[data-stat-dots]').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? N - 1
      : (si + (e.key === 'ArrowRight' ? 1 : -1) + N) % N;
    setStat(next); dots[next].focus(); run();
  });
  let statTouch = null;
  const statsArea = $('.s6-grid', sWrap);
  statsArea.addEventListener('touchstart', e => {
    statTouch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  statsArea.addEventListener('touchend', e => {
    if (!statTouch) return;
    const dx = e.changedTouches[0].clientX - statTouch.x;
    const dy = e.changedTouches[0].clientY - statTouch.y;
    statTouch = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      setStat((si + (dx < 0 ? 1 : -1) + N) % N); run();
    }
  }, { passive: true });
  statsArea.addEventListener('touchcancel', () => { statTouch = null; }, { passive: true });
  document.addEventListener('visibilitychange', run);
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
  } else {
    seen = true; run();
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
  let dragged = false;
  cards.forEach((c, i) => c.addEventListener('click', e => {
    if (dragged) { e.preventDefault(); return; }   // это был перетаск, а не нажатие
    if (off(i)) setT(ti + off(i));
  }));
  $('[data-t-prev]').addEventListener('click', () => setT(ti - 1));
  $('[data-t-next]').addEventListener('click', () => setT(ti + 1));

  // Лента тянется мышью и пальцем (правка 14.11): карточки едут за курсором, при отпускании —
  // к ближайшему преподавателю; далеко протянул — перелистнёт на несколько
  let px = null, pid = null, step = 1;
  const setDrag = v => car.style.setProperty('--drag', v + 'px');
  car.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    px = e.clientX; pid = e.pointerId; dragged = false;
    const a = cards[ti].getBoundingClientRect(), b = cards[(ti + 1) % n].getBoundingClientRect();
    step = Math.max(80, (b.left + b.width / 2) - (a.left + a.width / 2));
  });
  car.addEventListener('pointermove', e => {
    if (px === null || e.pointerId !== pid) return;
    const dx = e.clientX - px;
    if (!dragged && Math.abs(dx) > 6) { dragged = true; car.classList.add('is-drag'); car.setPointerCapture(pid); runAuto(); }
    if (dragged) setDrag(dx);
  });
  const endDrag = e => {
    if (px === null || (e && e.pointerId !== pid)) return;
    const dx = e && e.type !== 'pointercancel' ? e.clientX - px : 0;
    px = null; car.classList.remove('is-drag');
    if (dragged) {
      const k = Math.abs(dx) > step * 0.22 ? -Math.sign(dx) * Math.max(1, Math.round(Math.abs(dx) / step)) : 0;
      setDrag(0);
      if (k) setT(ti + k);
      setTimeout(() => { dragged = false; }, 0);   // клик после перетаска не считаем
    }
  };
  car.addEventListener('pointerup', endDrag);
  car.addEventListener('pointercancel', endDrag);
  // горизонтальный жест на тачпаде листает по одной карточке
  let wheelLock = 0;
  car.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
    e.preventDefault();
    const now = performance.now();
    if (now - wheelLock < 450) return;
    wheelLock = now; setT(ti + (e.deltaX > 0 ? 1 : -1)); runAuto();
  }, { passive: false });
  car.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); setT(ti + k); cards[ti].focus({ preventScroll: true }); }
  });
  setT(0);

  // автоперелистывание (правка 12.11): раз в 5 с, только когда карусель на экране;
  // пауза при наведении, фокусе и касании, после ручного листания отсчёт заново; при «уменьшить движение» — выключено
  const sec7 = $('#teach');
  let autoT = 0, inView = false, tHold = false;
  const stopAuto = () => clearInterval(autoT);
  const runAuto = () => { stopAuto(); if (!reduce && inView && !tHold && !document.hidden) autoT = setInterval(() => setT(ti + 1), 4000); };
  new IntersectionObserver(es => { inView = es[0].isIntersecting; runAuto(); }, { threshold: .35 }).observe(sec7);
  car.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { tHold = true; stopAuto(); } });
  car.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { tHold = false; runAuto(); } });
  sec7.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) { tHold = true; stopAuto(); } });
  sec7.addEventListener('focusout', e => { if (!sec7.contains(e.relatedTarget)) { tHold = false; runAuto(); } });
  ['click', 'touchend', 'keydown'].forEach(ev => car.parentElement.addEventListener(ev, runAuto, { passive: true }));
  document.addEventListener('visibilitychange', runAuto);

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
