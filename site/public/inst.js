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

  HS.ready();
})();
