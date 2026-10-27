/* Страница теста: форма записи, которую открывает кнопка с результатом. */
(() => {
  'use strict';
  const { $ } = HS;
  const TITLES = { visit: 'Визит в студию', trial: 'Пробное занятие', buy: 'Тест инструментов', rent: 'Аренда инструмента', help: 'Заявка' };
  const sheet = $('[data-sheet]'), sRoute = $('[data-interest]', sheet);
  HS.initSheet(r => {
    if (!TITLES[r]) r = 'help';
    sRoute.value = r;
    $('[data-sheet-title]', sheet).textContent = TITLES[r];
  });
  HS.ready();
})();
