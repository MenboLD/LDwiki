
// ===== v1.0.3 (UI refresh) header auth helpers =====
const authState = {
  userCache: new Map(),
  nameCheckTimer: null,
  lockKeyPrefix: "ld_users_editor_lock:",
};

function _charWidth(ch){
  const code = ch.codePointAt(0) || 0;
  if (code >= 0x20 && code <= 0x7E) return 1;       // ASCII
  if (code >= 0xFF61 && code <= 0xFF9F) return 1;   // halfwidth kana
  return 2;
}
function visualWidth(str){
  let w = 0;
  for (const ch of (str || "")) w += _charWidth(ch);
  return w;
}
function isValidNameTag(name, tag){
  const n = (name || "").trim();
  const t = (tag || "").trim();
  if (!n || !t) return false;
  return visualWidth(n) <= 16 && visualWidth(t) <= 10;
}
function getLockUntil(name){
  const n = (name || "").trim();
  if (!n) return 0;
  const raw = localStorage.getItem(authState.lockKeyPrefix + n);
  const until = raw ? Number(raw) : 0;
  return Number.isFinite(until) ? until : 0;
}
function setLockMinutes(name, minutes=3){
  const n = (name || "").trim();
  if (!n) return;
  localStorage.setItem(authState.lockKeyPrefix + n, String(Date.now() + minutes*60*1000));
}
function lockRemainingMs(name){
  const until = getLockUntil(name);
  return Math.max(0, until - Date.now());
}


// ===== ユーザーデータ編集ページ：ユニット画像（GitHub Pages /images を参照） =====
/**
 * - 末尾は必ず *_big.png
 * - 615 の a/b 特例は本ページでは使わない（615_big.png を採用）
 * - code は "526" / "615" / "615_a" / "615b" 等が来てもOK（先頭3桁のみ採用）
 */
function getUserEditorIconUrl(code) {
  const raw = String(code || "").trim();
  if (!raw) return "";

  // 先頭の3桁だけ採用（615_a / 615b 等は 615 になる）
  const m = raw.match(/^(\d{3})/);
  const base3 = m ? m[1] : raw;

  // Supabase Storage public: ld-assets/unit_icons/{code}_big.png
  return `${SUPABASE_URL}/storage/v1/object/public/ld-assets/unit_icons/${base3}_big.png`;
}

function setImgSrcWithFallback(imgEl, filename) {
  const file = String(filename || "").trim();
  if (!file) { imgEl.src = ""; return; }
  const url = `${SUPABASE_URL}/storage/v1/object/public/ld-assets/unit_icons/${file}`;
  imgEl.src = url;
  imgEl.onerror = function () {
    imgEl.onerror = null;
    imgEl.src = "";
    imgEl.alt = "no image";
    imgEl.style.opacity = "0.35";
  };
}
// ===== /ユニット画像 =====

function getSupabaseCreateClient() {
  // UMD build provides window.supabase
  if (window.supabase && typeof window.supabase.createClient === "function") {
    return window.supabase.createClient;
  }
  return null;
}

const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";

let UNIT_ICON_BIG_BY_CODE = {};            // "528" -> "528_big.png"
let IMMORTAL_ICON_BIG_BY_MYTHIC = {};      // "514" -> "614_big.png"
let HAS_IMMORTAL_BY_MYTHIC = {};           // "514" -> true

async function loadUnitMasterMaps() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from("ld_units_master")
      .select("unit_code, icon_big_filename, paired_mythic_code");

    if (error || !Array.isArray(data)) return;

    const iconByCode = {};
    const immortalByMythic = {};
    const hasImm = {};

    for (const row of data) {
      const code = row.unit_code != null ? String(row.unit_code).trim() : "";
      const icon = row.icon_big_filename != null ? String(row.icon_big_filename).trim() : "";
      if (code && icon) iconByCode[code] = icon;

      const pairedRaw = row.paired_mythic_code != null ? String(row.paired_mythic_code).trim() : "";
      const paired = pairedRaw.replace(/\.0+$/,"");
      if (paired && icon) {
        immortalByMythic[paired] = icon;
        hasImm[paired] = true;
      }
    }

    UNIT_ICON_BIG_BY_CODE = iconByCode;
    IMMORTAL_ICON_BIG_BY_MYTHIC = immortalByMythic;
    HAS_IMMORTAL_BY_MYTHIC = hasImm;
  } catch (e) {}
}

function getBigIconFilenameByCode(code) {
  const c = String(code || "").trim().replace(/\.0+$/,"");
  return UNIT_ICON_BIG_BY_CODE[c] || `${c}_big.png`;
}

