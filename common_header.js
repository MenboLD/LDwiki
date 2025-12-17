/* common_header.js
   Injects shared header + drawer, handles auth state (RPC-based).
*/
(() => {
  'use strict';

  const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

  const AUTH_STORAGE_KEY = "ld_auth_v1";
  const LOCK_PREFIX = "ld_users_lock:";

  const SITE_TITLE = "ラッキー傭兵団 攻略 wiki";
  const DRAWER_SUBTITLE = "(試験運用・作成中)";

  function $(id){ return document.getElementById(id); }
  function safeTrim(v){ return (v || "").trim(); }

  function loadAuth(){
    try{
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return null;
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
      username: username || "",
      pass: "",
      userId: null,
      level: null,
      exp: null,
      lockedUntil: 0,
      lastLoginAt: null
    };
    saveAuth(base);
  }

  function lockKeyFor(username){
    return LOCK_PREFIX + (username || "");
  }

  function getLockedUntilMs(username){
    // Prefer common-format lockedUntil if present, else per-user lock key.
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
    localStorage.setItem(lockKeyFor(username), String(untilMs));
    const saved = loadAuth();
    if(saved && saved.username === username){
      saved.lockedUntil = untilMs;
      saveAuth(saved);
    }
  }

  function clearLock(username){
    localStorage.removeItem(lockKeyFor(username));
    const saved = loadAuth();
    if(saved && saved.username === username){
      saved.lockedUntil = 0;
      saveAuth(saved);
    }
  }

  function fmtRemain(ms){
    const sec = Math.max(0, Math.ceil(ms/1000));
    const m = Math.floor(sec/60);
    const s = sec % 60;
    return `${m}分${String(s).padStart(2,"0")}秒`;
  }

  async function rpc(fn, args){
    const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
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

  function dispatchAuthChanged(auth){
    window.dispatchEvent(new CustomEvent("ld-auth-changed", { detail: auth }));
  }

  function ensureToast(){
    let el = document.querySelector(".ld-mini-toast");
    if(el) return el;
    el = document.createElement("div");
    el.className = "ld-mini-toast";
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
  }

  let toastTimer = null;
  function toast(msg, ms=1800){
    const el = ensureToast();
    el.textContent = msg;
    el.classList.add("visible");
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove("visible"); }, ms);
  }

  function getPageName(){
    const raw = document.body?.dataset?.pageName;
    const name = safeTrim(raw);
    return name || "トップ";
  }

  function injectHeader(){
    if(document.getElementById("ldCommonTopbar")) return;

    document.documentElement.classList.add("ld-common-header-enabled");

    const topbar = document.createElement("div");
    topbar.className = "topbar";
    topbar.id = "ldCommonTopbar";
    topbar.setAttribute("role", "banner");

    topbar.innerHTML = `
      <div class="topbar-row topbar-row--primary">
        <div class="topbar-title">${SITE_TITLE}</div>
        <div class="topbar-page" id="topbarPageName"></div>
        <button class="topbar-menu-btn" id="topbarMenuBtn" type="button" aria-label="メニューを開閉">☰</button>
      </div>

      <form class="topbar-row topbar-row--auth" id="authForm" aria-label="ログイン操作" autocomplete="on">
        <div class="topbar-auth-label" id="topbarAuthLabel">未ログイン：</div>

        <label class="topbar-auth-field" aria-label="ユーザー名">
          <input id="authUserName" type="text" inputmode="text" autocomplete="username" placeholder="ユーザー名" />
        </label>

        <label class="topbar-auth-field" aria-label="パス">
          <input id="authPass" type="password" autocomplete="current-password" placeholder="" />
          <div class="topbar-auth-ghost" id="authGhost">ゲスト状態</div>
        </label>

        <button class="topbar-auth-btn" id="authLoginBtn" type="button">ログイン</button>

        <div class="topbar-auth-state" id="authStateWrap" data-visible="0">
          <span class="topbar-auth-state-text" id="authStateText">ログイン中: -</span>
          <button class="topbar-auth-logout" id="authLogoutBtn" type="button">ログアウト</button>
        </div>
      </form>
    `.trim();

    // Drawer + overlay
    const drawer = document.createElement("nav");
    drawer.className = "drawer";
    drawer.id = "drawer";
    drawer.setAttribute("aria-label", "サイトメニュー");
    drawer.innerHTML = `
      <div class="drawer-header">
        <p class="drawer-title">${SITE_TITLE}</p>
        <p class="drawer-subtitle">${DRAWER_SUBTITLE}</p>
      </div>
      <div class="drawer-close-row">
        <button class="drawer-close-button" type="button" id="drawerCloseBtn">閉じる ◀</button>
      </div>
      <div class="drawer-body">
        <ul class="drawer-nav">
          <li><a class="drawer-link" href="index.html">トップページ</a></li>
          <li><a class="drawer-link" href="ld_board.html">情報掲示板</a></li>
          <li><a class="drawer-link" href="ld_users.html">ユーザーデータ</a></li>
        </ul>
      </div>
      <div class="drawer-footer">
        編集メニューや子ツリー（攻略・ユニットDB・データツール）は、後日ここから展開予定。
      </div>
    `.trim();

    const overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    overlay.id = "drawerOverlay";

    // Insert at top of body
    document.body.insertBefore(overlay, document.body.firstChild);
    document.body.insertBefore(drawer, overlay.nextSibling);
    document.body.insertBefore(topbar, drawer.nextSibling);

    // page name
    const elPage = $("topbarPageName");
    if(elPage) elPage.textContent = `> ${getPageName()}`;

    // measure topbar height -> css var
    requestAnimationFrame(() => {
      const h = topbar.getBoundingClientRect().height || 112;
      document.documentElement.style.setProperty("--ld-topbar-h", `${Math.ceil(h)}px`);
    });
  }

  function setupDrawer(){
    const drawer = $("drawer");
    const overlay = $("drawerOverlay");
    const btn = $("topbarMenuBtn");
    const closeBtn = $("drawerCloseBtn");
    if(!drawer || !overlay || !btn || !closeBtn) return;

    function open(){
      drawer.classList.add("open");
      overlay.classList.add("visible");
    }
    function close(){
      drawer.classList.remove("open");
      overlay.classList.remove("visible");
    }
    function toggle(){
      if(drawer.classList.contains("open")) close();
      else open();
    }

    btn.addEventListener("click", (e) => { e.preventDefault(); toggle(); });
    closeBtn.addEventListener("click", (e) => { e.preventDefault(); close(); });
    overlay.addEventListener("click", () => close());
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") close();
    });

    // close drawer when clicking a link
    drawer.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => close());
    });
  }

  function setLoggedInUI(username){
    const elLabel = $("topbarAuthLabel");
    const elUser = $("authUserName");
    const elPass = $("authPass");
    const elGhost = $("authGhost");
    const elLoginBtn = $("authLoginBtn");
    const elStateWrap = $("authStateWrap");
    const elStateText = $("authStateText");

    if(elLabel) elLabel.style.display = "none";
    if(elUser) elUser.parentElement.style.display = "none";
    if(elPass) elPass.parentElement.style.display = "none";
    if(elLoginBtn) elLoginBtn.style.display = "none";
    if(elGhost) elGhost.style.display = "none";

    if(elStateText) elStateText.textContent = `ログイン中: ${username}`;
    if(elStateWrap){
      elStateWrap.dataset.visible = "1";
      elStateWrap.style.display = "flex";
    }
  }

  function setLoggedOutUI(){
    const elLabel = $("topbarAuthLabel");
    const elUser = $("authUserName");
    const elPass = $("authPass");
    const elGhost = $("authGhost");
    const elLoginBtn = $("authLoginBtn");
    const elStateWrap = $("authStateWrap");

    if(elLabel) elLabel.style.display = "";
    if(elUser) elUser.parentElement.style.display = "";
    if(elPass) elPass.parentElement.style.display = "";
    if(elLoginBtn) elLoginBtn.style.display = "";
    if(elStateWrap){
      elStateWrap.dataset.visible = "0";
      elStateWrap.style.display = "none";
    }
    if(elGhost) elGhost.style.display = "";
  }

  function updateAuthControls(){
    const elUser = $("authUserName");
    const elPass = $("authPass");
    const elGhost = $("authGhost");
    const elLoginBtn = $("authLoginBtn");

    if(!elUser || !elPass || !elLoginBtn || !elGhost) return;

    const user = safeTrim(elUser.value);
    const pass = safeTrim(elPass.value);

    // State A
    if(!user){
      elPass.value = "";
      elPass.disabled = true;
      elGhost.style.display = "";
      elLoginBtn.disabled = true;
      return;
    }

    // State B / B2
    elPass.disabled = false;

    if(!pass){
      elGhost.style.display = "";
      elLoginBtn.disabled = true;
      return;
    }

    elGhost.style.display = "none";

    // lock check
    const untilMs = getLockedUntilMs(user);
    if(untilMs > Date.now()){
      elLoginBtn.disabled = true;
      return;
    }

    elLoginBtn.disabled = false;
  }

  async function handleLogin(){
    const elUser = $("authUserName");
    const elPass = $("authPass");
    if(!elUser || !elPass) return;

    const username = safeTrim(elUser.value);
    const pass = safeTrim(elPass.value);

    if(!username){
      toast("ユーザー名を入力してください");
      updateAuthControls();
      return;
    }
    if(!pass){
      toast("パスを入力してください");
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
      const result = await rpc("ld_login", { p_username: username, p_pass: pass });

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
        toast("ログインしました", 1200);
        return;
      }

      const reason = (result && result.reason) ? String(result.reason) : "auth_failed";
      const lockedUntil = result && result.locked_until ? Date.parse(result.locked_until) : 0;
      const lockMs = Number.isFinite(lockedUntil) && lockedUntil > 0 ? lockedUntil : (Date.now() + 3*60*1000);
      setLockedUntilMs(username, lockMs);

      // clear pass input (State B)
      elPass.value = "";
      updateAuthControls();
      toast("認証に失敗しました。一定時間ロック中です。", 2500);

      const saved = loadAuth() || {};
      saveAuth({
        loggedIn: false,
        username,
        pass: "",
        userId: null,
        level: null,
        exp: null,
        lockedUntil: lockMs,
        lastLoginAt: saved.lastLoginAt || null
      });
      dispatchAuthChanged(loadAuth());
    }catch(err){
      console.error(err);
      toast("ログイン処理に失敗しました", 2200);
    }
  }

  function handleLogout(){
    const elUser = $("authUserName");
    const username = safeTrim(elUser ? elUser.value : "");
    clearAuthKeepUsername(username);
    setLoggedOutUI();
    const elPass = $("authPass");
    if(elPass) elPass.value = "";
    updateAuthControls();
    dispatchAuthChanged(loadAuth());
    toast("ログアウトしました", 1200);
  }

  function setupAuth(){
    const elUser = $("authUserName");
    const elPass = $("authPass");
    const elLoginBtn = $("authLoginBtn");
    const elLogoutBtn = $("authLogoutBtn");
    if(!elUser || !elPass || !elLoginBtn || !elLogoutBtn) return;

    elUser.addEventListener("input", updateAuthControls);
    elPass.addEventListener("input", updateAuthControls);

    elLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogin();
    });

    elLogoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });

    // restore
    const saved = loadAuth();
    if(saved && saved.loggedIn && saved.username && saved.pass){
      elUser.value = saved.username;
      elPass.value = saved.pass;

      const untilMs = getLockedUntilMs(saved.username);
      if(untilMs > Date.now()){
        // lock -> do not auto-login
        elPass.value = "";
        setLoggedOutUI();
        updateAuthControls();
        toast("ロック中", 1200);
        return;
      }

      // Verify via RPC (do not reveal result while typing)
      rpc("ld_login", { p_username: saved.username, p_pass: saved.pass })
        .then(result => {
          if(result && result.ok === true){
            // refresh saved meta
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
            // fail -> clear pass and stay logged out
            elPass.value = "";
            setLoggedOutUI();
            updateAuthControls();
            clearAuthKeepUsername(saved.username);
            dispatchAuthChanged(loadAuth());
          }
        })
        .catch(_e => {
          // network fail -> keep logged out but preserve username
          elPass.value = "";
          setLoggedOutUI();
          updateAuthControls();
          clearAuthKeepUsername(saved.username);
          dispatchAuthChanged(loadAuth());
        });

      return;
    }

    // default state
    setLoggedOutUI();
    updateAuthControls();
  }

  function boot(){
    if(!document.body) return;
    injectHeader();
    setupDrawer();
    setupAuth();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  }else{
    boot();
  }
})();
