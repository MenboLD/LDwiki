/* common_header_core_20251220t.js
   Shared header logic for LDwiki.
   Goals:
   - Drawer opens/closes reliably.
   - iOS IME issue workaround: password entry is NOT a direct input; it is a button + common modal.
   - Login UI hides entirely after successful login.
   - Lock UI: login button shows "ロック中" (white text, red) and remaining time is shown on pass button (B案).
   Notes:
   - This script is idempotent and safe to load multiple times.
   - Supabase config must be provided by supabase_config.js (window.LD_SUPABASE_URL / window.LD_SUPABASE_ANON_KEY).
*/
(() => {
  'use strict';

  const VERSION = '20251220t';

  // ===== Supabase config (must be provided by supabase_config.js) =====
  const SUPABASE_URL = window.LD_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.LD_SUPABASE_ANON_KEY || '';
  const supabaseReady = !!(SUPABASE_URL && SUPABASE_ANON_KEY && !String(SUPABASE_ANON_KEY).includes('PASTE_'));

  const AUTH_STORAGE_KEY = 'ld_auth_v1';
  const LOCK_PREFIX = 'ld_users_lock:';

  // Optional RPC: checks if username is registered (exact match).
  const USER_EXISTS_RPC = 'ld_user_exists';
  let userExistsRpcAvailable = true;
  const userExistsCache = new Map(); // username -> boolean
  let currentUserExists = null;      // for current input username
  let userExistsTimer = null;

  const SITE_TITLE = 'ラッキー傭兵団 攻略 wiki';
  const DRAWER_SUBTITLE = '(試験運用・作成中)';

  // Drawer should be identical on all pages (index is canonical).
  const DRAWER_GROUP_MAIN = [
    { text: 'トップページ', href: 'index.html', soon: false },
    { text: '情報掲示板', href: 'ld_board.html', soon: false },
    { text: 'ユーザーデータベース', href: 'ld_users.html', soon: false },
    { text: '攻略の手引き', href: '#', soon: true },
    { text: 'ユニットDB', href: '#', soon: true },
    { text: 'データツール', href: '#', soon: true },
  ];
  const DRAWER_GROUP_INFO = [
    { text: 'サイトについて', href: '#', soon: true },
    { text: '利用ルール', href: '#', soon: true },
    { text: '更新履歴', href: '#', soon: true },
  ];
  const DRAWER_GROUP_EDITOR = [
    { text: '編集者ログイン / ログアウト', href: '#', soon: true },
  ];

  function $(id){ return document.getElementById(id); }
  function safeTrim(v){ return (v || '').trim(); }

  function loadAuth(){
    try{
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== 'object') return null;
      return obj;
    }catch(_e){
      return null;
    }
  }

  function saveAuth(obj){
    try{
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(obj));
    }catch(_e){}
  }

  function clearAuthKeepUsername(username){
    const base = {
      loggedIn: false,
      username: username || '',
      pass: '',
      userId: null,
      level: null,
      exp: null,
      lockedUntil: 0,
      lastLoginAt: null
    };
    saveAuth(base);
  }

  function lockKeyFor(username){
    return LOCK_PREFIX + (username || '');
  }

  function getLockedUntilMs(username){
    const saved = loadAuth();
    if(saved && saved.username === username && saved.lockedUntil){
      const lu = Number(saved.lockedUntil);
      if(Number.isFinite(lu) && lu > 0) return lu;
    }
    const raw = localStorage.getItem(lockKeyFor(username));
    if(!raw) return 0;
    const n = Number(raw);
    if(!Number.isFinite(n)) return 0;
    return n;
  }

  function setLockedUntilMs(username, untilMs){
    try{ localStorage.setItem(lockKeyFor(username), String(untilMs)); }catch(_e){}
    const saved = loadAuth();
    if(saved && saved.username === username){
      saved.lockedUntil = untilMs;
      saveAuth(saved);
    }
  }

  function clearLock(username){
    try{ localStorage.removeItem(lockKeyFor(username)); }catch(_e){}
    const saved = loadAuth();
    if(saved && saved.username === username){
      saved.lockedUntil = 0;
      saveAuth(saved);
    }
  }

  function fmtRemain(ms){
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${String(s).padStart(2,'0')}秒`;
  }

  async function rpc(fn, args){
    if(!supabaseReady){
      const err = new Error('Supabase config missing');
      err.code = 'LD_SUPABASE_CONFIG_MISSING';
      throw err;
    }
    const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(args || {})
    });

    const text = await res.text();
    let data = null;
    try{ data = text ? JSON.parse(text) : null; }catch(_e){ data = null; }

    if(!res.ok){
      const msg = (data && (data.message || data.error_description)) ? (data.message || data.error_description) : `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function readBoolFromRpc(data){
    if(typeof data === 'boolean') return data;
    if(data && typeof data === 'object'){
      if(typeof data.exists === 'boolean') return data.exists;
      if(typeof data.ok === 'boolean') return data.ok;
      if(typeof data.result === 'boolean') return data.result;
    }
    return null;
  }

  // ===== Toast =====
  function ensureToast(){
    let el = document.querySelector('.ld-mini-toast');
    if(el) return el;
    el = document.createElement('div');
    el.className = 'ld-mini-toast';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  let toastTimer = null;
  function toast(msg, ms=1800){
    const el = ensureToast();
    el.textContent = msg;
    el.classList.add('visible');
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('visible'); }, ms);
  }

  function getPageName(){
    const raw = document.body?.dataset?.pageName;
    const name = safeTrim(raw);
    return name || 'トップ';
  }

  function hasAnyHeaderMarkup(){
    return !!(
      document.getElementById('topbarMenuBtn') ||
      document.getElementById('authForm') ||
      document.getElementById('drawer') ||
      document.getElementById('drawerOverlay') ||
      document.querySelector('.topbar')
    );
  }

  // ===== Common modal (shared across pages) =====
  function ensureCommonModal(){
    if(document.getElementById('ldModalOverlay')) return;

    const ov = document.createElement('div');
    ov.id = 'ldModalOverlay';
    ov.className = 'ld-modal-overlay';
    ov.innerHTML = `
      <div class="ld-modal" role="dialog" aria-modal="true" aria-labelledby="ldModalTitle">
        <div class="ld-modal-title" id="ldModalTitle">入力</div>
        <div class="ld-modal-help" id="ldModalHelp">入力して「決定」を押すと反映されます。</div>
        <textarea class="ld-modal-textarea" id="ldModalTextarea" rows="2"
          inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
        <div class="ld-modal-actions">
          <button class="ld-modal-btn" id="ldModalCancel" type="button">キャンセル</button>
          <button class="ld-modal-btn primary" id="ldModalOk" type="button">決定</button>
        </div>
      </div>
    `.trim();
    document.body.appendChild(ov);

    const ta = document.getElementById('ldModalTextarea');
    const ok = document.getElementById('ldModalOk');
    const cancel = document.getElementById('ldModalCancel');
    const title = document.getElementById('ldModalTitle');
    const help = document.getElementById('ldModalHelp');
    let commitCb = null;

    const close = () => {
      ov.classList.remove('is-open');
      commitCb = null;
    };
    const commit = () => {
      const v = ta.value ?? '';
      if(typeof commitCb === 'function') commitCb(v);
      close();
    };

    cancel.addEventListener('click', close);
    ok.addEventListener('click', commit);
    ov.addEventListener('click', (e) => { if(e.target === ov) close(); }, { passive:true });
    ta.addEventListener('keydown', (e) => {
      if(e.key === 'Escape'){ e.preventDefault(); close(); }
      if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); commit(); }
    });

    window.LD_openTextModal = (opts={}) => {
      const { modalTitle='入力', modalHelp='', initialValue='', onCommit=null } = opts;
      title.textContent = modalTitle;
      help.textContent = modalHelp || '入力して「決定」を押すと反映されます。';
      ta.value = initialValue || '';
      commitCb = onCommit;
      ov.classList.add('is-open');
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }, 0);
    };
  }

  // ===== Header / Drawer inject =====
  function injectHeader(){
    // Do NOT inject if the page already provides header/drawer markup.
    if(hasAnyHeaderMarkup()) return;

    document.documentElement.classList.add('ld-common-header-enabled');

    const topbar = document.createElement('div');
    topbar.className = 'topbar';
    topbar.id = 'ldCommonTopbar';
    topbar.setAttribute('role', 'banner');

    topbar.innerHTML = `
      <div class="topbar-row topbar-row--primary">
        <div class="topbar-title">${SITE_TITLE}</div>
        <div class="topbar-page" id="topbarPageName"></div>
        <button class="topbar-menu-btn" id="topbarMenuBtn" type="button" aria-label="メニューを開閉">☰</button>
      </div>

      <form class="topbar-row topbar-row--auth" id="authForm" aria-label="ログイン操作" autocomplete="on">
        <div class="topbar-auth-label" id="topbarAuthLabel">未ログイン：</div>

        <label class="topbar-auth-field" aria-label="ユーザー名">
          <input id="authUserName" type="text" inputmode="text" autocomplete="username" placeholder="ユーザー名(任意)" />
        </label>

        <label class="topbar-auth-field" aria-label="パス">
          <input id="authPass" type="hidden" autocomplete="current-password" />
          <button id="authPassBtn" type="button" class="topbar-auth-passbtn" aria-label="パス入力">ゲスト状態</button>
          <div class="topbar-auth-ghost" id="authGhost">ゲスト状態</div>
        </label>

        <button class="topbar-auth-btn" id="authLoginBtn" type="button">ログイン</button>

        <div class="topbar-auth-state" id="authStateWrap" data-visible="0">
          <span class="topbar-auth-state-text" id="authStateText">ログイン中: -</span>
          <button class="topbar-auth-logout" id="authLogoutBtn" type="button">ログアウト</button>
        </div>
      </form>
    `.trim();

    const drawer = document.createElement('nav');
    drawer.className = 'drawer';
    drawer.id = 'drawer';
    drawer.setAttribute('aria-label', 'サイトメニュー');
    drawer.innerHTML = `
      <div class="drawer-header">
        <p class="drawer-title">${SITE_TITLE}</p>
        <p class="drawer-subtitle">${DRAWER_SUBTITLE}</p>
      </div>
      <div class="drawer-close-row">
        <button class="drawer-close-button" type="button" id="drawerCloseBtn">閉じる ◀</button>
      </div>
      <div class="drawer-body">
        <ul class="drawer-nav" id="drawerNavRoot"></ul>
      </div>
      <div class="drawer-footer">
        編集メニューや子ツリー（攻略・ユニットDB・データツール）は、後日ここから展開予定。
      </div>
    `.trim();

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.id = 'drawerOverlay';

    document.body.insertBefore(topbar, document.body.firstChild);
    document.body.insertBefore(drawer, topbar.nextSibling);
    document.body.insertBefore(overlay, drawer.nextSibling);

    const elPage = $('topbarPageName');
    if(elPage) elPage.textContent = `> ${getPageName()}`;

    // build drawer nav (canonical)
    ensureDrawerNavCanonical();

    // measure topbar height -> css var
    requestAnimationFrame(() => {
      const h = topbar.getBoundingClientRect().height || 112;
      document.documentElement.style.setProperty('--ld-topbar-h', `${Math.ceil(h)}px`);
    });
  }

  function ensureDrawerNavCanonical(){
    const nav = document.querySelector('.drawer-nav');
    if(!nav) return;

    const li = (text, href, soon) => {
      const cls = `drawer-link${soon ? ' drawer-link--soon' : ''}`;
      const soonAttr = soon ? ' data-soon="1"' : '';
      return `<li class="drawer-nav-item"><a href="${href}" class="${cls}"${soonAttr}>${text}</a></li>`;
    };

    const sep = '<li class="drawer-group-separator"></li>';

    const html = [
      ...DRAWER_GROUP_MAIN.map(i => li(i.text, i.href, !!i.soon)),
      sep,
      ...DRAWER_GROUP_INFO.map(i => li(i.text, i.href, !!i.soon)),
      sep,
      ...DRAWER_GROUP_EDITOR.map(i => li(i.text, i.href, !!i.soon)),
    ].join('');

    // Only rewrite when different, to reduce DOM churn.
    const current = nav.innerHTML.replace(/\s+/g,' ').trim();
    const next = html.replace(/\s+/g,' ').trim();
    if(current !== next) nav.innerHTML = html;
  }

  function normalizeExistingHeader(){
    document.documentElement.classList.add('ld-common-header-enabled');

    const elPage = $('topbarPageName');
    if(elPage) elPage.textContent = `> ${getPageName()}`;

    ensureDrawerNavCanonical();
    ensurePassButtonMode();

    const topbar = document.querySelector('.topbar');
    if(topbar){
      requestAnimationFrame(() => {
        const h = topbar.getBoundingClientRect().height || 112;
        document.documentElement.style.setProperty('--ld-topbar-h', `${Math.ceil(h)}px`);
      });
    }
  }

  // ===== Pass input -> button mode (for iOS IME stability) =====
  function ensurePassButtonMode(){
    const elPass = $('authPass');
    if(!elPass) return;

    // Force a hidden storage input.
    elPass.setAttribute('type', 'hidden');
    elPass.setAttribute('autocomplete', 'current-password');

    let btn = $('authPassBtn');
    if(!btn){
      // Try to locate the pass field container and append the button.
      const wrap = elPass.closest('.topbar-auth-field') || elPass.parentElement;
      btn = document.createElement('button');
      btn.id = 'authPassBtn';
      btn.type = 'button';
      btn.className = 'topbar-auth-passbtn';
      btn.setAttribute('aria-label', 'パス入力');
      btn.textContent = 'ゲスト状態';
      if(wrap){
        elPass.insertAdjacentElement('afterend', btn);
      }
    }

    // The ghost element caused "background text remains" regressions. Keep it hidden by CSS.
    const ghost = $('authGhost');
    if(ghost){
      ghost.setAttribute('aria-hidden', 'true');
    }
  }

  function setupDrawer(){
    const btn = $('topbarMenuBtn');
    const drawer = $('drawer');
    const overlay = $('drawerOverlay');
    const closeBtn = $('drawerCloseBtn');
    if(!drawer || !overlay || !btn || !closeBtn) return;
    if(btn.dataset && btn.dataset.boundDrawer === '1') return;
    if(btn.dataset) btn.dataset.boundDrawer = '1';

    function open(){
      drawer.classList.add('open');
      overlay.classList.add('visible');
    }
    function close(){
      drawer.classList.remove('open');
      overlay.classList.remove('visible');
    }
    function toggle(){
      if(drawer.classList.contains('open')) close();
      else open();
    }

    btn.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
    overlay.addEventListener('click', () => close());
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') close(); });

    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => close()));
  }

  function setupSoonLinks(){
    const root = document.documentElement;
    if(root.dataset && root.dataset.ldSoonBound === '1') return;
    if(root.dataset) root.dataset.ldSoonBound = '1';

    document.addEventListener('click', (e) => {
      const a = e.target?.closest?.('a[data-soon="1"]');
      if(!a) return;
      e.preventDefault();
      toast('準備中です', 1200);
    }, { passive: false });
  }

  // ===== Auth UI =====
  function setLoggedInUI(username){
    const elLabel = $('topbarAuthLabel');
    const elUser = $('authUserName');
    const elPass = $('authPass');
    const elLoginBtn = $('authLoginBtn');
    const elStateWrap = $('authStateWrap');
    const elStateText = $('authStateText');

    if(elLabel) elLabel.style.display = 'none';
    if(elUser && elUser.parentElement) elUser.parentElement.style.display = 'none';
    if(elPass){
      const passWrap = elPass.closest('.topbar-auth-field') || elPass.parentElement;
      if(passWrap) passWrap.style.display = 'none';
    }
    if(elLoginBtn) elLoginBtn.style.display = 'none';

    if(elStateText) elStateText.textContent = `ログイン中: ${username}`;
    if(elStateWrap){
      elStateWrap.dataset.visible = '1';
      elStateWrap.style.display = 'flex';
    }
  }

  function setLoggedOutUI(){
    const elLabel = $('topbarAuthLabel');
    const elUser = $('authUserName');
    const elPass = $('authPass');
    const elLoginBtn = $('authLoginBtn');
    const elStateWrap = $('authStateWrap');

    if(elLabel){
      elLabel.style.display = '';
      elLabel.textContent = window.matchMedia('(max-width: 380px)').matches ? '未:' : '未ログイン：';
    }
    if(elUser && elUser.parentElement) elUser.parentElement.style.display = '';
    if(elPass){
      const passWrap = elPass.closest('.topbar-auth-field') || elPass.parentElement;
      if(passWrap) passWrap.style.display = '';
    }
    if(elLoginBtn) elLoginBtn.style.display = '';
    if(elStateWrap){
      elStateWrap.dataset.visible = '0';
      elStateWrap.style.display = 'none';
    }
  }

  let lockTicker = null;
  function ensureLockTicker(){
    if(lockTicker) return;
    lockTicker = setInterval(() => {
      const elUser = $('authUserName');
      const user = safeTrim(elUser ? elUser.value : '');
      if(!user){
        clearInterval(lockTicker);
        lockTicker = null;
        return;
      }
      const until = getLockedUntilMs(user);
      if(!until || until <= Date.now()){
        clearInterval(lockTicker);
        lockTicker = null;
        clearLock(user);
      }
      updateAuthControls();
    }, 1000);
  }

  function setLoginBtnLocked(elLoginBtn, locked){
    if(!elLoginBtn) return;
    if(locked){
      elLoginBtn.classList.add('is-locked');
      elLoginBtn.textContent = 'ロック中';
      elLoginBtn.disabled = true;
    }else{
      elLoginBtn.classList.remove('is-locked');
      elLoginBtn.textContent = 'ログイン';
      // disabled will be set by updateAuthControls depending on state
    }
  }

  function scheduleUserExistsCheck(){
    const elUser = $('authUserName');
    if(!elUser) return;

    const name = safeTrim(elUser.value);
    currentUserExists = null;

    if(!supabaseReady){
      userExistsRpcAvailable = false;
      updateAuthControls();
      return;
    }

    if(!userExistsRpcAvailable || !name){
      if(userExistsTimer){
        clearTimeout(userExistsTimer);
        userExistsTimer = null;
      }
      updateAuthControls();
      return;
    }

    if(userExistsCache.has(name)){
      currentUserExists = userExistsCache.get(name);
      updateAuthControls();
      return;
    }

    if(userExistsTimer) clearTimeout(userExistsTimer);
    userExistsTimer = setTimeout(async () => {
      const latestName = safeTrim(($('authUserName') && $('authUserName').value) || '');
      if(!latestName) return;

      if(userExistsCache.has(latestName)){
        currentUserExists = userExistsCache.get(latestName);
        updateAuthControls();
        return;
      }

      try{
        const data = await rpc(USER_EXISTS_RPC, { p_username: latestName });
        const b = readBoolFromRpc(data);
        if(b === null) throw new Error('Invalid ld_user_exists response');
        userExistsCache.set(latestName, b);

        const nowName = safeTrim(($('authUserName') && $('authUserName').value) || '');
        if(nowName === latestName){
          currentUserExists = b;
          updateAuthControls();
        }
      }catch(err){
        console.warn('[ldwiki] USER_EXISTS_RPC unavailable -> fallback', err);
        userExistsRpcAvailable = false;
        currentUserExists = null;
        updateAuthControls();
      }
    }, 220);
  }

  function updateAuthControls(){
    const elUser = $('authUserName');
    const elPass = $('authPass');
    const elPassBtn = $('authPassBtn');
    const elLoginBtn = $('authLoginBtn');
    if(!elUser || !elPass || !elPassBtn || !elLoginBtn) return;

    // Pass field wrapper (for CSS state classes)
    const passField = elPass.closest('.topbar-auth-field') || elPass.parentElement;
    const setPassFieldState = (state) => {
      if(!passField) return;
      passField.classList.remove('is-guest', 'is-needpass', 'is-locked');
      if(state) passField.classList.add(state);
    };

    const user = safeTrim(elUser.value);
    const pass = (elPass.value ?? '');

    // Default: not locked
    setLoginBtnLocked(elLoginBtn, false);

    // State A: username empty -> guest, pass disabled
    if(!user){
      elPass.value = '';
      setPassFieldState('is-guest');
      elPassBtn.disabled = true;
      elPassBtn.textContent = 'ゲスト状態';
      elLoginBtn.disabled = true;
      return;
    }

    // Lock check
    let untilMs = getLockedUntilMs(user);
    const now = Date.now();
    if(untilMs && untilMs <= now){
      // clear expired lock
      clearLock(user);
      untilMs = 0;
    }
    const isLocked = (untilMs > now);

    if(isLocked){
      setPassFieldState('is-locked');
      setLoginBtnLocked(elLoginBtn, true);
      elPassBtn.disabled = true;
      elPassBtn.textContent = `ロック中（残り ${fmtRemain(untilMs - now)}）`;
      ensureLockTicker();
      return;
    }

    // If Supabase config missing: disable login, but keep UI safe.
    if(!supabaseReady){
      setPassFieldState(null);
      elPassBtn.disabled = false;
      elPassBtn.textContent = pass ? pass : '要パス';
      elLoginBtn.disabled = true;
      return;
    }

    // When USER_EXISTS RPC is available:
    // - unregistered -> guest (pass disabled)
    // - registered -> need pass until pass exists
    // When not available -> fallback: allow pass for any username
    if(userExistsRpcAvailable){
      if(currentUserExists === false){
        elPass.value = '';
        setPassFieldState('is-guest');
        elPassBtn.disabled = true;
        elPassBtn.textContent = 'ゲスト状態';
        elLoginBtn.disabled = true;
        return;
      }

      // Known registered
      if(currentUserExists === true){
        elPassBtn.disabled = false;
        if(!pass){
          setPassFieldState('is-needpass');
          elPassBtn.textContent = '要パス';
          elLoginBtn.disabled = true;
          return;
        }
        setPassFieldState(null);
        elPassBtn.textContent = pass;
        elLoginBtn.disabled = false;
        return;
      }

      // Unknown (checking): allow pass entry but keep login disabled until pass exists
      setPassFieldState(null);
      elPassBtn.disabled = false;
      elPassBtn.textContent = pass ? pass : '要パス';
      elLoginBtn.disabled = !pass;
      return;
    }

    // Fallback mode (no ld_user_exists): allow pass for any username
    setPassFieldState(null);
    elPassBtn.disabled = false;
    elPassBtn.textContent = pass ? pass : '要パス';
    elLoginBtn.disabled = !pass;
  }

  function bindPassButton(){
    const elPassBtn = $('authPassBtn');
    const elPass = $('authPass');
    if(!elPassBtn || !elPass) return;

    if(elPassBtn.dataset && elPassBtn.dataset.boundPassBtn === '1') return;
    if(elPassBtn.dataset) elPassBtn.dataset.boundPassBtn = '1';

    elPassBtn.addEventListener('click', (e) => {
      e.preventDefault();

      if(elPassBtn.disabled) return;
      if(typeof window.LD_openTextModal !== 'function'){
        toast('モーダル初期化に失敗しました', 1600);
        return;
      }

      window.LD_openTextModal({
        modalTitle: 'パス入力',
        modalHelp: '全角OK（iOS対策）。入力して「決定」を押してください。',
        initialValue: elPass.value || '',
        onCommit: (v) => {
          elPass.value = String(v ?? '');
          updateAuthControls();
        }
      });
    });
  }

  function dispatchAuthChanged(auth){
    window.dispatchEvent(new CustomEvent('ld-auth-changed', { detail: auth }));
  }

  async function handleLogin(){
    const elUser = $('authUserName');
    const elPass = $('authPass');
    const elLoginBtn = $('authLoginBtn');
    if(!elUser || !elPass || !elLoginBtn) return;

    if(!supabaseReady){
      toast('Supabase設定が未反映です（supabase_config.js）', 2400);
      return;
    }

    const username = safeTrim(elUser.value);
    const pass = safeTrim(elPass.value);

    if(!username){
      toast('ユーザー名を入力してください');
      updateAuthControls();
      return;
    }

    // If username is not registered, keep guest mode (pass disabled)
    if(userExistsRpcAvailable && currentUserExists === false){
      toast('このユーザー名は未登録のためログインできません', 2200);
      updateAuthControls();
      return;
    }

    if(!pass){
      toast('パスを入力してください');
      updateAuthControls();
      return;
    }

    const untilMs = getLockedUntilMs(username);
    if(untilMs > Date.now()){
      toast(`ロック中（残り ${fmtRemain(untilMs - Date.now())}）`, 2200);
      updateAuthControls();
      return;
    }

    try{
      const result = await rpc('ld_login', { p_username: username, p_pass: pass });

      if(result && result.ok === true){
        const user = result.user || {};
        const auth = {
          loggedIn: true,
          username,
          pass,
          userId: user.id || null,
          level: (user.level ?? null),
          exp: (user.exp ?? null),
          lockedUntil: 0,
          lastLoginAt: new Date().toISOString()
        };
        saveAuth(auth);
        clearLock(username);
        setLoggedInUI(username);
        dispatchAuthChanged(auth);
        toast('ログインしました', 1200);
        return;
      }

      const lockedUntilRaw = (result && result.locked_until) ? String(result.locked_until) : '';
      const lockedUntilMs = lockedUntilRaw ? Date.parse(lockedUntilRaw) : 0;
      const isLocking = Number.isFinite(lockedUntilMs) && lockedUntilMs > Date.now();

      if(isLocking){
        setLockedUntilMs(username, lockedUntilMs);
      }else{
        clearLock(username);
      }

      // clear pass (keeps username)
      elPass.value = '';
      updateAuthControls();

      if(isLocking){
        toast(`認証に失敗しました。ロック中（残り ${fmtRemain(lockedUntilMs - Date.now())}）`, 2600);
      }else{
        toast('認証に失敗しました。', 1800);
      }

      const saved = loadAuth() || {};
      saveAuth({
        loggedIn: false,
        username,
        pass: '',
        userId: null,
        level: null,
        exp: null,
        lockedUntil: (isLocking ? lockedUntilMs : 0),
        lastLoginAt: saved.lastLoginAt || null
      });
      dispatchAuthChanged(loadAuth());
    }catch(err){
      console.error(err);
      toast('ログイン処理に失敗しました', 2200);
    }
  }

  function handleLogout(){
    const elUser = $('authUserName');
    const username = safeTrim(elUser ? elUser.value : '');
    clearAuthKeepUsername(username);
    setLoggedOutUI();
    const elPass = $('authPass');
    if(elPass) elPass.value = '';
    updateAuthControls();
    dispatchAuthChanged(loadAuth());
    toast('ログアウトしました', 1200);
  }

  function setupAuth(){
    const elUser = $('authUserName');
    const elPass = $('authPass');
    const elPassBtn = $('authPassBtn');
    const elLoginBtn = $('authLoginBtn');
    const elLogoutBtn = $('authLogoutBtn');
    if(!elUser || !elPass || !elPassBtn || !elLoginBtn || !elLogoutBtn) return;

    if(elLoginBtn.dataset && elLoginBtn.dataset.boundAuth === '1') return;
    if(elLoginBtn.dataset) elLoginBtn.dataset.boundAuth = '1';

    const elForm = $('authForm');
    if(elForm && (!elForm.dataset || elForm.dataset.boundSubmit !== '1')){
      if(elForm.dataset) elForm.dataset.boundSubmit = '1';
      elForm.addEventListener('submit', (e) => { e.preventDefault(); });
    }

    elUser.addEventListener('input', () => { scheduleUserExistsCheck(); updateAuthControls(); });
    elLoginBtn.addEventListener('click', (e) => { e.preventDefault(); handleLogin(); });
    elLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });

    bindPassButton();

    // restore
    const saved = loadAuth();
    if(saved && saved.loggedIn && saved.username && saved.pass){
      elUser.value = saved.username;
      elPass.value = saved.pass;

      const untilMs = getLockedUntilMs(saved.username);
      if(untilMs > Date.now()){
        // lock -> do not auto-login
        elPass.value = '';
        setLoggedOutUI();
        scheduleUserExistsCheck();
        updateAuthControls();
        toast('ロック中', 1200);
        return;
      }

      if(!supabaseReady){
        // cannot verify now
        elPass.value = '';
        setLoggedOutUI();
        scheduleUserExistsCheck();
        updateAuthControls();
        clearAuthKeepUsername(saved.username);
        dispatchAuthChanged(loadAuth());
        return;
      }

      // Verify via RPC
      rpc('ld_login', { p_username: saved.username, p_pass: saved.pass })
        .then(result => {
          if(result && result.ok === true){
            const user = result.user || {};
            const auth = {
              ...saved,
              loggedIn: true,
              userId: user.id || saved.userId || null,
              level: (user.level ?? saved.level ?? null),
              exp: (user.exp ?? saved.exp ?? null),
              lockedUntil: 0,
              lastLoginAt: new Date().toISOString()
            };
            saveAuth(auth);
            setLoggedInUI(saved.username);
            dispatchAuthChanged(auth);
          }else{
            elPass.value = '';
            setLoggedOutUI();
            scheduleUserExistsCheck();
            updateAuthControls();
            clearAuthKeepUsername(saved.username);
            dispatchAuthChanged(loadAuth());
          }
        })
        .catch(_e => {
          elPass.value = '';
          setLoggedOutUI();
          scheduleUserExistsCheck();
          updateAuthControls();
          clearAuthKeepUsername(saved.username);
          dispatchAuthChanged(loadAuth());
        });

      return;
    }

    // default state
    setLoggedOutUI();
    scheduleUserExistsCheck();
    updateAuthControls();

    window.addEventListener('resize', () => {
      const l = $('topbarAuthLabel');
      if(!l) return;
      if(l.style.display === 'none') return;
      l.textContent = window.matchMedia('(max-width: 380px)').matches ? '未:' : '未ログイン：';
    });
  }

  function boot(){
    if(!document.body) return;
    console.log(`[ldwiki] common_header loaded (${VERSION})`, { supabaseReady });

    injectHeader();
    ensureCommonModal();
    normalizeExistingHeader();
    setupDrawer();
    setupSoonLinks();
    setupAuth();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }else{
    boot();
  }
})();