function getImmortalIconFilenameByMythic(mythicCode) {
  const m = String(mythicCode || "").trim().replace(/\.0+$/,"");
  // 1) unit_master の paired_mythic_code 由来のマップがあれば最優先
  if (IMMORTAL_ICON_BIG_BY_MYTHIC[m]) return IMMORTAL_ICON_BIG_BY_MYTHIC[m];

  // 2) 取れない場合は +100 フォールバック（例: 515 -> 615_big.png）
  const n = parseInt(m, 10);
  if (Number.isFinite(n)) return `${n + 100}_big.png`;

  // 3) どうしても数値化できない場合だけ原状維持
  return `${m}_big.png`;
}

    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

    const __createClient = getSupabaseCreateClient();
const supabase = __createClient ? __createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* =========================
 * RPC helpers (ld_users is RPC-only)
 * - expects RPCs from v3.1:
 *   ld_parse_username(p_username text)
 *   ld_register_user(p_username text, p_pass text)
 *   ld_login(p_username text, p_pass text)
 *   ld_save_userdata(p_username text, p_pass text, p_vault_level smallint, p_mythic_state jsonb)
 * - plus Stage: ld_get_userdata(p_username text, p_pass text) (optional but recommended)
 * ========================= */
function _unwrapOne(data){
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}
function _asLower(v){ return String(v ?? "").toLowerCase(); }
function _normalizeUntilMs(v){
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) {
    return v < 2e12 ? Math.floor(v * 1000) : Math.floor(v);
  }
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}
async function rpcTry(fn, args){
  if (!requireSupabase()) return { data: null, error: new Error("Supabase not ready") };
  return await supabase.rpc(fn, args);
}
function isUsernameWith2DigitTag(usernameRaw){
  const u = String(usernameRaw || "").trim();
  if (!u) return false;
  if (/#\d{2}$/.test(u)) return true;
  if (/\D\d{2}$/.test(u)) return true;
  return false;
}
async function rpcLogin(usernameRaw, pass){
  const { data, error } = await rpcTry("ld_login", { p_username: usernameRaw, p_pass: pass });
  if (error) return { ok:false, kind:"rpc_error", error };
  const row = _unwrapOne(data);
  if (!row) return { ok:false, kind:"empty" };
  const ok = row.ok === true || row.success === true;
  const msg = row.message ?? row.msg ?? row.status ?? "";
  const untilMs = _normalizeUntilMs(row.locked_until || row.lockedUntil);
  if (ok) return { ok:true, info: row };
  // message-based hint
  const m = _asLower(msg);
  if (m.includes("not found") || m.includes("no user") || m.includes("user_not_found")) {
    return { ok:false, kind:"not_found", lockedUntilMs: untilMs };
  }
  return { ok:false, kind: msg || "login_failed", lockedUntilMs: untilMs };
}
async function rpcRegister(usernameRaw, pass){
  const { data, error } = await rpcTry("ld_register_user", { p_username: usernameRaw, p_pass: pass });
  if (error) return { ok:false, kind:"rpc_error", error };
  const row = _unwrapOne(data);
  if (!row) return { ok:false, kind:"empty" };
  const ok = row.ok === true || row.success === true;
  return ok ? { ok:true, info: row } : { ok:false, kind: row.message || "register_failed" };
}
async function rpcSaveUserdata(usernameRaw, pass, vaultLevel, mythicState){
  const { data, error } = await rpcTry("ld_save_userdata", { p_username: usernameRaw, p_pass: pass, p_vault_level: vaultLevel, p_mythic_state: mythicState });
  if (error) return { ok:false, kind:"rpc_error", error };
  const row = _unwrapOne(data);
  if (!row) return { ok:false, kind:"empty" };
  const ok = row.ok === true || row.success === true;
  return ok ? { ok:true, info: row } : { ok:false, kind: row.message || "save_failed" };
}
async function rpcGetUserdata(usernameRaw, pass){
  // optional function (provided as separate SQL). If missing, caller can show message.
  const { data, error } = await rpcTry("ld_get_userdata", { p_username: usernameRaw, p_pass: pass });
  if (error) return { ok:false, kind:"rpc_error", error };
  const row = _unwrapOne(data);
  if (!row) return { ok:false, kind:"empty" };
  const ok = row.ok === true || row.success === true;
  return ok ? { ok:true, user: row } : { ok:false, kind: row.message || "get_failed", lockedUntilMs: _normalizeUntilMs(row.locked_until || row.lockedUntil) };
}





const BOARD_COMMENTS_TABLE = "ld_board_comments";

/**
 * 一覧表示用の統計を掲示板から補正して返す
 * comment_count: owner_name一致 & owner_tag一致（登録名★相当）
 * mis_input_total: ld_users.mis_input_count + owner_name一致 & owner_tag不一致（騙り相当）
 */
async function computeBoardStatsForUser(user) {
  const fallback = {
    comment_count: user.comment_count ?? 0,
    mis_input_total: user.mis_input_count ?? 0,
  };
  if (!supabase) return fallback;

  try {
    const { count: okCount, error: e1 } = await supabase
      .from(BOARD_COMMENTS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("owner_name", user.name)
      .eq("owner_tag", user.tag);

    if (e1) return fallback;

    const { count: fakeCount, error: e2 } = await supabase
      .from(BOARD_COMMENTS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("owner_name", user.name)
      .neq("owner_tag", user.tag);

    if (e2) {
      return { comment_count: okCount ?? fallback.comment_count, mis_input_total: fallback.mis_input_total };
    }

    return {
      comment_count: okCount ?? fallback.comment_count,
      mis_input_total: (fallback.mis_input_total ?? 0) + (fakeCount ?? 0),
    };
  } catch (e) {
    return fallback;
  }
}
function requireSupabase() {
  if (!supabase) {
    alert("Supabase クライアントの読み込みに失敗しました。\nネットワーク/キャッシュ、またはCDNブロックを確認してください。\n（UIは動きますが、検索・保存はできません）");
    return false;
  }
  return true;
}
    const appState = {
      mode: "home",
      currentUser: null,
      usersCount: null,
      auth: { usernameRaw: "", pass: "" },
    };

    const MYTHIC_IDS = [
      "501","502","503","504","505",
      "506","507","508","509","510",
      "511","512","513","514","515",
      "516","517","518","519","520",
      "521","522","523","524","525",
      "526","527","528"
    ];

    // 不滅への覚醒が存在する神話ID
    const AWAKENABLE_IDS = new Set([
      "501","502","504","506","509","511","513","514","515","516","525","526","527","528"
    ]);

    const ICON_BASE_PATH = "./"; // 例: "./mythic_icons/" に 501.png などを置く

    let multiSelectMode = false;
    let selectedUnitIds = new Set();

    function showToast(message, ms = 2000) {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, ms);
    }

    function setView(mode) {
      appState.mode = mode;
      const home = document.getElementById("homeView");
      const form = document.getElementById("formView");
      if (mode === "home") {
        home.classList.remove("hidden");
        form.classList.add("hidden");
      } else {
        home.classList.add("hidden");
        form.classList.remove("hidden");
      }
    }

    function lockEditingFor10Minutes() {
      const lockUntil = Date.now() + 10 * 60 * 1000;
      localStorage.setItem("ld_user_edit_lock_until", String(lockUntil));
    }

    function getEditLockRemainingMs() {
      const raw = localStorage.getItem("ld_user_edit_lock_until");
      if (!raw) return 0;
      const lockUntil = parseInt(raw, 10);
      const now = Date.now();
      return Math.max(0, lockUntil - now);
    }

    function checkEditLocked() {
      const remain = getEditLockRemainingMs();
      if (remain > 0) {
        const minutes = Math.ceil(remain / 60000);
        showToast(`誤入力が続いたため、あと約${minutes}分は編集できません。`, 2500);
        return true;
      }
      return false;
    }

    function formatStatsHeader() {
      const el = document.getElementById("headerStats");
      if (appState.usersCount == null) {
        el.textContent = "";
      } else {
        el.textContent = `登録数: ${appState.usersCount}`;
      }
    }

    async function fetchUsersCount() {
      // ld_users は RPC 専用化したため direct count は不可。
      appState.usersCount = null;
      formatStatsHeader();
    }

    // ユニットアイコンエディタ描画
    

function attachTapCycleHandler(item, id) {
  // 未選択タップ: 選択のみ / 選択済みタップ: 状態を1段階進める
  // スマホで2段階進む原因（touch→click二重発火）を避けるため、clickは使わず pointerup のみを採用する。
  item.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isSelected = item.classList.contains("selected");
    if (!isSelected) {
      selectOnlyUnitItem(id);
      return;
    }
    cycleUnitState(item);
  }, { passive: false });
}

