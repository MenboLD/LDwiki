// ld_users.js (20251221ab) - ld_users: register/edit -> info modal + mythic submodal (image grid)
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

    btn.disabled = false; // keep clickable; state handled by label/logic

    btn.addEventListener("click", (e) => {
      e.preventDefault();

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
    btn.disabled = false; // keep clickable; state handled by label/logic
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

  function pullInputsToDraft() {
    draft.game_player_name = safeTrim(inpGamePlayerName?.value || "");
    draft.guild_name = safeTrim(inpGuildName?.value || "");
    draft.guild_code = safeTrim(inpGuildCode?.value || "");
    const lvlRaw = safeTrim(inpGamePlayerLevel?.value || "");
    draft.game_player_level = lvlRaw ? Number(lvlRaw) : null;
  }

  function validateOtherInfo() {
    // player level
    if (draft.game_player_level !== null) {
      const n = Number(draft.game_player_level);
      if (!Number.isFinite(n) || n < 1 || n > 30) return "プレイヤーレベルは1〜30で入力してください";
    }
    // guild code
    if (draft.guild_code) {
      let code = draft.guild_code;
      if (!code.startsWith("#")) code = "#" + code;
      // normalize to uppercase
      code = "#" + code.slice(1).toUpperCase();
      draft.guild_code = code;
      if (!/^#[0-9A-F]{8}$/.test(code)) return "所属ギルドコードの形式が不正です（例：#1A2B3C4D）";
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

    if (userInfoError) userInfoError.textContent = "";
    setDirty(false);
    // default: other/future accordion closed
    setAccordion(accOtherToggle, accOtherBody, false);
    setAccordion(accFutureToggle, accFutureBody, false);
  }


  // ===== Mythic submodal (image grid) =====
  const mythicBackdrop = $("mythicBackdrop");
  const btnMythicClose = $("btnMythicClose");
  const btnMythicOk = $("btnMythicOk");
  const mythicControls = $("mythicControls");
  const mythicGridHost = $("mythicGrid");
  const mythicError = $("mythicError");

  // Unit master cache (from ld_units_master)
  const ASSET_BASE_URL = (() => {
    // Prefer SUPABASE_URL if available; fallback to hardcoded storage origin.
    try {
      if (typeof SUPABASE_URL === "string" && SUPABASE_URL) {
        return SUPABASE_URL.replace(/\/+$/,"") + "/storage/v1/object/public/ld-assets/";
      }
    } catch(e){}
    return "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld-assets/";
  })();

  let unitMasterLoaded = false;
  let mythicCodes = [];                 // [501..] (dynamic)
  let codeToIconBig = new Map();        // code -> icon_big_filename (e.g. "501_big")
  let mythicToImmortal = new Map();     // mythic_code -> immortal_code (via paired_mythic_code on immortal rows)

  async function loadUnitMasterIfNeeded() {
    if (unitMasterLoaded) return true;
    if (!supabaseReady) return false;

    try {
      const url =
        SUPABASE_URL.replace(/\/+$/,"") +
        "/rest/v1/ld_units_master" +
        "?select=code,icon_big_filename,paired_mythic_code" +
        "&code=gte.500&code=lt.700" +
        "&order=code.asc";

      const res = await fetch(url, {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY
        }
      });

      if (!res.ok) throw new Error("ld_units_master fetch failed: " + res.status);

      const rows = await res.json();
      const myth = [];
      const iconMap = new Map();
      const pairMap = new Map();

      for (const r of rows) {
        const code = Number(r.code);
        if (!Number.isFinite(code)) continue;

        if (r.icon_big_filename) iconMap.set(code, String(r.icon_big_filename));

        // mythic codes
        if (code >= 500 && code < 600) myth.push(code);

        // immortal pairing: immortal row has paired_mythic_code = 5xx
        if (code >= 600 && code < 700 && r.paired_mythic_code != null) {
          const m = Number(r.paired_mythic_code);
          if (Number.isFinite(m)) pairMap.set(m, code);
        }
      }

      mythicCodes = myth.filter(c => c >= 501).sort((a,b)=>a-b);
      codeToIconBig = iconMap;
      mythicToImmortal = pairMap;

      unitMasterLoaded = true;
      return true;
    } catch (e) {
      console.warn("[ldwiki] loadUnitMaster failed", e);
      if (mythicError) mythicError.textContent = "ユニット情報の取得に失敗しました（通信/設定）";
      unitMasterLoaded = false;
      return false;
    }
  }

  function iconUrlForCode(code) {
    const key = codeToIconBig.get(code);
    // icon_big_filename is "xxx_big" (without .png) per current schema
    if (key) return ASSET_BASE_URL + key + ".png";
    // fallback: use code_big.png
    return ASSET_BASE_URL + String(code) + "_big.png";
  }

  // --- mythic_state draft editing (submodal local copy) ---
  let mythicDraft = {}; // keyed by mythic code string
  let multiSelectMode = false;
  let selectedMythic = new Set(); // mythic code strings
  let lastFocusReturnEl = null;

  function cloneJson(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : {};
  }

  function getEntry(mythicCodeStr) {
    const m = Number(mythicCodeStr);
    const def = { code: m, form: "mythic", level: 0, treasure: false };
    const e = mythicDraft?.[mythicCodeStr];
    if (!e || typeof e !== "object") return def;

    const code = Number(e.code);
    const form = (e.form === "immortal") ? "immortal" : "mythic";
    const level = Number(e.level || 0);
    const treasure = !!e.treasure;

    return {
      code: Number.isFinite(code) ? code : m,
      form,
      level: Number.isFinite(level) ? level : 0,
      treasure
    };
  }

  function setEntry(mythicCodeStr, entry) {
    mythicDraft[mythicCodeStr] = {
      code: entry.code,
      form: entry.form,
      level: entry.level,
      treasure: !!entry.treasure
    };
  }

  function normalizeEntry(mythicCodeStr, entry) {
    const mythCode = Number(mythicCodeStr);
    const hasPair = mythicToImmortal.has(mythCode);

    // enforce treasure rules: only mythic + level>=12; and never on immortal
    if (entry.form !== "mythic") entry.treasure = false;
    if (entry.form === "mythic" && entry.level < 12) entry.treasure = false;

    // ensure code matches form
    if (entry.form === "mythic") entry.code = mythCode;
    if (entry.form === "immortal") {
      const im = mythicToImmortal.get(mythCode);
      entry.code = im ?? entry.code;
    }

    // level allowed set {0,6,12,15} for v1
    const allowed = new Set([0,6,12,15]);
    if (!allowed.has(entry.level)) {
      // snap to nearest
      if (entry.level <= 0) entry.level = 0;
      else if (entry.level < 9) entry.level = 6;
      else if (entry.level < 14) entry.level = 12;
      else entry.level = 15;
    }

    // if immortal form but no pair exists, force back to mythic unowned
    if (entry.form === "immortal" && !hasPair) {
      entry.form = "mythic";
      entry.code = mythCode;
      entry.level = 0;
      entry.treasure = false;
    }
    return entry;
  }

  function bgFor(entry) {
    // subtle tints per spec
    const lv = entry.level;
    const isMythic = entry.form === "mythic";
    if (lv <= 0) return "rgba(255,255,255,0.02)";
    if (isMythic) {
      if (lv === 6) return "rgba(80,140,255,0.10)";
      if (lv === 12) return "rgba(80,140,255,0.16)";
      return "rgba(80,140,255,0.22)"; // 15
    } else {
      if (lv === 6) return "rgba(255,80,120,0.10)";
      if (lv === 12) return "rgba(255,80,120,0.16)";
      return "rgba(255,80,120,0.22)"; // 15
    }
  }

  function badgeText(entry) {
    const lv = entry.level;
    if (lv <= 0) return "未取得";
    const t = entry.treasure ? "👑" : "";
    // keep "Lv" style for clarity
    return "Lv" + String(lv) + t;
  }

  function cycleEntry(mythicCodeStr) {
    const mythCode = Number(mythicCodeStr);
    const hasPair = mythicToImmortal.has(mythCode);
    let e = getEntry(mythicCodeStr);

    if (e.form === "mythic") {
      if (e.level <= 0) e.level = 6;
      else if (e.level === 6) e.level = 12;
      else if (e.level === 12) e.level = 15;
      else if (e.level === 15) {
        if (hasPair) {
          e.form = "immortal";
          e.level = 6;
          e.treasure = false;
          e.code = mythicToImmortal.get(mythCode);
        } else {
          e.level = 0;
          e.treasure = false;
          e.form = "mythic";
          e.code = mythCode;
        }
      } else {
        e.level = 0;
        e.treasure = false;
      }
    } else {
      // immortal
      if (e.level <= 0) e.level = 6;
      else if (e.level === 6) e.level = 12;
      else if (e.level === 12) e.level = 15;
      else if (e.level === 15) {
        // loop back to mythic unowned
        e.form = "mythic";
        e.code = mythCode;
        e.level = 0;
        e.treasure = false;
      } else {
        e.form = "mythic";
        e.code = mythCode;
        e.level = 0;
        e.treasure = false;
      }
    }

    e = normalizeEntry(mythicCodeStr, e);
    setEntry(mythicCodeStr, e);
  }

  function applyLevelToSelected(level) {
    const lv = Number(level);
    selectedMythic.forEach((k) => {
      let e = getEntry(k);
      e.level = lv;
      e = normalizeEntry(k, e);
      setEntry(k, e);
    });
  }

  function toggleTreasureSelected() {
    selectedMythic.forEach((k) => {
      let e = getEntry(k);
      // only mythic & level>=12
      if (e.form !== "mythic") return;
      if (e.level < 12) return;
      e.treasure = !e.treasure;
      e = normalizeEntry(k, e);
      setEntry(k, e);
    });
  }

  function toggleAwakenSelected() {
    selectedMythic.forEach((k) => {
      const mythCode = Number(k);
      const pair = mythicToImmortal.get(mythCode);
      let e = getEntry(k);

      if (e.form === "mythic") {
        // awaken: only if Lv15 and pair exists
        if (e.level === 15 && pair) {
          e.form = "immortal";
          e.code = pair;
          e.level = 6;
          e.treasure = false;
        }
      } else {
        // degenerate back to mythic Lv15
        e.form = "mythic";
        e.code = mythCode;
        e.level = 15;
        e.treasure = false;
      }

      e = normalizeEntry(k, e);
      setEntry(k, e);
    });
  }

  function buildMythicControls() {
    if (!mythicControls) return;
    mythicControls.innerHTML = "";

    const row1 = document.createElement("div");
    row1.className = "mythic-row";
    const row2 = document.createElement("div");
    row2.className = "mythic-row";

    function mkBtn(label, onClick) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn-small";
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    }

    const btnSelAll = mkBtn("全選択", () => {
      selectedMythic = new Set(mythicCodes.map(c => String(c)));
      refreshSelectedVisual();
    });
    const btnSelClear = mkBtn("選択解除", () => {
      selectedMythic = new Set();
      refreshSelectedVisual();
    });
    const btnMulti = mkBtn("複数選択: OFF", () => {
      multiSelectMode = !multiSelectMode;
      btnMulti.textContent = "複数選択: " + (multiSelectMode ? "ON" : "OFF");
      // when turning OFF, keep at most one selection
      if (!multiSelectMode && selectedMythic.size > 1) {
        const first = selectedMythic.values().next().value;
        selectedMythic = new Set(first ? [first] : []);
        refreshSelectedVisual();
      }
    });

    row1.appendChild(btnSelAll);
    row1.appendChild(btnSelClear);
    row1.appendChild(btnMulti);

    row2.appendChild(mkBtn("Lv6", () => { applyLevelToSelected(6); renderMythicGridFromDraft(); setDirty(true); }));
    row2.appendChild(mkBtn("Lv12", () => { applyLevelToSelected(12); renderMythicGridFromDraft(); setDirty(true); }));
    row2.appendChild(mkBtn("Lv15", () => { applyLevelToSelected(15); renderMythicGridFromDraft(); setDirty(true); }));
    row2.appendChild(mkBtn("専用👑切替", () => { toggleTreasureSelected(); renderMythicGridFromDraft(); setDirty(true); }));
    row2.appendChild(mkBtn("覚醒/退化", () => { toggleAwakenSelected(); renderMythicGridFromDraft(); setDirty(true); }));

    mythicControls.appendChild(row1);
    mythicControls.appendChild(row2);
  }

  function renderMythicGridFromDraft() {
    if (!mythicGridHost) return;
    mythicGridHost.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "unit-grid";

    mythicCodes.forEach((codeNum) => {
      const k = String(codeNum);
      const entry = normalizeEntry(k, getEntry(k));

      const item = document.createElement("div");
      item.className = "unit-item";
      item.dataset.mythic = k;

      const inner = document.createElement("div");
      inner.className = "unit-inner";

      const img = document.createElement("img");
      img.alt = k;
      img.loading = "lazy";
      img.src = iconUrlForCode(entry.code);
      img.onerror = () => {
        // keep blank but avoid noisy console
        img.onerror = null;
        img.src = "";
      };

      const badge = document.createElement("div");
      badge.className = "unit-badge";
      badge.textContent = badgeText(entry);

      inner.appendChild(img);
      inner.appendChild(badge);

      item.appendChild(inner);

      // visuals
      if (entry.level <= 0) item.classList.add("dim");
      item.style.background = bgFor(entry);

      item.addEventListener("click", () => {
        if (multiSelectMode) {
          if (selectedMythic.has(k)) selectedMythic.delete(k);
          else selectedMythic.add(k);
        } else {
          selectedMythic = new Set([k]);
          // tap cycles state in single-select mode (per spec)
          cycleEntry(k);
          setDirty(true);
        }
        renderMythicGridFromDraft();
      });

      grid.appendChild(item);
    });

    mythicGridHost.appendChild(grid);

    refreshSelectedVisual();
  }

  function refreshSelectedVisual() {
    const grid = mythicGridHost?.querySelector(".unit-grid");
    if (!grid) return;
    grid.querySelectorAll(".unit-item").forEach((item) => {
      const k = item.dataset.mythic;
      if (k && selectedMythic.has(k)) item.classList.add("selected");
      else item.classList.remove("selected");
    });
  }

  function closeMythicSubmodal() {
    if (!mythicBackdrop) return;

    // move focus out BEFORE hiding (fixes aria-hidden warning + "won't close" edge cases)
    try {
      if (btnMythicOk) btnMythicOk.blur();
      if (btnMythicClose) btnMythicClose.blur();
      if (lastFocusReturnEl && typeof lastFocusReturnEl.focus === "function") lastFocusReturnEl.focus();
    } catch(e){}

    closeBackdrop(mythicBackdrop);
    if (mythicBackdrop) mythicBackdrop.setAttribute("aria-hidden", "true");
  }

  async function openMythicSubmodal() {
    if (mythicError) mythicError.textContent = "";
    const ok = await loadUnitMasterIfNeeded();
    if (!ok) return;

    // remember focus return
    lastFocusReturnEl = document.activeElement;

    // create local copy from main draft
    mythicDraft = cloneJson(draft.mythic_state || {});
    multiSelectMode = false;
    selectedMythic = new Set();

    buildMythicControls();
    renderMythicGridFromDraft();

    if (mythicBackdrop) mythicBackdrop.setAttribute("aria-hidden", "false");
    openBackdrop(mythicBackdrop);

    // focus close for accessibility
    setTimeout(() => { try { btnMythicClose?.focus(); } catch(e){} }, 0);
  }

  if (btnMythicClose) {
    btnMythicClose.addEventListener("click", () => {
      closeMythicSubmodal();
    });
  }

  if (btnMythicOk) {
    btnMythicOk.addEventListener("click", () => {
      // commit to main draft
      draft.mythic_state = cloneJson(mythicDraft);
      setDirty(true);
      closeMythicSubmodal();
    });
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
    // v2 is the primary (includes other game info fields)
    try {
      return await rpc("ld_update_user_data_v2", payload);
    } catch (e) {
      // If v2 is missing, fall back to legacy function with legacy args only.
      const msg = String(e?.message || "");
      if (msg.includes("Could not find the function") || e?.status === 404) {
        const legacy = {
          p_username: payload.p_username,
          p_pass: payload.p_pass,
          p_vault_level: payload.p_vault_level,
          p_mythic_state: payload.p_mythic_state
        };
        return await rpc("ld_update_user_data", legacy);
      }
      throw e;
    }
  }
      throw e;
    }
  }

  async function onSaveAndClose() {
    if (!currentUser) return;
    pullInputsToDraft();
    const errMsg = validateOtherInfo();
    if (errMsg) {
      if (userInfoError) userInfoError.textContent = errMsg;
      showToast("入力内容を確認してください");
      return;
    }

    if (userInfoError) userInfoError.textContent = "";
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
        const reason = res?.reason ? String(res.reason) : "保存に失敗しました";
        if (userInfoError) userInfoError.textContent = reason;
        showToast("保存に失敗しました");
      }
    } catch (e) {
      console.error(e);
      if (userInfoError) userInfoError.textContent = String(e.message || e);
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
    btnMythicClose?.addEventListener("click", () => closeMythicSubmodal(false));
    mythicBackdrop?.addEventListener("click", (e) => {
      if (e.target === mythicBackdrop) closeMythicSubmodal(false);
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
