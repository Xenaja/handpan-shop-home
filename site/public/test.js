/* Страница теста: форма записи, которую открывает кнопка с результатом. */
(() => {
  'use strict';
  const { $ } = HS;
  const TITLES = { trial: 'Пробный урок', buy: 'Подбор инструмента', rent: 'Аренда инструмента', help: 'Задать вопрос', lessons: 'Подбор занятий', group: 'Подбор группы' };
  const sheet = $('[data-sheet]'), sRoute = $('[data-interest]', sheet);
  HS.initSheet(r => {
    if (!TITLES[r]) r = 'help';
    sRoute.value = HS.interest(r);
    $('[data-sheet-title]', sheet).textContent = TITLES[r];
  });
  HS.ready();
})();
