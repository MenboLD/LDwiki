/* ld_cards_buffs.js */
(() => {
  'use strict';

  const SUPABASE_URL = window.LD_SUPABASE_URL || 'https://teggcuiyqkbcvbhdntni.supabase.co';
  const SUPABASE_ANON_KEY = window.LD_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc';

  const statusText = document.getElementById('statusText');
  const tbody = document.getElementById('buffTbody');
  const toastEl = document.getElementById('toast');

  const resetSortBtn = document.getElementById('resetSortBtn');

  const opToggle = document.getElementById('opToggle');
  const visToggle = document.getElementById('visToggle');
  const gradeSortToggle = document.getElementById('gradeSortToggle');

  const noteSearch = document.getElementById('noteSearch');
  const clearSearch = document.getElementById('clearSearch');

  const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
  let currentMode = '太初';

  let supa = null;
  let user = null;

  const state = { items: [] };
  let filterQuery = '';
  let opVisibleWanted = false;   // default: hidden
  let visVisibleWanted = false;  // default: hidden
  let gradeSortWanted = false;   // default: off

  // Default UI states
  document.body.classList.add('hide-op', 'hide-vis');
  if (opToggle) opToggle.checked = false;
  if (visToggle) visToggle.checked = false;
  if (gradeSortToggle) gradeSortToggle.checked = false;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('is-show'), 1500);
  }

  function setStatus(msg) {
    statusText.textContent = msg;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function noteToHtml(note) {
    const escaped = escapeHtml(note);
    return escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\n/g, '<br>');
  }

  function gradeRank(g) {
    const k = String(g ?? 'N').trim().toUpperCase();
    // L > E > R > N
    return ({ L: 0, E: 1, R: 2, N: 3 }[k] ?? 9);
  }

  function isLockedMode() {
    return !!(filterQuery && filterQuery.trim()) || gradeSortWanted;
  }

  function setOpVisible(v) {
    const want = !!v;
    if (want && visVisibleWanted) {
      visVisibleWanted = false;
      if (visToggle) visToggle.checked = false;
      toast('「表示列」と「操作列」は同時に表示できません');
    }
    opVisibleWanted = want;
    if (opToggle) opToggle.checked = opVisibleWanted;
  }

  function setVisVisible(v) {
    const want = !!v;
    if (want && opVisibleWanted) {
      opVisibleWanted = false;
      if (opToggle) opToggle.checked = false;
      toast('「表示列」と「操作列」は同時に表示できません');
    }
    visVisibleWanted = want;
    if (visToggle) visToggle.checked = visVisibleWanted;
  }

  function syncColumnVisibility() {
    document.body.classList.toggle('hide-op', !opVisibleWanted);
    document.body.classList.toggle('hide-vis', !visVisibleWanted);
  }

  function updateStatus() {
    const searching = !!(filterQuery && filterQuery.trim());
    const locked = isLockedMode();
    if (searching && gradeSortWanted) {
      setStatus('検索 + レアリティ順（操作はTのみ）');
    } else if (searching) {
      setStatus(locked ? '検索中（操作はTのみ）' : '検索中');
    } else if (gradeSortWanted) {
      setStatus('レアリティ順（操作はTのみ）');
    } else {
      setStatus('OK');
    }
  }

  function sortedItems() {
    return state.items.slice().sort((a,b) => a.sort_order - b.sort_order);
  }

  function buildIndexMapSorted(itemsSorted) {
    const map = new Map();
    for (let i = 0; i < itemsSorted.length; i++) {
      map.set(String(itemsSorted[i].card_id), i);
    }
    return map;
  }

  function currentVisibleBase(sorted) {
    if (visVisibleWanted) return sorted;               // show all (including disabled)
    return sorted.filter(it => it.is_enabled);         // hide unchecked rows
  }

  function render() {
    const q = (filterQuery || '').trim().toLowerCase();

    if (!state.items.length) {
      tbody.innerHTML = `<tr><td class="empty" colspan="5">データがありません</td></tr>`;
      return;
    }

    const sorted = sortedItems();
    const base = currentVisibleBase(sorted);

    const filtered = q
      ? base.filter(it => String(it.master?.Note ?? '').toLowerCase().includes(q))
      : base;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td class="empty" colspan="5">該当する行がありません</td></tr>`;
      return;
    }

    const display = gradeSortWanted
      ? filtered.slice().sort((a,b) => (gradeRank(a.master?.GradeType) - gradeRank(b.master?.GradeType)) || (a.sort_order - b.sort_order))
      : filtered;

    const locked = isLockedMode();
    const idxMap = buildIndexMapSorted(sorted);

    let prevG = null;
    let runParity = 0;

    tbody.innerHTML = display.map((it) => {
      const m = it.master || {};
      const img = (m.Imageurl ?? '').trim();
      const name = (m.Name ?? '').trim();
      const note = (m.Note ?? '').trim();

      const gRaw = String(m.GradeType ?? 'N').trim().toUpperCase();
      const g = (gRaw === 'L' || gRaw === 'E' || gRaw === 'R' || gRaw === 'N') ? gRaw : 'N';
      if (g === prevG) runParity ^= 1;
      else runParity = 0;
      prevG = g;
      const rowClass = `g-${g.toLowerCase()} alt-${runParity ? 'b' : 'a'}`;

      const realIdx = idxMap.get(String(it.card_id));
      const canUser = !!user;
      const topDisabled = (realIdx === undefined) || (realIdx <= 0) || !canUser;

      const imgHtml = img
        ? `<img class="card-img" src="${escapeHtml(img)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`
        : `<span class="muted">—</span>`;

      const visDisabled = !canUser;
      const visHtml = `<input class="vischk" type="checkbox" data-act="vis" ${it.is_enabled ? 'checked' : ''} ${visDisabled ? 'disabled' : ''} />`;

      let opsHtml = '';
      if (locked) {
        opsHtml = `<button class="opbtn" data-act="top" title="先頭へ" ${topDisabled ? 'disabled' : ''}>T</button>`;
      } else {
        const upDisabled = (realIdx === undefined) || (realIdx <= 0) || !canUser;
        const downDisabled = (realIdx === undefined) || (realIdx >= sorted.length - 1) || !canUser;
        opsHtml = `
          <button class="opbtn" data-act="up" title="上へ" ${upDisabled ? 'disabled' : ''}>▲</button>
          <button class="opbtn" data-act="down" title="下へ" ${downDisabled ? 'disabled' : ''}>▼</button>
          <button class="opbtn" data-act="top" title="先頭へ" ${topDisabled ? 'disabled' : ''}>T</button>
        `;
      }

      return `
        <tr data-card-id="${it.card_id}" class="${rowClass}">
          <td class="col-vis">${visHtml}</td>
          <td class="col-op"><div class="ops">${opsHtml}</div></td>
          <td class="col-img">${imgHtml}</td>
          <td class="col-name"><div class="name">${escapeHtml(name)}</div></td>
          <td class="col-note"><div class="note">${noteToHtml(note)}</div></td>
        </tr>
      `;
    }).join('');
  }

  async function ensureAuth() {
    const { data: s1 } = await supa.auth.getSession();
    if (s1?.session?.user) return s1.session.user;

    try {
      const { data, error } = await supa.auth.signInAnonymously();
      if (!error && data?.user) return data.user;
    } catch (_) {}
    return null;
  }

  async function fetchMaster(mode) {
    const { data, error } = await supa
      .from('ld_cards_buffs')
      .select('Id,Mode,Num,GradeType,Imageurl,Name,Note')
      .eq('Mode', mode)
      .order('Num', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function fetchUserList(mode) {
    const { data, error } = await supa
      .from('ld_cards_buffs_user_list')
      .select('card_id,sort_order,is_enabled')
      .eq('user_id', user.id)
      .eq('mode', mode)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function initUserListIfNeeded(mode) {
    const list = await fetchUserList(mode);
    if (list.length) return list;

    const master = await fetchMaster(mode);
    if (!master.length) return [];

    const payload = master.map((m, i) => ({
      user_id: user.id,
      mode,
      card_id: m.Id,
      sort_order: i + 1,
      is_enabled: true,
    }));

    const { error } = await supa
      .from('ld_cards_buffs_user_list')
      .upsert(payload, { onConflict: 'user_id,mode,card_id' });
    if (error) throw error;

    return await fetchUserList(mode);
  }

  async function loadMode(mode) {
    currentMode = mode;
    setStatus('読込中…');

    modeButtons.forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    try {
      if (!supa) supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      if (!user) user = await ensureAuth();

      if (!user) {
        const master = await fetchMaster(mode);
        state.items = master.map((m, i) => ({ card_id: m.Id, sort_order: i + 1, is_enabled: true, master: m }));
        render();
        syncColumnVisibility();
        updateStatus();
        return;
      }

      const userList = await initUserListIfNeeded(mode);
      if (!userList.length) {
        state.items = [];
        render();
        syncColumnVisibility();
        setStatus('データがありません');
        return;
      }

      const ids = userList.map(r => r.card_id);
      const { data: masterRows, error: mErr } = await supa
        .from('ld_cards_buffs')
        .select('Id,Imageurl,Name,Note,Num,GradeType,Mode')
        .in('Id', ids);
      if (mErr) throw mErr;

      const byId = new Map((masterRows || []).map(r => [r.Id, r]));
      state.items = userList
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(r => ({
          card_id: r.card_id,
          sort_order: r.sort_order,
          is_enabled: (r.is_enabled !== false),
          master: byId.get(r.card_id) || { Id: r.card_id, Imageurl: '', Name: '', Note: '', GradeType: 'N' },
        }));

      render();
      syncColumnVisibility();
      updateStatus();
    } catch (e) {
      console.error(e);
      state.items = [];
      render();
      syncColumnVisibility();
      setStatus('読込失敗');
      toast('読み込みに失敗しました');
    }
  }

  async function persist(itemsToSave) {
    const payload = itemsToSave.map(it => ({
      user_id: user.id,
      mode: currentMode,
      card_id: it.card_id,
      sort_order: it.sort_order,
      is_enabled: it.is_enabled ?? true,
    }));
    const { error } = await supa
      .from('ld_cards_buffs_user_list')
      .upsert(payload, { onConflict: 'user_id,mode,card_id' });
    if (error) throw error;
  }

  function findRealIndex(cardId) {
    const sorted = sortedItems();
    return sorted.findIndex(it => String(it.card_id) === String(cardId));
  }

  async function moveUp(realIdx) {
    const arr = sortedItems();
    if (realIdx <= 0) return;
    const a = arr[realIdx - 1];
    const b = arr[realIdx];
    arr[realIdx - 1] = b;
    arr[realIdx] = a;
    arr.forEach((it, i) => (it.sort_order = i + 1));
    state.items = arr;
    render();
    await persist([a, b]);
  }

  async function moveDown(realIdx) {
    const arr = sortedItems();
    if (realIdx < 0 || realIdx >= arr.length - 1) return;
    const a = arr[realIdx];
    const b = arr[realIdx + 1];
    arr[realIdx] = b;
    arr[realIdx + 1] = a;
    arr.forEach((it, i) => (it.sort_order = i + 1));
    state.items = arr;
    render();
    await persist([a, b]);
  }

  async function moveTop(realIdx) {
    const arr = sortedItems();
    if (realIdx <= 0) return;
    const moved = arr.splice(realIdx, 1)[0];
    arr.unshift(moved);
    arr.forEach((it, i) => (it.sort_order = i + 1));
    state.items = arr;
    render();
    await persist(arr);
  }

  async function resetSortOrder() {
    if (!user) {
      toast('操作はログインが必要です');
      return;
    }
    setStatus('リセット中…');
    try {
      const master = await fetchMaster(currentMode);
      const keep = new Map(state.items.map(it => [String(it.card_id), it.is_enabled !== false]));
      state.items = master.map((m, i) => ({
        card_id: m.Id,
        sort_order: i + 1,
        is_enabled: keep.has(String(m.Id)) ? keep.get(String(m.Id)) : true,
        master: m,
      }));
      await persist(state.items);
      render();
      updateStatus();
      toast('リセットしました');
    } catch (e) {
      console.error(e);
      updateStatus();
      toast('リセットに失敗しました');
    }
  }

  // Toggles (mutually exclusive)
  if (opToggle) {
    opToggle.addEventListener('change', () => {
      setOpVisible(opToggle.checked);
      syncColumnVisibility();
    });
  }

  if (visToggle) {
    visToggle.addEventListener('change', () => {
      setVisVisible(visToggle.checked);
      syncColumnVisibility();
      render();
      updateStatus();
    });
  }

  if (gradeSortToggle) {
    gradeSortToggle.addEventListener('change', () => {
      gradeSortWanted = !!gradeSortToggle.checked;
      render();
      updateStatus();
    });
  }

  if (resetSortBtn) {
    resetSortBtn.addEventListener('click', resetSortOrder);
  }

  // Search
  function applyFilterFromInput() {
    filterQuery = (noteSearch?.value || '').trim();
    render();
    updateStatus();
  }

  if (noteSearch) {
    noteSearch.addEventListener('input', applyFilterFromInput);
    noteSearch.addEventListener('search', applyFilterFromInput);
  }

  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      if (noteSearch) noteSearch.value = '';
      applyFilterFromInput();
      noteSearch?.focus();
    });
  }

  // Row interactions
  tbody.addEventListener('click', async (ev) => {
    const vis = ev.target.closest('input.vischk');
    if (vis) {
      if (!user) {
        toast('操作はログインが必要です');
        ev.preventDefault();
        return;
      }
      const tr = vis.closest('tr');
      const cardId = tr?.dataset?.cardId;
      const it = state.items.find(x => String(x.card_id) === String(cardId));
      if (!it) return;

      it.is_enabled = !!vis.checked;

      setStatus('更新中…');
      try {
        await persist([it]);
        render();
        updateStatus();
        toast('更新しました');
      } catch (e) {
        console.error(e);
        toast('更新に失敗しました');
        await loadMode(currentMode);
      }
      return;
    }

    const btn = ev.target.closest('button.opbtn');
    if (!btn) return;

    const act = btn.dataset.act;
    const locked = isLockedMode();
    if (locked && act !== 'top') {
      toast('検索/レアリティ順ではTのみ使用できます');
      return;
    }
    if (!user) {
      toast('操作はログインが必要です');
      return;
    }

    const tr = btn.closest('tr');
    const cardId = tr?.dataset?.cardId;
    const realIdx = findRealIndex(cardId);
    if (realIdx < 0) return;

    btn.disabled = true;
    setStatus('更新中…');

    try {
      if (act === 'up') await moveUp(realIdx);
      else if (act === 'down') await moveDown(realIdx);
      else if (act === 'top') await moveTop(realIdx);

      updateStatus();
      toast('更新しました');
    } catch (e) {
      console.error(e);
      toast('更新に失敗しました');
      setStatus('更新失敗');
      await loadMode(currentMode);
    }
  });

  // Mode switching
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => loadMode(btn.dataset.mode));
  });

  // Boot
  syncColumnVisibility();
  loadMode(currentMode);
})();
