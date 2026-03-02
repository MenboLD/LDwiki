// ld_editboard.js
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

  function toast(msg, ms = 1100) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // press feedback
  function flash(el) {
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }
  document.addEventListener("click", (e) => {
    const p = e.target.closest(".pressable");
    if (p) flash(p);
  }, true);

  // double-tap zoom suppression (iOS)
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // data
  const ICON_BASE = "./icon/";
  const PLACEHOLDER = ICON_BASE + "_placeholder.png";
  const RANKS = ["N","R","E","L","神話","不滅"];
  const RANK_LABEL = { N:"N", R:"R", E:"E", L:"L", "神話":"神", "不滅":"不" };
  const RANK_ORDER = { N:1, R:2, E:3, L:4, "神話":5, "不滅":6 };

  const DEFAULT_UNITS = [{"code": "1001", "name": "弓兵", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1002", "name": "擲弾兵", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1003", "name": "野蛮人", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1004", "name": "水の精霊", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1005", "name": "山賊", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2001", "name": "レンジャー", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2002", "name": "ショックロボット", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2003", "name": "聖騎士", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2004", "name": "サンドマン", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2005", "name": "悪魔の兵士", "rank": "R", "mode": false, "after": null, "dff": 7.5, "speed": 0.0}, {"code": "3001", "name": "電気ロボット", "rank": "E", "mode": false, "after": null, "dff": 5.0, "speed": 0.0}, {"code": "3002", "name": "木", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "3003", "name": "ハンター", "rank": "E", "mode": false, "after": null, "dff": 15.0, "speed": 0.0}, {"code": "3005", "name": "イーグル将軍", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 5.0}, {"code": "3006", "name": "ウルフ戦士", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "4003", "name": "ウォーマシン", "rank": "L", "mode": false, "after": null, "dff": 10.0, "speed": 0.0}, {"code": "4004", "name": "虎の師父", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 5.0}, {"code": "4005", "name": "嵐の巨人", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "4007", "name": "保安官", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "3004", "name": "重力弾", "rank": "神話", "mode": true, "after": "13004", "dff": 0.0, "speed": 0.0}, {"code": "3007", "name": "忍者", "rank": "神話", "mode": true, "after": "13007", "dff": 0.0, "speed": 0.0}, {"code": "4001", "name": "オークシャーマン", "rank": "神話", "mode": false, "after": null, "dff": 20.0, "speed": 0.0}, {"code": "4002", "name": "パルス発生器", "rank": "神話", "mode": true, "after": "14002", "dff": 0.0, "speed": 0.0}, {"code": "4006", "name": "猫の魔法使い", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5001", "name": "バンバ", "rank": "神話", "mode": true, "after": "15001", "dff": 0.0, "speed": 0.0}, {"code": "5002", "name": "コルディ", "rank": "神話", "mode": true, "after": "15002", "dff": 0.0, "speed": 0.0}, {"code": "5003", "name": "ランスロット", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5004", "name": "アイアンニャン", "rank": "神話", "mode": true, "after": "5104", "dff": 0.0, "speed": 0.0}, {"code": "5104", "name": "アイアンニャン", "rank": "神話", "mode": true, "after": "5204", "dff": 0.0, "speed": 0.0}, {"code": "5204", "name": "アイアンニャンv2", "rank": "神話", "mode": true, "after": "15004", "dff": 0.0, "speed": 0.0}, {"code": "5005", "name": "ブロッブ", "rank": "神話", "mode": true, "after": "15005", "dff": 20.0, "speed": 0.0}, {"code": "5006", "name": "ドラゴン", "rank": "神話", "mode": true, "after": "5106", "dff": 0.0, "speed": 0.0}, {"code": "5106", "name": "ドラゴン", "rank": "神話", "mode": true, "after": "5206", "dff": 0.0, "speed": 0.0}, {"code": "5206", "name": "偉大な卵", "rank": "神話", "mode": true, "after": "5306", "dff": 0.0, "speed": 0.0}, {"code": "5306", "name": "ドレイン", "rank": "神話", "mode": true, "after": "15006", "dff": 0.0, "speed": 0.0}, {"code": "5007", "name": "モノポリーマン", "rank": "神話", "mode": false, "after": null, "dff": 20.0, "speed": 0.0}, {"code": "5008", "name": "ママ", "rank": "神話", "mode": true, "after": "15008", "dff": 20.0, "speed": 0.0}, {"code": "5108", "name": "インプ", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5009", "name": "カエルの王様", "rank": "神話", "mode": true, "after": "5109", "dff": 0.0, "speed": 10.0}, {"code": "5109", "name": "キングダイアン", "rank": "神話", "mode": true, "after": "15009", "dff": 0.0, "speed": 10.0}, {"code": "5010", "name": "バットマン", "rank": "神話", "mode": true, "after": "15010", "dff": 0.0, "speed": 0.0}, {"code": "5011", "name": "ヴェイン", "rank": "神話", "mode": true, "after": "15011", "dff": 0.0, "speed": 0.0}, {"code": "5012", "name": "インディ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5013", "name": "ワット", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5014", "name": "タール", "rank": "神話", "mode": true, "after": "5114", "dff": 0.0, "speed": 0.0}, {"code": "5114", "name": "タール", "rank": "神話", "mode": true, "after": "5214", "dff": 0.0, "speed": 0.0}, {"code": "5214", "name": "タール", "rank": "神話", "mode": true, "after": "5014", "dff": 0.0, "speed": 0.0}, {"code": "5015", "name": "ロケッチュー", "rank": "神話", "mode": true, "after": "5115", "dff": 0.0, "speed": 0.0}, {"code": "5115", "name": "オーバークロック・ロケッチュー", "rank": "神話", "mode": true, "after": "5015", "dff": 0.0, "speed": 0.0}, {"code": "5016", "name": "ウチ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5017", "name": "ビリ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5018", "name": "マスタークン", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5019", "name": "チョナ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5020", "name": "ペンギン楽師", "rank": "神話", "mode": true, "after": "15020", "dff": 0.0, "speed": 0.0}, {"code": "5021", "name": "ヘイリー", "rank": "神話", "mode": true, "after": "15021", "dff": 0.0, "speed": 0.0}, {"code": "5022", "name": "アト", "rank": "神話", "mode": true, "after": "15022", "dff": 20.0, "speed": 0.0}, {"code": "5023", "name": "ロカ", "rank": "神話", "mode": true, "after": "15023", "dff": 0.0, "speed": 0.0}, {"code": "5024", "name": "選鳥師", "rank": "神話", "mode": true, "after": "15024", "dff": 0.0, "speed": 0.0}, {"code": "5025", "name": "チャド", "rank": "神話", "mode": true, "after": "15025", "dff": 0.0, "speed": 0.0}, {"code": "15008", "name": "グランドママ", "rank": "不滅", "mode": true, "after": "5008", "dff": 0.0, "speed": 0.0}, {"code": "15009", "name": "カエルの死神", "rank": "不滅", "mode": true, "after": "15109", "dff": 0.0, "speed": 0.0}, {"code": "15109", "name": "死神ダイアン", "rank": "不滅", "mode": true, "after": "5009", "dff": 0.0, "speed": 0.0}, {"code": "15021", "name": "覚醒ヘイリー", "rank": "不滅", "mode": true, "after": "5021", "dff": 0.0, "speed": 0.0}, {"code": "15001", "name": "原始バンバ", "rank": "不滅", "mode": true, "after": "5001", "dff": 0.0, "speed": 0.0}, {"code": "13007", "name": "鬼神忍者", "rank": "不滅", "mode": true, "after": "3007", "dff": 0.0, "speed": 0.0}, {"code": "15022", "name": "時空アト", "rank": "不滅", "mode": true, "after": "5022", "dff": 0.0, "speed": 0.0}, {"code": "14002", "name": "ドクターパルス", "rank": "不滅", "mode": true, "after": "4002", "dff": 0.0, "speed": 0.0}, {"code": "15011", "name": "トップヴェイン", "rank": "不滅", "mode": true, "after": "5011", "dff": 0.0, "speed": 0.0}, {"code": "15006", "name": "魔王ドラゴン", "rank": "不滅", "mode": true, "after": "5006", "dff": 0.0, "speed": 0.0}, {"code": "13004", "name": "スーパー重力弾", "rank": "不滅", "mode": true, "after": "3004", "dff": 0.0, "speed": 0.0}, {"code": "15023", "name": "キャプテンロカ", "rank": "不滅", "mode": true, "after": "5023", "dff": 0.0, "speed": 0.0}, {"code": "15004", "name": "アイアムニャン", "rank": "不滅", "mode": true, "after": "5004", "dff": 0.0, "speed": 0.0}, {"code": "15010", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "15110", "dff": 0.0, "speed": 0.0}, {"code": "15110", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "15210", "dff": 0.0, "speed": 0.0}, {"code": "15210", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "5010", "dff": 0.0, "speed": 0.0}, {"code": "15020", "name": "ノイズキングペンギン楽師", "rank": "不滅", "mode": true, "after": "5020", "dff": 0.0, "speed": 0.0}, {"code": "15024", "name": "ボス選鳥師", "rank": "不滅", "mode": true, "after": "5024", "dff": 0.0, "speed": 0.0}, {"code": "15005", "name": "ブロッブ団", "rank": "不滅", "mode": true, "after": "5005", "dff": 0.0, "speed": 0.0}, {"code": "15002", "name": "女王コルディ", "rank": "不滅", "mode": true, "after": "5002", "dff": 0.0, "speed": 0.0}, {"code": "15025", "name": "ギガチャド", "rank": "不滅", "mode": true, "after": "5025", "dff": 0.0, "speed": 0.0}];
  let UNITS = DEFAULT_UNITS.slice();
  let UNIT_MAP = new Map();

  function normalizeRank(v) {
    if (!v) return "N";
    if (v === "ノマ") return "N";
    if (v === "神") return "神話";
    if (v === "不") return "不滅";
    return String(v);
  }
  function rebuildUnitMap() {
    UNITS = UNITS.map(u => ({
      code: String(u.code),
      rank: normalizeRank(u.rank),
      mode: !!u.mode,
      after: (u.after == null || u.after === "") ? null : String(u.after),
    })).filter(u => !!u.code);

    UNITS.sort((a,b) => {
      const ra = RANK_ORDER[a.rank] || 999;
      const rb = RANK_ORDER[b.rank] || 999;
      if (ra !== rb) return ra - rb;
      return Number(a.code) - Number(b.code);
    });
    UNIT_MAP = new Map(UNITS.map(u => [u.code, u]));
  }
  rebuildUnitMap();

  function isStackable(code) {
    const u = UNIT_MAP.get(String(code));
    return !!u && (u.rank === "N" || u.rank === "R" || u.rank === "E" || u.rank === "L");
  }

  // state
  const DEFAULT_COLS = 6;
  const STORAGE_BASE = "ld_editboard_slot_v1_";
  const UI_RANK_KEY = "ld_editboard_filter_rank_v2";
  const UI_EDIT_KEY = "ld_editboard_edit_toggle_v2";
  const UI_SETTINGS_KEY = "ld_editboard_settings_open_v2";

  const state = { rows: 3, cols: DEFAULT_COLS, cells: [] }; // cell: null | string | string[]
  const ui = { activeRank: "N", editMode: false, settingsOpen: false };

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

  function toArr(v) {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(String);
    return [String(v)];
  }
  function setCell(r, c, arr) {
    const a = (arr || []).map(String).filter(Boolean);
    if (a.length === 0) state.cells[r][c] = null;
    else if (a.length === 1) state.cells[r][c] = a[0];
    else state.cells[r][c] = a;
  }
  function cellAllSame(arr) {
    if (!arr.length) return false;
    const x = arr[0];
    return arr.every(v => v === x);
  }

  function normalizeState() {
    state.rows = clamp(parseInt(state.rows, 10) || 3, 1, 10);
    state.cols = DEFAULT_COLS;

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
        state.cells[r][c] = Array.isArray(v) ? v.map(String) : (v == null ? null : String(v));
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
  syncCellSize();
  }

  const els = {
    board: $("#board"),
    palette: $("#palette"),
    rankTabs: $("#rankTabs"),
    editToggle: $("#editToggle"),
    undoBtn: $("#undoBtn"),
    redoBtn: $("#redoBtn"),
    clearBtn: $("#clearBtn"),
    bottomBar: $("#bottomBar"),
    barIcon: $("#barIcon"),
    settingsPanel: $("#settingsPanel"),
    shareBtn: $("#shareBtn"),
    scrollPad: $("#scrollPad"),
  };

  function iconUrl(code) {
    return ICON_BASE + String(code) + ".png";
  }

  function renderTabs() {
    els.rankTabs.innerHTML = "";
    for (const r of RANKS) {
      const btn = document.createElement("div");
      btn.className = "tab pressable" + (ui.activeRank === r ? " is-active" : "");
      btn.textContent = RANK_LABEL[r] ?? r;
      btn.addEventListener("click", () => {
        if (ui.settingsOpen) return;
        ui.activeRank = r;
        localStorage.setItem(UI_RANK_KEY, r);
        renderTabs();
        renderPalette();
      });
      els.rankTabs.appendChild(btn);
    }
  }
  function getFilteredUnits() {
    return UNITS.filter(u => normalizeRank(u.rank) === ui.activeRank);
  }
  function renderPalette() {
    const units = getFilteredUnits();
    els.palette.innerHTML = "";
    for (const u of units) {
      const item = document.createElement("div");
      item.className = "pItem pressable";
      item.dataset.code = u.code;

      const img = document.createElement("img");
      img.alt = u.code;
      img.src = iconUrl(u.code);
      img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
      item.appendChild(img);

      els.palette.appendChild(item);
    }
  }

  function renderBoard() {
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

        const codes = toArr(state.cells[r][c]);
        if (codes.length) {
          const host = document.createElement("div");
          host.className = "unitHost";
          host.dataset.r = String(r);
          host.dataset.c = String(c);

          if (codes.length === 1) {
            const u = document.createElement("div");
            u.className = "unitSingle";
            const img = document.createElement("img");
            img.alt = codes[0];
            img.src = iconUrl(codes[0]);
            img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
            u.appendChild(img);
            host.appendChild(u);
          } else if (codes.length === 2) {
            host.classList.add("stack2");
            for (let i = 0; i < 2; i++) {
              const img = document.createElement("img");
              img.className = "stackImg " + (i === 0 ? "p1" : "p2");
              img.alt = codes[i];
              img.src = iconUrl(codes[i]);
              img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
              host.appendChild(img);
            }
          } else {
            host.classList.add("stack3");
            for (let i = 0; i < 3; i++) {
              const img = document.createElement("img");
              img.className = "stackImg " + (i === 0 ? "p1" : (i === 1 ? "p2" : "p3"));
              img.alt = codes[i];
              img.src = iconUrl(codes[i]);
              img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
              host.appendChild(img);
            }
          }
          wrap.appendChild(host);
        }

        cell.appendChild(wrap);
        grid.appendChild(cell);
      }
    }

    els.board.innerHTML = "";
    els.board.appendChild(grid);
    bindBoardInteractions();
  }

  function renderSettingsUI() {
    document.body.classList.toggle("settings-open", ui.settingsOpen);
    els.barIcon.textContent = ui.settingsOpen ? "▼" : "▲";

    $$(".seg", els.settingsPanel).forEach(b => {
      const rows = parseInt(b.dataset.rows, 10);
      b.classList.toggle("is-active", rows === state.rows);
    });
  }
  function renderAll() {
    renderTabs();
    renderPalette();
    renderBoard();
    renderSettingsUI();
  }

  // drag/drop (move whole cell content)
  let drag = null; // { payloadCodes: string[], from, pointerId, ghostEl }
  let currentTarget = null;

  function clearTarget() {
    if (currentTarget) currentTarget.classList.remove("is-target");
    currentTarget = null;
  }
  function createGhost(code) {
    const g = document.createElement("div");
    g.style.position = "fixed";
    g.style.zIndex = "9999";
    g.style.width = "72px";
    g.style.height = "72px";
    g.style.borderRadius = "18px";
    g.style.border = "1px solid rgba(255,255,255,.24)";
    g.style.background = "rgba(17,24,42,.55)";
    g.style.backdropFilter = "blur(10px)";
    g.style.display = "flex";
    g.style.alignItems = "center";
    g.style.justifyContent = "center";
    g.style.transform = "translate(-50%, -50%)";
    g.style.pointerEvents = "none";
    g.style.boxShadow = "0 18px 34px rgba(0,0,0,.45)";

    const img = document.createElement("img");
    img.src = iconUrl(code);
    img.style.width = "58px";
    img.style.height = "58px";
    img.style.objectFit = "contain";
    img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };
    g.appendChild(img);

    document.body.appendChild(g);
    return g;
  }
  function moveGhost(g,x,y) {
    g.style.left = `${x}px`;
    g.style.top = `${y}px`;
  }
  function pickCellFromPoint(x,y) {
    const el = document.elementFromPoint(x,y);
    return el?.closest?.(".cell") || null;
  }
  function beginDrag({ payloadCodes, from, pointerId, x, y }) {
    drag = {
      payloadCodes: payloadCodes.map(String),
      from,
      pointerId,
      ghostEl: createGhost(payloadCodes[0]),
    };
    moveGhost(drag.ghostEl, x, y);
    document.body.style.cursor = "grabbing";
  }
  function cleanupDrag() {
    if (!drag) return;
    drag.ghostEl?.remove();
    drag = null;
    clearTarget();
    document.body.style.cursor = "";
  }

  function placeFromPalette(r, c, code) {
    const cur = toArr(state.cells[r][c]);
    if (isStackable(code)) {
      if (cur.length === 0) return setCell(r,c,[code]);
      if (cellAllSame(cur) && cur[0] === code && cur.length < 3) return setCell(r,c, cur.concat([code]));
      return setCell(r,c,[code]); // overwrite
    }
    // non stackable: overwrite
    return setCell(r,c,[code]);
  }

  function endDrag(x,y) {
    if (!drag) return;
    const { payloadCodes, from } = drag;
    const cell = pickCellFromPoint(x,y);

    if (cell) {
      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);

      history.push(serializeState());
      const dstArr = toArr(state.cells[r][c]);

      if (from.type === "palette") {
        placeFromPalette(r,c, payloadCodes[0]);
      } else {
        const srcR = from.r, srcC = from.c;
        if (srcR !== r || srcC !== c) {
          const srcArr = toArr(state.cells[srcR][srcC]);
          const canMerge = cellAllSame(dstArr) && cellAllSame(srcArr) && dstArr[0] === srcArr[0] && isStackable(dstArr[0]) && (dstArr.length + srcArr.length <= 3);
          if (canMerge) {
            setCell(r,c, dstArr.concat(srcArr));
            setCell(srcR,srcC, []);
          } else {
            setCell(r,c, srcArr);
            setCell(srcR,srcC, dstArr);
          }
        }
      }

      normalizeState();
      renderBoard();
      cleanupDrag();
      return;
    }

    if (from.type === "cell") {
      history.push(serializeState());
      setCell(from.r, from.c, []);
      normalizeState();
      renderBoard();
      toast("削除");
    }
    cleanupDrag();
  }

  function onPointerMove(e) {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    moveGhost(drag.ghostEl, e.clientX, e.clientY);

    const cell = pickCellFromPoint(e.clientX, e.clientY);
    if (cell !== currentTarget) {
      if (currentTarget) currentTarget.classList.remove("is-target");
      currentTarget = cell;
      if (currentTarget) currentTarget.classList.add("is-target");
    }
  }
  function onPointerUp(e) {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    endDrag(e.clientX, e.clientY);
  }
  function onPointerCancel(e) {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    cleanupDrag();
  }

  function bindPaletteDrag() {
    els.palette.addEventListener("pointerdown", (e) => {
      if (ui.settingsOpen) return;
      const item = e.target.closest(".pItem");
      if (!item) return;
      e.preventDefault();
      const code = item.dataset.code;
      if (!code) return;
      beginDrag({ payloadCodes: [String(code)], from: { type:"palette" }, pointerId: e.pointerId, x: e.clientX, y: e.clientY });
      item.setPointerCapture?.(e.pointerId);
    }, { passive:false });
  }

  function bindScrollPad() {
    if (!els.scrollPad) return;
    let active = false;
    let lastX = 0;
    let pid = null;

    const stop = () => { active = false; pid = null; };

    els.scrollPad.addEventListener("pointerdown", (e) => {
      if (ui.settingsOpen) return;
      active = true;
      pid = e.pointerId;
      lastX = e.clientX;
      els.scrollPad.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }, { passive:false });

    els.scrollPad.addEventListener("pointermove", (e) => {
      if (!active) return;
      if (pid != null && e.pointerId !== pid) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      els.palette.scrollLeft -= dx; // finger right => previous
      e.preventDefault();
    }, { passive:false });

    els.scrollPad.addEventListener("pointerup", stop);
    els.scrollPad.addEventListener("pointercancel", stop);
    els.scrollPad.addEventListener("lostpointercapture", stop);
  }

  function bindBoardInteractions() {
    // edit mode: transform any entry that has mode=true
    $$(".cell", els.board).forEach(cell => {
      cell.addEventListener("click", () => {
        if (ui.settingsOpen) return;
        if (!ui.editMode) return;

        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        const curArr = toArr(state.cells[r][c]);
        if (!curArr.length) return;

        let changed = false;
        const nextArr = curArr.map(code => {
          const u = UNIT_MAP.get(code);
          if (u && u.mode && u.after && u.after !== code) {
            changed = true;
            return String(u.after);
          }
          return code;
        });

        if (!changed) return toast("変化なし");
        history.push(serializeState());
        setCell(r,c,nextArr);
        normalizeState();
        renderBoard();
        toast("変化");
      });
    });

    // drag from board (only edit OFF)
    $$(".unitHost", els.board).forEach(host => {
      host.addEventListener("pointerdown", (e) => {
        if (ui.settingsOpen) return;
        if (ui.editMode) return;
        e.preventDefault();

        const cell = e.target.closest(".cell");
        if (!cell) return;
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        const arr = toArr(state.cells[r][c]);
        if (!arr.length) return;

        beginDrag({
          payloadCodes: arr,
          from: { type:"cell", r, c },
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY
        });
        host.setPointerCapture?.(e.pointerId);
      }, { passive:false });
    });
  }

  // save/load slots
  function slotKey(i) { return STORAGE_BASE + String(i); }
  function saveSlot(i) {
    localStorage.setItem(slotKey(i), JSON.stringify(serializeState()));
    toast(`セーブ${i}`);
  }
  function loadSlot(i) {
    const raw = localStorage.getItem(slotKey(i));
    if (!raw) return toast(`ロード${i}：空`);
    try {
      const s = JSON.parse(raw);
      history.push(serializeState());
      applyState(s);
      toast(`ロード${i}`);
    } catch (e) {
      console.warn(e);
      toast("ロード失敗");
    }
  }

  // share url
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
      toast("復元");
      return true;
    } catch (e) {
      console.warn(e);
      toast("復元失敗");
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

  function refreshUndoRedoButtons() {
    els.undoBtn.disabled = !history.canUndo();
    els.redoBtn.disabled = !history.canRedo();
  }
  function setSettingsOpen(open) {
    ui.settingsOpen = !!open;
    localStorage.setItem(UI_SETTINGS_KEY, ui.settingsOpen ? "1" : "0");
    renderSettingsUI();
    if (ui.settingsOpen) cleanupDrag();
  }

  function bindControls() {
    els.editToggle.addEventListener("change", () => {
      ui.editMode = !!els.editToggle.checked;
      localStorage.setItem(UI_EDIT_KEY, ui.editMode ? "1" : "0");
      toast(ui.editMode ? "編集ON" : "編集OFF");
      renderBoard();
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
      normalizeState();
      renderBoard();
      toast("全消し");
    });

    els.bottomBar.addEventListener("click", () => setSettingsOpen(!ui.settingsOpen));

    $$(".seg", els.settingsPanel).forEach(b => {
      b.addEventListener("click", () => {
        const rows = parseInt(b.dataset.rows, 10);
        if (!Number.isFinite(rows)) return;
        if (rows === state.rows) return;
        history.push(serializeState());
        state.rows = rows;
        normalizeState();
        renderAll();
        toast(`${rows}行`);
      });
    });

    document.addEventListener("click", (e) => {
      const s = e.target.closest("[data-save]");
      if (s) return saveSlot(parseInt(s.dataset.save, 10));
      const l = e.target.closest("[data-load]");
      if (l) return loadSlot(parseInt(l.dataset.load, 10));
    });

    els.shareBtn.addEventListener("click", async () => {
      const url = `${location.origin}${location.pathname}${makeShareHash()}`;
      const ok = await copyToClipboard(url);
      toast(ok ? "共有URLコピー" : "コピー失敗");
    });

    window.addEventListener("pointermove", onPointerMove, { passive:false });
    window.addEventListener("pointerup", onPointerUp, { passive:false });
    window.addEventListener("pointercancel", onPointerCancel, { passive:false });
  }

  function loadUIPrefs() {
    ui.activeRank = localStorage.getItem(UI_RANK_KEY) || "N";
    if (!RANKS.includes(ui.activeRank)) ui.activeRank = "N";
    ui.editMode = (localStorage.getItem(UI_EDIT_KEY) === "1");
    els.editToggle.checked = ui.editMode;
    ui.settingsOpen = (localStorage.getItem(UI_SETTINGS_KEY) === "1");
  }

  function boot() {
    loadUIPrefs();

    state.rows = 3;
    state.cols = DEFAULT_COLS;
    state.cells = makeEmptyCells(state.rows, state.cols);
    normalizeState();

    bindControls();
    bindPaletteDrag();
    bindScrollPad();
  window.addEventListener("resize", () => syncCellSize());
  window.addEventListener("orientationchange", () => setTimeout(syncCellSize, 50));

    if (applyShareHashIfAny()) {
      history.clear();
    } else {
      renderAll();
      history.clear();
    }

    renderSettingsUI();
    refreshUndoRedoButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
