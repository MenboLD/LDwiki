// index.js (header is handled by common_header.js)
(function(){
  'use strict';

  function navigateTo(link){
    if(!link || link === '#') return;
    window.location.href = link;
  }

  document.addEventListener('click', (e) => {
    const card = e.target.closest?.('[data-link]');
    if(!card) return;
    e.preventDefault();
    navigateTo(card.getAttribute('data-link'));
  }, { passive: false });

  // Touch: treat a tap as click; ignore swipes.
  let touchStartX = null, touchStartY = null;
  document.addEventListener('touchstart', (e) => {
    const t = e.touches?.[0];
    if(!t) return;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const t = e.changedTouches?.[0];
    if(!t || touchStartX == null || touchStartY == null) return;
    const dx = Math.abs(t.clientX - touchStartX);
    const dy = Math.abs(t.clientY - touchStartY);
    touchStartX = touchStartY = null;
    if(dx > 12 || dy > 12) return; // swipe
    const card = e.target.closest?.('[data-link]');
    if(!card) return;
    e.preventDefault();
    navigateTo(card.getAttribute('data-link'));
  }, { passive: false });
})();
