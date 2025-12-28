(() => {
  'use strict';
  // 固有能力アコーディオン（モック）
  document.querySelectorAll('.acc-head').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.parentElement.querySelector('.acc-body');
      const pm = btn.querySelector('.pm');
      const open = body.hasAttribute('hidden');
      if(open){
        body.removeAttribute('hidden');
        if(pm) pm.textContent = '－';
      }else{
        body.setAttribute('hidden','');
        if(pm) pm.textContent = '＋';
      }
    });
  });
})();