// =====================
// 神話/不滅ユニットUI
//  state index:
//   1: Lv0(未所持)
//   2: 神話Lv6
//   3: 神話Lv12
//   4: 神話Lv15
//   5: 不滅Lv6
//   6: 不滅Lv12
//   7: 不滅Lv15
// =====================

function normalizeUnitId(id) {
  return String(id || "").trim().replace(/\.0+$/, "");
}

function isAwakenableMythic(id) {
  const key = normalizeUnitId(id);
  return !!(HAS_IMMORTAL_BY_MYTHIC[key] || AWAKENABLE_IDS.has(key));
}

function getUnitStateIndex(item) {
  const form = item.dataset.form === "immortal" ? "immortal" : "mythic";
  const level = parseInt(item.dataset.level || "0", 10);
  if (!Number.isFinite(level) || level <= 0) return 1;

  if (form === "immortal") {
    if (level >= 15) return 7;
    if (level >= 12) return 6;
    return 5;
  }

  if (level >= 15) return 4;
  if (level >= 12) return 3;
  return 2;
}

function getMaxStateIndex(item) {
  const id = normalizeUnitId(item.dataset.id);
  return isAwakenableMythic(id) ? 7 : 4;
}

function applyStateIndex(item, idx) {
  const i = Number(idx) || 1;
  if (i <= 1) {
    item.dataset.form = "mythic";
    item.dataset.level = "0";
    item.dataset.treasure = "0";
    return;
  }

  if (i === 2) { item.dataset.form = "mythic"; item.dataset.level = "6"; }
  else if (i === 3) { item.dataset.form = "mythic"; item.dataset.level = "12"; }
  else if (i === 4) { item.dataset.form = "mythic"; item.dataset.level = "15"; }
  else if (i === 5) { item.dataset.form = "immortal"; item.dataset.level = "6"; }
  else if (i === 6) { item.dataset.form = "immortal"; item.dataset.level = "12"; }
  else { item.dataset.form = "immortal"; item.dataset.level = "15"; }

  // 👑は状態3〜7のみ許可。状態1〜2に落ちた場合は自動でOFF。
  if (i < 3) item.dataset.treasure = "0";
}

