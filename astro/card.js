/* Карточка инструмента: «Послушать» (ноты именно этого строя; запись — когда будет файл) и форма записи на тест. */
(() => {
  'use strict';
  const { $, tone } = HS;

  /* ---------- «Послушать»: дин, затем ноты по кругу вверх и короткая фраза ---------- */
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const freq = n => {
    const m = n.match(/^([A-G])([b#]?)(\d)$/); if (!m) return 220;
    const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  };
  const btn = $('[data-listen]');
  if (btn) {
    const notes = JSON.parse(btn.dataset.listen).map(freq);
    let busy = 0;
    btn.addEventListener('click', () => {
      if (Date.now() < busy) return;
      const seq = [0, ...notes.slice(1).map((_, i) => i + 1), 0, 4, 2, 5, 3, 1].filter(i => i < notes.length);
      seq.forEach((n, i) => tone(notes[n], n === 0 ? 0.28 : 0.2, n === 0 ? 5 : 3.2, i * 0.32));
      busy = Date.now() + seq.length * 320;
      btn.classList.add('is-playing');
      setTimeout(() => btn.classList.remove('is-playing'), seq.length * 320 + 600);
      HS.goal && HS.goal('audio_play');
    });
  }

  /* ---------- форма: «тест этого инструмента» — подбор и покупка, «вопрос» — помочь определиться ---------- */
  const TITLES = { buy: 'Тест инструмента', help: 'Вопрос об инструменте', visit: 'Визит в студию', trial: 'Пробное занятие' };
  const sheet = $('[data-sheet]'), sRoute = $('[data-interest]', sheet);
  const setRoute = r => {
    if (!TITLES[r]) r = 'buy';
    if (sRoute) sRoute.value = r;
    $('[data-sheet-title]', sheet).textContent = TITLES[r];
  };
  if (sRoute) sRoute.addEventListener('change', () => setRoute(sRoute.value));
  HS.initSheet(setRoute);

  HS.ready();
})();
