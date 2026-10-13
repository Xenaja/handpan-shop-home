/* Handpan Shop — общая логика для трёх вариантов главной (экраны 1–3) */
(() => {
  'use strict';

  const VARIANTS = [
    { id: '2a', name: 'Кобальт и бетон' },
    { id: '1a', name: 'Тихая роскошь' },
    { id: '1b', name: 'Современная сцена' }
  ];
  const FREQS = [146.83, 220, 233.08, 261.63, 293.66, 329.63, 349.23, 392, 440];
  const NAMES = ['A3', 'B♭3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'];
  const ANGLES = [100, 60, 145, 20, 195, 335, 245, 290];
  const PATTERN = [0, -1, 4, 5, 6, 5, 4, -1, 0, 2, 3, 4, 3, 2, 1, -1, 0, 5, 6, 7, 8, 7, 6, 5, 0, -1, 4, 3, 2, 3, 1, -1];
  const DURATION = 80;
  const ROUTES = ['Частный визит', 'Пробное занятие', 'Покупка инструмента', 'Помочь определиться'];
  const TITLES = {
    'Частный визит': 'Визит в студию',
    'Пробное занятие': 'Пробное занятие',
    'Покупка инструмента': 'Консультация мастера',
    'Помочь определиться': 'Поможем определиться'
  };
  const MARQUEE = ['HANG', 'ХАНГ', 'HANDPAN', 'ХЭНДПАН', 'PANTAM'];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const variant = body.dataset.variant;
  const accent = body.dataset.accent || '#B08D57';

  /* ---------- масштаб: макет 1440, на узких экранах уменьшаем целиком;
     первый экран — по высоте окна (--hh в пикселях макета) ---------- */
  const BASE = 1440;
  function fit() {
    const html = document.documentElement;
    html.style.zoom = '';
    const w = html.clientWidth;
    const z = w < BASE ? w / BASE : 1;
    html.style.zoom = z < 1 ? String(z) : '';
    const hh = Math.round(Math.min(1000, Math.max(640, innerHeight / z)));
    html.style.setProperty('--hh', hh + 'px');
  }
  fit();
  addEventListener('resize', fit);

  /* ---------- звук (синтез D Kurd — заглушка до композиции заказчика) ---------- */
  let ac;
  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, vol = 0.22, dur = 4, parts) {
    try {
      const a = ctx(), t = a.currentTime, out = a.createGain();
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(vol, t + 0.006);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(a.destination);
      (parts || [[1, 1], [2, 0.32], [3, 0.14], [4.02, 0.04]]).forEach(([m, g]) => {
        const o = a.createOscillator(), gg = a.createGain();
        o.type = 'sine'; o.frequency.value = f * m; gg.gain.value = g;
        o.connect(gg); gg.connect(out); o.start(t); o.stop(t + dur + 0.05);
      });
    } catch (e) { /* без звука */ }
  }

  /* ---------- плеер: общий для героя и липкой панели ---------- */
  let playing = false, t = 0, iv = null;
  const fmt = s => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function render() {
    body.classList.toggle('is-playing', playing);
    $$('[data-time]').forEach(el => { el.textContent = fmt(t); });
    $$('[data-progress]').forEach(el => { el.style.width = (t / DURATION * 100).toFixed(2) + '%'; });
    $$('[data-play]').forEach(el => el.setAttribute('aria-label', playing ? 'Пауза' : 'Послушать, как звучит ханг'));
  }
  function stop() { clearInterval(iv); iv = null; playing = false; render(); }
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
      if (t >= DURATION) { t = 0; stop(); } else render();
    }, 500);
    render();
  }
  const ICON = '<svg class="ic-play" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 3 L19 11 L6 19 Z" fill="currentColor"/></svg>' +
    '<svg class="ic-pause" viewBox="0 0 22 22" aria-hidden="true"><rect x="4" y="3" width="4" height="16" fill="currentColor"/><rect x="14" y="3" width="4" height="16" fill="currentColor"/></svg>';
  $$('[data-play]').forEach(b => { b.insertAdjacentHTML('afterbegin', ICON); b.addEventListener('click', togglePlay); });

  /* звуковая волна */
  $$('[data-wave]').forEach(w => {
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('span');
      s.style.height = Math.round(14 + 30 * Math.abs(Math.sin(i * 0.7)) * (0.5 + 0.5 * Math.sin(i * 0.23))) + 'px';
      s.style.setProperty('--d', (0.5 + (i * 37 % 11) / 14).toFixed(2) + 's');
      s.style.setProperty('--dl', ((i * 13 % 9) / 10).toFixed(2) + 's');
      w.appendChild(s);
    }
  });

  /* ---------- бегущая строка ---------- */
  $$('[data-marquee]').forEach(m => {
    const words = Array.from({ length: 8 }, () => MARQUEE).flat();
    m.innerHTML = words.map(w => `<span class="mq-item">${w}<i class="mq-dot"></i></span>`).join('');
    m.setAttribute('aria-hidden', 'true');
  });

  /* ---------- схема ханга ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  $$('[data-hang]').forEach(svg => {
    const stroke = svg.dataset.stroke, text = svg.dataset.text, dingStroke = svg.dataset.dingStroke || stroke;
    const hit = (shape, i) => {
      tone(FREQS[i], 0.25, i === 0 ? 6 : 4);
      shape.style.fill = accent;
      clearTimeout(shape._t);
      shape._t = setTimeout(() => { shape.style.fill = 'transparent'; }, 450);
    };
    const mkGroup = (shape, label, x, y, size, i, aria) => {
      const g = el('g', { class: 'hang-hit', tabindex: '0', role: 'button', 'aria-label': aria });
      shape.setAttribute('fill', 'transparent');
      shape.style.transition = 'fill .35s';
      const tx = el('text', { x, y, 'text-anchor': 'middle', 'font-family': "'JetBrains Mono', monospace", 'font-size': size, fill: text, 'pointer-events': 'none' });
      tx.textContent = label;
      g.append(shape, tx);
      const go = e => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); hit(shape, i); };
      g.addEventListener('pointerdown', go);
      g.addEventListener('keydown', go);
      svg.appendChild(g);
    };
    ANGLES.forEach((a, i) => {
      const r = a * Math.PI / 180, cx = +(200 + 132 * Math.cos(r)).toFixed(1), cy = +(200 + 132 * Math.sin(r)).toFixed(1);
      const e = el('ellipse', { cx, cy, rx: 36, ry: 27, transform: `rotate(${a + 90} ${cx} ${cy})`, stroke, 'stroke-width': 1 });
      mkGroup(e, NAMES[i], cx, cy + 3.5, 10, i + 1, 'Нота ' + NAMES[i]);
    });
    const ding = el('circle', { cx: 200, cy: 200, r: 54, stroke: dingStroke, 'stroke-width': 1 });
    mkGroup(ding, 'D3', 200, 204, 11, 0, 'Динг, нота D3');
    if (svg.dataset.dingInner) {
      svg.lastChild.insertBefore(el('circle', { cx: 200, cy: 200, r: 30, fill: 'none', stroke, 'stroke-width': .6, 'pointer-events': 'none' }), svg.lastChild.lastChild);
    }
  });

  /* аккорд: основной тон / октава / квинта */
  const CHORDS = { 1: [[1, 1]], 2: [[1, 1], [2, 0.6]], 3: [[1, 1], [2, 0.5], [3, 0.4]] };
  $$('[data-chord]').forEach(b => b.addEventListener('click', () => tone(146.83, 0.25, 3, CHORDS[b.dataset.chord])));

  /* ---------- раскрывашки и тултип ---------- */
  $$('[data-toggle]').forEach(b => {
    const panel = $(`[data-panel="${b.dataset.toggle}"]`);
    const sign = $('[data-sign]', b);
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      if (sign) sign.textContent = open ? '−' : '+';
    });
  });

  /* ---------- липкая панель после первого экрана ---------- */
  const bar = $('[data-sticky]');
  const hero = $('[data-hero]');
  if (bar && hero) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;left:0;top:71%;width:1px;height:1px;pointer-events:none;';
    hero.appendChild(sentinel);
    new IntersectionObserver(([e]) => {
      bar.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(sentinel);
  }

  /* ---------- форма ---------- */
  const sheet = $('[data-sheet]');
  if (sheet) {
    const title = $('[data-sheet-title]', sheet), help = $('[data-sheet-help]', sheet);
    const form = $('form', sheet), thanks = $('[data-sheet-thanks]', sheet), route = $('select', sheet);
    const phone = $('input[name="phone"]', sheet);
    route.innerHTML = ROUTES.map(r => `<option value="${r}">${r}</option>`).join('');
    let lastFocus = null, hideT = null;
    const setRoute = r => {
      route.value = r;
      title.textContent = TITLES[r];
      help.hidden = r !== 'Помочь определиться' || !thanks.hidden;
    };
    const open = r => {
      lastFocus = document.activeElement;
      form.hidden = false; thanks.hidden = true; form.reset();
      setRoute(r);
      clearTimeout(hideT);
      sheet.hidden = false;
      requestAnimationFrame(() => sheet.classList.add('open'));
      document.documentElement.classList.add('locked');
      setTimeout(() => $('input', sheet).focus({ preventScroll: true }), 50);
    };
    const close = () => {
      sheet.classList.remove('open');
      document.documentElement.classList.remove('locked');
      hideT = setTimeout(() => { sheet.hidden = true; }, 200);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    $$('[data-open]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); open(b.dataset.open); }));
    $$('[data-close]', sheet).forEach(b => b.addEventListener('click', close));
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
    route.addEventListener('change', () => setRoute(route.value));

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
      phone.setCustomValidity('');
    });
    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 '; });
    phone.addEventListener('blur', () => { if (phone.value.trim() === '+7') phone.value = ''; });

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (phone.value.replace(/\D/g, '').length !== 11) {
        phone.setCustomValidity('Введите номер полностью: +7 (XXX) XXX-XX-XX');
        phone.reportValidity();
        return;
      }
      form.hidden = true; help.hidden = true; thanks.hidden = false;
    });
  }

  /* ---------- переключатель вариантов (для просмотра заказчиком) ---------- */
  const nav = document.createElement('nav');
  nav.className = 'vswitch';
  nav.setAttribute('aria-label', 'Варианты дизайна');
  nav.innerHTML = '<span class="vswitch-cap">Вариант</span>' + VARIANTS.map((v, i) =>
    `<a href="../${v.id}/" data-v="${v.id}"${v.id === variant ? ' aria-current="page"' : ''} title="${v.name} · клавиша ${i + 1}"><b>${v.id}</b><span>${v.name}</span></a>`
  ).join('');
  body.appendChild(nav);

  // при переключении остаёмся на том же экране
  const screens = () => $$('[data-screen]');
  const currentScreen = () => {
    const mid = innerHeight / 2;
    let idx = 0;
    screens().forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) idx = i; });
    return idx;
  };
  const go = id => {
    try { sessionStorage.setItem('hp-screen', String(currentScreen())); } catch (e) {}
    location.href = '../' + id + '/';
  };
  nav.addEventListener('click', e => {
    const a = e.target.closest('a[data-v]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.v !== variant) go(a.dataset.v);
  });
  addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    const v = VARIANTS[Number(e.key) - 1];
    if (v && v.id !== variant) go(v.id);
  });
  try {
    const s = sessionStorage.getItem('hp-screen');
    sessionStorage.removeItem('hp-screen');
    if (s && +s > 0 && screens()[+s]) {
      history.scrollRestoration = 'manual';
      screens()[+s].scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  } catch (e) {}

  render();
})();
