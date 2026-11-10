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

  HS.ready();
})();