function cycleStateOneStep(item) {
  const cur = getUnitStateIndex(item);
  const max = getMaxStateIndex(item);
  const next = (cur >= max) ? 1 : (cur + 1);
  applyStateIndex(item, next);
  updateUnitVisual(item);
}

function selectOnlyUnitItem(id) {
  selectedUnitIds = new Set([normalizeUnitId(id)]);
  refreshUnitSelectionVisual();
}

function toggleSelectUnitItem(id) {
  const key = normalizeUnitId(id);
  if (selectedUnitIds.has(key)) selectedUnitIds.delete(key);
  else selectedUnitIds.add(key);
  refreshUnitSelectionVisual();
}

function refreshUnitSelectionVisual() {
  const grid = document.querySelector("#mythicGrid .unit-grid");
  if (!grid) return;
  grid.querySelectorAll(".unit-item").forEach((item) => {
    const id = normalizeUnitId(item.dataset.id);
    item.classList.toggle("selected", selectedUnitIds.has(id));
  });
}

function updateUnitVisual(item) {
  const id = normalizeUnitId(item.dataset.id);
  const level = parseInt(item.dataset.level || "0", 10) || 0;

  // idx算出 + 👑矯正
  const idx = getUnitStateIndex(item);
  if (idx < 3 && item.dataset.treasure === "1") item.dataset.treasure = "0";
  const hasTreasure = item.dataset.treasure === "1";

  // state class
  item.classList.remove("state-1", "state-2", "state-3", "state-4", "state-5", "state-6", "state-7");
  item.classList.add(`state-${idx}`);

  // image
  const img = item.querySelector(".unit-img");
  if (img) {
    const filename = (idx >= 5) ? getImmortalIconFilenameByMythic(id) : getBigIconFilenameByCode(id);
    setImgSrcWithFallback(img, filename);
  }

  // badge
  const badge = item.querySelector(".unit-badge");
  if (badge) {
    if (idx === 1) {
      item.classList.add("dim");
      badge.textContent = "Lv0";
    } else {
      item.classList.remove("dim");
      const head = (idx >= 5) ? "不滅" : "Lv";
      let txt = `${head}${level}`;
      if (idx >= 3 && hasTreasure) txt += " 👑";
      badge.textContent = txt;
    }
  }
}

function applyLevelToSelection(level) {
  const grid = document.querySelector("#mythicGrid .unit-grid");
  if (!grid) return;
  if (selectedUnitIds.size === 0) {
    showToast("ユニットが選択されていません。");
    return;
  }

  const lv = parseInt(String(level), 10);
  if (![0, 6, 12, 15].includes(lv)) return;

  selectedUnitIds.forEach((id) => {
    const item = grid.querySelector(`.unit-item[data-id="${CSS.escape(id)}"]`);
    if (!item) return;
    if (lv === 0) {
      item.dataset.form = "mythic";
      item.dataset.level = "0";
      item.dataset.treasure = "0";
    } else {
      item.dataset.level = String(lv);
      // formは維持（神話/不滅）
    }
    updateUnitVisual(item);
  });
}

