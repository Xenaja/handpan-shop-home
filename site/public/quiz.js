/* Тест «С чего начать?» (правка 21.11, до 3 вопросов): направление → формат занятий → что останавливает.
   Второй вопрос — только для знакомства и обучения; при смене первого ответа лишний выбор сбрасывается.
   Подключается на /test сразу, на главной — по кнопке (SEO-MIGRATION.md, раздел 5: тест — отдельный остров). */
(() => {
  'use strict';
  const { $, $$, goal, typo } = HS;

  function init(root) {
    if (root._quiz) return root._quiz;
    const steps = $$('[data-quiz-step]', root), results = $$('[data-quiz-res]', root);
    const bar = $('[data-quiz-bar]', root), count = $('[data-quiz-count]', root);
    const back = $('[data-quiz-back]', root), again = $('[data-quiz-again]', root);
    const DOUBTS = JSON.parse(root.dataset.doubts);
    const pad = n => String(n).padStart(2, '0');
    let cur = 0, started = false;

    const val = key => { const s = steps.find(x => x.dataset.key === key); return s ? ($('input:checked', s) || {}).value || '' : ''; };
    // шаг показывается, если у него нет условия или первый ответ в списке условия
    const active = s => !s.dataset.if || !val('dir') || s.dataset.if.split(' ').includes(val('dir'));
    const flow = () => steps.filter(active);

    function show(i) {
      cur = i;
      steps.forEach((s, k) => { s.hidden = k !== i; });
      results.forEach(r => { r.hidden = true; });
      const f = flow(), pos = f.indexOf(steps[i]);
      bar.style.width = (pos / f.length * 100) + '%';
      count.textContent = pad(pos + 1) + ' / ' + pad(f.length);
      count.hidden = false;
      back.hidden = pos === 0;
      again.hidden = true;
      const first = $('input:checked', steps[i]) || $('input', steps[i]);
      if (first && root.contains(document.activeElement)) first.focus({ preventScroll: true });
    }

    // исход: первый ответ — направление, второй — формат обучения, третий только меняет текст рекомендации
    function profile() {
      const dir = val('dir'), format = active(steps.find(s => s.dataset.key === 'format')) ? val('format') : '';
      const barrier = val('barrier') || 'none';
      let result = 'trial';
      if (dir === 'buy') result = 'buy';
      else if (dir === 'rent') result = 'rent';
      else if (format === 'group') result = 'group';
      else if (dir === 'learn') result = format === 'ind' ? 'ind' : 'format';
      const answers = flow().map(s => { const r = $('input:checked', s); return r ? r.nextElementSibling.textContent : ''; }).join(' | ');
      return { dir, format, barrier, result, answers };
    }

    function finish() {
      const p = profile();
      steps.forEach(s => { s.hidden = true; });
      bar.style.width = '100%';
      count.hidden = true;
      back.hidden = true;
      again.hidden = false;
      const res = results.find(r => r.dataset.quizRes === p.result);
      const kicker = $('[data-kicker]', res);
      kicker.textContent = (p.dir === 'try' && kicker.dataset.kickerTry) || kicker.dataset.kicker;
      const lead = $('[data-quiz-lead]', res);
      lead.textContent = (DOUBTS[p.result] || {})[p.barrier] || '';
      lead.hidden = !lead.textContent;
      typo(res);
      res.hidden = false;
      res.focus({ preventScroll: true });
      root.scrollIntoView({ block: 'nearest' });
      // ответы уходят вместе с заявкой (скрытое поле во всех формах страницы)
      const value = `dir=${p.dir}; format=${p.format || '-'}; barrier=${p.barrier}; result=${p.result}; answers=${p.answers}`;
      $$('[data-form]').forEach(f => {
        let h = $('input[name="quiz"]', f);
        if (!h) { h = document.createElement('input'); h.type = 'hidden'; h.name = 'quiz'; f.appendChild(h); }
        h.value = value;
      });
      goal('quiz_finish', { dir: p.dir, format: p.format, barrier: p.barrier, result: p.result });
    }

    root.addEventListener('change', e => {
      const step = e.target.closest('[data-quiz-step]');
      if (!step) return;
      if (!started) { started = true; goal('quiz_start', { page: location.pathname }); }
      // сменили направление — выбор в шагах, которые теперь не нужны, больше не учитываем
      if (step.dataset.key === 'dir') steps.filter(s => !active(s)).forEach(s => $$('input', s).forEach(r => { r.checked = false; }));
      const f = flow(), next = f[f.indexOf(step) + 1];
      setTimeout(() => (next ? show(steps.indexOf(next)) : finish()), 220);
    });
    back.addEventListener('click', () => {
      const f = flow(), prev = f[f.indexOf(steps[cur]) - 1];
      show(prev ? steps.indexOf(prev) : 0);
    });
    again.addEventListener('click', () => { $$('input', root).forEach(r => { r.checked = false; }); show(0); });
    show(0);
    root._quiz = { reset: () => again.click() };
    return root._quiz;
  }

  $$('[data-quiz]').forEach(init);
  window.Quiz = { init };
})();
