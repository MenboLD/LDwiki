
// ========== iOS IME workaround: Pass inputs -> hidden + modal button ==========
function ensurePassButton(inputEl, btnId) {
  if (!inputEl) return null;

  // Keep the value in hidden input for existing logic
  inputEl.type = "hidden";

  let btn = document.getElementById(btnId);
  if (!btn) {
    btn = document.createElement("button");
    btn.id = btnId;
    btn.type = "button";
    btn.className = "pass-modal-btn";
    btn.textContent = inputEl.value ? inputEl.value : (inputEl.placeholder || "（未入力）");
    inputEl.insertAdjacentElement("afterend", btn);
  }

  // Mirror disabled state
  btn.disabled = !!inputEl.disabled;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (btn.disabled) return;

    if (typeof window.LD_openTextModal !== "function") {
      showToast("モーダル未初期化（common_header）");
      return;
    }

    window.LD_openTextModal({
      modalTitle: "パス入力",
      modalHelp: "正しいパスを入力し、決定ボタンを押してください\\n※全角は５文字、半角は10文字(組み合わせて10byte)まで",
      initialValue: inputEl.value || "",
      onCommit: (v) => {
        inputEl.value = String(v ?? "");
        btn.textContent = inputEl.value ? inputEl.value : (inputEl.placeholder || "（未入力）");
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  });

  return btn;
}

function syncPassButton(btnId, inputEl, fallbackText) {
  const btn = document.getElementById(btnId);
  if (!btn || !inputEl) return;
  btn.disabled = !!inputEl.disabled;
  btn.textContent = inputEl.value ? inputEl.value : (fallbackText ?? inputEl.placeholder ?? "（未入力）");
}

// ld_users.js (v20251219a) - RPC-based register/edit for ld_users (RLS ON, policy none)
(() => {
  "use strict";

  // ========== Supabase REST RPC ==========
  const SUPABASE_URL = window.LD_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.LD_SUPABASE_ANON_KEY || "";
  const AUTH_STORAGE_KEY = "ld_auth_v1";
  const supabaseReady = !!(SUPABASE_URL && SUPABASE_ANON_KEY && !String(SUPABASE_ANON_KEY).includes("PASTE_"));

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
  const userActionBtn = $("userActionBtn");
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

  function setHomeState({ mode, canProceed, statusText, passEnabled, passPlaceholder }) {
    userActionBtn.disabled = !canProceed;
    userPassInput.disabled = !passEnabled;
    if (passPlaceholder != null) userPassInput.placeholder = passPlaceholder;
    if (statusText != null) userStatusLabel.textContent = statusText;

    if (mode === "register") userActionBtn.textContent = "新規登録";
    else if (mode === "edit") userActionBtn.textContent = "編集へ";
    else userActionBtn.textContent = "続ける";
    userActionBtn.dataset.mode = mode || "";
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
      setHomeState({
        mode: "",
        canProceed: false,
        statusText: "ユーザー名を入力してください",
        passEnabled: false,
        passPlaceholder: "（未入力）",
      });
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
          setHomeState({
            mode: "edit",
            canProceed: !!pass,
            statusText: pass ? "編集できます（パス確認）" : "登録済み：パスを入力してください",
            passEnabled: true,
            passPlaceholder: pass ? "●●●●" : "要パス",
          });
        } else {
          setHomeState({
            mode: "register",
            canProceed: !!pass,
            statusText: pass ? "新規登録できます" : "未登録：登録用パスを入力してください",
            passEnabled: true,
            passPlaceholder: pass ? "●●●●" : "登録用パス",
          });
        }
      } catch (e) {
        // If RPC fails, do not block user; treat as "edit" requiring pass
        headerStats.textContent = "判定不可";
        const pass = safeTrim(userPassInput.value);
        setHomeState({
          mode: "edit",
          canProceed: !!pass,
          statusText: pass ? "編集できます（パス確認）" : "パスを入力してください",
          passEnabled: true,
          passPlaceholder: pass ? "●●●●" : "要パス",
        });
      }
    }, 220);
  }

  function refreshProceedEnabled() {
    const uname = safeTrim(userNameInput.value);
    const pass = safeTrim(userPassInput.value);
    if (!uname) {
      setHomeState({ mode: "", canProceed: false, statusText: "ユーザー名を入力してください", passEnabled: false });
      return;
    }
    const mode = userActionBtn.dataset.mode || (lastExistsValue ? "edit" : "register");
    setHomeState({
      mode,
      canProceed: !!pass,
      statusText: userStatusLabel.textContent,
      passEnabled: true,
    });
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
  async function enterEditFlow(mode) {
    const name = safeTrim(userNameInput.value);
    const pass = safeTrim(userPassInput.value);
    if (!name || !pass) return;

    userActionBtn.disabled = true;

    try {
      if (mode === "register") {
        const res = await registerUser(name, pass);
        if (!res || res.ok !== true) {
          showToast("登録に失敗しました");
          userActionBtn.disabled = false;
          return;
        }
        // after register, immediately log in (for header)
        setAuthStorage(name, pass, { userId: res.user_id ?? null });
        showToast("登録しました");
      } else {
        // edit: validate pass and load current data
        const data = await getUserData(name, pass);
        if (!data || data.ok !== true) {
          showToast("パスが違うか、取得できません");
          userActionBtn.disabled = false;
          return;
        }
        setAuthStorage(name, pass, {
          userId: data.user_id ?? null,
          level: data.level ?? null,
          exp: data.exp ?? null,
          lockedUntil: data.locked_until ? new Date(data.locked_until).getTime() : 0,
        });
      }

      // load (after register, fetch data too so UI has server values)
      const data2 = await getUserData(name, pass);
      if (!data2 || data2.ok !== true) {
        // register直後に get が無い/失敗でも最低限編集は続行（初期値）
        inputName.value = name;
        inputPass.value = pass;
        selectVaultLevel.value = "1";
        mythicStateJson.value = "{}";
        setStats({ comment_count: 0, mis_input_count: 0, like_count: 0 });
        formModeLabel.textContent = "編集";
        showForm();
        return;
      }

      inputName.value = name;
      inputPass.value = pass;
      selectVaultLevel.value = String(data2.vault_level ?? 1);
      mythicStateJson.value = JSON.stringify(data2.mythic_state ?? {}, null, 2);
      setStats(data2);
      formModeLabel.textContent = data2.is_new ? "新規登録（初期設定）" : "編集";
      showForm();

    } catch (e) {
      console.error(e);
      showToast(String(e.message || e));
      userActionBtn.disabled = false;
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

    // Pass inputs -> modal buttons (iOS IME workaround)
    ensurePassButton(userPassInput, "userPassBtn");
    ensurePassButton(inputPass, "inputPassBtn");
    syncPassButton("userPassBtn", userPassInput, userPassInput.placeholder);
    syncPassButton("inputPassBtn", inputPass, inputPass.placeholder);

    setAccordion(false);

    userNameInput.addEventListener("input", () => {
      scheduleExistsCheck();
      refreshProceedEnabled();
    });

    userPassInput.addEventListener("input", () => {
      scheduleExistsCheck();
      refreshProceedEnabled();
    });

    userActionBtn.addEventListener("click", () => {
      const mode = userActionBtn.dataset.mode || (lastExistsValue ? "edit" : "register");
      enterEditFlow(mode);
    });

    btnBackHome.addEventListener("click", showHome);
    btnSaveUser.addEventListener("click", onSave);

    unitAccordionToggle.addEventListener("click", () => setAccordion(!accOpen));
    btnJsonReset.addEventListener("click", () => { mythicStateJson.value = "{}"; showToast("リセットしました"); });
    btnJsonFormat.addEventListener("click", formatJson);

    // initial state
    setHomeState({ mode: "", canProceed: false, statusText: "ユーザー名を入力してください", passEnabled: false, passPlaceholder: "（未入力）" });
  }

  document.addEventListener("DOMContentLoaded", init);
})();


// ===== Home accordion setup =====
(function setupHomeAccordions(){
  const headers = document.querySelectorAll(".accordion-header[data-target]");
  headers.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-target");
      const body = document.getElementById(id);
      if(!body) return;
      const open = body.style.display !== "none";
      body.style.display = open ? "none" : "block";
      const label = btn.textContent.replace(/^▶︎|^▼/,'').trim();
      btn.textContent = (open ? "▶︎ " : "▼ ") + label;
    });
  });
})();
