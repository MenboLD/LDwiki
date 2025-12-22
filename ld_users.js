let epic15Count = 0;
// ld_users.js (20251221af) - ld_users: register/edit -> info modal + mythic submodal (image grid)
// NOTE: common_header is "stable". Do not modify common_header.* here.

(() => {
  "use strict";

  // ===== Fixed texts =====
  const NOTICE_HTML = `・ユーザー名とパスは変更できません<br>
・パスは再発行や再確認が不可能です。必ず画面スクリーンショットやメモするなどし、個人で控えてください<br>
・ユーザー名やパスを除き、ユニットの育成情報などは基本的に公開情報扱いになります。今後、項目ごとに公開/非公開の設定機能は追加予定です<br>
・登録するユーザー名はゲーム内のプレイヤーとは異なる名前で登録することを推奨します。<br>
・ゲスト、登録ユーザーの差異にかかわらずIPアドレスなどの情報は運営側に保持されます。`;

  const PASS_MODAL_HELP = `正しいパスを入力し、決定ボタンを押してください\n※全角は5文字、半角は10文字（組み合わせて10byte）まで\n\n【注意】\n` +
    `・ユーザー名とパスは変更できません\n` +
    `・パスは再発行や再確認が不可能です。必ず画面スクリーンショットやメモするなどし、個人で控えてください\n` +
    `・ユーザー名やパスを除き、ユニットの育成情報などは基本的に公開情報扱いになります。今後、項目ごとに公開/非公開の設定機能は追加予定です\n` +
    `・登録するユーザー名はゲーム内のプレイヤーとは異なる名前で登録することを推奨します。\n` +
    `・ゲスト、登録ユーザーの差異にかかわらずIPアドレスなどの情報は運営側に保持されます。`;

  // ===== Supabase REST RPC =====
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

  // ===== DOM helpers =====
  const $ = (id) => document.getElementById(id);
  const toast = $("toast");

  function showToast(msg, ms = 1600) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), ms);
  }

  function safeTrim(v) { return (v ?? "").toString().trim(); }

  function fmtYYMMDD(isoLike) {
    if (!isoLike) return "-";
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return "-";
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}/${mm}/${dd}`;
  }

  // ===== Auth storage (for future header sync) =====
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

  // ===== Pass input -> modal button (iOS fullwidth support) =====
  function ensurePassButton(inputEl, btnId) {
    if (!inputEl) return null;
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

    // NOTE: pass modal button must be clickable after username input.
    // We do not hard-disable the button based on the hidden input's disabled state.
    btn.disabled = false;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Guard: require username (so the user is in the correct flow)
      const unameNow = (document.getElementById("userNameInput")?.value ?? "").toString().trim();
      if (!unameNow) {
        showToast("先にユーザー名を入力してください");
        return;
      }

      if (typeof window.LD_openTextModal !== "function") {
        showToast("モーダル未初期化（common_header）");
        return;
      }

      window.LD_openTextModal({
        modalTitle: "パス入力",
        modalHelp: PASS_MODAL_HELP,
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
    // NOTE: pass modal button must be clickable after username input.
    // We do not hard-disable the button based on the hidden input's disabled state.
    btn.disabled = false;
    btn.textContent = inputEl.value ? inputEl.value : (fallbackText ?? inputEl.placeholder ?? "（未入力）");
  }

  // ===== Home area state machine =====
  const userNameInput = $("userNameInput");
  const userPassInput = $("userPassInput");
  const userActionBtn = $("userActionBtn");
  const userStatusLabel = $("userStatusLabel");
  const headerStats = $("headerStats");

  let lastExistsValue = false; // true if registered
  let existsTimer = null;

  async function checkExistsNow(name) {
    const uname = safeTrim(name);
    if (!uname) return false;
    const ok = await rpc("ld_user_exists", { p_username: uname });
    return !!ok;
  }

  function setActionButtonLabel() {
    const uname = safeTrim(userNameInput.value);
    const pass = safeTrim(userPassInput.value);
    if (!uname) {
      userActionBtn.textContent = "※先にユーザー名を入力してください";
      userActionBtn.disabled = true;
      return;
    }
    if (!pass) {
      userActionBtn.textContent = "※先にパスを入力してください";
      userActionBtn.disabled = true;
      return;
    }
    // both exist
    userActionBtn.disabled = false;
    userActionBtn.textContent = lastExistsValue ? "編集へ" : "新規登録";
  }

  function updatePassButtonVisual() {
    const btn = $("userPassBtn");
    if (!btn) return;
    // When username exists in DB: "要パス" and red dashed border (same behavior as header)
    if (!safeTrim(userNameInput.value)) {
      btn.classList.remove("needpass");
      btn.textContent = userPassInput.value ? userPassInput.value : "（未入力）";
      return;
    }
    if (lastExistsValue) {
      btn.classList.add("needpass");
      if (!userPassInput.value) btn.textContent = "要パス";
    } else {
      btn.classList.remove("needpass");
      if (!userPassInput.value) btn.textContent = "パスを設定してください";
    }
  }

  function scheduleExistsCheck() {
    const uname = safeTrim(userNameInput.value);
    window.clearTimeout(existsTimer);

    if (!uname) {
      lastExistsValue = false;
      if (headerStats) headerStats.textContent = "";
      userPassInput.disabled = true;
      syncPassButton("userPassBtn", userPassInput, "（未入力）");
      updatePassButtonVisual();
      if (userStatusLabel) userStatusLabel.textContent = "ユーザー名を入力してください";
      setActionButtonLabel();
      return;
    }

    userPassInput.disabled = false;
    syncPassButton("userPassBtn", userPassInput, userPassInput.placeholder);
    updatePassButtonVisual();

    existsTimer = window.setTimeout(async () => {
      try {
        const exists = await checkExistsNow(uname);
        lastExistsValue = exists;
        if (headerStats) headerStats.textContent = exists ? "登録済み" : "未登録";
        if (userStatusLabel) {
          userStatusLabel.textContent = exists ? "登録済み：パスを入力してください" : "未登録：パスを設定してください";
        }
      } catch (e) {
        // fallback: allow proceed if pass exists
        if (headerStats) headerStats.textContent = "判定不可";
      } finally {
        updatePassButtonVisual();
        setActionButtonLabel();
      }
    }, 220);
  }

  // ===== Info modal state =====
  const userInfoBackdrop = $("userInfoBackdrop");
  const btnUserInfoClose = $("btnUserInfoClose");
  const btnUserInfoSave = $("btnUserInfoSave");
  const userInfoTitle = $("userInfoTitle");
  const userInfoError = $("userInfoError");

  const lblUserName = $("lblUserName");
  const lblCreatedAt = $("lblCreatedAt");
  const lblUpdatedAt = $("lblUpdatedAt");
  const lblSiteLevel = $("lblSiteLevel");

  const btnVaultMinus = $("btnVaultMinus");
  const btnVaultPlus = $("btnVaultPlus");
  const lblVaultLevel = $("lblVaultLevel");

  const btnOpenMythicSubmodal = $("btnOpenMythicSubmodal");

  const accOtherToggle = $("accOtherToggle");
  const accOtherBody = $("accOtherBody");
  const accFutureToggle = $("accFutureToggle");
  const accFutureBody = $("accFutureBody");

  const inpGamePlayerName = $("inpGamePlayerName");
  const inpGamePlayerLevel = $("inpGamePlayerLevel");
  const inpGuildName = $("inpGuildName");
  const inpGuildCode = $("inpGuildCode");
  const btnPasteGuildCode = $("btnPasteGuildCode");

  const lblCommentCount = $("lblCommentCount");
  const lblLikeCount = $("lblLikeCount");
  const lblMisInputCount = $("lblMisInputCount");

  // mirror notice text into modal
  const modalNoticeText = $("modalNoticeText");

  // local working state (not yet saved)
  let currentUser = null; // server payload
  let draft = {
    vault_level: 1,
    mythic_state: {},
    game_player_name: "",
    game_player_level: null,
    guild_name: "",
    guild_code: ""
  };
  let dirty = false;

  function setDirty(v=true) {
    dirty = !!v;
  }

  function openBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.classList.add("show");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.classList.remove("show");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function setAccordion(toggleEl, bodyEl, open) {
    if (!toggleEl || !bodyEl) return;
    if (open) {
      bodyEl.classList.add("open");
      toggleEl.textContent = toggleEl.textContent.replace("▶", "▼");
    } else {
      bodyEl.classList.remove("open");
      toggleEl.textContent = toggleEl.textContent.replace("▼", "▶");
    }
  }

  function setVaultLevel(n) {
    const v = Math.max(1, Math.min(11, Number(n) || 1));
    draft.vault_level = v;
    if (lblVaultLevel) lblVaultLevel.textContent = `Lv.${v}`;
    setDirty(true);
  }

  function bindDraftToInputs() {
    if (inpGamePlayerName) inpGamePlayerName.value = draft.game_player_name || "";
    if (inpGuildName) inpGuildName.value = draft.guild_name || "";
    if (inpGuildCode) inpGuildCode.value = draft.guild_code || "";
    if (inpGamePlayerLevel) inpGamePlayerLevel.value = (draft.game_player_level ?? "") === null ? "" : String(draft.game_player_level ?? "");
  }

  
  function clearValidationHighlights() {
    const otherToggle = document.getElementById("accOtherToggle");
    otherToggle?.classList.remove("error");
    document.querySelectorAll(".field.error").forEach(el => el.classList.remove("error"));
  }

  function highlightField(id) {
    const el = document.getElementById(id);
    const field = el?.closest(".field");
    field?.classList.add("error");
    const otherToggle = document.getElementById("accOtherToggle");
    otherToggle?.classList.add("error");
    // Ensure accordion is open so the user can see the fields
    const body = document.getElementById("accOtherBody");
    if (body && !body.classList.contains("open")) {
      body.classList.add("open");
      otherToggle?.setAttribute("data-open", "1");
      otherToggle && (otherToggle.textContent = "▼そのほかのゲーム内情報");
    }
  }

  function setUserInfoError(msg) {
    if (!userInfoError) return;
    if (msg) {
      userInfoError.textContent = msg;
      userInfoError.style.display = "block";
    } else {
      userInfoError.textContent = "";
      userInfoError.style.display = "none";
    }
  }

function pullInputsToDraft() {
    draft.game_player_name = safeTrim(inpGamePlayerName?.value || "") || null;
    draft.guild_name = safeTrim(inpGuildName?.value || "") || null;
    draft.guild_code = safeTrim(inpGuildCode?.value || "") || null;
const lvlRaw = safeTrim(inpGamePlayerLevel?.value || "");
    draft.game_player_level = lvlRaw ? Number(lvlRaw) : null;
  }

  function validateOtherInfo() {
    clearValidationHighlights();

    // player level (optional)
    if (draft.game_player_level !== null) {
      const n = Number(draft.game_player_level);
      if (!Number.isFinite(n) || n < 1 || n > 30) {
        highlightField("inpGamePlayerLevel");
        return "プレイヤーレベルは1〜30で入力してください";
      }
    }

    // guild code (optional)
    if (draft.guild_code) {
      let code = String(draft.guild_code);
      if (!code.startsWith("#")) code = "#" + code;
      code = "#" + code.slice(1).toUpperCase();
      draft.guild_code = code;
      if (!/^#[0-9A-F]{8}$/.test(code)) {
        highlightField("inpGuildCode");
        return "所属ギルドコードの形式が不正です（例：#1A2B3C4D）";
      }
    }

    return "";
  }

  function fillInfoModalFromUser(user, modeText) {
    currentUser = user;
    if (userInfoTitle) userInfoTitle.textContent = modeText;

    if (lblUserName) lblUserName.textContent = user.name ?? "-";
    if (lblCreatedAt) lblCreatedAt.textContent = fmtYYMMDD(user.created_at);
    if (lblUpdatedAt) lblUpdatedAt.textContent = fmtYYMMDD(user.updated_at);
    if (lblSiteLevel) lblSiteLevel.textContent = (user.level ?? "-");

    draft.vault_level = Number(user.vault_level ?? 1) || 1;
    draft.mythic_state = (user.mythic_state && typeof user.mythic_state === "object") ? user.mythic_state : {};
    draft.game_player_name = user.game_player_name ?? "";
    draft.game_player_level = user.game_player_level ?? null;
    draft.guild_name = user.guild_name ?? "";
    draft.guild_code = user.guild_code ?? "";

    setVaultLevel(draft.vault_level);
    bindDraftToInputs();

    if (lblCommentCount) lblCommentCount.textContent = String(user.comment_count ?? "-");
    if (lblLikeCount) lblLikeCount.textContent = String(user.like_count ?? "-");
    if (lblMisInputCount) lblMisInputCount.textContent = String(user.mis_input_count ?? "-");

    if (modalNoticeText) modalNoticeText.innerHTML = NOTICE_HTML;

    setUserInfoError("");
    setDirty(false);
    // default: other/future accordion closed
    setAccordion(accOtherToggle, accOtherBody, false);
    setAccordion(accFutureToggle, accFutureBody, false);
  }

  // ===== Mythic submodal (image grid) =====
  const mythicBackdrop = $("mythicBackdrop");
  let lastFocusReturnEl = null; // focus return target for mythic submodal
  const btnMythicClose = $("btnMythicClose");
  const btnMythicOk = $("btnMythicOk");
  const mythicControls = $("mythicControls");
  const mythicGridHost = $("mythicGrid");
  const mythicError = $("mythicError");

  // Assets live on Supabase Storage (public/ld-assets)
  const ASSET_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/ld-assets/unit_icons/`;

  // unit master cache (ld_units_master)
  let unitMasterLoaded = false;
  const codeToIconBig = new Map();      // code(int) -> icon_big_filename (e.g. "501_big")
  const mythicToImmortal = new Map();   // mythicCode(int) -> immortalCode(int)
  let mythicCodes = [];                // e.g. [501..528,...] derived from master
  let mythicBtnMulti = null;
