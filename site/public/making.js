/* Экран «Как делают ханг»: петля из мастерской и полное видео в окне. С 25.11 на «Инструментах», вынесено из home.js. */
(() => {
  'use strict';
  const { $, $$, reduce } = HS;

  /* ---------- 08: видео из мастерской в окне ---------- */
  const vd = $('[data-video]');
  if (vd) {
    const v = $('video', vd);
    const close = () => { v.pause(); vd.close(); };
    // на компьютере — горизонтальное полное видео (правка 14.11), на телефоне — вертикальное
    $$('[data-video-open]').forEach(b => b.addEventListener('click', () => {
      const wideNow = matchMedia('(min-width: 1000px)').matches && v.dataset.srcWide;
      const want = wideNow ? v.dataset.srcWide : v.dataset.src;
      if (v.dataset.cur !== want) { v.dataset.cur = want; v.poster = wideNow ? v.dataset.posterWide : v.dataset.poster; v.src = want; }
      vd.classList.toggle('is-wide', !!wideNow);
      vd.showModal(); v.play().catch(() => {});
      HS.goal && HS.goal('video_play', { video: 'making' });
    }));
    $('[data-video-close]', vd).addEventListener('click', close);
    vd.addEventListener('click', e => { if (e.target === vd) close(); });
    vd.addEventListener('close', () => v.pause());
  }


  /* ---------- 08: беззвучная петля из мастерской справа (правка 14.11) ----------
     грузится и играет, только пока экран виден; при «меньше движения» — только кадр; клик — полное видео со звуком */
  const loop = $('[data-loop-src]');
  if (loop) {
    // клик по петле открывает полное видео со звуком (data-video-open на самом видео)
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) {
          if (!loop.src) { loop.defaultPlaybackRate = .7; loop.src = loop.dataset.loopSrc; }
          loop.playbackRate = .7; // медленнее — без мельтешения (правка 14.11)
          loop.play().catch(() => {});
        } else loop.pause();
      }), { threshold: .2 }).observe(loop);
    }
  }

})();
