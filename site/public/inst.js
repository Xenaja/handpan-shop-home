/* «Инструменты»: звук-заглушка и форма заявки. Тексты уже в HTML (собирает Astro). */
(() => {
  'use strict';
  const { $ } = HS;

  /* ---------- форма: кнопка на странице заранее выбирает «Что интересно» ---------- */
  const TITLES = {
    visit: 'Визит в студию',
    trial: 'Пробное занятие',
    buy: 'Консультация мастера',
    rent: 'Аренда инструмента',
    help: 'Поможем выбрать',
    community: 'Присоединиться к комьюнити'
  };
  const sheet = $('[data-sheet]'), sRoute = $('[data-interest]', sheet);
  const setRoute = r => {
    if (!TITLES[r]) r = 'help';
    if (sRoute) sRoute.value = r;
    $('[data-sheet-title]', sheet).textContent = TITLES[r];
    $('[data-sheet-help]', sheet).hidden = r !== 'help';
  };
  if (sRoute) sRoute.addEventListener('change', () => setRoute(sRoute.value));
  HS.initSheet(setRoute);

  /* ---------- 01: ханги укатываются вправо и выкатываются обратно, вращаясь как колесо ---------- */
  const stage = $('[data-roll]');
  if (stage && !HS.reduce && Element.prototype.animate) {
    const hangs = [...stage.querySelectorAll('.i1-hang')];
    let cur = 0, timer = null, busy = false, visible = true;
    // расстояние до правого края + запас; поворот = путь / радиус (катится без проскальзывания)
    const path = () => {
      const r = stage.getBoundingClientRect();
      const dx = innerWidth - r.left + 40;
      return { dx, deg: dx / (r.width / 2) * 180 / Math.PI };
    };
    const roll = async () => {
      if (busy || document.hidden || !visible) return;
      busy = true;
      const { dx, deg } = path(), a = hangs[cur], b = hangs[(cur + 1) % hangs.length];
      b.decode && await b.decode().catch(() => {});
      const ease = 'cubic-bezier(.55,0,.35,1)';
      await a.animate([{ transform: 'none' }, { transform: `translateX(${dx}px) rotate(${deg}deg)` }],
        { duration: 1500, easing: ease, fill: 'forwards' }).finished;
      a.classList.remove('is-on'); a.getAnimations().forEach(x => x.cancel());
      b.classList.add('is-on');
      await b.animate([{ transform: `translateX(${dx}px) rotate(${deg}deg)` }, { transform: 'none' }],
        { duration: 1700, easing: 'cubic-bezier(.2,.75,.25,1)' }).finished;
      cur = (cur + 1) % hangs.length;
      busy = false;
    };
    const start = () => { if (!timer) timer = setInterval(roll, 6500); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; visible ? start() : stop(); }), { threshold: .2 }).observe(stage);
  }

  /* ---------- 01: цифры досчитываются от нуля, когда строка появляется на экране ---------- */
  // считаем либо <span data-count="2000"> («более 2 000»), либо всю цифру в <b> («40+»)
  const facts = [...document.querySelectorAll('.i1-facts [data-count], .i1-facts b')].filter(el => el.matches('[data-count]') || !el.querySelector('[data-count]'));
  if (facts.length && !HS.reduce && 'IntersectionObserver' in window) {
    const fmt = n => n >= 1000 ? n.toLocaleString('ru-RU') : String(n);
    const items = facts.map(el => {
      if (el.dataset.count) return { el, n: +el.dataset.count, suf: '' };
      const m = el.textContent.match(/^(\d+)(.*)$/);
      return m ? { el, n: +m[1], suf: m[2] } : null;
    }).filter(Boolean);
    items.forEach(it => { it.el.textContent = '0' + it.suf; });
    const run = () => {
      const t0 = performance.now(), dur = 1600;
      const tick = now => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);   // плавное замедление в конце
        items.forEach((it, i) => {
          const q = Math.max(0, Math.min(1, (e * dur - i * 90) / (dur - i * 90)));  // лёгкий сдвиг между цифрами
          it.el.textContent = fmt(Math.round(it.n * q)) + it.suf;
        });
        if (p < 1) requestAnimationFrame(tick);
        else items.forEach(it => { it.el.textContent = fmt(it.n) + it.suf; });
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); setTimeout(run, 250); } }, { threshold: .6 });
    io.observe(document.querySelector('.i1-facts'));
  }

  HS.ready();
})();
