/* common_header.js (safe restore)
   - Always renders topbar + drawer
   - Uses supabase_config.js (window.LD_SUPABASE_URL / window.LD_SUPABASE_ANON_KEY) if present
*/
(() => {
  const safe = (fn) => { try { return fn(); } catch (e) { console.error("[common_header] error", e); return null; } };
  const PAGE_NAME = () => document.body?.dataset?.pageName || "";

  const ensureStylesHint = () => {
    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";
  };

  const renderHeader = () => {
    if (!document.body) return;
    if (document.getElementById("ldTopbar")) return;

    ensureStylesHint();

    const top = document.createElement("div");
    top.id = "ldTopbar";
    top.className = "topbar";
    top.innerHTML = `
      <div class="topbar-row topbar-row--primary">
        <div class="topbar-title">ラッキー傭兵団 攻略 wiki</div>
        <div class="topbar-page">&gt; ${PAGE_NAME()}</div>
        <button class="topbar-menu-btn" id="menuBtn" type="button" aria-label="menu">≡</button>
      </div>
      <div class="topbar-row topbar-row--auth" id="authRow">
        <span class="topbar-auth-label">未:</span>
        <div class="topbar-auth-field">
          <input id="authUser" type="text" inputmode="text" placeholder="ユーザー名(任意)" autocomplete="username" />
        </div>
        <div class="topbar-auth-field" id="authPassWrap">
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

    if (!document.getElementById("drawerOverlay")) {
      const ov = document.createElement("div");
      ov.id = "drawerOverlay";
      ov.className = "drawer-overlay";
      document.body.appendChild(ov);
    }
    if (!document.getElementById("drawer")) {
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
            <li class="drawer-group-separator"></li>
            <li><a class="drawer-link drawer-link--soon" href="#">サイトについて</a></li>
            <li><a class="drawer-link drawer-link--soon" href="#">利用ルール</a></li>
            <li><a class="drawer-link drawer-link--soon" href="#">更新履歴</a></li>
          </ul>
        </div>
      `;
      document.body.appendChild(dr);
    }

    const setTopbarH = () => {
      const h = top.getBoundingClientRect().height || 88;
      document.documentElement.style.setProperty("--ld-topbar-h", `${Math.ceil(h)}px`);
      if (!document.body.classList.contains("has-topbar-padding")) {
        document.body.style.paddingTop = `calc(${Math.ceil(h)}px + 10px)`;
      }
    };
    setTopbarH();
    window.addEventListener("resize", setTopbarH);
  };

  const auth = {
    read() { try { return JSON.parse(localStorage.getItem("ld_auth_v1") || "null"); } catch { return null; } },
    write(name, pass) { localStorage.setItem("ld_auth_v1", JSON.stringify({ name, pass, at: Date.now() })); window.dispatchEvent(new Event("ld-auth-changed")); },
    clear() { localStorage.removeItem("ld_auth_v1"); window.dispatchEvent(new Event("ld-auth-changed")); }
  };

  const uiApplyAuth = () => safe(() => {
    const a = auth.read();
    const loggedInBox = document.getElementById("loggedInBox");
    const loggedInText = document.getElementById("loggedInText");
    const loginBtn = document.getElementById("loginBtn");
    const authUser = document.getElementById("authUser");
    const authPass = document.getElementById("authPass");
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

  const callRpc = async (rpcName, payload) => {
    const base = window.LD_SUPABASE_URL;
    const key = window.LD_SUPABASE_ANON_KEY;
    if (!base || !key) throw new Error("Supabase config missing");
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

  const bindHandlers = () => safe(() => {
    const menuBtn = document.getElementById("menuBtn");
    const drawer = document.getElementById("drawer");
    const overlay = document.getElementById("drawerOverlay");
    const closeBtn = document.getElementById("drawerCloseBtn");

    const open = () => { drawer?.classList.add("open"); overlay?.classList.add("visible"); document.body.style.overflow="hidden"; };
    const close = () => { drawer?.classList.remove("open"); overlay?.classList.remove("visible"); document.body.style.overflow=""; };

    menuBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    overlay?.addEventListener("click", close);

    document.getElementById("logoutBtn")?.addEventListener("click", () => auth.clear());

    document.getElementById("loginBtn")?.addEventListener("click", async () => {
      const u = (document.getElementById("authUser")?.value || "").trim();
      const p = (document.getElementById("authPass")?.value || "").trim();
      if (!u || !p) return;
      try {
        const r = await callRpc("ld_login", { p_username: u, p_pass: p });
        if (r && r.ok) auth.write(u, p);
        else alert("ログイン失敗");
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
    window.addEventListener("ld-auth-changed", uiApplyAuth);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
