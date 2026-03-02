// ld_editboard.js
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function toast(msg, ms = 1300) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

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

  function createSupabaseClient() {
    const url = window.LD_SUPABASE_URL;
    const key = window.LD_SUPABASE_ANON_KEY;
    if (!url || !key || !window.supabase) return null;
    try { return window.supabase.createClient(url, key); }
    catch (e) { console.warn("supabase init failed", e); return null; }
  }
  const sb = createSupabaseClient();

  const UNITS_TABLE = "ld_editboard_units";
  const ICON_BASE = "./icon";
  const DEFAULT_COLS = 6;
  const STORAGE_KEY = "ld_editboard_state_v1";

  const RANKS = [
    { key: "ALL", label: "全部" },
    { key: "N", label: "N" },
    { key: "R", label: "R" },
    { key: "E", label: "E" },
    { key: "L", label: "L" },
    { key: "神話", label: "神話" },
    { key: "不滅", label: "不滅" },
  ];

  const state = {
    rows: 3,
    cols: DEFAULT_COLS,
    cells: [],
    selectedRank: "ALL",
    editOn: false,
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
    state.cols = clamp(parseInt(state.cols, 10) || DEFAULT_COLS, 1, 10);

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

    if (!RANKS.some(r => r.key === state.selectedRank)) state.selectedRank = "ALL";
    state.editOn = !!state.editOn;
  }

  function serializeState() {
    return deepClone({
      rows: state.rows,
      cols: state.cols,
      cells: state.cells,
      selectedRank: state.selectedRank,
      editOn: state.editOn,
    });
  }

  function applyState(s) {
    if (!s || typeof s !== "object") return;
    state.rows = s.rows;
    state.cols = s.cols;
    state.cells = s.cells;
    state.selectedRank = s.selectedRank ?? "ALL";
    state.editOn = !!s.editOn;
    normalizeState();
    renderAll();
  }

  let UNITS = [];
  let UNIT_MAP = new Map();
  let rankCounts = new Map();

  function computeCounts() {
    rankCounts = new Map();
    for (const u of UNITS) rankCounts.set(u.lank, (rankCounts.get(u.lank) || 0) + 1);
  }

  async function loadUnitsFromSupabase() {
    if (!sb) { toast("Supabase未設定（supabase_config.js を確認）"); return false; }
    try {
      const { data, error } = await sb
        .from(UNITS_TABLE)
        .select("code,name,lank,mode,after")
        .order("code", { ascending: true });

      if (error) throw error;

      const cleaned = (data || []).map(r => {
        const code = String(r.code).padStart(4, "0");
        return {
          code,
          name: r.name ?? code,
          lank: r.lank ?? "N",
          mode: !!r.mode,
          after: r.after ? String(r.after).padStart(4, "0") : null,
          img: `${ICON_BASE}/${code}.png`,
        };
      });

      UNITS = cleaned;
      UNIT_MAP = new Map(UNITS.map(u => [u.code, u]));
      computeCounts();
      localStorage.setItem("ld_editboard_units_cache_v1", JSON.stringify(UNITS));
      toast("ユニット一覧を読み込みました");
      renderAll();
      return true;
    } catch (e) {
      console.warn(e);
      toast("読み込み失敗（RLS/テーブル名を確認）");
      return false;
    }
  }

  function loadUnitsFromCache() {
    const raw = localStorage.getItem("ld_editboard_units_cache_v1");
    if (!raw) return false;
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return false;
      UNITS = arr;
      UNIT_MAP = new Map(UNITS.map(u => [u.code, u]));
      computeCounts();
      return true;
    } catch { return false; }
  }

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
    rankTabs: $("#rankTabs"),
    editToggle: $("#editToggle"),
    reloadUnitsBtn: $("#reloadUnitsBtn"),
  };

  function renderRankTabs() {
    els.rankTabs.innerHTML = "";
    const allCount = UNITS.length;

    for (const r of RANKS) {
      const btn = document.createElement("div");
      btn.className = "tab" + (state.selectedRank === r.key ? " is-active" : "");
      btn.dataset.rank = r.key;

      const label = document.createElement("span");
      label.textContent = r.label;

      const count = document.createElement("span");
      count.className = "count";
      const n = r.key === "ALL" ? allCount : (rankCounts.get(r.key) || 0);
      count.textContent = String(n);

      btn.appendChild(label);
      btn.appendChild(count);

      btn.addEventListener("click", () => {
        if (state.selectedRank === r.key) return;
        state.selectedRank = r.key;
        renderRankTabs();
        renderPalette();
      });

      els.rankTabs.appendChild(btn);
    }
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
          const unit = UNIT_MAP.get(code) || { code, name: code, img: `${ICON_BASE}/${code}.png` };
          const u = document.createElement("div");
          u.className = "unit";
          u.dataset.code = code;

          const img = document.createElement("img");
          img.alt = unit.name || code;
          img.src = unit.img;

          const badge = document.createElement("div");
          badge.className = "badge";
          badge.textContent = code;

          u.appendChild(img);
          u.appendChild(badge);
          wrap.appendChild(u);
        }

        cell.appendChild(wrap);
        grid.appendChild(cell);
      }
    }

    els.board.innerHTML = "";
    els.board.appendChild(grid);
  }

  function getFilteredUnits() {
    const q = (els.searchInput.value || "").trim().toLowerCase();
    const rankKey = state.selectedRank;

    let list = UNITS;
    if (rankKey !== "ALL") list = list.filter(u => u.lank === rankKey);

    if (!q) return list;
    return list.filter(u =>
      (u.code || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q)
    );
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
      img.src = u.img;

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
    els.editToggle.checked = state.editOn;
    renderRankTabs();
    renderBoard();
    renderPalette();
    bindCellDragTargets();
    bindBoardTapEdit();
  }

  // Drag & Drop
  let drag = null;
  let currentTarget = null;
  let lastDragEndAt = 0;

  function clearTarget() {
    if (currentTarget) currentTarget.classList.remove("is-target");
    currentTarget = null;
    setTrashHot(false);
  }
  function setTrashHot(on) {
    els.trash.classList.toggle("is-hot", !!on);
  }
  function createGhost(code) {
    const unit = UNIT_MAP.get(code) || { img: `${ICON_BASE}/${code}.png`, name: code };
    const g = document.createElement("div");
    g.className = "dragGhost";
    const img = document.createElement("img");
    img.src = unit.img;
    img.alt = unit.name || code;
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
    drag = { code, from, pointerId, ghostEl: createGhost(code) };
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
      lastDragEndAt = Date.now();
      cleanupDrag();
      return;
    }

    if (hit.cell) {
      const r = parseInt(hit.cell.dataset.r, 10);
      const c = parseInt(hit.cell.dataset.c, 10);

      history.push(serializeState());
      if (from.type === "palette") {
        state.cells[r][c] = code;
      } else {
        const srcR = from.r, srcC = from.c;
        if (!(srcR === r && srcC === c)) {
          const dst = state.cells[r][c];
          state.cells[r][c] = code;
          state.cells[srcR][srcC] = dst ?? null;
        }
      }

      normalizeState();
      renderAll();
      lastDragEndAt = Date.now();
      cleanupDrag();
      return;
    }

    if (from.type === "cell") {
      history.push(serializeState());
      state.cells[from.r][from.c] = null;
      normalizeState();
      renderAll();
      toast("盤外に落としたので削除");
    }
    lastDragEndAt = Date.now();
    cleanupDrag();
  }

  function onPointerMove(e) {
    if (!drag) return;
    if (e.pointerId !== drag.pointerId) return;
    moveGhost(drag.ghostEl, e.clientX, e.clientY);

    const hit = pickTargetFromPoint(e.clientX, e.clientY);
    if (hit.trash) {
      if (currentTarget) currentTarget.classList.remove("is-target");
      currentTarget = null;
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

  function bindCellDragTargets() {
    $$(".unit", els.board).forEach(u => {
      u.addEventListener("pointerdown", (e) => {
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

  function bindBoardTapEdit() {
    $$(".cell", els.board).forEach(cell => {
      cell.addEventListener("click", () => {
        if (!state.editOn) return;
        if (Date.now() - lastDragEndAt < 250) return;

        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        const code = state.cells[r][c];
        if (!code) return;

        const unit = UNIT_MAP.get(code);
        if (!unit || !unit.mode || !unit.after) return;

        const next = String(unit.after).padStart(4, "0");
        history.push(serializeState());
        state.cells[r][c] = next;
        normalizeState();
        renderAll();
      });
    });
  }

  // Local save/load
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

  function makeShareHash() {
    const payload = JSON.stringify(serializeState());
    return `#b=${base64UrlEncode(payload)}`;
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

  async function exportJSON() {
    const txt = JSON.stringify(serializeState(), null, 2);
    const ok = await copyToClipboard(txt);
    toast(ok ? "JSONをコピーしました" : "コピーできませんでした");
  }

  function refreshUndoRedoButtons() {
    els.undoBtn.disabled = !history.canUndo();
    els.redoBtn.disabled = !history.canRedo();
    els.undoBtn.style.opacity = els.undoBtn.disabled ? ".5" : "1";
    els.redoBtn.style.opacity = els.redoBtn.disabled ? ".5" : "1";
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
      state.editOn = els.editToggle.checked;
      toast(state.editOn ? "編集: ON" : "編集: OFF");
      renderAll();
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

    els.reloadUnitsBtn.addEventListener("click", async () => {
      await loadUnitsFromSupabase();
    });

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    window.addEventListener("pointercancel", onPointerCancel, { passive: false });

    document.addEventListener("gesturestart", (e) => e.preventDefault());
  }

  function loadInitialState() {
    if (applyShareHashIfAny()) { history.clear(); return; }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        applyState(s);
        history.clear();
        return;
      } catch (_) {}
    }

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

    if (!loadUnitsFromCache()) {
      UNITS = [{ code: "1001", name: "1001", lank: "N", mode: false, after: null, img: `${ICON_BASE}/1001.png` }];
      UNIT_MAP = new Map(UNITS.map(u => [u.code, u]));
      computeCounts();
    }

    loadInitialState();
    refreshUndoRedoButtons();

    if (sb) await loadUnitsFromSupabase();
    else toast("Supabase未設定（ユニットはキャッシュ/暫定表示）");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
