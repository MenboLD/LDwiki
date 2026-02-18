/* ld_question_template.js */
(() => {
  'use strict';

  // Fallback list from the attached spec sheet.
  const FALLBACK_UNITS = [{"id": 1, "mythic_num": 3004, "mythic_name": "重力弾", "immortal_num": 13004, "immortal_name": "スーパー重力弾"}, {"id": 2, "mythic_num": 3007, "mythic_name": "忍者", "immortal_num": 13007, "immortal_name": "鬼神忍者"}, {"id": 3, "mythic_num": 4001, "mythic_name": "オークシャーマン", "immortal_num": null, "immortal_name": ""}, {"id": 4, "mythic_num": 4002, "mythic_name": "パルス発生器", "immortal_num": 14002, "immortal_name": "ドクターパルス"}, {"id": 5, "mythic_num": 4006, "mythic_name": "猫の魔法使い", "immortal_num": null, "immortal_name": ""}, {"id": 6, "mythic_num": 5001, "mythic_name": "バンバ", "immortal_num": 15001, "immortal_name": "原始バンバ"}, {"id": 7, "mythic_num": 5002, "mythic_name": "コルディ", "immortal_num": 15002, "immortal_name": "女王コルディ"}, {"id": 8, "mythic_num": 5003, "mythic_name": "ランスロット", "immortal_num": null, "immortal_name": ""}, {"id": 9, "mythic_num": 5004, "mythic_name": "アイアンニャン", "immortal_num": 15004, "immortal_name": "アイアムニャン"}, {"id": 10, "mythic_num": 5005, "mythic_name": "ブロッブ", "immortal_num": null, "immortal_name": ""}, {"id": 11, "mythic_num": 5006, "mythic_name": "ドラゴン", "immortal_num": 15006, "immortal_name": "魔王ドラゴン"}, {"id": 12, "mythic_num": 5007, "mythic_name": "モノポリーマン", "immortal_num": null, "immortal_name": ""}, {"id": 13, "mythic_num": 5008, "mythic_name": "ママ", "immortal_num": 15008, "immortal_name": "グランドママ"}, {"id": 14, "mythic_num": 5009, "mythic_name": "カエルの王様", "immortal_num": 15009, "immortal_name": "死神カエル"}, {"id": 15, "mythic_num": 5010, "mythic_name": "バットマン", "immortal_num": 15010, "immortal_name": "エースバットマン"}, {"id": 16, "mythic_num": 5011, "mythic_name": "ヴェイン", "immortal_num": 15011, "immortal_name": "トップヴェイン"}, {"id": 17, "mythic_num": 5012, "mythic_name": "インディ", "immortal_num": null, "immortal_name": ""}, {"id": 18, "mythic_num": 5013, "mythic_name": "ワット", "immortal_num": null, "immortal_name": ""}, {"id": 19, "mythic_num": 5014, "mythic_name": "タール", "immortal_num": null, "immortal_name": ""}, {"id": 20, "mythic_num": 5015, "mythic_name": "ロケッチュー", "immortal_num": null, "immortal_name": ""}, {"id": 21, "mythic_num": 5016, "mythic_name": "ウチ", "immortal_num": null, "immortal_name": ""}, {"id": 22, "mythic_num": 5017, "mythic_name": "ビリ", "immortal_num": null, "immortal_name": ""}, {"id": 23, "mythic_num": 5018, "mythic_name": "マスタークン", "immortal_num": null, "immortal_name": ""}, {"id": 24, "mythic_num": 5019, "mythic_name": "チョナ", "immortal_num": null, "immortal_name": ""}, {"id": 25, "mythic_num": 5020, "mythic_name": "ペンギン楽師", "immortal_num": 15020, "immortal_name": "ノイズペンギンキング"}, {"id": 26, "mythic_num": 5021, "mythic_name": "ヘイリー", "immortal_num": 15021, "immortal_name": "覚醒ヘイリー"}, {"id": 27, "mythic_num": 5022, "mythic_name": "アト", "immortal_num": 15022, "immortal_name": "時空アト"}, {"id": 28, "mythic_num": 5023, "mythic_name": "ロカ", "immortal_num": 15023, "immortal_name": "キャプテン・ロカ"}, {"id": 29, "mythic_num": 5024, "mythic_name": "選鳥師", "immortal_num": 15024, "immortal_name": "ボス選鳥師"}, {"id": 30, "mythic_num": 5025, "mythic_name": "チャド", "immortal_num": 15025, "immortal_name": "ギガチャド"}];

  const LS_KEY = 'ld_question_template_v1';
  const el = (id) => document.getElementById(id);

  const state = {
    pay: '無課金',
    vault: '6',
    epicUnder15: false,
    mode: '通常マッチ',
    difficulty: '地獄',
    detail: '安定周回',

    units: new Map(), // id -> { form:'mythic'|'immortal', level:0|6|12|15, treasure:boolean }
    unitMeta: [], // fetched list
  };


  function updateShotSummary() {
    const l1 = el('shotLine1');
    const l2 = el('shotLine2');
    if (!l1 || !l2) return;

    const epicText = state.epicUnder15 ? 'Lv15未満のエピックがいる' : 'Lv15未満のエピックはいない';
    l1.textContent = `課金度 ${state.pay}　金庫Lv ${state.vault}　${epicText}`;
    l2.textContent = `対象モード ${state.mode}　難易度 ${state.difficulty}　詳細 ${state.detail}`;
  }

  function setShotMode(on) {
    document.body.classList.toggle('shotMode', !!on);
    const btn = el('btnShot');
    if (btn) btn.textContent = on ? '入力に戻る' : 'スクショ用表示';
    updateShotSummary();
    if (on) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

function toast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    window.clearTimeout(toast._tm);
    toast._tm = window.setTimeout(() => t.classList.remove('show'), 1400);
  }

  function getSupabaseBase() {
    return (window.LD_SUPABASE_URL || 'https://teggcuiyqkbcvbhdntni.supabase.co').replace(/\/$/, '');
  }

  function getStorageUrl(num) {
    // Spec: https://.../storage/v1/object/public/svg/●●●●.svg
    return `${getSupabaseBase()}/storage/v1/object/public/svg/${num}.svg`;
  }

  function getUnitImgCandidates(num) {
    // Prefer same-origin SVG on GitHub Pages: /LDwiki/svg/xxxx.svg
    return [`svg/${num}.svg`, getStorageUrl(num)];
  }


  async function fetchUnitsFromSupabase() {
    if (!window.LD_SUPABASE_URL || !window.LD_SUPABASE_ANON_KEY) {
      return null;
    }
    const url = `${getSupabaseBase()}/rest/v1/ld_q_unit?select=id,mythic_num,mythic_name,immortal_num,immortal_name&order=id.asc`;
    const res = await fetch(url, {
      headers: {
        apikey: window.LD_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.LD_SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    return rows.map(r => ({
      id: Number(r.id),
      mythic_num: Number(r.mythic_num),
      mythic_name: String(r.mythic_name || ''),
      immortal_num: r.immortal_num == null ? null : Number(r.immortal_num),
      immortal_name: String(r.immortal_name || ''),
    }));
  }

  function unitHasImmortal(meta) {
    return meta.immortal_num != null;
  }

  function isTreasureAllowed(meta, s) {
    // NG: unowned, mythic Lv6
    // OK: mythic Lv12/15, immortal Lv6/12/15
    if (!s || s.level === 0) return false;
    if (s.form === 'immortal') return true;
    return (s.level === 12 || s.level === 15);
  }

  function ensureUnitState(meta) {
    if (state.units.has(meta.id)) return state.units.get(meta.id);
    const s = {
      form: 'mythic',
      level: 0,
      treasure: false,
    };
    state.units.set(meta.id, s);
    return s;
  }

  function sanitizeTreasure(meta, s) {
    if (!isTreasureAllowed(meta, s)) s.treasure = false;
  }

  function cycleLevel(meta) {
    const s = ensureUnitState(meta);

    if (!unitHasImmortal(meta)) {
      // 0 -> 6 -> 12 -> 15 -> 0
      if (s.level === 0) s.level = 6;
      else if (s.level === 6) s.level = 12;
      else if (s.level === 12) s.level = 15;
      else s.level = 0;

      s.form = 'mythic';
      sanitizeTreasure(meta, s);
      return;
    }

    // Has immortal form
    if (s.form === 'mythic') {
      if (s.level === 0) s.level = 6;
      else if (s.level === 6) s.level = 12;
      else if (s.level === 12) s.level = 15;
      else {
        // mythic 15 -> immortal 6
        s.form = 'immortal';
        s.level = 6;
      }
      sanitizeTreasure(meta, s);
      return;
    }

    // immortal
    if (s.level === 6) s.level = 12;
    else if (s.level === 12) s.level = 15;
    else {
      // immortal 15 -> back to mythic unowned
      s.form = 'mythic';
      s.level = 0;
      s.treasure = false;
    }
    sanitizeTreasure(meta, s);
  }

  function setImgByNum(img, num) {
    const candidates = getUnitImgCandidates(num);
    // Keep state on the element to avoid recreating closures
    img._cands = candidates;
    img._candIdx = 0;
    img.src = candidates[0];
    img.onerror = () => {
      img._candIdx = (img._candIdx || 0) + 1;
      if (img._cands && img._candIdx < img._cands.length) {
        img.src = img._cands[img._candIdx];
      }
    };
  }

  function applyTileView(btn, meta, s, opts={}) {
    const refs = btn._refs;
    const isUnowned = s.level === 0;
    const isImmortal = s.form === 'immortal' && s.level !== 0;

    btn.classList.toggle('unitTile--immortal', isImmortal);
    btn.classList.toggle('unitTile--unowned', isUnowned);

    // Disabled (treasure modal only)
    const disabled = !!opts.disabled;
    btn.classList.toggle('unitTile--disabled', disabled);
    btn.disabled = disabled;

    // Image
    const num = (s.form === 'immortal' && meta.immortal_num != null) ? meta.immortal_num : meta.mythic_num;
    if (String(num) !== refs.img.dataset.num) {
      refs.img.dataset.num = String(num);
      setImgByNum(refs.img, num);
    }

    // Lv overlay
    refs.lv.textContent = (s.level === 0) ? '未' : String(s.level);

    // Treasure overlay (always present)
    refs.tr.textContent = s.treasure ? '専' : '';
  }

  function renderUnitTile(meta, s, opts={}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'unitTile';
    btn.dataset.uid = String(meta.id);

    const img = document.createElement('img');
    img.alt = meta.mythic_name || `unit-${meta.id}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    btn.appendChild(img);

    const lv = document.createElement('div');
    lv.className = 'overlayLv';
    btn.appendChild(lv);

    const tr = document.createElement('div');
    tr.className = 'overlayTreasure';
    btn.appendChild(tr);

    btn._refs = { img, lv, tr };

    applyTileView(btn, meta, s, opts);
    return btn;
  }

  function initMetaIndex() {
    state.metaById = new Map();
    for (const m of state.unitMeta) state.metaById.set(m.id, m);
  }

  function initMainGrid() {
    const grid = el('unitGrid');
    grid.innerHTML = '';
    state.mainTileById = new Map();

    for (const meta of state.unitMeta) {
      const s = ensureUnitState(meta);
      sanitizeTreasure(meta, s);
      const tile = renderUnitTile(meta, s);
      grid.appendChild(tile);
      state.mainTileById.set(meta.id, tile);
    }

    // Event delegation: one handler only
    if (!grid._bound) {
      grid.addEventListener('click', (e) => {
        const tile = e.target.closest('.unitTile');
        if (!tile || tile.disabled) return;
        const id = Number(tile.dataset.uid);
        const meta = state.metaById.get(id);
        if (!meta) return;

        const s = ensureUnitState(meta);
        cycleLevel(meta);
        sanitizeTreasure(meta, s);

        // Update only this tile
        applyTileView(tile, meta, s);

        // Keep treasure modal tile in sync if open
        if (el('treasureModal').getAttribute('aria-hidden') === 'false') {
          const t = state.treasureTileById && state.treasureTileById.get(id);
          if (t) applyTileView(t, meta, s, { disabled: !isTreasureAllowed(meta, s) });
        }

        markChanged();
      });
      grid._bound = true;
    }
  }

  function initTreasureGrid() {
    const grid = el('treasureGrid');
    grid.innerHTML = '';
    state.treasureTileById = new Map();

    for (const meta of state.unitMeta) {
      const s = ensureUnitState(meta);
      sanitizeTreasure(meta, s);
      const allowed = isTreasureAllowed(meta, s);
      const tile = renderUnitTile(meta, s, { disabled: !allowed });
      grid.appendChild(tile);
      state.treasureTileById.set(meta.id, tile);
    }

    if (!grid._bound) {
      grid.addEventListener('click', (e) => {
        const tile = e.target.closest('.unitTile');
        if (!tile || tile.disabled) return;
        const id = Number(tile.dataset.uid);
        const meta = state.metaById.get(id);
        if (!meta) return;

        const s = ensureUnitState(meta);
        // toggle treasure (modal is for treasure only)
        if (!isTreasureAllowed(meta, s)) return;
        s.treasure = !s.treasure;

        // Update modal tile + main tile
        applyTileView(tile, meta, s, { disabled:false });
        const main = state.mainTileById.get(id);
        if (main) applyTileView(main, meta, s);

        markChanged();
      });
      grid._bound = true;
    }
  }

  function refreshTreasureGridAll() {
    if (!state.treasureTileById) return;
    for (const meta of state.unitMeta) {
      const s = ensureUnitState(meta);
      sanitizeTreasure(meta, s);
      const t = state.treasureTileById.get(meta.id);
      if (t) applyTileView(t, meta, s, { disabled: !isTreasureAllowed(meta, s) });
    }
  }

      tile.addEventListener('click', () => {
        const cur = ensureUnitState(meta);
        sanitizeTreasure(meta, cur);
        if (!isTreasureAllowed(meta, cur)) {
          toast('財宝は「神話Lv12/15」または「不滅」で設定できます');
          return;
        }
        cur.treasure = !cur.treasure;
        markChanged();
        initTreasureGrid();
        initMainGrid();
      });
      grid.appendChild(tile);
    }
  }

  function updatePurposeVisibility() {
    const mode = state.mode;
    const diffRow = el('difficultyRow');
    const detailRow = el('detailRow');

    if (mode === '通常マッチ') {
      diffRow.hidden = false;
      detailRow.hidden = !(state.difficulty);
    } else {
      diffRow.hidden = true;
      detailRow.hidden = true;
      state.difficulty = '';
      state.detail = '';
      // clear checked UI
      document.querySelectorAll('input[name="difficulty"]').forEach(i => i.checked = false);
      document.querySelectorAll('input[name="detail"]').forEach(i => i.checked = false);
    }
  }

  function bindInputs() {
    // pay
    document.querySelectorAll('input[name="pay"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.pay = i.value;
          markChanged();
        }
      });
    });

    // vault
    document.querySelectorAll('input[name="vault"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.vault = i.value;
          markChanged();
        }
      });
    });

    // epic checkbox
    el('epicUnder15').addEventListener('change', (e) => {
      state.epicUnder15 = !!e.target.checked;
      markChanged();
    });

    // mode
    document.querySelectorAll('input[name="mode"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.mode = i.value;
          markChanged();
          updatePurposeVisibility();
        }
      });
    });

    // difficulty
    document.querySelectorAll('input[name="difficulty"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.difficulty = i.value;
          // when difficulty changes, keep detail but show it
          markChanged();
          updatePurposeVisibility();
        }
      });
    });

    // detail
    document.querySelectorAll('input[name="detail"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.detail = i.value;
          markChanged();
        }
      });
    });

    // modal open/close
    el('btnTreasure').addEventListener('click', () => {
      openModal();
    });

    el('treasureModal').addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close === '1') {
        closeModal();
      }
    });

    // reset
    el('btnReset').addEventListener('click', () => {
      if (!confirm('入力内容をリセットしますか？')) return;
      localStorage.removeItem(LS_KEY);
      window.location.reload();
    });

    // screenshot mode toggle (ユーザーは端末のスクショで投稿)
    const btnShot = el('btnShot');
    if (btnShot) {
      btnShot.addEventListener('click', () => {
        const on = !document.body.classList.contains('shotMode');
        setShotMode(on);
        toast(on ? 'スクショ用表示に切り替えました' : '入力表示に戻しました');
      });
    }

  }

  function saveStateImmediate() {
    const obj = {
      pay: state.pay,
      vault: state.vault,
      epicUnder15: state.epicUnder15,
      mode: state.mode,
      difficulty: state.difficulty,
      detail: state.detail,
      units: Array.from(state.units.entries()).map(([id, s]) => [id, s]),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  }

  function scheduleSaveState() {
    window.clearTimeout(scheduleSaveState._tm);
    scheduleSaveState._tm = window.setTimeout(() => {
      try { saveStateImmediate(); } catch (e) { /* ignore */ }
    }, 450);
  }

  function markChanged() {
    // summary is cheap; keep it up to date forスクショ用表示
    updateShotSummary();
    scheduleSaveState();
  }

  function loadState() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      state.pay = (obj.pay && String(obj.pay).trim()) ? String(obj.pay) : state.pay;
      state.vault = (obj.vault && String(obj.vault).trim()) ? String(obj.vault) : state.vault;
      state.epicUnder15 = !!obj.epicUnder15;
      state.mode = (obj.mode && String(obj.mode).trim()) ? String(obj.mode) : state.mode;
      state.difficulty = (obj.difficulty && String(obj.difficulty).trim()) ? String(obj.difficulty) : state.difficulty;
      state.detail = (obj.detail && String(obj.detail).trim()) ? String(obj.detail) : state.detail;
      state.units = new Map((obj.units || []).map(([id, s]) => [Number(id), s]));
    } catch {
      // ignore
    }
  }

  function applyStateToUI() {
    if (state.pay) {
      const i = document.querySelector(`input[name="pay"][value="${state.pay}"]`);
      if (i) i.checked = true;
    }
    if (state.vault) {
      const i = document.querySelector(`input[name="vault"][value="${state.vault}"]`);
      if (i) i.checked = true;
    }
    el('epicUnder15').checked = !!state.epicUnder15;

    if (state.mode) {
      const i = document.querySelector(`input[name="mode"][value="${state.mode}"]`);
      if (i) i.checked = true;
    }
    if (state.difficulty) {
      const i = document.querySelector(`input[name="difficulty"][value="${state.difficulty}"]`);
      if (i) i.checked = true;
    }
    if (state.detail) {
      const i = document.querySelector(`input[name="detail"][value="${state.detail}"]`);
      if (i) i.checked = true;
    }
    updatePurposeVisibility();
  }

  function openModal() {
    const m = el('treasureModal');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Build once, then only refresh (fast)
    if (!state.treasureTileById) initTreasureGrid();
    refreshTreasureGridAll();
  }

  function closeModal() {
    const m = el('treasureModal');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async function boot() {
    loadState();
    bindInputs();

    let list = null;
    try {
      list = await fetchUnitsFromSupabase();
    } catch (e) {
      console.warn(e);
    }
    state.unitMeta = list || FALLBACK_UNITS;

    initMetaIndex();

    // Ensure map has entries so order stable
    for (const meta of state.unitMeta) {
      const s = ensureUnitState(meta);
      // if saved state has old objects, keep them
      const saved = state.units.get(meta.id);
      if (saved) {
        // normalize
        saved.form = saved.form || 'mythic';
        saved.level = Number(saved.level || 0);
        saved.treasure = !!saved.treasure;
        sanitizeTreasure(meta, saved);
      } else {
        sanitizeTreasure(meta, s);
      }
    }

    applyStateToUI();
    updateShotSummary();
    initMainGrid();
    initTreasureGrid();
  }

  window.addEventListener('DOMContentLoaded', boot, { once:true });
})();
