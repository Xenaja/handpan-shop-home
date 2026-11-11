/* Тест «Поможем определиться»: шаги, профиль посетителя, персональный первый шаг.
   Подключается на /test сразу, на главной — по кнопке (SEO-MIGRATION.md, раздел 5: тест — отдельный остров). */
(() => {
  'use strict';
  const { $, $$, goal, typo } = HS;

  function init(root) {
    if (root._quiz) return root._quiz;
    const steps = $$('[data-quiz-step]', root), results = $$('[data-quiz-res]', root);
    const bar = $('[data-quiz-bar]', root), count = $('[data-quiz-count]', root);
    const back = $('[data-quiz-back]', root), again = $('[data-quiz-again]', root);
    const LEAD = JSON.parse(root.dataset.lead);
    const N = steps.length, pad = n => String(n).padStart(2, '0');
    let cur = 0, started = false;

    function show(i) {
      cur = i;
      steps.forEach((s, k) => { s.hidden = k !== i; });
      results.forEach(r => { r.hidden = true; });
      bar.style.width = (i / N * 100) + '%';
      count.textContent = pad(i + 1) + ' / ' + pad(N);
      count.hidden = false;
      back.hidden = i === 0;
      again.hidden = true;
      const first = $('input:checked', steps[i]) || $('input', steps[i]);
      if (first && root.contains(document.activeElement)) first.focus({ preventScroll: true });
    }

    // профиль: стадия, мотивация, барьер, сообщество (ТЗ, «decision tree»)
    function profile() {
      const tags = steps.map(s => { const r = $('input:checked', s); return r ? JSON.parse(r.dataset.tags) : {}; });
      const most = key => {
        const c = {};
        tags.forEach(t => { if (t[key]) c[t[key]] = (c[t[key]] || 0) + 1; });
        return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || '';
      };
      const route = (tags.find(t => t.route) || {}).route || 'curious';
      const barrier = (tags.find(t => t.barrier) || {}).barrier || 'none';
      const cScore = tags.reduce((n, t) => n + (t.community || 0), 0);
      const community = cScore >= 3 ? 'high' : cScore >= 0 ? 'mid' : 'low';
      let result = 'trial';
      if (route === 'community' || (route === 'curious' && community === 'high')) result = 'community';
      else if (route === 'rent') result = 'rent';
      else if (route === 'buy') result = barrier === 'quit' || barrier === 'notready' ? 'rent' : 'buy';
      return { stage: most('stage') || route, motivation: most('motive'), barrier, community, route, result,
        answers: tags.map(t => t.t).join(' | ') };
    }

    function finish() {
      const p = profile();
      steps.forEach(s => { s.hidden = true; });
      bar.style.width = '100%';
      count.hidden = true;
      back.hidden = true;
      again.hidden = false;
      const res = results.find(r => r.dataset.quizRes === p.result);
      const lead = $('[data-quiz-lead]', res);
      lead.textContent = LEAD[p.route === 'curious' && p.barrier === 'none' ? 'curious' : p.barrier] || '';
      lead.hidden = !lead.textContent || p.result !== 'trial';
      typo(res);
      res.hidden = false;
      res.focus({ preventScroll: true });
      root.scrollIntoView({ block: 'nearest' });
      // профиль уходит вместе с заявкой (скрытое поле во всех формах страницы)
      const value = `stage=${p.stage}; motivation=${p.motivation}; barrier=${p.barrier}; community=${p.community}; answers=${p.answers}`;
      $$('[data-form]').forEach(f => {
        let h = $('input[name="quiz"]', f);
        if (!h) { h = document.createElement('input'); h.type = 'hidden'; h.name = 'quiz'; f.appendChild(h); }
        h.value = value;
      });
      goal('quiz_finish', { stage: p.stage, motivation: p.motivation, barrier: p.barrier, community: p.community, result: p.result });
    }

    root.addEventListener('change', e => {
      const i = steps.indexOf(e.target.closest('[data-quiz-step]'));
      if (i < 0) return;
      if (!started) { started = true; goal('quiz_start', { page: location.pathname }); }
      setTimeout(() => (i + 1 < N ? show(i + 1) : finish()), 220);
    });
    back.addEventListener('click', () => show(Math.max(0, cur - 1)));
    again.addEventListener('click', () => { $$('input', root).forEach(r => { r.checked = false; }); show(0); });
    show(0);
    root._quiz = { reset: () => again.click() };
    return root._quiz;
  }

  $$('[data-quiz]').forEach(init);
  window.Quiz = { init };
})();
