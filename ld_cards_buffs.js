/* ld_cards_buffs.js */
(() => {
  'use strict';

  // From spec (fallback) + existing supabase_config.js (preferred)
  const SUPABASE_URL = window.LD_SUPABASE_URL || 'https://teggcuiyqkbcvbhdntni.supabase.co';
  const SUPABASE_ANON_KEY = window.LD_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc';

  const statusText = document.getElementById('statusText');
  const tbody = document.getElementById('buffTbody');
  const toastEl = document.getElementById('toast');

  const opToggle = document.getElementById('opToggle');
  const noteSearch = document.getElementById('noteSearch');
  const clearSearch = document.getElementById('clearSearch');

  // default: 操作列は非表示
  document.body.classList.add('hide-op');
  if (opToggle) opToggle.checked = false;

  const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
  let currentMode = '太初';

  let supa = null;
  let user = null;

  /** @type { items: Array<{
   *  card_id:number,
   *  sort_order:number,
   *  is_enabled:boolean,
   *  master: any
   * }> } */
  let state = { items: [] };
  let filterQuery = '';

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
    // allow only <br> tags (from CSV)
    const escaped = escapeHtml(note);
    return escaped
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/\n/g, '<br>');
  }

  function render() {
    const items = state.items;
    if (!items.length) {
      tbody.innerHTML = `<tr><td class="empty" colspan="4">データがありません</td></tr>`;
      return;
    }

    const q = (filterQuery || '').trim().toLowerCase();
    const visibleItems = q
      ? items.filter(it => String(it.master?.Note ?? '').toLowerCase().includes(q))
      : items;

    if (!visibleItems.length) {
      tbody.innerHTML = `<tr><td class="empty" colspan="4">該当する行がありません</td></tr>`;
      return;
    }

    const rowsHtml = visibleItems.map((it, idx) => {
      const m = it.master || {};
      const img = (m.Imageurl ?? '').trim();
      const name = (m.Name ?? '').trim();
      const note = (m.Note ?? '').trim();

      const upDisabled = idx === 0 || !user || q;
      const downDisabled = idx === visibleItems.length - 1 || !user || q;
      const topDisabled = idx === 0 || !user || q;

      const imgHtml = img
        ? `<img class="card-img" src="${escapeHtml(img)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`
        : `<span class="muted">—</span>`;

      return `
        <tr data-card-id="${it.card_id}">
          <td class="col-op">
            <div class="ops">
              <button class="opbtn" data-act="up" title="上へ" ${upDisabled?'disabled':''}>▲</button>
              <button class="opbtn" data-act="down" title="下へ" ${downDisabled?'disabled':''}>▼</button>
              <button class="opbtn" data-act="top" title="先頭へ" ${topDisabled?'disabled':''}>T</button>
            </div>
          </td>
          <td class="col-img">${imgHtml}</td>
          <td class="col-name"><div class="name">${escapeHtml(name)}</div></td>
          <td class="col-note"><div class="note">${noteToHtml(note)}</div></td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;
  }

  async function ensureAuth() {
    // If you have your own login system, you can replace this with it.
    // Here we try anonymous sign-in for "per-user ordering".
    const { data: s1 } = await supa.auth.getSession();
    if (s1?.session?.user) return s1.session.user;

    try {
      const { data, error } = await supa.auth.signInAnonymously();
      if (!error && data?.user) return data.user;
    } catch (_) {}

    return null;
  }

  async function fetchMaster(mode) {
    // mixed-case columns (CSV header exact match)
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

    // UI tabs
    modeButtons.forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    try {
      if (!supa) {
        supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      if (filterQuery) {
      toast('検索中は並び替えできません');
      return;
    }

    if (!user) {
        user = await ensureAuth();
      }

      // If no user, show master list only (read-only)
      if (filterQuery) {
      toast('検索中は並び替えできません');
      return;
    }

    if (!user) {
        const master = await fetchMaster(mode);
        state.items = master.map((m, i) => ({
          card_id: m.Id,
          sort_order: i + 1,
          is_enabled: true,
          master: m,
        }));
        render();
        setStatus(filterQuery ? '検索中（操作は無効）' : '閲覧のみ（並び替えはログインが必要）');
        return;
      }

      // With user: use user_list order
      const userList = await initUserListIfNeeded(mode);

      if (!userList.length) {
        state.items = [];
        render();
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
        .sort((a,b) => a.sort_order - b.sort_order)
        .map(r => ({
          card_id: r.card_id,
          sort_order: r.sort_order,
          is_enabled: r.is_enabled,
          master: byId.get(r.card_id) || { Id: r.card_id, Imageurl:'', Name:'', Note:'' },
        }));

      render();
      setStatus(filterQuery ? '検索中（操作は無効）' : 'OK');
    } catch (e) {
      console.error(e);
      state.items = [];
      render();
      setStatus('読込失敗');
      toast('読み込みに失敗しました');
    }
  }

  function findIndexByCardId(cardId) {
    return state.items.findIndex(it => String(it.card_id) === String(cardId));
  }

  async function persist(itemsToSave) {
    // itemsToSave: array of state.items subset (or all)
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

  async function moveUp(idx) {
    if (idx <= 0) return;
    const a = state.items[idx - 1];
    const b = state.items[idx];

    // swap in array
    state.items[idx - 1] = b;
    state.items[idx] = a;

    // swap sort_order values
    const tmp = b.sort_order;
    b.sort_order = a.sort_order;
    a.sort_order = tmp;

    render();
    await persist([a, b]);
  }

  async function moveDown(idx) {
    if (idx < 0 || idx >= state.items.length - 1) return;
    const a = state.items[idx];
    const b = state.items[idx + 1];

    state.items[idx] = b;
    state.items[idx + 1] = a;

    const tmp = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = tmp;

    render();
    await persist([a, b]);
  }

  async function moveTop(idx) {
    if (idx <= 0) return;
    const moved = state.items.splice(idx, 1)[0];
    state.items.unshift(moved);

    // re-number all sort_order (simple & robust)
    state.items.forEach((it, i) => it.sort_order = i + 1);

    render();
    await persist(state.items);
  }

  // event delegation for op buttons
  tbody.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button.opbtn');
    if (!btn) return;

    if (filterQuery) {
      toast('検索中は並び替えできません');
      return;
    }

    if (!user) {
      toast('並び替えはログインが必要です');
      return;
    }

    const tr = btn.closest('tr');
    const cardId = tr?.dataset?.cardId;
    const idx = findIndexByCardId(cardId);
    if (idx < 0) return;

    btn.disabled = true;
    setStatus('更新中…');

    try {
      const act = btn.dataset.act;
      if (act === 'up') await moveUp(idx);
      else if (act === 'down') await moveDown(idx);
      else if (act === 'top') await moveTop(idx);

      setStatus('OK');
      toast('更新しました');
    } catch (e) {
      console.error(e);
      toast('更新に失敗しました');
      setStatus('更新失敗');
      // reload from server to recover
      await loadMode(currentMode);
    }
  });


  // toggle: show/hide operation column (default hidden)
  if (opToggle) {
    opToggle.addEventListener('change', () => {
      document.body.classList.toggle('hide-op', !opToggle.checked);
    });
  }

  // search: filter by Note (効果) substring (case-insensitive)
  function applyFilterFromInput() {
    filterQuery = (noteSearch?.value || '').trim();
    render();
    setStatus(filterQuery ? '検索中（操作は無効）' : 'OK');
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

  // mode switching
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => loadMode(btn.dataset.mode));
  });

  // boot
  loadMode(currentMode);

})();