function normalizePngFilename(name) {
  const s = String(name || "").trim();
  if (!s) return "";
  return s.toLowerCase().endsWith(".png") ? s : (s + ".png");
}

async function loadUnitMaster() {
    if (unitMasterLoaded) return true;
    try {
      const url = `${SUPABASE_URL}/rest/v1/ld_units_master?select=*`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });
      if (!res.ok) throw new Error(`ld_units_master fetch failed: ${res.status}`);
      const rows = await res.json();

      codeToIconBig.clear();
      mythicToImmortal.clear();
      mythicCodes = [];

      // Build icon map and mythic list
      for (const r of rows) {
        const code = Number(r.code ?? r.unit_code ?? r.unitId ?? r.unit_id ?? r.id_code);
        if (!Number.isFinite(code)) continue;
        if (r.icon_big_filename) codeToIconBig.set(code, String(r.icon_big_filename));
        // mythic range: 500-599
        if (code >= 500 && code < 600) mythicCodes.push(code);
      }

      // Build pairing map from immortal rows: paired_mythic_code points to mythic code
      for (const r of rows) {
        const code = Number(r.code ?? r.unit_code ?? r.unitId ?? r.unit_id ?? r.id_code);
        const paired = r.paired_mythic_code == null ? null : Number(r.paired_mythic_code);
        if (code >= 600 && code < 700 && paired && Number.isFinite(paired)) {
          mythicToImmortal.set(paired, code);
        }
      }

      // Fallback safety: if master doesn't have mythic rows yet, keep 501-528
      if (!mythicCodes.length) {
        mythicCodes = [501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,519,520,521,522,523,524,525,526,527,528];
      }

      mythicCodes = Array.from(new Set(mythicCodes)).sort((a,b)=>a-b);
      // Special-case: 515's immortal form uses 615_big (615 may appear as 615_a/615_b in master)
      if (!mythicToImmortal.has(515)) mythicToImmortal.set(515, 615);

      unitMasterLoaded = true;
      return true;
    } catch (e) {
      console.warn("[ldwiki] loadUnitMaster failed", e);
      unitMasterLoaded = false;
      // fallback list keeps UI usable even if master cannot load
      mythicCodes = [501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,519,520,521,522,523,524,525,526,527,528];
      return false;
    }
  }

  function iconUrlForCode(code) {
    const key = codeToIconBig.get(Number(code));
    if (key) return ASSET_BASE_URL + normalizePngFilename(key);
    return ASSET_BASE_URL + normalizePngFilename(String(code) + "_big");
  }

  function hasImmortalPair(mythicCode) {
    return mythicToImmortal.has(Number(mythicCode));
  }

  function immortalCodeFor(mythicCode) {
    return mythicToImmortal.get(Number(mythicCode)) ?? null;
  }

  let multiSelectMode = false;
  let selectedUnitIds = new Set();

  function buildMythicControls() {
    if (!mythicControls) return;
    mythicControls.innerHTML = "";

    const row1 = document.createElement("div");
    row1.className = "unit-controls-row";

    const btnAll = document.createElement("button");
    btnAll.className = "btn-small";
    btnAll.textContent = "全選択";
    btnAll.addEventListener("click", () => {
      selectedUnitIds = new Set(mythicCodes.map((n)=>String(n)));
      refreshSelectedVisual();
    });

    const btnClear = document.createElement("button");
    btnClear.className = "btn-small";
    btnClear.textContent = "選択解除";
    btnClear.addEventListener("click", () => {
      selectedUnitIds = new Set();
      refreshSelectedVisual();
    });

    const btnMulti = document.createElement("button");
    btnMulti.className = "btn-small";
    mythicBtnMulti = btnMulti;
    btnMulti.textContent = "複数選択: OFF";
    btnMulti.addEventListener("click", () => {
      multiSelectMode = !multiSelectMode;
      btnMulti.textContent = multiSelectMode ? "複数選択: ON" : "複数選択: OFF";
      btnMulti.classList.toggle("active", multiSelectMode);
      if (!multiSelectMode && selectedUnitIds.size > 1) {
        // keep only first
        const first = selectedUnitIds.values().next().value;
        selectedUnitIds = new Set(first ? [first] : []);
      }
      refreshSelectedVisual();
    });

    row1.appendChild(btnAll);
    row1.appendChild(btnClear);
    row1.appendChild(btnMulti);

    const row2 = document.createElement("div");
    row2.className = "unit-controls-row";

    function btnLv(n) {
      const b = document.createElement("button");
      b.className = "btn-small";
      b.textContent = `Lv${n}`;
      b.addEventListener("click", () => applyLevelToSelection(n));
      return b;
    }
    row2.appendChild(btnLv(6));
    row2.appendChild(btnLv(12));
    row2.appendChild(btnLv(15));

    const btnTreasure = document.createElement("button");
    btnTreasure.className = "btn-small";
    btnTreasure.textContent = "専用財宝";
    btnTreasure.addEventListener("click", () => toggleTreasureOnSelection());
    row2.appendChild(btnTreasure);

    const btnAwaken = document.createElement("button");
    btnAwaken.className = "btn-small";
    btnAwaken.textContent = "覚醒/退化";
    btnAwaken.addEventListener("click", () => toggleFormAwakening());
    row2.appendChild(btnAwaken);

    const btnAwakableAll = document.createElement("button");
    btnAwakableAll.className = "btn-small";
    btnAwakableAll.textContent = "覚醒可能を全選択";
    btnAwakableAll.addEventListener("click", () => selectAwakableAll());
    row2.appendChild(btnAwakableAll);


    mythicControls.appendChild(row1);
    mythicControls.appendChild(row2);
  }

  function renderMythicGridFromDraft() {
    if (!mythicGridHost) return;
    mythicGridHost.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "unit-grid";

    mythicCodes.forEach((idNum) => {
      const id = String(idNum);
      const baseId = Number(idNum);

      // draft entry (stored by mythic id)
      const raw = (draft.mythic_state && draft.mythic_state[id]) ? draft.mythic_state[id] : null;
      const form = (raw && raw.form === "immortal") ? "immortal" : "mythic";
      const level = raw && Number.isFinite(Number(raw.level)) ? Number(raw.level) : 0;
      const treasure = !!(raw && raw.treasure);

      const item = document.createElement("div");
      item.className = "unit-item";
      item.dataset.id = id;
      item.dataset.level = String([0,6,12,15].includes(level) ? level : (level <= 0 ? 0 : 6));
      item.dataset.form = form;
      item.dataset.treasure = (form === "mythic" && treasure && level >= 12) ? "1" : "0";

      const inner = document.createElement("div");
      inner.className = "unit-inner";

      const img = document.createElement("img");
      img.className = "unit-img";
      img.alt = id;
      img.loading = "lazy";
      const displayCode = (form === "immortal") ? (immortalCodeFor(baseId) ?? baseId) : baseId;
      img.src = iconUrlForCode(displayCode);
      img.onerror = () => { img.onerror = null; img.src = ""; };

      const badge = document.createElement("div");
      badge.className = "unit-badge";
      badge.textContent = "";
      badge.classList.remove("has-treasure");

      inner.appendChild(img);
      inner.appendChild(badge);
      item.appendChild(inner);

      // initial visuals
      updateUnitVisual(item);

      item.addEventListener("click", () => {
        if (multiSelectMode) {
          if (selectedUnitIds.has(id)) selectedUnitIds.delete(id);
          else selectedUnitIds.add(id);
          refreshSelectedVisual();
          return;
        }

        // single mode: tap selects; tapping the same tile again advances the cycle
        const already = (selectedUnitIds.size === 1 && selectedUnitIds.has(id));
        selectedUnitIds = new Set([id]);
        refreshSelectedVisual();
        if (already) {
          advanceUnitOnTap(item);
        }

        // write back to draft from this item
        const lvl = parseInt(item.dataset.level || "0", 10);
        const frm = item.dataset.form || "mythic";
        const tr = item.dataset.treasure === "1";

        if (lvl <= 0) {
          if (draft.mythic_state) delete draft.mythic_state[id];
        } else {
          if (!draft.mythic_state) draft.mythic_state = {};
          draft.mythic_state[id] = {
            level: lvl,
            treasure: (frm === "mythic") ? tr : false,
            form: (frm === "immortal") ? "immortal" : "mythic"
          };
        }

        setDirty(true);
        refreshSelectedVisual();
      });

      grid.appendChild(item);
    });

    mythicGridHost.appendChild(grid);
    refreshSelectedVisual();
  }
  function syncDraftFromMythicGrid() {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    if (!grid) return;
    const json = {};
    grid.querySelectorAll(".unit-item").forEach((item) => {
      const id = item.dataset.id;
      const level = parseInt(item.dataset.level || "0", 10);
      const form = item.dataset.form || "mythic";
      const hasTreasure = item.dataset.treasure === "1";
      if (!id) return;
      if (level <= 0) return;
      json[id] = {
        level,
        treasure: (form === "mythic") ? !!hasTreasure : false,
        form: (form === "immortal") ? "immortal" : "mythic",
      };
    });
    draft.mythic_state = json;
    setDirty(true);
  }


  function onClickUnitItem(id) {
    if (!multiSelectMode) {
      selectedUnitIds = new Set([id]);
    } else {
      if (selectedUnitIds.has(id)) selectedUnitIds.delete(id);
      else selectedUnitIds.add(id);
    }
    refreshSelectedVisual();
  }

  function refreshSelectedVisual() {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    if (!grid) return;
    grid.querySelectorAll(".unit-item").forEach((item) => {
      const id = item.dataset.id;
      if (selectedUnitIds.has(id)) item.classList.add("selected");
      else item.classList.remove("selected");
    });
  }

  function updateUnitVisual(item) {
    const level = parseInt(item.dataset.level || "0", 10);
    let hasTreasure = item.dataset.treasure === "1";
    const form = item.dataset.form || "mythic";
    const badge = item.querySelector(".unit-badge");
    if (!badge) return;

    // enforce treasure constraints: mythic only, and level>=12
    if (form !== "mythic" || level < 12) {
      hasTreasure = false;
      item.dataset.treasure = "0";
    }

    // background tint per spec
    const lv = level;
    if (lv <= 0) {
      item.style.background = "rgba(255,255,255,0.02)";
    } else if (form === "mythic") {
      if (lv === 6) item.style.background = "rgba(80,140,255,0.10)";
      else if (lv === 12) item.style.background = "rgba(80,140,255,0.16)";
      else item.style.background = "rgba(80,140,255,0.22)"; // 15
    } else {
      if (lv === 6) item.style.background = "rgba(255,80,120,0.144)";
      else if (lv === 12) item.style.background = "rgba(255,80,120,0.22)";
      else item.style.background = "rgba(255,80,120,0.30)"; // 15
    }

    if (level <= 0) {
      item.classList.add("dim");
      badge.textContent = "";
      badge.classList.remove("has-treasure");
    } else {
      item.classList.remove("dim");
      let txt = String(level);
      if (form === "mythic" && hasTreasure) txt += "専財";
      badge.textContent = txt;
      badge.classList.toggle('has-treasure', (form === 'mythic' && hasTreasure));
    }
  }

  function applyLevelToSelection(level) {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    if (!grid) return;
    if (selectedUnitIds.size === 0) {
      showToast("ユニットが選択されていません。");
      return;
    }
    selectedUnitIds.forEach((id) => {
      const item = grid.querySelector('.unit-item[data-id="' + id + '"]');
      if (!item) return;
      item.dataset.level = String(level);
      // treasure rule: if level < 12, force off
      if (parseInt(item.dataset.level, 10) < 12) item.dataset.treasure = "0";
      updateUnitVisual(item);
    });
    syncDraftFromMythicGrid();
  }

  
  function selectAwakableAll() {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    if (!grid) return;
    const awakable = mythicCodes.filter((c) => mythicToImmortal.has(c));
    if (awakable.length === 0) {
      showToast("覚醒可能なユニットがありません。");
      return;
    }
    multiSelectMode = true;
    if (mythicBtnMulti) mythicBtnMulti.textContent = "複数選択: ON";
    selectedUnitIds = new Set(awakable.map((x)=>String(x)));
    refreshSelectedVisual();
  }