function toggleTreasureOnSelection() {
  const grid = document.querySelector("#mythicGrid .unit-grid");
  if (!grid) return;
  if (selectedUnitIds.size === 0) {
    showToast("ユニットが選択されていません。");
    return;
  }

  selectedUnitIds.forEach((id) => {
    const item = grid.querySelector(`.unit-item[data-id="${CSS.escape(id)}"]`);
    if (!item) return;
    const idx = getUnitStateIndex(item);
    if (idx < 3) {
      item.dataset.treasure = "0";
      updateUnitVisual(item);
      return;
    }
    item.dataset.treasure = (item.dataset.treasure === "1") ? "0" : "1";
    updateUnitVisual(item);
  });
}

function toggleFormAwakening() {
  const grid = document.querySelector("#mythicGrid .unit-grid");
  if (!grid) return;
  if (selectedUnitIds.size === 0) {
    showToast("ユニットが選択されていません。");
    return;
  }

  selectedUnitIds.forEach((id) => {
    const item = grid.querySelector(`.unit-item[data-id="${CSS.escape(id)}"]`);
    if (!item) return;
    if (!isAwakenableMythic(id)) return;

    const form = item.dataset.form === "immortal" ? "immortal" : "mythic";
    const level = parseInt(item.dataset.level || "0", 10) || 0;

    if (form === "mythic") {
      // 神話Lv15のみ覚醒可能
      if (level !== 15) {
        showToast("覚醒は神話Lv15でのみ可能です。", 2200);
        return;
      }
      item.dataset.form = "immortal";
      item.dataset.level = "6"; // 神話Lv15 → 不滅Lv6
    } else {
      // 退化は 不滅 → 神話Lv15
      item.dataset.form = "mythic";
      item.dataset.level = "15";
    }

    updateUnitVisual(item);
  });
}

function renderMythicGrid(mythicState) {
  const container = document.getElementById("mythicGrid");
  container.innerHTML = "";

  const state = mythicState && typeof mythicState === "object" ? mythicState : {};
  selectedUnitIds = new Set();
  multiSelectMode = false;

  const row1 = document.createElement("div");
  row1.className = "unit-controls-row";

  const btnAll = document.createElement("button");
  btnAll.className = "btn-small";
  btnAll.textContent = "全選択";
  btnAll.addEventListener("click", () => {
    selectedUnitIds = new Set(MYTHIC_IDS.map(normalizeUnitId));
    refreshUnitSelectionVisual();
  });

  const btnClear = document.createElement("button");
  btnClear.className = "btn-small";
  btnClear.textContent = "選択解除";
  btnClear.addEventListener("click", () => {
    selectedUnitIds = new Set();
    refreshUnitSelectionVisual();
  });

  const btnMulti = document.createElement("button");
  btnMulti.className = "btn-small";
  btnMulti.textContent = "複数選択:OFF";
  btnMulti.addEventListener("click", () => {
    multiSelectMode = !multiSelectMode;
    btnMulti.textContent = multiSelectMode ? "複数選択:ON" : "複数選択:OFF";
  });

  row1.appendChild(btnAll);
  row1.appendChild(btnClear);
  row1.appendChild(btnMulti);
  container.appendChild(row1);

  const row2 = document.createElement("div");
  row2.className = "unit-controls-row";

  const btnLv6 = document.createElement("button");
  btnLv6.className = "btn-small";
  btnLv6.textContent = "Lv6";
  btnLv6.addEventListener("click", () => applyLevelToSelection(6));

  const btnLv12 = document.createElement("button");
  btnLv12.className = "btn-small";
  btnLv12.textContent = "Lv12";
  btnLv12.addEventListener("click", () => applyLevelToSelection(12));

  const btnLv15 = document.createElement("button");
  btnLv15.className = "btn-small";
  btnLv15.textContent = "Lv15";
  btnLv15.addEventListener("click", () => applyLevelToSelection(15));

  const btnTreasure = document.createElement("button");
  btnTreasure.className = "btn-small";
  btnTreasure.textContent = "専用👑切替";
  btnTreasure.addEventListener("click", () => toggleTreasureOnSelection());

  const btnAwaken = document.createElement("button");
  btnAwaken.className = "btn-small";
  btnAwaken.textContent = "覚醒/退化";
  btnAwaken.addEventListener("click", () => toggleFormAwakening());

  row2.appendChild(btnLv6);
  row2.appendChild(btnLv12);
  row2.appendChild(btnLv15);
  row2.appendChild(btnTreasure);
  row2.appendChild(btnAwaken);
  container.appendChild(row2);

  const grid = document.createElement("div");
  grid.className = "unit-grid";

  MYTHIC_IDS.forEach((rawId) => {
    const id = normalizeUnitId(rawId);

    const item = document.createElement("div");
    item.className = "unit-item dim";
    item.dataset.id = id;
    item.dataset.level = "0";
    item.dataset.treasure = "0";
    item.dataset.form = "mythic";

    const inner = document.createElement("div");
    inner.className = "unit-inner";

    const img = document.createElement("img");
    img.className = "unit-img";
    img.alt = id;
    setImgSrcWithFallback(img, getBigIconFilenameByCode(id));

    const badge = document.createElement("div");
    badge.className = "unit-badge";
    badge.textContent = "Lv0";

    inner.appendChild(img);
    inner.appendChild(badge);
    item.appendChild(inner);
    grid.appendChild(item);

    const info = state[id];
    if (info && typeof info === "object") {
      const lv = Number.isFinite(info.level) ? info.level : 0;
      const form = info.form === "immortal" ? "immortal" : "mythic";
      const tre = info.treasure === true;
      item.dataset.form = form;
      item.dataset.level = String(lv);
      item.dataset.treasure = tre ? "1" : "0";
    }

    updateUnitVisual(item);

    // pointerup のみで処理（click 不使用）
    item.addEventListener("pointerup", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (multiSelectMode) {
        toggleSelectUnitItem(id);
        return;
      }

      const isSelected = item.classList.contains("selected");
      if (!isSelected) {
        selectOnlyUnitItem(id);
        return;
      }

      cycleStateOneStep(item);
    }, { passive: false });
  });

  container.appendChild(grid);
}

