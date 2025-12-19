// ld_users.js (v20251219a) - RPC-based register/edit for ld_users (RLS ON, policy none)
(() => {
  "use strict";

  // Password pseudo-byte length: 半角=1, 全角=2（ざっくり: codepoint<=0xFF を半角扱い）
  function pseudoByteLen(s){
    if (!s) return 0;
    let n = 0;
    for (const ch of s){
      const cp = ch.codePointAt(0);
      n += (cp <= 0xFF) ? 1 : 2;
      if (n > 999) break;
    }
    return n;
  }


  // ========== Supabase REST RPC ==========
  const SUPABASE_URL = window.LD_SUPABASE_URL || "https://teggcuiyqkbcvbhdntni.supabase.co";
  const SUPABASE_ANON_KEY = window.LD_SUPABASE_ANON_KEY || "";
  const AUTH_STORAGE_KEY = "ld_auth_v1";

  async function rpc(fn, bodyObj) {
    const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(bodyObj ?? {}),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && data.message) ? data.message : (typeof data === "string" ? data : `RPC failed: ${res.status}`);
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ========== DOM ==========
  const $ = (id) => document.getElementById(id);

  const homeView = $("homeView");
  const formView = $("formView");

  const userNameInput = $("userNameInput");
  const userPassInput = $("userPassInput");
  const registerBtn = $("registerBtn");
  const editBtn = $("editBtn");
  const userStatusLabel = $("userStatusLabel");
  const headerStats = $("headerStats");

  const formModeLabel = $("formModeLabel");
  const inputName = $("inputName");
  const inputPass = $("inputPass");
  const selectVaultLevel = $("selectVaultLevel");
  const mythicStateJson = $("mythicStateJson");

  const unitAccordionToggle = $("unitAccordionToggle");
  const unitAccordionBody = $("unitAccordionBody");
  const btnJsonReset = $("btnJsonReset");
  const btnJsonFormat = $("btnJsonFormat");

  const statusComments = $("statusComments");
  const statusMisInputs = $("statusMisInputs");
  const statusLikes = $("statusLikes");

  const btnBackHome = $("btnBackHome");
  const btnSaveUser = $("btnSaveUser");

  const toast = $("toast");

  // ========== UI helpers ==========
  function safeTrim(v) { return (v ?? "").toString().trim(); }

  function showToast(msg, ms = 1500) {
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), ms);
  }

  function setAuthStorage(username, pass, extra = {}) {
    const auth = {
      loggedIn: true,
      username,
      pass,
      userId: extra.userId ?? null,
      level: extra.level ?? null,
      exp: extra.exp ?? null,
      lockedUntil: extra.lockedUntil ?? 0,
      lastLoginAt: extra.lastLoginAt ?? null,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    window.dispatchEvent(new CustomEvent("ld-auth-changed", { detail: auth }));
  }

  function setHomeState({ mode, canRegister, canEdit, statusText, passPlaceholder }) {
    // pass input is always editable on this page (全角OK)
    userPassInput.disabled = false;

    registerBtn.disabled = !canRegister;
    editBtn.disabled = !canEdit;

    if (passPlaceholder != null) userPassInput.placeholder = passPlaceholder;
    if (statusText !=null) userStatusLabel.textContent = statusText;

    // Highlight recommended action
    if (mode === "register") {
      registerBtn.classList.remove("home-action-secondary");
      editBtn.classList.add("home-action-secondary");
    } else if (mode === "edit") {
      editBtn.classList.remove("home-action-secondary");
      registerBtn.classList.add("home-action-secondary");
    } else {
      registerBtn.classList.remove("home-action-secondary");
      editBtn.classList.add("home-action-secondary");
    }
  }

  function showHome() {
    formView.classList.add("hidden");
    homeView.classList.remove("hidden");
    inputPass.value = "";
    btnSaveUser.disabled = false;
  }

  function showForm() {
    homeView.classList.add("hidden");
    formView.classList.remove("hidden");
  }

  function fillVaultSelect() {
    selectVaultLevel.innerHTML = "";
    for (let i = 1; i <= 11; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      selectVaultLevel.appendChild(opt);
    }
  }

  function setStats({ comment_count, mis_input_count, like_count }) {
    statusComments.textContent = `コメ数: ${comment_count ?? "-"}`;
    statusMisInputs.textContent = `誤入力: ${mis_input_count ?? "-"}`;
    statusLikes.textContent = `イイね: ${like_count ?? "-"}`;
  }

  // ========== Existence check debounce ==========
  let existsTimer = null;
  let lastExistsQuery = "";
  let lastExistsValue = false;

  async function checkExistsNow(name) {
    const uname = safeTrim(name);
    if (!uname) return false;
    const ok = await rpc("ld_user_exists", { p_username: uname });
    return !!ok;
  }

  function scheduleExistsCheck() {
    const uname = safeTrim(userNameInput.value);
    window.clearTimeout(existsTimer);

    if (!uname) {
      lastExistsQuery = "";
      lastExistsValue = false;
      headerStats.textContent = "";
      setHomeState({ mode: "", canRegister: false, canEdit: false, statusText: "ユーザー名を入力してください", passPlaceholder: "（未入力）" });
      return;
    }

    // enable pass for register/edit flows on this page
    userPassInput.disabled = false;

    existsTimer = window.setTimeout(async () => {
      try {
        lastExistsQuery = uname;
        const exists = await checkExistsNow(uname);
        lastExistsValue = exists;
        headerStats.textContent = exists ? "登録済み" : "未登録";

        const pass = safeTrim(userPassInput.value);
        if (exists) {
          setHomeState({ mode: "edit", canRegister: false, canEdit: !!pass,
            statusText: pass ? "編集できます（パス確認）" : "登録済み：パスを入力してください",
            
            passPlaceholder: pass ? "（入力済み）" : "要パス",
           });
        } else {
          setHomeState({ mode: "register", canRegister: !!pass, canEdit: false,
            statusText: pass ? "新規登録できます" : "未登録：登録用パスを入力してください",
            
            passPlaceholder: pass ? "（入力済み）" : "登録用パス",
           });
        }
      } catch (e) {
        // If RPC fails, do not block user; treat as "edit" requiring pass
        headerStats.textContent = "判定不可";
        const pass = safeTrim(userPassInput.value);
        setHomeState({ mode: "edit", canRegister: false, canEdit: !!pass,
          statusText: pass ? "編集できます（パス確認）" : "パスを入力してください",
          
          passPlaceholder: pass ? "（入力済み）" : "要パス",
         });
      }
    }, 220);
  }

  function refreshProceedEnabled() {
    const uname = safeTrim(userNameInput.value);
    const pass = safeTrim(userPassInput.value);

    if (!uname) {
      setHomeState({ mode: "", canRegister: false, canEdit: false, statusText: "ユーザー名を入力してください", passPlaceholder: "（未入力）" });
      return;
    }

    const b = pseudoByteLen(pass);
    const passOk = (b >= 1 && b <= 10);

    if (!passOk) {
      setHomeState({
        mode: lastExistsValue ? "edit" : "register",
        canRegister: false,
        canEdit: false,
        statusText: "パスは 1〜10バイト（半角=1 / 全角=2）",
        passPlaceholder: "1〜10バイト",
      });
      return;
    }

    if (lastExistsValue) {
      setHomeState({
        mode: "edit",
        canRegister: false,
        canEdit: true,
        statusText: "登録済みユーザーです（編集へ）",
        passPlaceholder: "パスを入力",
      });
    } else {
      setHomeState({
        mode: "register",
        canRegister: true,
        canEdit: false,
        statusText: "未登録ユーザーです（新規登録）",
        passPlaceholder: "登録用パス",
      });
    }
  }

  // ========== Data RPCs ==========
  async function registerUser(name, pass) {
    return await rpc("ld_register", { p_username: name, p_pass: pass });
  }

  async function getUserData(name, pass) {
    return await rpc("ld_get_user_data", { p_username: name, p_pass: pass });
  }

  async function saveUserData(name, pass, vaultLevel, mythicStateObj) {
    return await rpc("ld_update_user_data", {
      p_username: name,
      p_pass: pass,
      p_vault_level: vaultLevel,
      p_mythic_state: mythicStateObj,
    });
  }

  // ========== Form actions ==========
  async function enterEditFlow(mode, overrideName, overridePass) {
    const name = safeTrim(overrideName ?? userNameInput.value);
    const pass = safeTrim(overridePass ?? userPassInput.value);

    if (!name) return;

    const b = pseudoByteLen(pass);
    if (b < 1 || b > 10) {
      showToast("パスは 1〜10バイト（半角=1 / 全角=2）にしてください");
      return;
    }

    // disable buttons during processing
    registerBtn.disabled = true;
    editBtn.disabled = true;

    try {
      if (mode === "register") {
        const ok = await showRegisterConfirmModal(name, pass);
        if (!ok) {
          registerBtn.disabled = false;
          editBtn.disabled = false;
          return;
        }

        const res = await registerUser(name, pass);
        if (!res || res.ok !== true) {
          showToast("登録に失敗しました");
          registerBtn.disabled = false;
          editBtn.disabled = false;
          return;
        }

        // 要望: 登録後は再読み込みして初期画面に戻す（入力はクリア）
        alert("登録しました。ページを再読み込みします。");
        userNameInput.value = "";
        userPassInput.value = "";
        location.reload();
        return;
      }

      // edit: validate pass and load current data
      const data = await getUserData(name, pass);
      if (!data || data.ok !== true) {
        showToast("取得に失敗しました");
        registerBtn.disabled = false;
        editBtn.disabled = false;
        return;
      }

      // For header auth coherence (ログイン後にパス欄は消えるので問題なし)
      setAuthStorage(name, pass, { userId: data.user_id ?? null, level: data.level ?? null });
      showForm(name, pass, data);
    } finally {
      // if we already reloaded, this won't matter
      registerBtn.disabled = false;
      editBtn.disabled = false;
    }
  }

  async function onSave() {
    const name = safeTrim(inputName.value);
    const pass = safeTrim(inputPass.value);
    if (!name || !pass) {
      showToast("パスを入力してください");
      return;
    }

    let vaultLevel = Number(selectVaultLevel.value || 1);
    if (!Number.isFinite(vaultLevel) || vaultLevel < 1) vaultLevel = 1;
    if (vaultLevel > 11) vaultLevel = 11;

    let mythicObj = {};
    const raw = (mythicStateJson.value || "").trim() || "{}";
    try {
      mythicObj = JSON.parse(raw);
      if (typeof mythicObj !== "object" || mythicObj === null || Array.isArray(mythicObj)) {
        showToast("JSONはオブジェクト形式で入力してください");
        return;
      }
    } catch {
      showToast("JSONの形式が不正です");
      return;
    }

    btnSaveUser.disabled = true;
    try {
      const res = await saveUserData(name, pass, vaultLevel, mythicObj);
      if (res && res.ok === true) {
        setAuthStorage(name, pass);
        showToast("保存しました");
      } else {
        showToast(res?.reason ? `保存失敗: ${res.reason}` : "保存に失敗しました");
      }
    } catch (e) {
      console.error(e);
      showToast(String(e.message || e));
    } finally {
      btnSaveUser.disabled = false;
    }
  }

  // ========== Accordion ==========
  let accOpen = false;
  function setAccordion(open) {
    accOpen = !!open;
    unitAccordionBody.style.display = accOpen ? "block" : "none";
    unitAccordionToggle.textContent = accOpen ? "▲育成状態（JSON / 仮）" : "▼育成状態（JSON / 仮）";
  }

  function formatJson() {
    try {
      const obj = JSON.parse((mythicStateJson.value || "").trim() || "{}");
      mythicStateJson.value = JSON.stringify(obj, null, 2);
      showToast("整形しました");
    } catch {
      showToast("JSONが不正です");
    }
  }

  // ========== init ==========
  function init() {
    fillVaultSelect();
    setAccordion(false);

    userNameInput.addEventListener("input", () => {
      scheduleExistsCheck();
      refreshProceedEnabled();
    });

    userPassInput.addEventListener("input", () => {
      scheduleExistsCheck();
      refreshProceedEnabled();
    });

          enterEditFlow(mode);
    });

    registerBtn.addEventListener("click", () => enterEditFlow("register"));
    editBtn.addEventListener("click", () => enterEditFlow("edit"));

    btnBackHome.addEventListener("click", showHome);
    btnSaveUser.addEventListener("click", onSave);

    unitAccordionToggle.addEventListener("click", () => setAccordion(!accOpen));
    btnJsonReset.addEventListener("click", () => { mythicStateJson.value = "{}"; showToast("リセットしました"); });
    btnJsonFormat.addEventListener("click", formatJson);

    // initial state
    setHomeState({ mode: "", canRegister: false, statusText: "ユーザー名を入力してください", passPlaceholder: "（未入力）" });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
