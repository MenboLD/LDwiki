// ld_editboard.js
(() => {
  "use strict";

  // ---------- utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nowISO = () => new Date().toISOString();

  function base64UrlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }
  function base64UrlDecode(b64url) {
    let b64 = b64url.replaceAll("-", "+").replaceAll("_", "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  function toast(msg, ms = 1300) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ---------- Supabase ----------
  function createSupabaseClient() {
    const url = window.LD_SUPABASE_URL;
    const key = window.LD_SUPABASE_ANON_KEY;
    if (!url || !key || !window.supabase) return null;
    try {
      return window.supabase.createClient(url, key);
    } catch (e) {
      console.warn("supabase client init failed", e);
      return null;
    }
  }
  const sb = createSupabaseClient();

  // ---------- data ----------
  // 画像パスは「icon/{code}.png」を前提（無い場合は _placeholder.png）
  const ICON_BASE = "./icon/";
  const PLACEHOLDER = ICON_BASE + "_placeholder.png";

  const RANKS = ["ALL", "N", "R", "E", "L", "神話", "不滅"];
  const RANK_LABEL = {
    ALL: "全",
    N: "N",
    R: "R",
    E: "E",
    L: "L",
    "神話": "神話",
    "不滅": "不滅",
  };
  const RANK_ORDER = {
    N: 1, R: 2, E: 3, L: 4, "神話": 5, "不滅": 6,
  };

  // CSVの内容をそのまま埋め込んだデフォルト（Supabaseが無い場合でも動く）
  const DEFAULT_UNITS = [{"code": "1001", "name": "弓兵", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1002", "name": "擲弾兵", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1003", "name": "野蛮人", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1004", "name": "水の精霊", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1005", "name": "山賊", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2001", "name": "レンジャー", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2002", "name": "ショックロボット", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2003", "name": "聖騎士", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2004", "name": "サンドマン", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2005", "name": "悪魔の兵士", "rank": "R", "mode": false, "after": null, "dff": 7.5, "speed": 0.0}, {"code": "3001", "name": "電気ロボット", "rank": "E", "mode": false, "after": null, "dff": 5.0, "speed": 0.0}, {"code": "3002", "name": "木", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "3003", "name": "ハンター", "rank": "E", "mode": false, "after": null, "dff": 15.0, "speed": 0.0}, {"code": "3005", "name": "イーグル将軍", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 5.0}, {"code": "3006", "name": "ウルフ戦士", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "4003", "name": "ウォーマシン", "rank": "L", "mode": false, "after": null, "dff": 10.0, "speed": 0.0}, {"code": "4004", "name": "虎の師父", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 5.0}, {"code": "4005", "name": "嵐の巨人", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "4007", "name": "保安官", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "3004", "name": "重力弾", "rank": "神話", "mode": true, "after": "13004", "dff": 0.0, "speed": 0.0}, {"code": "3007", "name": "忍者", "rank": "神話", "mode": true, "after": "13007", "dff": 0.0, "speed": 0.0}, {"code": "4001", "name": "オークシャーマン", "rank": "神話", "mode": false, "after": null, "dff": 20.0, "speed": 0.0}, {"code": "4002", "name": "パルス発生器", "rank": "神話", "mode": true, "after": "14002", "dff": 0.0, "speed": 0.0}, {"code": "4006", "name": "猫の魔法使い", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5001", "name": "バンバ", "rank": "神話", "mode": true, "after": "15001", "dff": 0.0, "speed": 0.0}, {"code": "5002", "name": "コルディ", "rank": "神話", "mode": true, "after": "15002", "dff": 0.0, "speed": 0.0}, {"code": "5003", "name": "ランスロット", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5004", "name": "アイアンニャン", "rank": "神話", "mode": true, "after": "5104", "dff": 0.0, "speed": 0.0}, {"code": "5104", "name": "アイアンニャン", "rank": "神話", "mode": true, "after": "5204", "dff": 0.0, "speed": 0.0}, {"code": "5204", "name": "アイアンニャンv2", "rank": "神話", "mode": true, "after": "15004", "dff": 0.0, "speed": 0.0}, {"code": "5005", "name": "ブロッブ", "rank": "神話", "mode": true, "after": "15005", "dff": 20.0, "speed": 0.0}, {"code": "5006", "name": "ドラゴン", "rank": "神話", "mode": true, "after": "5106", "dff": 0.0, "speed": 0.0}, {"code": "5106", "name": "ドラゴン", "rank": "神話", "mode": true, "after": "5206", "dff": 0.0, "speed": 0.0}, {"code": "5206", "name": "偉大な卵", "rank": "神話", "mode": true, "after": "5306", "dff": 0.0, "speed": 0.0}, {"code": "5306", "name": "ドレイン", "rank": "神話", "mode": true, "after": "15006", "dff": 0.0, "speed": 0.0}, {"code": "5007", "name": "モノポリーマン", "rank": "神話", "mode": false, "after": null, "dff": 20.0, "speed": 0.0}, {"code": "5008", "name": "ママ", "rank": "神話", "mode": true, "after": "15008", "dff": 20.0, "speed": 0.0}, {"code": "5108", "name": "インプ", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5009", "name": "カエルの王様", "rank": "神話", "mode": true, "after": "5109", "dff": 0.0, "speed": 10.0}, {"code": "5109", "name": "キングダイアン", "rank": "神話", "mode": true, "after": "15009", "dff": 0.0, "speed": 10.0}, {"code": "5010", "name": "バットマン", "rank": "神話", "mode": true, "after": "15010", "dff": 0.0, "speed": 0.0}, {"code": "5011", "name": "ヴェイン", "rank": "神話", "mode": true, "after": "15011", "dff": 0.0, "speed": 0.0}, {"code": "5012", "name": "インディ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5013", "name": "ワット", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5014", "name": "タール", "rank": "神話", "mode": true, "after": "5114", "dff": 0.0, "speed": 0.0}, {"code": "5114", "name": "タール", "rank": "神話", "mode": true, "after": "5214", "dff": 0.0, "speed": 0.0}, {"code": "5214", "name": "タール", "rank": "神話", "mode": true, "after": "5014", "dff": 0.0, "speed": 0.0}, {"code": "5015", "name": "ロケッチュー", "rank": "神話", "mode": true, "after": "5115", "dff": 0.0, "speed": 0.0}, {"code": "5115", "name": "オーバークロック・ロケッチュー", "rank": "神話", "mode": true, "after": "5015", "dff": 0.0, "speed": 0.0}, {"code": "5016", "name": "ウチ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5017", "name": "ビリ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5018", "name": "マスタークン", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5019", "name": "チョナ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5020", "name": "ペンギン楽師", "rank": "神話", "mode": true, "after": "15020", "dff": 0.0, "speed": 0.0}, {"code": "5021", "name": "ヘイリー", "rank": "神話", "mode": true, "after": "15021", "dff": 0.0, "speed": 0.0}, {"code": "5022", "name": "アト", "rank": "神話", "mode": true, "after": "15022", "dff": 20.0, "speed": 0.0}, {"code": "5023", "name": "ロカ", "rank": "神話", "mode": true, "after": "15023", "dff": 0.0, "speed": 0.0}, {"code": "5024", "name": "選鳥師", "rank": "神話", "mode": true, "after": "15024", "dff": 0.0, "speed": 0.0}, {"code": "5025", "name": "チャド", "rank": "神話", "mode": true, "after": "15025", "dff": 0.0, "speed": 0.0}, {"code": "15008", "name": "グランドママ", "rank": "不滅", "mode": true, "after": "5008", "dff": 0.0, "speed": 0.0}, {"code": "15009", "name": "カエルの死神", "rank": "不滅", "mode": true, "after": "15109", "dff": 0.0, "speed": 0.0}, {"code": "15109", "name": "死神ダイアン", "rank": "不滅", "mode": true, "after": "5009", "dff": 0.0, "speed": 0.0}, {"code": "15021", "name": "覚醒ヘイリー", "rank": "不滅", "mode": true, "after": "5021", "dff": 0.0, "speed": 0.0}, {"code": "15001", "name": "原始バンバ", "rank": "不滅", "mode": true, "after": "5001", "dff": 0.0, "speed": 0.0}, {"code": "13007", "name": "鬼神忍者", "rank": "不滅", "mode": true, "after": "3007", "dff": 0.0, "speed": 0.0}, {"code": "15022", "name": "時空アト", "rank": "不滅", "mode": true, "after": "5022", "dff": 0.0, "speed": 0.0}, {"code": "14002", "name": "ドクターパルス", "rank": "不滅", "mode": true, "after": "4002", "dff": 0.0, "speed": 0.0}, {"code": "15011", "name": "トップヴェイン", "rank": "不滅", "mode": true, "after": "5011", "dff": 0.0, "speed": 0.0}, {"code": "15006", "name": "魔王ドラゴン", "rank": "不滅", "mode": true, "after": "5006", "dff": 0.0, "speed": 0.0}, {"code": "13004", "name": "スーパー重力弾", "rank": "不滅", "mode": true, "after": "3004", "dff": 0.0, "speed": 0.0}, {"code": "15023", "name": "キャプテンロカ", "rank": "不滅", "mode": true, "after": "5023", "dff": 0.0, "speed": 0.0}, {"code": "15004", "name": "アイアムニャン", "rank": "不滅", "mode": true, "after": "5004", "dff": 0.0, "speed": 0.0}, {"code": "15010", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "15110", "dff": 0.0, "speed": 0.0}, {"code": "15110", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "15210", "dff": 0.0, "speed": 0.0}, {"code": "15210", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "5010", "dff": 0.0, "speed": 0.0}, {"code": "15020", "name": "ノイズキングペンギン楽師", "rank": "不滅", "mode": true, "after": "5020", "dff": 0.0, "speed": 0.0}, {"code": "15024", "name": "ボス選鳥師", "rank": "不滅", "mode": true, "after": "5024", "dff": 0.0, "speed": 0.0}, {"code": "15005", "name": "ブロッブ団", "rank": "不滅", "mode": true, "after": "5005", "dff": 0.0, "speed": 0.0}, {"code": "15002", "name": "女王コルディ", "rank": "不滅", "mode": true, "after": "5002", "dff": 0.0, "speed": 0.0}, {"code": "15025", "name": "ギガチャド", "rank": "不滅", "mode": true, "after": "5025", "dff": 0.0, "speed": 0.0}];

  let UNITS = DEFAULT_UNITS.slice();
  let UNIT_MAP = new Map();

  function normalizeRank(v) {
    if (!v) return "N";
    if (v === "ノマ") return "N";
    return String(v);
  }

  function rebuildUnitMap() {
    UNITS = UNITS
      .map(u => ({
        code: String(u.code),
        name: u.name ?? "",
        rank: normalizeRank(u.rank),
        mode: !!u.mode,
        after: (u.after == null || u.after === "") ? null : String(u.after),
        dff: Number(u.dff || 0),
        speed: Number(u.speed || 0),
      }))
      .filter(u => !!u.code);

    UNITS.sort((a,b) => {
      const ra = RANK_ORDER[a.rank] || 999;
      const rb = RANK_ORDER[b.rank] || 999;
      if (ra !== rb) return ra - rb;
      return Number(a.code) - Number(b.code);
    });

    UNIT_MAP = new Map(UNITS.map(u => [u.code, u]));
  }

  rebuildUnitMap();

  async function tryLoadUnitsFromSupabase() {
    if (!sb) return false;
    try {
      const { data, error } = await sb
        .from("ld_editboard_units")
        .select("code,name,rank,mode,after,dff,speed")
        .order("code", { ascending: true });

      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) return false;

      UNITS = data.map(r => ({
        code: String(r.code),
        name: r.name ?? "",
        rank: normalizeRank(r.rank),
        mode: !!r.mode,
        after: (r.after == null) ? null : String(r.after),
        dff: Number(r.dff || 0),
        speed: Number(r.speed || 0),
      }));
      rebuildUnitMap();
      return true;
    } catch (e) {
      console.warn("load units from supabase failed", e);
      return false;
    }
  }

  // ---------- state ----------
  const DEFAULT_COLS = 6;
  const STORAGE_KEY = "ld_editboard_state_v1";
  const LAYOUT_NAME_KEY = "ld_editboard_layout_name_v1";
  const FILTER_RANK_KEY = "ld_editboard_filter_rank_v1";
  const EDIT_TOGGLE_KEY = "ld_editboard_edit_toggle_v1";

  const state = {
    rows: 3,
    cols: DEFAULT_COLS,
    cells: [], // [r][c] => code|null
  };

  const ui = {
    activeRank: "ALL",
    editMode: false,
  };

  const history = {
    undo: [],
    redo: [],
    push(snapshot) {
      this.undo.push(snapshot);
      if (this.undo.length > 80) this.undo.shift();
      this.redo.length = 0;
      refreshUndoRedoButtons();
    },
    canUndo() { return this.undo.length > 0; },
    canRedo() { return this.redo.length > 0; },
    undoOnce() {
      if (!this.canUndo()) return null;
      const prev = this.undo.pop();
      this.redo.push(serializeState());
      refreshUndoRedoButtons();
      return prev;
    },
    redoOnce() {
      if (!this.canRedo()) return null;
      const nxt = this.redo.pop();
      this.undo.push(serializeState());
      refreshUndoRedoButtons();
      return nxt;
    },
    clear() { this.undo.length = 0; this.redo.length = 0; refreshUndoRedoButtons(); },
  };

  function makeEmptyCells(rows, cols) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
  }

  function normalizeState() {
    state.rows = clamp(parseInt(state.rows, 10) || 3, 1, 10);
    state.cols = DEFAULT_COLS; // 固定
    if (!Array.isArray(state.cells)) state.cells = [];
    if (state.cells.length !== state.rows) {
      const next = makeEmptyCells(state.rows, state.cols);
      for (let r = 0; r < Math.min(state.rows, state.cells.length); r++) {
        for (let c = 0; c < Math.min(state.cols, (state.cells[r] || []).length); c++) {
          next[r][c] = state.cells[r][c] ?? null;
        }
      }
      state.cells = next;
    }
    for (let r = 0; r < state.rows; r++) {
      if (!Array.isArray(state.cells[r])) state.cells[r] = [];
      for (let c = 0; c < state.cols; c++) {
        if (state.cells[r].length <= c) state.cells[r].push(null);
        const v = state.cells[r][c];
        state.cells[r][c] = (v == null) ? null : String(v);
      }
      state.cells[r] = state.cells[r].slice(0, state.cols);
    }
  }

  function serializeState() {
    return deepClone({ rows: state.rows, cols: state.cols, cells: state.cells });
  }

  function applyState(s) {
    if (!s || typeof s !== "object") return;
    state.rows = s.rows;
    state.cols = DEFAULT_COLS;
    state.cells = s.cells;
    normalizeState();
    renderAll();
  }

  // ---------- render ----------
  const els = {
    board: $("#board"),
    palette: $("#palette"),
    rowsSel: $("#rowsSel"),
    colsLabel: $("#colsLabel"),
    undoBtn: $("#undoBtn"),
    redoBtn: $("#redoBtn"),
    clearBtn: $("#clearBtn"),
    shareBtn: $("#shareBtn"),
    saveLocalBtn: $("#saveLocalBtn"),
    loadLocalBtn: $("#loadLocalBtn"),
    exportBtn: $("#exportBtn"),
    searchInput: $("#searchInput"),
    trash: $("#trash"),
    onlineBtn: $("#onlineBtn"),
    rankTabs: $("#rankTabs"),
    editToggle: $("#editToggle"),
  };

  function iconUrl(code) {
    return ICON_BASE + String(code) + ".png";
  }

  function renderBoard() {
    els.colsLabel.textContent = String(state.cols);

    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;

    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);

        const wrap = document.createElement("div");
        wrap.className = "cell__content";

        const code = state.cells[r][c];
        if (code) {
          const unit = UNIT_MAP.get(code) || { code, name: code };
          const u = document.createElement("div");
          u.className = "unit";
          u.dataset.code = code;

          const img = document.createElement("img");
          img.alt = unit.name || code;
          img.src = iconUrl(code);
          img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
          u.appendChild(img);

          const badge = document.createElement("div");
          badge.className = "badge";
          badge.textContent = String(code);
          u.appendChild(badge);

          wrap.appendChild(u);
        }

        cell.appendChild(wrap);
        grid.appendChild(cell);
      }
    }

    els.board.innerHTML = "";
    els.board.appendChild(grid);

    bindBoardInteractions(); // after DOM replaced
  }

  function renderTabs() {
    const counts = new Map();
    for (const r of RANKS) counts.set(r, 0);
    counts.set("ALL", UNITS.length);
    for (const u of UNITS) {
      const r = normalizeRank(u.rank);
      counts.set(r, (counts.get(r) || 0) + 1);
    }

    els.rankTabs.innerHTML = "";
    for (const r of RANKS) {
      const btn = document.createElement("div");
      btn.className = "tab" + (ui.activeRank === r ? " is-active" : "");
      btn.dataset.rank = r;

      const label = document.createElement("span");
      label.textContent = RANK_LABEL[r] ?? r;

      const count = document.createElement("span");
      count.className = "count";
      count.textContent = String(counts.get(r) || 0);

      btn.appendChild(label);
      btn.appendChild(count);

      btn.addEventListener("click", () => {
        ui.activeRank = r;
        localStorage.setItem(FILTER_RANK_KEY, r);
        renderTabs();
        renderPalette();
      });

      els.rankTabs.appendChild(btn);
    }
  }

  function getFilteredUnits() {
    const q = (els.searchInput.value || "").trim().toLowerCase();
    const rank = ui.activeRank;

    return UNITS.filter(u => {
      if (rank !== "ALL" && normalizeRank(u.rank) !== rank) return false;
      if (!q) return true;
      return String(u.code).toLowerCase().includes(q) || String(u.name || "").toLowerCase().includes(q);
    });
  }

  function renderPalette() {
    const units = getFilteredUnits();
    els.palette.innerHTML = "";
    for (const u of units) {
      const item = document.createElement("div");
      item.className = "pItem";
      item.dataset.code = u.code;

      const img = document.createElement("img");
      img.alt = u.name || u.code;
      img.src = iconUrl(u.code);
      img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };

      const meta = document.createElement("div");
      meta.className = "pMeta";
      meta.textContent = u.code;

      item.appendChild(img);
      item.appendChild(meta);
      els.palette.appendChild(item);
    }
  }

  function renderAll() {
    els.rowsSel.value = String(state.rows);
    renderTabs();
    renderBoard();
    renderPalette();
  }

  // ---------- drag & drop (touch-friendly) ----------
  let drag = null; // {code, from, ghostEl, pointerId, lastX,lastY}
  let currentTarget = null;
  let trashHot = false;

  function clearTarget() {
    if (currentTarget) currentTarget.classList.remove("is-target");
    currentTarget = null;
    setTrashHot(false);
  }
  function setTrashHot(on) {
    trashHot = !!on;
    els.trash.classList.toggle("is-hot", trashHot);
  }

  function createGhost(code) {
    const g = document.createElement("div");
    g.className = "dragGhost";
    const img = document.createElement("img");
    img.src = iconUrl(code);
    img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
    g.appendChild(img);
    document.body.appendChild(g);
    return g;
  }

  function pickTargetFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return { cell: null, trash: false };
    const trash = el.closest && el.closest("#trash");
    if (trash) return { cell: null, trash: true };
    const cell = el.closest && el.closest(".cell");
    return { cell, trash: false };
  }

  function moveGhost(g, x, y) {
    g.style.left = `${x}px`;
    g.style.top = `${y}px`;
  }

  function beginDrag({ code, from, pointerId, startX, startY }) {
    drag = {
      code,
      from,
      pointerId,
      ghostEl: createGhost(code),
      lastX: startX,
      lastY: startY,
    };
    moveGhost(drag.ghostEl, startX, startY);
    document.body.style.cursor = "grabbing";
  }

  function cleanupDrag() {
    if (!drag) return;
    drag.ghostEl?.remove();
    drag = null;
    clearTarget();
    document.body.style.cursor = "";
  }

  function endDrag({ dropX, dropY }) {
    if (!drag) return;
    const { code, from } = drag;
    const hit = pickTargetFromPoint(dropX, dropY);

    // trash => delete if from cell
    if (hit.trash) {
      if (from.type === "cell") {
        history.push(serializeState());
        state.cells[from.r][from.c] = null;
        normalizeState();
        renderAll();
        toast("削除");
      } else {
        toast("削除（配置済みのみ）");
      }
      cleanupDrag();
      return;
    }

    // drop to cell
    if (hit.cell) {
      const r = parseInt(hit.cell.dataset.r, 10);
      const c = parseInt(hit.cell.dataset.c, 10);

      history.push(serializeState());

      if (from.type === "palette") {
        state.cells[r][c] = code;
      } else {
        const srcR = from.r, srcC = from.c;
        if (srcR !== r || srcC !== c) {
          const dst = state.cells[r][c];
          state.cells[r][c] = code;
          state.cells[srcR][srcC] = dst ?? null; // swap
        }
      }
      normalizeState();
      renderAll();
      cleanupDrag();
      return;
    }

    // drop outside: delete if from cell
    if (from.type === "cell") {
      history.push(serializeState());
      state.cells[from.r][from.c] = null;
      normalizeState();
      renderAll();
      toast("盤外に落としたので削除");
    }
    cleanupDrag();
  }

  function onPointerMove(e) {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;

    const x = e.clientX, y = e.clientY;
    drag.lastX = x; drag.lastY = y;
    moveGhost(drag.ghostEl, x, y);

    const hit = pickTargetFromPoint(x, y);
    if (hit.trash) {
      clearTarget();
      setTrashHot(true);
      return;
    }
    setTrashHot(false);

    if (hit.cell !== currentTarget) {
      if (currentTarget) currentTarget.classList.remove("is-target");
      currentTarget = hit.cell;
      if (currentTarget) currentTarget.classList.add("is-target");
    }
  }

  function onPointerUp(e) {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    endDrag({ dropX: e.clientX, dropY: e.clientY });
  }

  function onPointerCancel(e) {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    cleanupDrag();
  }

  function bindPaletteDrag() {
    els.palette.addEventListener("pointerdown", (e) => {
      const item = e.target.closest(".pItem");
      if (!item) return;
      e.preventDefault();

      const code = item.dataset.code;
      if (!code) return;

      beginDrag({
        code,
        from: { type: "palette" },
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      });
      item.setPointerCapture?.(e.pointerId);
    }, { passive: false });
  }

  function bindBoardInteractions() {
    // (A) edit mode: tap to transform
    $$(".cell", els.board).forEach(cell => {
      cell.addEventListener("click", () => {
        if (!ui.editMode) return;
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        const code = state.cells[r][c];
        if (!code) return;

        const u = UNIT_MAP.get(code);
        if (!u || !u.mode || !u.after) {
          toast("変化なし");
          return;
        }

        if (u.after === code) {
          toast("変化なし");
          return;
        }

        history.push(serializeState());
        state.cells[r][c] = String(u.after);
        normalizeState();
        renderAll();
        toast(`${code} → ${u.after}`);
      });
    });

    // (B) drag from board unit (only when editMode OFF)
    $$(".unit", els.board).forEach(u => {
      u.addEventListener("pointerdown", (e) => {
        if (ui.editMode) return; // 編集中はドラッグしない（タップ変化を優先）
        e.preventDefault();

        const cell = e.target.closest(".cell");
        if (!cell) return;

        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        const code = state.cells[r][c];
        if (!code) return;

        beginDrag({
          code,
          from: { type: "cell", r, c },
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
        });
        u.setPointerCapture?.(e.pointerId);
      }, { passive: false });
    });
  }

  // ---------- local save / load ----------
  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
    toast("端末に保存しました");
  }
  function loadLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { toast("保存データがありません"); return; }
    try {
      const s = JSON.parse(raw);
      history.push(serializeState());
      applyState(s);
      toast("端末から読み込みました");
    } catch (e) {
      console.warn(e);
      toast("読み込み失敗");
    }
  }

  // ---------- share url (hash) ----------
  function makeShareHash() {
    const payload = JSON.stringify(serializeState());
    const b64 = base64UrlEncode(payload);
    return `#b=${b64}`;
  }
  function applyShareHashIfAny() {
    const h = location.hash || "";
    const m = h.match(/#b=([A-Za-z0-9\-_]+)/);
    if (!m) return false;
    try {
      const json = base64UrlDecode(m[1]);
      const s = JSON.parse(json);
      applyState(s);
      toast("共有URLから復元しました");
      return true;
    } catch (e) {
      console.warn(e);
      toast("共有URLの復元に失敗");
      return false;
    }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  // ---------- JSON export ----------
  async function exportJSON() {
    const txt = JSON.stringify(serializeState(), null, 2);
    const ok = await copyToClipboard(txt);
    toast(ok ? "JSONをコピーしました" : "コピーできませんでした");
  }

  // ---------- Supabase save/load (optional) ----------
  // Requires table: ld_editboard_layouts (see ld_editboard.sql)
  function randomCode(len = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function openOnlineDialog() {
    const backdrop = document.createElement("div");
    backdrop.className = "dialogBackdrop is-open";
    backdrop.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        <h3>Supabase（オンライン保存 / 読み込み）</h3>
        <p>この機能は <b>ld_editboard_layouts</b> テーブルがある場合に動きます。</p>
        <div class="row">
          <input id="codeInput" placeholder="共有コード（空なら新規保存）" />
        </div>
        <div class="row">
          <input id="nameInput" placeholder="名前（任意）" />
        </div>
        <div class="actions">
          <button class="btn btn--ghost" id="closeBtn" type="button">閉じる</button>
          <button class="btn btn--ghost" id="loadBtn" type="button">読み込み</button>
          <button class="btn btn--primary" id="saveBtn" type="button">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    $("#closeBtn", backdrop).addEventListener("click", close);

    const codeInput = $("#codeInput", backdrop);
    const nameInput = $("#nameInput", backdrop);
    nameInput.value = localStorage.getItem(LAYOUT_NAME_KEY) || "";

    $("#saveBtn", backdrop).addEventListener("click", async () => {
      if (!sb) { toast("Supabaseが初期化できません"); return; }
      let code = (codeInput.value || "").trim().toUpperCase();
      if (!code) code = randomCode(10);

      const name = (nameInput.value || "").trim();
      localStorage.setItem(LAYOUT_NAME_KEY, name);

      const payload = {
        code,
        name: name || null,
        rows: state.rows,
        cols: state.cols,
        data: serializeState(),
        updated_at: nowISO(),
      };

      try {
        const { error } = await sb
          .from("ld_editboard_layouts")
          .upsert(payload, { onConflict: "code" });
        if (error) throw error;

        toast(`保存OK: ${code}`);
        codeInput.value = code;
      } catch (e) {
        console.warn(e);
        toast("保存失敗（RLS/テーブルを確認）");
      }
    });

    $("#loadBtn", backdrop).addEventListener("click", async () => {
      if (!sb) { toast("Supabaseが初期化できません"); return; }
      const code = (codeInput.value || "").trim().toUpperCase();
      if (!code) { toast("コードを入れてください"); return; }

      try {
        const { data, error } = await sb
          .from("ld_editboard_layouts")
          .select("data")
          .eq("code", code)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data?.data) { toast("見つかりません"); return; }

        history.push(serializeState());
        applyState(data.data);
        toast(`読み込みOK: ${code}`);
      } catch (e) {
        console.warn(e);
        toast("読み込み失敗（RLS/テーブルを確認）");
      }
    });
  }

  // ---------- events ----------
  function refreshUndoRedoButtons() {
    els.undoBtn.disabled = !history.canUndo();
    els.redoBtn.disabled = !history.canRedo();
  }

  function bindControls() {
    els.rowsSel.addEventListener("change", () => {
      const nextRows = parseInt(els.rowsSel.value, 10);
      if (!Number.isFinite(nextRows)) return;
      history.push(serializeState());
      state.rows = nextRows;
      normalizeState();
      renderAll();
    });

    els.editToggle.addEventListener("change", () => {
      ui.editMode = !!els.editToggle.checked;
      localStorage.setItem(EDIT_TOGGLE_KEY, ui.editMode ? "1" : "0");
      toast(ui.editMode ? "編集ON" : "編集OFF");
      renderBoard(); // rebind interactions to reflect mode
    });

    els.undoBtn.addEventListener("click", () => {
      const prev = history.undoOnce();
      if (!prev) return;
      applyState(prev);
      toast("戻す");
    });

    els.redoBtn.addEventListener("click", () => {
      const nxt = history.redoOnce();
      if (!nxt) return;
      applyState(nxt);
      toast("やり直し");
    });

    els.clearBtn.addEventListener("click", () => {
      history.push(serializeState());
      state.cells = makeEmptyCells(state.rows, state.cols);
      renderAll();
      toast("全消し");
    });

    els.saveLocalBtn.addEventListener("click", saveLocal);
    els.loadLocalBtn.addEventListener("click", loadLocal);

    els.shareBtn.addEventListener("click", async () => {
      const hash = makeShareHash();
      const url = `${location.origin}${location.pathname}${hash}`;
      const ok = await copyToClipboard(url);
      toast(ok ? "共有URLをコピーしました" : "コピーできませんでした");
    });

    els.exportBtn.addEventListener("click", exportJSON);

    els.searchInput.addEventListener("input", () => renderPalette());

    els.onlineBtn.addEventListener("click", () => {
      if (!sb) {
        toast("Supabase未設定（supabase_config.js を確認）");
        return;
      }
      openOnlineDialog();
    });

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    window.addEventListener("pointercancel", onPointerCancel, { passive: false });

    // iOS gesture
    document.addEventListener("gesturestart", (e) => e.preventDefault());
  }

  // ---------- boot ----------
  function loadInitialState() {
    // ui prefs
    ui.activeRank = localStorage.getItem(FILTER_RANK_KEY) || "ALL";
    if (!RANKS.includes(ui.activeRank)) ui.activeRank = "ALL";

    ui.editMode = (localStorage.getItem(EDIT_TOGGLE_KEY) === "1");
    els.editToggle.checked = ui.editMode;

    // 1) hash
    if (applyShareHashIfAny()) {
      history.clear();
      return;
    }

    // 2) local
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        applyState(s);
        history.clear();
        return;
      } catch (_) {}
    }

    // default
    state.rows = 3;
    state.cols = DEFAULT_COLS;
    state.cells = makeEmptyCells(state.rows, state.cols);
    normalizeState();
    renderAll();
    history.clear();
  }

  async function boot() {
    normalizeState();
    bindControls();
    bindPaletteDrag();

    // try supabase unit master
    const ok = await tryLoadUnitsFromSupabase();
    if (ok) {
      toast("ユニット一覧: Supabase");
    }

    loadInitialState();
    refreshUndoRedoButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
