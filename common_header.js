/* common_header.js (stable, page-independent)
   - Injects header + drawer
   - Reads Supabase config from supabase_config.js (window.LD_SUPABASE_URL / window.LD_SUPABASE_ANON_KEY)
   - Lock UI (spec): button label "ロック中" white text + red background, and placeholder shows remaining time (B案)
*/
(() => {
  const safe = (fn) => { try { return fn(); } catch (e) { console.error("[common_header] error", e); return null; } };
  const qs = (id) => document.getElementById(id);
  const PAGE_NAME = () => document.body?.dataset?.pageName || "";

  const auth = {
    read(){ try { return JSON.parse(localStorage.getItem("ld_auth_v1") || "null"); } catch { return null; } },
    write(name, pass){
      localStorage.setItem("ld_auth_v1", JSON.stringify({ name, pass, at: Date.now() }));
      window.dispatchEvent(new Event("ld-auth-changed"));
    },
    clear(){
      localStorage.removeItem("ld_auth_v1");
      window.dispatchEvent(new Event("ld-auth-changed"));
    }
  };

  let lockTimer = null;
  let lockUntil = null;

  const fmtMMSS = (ms) => {
    const sec = Math.max(0, Math.ceil(ms/1000));
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${m}:${String(s).padStart(2,'0')}`;
  };

  const setLockedUI = (untilISO) => {
    const passEl = qs("authPass");
    const btn = qs("loginBtn");
    if (!passEl || !btn) return;

    lockUntil = untilISO ? new Date(untilISO) : null;
    const tick = () => {
      const now = Date.now();
      const until = lockUntil ? lockUntil.getTime() : 0;
      const remain = until - now;

      if (!lockUntil || remain <= 0) {
        // unlock
        if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
        lockUntil = null;
        btn.disabled = false;
        btn.classList.remove("is-locked");
        btn.textContent = "ログイン";
        // placeholder restore handled by scheduleUserExistsCheck
        passEl.disabled = false;
        scheduleUserExistsCheck(true);
        return;
      }

      // locked
      btn.disabled = true;
      btn.classList.add("is-locked");
      btn.textContent = "ロック中";
      passEl.disabled = true;
      passEl.value = "";
      passEl.placeholder = `ロック解除まで ${fmtMMSS(remain)}`;
    };

    tick();
    if (!lockTimer) lockTimer = setInterval(tick, 1000);
  };

  const callRpc = async (rpcName, payload) => {
    const base = window.LD_SUPABASE_URL;
    const key = window.LD_SUPABASE_ANON_KEY;
    if (!base || !key || key.includes("PASTE_")) throw new Error("Supabase config missing");
    const res = await fetch(`${base}/rest/v1/rpc/${rpcName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": key, "Authorization": `Bearer ${key}` },
      body: JSON.stringify(payload || {})
    });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) throw new Error(`RPC ${rpcName} failed: ${res.status} ${txt}`);
    return data;
  };

  const renderHeader = () => {
    if (!document.body) return;
    if (qs("ldTopbar")) return;

    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";

    const top = document.createElement("div");
    top.id = "ldTopbar";
    top.className = "topbar";
    top.innerHTML = `
      <div class="topbar-row topbar-row--primary">
        <div class="topbar-title">ラッキー傭兵団 攻略 wiki</div>
        <div class="topbar-page">&gt; ${PAGE_NAME()}</div>
        <button class="topbar-menu-btn" id="menuBtn" type="button" aria-label="menu">≡</button>
      </div>
      <div class="topbar-row topbar-row--auth">
        <span class="topbar-auth-label">未:</span>
        <div class="topbar-auth-field">
          <input id="authUser" type="text" inputmode="text" placeholder="ユーザー名(任意)" autocomplete="username" />
        </div>
        <div class="topbar-auth-field">
          <input id="authPass" type="text" inputmode="text" placeholder="ゲスト状態" autocomplete="off" autocapitalize="off" spellcheck="false" />
        </div>
        <button class="topbar-auth-btn" id="loginBtn" type="button">ログイン</button>
        <div class="topbar-auth-state" id="loggedInBox">
          <span class="topbar-auth-state-text" id="loggedInText"></span>
          <button class="topbar-auth-logout" id="logoutBtn" type="button">ログアウト</button>
        </div>
      </div>
    `;
    document.body.prepend(top);

    // drawer / overlay
    if (!qs("drawerOverlay")) {
      const ov = document.createElement("div");
      ov.id = "drawerOverlay";
      ov.className = "drawer-overlay";
      document.body.appendChild(ov);
    }
    if (!qs("drawer")) {
      const dr = document.createElement("nav");
      dr.id = "drawer";
      dr.className = "drawer";
      dr.innerHTML = `
        <div class="drawer-body">
          <div class="drawer-close-row"><button class="drawer-close-button" id="drawerCloseBtn" type="button">閉じる ◀</button></div>
          <ul class="drawer-nav">
            <li><a class="drawer-link" href="./index.html">トップページ</a></li>
            <li><a class="drawer-link" href="./ld_board.html">情報掲示板</a></li>
            <li><a class="drawer-link" href="./ld_users.html">ユーザー情報</a></li>
            <li><a class="drawer-link drawer-link--soon" href="#">攻略の手引き</a></li>
            <li><a class="drawer-link drawer-link--soon" href="#">各種データ</a></li>
            <li><a class="drawer-link drawer-link--soon" href="#">データツール</a></li>
          </ul>
        </div>
      `;
      document.body.appendChild(dr);
    }

    const setTopbarH = () => {
      const h = top.getBoundingClientRect().height || 88;
      document.documentElement.style.setProperty("--ld-topbar-h", `${Math.ceil(h)}px`);
    };
    setTopbarH();
    window.addEventListener("resize", setTopbarH);
  };

  const uiApplyAuth = () => safe(() => {
    const a = auth.read();
    const loggedInBox = qs("loggedInBox");
    const loggedInText = qs("loggedInText");
    const loginBtn = qs("loginBtn");
    const authUser = qs("authUser");
    const authPass = qs("authPass");
    if (!loggedInBox || !loginBtn || !authUser || !authPass || !loggedInText) return;

    if (a?.name && a?.pass) {
      authUser.style.display = "none";
      authPass.style.display = "none";
      loginBtn.style.display = "none";
      loggedInBox.style.display = "inline-flex";
      loggedInText.textContent = `ログイン中: ${a.name}`;
    } else {
      authUser.style.display = "";
      authPass.style.display = "";
      loginBtn.style.display = "";
      loggedInBox.style.display = "none";
      loggedInText.textContent = "";
    }
  });

  // user exists check (for guest state / needs pass) - simplified but non-recursive
  let existsTimer = null;
  const scheduleUserExistsCheck = (immediate=false) => {
    if (existsTimer) clearTimeout(existsTimer);
    existsTimer = setTimeout(async () => {
      const u = (qs("authUser")?.value || "").trim();
      const passEl = qs("authPass");
      if (!passEl) return;
      if (lockUntil) return; // locked: placeholder handled by lock UI

      if (!u) {
        passEl.disabled = true;
        passEl.value = "";
        passEl.placeholder = "ゲスト状態";
        return;
      }

      try {
        const exists = await callRpc("ld_user_exists", { p_username: u });
        if (exists) {
          passEl.disabled = false;
          passEl.placeholder = "パス（必須）";
        } else {
          passEl.disabled = true;
          passEl.value = "";
          passEl.placeholder = "ゲスト状態";
        }
      } catch (e) {
        // if config missing, don't break UI
        passEl.disabled = false;
        passEl.placeholder = "パス（必須）";
      }
    }, immediate ? 0 : 250);
  };

  const bindHandlers = () => safe(() => {
    const menuBtn = qs("menuBtn");
    const drawer = qs("drawer");
    const overlay = qs("drawerOverlay");
    const closeBtn = qs("drawerCloseBtn");

    const open = () => { drawer?.classList.add("open"); overlay?.classList.add("visible"); document.body.style.overflow="hidden"; };
    const close = () => { drawer?.classList.remove("open"); overlay?.classList.remove("visible"); document.body.style.overflow=""; };

    menuBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    overlay?.addEventListener("click", close);

    qs("logoutBtn")?.addEventListener("click", () => auth.clear());

    qs("authUser")?.addEventListener("input", () => scheduleUserExistsCheck(false));

    qs("loginBtn")?.addEventListener("click", async () => {
      const u = (qs("authUser")?.value || "").trim();
      const p = (qs("authPass")?.value || "").trim();
      if (!u || !p) return;

      try {
        const r = await callRpc("ld_login", { p_username: u, p_pass: p });
        if (r?.ok) {
          auth.write(u, p);
        } else if (r?.reason === "locked" && r?.locked_until) {
          setLockedUI(r.locked_until);
        } else if (r?.locked_until) {
          // invalid_pass returns locked_until too
          setLockedUI(r.locked_until);
          alert("パスが違います。しばらく待って再試行してください。");
        } else {
          alert("ログイン失敗");
        }
      } catch (e) {
        console.error(e);
        alert("ログイン失敗");
      }
    });
  });

  const init = () => {
    renderHeader();
    uiApplyAuth();
    bindHandlers();
    scheduleUserExistsCheck(true);
    window.addEventListener("ld-auth-changed", uiApplyAuth);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
