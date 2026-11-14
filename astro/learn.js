/* «Обучение»: преподаватели, FAQ, форма записи. Тексты уже в HTML (собирает Astro), скрипт их только переключает. */
(() => {
  'use strict';
  const { $, $$ } = HS;

  /* ---------- звук: короткая фраза D Kurd (заглушка до аудиофайла, P-01) ---------- */
  HS.player({ pattern: [0, 1, 4, 3, 5, 4, 6, 7, 8, 7, 5, 4, 2, 3, 1, 0], duration: 10 });

  /* ---------- 08: преподаватели — чипы-вкладки, все панели в HTML ---------- */
  const tbtns = $$('[data-tlist] .chip'), tpanels = tbtns.map(b => $('#' + b.getAttribute('aria-controls')));
  // Компактные фото подгружаем до появления блока и до выбора вкладки.
  const teacherImages = tpanels.map(panel => $('img', panel));
  const warmTeacher = img => {
    if (!img) return Promise.resolve();
    img.loading = 'eager';
    return img.decode().catch(() => {});
  };
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      near.disconnect();
      // Последовательно, чтобы не конкурировать с видимым содержимым страницы.
      (async () => { for (const img of teacherImages) await warmTeacher(img); })();
    }, { rootMargin: '800px 0px' });
    near.observe($('#teachers'));
  }
  tbtns.forEach((button, i) => {
    button.addEventListener('pointerenter', () => warmTeacher(teacherImages[i]), { once: true });
    button.addEventListener('focus', () => warmTeacher(teacherImages[i]), { once: true });
  });
  let ti = 0, swapT = 0;
  // плавная смена преподавателя (правка 12.11): старая карточка гаснет, новая проявляется — фото с лёгким приближением, текст со сдвигом в сторону листания
  const EASE = 'cubic-bezier(.22,.8,.3,1)';
  function swapPanel(from, to, dir) {
    const show = () => {
      tpanels.forEach((p, k) => { p.hidden = k !== to; });
      if (HS.reduce || !Element.prototype.animate) return;
      const p = tpanels[to], ph = $('.tphoto', p), info = $('.tinfo', p);
      if (ph) ph.animate([{ opacity: 0, transform: 'scale(1.035)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: EASE });
      if (info) [...info.children].forEach((el, n) => el.animate(
        [{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }],
        { duration: 750, delay: 90 + n * 70, easing: EASE, fill: 'backwards' }));
    };
    clearTimeout(swapT);
    const old = tpanels[from];
    if (from === to || HS.reduce || !old || old.hidden || !Element.prototype.animate) return show();
    // перелистывание (правка 14.11): старая карточка уезжает в сторону, новая одновременно въезжает с другой стороны;
    // startX — с какого сдвига начинать (после перетаскивания курсором/пальцем), без рывка
    tpanels.forEach(p => p.getAnimations().forEach(a => a.finish()));
    const sx = swapPanel.startX || 0; swapPanel.startX = 0;
    old.style.transform = '';
    const top = old.offsetTop, left = old.offsetLeft, w = old.offsetWidth;
    Object.assign(old.style, { position: 'absolute', top: top + 'px', left: left + 'px', width: w + 'px', margin: '0', pointerEvents: 'none' });
    const nw = tpanels[to];
    nw.hidden = false;
    tpanels.forEach((p, k) => { if (k !== to && p !== old) p.hidden = true; });
    const D = 1300, E = 'cubic-bezier(.45,.05,.2,1)';
    const done = () => { old.hidden = true; old.removeAttribute('style'); };
    old.animate([{ transform: `translateX(${sx}px)`, opacity: 1 }, { transform: `translateX(${-dir * 100}%)`, opacity: 0 }], { duration: D, easing: E })
      .finished.then(done, done);
    nw.animate([{ transform: `translateX(calc(${dir * 100}% + ${sx}px))`, opacity: 0 }, { opacity: .6, offset: .5 }, { transform: 'none', opacity: 1 }], { duration: D, easing: E });
  }
  function setTeacher(i, focus) {
    const prev = ti; ti = i;
    warmTeacher(teacherImages[i]);
    tbtns.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    const n = tbtns.length, fwd = (i - prev + n) % n;
    swapPanel(prev, i, fwd === 0 ? 1 : (fwd <= n / 2 ? 1 : -1));
    if (!HS.wide.matches) {
      const list = $('[data-tlist]'), button = tbtns[i];
      const listRect = list.getBoundingClientRect(), buttonRect = button.getBoundingClientRect();
      if (buttonRect.left < listRect.left + 12 || buttonRect.right > listRect.right - 12) {
        list.scrollTo({ left: list.scrollLeft + buttonRect.left - listRect.left - list.clientWidth / 2 + buttonRect.width / 2, behavior: HS.reduce ? 'instant' : 'smooth' });
      }
    }
    if (focus) tbtns[i].focus();
  }
  tbtns.forEach((b, i) => b.addEventListener('click', () => setTeacher(i)));
  $('[data-tlist]').addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); setTeacher((ti + k + tbtns.length) % tbtns.length, true); }
  });
  // автолистание преподавателей (правка 14.11): стартует, когда ряд имён на экране (фото сразу под ним), шаг 5 с, по кругу;
  // после ручного выбора или перетаскивания — пауза 10 с; блок ушёл с экрана или открыто «Читать дальше» — стоп
  if (!HS.reduce && 'IntersectionObserver' in window && tbtns.length > 1) {
    let autoT = 0, holdUntil = 0, inView = false;
    const tick = () => {
      if (!inView || document.hidden || Date.now() < holdUntil || $('.tbio.open')) return;
      setTeacher((ti + 1) % tbtns.length);
    };
    const start = () => { if (inView) return; inView = true; clearInterval(autoT); setTimeout(tick, 1200); autoT = setInterval(tick, 5000); };
    const stop = () => { inView = false; clearInterval(autoT); };
    const sec = $('#teachers'), list = $('[data-tlist]');
    new IntersectionObserver(es => { if (es[0].isIntersecting) start(); }, { rootMargin: '0px 0px -25% 0px' }).observe(list);
    new IntersectionObserver(es => { if (!es[0].isIntersecting) stop(); }).observe(sec);
    HS.teachHold = () => { holdUntil = Date.now() + 10000; };
    tbtns.forEach(b => b.addEventListener('click', e => { if (e.isTrusted) HS.teachHold(); }));
  }

  // листание курсором и пальцем (правка 14.11): карточка едет за указателем, отпустили дальше порога — следующий/предыдущий
  {
    const area = $('#teachers');
    let x0 = null, y0 = 0, dx = 0, drag = false, pid = null;
    const cur = () => tpanels[ti];
    area.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button,a,[data-tlist]')) return;
      if (!e.target.closest('.tpanel')) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; drag = false; pid = e.pointerId;
    });
    area.addEventListener('pointermove', e => {
      if (x0 === null || e.pointerId !== pid) return;
      dx = e.clientX - x0;
      if (!drag) {
        if (Math.abs(e.clientY - y0) > 10 && Math.abs(dx) < 10) { x0 = null; return; } // вертикальная прокрутка
        if (Math.abs(dx) > 8) { drag = true; area.setPointerCapture(pid); area.classList.add('is-drag'); }
      }
      if (drag) cur().style.transform = `translateX(${dx}px)`;
    });
    const end = e => {
      if (x0 === null || (e && e.pointerId !== pid)) return;
      x0 = null; area.classList.remove('is-drag');
      if (!drag) return;
      const p = cur();
      if (HS.teachHold) HS.teachHold();
      if (Math.abs(dx) > 70) {
        swapPanel.startX = dx;
        setTeacher((ti + (dx < 0 ? 1 : -1) + tbtns.length) % tbtns.length);
      } else {
        p.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.22,.8,.3,1)' });
        p.style.transform = '';
      }
      drag = false;
    };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);
  }

  // на узких второй абзац био — по «Читать дальше»
  $$('[data-t-more]').forEach(more => more.addEventListener('click', () => {
    const bio = $('.tbio', more.parentNode), open = !bio.classList.contains('open');
    bio.classList.toggle('open', open);
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Свернуть −' : 'Читать дальше +';
  }));

  /* ---------- 10: FAQ — открыт один вопрос ---------- */
  const qs = $$('[data-faq] .faq-q');
  qs.forEach(b => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    qs.forEach(x => { x.setAttribute('aria-expanded', 'false'); $('.faq-sign', x).textContent = '+'; $('#' + x.getAttribute('aria-controls')).hidden = true; });
    if (open) { b.setAttribute('aria-expanded', 'true'); $('.faq-sign', b).textContent = '−'; $('#' + b.getAttribute('aria-controls')).hidden = false; }
  }));

  /* ---------- «Как мы учим»: ступени вырастают по очереди и звучат (правка 12.11) ----------
     ноты снизу вверх по строю D Kurd: дин D3 → A3 → C4 → D4 → A4; наведение — нота (если браузер уже разрешил звук), касание/клик — нота всегда */
  const stagesBox = $('.stages'), stages = $$('.stage');
  if (stagesBox && stages.length) {
    const NOTES = [0, 1, 3, 4, 8];
    const ring = (i, el) => {
      HS.tone(HS.FREQS[NOTES[i] ?? 0], 0.15, 2.8);
      el.classList.remove('is-ringing'); void el.offsetWidth; el.classList.add('is-ringing');
    };
    stages.forEach((el, i) => {
      el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') ring(i, el); });
      el.addEventListener('click', () => ring(i, el));
    });
    if (!HS.reduce && 'IntersectionObserver' in window) {
      stagesBox.classList.add('is-armed');
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        io.disconnect(); requestAnimationFrame(() => stagesBox.classList.add('is-grown'));
      }, { threshold: .3 });
      io.observe(stagesBox);
    }
  }

  /* ---------- форма записи: формат и город предвыбраны ---------- */
  HS.initSheet(key => {
    const r = $(`[data-sheet] input[name="format"][value="${key}"]`);
    if (r) r.checked = true;
  });

  /* «Как строится путь» (правка 14.11): этапы по очереди — линия прорисовывается слева, цифра выезжает, текст проявляется */
  const pathEl = document.querySelector('.path');
  if (pathEl && !HS.reduce && 'IntersectionObserver' in window) {
    pathEl.classList.add('path-anim');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -18% 0px' });
    pathEl.querySelectorAll('.step').forEach((st, i) => { st.style.setProperty('--d', (i * .25) + 's'); io.observe(st); });
  }

  HS.ready();
})();
