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
  let ti = 0;
  function setTeacher(i, focus) {
    ti = i;
    warmTeacher(teacherImages[i]);
    tbtns.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; tpanels[k].hidden = k !== i; });
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

  /* ---------- форма записи: формат и город предвыбраны ---------- */
  HS.initSheet(key => {
    const r = $(`[data-sheet] input[name="format"][value="${key}"]`);
    if (r) r.checked = true;
  });

  HS.ready();
})();
