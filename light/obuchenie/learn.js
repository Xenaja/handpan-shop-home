/* «Обучение» — светлая версия: навыки, этапы, путь, форматы, преподаватели, FAQ, форма записи. */
(() => {
  'use strict';
  const { $, $$, esc, nb } = HS;
  const C = JSON.parse($('#content').textContent);
  const initials = s => s.split(/\s+/).map(w => w[0]).join('').slice(0, 2);

  /* ---------- звук: короткая фраза D Kurd (заглушка до аудиофайла, P-01) ---------- */
  HS.player({ pattern: [0, 1, 4, 3, 5, 4, 6, 7, 8, 7, 5, 4, 2, 3, 1, 0], duration: 10 });

  /* аватары преподавателей на первом экране: инициалы, пока нет портретов (P-13) */
  const T = C.teachers;
  $('[data-ava]').innerHTML = T.slice(0, 2).map(t => `<span>${esc(initials(t.name))}</span>`).join('') + `<span>+${T.length - 2}</span>`;
  $('.e1-team-t').textContent = T.length + ' преподавателей';

  /* ---------- 03: навыки ---------- */
  $('[data-skills]').innerHTML = [
    ['Звукоизвлечению', 'Постановка рук, основные способы атаки, контроль громкости, тембра и длительности звука'],
    ['Ритму', 'Базовые ритмические рисунки, пульсация, акценты и координация обеих рук'],
    ['Мелодии', 'Как находить и соединять ноты, строить музыкальные фразы и разбирать композиции'],
    ['Импровизации', 'Как ориентироваться на инструменте и создавать музыку без заранее выученной последовательности нот'],
    ['Собственной музыке', 'Как постепенно перейти от исполнения чужих мелодий к созданию собственных']
  ].map(([w, t], i) => `<li class="skill"><span class="skill-n">0${i + 1}</span><span class="skill-w">${esc(w)}</span><span class="skill-t">${esc(t)}</span></li>`).join('');

  /* ---------- 04: ступени ---------- */
  $('[data-stages]').innerHTML = [
    ['Основа', 'Положение рук · звукоизвлечение · базовые удары · координация'],
    ['Ритм', 'Пульс · простые рисунки · игра двумя руками · чувство времени'],
    ['Мелодия', 'Лад · фразы · последовательности нот · разбор композиций'],
    ['Импровизация', 'Работа со структурой · вариативность · развитие слуха'],
    ['Собственный язык', 'Создание своих ритмов, мелодий и композиций']
  ].map(([h, t], i) => `<li class="stage"><span class="stage-n">0${i + 1}</span><span class="stack" style="gap:10px"><span class="stage-t">${esc(h)}</span><span class="stage-x">${esc(t)}</span></span></li>`).join('');

  /* ---------- 05: путь ---------- */
  $('[data-path]').innerHTML = [
    ['1', 'месяц', 'Осваиваете базовые техники: как держать инструмент, как извлекать звук, первые ритмы. Играете простые мелодии'],
    ['3–6', 'месяцев', 'Уверенно играете ритм и мелодию одновременно. Начинаете импровизировать. Можете сыграть несколько композиций'],
    ['6+', 'месяцев', 'Свободно владеете инструментом. Играете «из потока». Можете выступать или играть для себя в удовольствие']
  ].map(([n, u, t]) => `<li class="step"><span class="step-h"><span class="step-num">${esc(n)}</span><span class="step-u">${esc(u)}</span></span><p>${esc(t)}</p></li>`).join('');

  /* ---------- 06: форматы ---------- */
  $('[data-formats]').insertAdjacentHTML('beforeend', C.formats.map(f =>
    `<div class="fmt"><span class="fmt-name">${esc(f.name)}</span><span class="fmt-price">${esc(f.price)} <span class="mono">${esc(f.unit)}</span></span><span class="fmt-who">${esc(f.who)}</span><button type="button" class="btn btn--48 btn--line" data-open="${esc(f.key)}">Записаться</button></div>`).join(''));

  /* ---------- 08: преподаватели — чипы-вкладки ---------- */
  const tlist = $('[data-tlist]'), panel = $('#t-panel'), more = $('[data-t-more]', panel);
  tlist.innerHTML = T.map((t, i) =>
    `<button type="button" class="chip" role="tab" id="t-${i}" aria-controls="t-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t.name)}</button>`).join('');
  const tbtns = $$('.chip', tlist);
  let ti = 0;
  function setTeacher(i, focus) {
    ti = i;
    const t = T[i];
    tbtns.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 't-' + i);
    $('[data-t="role"]', panel).textContent = nb(t.role);
    $('[data-t="name"]', panel).textContent = t.name;
    $('[data-t="nick"]', panel).textContent = t.nick || '';
    const bio = $('[data-t="bio"]', panel);
    bio.innerHTML = t.bio.map(p => `<p>${esc(nb(p))}</p>`).join('');
    bio.classList.remove('open');
    more.hidden = t.bio.length < 2;
    more.setAttribute('aria-expanded', 'false');
    more.textContent = 'Читать дальше +';
    const ph = $('[data-t-photo]', panel);
    ph.innerHTML = t.img
      ? `<img src="${esc(t.img)}" alt="${esc(t.name)}" style="object-position:${esc(t.pos || '50% 30%')}">`
      : `<span class="tmono" aria-hidden="true">${esc(initials(t.name))}</span>`;
    if (t.img) delete ph.dataset.pendingLink; else ph.dataset.pendingLink = 'P-13';
    if (focus) tbtns[i].focus();
  }
  tbtns.forEach((b, i) => b.addEventListener('click', () => setTeacher(i)));
  tlist.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); setTeacher((ti + k + T.length) % T.length, true); }
  });
  more.addEventListener('click', () => {
    const bio = $('[data-t="bio"]', panel), open = !bio.classList.contains('open');
    bio.classList.toggle('open', open);
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Свернуть −' : 'Читать дальше +';
  });
  setTeacher(0);

  /* ---------- 10: FAQ — открыт один вопрос, первый по умолчанию ---------- */
  const faqEl = $('[data-faq]');
  faqEl.innerHTML = C.faq.map(([q, a], i) =>
    `<div class="faq-i"><button type="button" class="faq-q" aria-expanded="${i === 0}" aria-controls="faq-${i}"><span>${esc(q)}</span><span class="faq-sign" aria-hidden="true">${i === 0 ? '−' : '+'}</span></button><p class="faq-a" id="faq-${i}"${i === 0 ? '' : ' hidden'}>${esc(a)}</p></div>`).join('');
  $$('.faq-q', faqEl).forEach(b => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    $$('.faq-q', faqEl).forEach(x => { x.setAttribute('aria-expanded', 'false'); $('.faq-sign', x).textContent = '+'; $('#' + x.getAttribute('aria-controls')).hidden = true; });
    if (open) { b.setAttribute('aria-expanded', 'true'); $('.faq-sign', b).textContent = '−'; $('#' + b.getAttribute('aria-controls')).hidden = false; }
  }));

  /* ---------- 11: адреса; без адреса — только город (P-02) ---------- */
  $('[data-addr]').innerHTML = Object.values(C.cities).map(c =>
    `<span>${esc(c.name)}${c.address ? ' · ' + esc(c.address) : ''}</span>`).join('');

  /* ---------- форма записи: формат и город предвыбраны ---------- */
  $('[data-fmt-chips]').innerHTML = [['trial', 'Пробное'], ...C.formats.map(f => [f.key, f.chip])].map(([k, l], i) =>
    `<label class="chip-r"><input type="radio" name="format" value="${esc(k)}"${i === 0 ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('');
  HS.initSheet(key => {
    const r = $(`[data-sheet] input[name="format"][value="${key}"]`);
    if (r) r.checked = true;
  });

  HS.ready();
})();