function collectMythicStateFromUI() {
  const grid = document.querySelector("#mythicGrid .unit-grid");
  const json = {};
  if (!grid) return json;

  grid.querySelectorAll(".unit-item").forEach((item) => {
    const id = normalizeUnitId(item.dataset.id);
    const form = item.dataset.form === "immortal" ? "immortal" : "mythic";
    const level = parseInt(item.dataset.level || "0", 10) || 0;
    const treasure = item.dataset.treasure === "1";

    if (level > 0 || treasure) {
      json[id] = { form, level, treasure };
    }
  });

  return json;
}

    const modalBackdrop = document.getElementById("modalBackdrop");
    const modalBody = document.getElementById("modalBody");
    const modalError = document.getElementById("modalError");
    const modalTagInput = document.getElementById("modalTagInput");
    const btnModalCancel = document.getElementById("btnModalCancel");
    const btnModalOk = document.getElementById("btnModalOk");
    let modalUser = null;

function openTagModal(user) {
      modalUser = user;
      modalBody.textContent = `ユーザー名: ${user.name}`;
      modalTagInput.value = "";
      modalError.style.display = "none";
      modalError.textContent = "";
      if (modalBackdrop) modalBackdrop.style.display = "flex";
      modalTagInput.focus();
    }

function closeTagModal() {
      if (modalBackdrop) modalBackdrop.style.display = "none";
    }

    if (btnModalCancel) btnModalCancel.addEventListener("click", () => {
      modalUser = null;
      closeTagModal();
});

    const searchInput = document.getElementById("searchNameInput");
    const btnSearch = document.getElementById("btnSearch");
const searchResults = document.getElementById("searchResults");

    async function doSearch() {
      showToast("検索機能は現在無効です（RLS対応：RPC化予定）。");
      if (searchResults) searchResults.innerHTML = "";
    }

    if (btnSearch) btnSearch.addEventListener("click", () => {
      doSearch();
    });
    if (searchInput) searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        doSearch();
      }
    });

    async function onClickEditUser(userBasic) {
      showToast("この編集機能は現在無効です（RLS対応：RPC化予定）。");
      return;
    }

    if (btnModalOk) btnModalOk.addEventListener("click", async () => {
      if (!modalUser) return;
      const inputTagVal = modalTagInput.value.trim();
if (inputTagVal.length !== 2) {
        modalError.style.display = "block";
        modalError.textContent = "識別番号は2桁で入力してください。";
        return;
      }

      const correctTag = modalUser.tag;
      if (inputTagVal === correctTag) {
        const userToEdit = modalUser;
        modalUser = null;
        closeTagModal();
        openEditForm(userToEdit);
      } else {
        const newMis = (modalUser.mis_input_count || 0) + 1;
        /* ld_users は RPC 専用化したため direct update は不可 */
        modalUser.mis_input_count = newMis;

        setLockMinutes(modalUser.name, 3);
        modalError.style.display = "block";
        modalError.textContent = "認証に失敗しました。一定時間ロック中です。";
      }
    });

    const btnGoNew = document.getElementById("btnGoNew");
