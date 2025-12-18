/* common_header.js
   Shared header/drawer behavior + auth (RPC-based).
   - Works with pages that already contain header/drawer HTML.
   - Falls back to injecting minimal header/drawer only if missing.
*/
(() => {
  'use strict';

  // ====== Supabase RPC endpoint (PostgREST) ======
  const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

  // ====== Local storage (do not rename) ======
  const AUTH_STORAGE_KEY = "ld_auth_v1";
  const LOCK_PREFIX = "ld_users_lock:";

  // ====== UI texts ======
  const SITE_TITLE = "ラッキー傭兵団 攻略 wiki";

  // ====== helpers ======
  const $ = (id) => document.getElementById(id);
  const q = (sel, root=document) => root.querySelector(sel);
  const qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const safeTrim = (v) => (v || "").trim();

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
    try{ localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(obj)); }catch(_e){}
  }
  function ensureAuthBase(){
    const a = loadAuth();
    if(a) return a;
    const base = {
      loggedIn: false,
      username: "",
      pass: "",
      userId: null,
      level: null,
      exp: null,
      lockedUntil: 0,
      lastLoginAt: null
    };
    saveAuth(base);
    return base;
  }

  function lockKeyFor(username){ return LOCK_PREFIX + (username || ""); }
  function getLockedUntilMs(username){
    const saved = loadAuth();
    if(saved && saved.username === username && saved.lockedUntil){
      const lu = Number(saved.lockedUntil);
      if(Number.isFinite(lu) && lu > 0) return lu;
    }
    const raw = localStorage.getItem(lockKeyFor(username || ""));
    if(!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
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

  // ====== tiny toast ======
  function ensureToast(){
    let el = q(".ld-mini-toast");
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
    toastTimer = setTimeout(() => el.classList.remove("visible"), ms);
  }

  // ====== RPC ======
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
    let json = null;
    try{ json = text ? JSON.parse(text) : null; }catch(_e){ json = null; }
    if(!res.ok){
      const msg = (json && (json.message || json.error_description || json.hint)) || text || `RPC error (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  // ====== page name ======
  function getPageName(){
    const raw = document.body?.dataset?.pageName;
    const name = safeTrim(raw);
    return name || "トップ";
  }

  // ====== inject header (fallback only) ======
  function injectHeaderIfMissing(){
    // If any of the expected elements already exist, DO NOT inject (prevents duplicate IDs).
    const hasExisting =
      !!$("topbarWrap") ||
      !!$("topbarMenuBtn") ||
      !!$("authForm") ||
      !!$("drawer") ||
      !!$("drawerOverlay");

    if(hasExisting) return;

    // Minimal injection for pages not yet updated.
    document.documentElement.classList.add("ld-common-header-enabled");

    const topbarWrap = document.createElement("div");
    topbarWrap.className = "topbar-wrap";
    topbarWrap.id = "topbarWrap";
    topbarWrap.innerHTML = `
      <div class="topbar-shell">
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
            <input id="authPass" type="password" autocomplete="current-password" placeholder="" />
            <div class="topbar-auth-ghost" id="authGhost">ゲスト状態</div>
          </label>

          <button class="topbar-auth-btn" id="authLoginBtn" type="button">ログイン</button>

          <div class="topbar-auth-state" id="authStateWrap">
            <span class="topbar-auth-state-text" id="authStateText">ログイン中: -</span>
            <button class="topbar-auth-logout" id="authLogoutBtn" type="button">ログアウト</button>
          </div>
        </form>
      </div>
    `;
    document.body.prepend(topbarWrap);

    const nav = document.createElement("nav");
    nav.className = "drawer";
    nav.id = "drawer";
    nav.setAttribute("aria-label", "サイトメニュー");
    nav.innerHTML = `
      <div class="drawer-close-row">
        <button class="drawer-close-button" type="button" id="drawerCloseBtn">閉じる ◀</button>
      </div>
      <div class="drawer-body">
        <ul class="drawer-nav">
          <li class="drawer-nav-item"><a href="./index.html" class="drawer-link">トップページ</a></li>
          <li class="drawer-nav-item"><a href="./ld_board.html" class="drawer-link">情報掲示板</a></li>
          <li class="drawer-nav-item"><a href="./ld_users.html" class="drawer-link">ユーザー情報</a></li>
          <li class="drawer-nav-item"><a href="#" class="drawer-link" data-comingsoon="1">攻略の手引き</a></li>
          <li class="drawer-nav-item"><a href="#" class="drawer-link" data-comingsoon="1">各種データ</a></li>
          <li class="drawer-nav-item"><a href="#" class="drawer-link" data-comingsoon="1">データツール</a></li>
        </ul>
      </div>
      <div class="drawer-footer"></div>
    `;
    document.body.prepend(nav);

    const overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    overlay.id = "drawerOverlay";
    document.body.appendChild(overlay);
  }

  // ====== topbar height -> CSS var ======
  function syncTopbarHeight(){
    const el = $("topbarWrap") || q(".topbar-wrap") || q(".topbar") || $("ldCommonTopbar");
    if(!el) return;
    const h = Math.max(1, Math.round(el.getBoundingClientRect().height));
    document.documentElement.style.setProperty("--ld-topbar-h", `${h}px`);
  }

  // ====== drawer ======
  function setupDrawer(){
    const btn = $("topbarMenuBtn");
    const drawer = $("drawer");
    const overlay = $("drawerOverlay");
    if(!btn || !drawer || !overlay) return;

    if(document.documentElement.dataset.ldDrawerBound === "1") return;
    document.documentElement.dataset.ldDrawerBound = "1";

    const closeBtn = $("drawerCloseBtn");
    const setOpen = (open) => {
      drawer.classList.toggle("open", open);
      overlay.classList.toggle("open", open);
      document.documentElement.classList.toggle("drawer-open", open);
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
    };
    const toggle = () => setOpen(!drawer.classList.contains("open"));

    btn.addEventListener("click", (e) => { e.preventDefault(); toggle(); });
    if(closeBtn) closeBtn.addEventListener("click", (e) => { e.preventDefault(); setOpen(false); });
    overlay.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") setOpen(false);
    });

    // Close on drawer link click
    drawer.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if(!a) return;
      if(a.dataset && a.dataset.comingsoon === "1"){
        e.preventDefault();
        toast("準備中");
        setOpen(false);
        return;
      }
      setOpen(false);
    });
  }

  // ====== drawer menu grooming ======
  function normalizeDrawerMenu(){
    const drawer = $("drawer");
    if(!drawer) return;

    // Remove redundant header area if exists
    const header = q(".drawer-header", drawer);
    if(header) header.remove();

    // Remove footer note if exists
    const footer = q(".drawer-footer", drawer);
    if(footer) footer.remove();

    // Remove editor login item(s)
    qa(".drawer-link", drawer).forEach(a => {
      const t = safeTrim(a.textContent);
      if(/編集者ログイン/.test(t)){
        const li = a.closest("li");
        if(li) li.remove();
      }
    });

    // Rename primary items
    qa(".drawer-link", drawer).forEach(a => {
      const t = safeTrim(a.textContent);
      if(t === "ユーザーデータベース" || t === "ユーザーデータ" ) a.textContent = "ユーザー情報";
      if(t === "ユニットDB") a.textContent = "各種データ";
    });

    // Ensure known pages link to real pages if still "#"
    qa(".drawer-link", drawer).forEach(a => {
      const t = safeTrim(a.textContent);
      if(a.getAttribute("href") === "#"){
        if(t === "トップページ") a.setAttribute("href", "./index.html");
        if(t === "情報掲示板") a.setAttribute("href", "./ld_board.html");
        if(t === "ユーザー情報") a.setAttribute("href", "./ld_users.html");
      }
      // Mark coming soon for pages we don't have
      if(["攻略の手引き","各種データ","データツール"].includes(t)){
        if(!a.getAttribute("href") || a.getAttribute("href") === "#"){
          a.dataset.comingsoon = "1";
          a.setAttribute("href", "#");
        }
      }
    });
  }

  // ====== auth ======
  const existsCache = new Map(); // username -> { exists:boolean, ts:number, known:boolean }
  let existsSeq = 0;
  let existsKnown = true;
  let currentExists = false;

  async function checkUserExists(username){
    const key = username;
    const cached = existsCache.get(key);
    const now = Date.now();
    if(cached && (now - cached.ts) < 30_000) return cached;

    try{
      const v = await rpc("ld_user_exists", { p_username: username });
      const out = { exists: !!v, known: true, ts: now };
      existsCache.set(key, out);
      return out;
    }catch(_e){
      // If the RPC isn't available (or denied), keep login workable by assuming "need pass".
      const out = { exists: true, known: false, ts: now };
      existsCache.set(key, out);
      return out;
    }
  }

  function setupAuth(){
    const form = $("authForm");
    const userInput = $("authUserName");
    const passInput = $("authPass");
    const ghost = $("authGhost");
    const loginBtn = $("authLoginBtn");
    const stateWrap = $("authStateWrap");
    const stateText = $("authStateText");
    const logoutBtn = $("authLogoutBtn");
    const label = $("topbarAuthLabel");

    if(!form || !userInput || !passInput || !ghost || !loginBtn || !stateWrap || !stateText || !logoutBtn) return;

    if(document.documentElement.dataset.ldAuthBound === "1") return;
    document.documentElement.dataset.ldAuthBound = "1";

    // username placeholder
    userInput.setAttribute("placeholder", "ユーザー名(任意)");

    const userField = userInput.closest(".topbar-auth-field") || userInput.parentElement;
    const passField = passInput.closest(".topbar-auth-field") || passInput.parentElement;

    const showLoggedIn = (username) => {
      if(label) label.style.display = "none";
      if(userField) userField.style.display = "none";
      if(passField) passField.style.display = "none";
      loginBtn.style.display = "none";
      stateWrap.style.display = "flex";
      stateText.textContent = `ログイン中: ${username || "-"}`;
    };

    const showLoggedOut = () => {
      if(label) label.style.display = "";
      if(userField) userField.style.display = "";
      if(passField) passField.style.display = "";
      loginBtn.style.display = "";
      stateWrap.style.display = "none";
    };

    const setPassMode = (mode /* 'guest' | 'needpass' */) => {
      passField?.classList.remove("is-guest", "is-needpass");
      if(mode === "guest"){
        passField?.classList.add("is-guest");
        passInput.disabled = true;
        passInput.value = "";
        ghost.textContent = "ゲスト状態";
        ghost.style.display = "block";
      }else{
        passField?.classList.add("is-needpass");
        passInput.disabled = false;
        ghost.textContent = "要パス";
        ghost.style.display = passInput.value ? "none" : "block";
      }
    };

    const updateButtons = () => {
      const username = safeTrim(userInput.value);
      const pass = safeTrim(passInput.value);
      const now = Date.now();
      const lockedUntil = username ? getLockedUntilMs(username) : 0;
      const locked = lockedUntil && now < lockedUntil;

      // enable login only when username exists (needpass) and pass filled and not locked
      const canLogin = !!username && currentExists && !!pass && !locked && !passInput.disabled;
      loginBtn.disabled = !canLogin;

      // ghost visibility when typing
      if(passInput.disabled){
        ghost.style.display = "block";
      }else{
        ghost.style.display = pass ? "none" : "block";
      }
    };

    let debounceTimer = null;
    const scheduleExistsCheck = () => {
      const username = safeTrim(userInput.value);
      existsSeq += 1;
      const mySeq = existsSeq;

      if(debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        // If user already logged in, no need.
        const auth = loadAuth();
        if(auth && auth.loggedIn) return;

        if(!username){
          existsKnown = true;
          currentExists = false;
          setPassMode("guest");
          updateButtons();
          return;
        }

        const res = await checkUserExists(username);
        if(mySeq !== existsSeq) return; // stale

        existsKnown = res.known;
        currentExists = !!res.exists;

        if(currentExists){
          setPassMode("needpass");
        }else{
          setPassMode("guest");
        }
        updateButtons();
      }, 220);
    };

    // Restore auth / initial view
    const init = () => {
      const auth = ensureAuthBase();
      if(auth.loggedIn && auth.username){
        showLoggedIn(auth.username);
        clearLock(auth.username);
      }else{
        showLoggedOut();
        // restore typed username if any
        if(auth.username && !userInput.value) userInput.value = auth.username;
        // Start as guest until exists-check says otherwise
        setPassMode("guest");
        scheduleExistsCheck();
        updateButtons();
      }
    };

    userInput.addEventListener("input", () => {
      // username change resets pass mode until check completes
      scheduleExistsCheck();
    });

    passInput.addEventListener("input", () => {
      updateButtons();
    });

    // login
    const doLogin = async () => {
      const username = safeTrim(userInput.value);
      const pass = safeTrim(passInput.value);

      if(!username){
        toast("ユーザー名が未入力です");
        return;
      }
      if(passInput.disabled){
        toast("このユーザー名は未登録のため、ゲスト状態です");
        return;
      }
      if(!pass){
        toast("パスが未入力です");
        return;
      }

      const lockedUntil = getLockedUntilMs(username);
      if(lockedUntil && Date.now() < lockedUntil){
        toast(`ロック中：残り ${fmtRemain(lockedUntil - Date.now())}`, 2200);
        updateButtons();
        return;
      }

      try{
        loginBtn.disabled = true;
        const result = await rpc("ld_login", { p_username: username, p_pass: pass });

        if(result && result.ok === true){
          const user = result.user || {};
          const auth = {
            loggedIn: true,
            username: username,
            pass: pass,
            userId: user.id ?? user.userId ?? null,
            level: user.level ?? null,
            exp: user.exp ?? null,
            lockedUntil: 0,
            lastLoginAt: new Date().toISOString()
          };
          saveAuth(auth);
          clearLock(username);
          toast("ログインしました");
          showLoggedIn(username);
          return;
        }

        // fail
        const reason = result?.reason || "login_failed";

        if(reason === "locked"){
          // server says currently locked
          const until = result?.locked_until;
          const untilMs = until ? Date.parse(until) : 0;
          if(untilMs && Number.isFinite(untilMs)) setLockedUntilMs(username, untilMs);
          toast(`ロック中：残り ${fmtRemain((untilMs||Date.now()) - Date.now())}`, 2400);
        }else if(reason === "invalid_pass"){
          // server may lock (or not) depending on policy
          const until = result?.locked_until;
          if(until){
            const untilMs = Date.parse(until);
            if(untilMs && Number.isFinite(untilMs)){
              setLockedUntilMs(username, untilMs);
              toast(`パスが違います（ロック：${fmtRemain(untilMs - Date.now())}）`, 2400);
            }else{
              toast("パスが違います", 2000);
            }
          }else{
            toast("パスが違います", 2000);
          }
        }else if(reason === "invalid_username"){
          toast("そのユーザー名は登録されていません", 2200);
        }else if(reason === "invalid_input"){
          toast("入力が不正です", 1800);
        }else{
          toast("ログインできませんでした", 1800);
        }
      }catch(_e){
        toast("ログイン処理でエラーが発生しました", 2000);
      }finally{
        // after login attempt, re-evaluate
        scheduleExistsCheck();
        updateButtons();
      }
    };

    loginBtn.addEventListener("click", (e) => { e.preventDefault(); doLogin(); });
    passInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        doLogin();
      }
    });

    // logout
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const a = loadAuth();
      const username = a?.username || safeTrim(userInput.value);
      saveAuth({
        loggedIn: false,
        username: username || "",
        pass: "",
        userId: null,
        level: null,
        exp: null,
        lockedUntil: 0,
        lastLoginAt: null
      });
      clearLock(username || "");
      toast("ログアウトしました");
      showLoggedOut();
      userInput.value = username || "";
      passInput.value = "";
      setPassMode("guest");
      scheduleExistsCheck();
      updateButtons();
    });

    init();
  }

  // ====== init ======
  function main(){
    // prevent double-init
    if(document.documentElement.dataset.ldCommonInit === "1") return;
    document.documentElement.dataset.ldCommonInit = "1";

    injectHeaderIfMissing();

    // page name
    const pageNameEl = $("topbarPageName");
    if(pageNameEl) pageNameEl.textContent = `> ${getPageName()}`;

    // menu grooming
    normalizeDrawerMenu();

    // bind behaviors
    setupDrawer();
    setupAuth();

    // sync height initially and on resize
    syncTopbarHeight();
    window.addEventListener("resize", () => syncTopbarHeight());
    // also after fonts/layout settle
    setTimeout(syncTopbarHeight, 60);
    setTimeout(syncTopbarHeight, 300);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", main);
  }else{
    main();
  }
})();
