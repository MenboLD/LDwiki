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

  function renderUnitTile(meta, s, opts={}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'unitTile';

    const isUnowned = s.level === 0;
    const isImmortal = s.form === 'immortal' && s.level !== 0;
    if (isImmortal) btn.classList.add('unitTile--immortal');
    if (isUnowned) btn.classList.add('unitTile--unowned');

    const img = document.createElement('img');
    const num = (s.form === 'immortal' && meta.immortal_num != null) ? meta.immortal_num : meta.mythic_num;
    img.src = getStorageUrl(num);
    img.alt = meta.mythic_name || `unit-${meta.id}`;
    img.loading = 'lazy';
    btn.appendChild(img);

    const lv = document.createElement('div');
    lv.className = 'overlayLv';
    lv.textContent = (s.level === 0) ? '未' : String(s.level);
    btn.appendChild(lv);

    if (s.treasure) {
      const tr = document.createElement('div');
      tr.className = 'overlayTreasure';
      tr.textContent = '専';
      btn.appendChild(tr);
    }

    if (opts.disabled) {
      btn.classList.add('unitTile--disabled');
      btn.disabled = true;
    }

    return btn;
  }

  function renderMainGrid() {
    const grid = el('unitGrid');
    grid.innerHTML = '';
    for (const meta of state.unitMeta) {
      const s = ensureUnitState(meta);
      sanitizeTreasure(meta, s);
      const tile = renderUnitTile(meta, s);
      tile.addEventListener('click', () => {
        cycleLevel(meta);
        saveState();
        renderMainGrid();
        // Keep treasure modal in sync if open
        if (el('treasureModal').getAttribute('aria-hidden') === 'false') {
          renderTreasureGrid();
        }
      });
      grid.appendChild(tile);
    }
  }

  function renderTreasureGrid() {
    const grid = el('treasureGrid');
    grid.innerHTML = '';
    for (const meta of state.unitMeta) {
      const s = ensureUnitState(meta);
      sanitizeTreasure(meta, s);

      const allowed = isTreasureAllowed(meta, s);
      const tile = renderUnitTile(meta, s, { disabled:false });
      if (!allowed) {
        tile.classList.add('unitTile--disabled');
      }

      tile.addEventListener('click', () => {
        const cur = ensureUnitState(meta);
        sanitizeTreasure(meta, cur);
        if (!isTreasureAllowed(meta, cur)) {
          toast('財宝は「神話Lv12/15」または「不滅」で設定できます');
          return;
        }
        cur.treasure = !cur.treasure;
        saveState();
        renderTreasureGrid();
        renderMainGrid();
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
          saveState();
        }
      });
    });

    // vault
    document.querySelectorAll('input[name="vault"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.vault = i.value;
          saveState();
        }
      });
    });

    // epic checkbox
    el('epicUnder15').addEventListener('change', (e) => {
      state.epicUnder15 = !!e.target.checked;
      saveState();
    });

    // mode
    document.querySelectorAll('input[name="mode"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.mode = i.value;
          saveState();
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
          saveState();
          updatePurposeVisibility();
        }
      });
    });

    // detail
    document.querySelectorAll('input[name="detail"]').forEach(i => {
      i.addEventListener('change', () => {
        if (i.checked) {
          state.detail = i.value;
          saveState();
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

    // export
    el('btnExport').addEventListener('click', async () => {
      if (!window.html2canvas) {
        toast('画像保存機能が読み込めませんでした（スクショでOK）');
        return;
      }
      const node = el('capture');
      toast('画像を生成中…');
      try {
        const canvas = await window.html2canvas(node, {
          backgroundColor: '#0f1115',
          scale: 2,
          useCORS: true,
        });
        const dataUrl = canvas.toDataURL('image/png');

        const out = el('exportOut');
        const img = el('exportImg');
        img.src = dataUrl;
        out.hidden = false;
        out.scrollIntoView({ behavior: 'smooth', block: 'start' });

        toast('下に画像を表示しました（長押し→写真に保存）');

      } catch (err) {
        console.error(err);
        toast('画像生成に失敗（スクショでOK）');
      }
    });
  }

  function saveState() {
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
    renderTreasureGrid();
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
    renderMainGrid();
  }

  window.addEventListener('DOMContentLoaded', boot, { once:true });
})();