const btnBackHome = document.getElementById("btnBackHome");
    const btnSaveUser = document.getElementById("btnSaveUser");
    const formModeLabel = document.getElementById("formModeLabel");
    const inputName = document.getElementById("inputName");
    const inputTag = document.getElementById("inputTag");
    const fieldTag = document.getElementById("fieldTag");
    const selectVaultLevel = document.getElementById("selectVaultLevel");
    const statusComments = document.getElementById("statusComments");
    const statusMisInputs = document.getElementById("statusMisInputs");
    const statusLikes = document.getElementById("statusLikes");

    for (let lv = 1; lv <= 11; lv++) {
      const opt = document.createElement("option");
      opt.value = String(lv);
      opt.textContent = String(lv);
      selectVaultLevel.appendChild(opt);
    }

    if (btnGoNew) { btnGoNew.addEventListener("click", () => { openNewForm(); }); }
btnBackHome.addEventListener("click", () => {
      appState.currentUser = null;
      setView("home");
    });

function openNewForm(prefillName = "", prefillTag = "") {
      appState.mode = "new";
      appState.currentUser = null;

      formModeLabel.textContent = "新規ユーザー登録";
      inputName.value = prefillName || "";
      inputName.disabled = true;

      inputTag.value = prefillTag || "";
      inputTag.disabled = true;
      fieldTag.style.display = "none";

      selectVaultLevel.value = "1";

      renderMythicGrid({});
      statusComments.textContent = "コメ数: 0";
      statusMisInputs.textContent = "誤入力: 0";
      statusLikes.textContent = "イイね: 0";

      setView("form");
    }

function openEditForm(user) {
      if (!user) {
        showToast("内部エラー: 編集対象ユーザーが不明です。");
        return;
      }
      appState.mode = "edit";
      appState.currentUser = user;

      formModeLabel.textContent = "ユーザーデータ編集";
      inputName.value = user.name;
      inputName.disabled = true;
      inputTag.value = user.tag;
      inputTag.disabled = true;
      fieldTag.style.display = "none";

      const v = user.vault_level || 1;
      selectVaultLevel.value = String(v);

      let state = {};
      try {
        state = user.mythic_state || {};
      } catch {
        state = {};
      }
      renderMythicGrid(state);

      statusComments.textContent = `コメ数: ${user.comment_count ?? 0}`;
      statusMisInputs.textContent = `誤入力: ${user.mis_input_count ?? 0}`;
      statusLikes.textContent = `イイね: ${user.like_count ?? 0}`;

      setView("form");
    }

    async function saveUser() {
      const usernameRaw = (appState.auth && appState.auth.usernameRaw) ? appState.auth.usernameRaw : "";
      const pass = (appState.auth && appState.auth.pass) ? appState.auth.pass : "";

      const vaultLevel = parseInt(selectVaultLevel.value, 10);
      const mythicState = collectMythicStateFromUI();

      if (!usernameRaw || !pass) {
        showToast("上のヘッダーで「ユーザー名」「パス」を入力してから操作してください。");
        return;
      }
      if (!isUsernameWith2DigitTag(usernameRaw)) {
        showToast("ユーザー名は末尾2桁タグ付きで入力してください（例: Menbo01）。");
        return;
      }
      if (vaultLevel < 1 || vaultLevel > 11 || Number.isNaN(vaultLevel)) {
        showToast("金庫レベルは1〜11で指定してください。");
        return;
      }

      const isNew = appState.mode === "new" || !appState.currentUser;

      if (isNew) {
        const r = await rpcRegister(usernameRaw, pass);
        if (!r.ok) {
          console.error(r.error || r);
          showToast("ユーザーの登録に失敗しました。");
          return;
        }
        // 登録RPCは vault_level を初期値で入れるため、ここで確定値を保存
        const s = await rpcSaveUserdata(usernameRaw, pass, vaultLevel, mythicState);
        if (!s.ok) {
          console.error(s.error || s);
          showToast("登録後の初期データ保存に失敗しました。");
          return;
        }
        showToast("ユーザーを登録しました。");
        await fetchUsersCount();
        setView("home");
        return;
      }

      const s = await rpcSaveUserdata(usernameRaw, pass, vaultLevel, mythicState);
      if (!s.ok) {
        console.error(s.error || s);
        // 保存失敗時はロック（DB側もロックしている可能性が高いが、ローカルも合わせる）
        setLockMinutes(usernameRaw, 3);
        showToast("保存に失敗しました。一定時間ロック中です。");
        return;
      }

      // 成功後は最新を再取得できる場合だけ更新
      const g = await rpcGetUserdata(usernameRaw, pass);
      if (g.ok) {
        appState.currentUser = g.user;
      }

      showToast("ユーザー情報を更新しました。");
      setView("home");
    }

    btnSaveUser.addEventListener("click", () => {
      saveUser();
    });

    
