(() => {
  'use strict';

  const ROOT_ID = 'ldmb-board-root-20260331v3';
  const TABLE_NAME = 'ld_easy_board';
  const INITIAL_LIMIT = 5;
  const DISPLAY_STEP = 10;
  const MAX_NAME = 8;
  const MAX_COMMENT = 300;
  const DEFAULT_NAME = '名無しの傭兵員';
  const STORAGE_KEYS = {
    deviceId: 'ldmb_board_device_id_v5',
    name: 'ldmb_board_name_v5'
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${hh}:${mm}`;
  }

  function getOrCreateDeviceId() {
    let id = localStorage.getItem(STORAGE_KEYS.deviceId);
    if (id) return id;
    id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(STORAGE_KEYS.deviceId, id);
    return id;
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function normalizeName(name) {
    const v = String(name || '').trim();
    return v || DEFAULT_NAME;
  }

  function mount(root) {
    if (root.querySelector('#ldmbp-form')) return;
    root.innerHTML = `
      <form id="ldmbp-form" class="ldmbp-form" novalidate>
        <div class="ldmbp-row">
          <input id="ldmbp-name" class="ldmbp-name" type="text" maxlength="8" autocomplete="nickname" placeholder="名前">
          <button id="ldmbp-submit" class="ldmbp-submit" type="submit">書き込む</button>
        </div>
        <div class="ldmbp-row ldmbp-row--stack">
          <textarea id="ldmbp-comment-input" class="ldmbp-comment-input" maxlength="300" rows="4" placeholder="コメント"></textarea>
        </div>
        <div class="ldmbp-meta">
          <span id="ldmbp-char-count">0/300</span>
          <button id="ldmbp-refresh" class="ldmbp-refresh" type="button">更新</button>
        </div>
        <div id="ldmbp-message" class="ldmbp-message" aria-live="polite"></div>
      </form>

      <ol id="ldmbp-list" class="ldmbp-list" aria-live="polite"></ol>
      <div id="ldmbp-empty" class="ldmbp-empty" hidden>まだコメントはありません。</div>
      <div class="ldmbp-more-wrap">
        <button id="ldmbp-more" class="ldmbp-more" type="button" hidden>古いコメント10件を表示</button>
      </div>
    `;
  }

  async function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    mount(root);

    const el = {
      form: root.querySelector('#ldmbp-form'),
      name: root.querySelector('#ldmbp-name'),
      comment: root.querySelector('#ldmbp-comment-input'),
      submit: root.querySelector('#ldmbp-submit'),
      refresh: root.querySelector('#ldmbp-refresh'),
      more: root.querySelector('#ldmbp-more'),
      charCount: root.querySelector('#ldmbp-char-count'),
      message: root.querySelector('#ldmbp-message'),
      list: root.querySelector('#ldmbp-list'),
      empty: root.querySelector('#ldmbp-empty')
    };

    let supabase = null;
    let displayLimit = INITIAL_LIMIT;
    let totalCount = 0;

    function setMessage(text, type = '') {
      el.message.textContent = text || '';
      el.message.className = 'ldmbp-message';
      if (type === 'ok') el.message.classList.add('is-ok');
      if (type === 'warn') el.message.classList.add('is-warn');
    }

    function updateCharCount() {
      el.charCount.textContent = `${el.comment.value.length}/${MAX_COMMENT}`;
    }

    function restoreName() {
      const savedName = localStorage.getItem(STORAGE_KEYS.name);
      if (savedName) el.name.value = savedName;
    }

    async function connect() {
      if (!window.LD_SUPABASE_URL || !window.LD_SUPABASE_ANON_KEY || !window.supabase?.createClient) {
        setMessage('Supabase設定の読み込みに失敗しました。');
        el.submit.disabled = true;
        return false;
      }

      supabase = window.supabase.createClient(window.LD_SUPABASE_URL, window.LD_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { error } = await supabase.from(TABLE_NAME).select('id', { head: true, count: 'exact' });
      if (error) {
        console.error(error);
        setMessage('Supabaseへの接続に失敗しました。');
        el.submit.disabled = true;
        return false;
      }

      el.submit.disabled = false;
      return true;
    }

    async function fetchCount() {
      const { count, error } = await supabase.from(TABLE_NAME).select('id', { head: true, count: 'exact' });
      if (error) throw error;
      totalCount = count || 0;
    }

    function renderComments(items) {
      if (!items.length) {
        el.list.innerHTML = '';
        el.empty.hidden = false;
        return;
      }
      el.empty.hidden = true;
      el.list.innerHTML = items.map((item) => `
        <li class="ldmbp-item">
          <div class="ldmbp-head">${escapeHtml(item.name || DEFAULT_NAME)} ${escapeHtml(formatDate(item.created_at))}</div>
          <div class="ldmbp-comment">${escapeHtml(item.comment)}</div>
        </li>
      `).join('');
    }

    function updateMoreButton() {
      el.more.hidden = totalCount <= displayLimit;
    }

    async function fetchComments() {
      try {
        await fetchCount();
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('id, name, comment, created_at')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(displayLimit);

        if (error) throw error;
        renderComments(data || []);
        updateMoreButton();
      } catch (err) {
        console.error(err);
        el.list.innerHTML = '';
        el.empty.hidden = false;
        el.empty.textContent = 'コメントの読み込みに失敗しました。';
        el.more.hidden = true;
      }
    }

    function validate() {
      const name = normalizeName(el.name.value);
      const comment = el.comment.value.trim();
      if (name.length > MAX_NAME) return { ok: false, message: `名前は${MAX_NAME}文字以内です。` };
      if (!comment) return { ok: false, message: 'コメントを入力してください。' };
      if (comment.length > MAX_COMMENT) return { ok: false, message: `コメントは${MAX_COMMENT}文字以内です。` };
      return { ok: true, name, comment };
    }

    async function onSubmit(event) {
      event.preventDefault();
      setMessage('');
      const checked = validate();
      if (!checked.ok) {
        setMessage(checked.message, 'warn');
        return;
      }

      el.submit.disabled = true;
      try {
        const deviceLocalId = getOrCreateDeviceId();
        const deviceIdHash = await sha256Hex(deviceLocalId);
        const { error } = await supabase.from(TABLE_NAME).insert({
          name: checked.name,
          comment: checked.comment,
          device_local_id: deviceLocalId,
          device_id_hash: deviceIdHash
        });

        if (error) {
          const msg = String(error.message || '投稿に失敗しました。');
          if (msg.includes('3連続投稿')) {
            setMessage('同一端末からの3連続投稿はできません。', 'warn');
          } else {
            setMessage('投稿に失敗しました。');
          }
          return;
        }

        localStorage.setItem(STORAGE_KEYS.name, checked.name === DEFAULT_NAME ? '' : checked.name);
        el.comment.value = '';
        updateCharCount();
        setMessage('投稿しました。', 'ok');
        displayLimit = INITIAL_LIMIT;
        await fetchComments();
      } catch (err) {
        console.error(err);
        setMessage('投稿に失敗しました。');
      } finally {
        el.submit.disabled = false;
      }
    }

    restoreName();
    updateCharCount();
    el.comment.addEventListener('input', updateCharCount);
    el.form.addEventListener('submit', onSubmit);
    el.refresh.addEventListener('click', () => fetchComments());
    el.more.addEventListener('click', async () => {
      displayLimit += DISPLAY_STEP;
      await fetchComments();
    });

    const ok = await connect();
    if (ok) await fetchComments();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
