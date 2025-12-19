/* common_header.js
   Shared header logic for LDwiki (no fetch).
   - If the page already has header/drawer HTML, this script only binds + updates.
   - If the page does NOT have header/drawer HTML, it injects a minimal header/drawer.
   - Idempotent: safe even if loaded multiple times.
*/
(() => {
  'use strict';

  const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

  const AUTH_STORAGE_KEY = "ld_auth_v1";
  const LOCK_PREFIX = "ld_users_lock:";

  // Optional RPC: checks if username is registered (exact match).
  // If this RPC is not installed, the UI falls back to the previous behavior.
  const USER_EXISTS_RPC = "ld_user_exists";
  let userExistsRpcAvailable = true;
  const userExistsCache = new Map(); // username -> boolean
  let currentUserExists = null;      // for current input username
  let userExistsTimer = null;


  const SITE_TITLE = "ラッキー傭兵団 攻略 wiki";
  const DRAWER_SUBTITLE = "(試験運用・作成中)";

  const MAIN_MENU_ITEMS = [
    { text: "トップページ", href: "index.html" },
    { text: "情報掲示板", href: "ld_board.html" },
    { text: "ユーザー情報", href: "ld_users.html" },
    { text: "攻略の手引き", href: "#", soon: true },
    { text: "各種データ", href: "#", soon: true },
    { text: "データツール", href: "#", soon: true }
  ];

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


  function readBoolFromRpc(data){
    if(typeof data === "boolean") return data;
    if(data && typeof data === "object"){
      if(typeof data.exists === "boolean") return data.exists;
      if(typeof data.ok === "boolean") return data.ok;
      if(typeof data.result === "boolean") return data.result;
    }
    return null;
  }

  function scheduleUserExistsCheck(){
    const elUser = $("authUserName");
    if(!elUser) return;
    const name = safeTrim(elUser.value);

    // reset when username changes
    currentUserExists = null;

    if(!userExistsRpcAvailable || !name){
      if(userExistsTimer){
        clearTimeout(userExistsTimer);
        userExistsTimer = null;
      }
      // - RPC unavailable: fall back to previous behavior (allow pass entry based on local rules)
      // - Empty username: stay in guest state
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
      const latestName = safeTrim(($("authUserName") && $("authUserName").value) || "");
      if(!latestName) return;

      // cache hit (maybe filled while waiting)
      if(userExistsCache.has(latestName)){
        currentUserExists = userExistsCache.get(latestName);
        updateAuthControls();
        return;
      }

      try{
        const data = await rpc(USER_EXISTS_RPC, { p_username: latestName });
        const b = readBoolFromRpc(data);
        if(b === null) throw new Error("Invalid ld_user_exists response");
        userExistsCache.set(latestName, b);

        // apply only if username hasn't changed
        const nowName = safeTrim(($("authUserName") && $("authUserName").value) || "");
        if(nowName === latestName){
          currentUserExists = b;
          updateAuthControls();
        }
      }catch(err){
        console.warn("[ldwiki] USER_EXISTS_RPC unavailable -> fallback", err);
        userExistsRpcAvailable = false;
        currentUserExists = null;
        updateAuthControls();
      }
    }, 220);
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

  function hasAnyHeaderMarkup(){
    return !!(
      document.getElementById("topbarMenuBtn") ||
      document.getElementById("authForm") ||
      document.getElementById("drawer") ||
      document.getElementById("drawerOverlay") ||
      document.querySelector(".topbar")
    );
  }

  function injectHeader(){
    // Do NOT inject if the page already provides header/drawer markup.
    if(hasAnyHeaderMarkup()) return;

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
          <input id="authUserName" type="text" inputmode="text" autocomplete="username" placeholder="ユーザー名(任意)" />
        </label>

        <label class="topbar-auth-field" aria-label="パス">
          <input id="authPass" type="text" autocomplete="off" placeholder="" / inputmode="text" name="ldpass" lang="ja" autocorrect="off">
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
<div class="drawer-close-row">
        <button class="drawer-close-button" type="button" id="drawerCloseBtn">閉じる ◀</button>
      </div>
      <div class="drawer-body">
        <ul class="drawer-nav">
          <li><a class="drawer-link" href="index.html">トップページ</a></li>
          <li><a class="drawer-link" href="ld_board.html">情報掲示板</a></li>
          <li><a class="drawer-link" href="ld_users.html">ユーザー情報</a></li>
          <li><a class="drawer-link drawer-link--soon" href="#" data-soon="1">攻略の手引き</a></li>
          <li><a class="drawer-link drawer-link--soon" href="#" data-soon="1">各種データ</a></li>
          <li><a class="drawer-link drawer-link--soon" href="#" data-soon="1">データツール</a></li>
        </ul>
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

  function normalizeExistingHeader(){
    // Ensure common layout is enabled even when header HTML is written directly in the page.
    document.documentElement.classList.add("ld-common-header-enabled");

    // page name
    const elPage = $("topbarPageName");
    if(elPage) elPage.textContent = `> ${getPageName()}`;

    
    // Remove redundant drawer header (title/subtitle) if exists
    const drawerHeader = document.querySelector(".drawer-header");
    if(drawerHeader) drawerHeader.remove();

    // Remove "編集者ログイン / ログアウト" entry if present (header already covers it)
    document.querySelectorAll(".drawer-link").forEach(a => {
      const t = (a.textContent || "").trim();
      if(t === "編集者ログイン / ログアウト" || t === "編集者ログイン/ログアウト"){
        const li = a.closest("li");
        if(li) li.remove();
        else a.remove();
      }
    });
// Remove legacy footer note (not needed now)
    const drawerFooter = document.querySelector(".drawer-footer");
    if(drawerFooter) drawerFooter.remove();

    // Update main menu group texts/hrefs (until first separator)
    const nav = document.querySelector(".drawer-nav");
    if(nav){
      const children = Array.from(nav.children);
      const mainLis = [];
      for(const li of children){
        if(li && li.classList && li.classList.contains("drawer-group-separator")) break;
        mainLis.push(li);
      }
      const n = Math.min(mainLis.length, MAIN_MENU_ITEMS.length);
      for(let i=0; i<n; i++){
        const li = mainLis[i];
        const a = li ? li.querySelector("a") : null;
        if(!a) continue;
        const m = MAIN_MENU_ITEMS[i];
        a.textContent = m.text;
        a.setAttribute("href", m.href);
        if(m.soon){
          a.dataset.soon = "1";
          a.classList.add("drawer-link--soon");
        }else{
          a.removeAttribute("data-soon");
          a.classList.remove("drawer-link--soon");
        }
      }
    }

    // measure topbar height -> css var
    const topbar = document.querySelector(".topbar");
    if(topbar){
      requestAnimationFrame(() => {
        const h = topbar.getBoundingClientRect().height || 112;
        document.documentElement.style.setProperty("--ld-topbar-h", `${Math.ceil(h)}px`);
      });
    }
  }

  function setupDrawer(){
    const btn = $("topbarMenuBtn");
    const drawer = $("drawer");
    const overlay = $("drawerOverlay");
    const closeBtn = $("drawerCloseBtn");
    if(!drawer || !overlay || !btn || !closeBtn) return;
    if(btn.dataset && btn.dataset.boundDrawer === "1") return;
    if(btn.dataset) btn.dataset.boundDrawer = "1";

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

  function setupSoonLinks(){
    // event delegation: do not add listeners to every link
    const root = document.documentElement;
    if(root.dataset && root.dataset.ldSoonBound === "1") return;
    if(root.dataset) root.dataset.ldSoonBound = "1";

    document.addEventListener("click", (e) => {
      const a = e.target?.closest?.('a[data-soon="1"]');
      if(!a) return;
      e.preventDefault();
      toast("準備中です", 1200);
    }, { passive: false });
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

    if(elLabel){
      elLabel.style.display = "";
      elLabel.textContent = window.matchMedia("(max-width: 380px)").matches ? "未:" : "未ログイン：";
    }
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

    // Pass field wrapper (for CSS state classes)
    const passField = elPass.closest(".topbar-auth-field") || elPass.parentElement;
    const setPassFieldState = (state) => {
      if(!passField) return;
      passField.classList.remove("is-guest","is-needpass");
      if(state) passField.classList.add(state);
    };

    // Ensure placeholder
    elUser.setAttribute("placeholder", "ユーザー名(任意)");

    const user = safeTrim(elUser.value);
    const pass = safeTrim(elPass.value);

    // Lock check (local cache of server lock)
    const untilMs = user ? getLockedUntilMs(user) : 0;
    const isLocked = (untilMs > Date.now());

    // Helper to apply visual states
    const setGuestState = () => {
      setPassFieldState("is-guest");
      elPass.value = "";
      elPass.disabled = true;
      elPass.classList.remove("ld-pass-needed");
      elPass.classList.add("ld-pass-guest");
      elGhost.textContent = "ゲスト状態";
      elGhost.classList.remove("ld-ghost-needed");
      elGhost.style.display = "";
      elLoginBtn.disabled = true;
    };

    const setNeedPassState = () => {
      setPassFieldState("is-needpass");
      elPass.disabled = false;
      elPass.classList.remove("ld-pass-guest");
      elPass.classList.add("ld-pass-needed");
      elGhost.textContent = "要パス";
      elGhost.classList.add("ld-ghost-needed");
      elGhost.style.display = "";
      elLoginBtn.disabled = true;
    };

    const setPassEnteredState = () => {
      setPassFieldState(null);
      elPass.disabled = false;
      setPassFieldState(null);
      elPass.classList.remove("ld-pass-guest");
      elPass.classList.remove("ld-pass-needed");
      elGhost.classList.remove("ld-ghost-needed");
      elGhost.style.display = "none";
      elLoginBtn.disabled = false;
    };

    // State A: username empty -> guest
    if(!user){
      setGuestState();
      return;
    }

    // If locked, keep UI but disable login
    if(isLocked){
      // During lock, keep pass box enabled only when we know it's a registered user.
      // Otherwise act as guest.
      if(userExistsRpcAvailable && currentUserExists === false){
        setGuestState();
      }else{
        elPass.disabled = false;
        setPassFieldState(null);
        elPass.classList.remove("ld-pass-guest");
        // keep red prompt only when registered + empty
        if(userExistsRpcAvailable && currentUserExists === true && !pass){
          setPassFieldState("is-needpass");
          elPass.classList.add("ld-pass-needed");
          elGhost.textContent = "要パス";
          elGhost.classList.add("ld-ghost-needed");
          elGhost.style.display = "";
        }else{
          setPassFieldState(null);
          elPass.classList.remove("ld-pass-needed");
          elGhost.classList.remove("ld-ghost-needed");
          elGhost.style.display = pass ? "none" : "none";
        }
        elLoginBtn.disabled = true;
      }
      return;
    }

    // When USER_EXISTS RPC is available:
    // - unregistered -> guest (pass disabled)
    // - registered -> "要パス" (red) until pass entered
    // When not available -> fallback: allow pass for any username (previous behavior)
    if(userExistsRpcAvailable){
      if(currentUserExists === false){
        setGuestState();
        return;
      }
      if(currentUserExists === true){
        if(!pass){
          setNeedPassState();
          return;
        }
        setPassEnteredState();
        return;
      }
      // currentUserExists is null (checking / unknown): fallback UI but keep login disabled until pass exists
      elPass.disabled = false;
      elPass.classList.remove("ld-pass-guest");
      elPass.classList.remove("ld-pass-needed");
      elGhost.classList.remove("ld-ghost-needed");
      elGhost.style.display = "none";
      elLoginBtn.disabled = !pass;
      return;
    }

    // Fallback mode (no ld_user_exists): allow pass for any username
    setPassFieldState(null);
    elPass.disabled = false;
    elPass.classList.remove("ld-pass-guest");
    elPass.classList.remove("ld-pass-needed");
    elGhost.classList.remove("ld-ghost-needed");
    elGhost.style.display = pass ? "none" : "";
    elGhost.textContent = pass ? "" : "ゲスト状態";
    elLoginBtn.disabled = !pass;
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
    
    // If username is not registered, keep guest mode (pass disabled)
    if((userExistsRpcAvailable && currentUserExists === false) || elPass.disabled){
      toast("このユーザー名は未登録のためログインできません", 2200);
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
      const lockedUntilRaw = (result && result.locked_until) ? String(result.locked_until) : "";
      const lockedUntilMs = lockedUntilRaw ? Date.parse(lockedUntilRaw) : 0;
      const isLocking = Number.isFinite(lockedUntilMs) && lockedUntilMs > Date.now();

      if(isLocking){
        setLockedUntilMs(username, lockedUntilMs);
      }else{
        clearLock(username);
      }

      // clear pass input (State B)
      elPass.value = "";
      updateAuthControls();

      if(isLocking){
        toast(`認証に失敗しました。ロック中（残り ${fmtRemain(lockedUntilMs - Date.now())}）`, 2600);
      }else{
        toast("認証に失敗しました。", 1800);
      }

      const saved = loadAuth() || {};
      saveAuth({
        loggedIn: false,
        username,
        pass: "",
        userId: null,
        level: null,
        exp: null,
        lockedUntil: (isLocking ? lockedUntilMs : 0),
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

    // Idempotent bind guard
    if(elLoginBtn.dataset && elLoginBtn.dataset.boundAuth === "1") return;
    if(elLoginBtn.dataset) elLoginBtn.dataset.boundAuth = "1";

    const elForm = $("authForm");
    if(elForm && (!elForm.dataset || elForm.dataset.boundSubmit !== "1")){
      if(elForm.dataset) elForm.dataset.boundSubmit = "1";
      elForm.addEventListener("submit", (e) => { e.preventDefault(); });
    }


    elUser.addEventListener("input", () => { scheduleUserExistsCheck(); updateAuthControls(); });
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
    // keep label compact on narrow screens
    window.addEventListener("resize", () => {
      const l = $("topbarAuthLabel");
      if(!l) return;
      if(l.style.display === "none") return;
      l.textContent = window.matchMedia("(max-width: 380px)").matches ? "未:" : "未ログイン：";
    });
  }

  function boot(){
    if(!document.body) return;
    injectHeader();
    normalizeExistingHeader();
    setupDrawer();
    setupSoonLinks();
    setupAuth();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  }else{
    boot();
  }
})();