/* =========================
 * v1.0.3 Header Auth UI
 * ========================= */
function setupHeaderAuthUI(){
  const nameEl = document.getElementById("userNameInput");
  const passEl  = document.getElementById("userTagInput");
  const btn    = document.getElementById("userActionBtn");
  const statusEl = document.getElementById("userStatusLabel");

  if (!nameEl || !passEl || !btn || !statusEl) return;

  function fmtRemain(ms){
    const sec = Math.ceil(ms/1000);
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${m}分${String(s).padStart(2,"0")}秒`;
  }

  function setBtn(label, disabled){
    btn.textContent = label;
    btn.disabled = disabled;
  }

  function refresh(){
    const usernameRaw = nameEl.value.trim();
    const pass  = passEl.value.trim();

    const locked = lockRemainingMs(usernameRaw);
    if (locked > 0){
      setBtn("続ける", true);
      statusEl.textContent = `一定時間ロック中（残り ${fmtRemain(locked)}）`;
      return;
    }

    if (!usernameRaw){
      setBtn("続ける", true);
      statusEl.textContent = "ユーザー名を入力してください";
      return;
    }

    if (!isUsernameWith2DigitTag(usernameRaw)){
      setBtn("続ける", true);
      statusEl.textContent = "ユーザー名は末尾2桁タグ付きで入力してください（例: Menbo01）";
      return;
    }

    if (!pass){
      setBtn("続ける", true);
      statusEl.textContent = "パスを入力してください";
      return;
    }

    const ok = isValidNameTag(usernameRaw, pass);
    setBtn("続ける", !ok);
    statusEl.textContent = ok ? "「続ける」を押してください" : "文字数が条件を満たしていません";
  }

  nameEl.addEventListener("input", refresh);
  passEl.addEventListener("input", refresh);

  btn.addEventListener("click", async () => {
    const usernameRaw = nameEl.value.trim();
    const pass  = passEl.value.trim();
    if (!isValidNameTag(usernameRaw, pass) || !isUsernameWith2DigitTag(usernameRaw)) return;

    const locked = lockRemainingMs(usernameRaw);
    if (locked > 0){
      showToast(`一定時間ロック中です（残り ${fmtRemain(locked)}）`, 2200);
      refresh();
      return;
    }

    const res = await rpcLogin(usernameRaw, pass);

    if (res.ok){
      appState.auth = { usernameRaw, pass };

      // できれば完全なユーザーデータを取得してフォームへ
      const g = await rpcGetUserdata(usernameRaw, pass);
      if (g.ok){
        openEditForm(g.user);
      } else {
        // ld_get_userdata 未導入など
        if (g.error){
          console.error(g.error);
        }
        showToast("ユーザーデータ取得RPCが未導入の可能性があります（ld_get_userdata）。", 2600);
      }
      return;
    }

    // not found -> new
    if (String(res.kind).toLowerCase().includes("not_found")){
      appState.auth = { usernameRaw, pass };
      openNewForm(usernameRaw, ""); // tag表示はしない
      return;
    }

    // lock info
    if (res.lockedUntilMs && res.lockedUntilMs > Date.now()){
      localStorage.setItem(authState.lockKeyPrefix + usernameRaw, String(res.lockedUntilMs));
    } else {
      setLockMinutes(usernameRaw, 3);
    }

    showToast("認証に失敗しました。一定時間ロック中です。", 2500);
    refresh();
  });

  refresh();
}


/* =========================
 * v1.0.3 Unit Accordion
 * ========================= */
function setupUnitAccordion(){
  const btn = document.getElementById("unitAccordionToggle");
  const body = document.getElementById("unitAccordionBody");
  if (!btn || !body) return;

  const KEY = "ld_users_editor_units_open";
  const saved = localStorage.getItem(KEY);
  const isOpen = saved === null ? true : (saved === "1");

  function apply(open){
    body.classList.toggle("hidden", !open);
    btn.textContent = (open ? "▲神話・不滅ユニットの育成状態" : "▼神話・不滅ユニットの育成状態");
    localStorage.setItem(KEY, open ? "1" : "0");
  }

  btn.addEventListener("click", () => {
    const open = body.classList.contains("hidden");
    apply(open);
  });

  apply(isOpen);
}


(async function init() {
      await loadUnitMasterMaps();
      setupHeaderAuthUI();
      setupUnitAccordion();
      setView("home");
      await fetchUsersCount();
    })();



function sb() {
  if (!requireSupabase()) throw new Error("Supabase not ready");
  return supabase;
}


function updateSelectedUnitVisuals(){
  document.querySelectorAll('#mythicGrid .unit-item.selected').forEach(updateUnitVisual);
}
