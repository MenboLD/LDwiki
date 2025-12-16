const drawer = document.getElementById('drawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const topbarMenuBtn = document.getElementById('topbarMenuBtn');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');

    function openDrawer() {
      drawer.classList.add('open');
      drawerOverlay.classList.add('visible');
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      drawerOverlay.classList.remove('visible');
    }

    function toggleDrawer() {
      if (drawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    }

    topbarMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDrawer();
    });

    drawerCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
    });

    drawerOverlay.addEventListener('click', () => {
      closeDrawer();
    });

    // カテゴリカードクリックで data-link に遷移（今は #）
    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const link = card.getAttribute('data-link') || '#';
        window.location.href = link;
      });
    });

    // シンプルなスワイプ検出（モバイル用）
    let touchStartX = null;
    let touchStartY = null;

    function onTouchStart(e) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }

    function onTouchEnd(e) {
      if (touchStartX === null || touchStartY === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // 横方向のスワイプが明確なときだけ処理
      if (absDx > 40 && absDx > absDy) {
        if (!drawer.classList.contains('open')) {
          // 画面左端付近から右へのスワイプで開く
          if (touchStartX < 24 && dx > 0) {
            openDrawer();
          }
        } else {
          // ドロワーが開いているときは左スワイプで閉じる
          if (dx < 0) {
            closeDrawer();
          }
        }
      }

      touchStartX = null;
      touchStartY = null;
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

/* ===== Topbar Auth (state machine) =====
   仕様:
   - 状態A: user空 -> pass disabled + gray + ghost「ゲスト状態」, login disabled
   - 状態B: user入力あり & pass空 -> pass enabled + ghost「ゲスト状態」, login disabled
   - 状態B2: user入力あり & pass入力あり -> login enabled
   - 状態C: login成功 -> inputs readonly, ログイン中表示 + ログアウト表示, 再訪で自動復帰
   ※ indexではSupabase連携はまだ。入力された user/pass を「使用中」として保持するところまで先行実装。
*/

const AUTH_LS_KEY = 'ld_auth_v1';
const AUTH_LOCK_KEY = (u) => `ld_auth_lock_v1:${u || ''}`;

const elPageName = document.getElementById('topbarPageName');
const elAuthForm = document.getElementById('authForm');
const elUser = document.getElementById('authUserName');
const elPass = document.getElementById('authPass');
const elGhost = document.getElementById('authGhost');
const elLoginBtn = document.getElementById('authLoginBtn');
const elStateWrap = document.getElementById('authStateWrap');
const elStateText = document.getElementById('authStateText');
const elLogoutBtn = document.getElementById('authLogoutBtn');

function safeTrim(s){ return (s || '').trim(); }

function loadAuth(){
  try{
    const raw = localStorage.getItem(AUTH_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(_){ return null; }
}
function saveAuth(obj){
  try{ localStorage.setItem(AUTH_LS_KEY, JSON.stringify(obj)); }catch(_){}
}
function getLockUntil(username){
  try{
    const raw = localStorage.getItem(AUTH_LOCK_KEY(username));
    return raw ? Number(raw) : 0;
  }catch(_){ return 0; }
}
function isLocked(username){
  const until = getLockUntil(username);
  return !!until && Date.now() < until;
}
function setReadonlyLoggedIn(on){
  if(on){
    elUser.setAttribute('readonly','readonly');
    elPass.setAttribute('readonly','readonly');
  }else{
    elUser.removeAttribute('readonly');
    elPass.removeAttribute('readonly');
  }
}
function setLoggedInUI(username){
  elAuthForm.classList.add('is-logged-in');
  elStateWrap.style.display = 'inline-flex';
  elStateWrap.dataset.loggedIn = '1';
  elStateText.textContent = `ログイン中: ${username}`;
  setReadonlyLoggedIn(true);
  elLoginBtn.disabled = true;
}
function setLoggedOutUI(){
  elAuthForm.classList.remove('is-logged-in');
  elStateWrap.style.display = 'none';
  elStateWrap.dataset.loggedIn = '0';
  setReadonlyLoggedIn(false);
}
function showMiniStatus(msg){
  elPageName.textContent = msg;
  setTimeout(()=>{ elPageName.textContent = 'トップ'; }, 2200);
}

function updateAuthControls(){
  const user = safeTrim(elUser.value);
  const pass = safeTrim(elPass.value);
  const loggedIn = elStateWrap.dataset.loggedIn === '1';

  // ghost（パスが空なら常に表示）
  if(pass.length === 0){
    elGhost.style.display = 'block';
    elGhost.textContent = 'ゲスト状態';
  }else{
    elGhost.style.display = 'none';
  }

  // user空なら pass 無効＆灰色
  if(user.length === 0){
    elPass.disabled = true;
    elPass.style.background = 'rgba(255,255,255,0.05)';
    elLoginBtn.disabled = true;
    elLoginBtn.style.opacity = '0.45';
    return;
  }

  // userありなら pass 有効＆通常色
  elPass.disabled = false;
  elPass.style.background = 'rgba(255,255,255,0.08)';

  // ログイン中は readonly なのでここまで来ない想定だが保険
  if(loggedIn){
    elLoginBtn.disabled = true;
    elLoginBtn.style.opacity = '0.45';
    return;
  }

  // user & pass 両方あり、かつロック中でない -> login 有効
  const locked = isLocked(user);
  const canLogin = (pass.length > 0 && !locked);
  elLoginBtn.disabled = !canLogin;
  elLoginBtn.style.opacity = canLogin ? '1' : '0.45';
}

(function initAuth(){
  elStateWrap.dataset.loggedIn = '0';
  const saved = loadAuth();
  if(saved && saved.loggedIn && typeof saved.username === 'string' && typeof saved.pass === 'string'){
    elUser.value = saved.username;
    elPass.value = saved.pass;
    if(isLocked(saved.username)){
      // ロック中は自動復帰しない
      elPass.value = '';
      setLoggedOutUI();
      showMiniStatus('ロック中');
      updateAuthControls();
      return;
    }
    setLoggedInUI(saved.username);
    return;
  }

  // 初回
  elUser.value = '';
  elPass.value = '';
  setLoggedOutUI();
  updateAuthControls();
})();


// Enterキーでログイン（form submit）
elAuthForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if(!elLoginBtn.disabled){
    elLoginBtn.click();
  }
});

elUser.addEventListener('input', () => {
  updateAuthControls();
});

elPass.addEventListener('input', () => {
  updateAuthControls();
});

elLoginBtn.addEventListener('click', () => {
  const user = safeTrim(elUser.value);
  const pass = safeTrim(elPass.value);

  if(user.length === 0 || pass.length === 0) return;

  if(isLocked(user)){
    showMiniStatus('ロック中');
    updateAuthControls();
    return;
  }

  // TODO: 共通ヘッダー化時に Supabase 認証を接続し、失敗時は mis_input_count +1 と 3分ロック
  setLoggedInUI(user);
  saveAuth({ loggedIn: true, username: user, pass: pass });
});

elLogoutBtn.addEventListener('click', () => {
  const user = safeTrim(elUser.value);
  const pass = safeTrim(elPass.value);
  setLoggedOutUI();
  // 保存は残すが loggedIn を落とす（再ログインはボタン押下）
  saveAuth({ loggedIn: false, username: user, pass: pass });
  updateAuthControls();
});