function toggleTreasureOnSelection() {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    if (!grid) return;
    if (selectedUnitIds.size === 0) {
      showToast("ユニットが選択されていません。");
      return;
    }
    selectedUnitIds.forEach((id) => {
      const item = grid.querySelector('.unit-item[data-id="' + id + '"]');
      if (!item) return;
      const form = item.dataset.form || "mythic";
      const level = parseInt(item.dataset.level || "0", 10);

      // immortal: treasure always off
      if (form === "immortal") {
        item.dataset.treasure = "0";
        updateUnitVisual(item);
        return;
      }
      // level gate
      if (level < 12) {
        item.dataset.treasure = "0";
        updateUnitVisual(item);
        return;
      }
      const current = item.dataset.treasure === "1";
      item.dataset.treasure = current ? "0" : "1";
      updateUnitVisual(item);
    });
    syncDraftFromMythicGrid();
  }

  function toggleFormAwakening() {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    if (!grid) return;
    if (selectedUnitIds.size === 0) {
      showToast("ユニットが選択されていません。");
      return;
    }
    selectedUnitIds.forEach((id) => {
      const item = grid.querySelector('.unit-item[data-id="' + id + '"]');
      if (!item) return;

      const mythicId = Number(item.dataset.id);
      let form = item.dataset.form || "mythic";
      let level = parseInt(item.dataset.level || "0", 10);

      if (form === "mythic") {
        // awaken only if mythic Lv15 and has immortal pair
        if (level !== 15) return;
        if (!hasImmortalPair(mythicId)) return;
        item.dataset.form = "immortal";
        item.dataset.level = "6"; // start immortal at Lv6
        item.dataset.treasure = "0";
      } else {
        // degenerate: immortal -> mythic Lv15 (user can then loop/toggle)
        item.dataset.form = "mythic";
        item.dataset.level = "15";
        // treasure remains off by default after returning
        item.dataset.treasure = "0";
      }

      // refresh image
      const img = item.querySelector("img");
      if (img) {
        const displayCode = (item.dataset.form === "immortal")
          ? (immortalCodeFor(mythicId) ?? mythicId)
          : mythicId;
        img.src = iconUrlForCode(displayCode);
      }

      updateUnitVisual(item);
    });
    syncDraftFromMythicGrid();
  }

  function advanceUnitOnTap(item) {
    const mythicId = Number(item.dataset.id);
    let form = item.dataset.form || "mythic";
    let level = parseInt(item.dataset.level || "0", 10);

    if (form === "mythic") {
      if (level <= 0) level = 6;
      else if (level === 6) level = 12;
      else if (level === 12) level = 15;
      else {
        if (hasImmortalPair(mythicId)) {
          form = "immortal";
          level = 6;
        } else {
          form = "mythic";
          level = 0;
        }
        item.dataset.treasure = "0";
      }
    } else {
      if (level <= 0) level = 6;
      else if (level === 6) level = 12;
      else if (level === 12) level = 15;
      else {
        form = "mythic";
        level = 0;
        item.dataset.treasure = "0";
      }
    }

    item.dataset.form = form;
    item.dataset.level = String(level);

    const img = item.querySelector("img");
    if (img) {
      const displayCode = (form === "immortal") ? (immortalCodeFor(mythicId) ?? mythicId) : mythicId;
      img.src = iconUrlForCode(displayCode);
    }

    updateUnitVisual(item);
  }


  function collectMythicStateFromUI() {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    const json = {};
    if (!grid) return json;
    grid.querySelectorAll(".unit-item").forEach((item) => {
      const id = item.dataset.id;
      const level = parseInt(item.dataset.level || "0", 10);
      const hasTreasure = item.dataset.treasure === "1";
      const form = item.dataset.form || "mythic";
      if (level <= 0) return; // omit defaults
      json[id] = {
        level,
        treasure: (form === "mythic") ? !!hasTreasure : false,
        form: (form === "immortal") ? "immortal" : "mythic"
      };
    });
    return json;
  }

  async function openMythicSubmodal() {
    if (mythicError) mythicError.textContent = "";
    lastFocusReturnEl = document.activeElement;

    await loadUnitMaster();

    // create local copy from main draft into grid (render reads draft.mythic_state)
    multiSelectMode = false;
    selectedUnitIds = new Set();

    buildMythicControls();
    renderMythicGridFromDraft();

    if (mythicBackdrop) mythicBackdrop.setAttribute("aria-hidden", "false");
    openBackdrop(mythicBackdrop);

    // focus close for accessibility
    setTimeout(() => { try { btnMythicClose?.focus(); } catch(e){} }, 0);
  }

  function closeMythicSubmodal() {
    if (!mythicBackdrop) return;

    // move focus out BEFORE hiding (fixes aria-hidden warning + "won't close" edge cases)
    try {
      btnMythicOk?.blur?.();
      btnMythicClose?.blur?.();
      lastFocusReturnEl?.focus?.();
    } catch(e){}

    closeBackdrop(mythicBackdrop);
    if (mythicBackdrop) mythicBackdrop.setAttribute("aria-hidden", "true");
  }

  // ===== Main flow: click register/edit -> open info modal =====
  async function registerUser(name, pass) {
    return await rpc("ld_register", { p_username: name, p_pass: pass });
  }
  async function getUserData(name, pass) {
    return await rpc("ld_get_user_data", { p_username: name, p_pass: pass });
  }

  async function enterFlow() {
    if (!supabaseReady) {
      showToast("Supabase設定が未完です");
      return;
    }
    const name = safeTrim(userNameInput.value);
    const pass = safeTrim(userPassInput.value);
    if (!name) {
      showToast("ユーザー名を入力してください");
      return;
    }
    if (!pass) {
      showToast("パスを入力してください");
      return;
    }

    userActionBtn.disabled = true;
    try {
      if (lastExistsValue) {
        const data = await getUserData(name, pass);
        if (!data || data.ok !== true) {
          showToast("パスが違うか、取得できません");
          return;
        }
        setAuthStorage(name, pass, {
          userId: data.user_id ?? null,
          level: data.level ?? null,
          exp: data.exp ?? null,
          lockedUntil: data.locked_until ? new Date(data.locked_until).getTime() : 0,
        });
        fillInfoModalFromUser(data, "ユーザー情報 編集");
        openBackdrop(userInfoBackdrop);
      } else {
        const res = await registerUser(name, pass);
        if (!res || res.ok !== true) {
          showToast("登録に失敗しました");
          return;
        }
        setAuthStorage(name, pass, { userId: res.user_id ?? null });
        const data2 = await getUserData(name, pass);
        if (data2 && data2.ok === true) {
          fillInfoModalFromUser(data2, "ユーザー情報 初期設定");
        } else {
          // fallback minimal
          fillInfoModalFromUser({
            ok:true, name, vault_level:1, mythic_state:{}, created_at:null, updated_at:null, level:1,
            comment_count:0, like_count:0, mis_input_count:0
          }, "ユーザー情報 初期設定");
        }
        openBackdrop(userInfoBackdrop);
      }
    } catch (e) {
      console.error(e);
      showToast(String(e.message || e));
    } finally {
      userActionBtn.disabled = false;
      setActionButtonLabel();
    }
  }

  // ===== Save (updated_at should update on save) =====
  async function saveUserDataV2(payload) {
    // try v2 first
    try {
      return await rpc("ld_update_user_data_v2", payload);
    } catch (e) {
      // if function missing, fall back to old name
      if (String(e.message || "").includes("Could not find the function") || e.status === 404) {
        return await rpc("ld_update_user_data", payload);
      }
      throw e;
    }
  }

  async function onSaveAndClose() {
    if (!currentUser) return;
    pullInputsToDraft();
    const errMsg = validateOtherInfo();
    if (errMsg) {
      setUserInfoError(errMsg);
      showToast("入力内容を確認してください");
      return;
    }

    setUserInfoError("");
    btnUserInfoSave.disabled = true;

    const name = safeTrim(userNameInput.value);
    const pass = safeTrim(userPassInput.value);

    const payload = {
      p_username: name,
      p_pass: pass,
      p_vault_level: draft.vault_level,
      p_mythic_state: draft.mythic_state,
      // optional extras (RPC may or may not accept; v2 should)
      p_game_player_name: draft.game_player_name,
      p_game_player_level: draft.game_player_level,
      p_guild_name: draft.guild_name,
      p_guild_code: draft.guild_code,
    };

    try {
      const res = await saveUserDataV2(payload);
      if (res && res.ok === true) {
        showToast("保存しました");
        // Refresh timestamps by re-fetching (ensures updated_at reflects save)
        try {
          const data = await getUserData(name, pass);
          if (data && data.ok === true) {
            fillInfoModalFromUser(data, userInfoTitle?.textContent || "ユーザー情報");
          }
        } catch (_) {}
        closeBackdrop(userInfoBackdrop);
        // Keep username/pass (do not clear)
      } else {
        const reason = res?.reason ? String(res.reason) : "";
        let msg = "保存に失敗しました";
        if (reason === "check_violation") {
          msg = "入力内容が制約に合いません。プレイヤーレベル（1〜30）やギルドコード形式（# + 8桁16進）を確認してください";
          const otherToggle = document.getElementById("accOtherToggle");
          otherToggle?.classList.add("error");
        } else if (reason === "not_null_violation") {
          msg = "必須項目が未入力です";
        } else if (reason === "password_incorrect") {
          msg = "パスが正しくありません";
        } else if (reason === "user_not_found") {
          msg = "ユーザーが見つかりません";
        } else if (reason) {
          msg = reason;
        }
        setUserInfoError(msg);
        showToast("保存に失敗しました");
      }
    } catch (e) {
      console.error(e);
      setUserInfoError(String(e.message || e));
      showToast("保存に失敗しました");
    } finally {
      btnUserInfoSave.disabled = false;
      setDirty(false);
    }
  }

  function maybeCloseInfoModal() {
    if (!dirty) {
      closeBackdrop(userInfoBackdrop);
      return;
    }
    const ok = window.confirm("変更を破棄して戻りますか？");
    if (ok) closeBackdrop(userInfoBackdrop);
  }

  // ===== Clipboard paste for guild code =====
  async function pasteGuildCode() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        showToast("貼り付けはこの環境では使えません");
        return;
      }
      const t = await navigator.clipboard.readText();
      if (!t) {
        showToast("クリップボードが空です");
        return;
      }
      let code = safeTrim(t);
      if (!code.startsWith("#")) code = "#" + code;
      code = "#" + code.slice(1).toUpperCase();
      if (inpGuildCode) inpGuildCode.value = code;
      setDirty(true);
    } catch (e) {
      showToast("貼り付けに失敗しました");
    }
  }

  // ===== init =====
  function init() {
    // notice mirror
    const modalNotice = $("modalNoticeText");
    if (modalNotice) modalNotice.innerHTML = NOTICE_HTML;

    // Pass inputs -> modal buttons
    ensurePassButton(userPassInput, "userPassBtn");
    syncPassButton("userPassBtn", userPassInput, userPassInput.placeholder);

    // initial state
    userPassInput.disabled = true;
    updatePassButtonVisual();
    setActionButtonLabel();

    userNameInput.addEventListener("input", () => {
      scheduleExistsCheck();
      updatePassButtonVisual();
      setActionButtonLabel();
    });
    userPassInput.addEventListener("input", () => {
      syncPassButton("userPassBtn", userPassInput, userPassInput.placeholder);
      updatePassButtonVisual();
      setActionButtonLabel();
    });

    userActionBtn.addEventListener("click", enterFlow);

    // info modal events
    btnUserInfoClose?.addEventListener("click", maybeCloseInfoModal);
    userInfoBackdrop?.addEventListener("click", (e) => {
      if (e.target === userInfoBackdrop) maybeCloseInfoModal();
    });
    btnUserInfoSave?.addEventListener("click", onSaveAndClose);

    btnVaultMinus?.addEventListener("click", () => setVaultLevel((draft.vault_level || 1) - 1));
    btnVaultPlus?.addEventListener("click", () => setVaultLevel((draft.vault_level || 1) + 1));

    btnOpenMythicSubmodal?.addEventListener("click", openMythicSubmodal);

    accOtherToggle?.addEventListener("click", () => {
      const open = !accOtherBody.classList.contains("open");
      setAccordion(accOtherToggle, accOtherBody, open);
    });
    accFutureToggle?.addEventListener("click", () => {
      const open = !accFutureBody.classList.contains("open");
      setAccordion(accFutureToggle, accFutureBody, open);
    });

    inpGamePlayerName?.addEventListener("input", () => setDirty(true));
    inpGamePlayerLevel?.addEventListener("input", () => setDirty(true));
    inpGuildName?.addEventListener("input", () => setDirty(true));
    inpGuildCode?.addEventListener("input", () => setDirty(true));
    btnPasteGuildCode?.addEventListener("click", pasteGuildCode);

    // mythic submodal events
    btnMythicClose?.addEventListener("click", () => closeMythicSubmodal());
    mythicBackdrop?.addEventListener("click", (e) => {
      if (e.target === mythicBackdrop) closeMythicSubmodal();
    });
    btnMythicOk?.addEventListener("click", () => {
      // apply UI -> draft
      draft.mythic_state = collectMythicStateFromUI();
      setDirty(true);
      closeBackdrop(mythicBackdrop);
      showToast("育成情報を反映しました");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();


// ===== Epic15 stepper (UI-only scaffold; RPC hookup later) =====
(function setupEpic15Stepper(){
  const btnEpic15Minus = document.getElementById("btnEpic15Minus");
  const btnEpic15Plus  = document.getElementById("btnEpic15Plus");
  const lblEpic15Count = document.getElementById("lblEpic15Count");
  if(!btnEpic15Minus || !btnEpic15Plus || !lblEpic15Count) return;

  const clamp = (v)=> Math.max(0, Math.min(5, (v|0)));
  const render = ()=>{ lblEpic15Count.textContent = String(epic15Count); };
  render();

  btnEpic15Minus.addEventListener("click", ()=>{ epic15Count = clamp(epic15Count-1); render(); });
  btnEpic15Plus.addEventListener("click",  ()=>{ epic15Count = clamp(epic15Count+1); render(); });
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
