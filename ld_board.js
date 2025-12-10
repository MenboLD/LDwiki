import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Supabase 接続設定 */
const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** アプリ状態 */
const state = {
  users: [], // ld_users
  autofixRules: [], // 誤字修正ルール

  // スレッド
  threads: [], // ThreadView[]
  hasMoreParents: true,
  isLoadingParents: false,
  oldestParentCreatedAt: null,
  pageSize: 20,

  // フィルタ
  filters: {
    keyword: "",
    targets: { body: true, title: true, user: true },
    genres: { normal: true, qa: true, report: true, announce: true },
    sinceMyLast: false,
    hasAttachment: false,
  },
  lastOwnCommentTime: null,

  // 投稿フォーム
  replyState: null, // { threadId, parentId, rootId, anchorNo, ownerName }
  draftBoardLayoutId: null,
  draftImageUrl: null,

  // ローカル
  guestId: null,
  likeCache: new Set(),
};

/** DOM キャッシュ */
const dom = {};
function $(id) {
  return document.getElementById(id);
}

/* =====================
 * 初期化
 * ===================== */

window.addEventListener("DOMContentLoaded", async () => {
  cacheDom();
  setupBasicHandlers();
  initModalsHidden();
  loadGuestId();
  loadLikeCache();
  loadUserInputsFromLocalStorage();
  updateUserStatusLabel();

  await Promise.all([loadUsers(), loadAutofixRules()]);

  await loadInitialThreads();
});

function cacheDom() {
  // ユーザー
  dom.userNameInput = $("userNameInput");
  dom.userTagInput = $("userTagInput");
  dom.userStatusLabel = $("userStatusLabel");

  // フィルター
  dom.filterToggleBtn = $("filterToggleBtn");
  dom.filterPanel = $("filterPanel");
  dom.keywordInput = $("keywordInput");
  dom.targetBody = $("targetBody");
  dom.targetTitle = $("targetTitle");
  dom.targetUser = $("targetUser");
  dom.genreNormal = $("genreNormal");
  dom.genreQa = $("genreQa");
  dom.genreReport = $("genreReport");
  dom.genreAnnounce = $("genreAnnounce");
  dom.filterSinceMyLast = $("filterSinceMyLast");
  dom.filterHasAttachment = $("filterHasAttachment");
  dom.filterSummaryText = $("filterSummaryText");

  // コメントリスト
  dom.loadOlderHint = $("loadOlderHint");
  dom.threadsContainer = $("threadsContainer");
  dom.loadMoreBtn = $("loadMoreBtn");
  dom.loadMoreStatus = $("loadMoreStatus");

  // フッター（投稿）
  dom.footerToggle = $("footerToggle");
  dom.composerToggleLabel = $("composerToggleLabel");
  dom.composerBody = $("composerBody");
  dom.replyInfoRow = $("replyInfoRow");
  dom.replyInfoText = $("replyInfoText");
  dom.cancelReplyBtn = $("cancelReplyBtn");
  dom.commentBodyInput = $("commentBodyInput");
  dom.attachBoardBtn = $("attachBoardBtn");
  dom.attachImageBtn = $("attachImageBtn");
  dom.attachedBoardLabel = $("attachedBoardLabel");
  dom.attachedImageLabel = $("attachedImageLabel");
  dom.submitCommentBtn = $("submitCommentBtn");
  dom.composerStatus = $("composerStatus");

  // モーダル
  dom.imageModal = $("imageModal");
  dom.modalImage = $("modalImage");
  dom.gearModal = $("gearModal");
  dom.gearModalBody = $("gearModalBody");
  dom.profileModal = $("profileModal");
  dom.profileModalBody = $("profileModalBody");

  dom.toastContainer = $("toastContainer");
}

function setupBasicHandlers() {
  // フィルター開閉
  dom.filterToggleBtn.addEventListener("click", () => {
    const collapsed = dom.filterPanel.classList.toggle("filter-panel--collapsed");
    dom.filterToggleBtn.textContent = collapsed ? "🔍 フィルターを開く" : "🔍 フィルターを閉じる";
  });

  // ユーザー名 / パス
  dom.userNameInput.addEventListener("input", () => {
    saveUserInputsToLocalStorage();
    updateUserStatusLabel();
  });
  dom.userTagInput.addEventListener("input", () => {
    if (dom.userTagInput.value.length > 10) {
      dom.userTagInput.value = dom.userTagInput.value.slice(0, 10);
    }
    saveUserInputsToLocalStorage();
    updateUserStatusLabel();
  });

  // フィルタ変更
  const filterElems = [
    dom.keywordInput,
    dom.targetBody,
    dom.targetTitle,
    dom.targetUser,
    dom.genreNormal,
    dom.genreQa,
    dom.genreReport,
    dom.genreAnnounce,
    dom.filterSinceMyLast,
    dom.filterHasAttachment,
  ];
  filterElems.forEach((el) => {
    el.addEventListener("input", handleFilterChange);
    el.addEventListener("change", handleFilterChange);
  });

  // 古いコメント読み込み
  dom.loadOlderHint.addEventListener("click", () => {
    loadMoreThreads();
  });
  dom.loadMoreBtn.addEventListener("click", () => {
    loadMoreThreads();
  });

  // コメント入力ツール開閉（デフォルトは閉じ）
  dom.footerToggle.addEventListener("click", () => {
    const opened = dom.composerBody.classList.toggle("footer-body--open");
    dom.composerToggleLabel.textContent = opened
      ? "▼コメントの入力ツールを非表示(タップ)"
      : "▲コメントの入力ツールを表示(タップ)";
  });

  // 返信解除
  dom.cancelReplyBtn.addEventListener("click", () => {
    clearReplyState();
  });

  // 添付
  dom.attachBoardBtn.addEventListener("click", handleAttachBoardClick);
  dom.attachImageBtn.addEventListener("click", handleAttachImageClick);

  // 投稿
  dom.submitCommentBtn.addEventListener("click", handleSubmit);

  // モーダル：×ボタン（data-modal-close）と >>アンカー
  document.addEventListener("click", (e) => {
    const closeTarget = e.target.getAttribute("data-modal-close");
    if (closeTarget) {
      hideModal(closeTarget);
      return;
    }

    // >>N アンカー
    const anchor = e.target.closest("a.anchor-link");
    if (anchor) {
      e.preventDefault();
      const noStr = anchor.dataset.anchorNo;
      const no = parseInt(noStr, 10);
      if (!no || Number.isNaN(no)) return;
      const threadCard = anchor.closest(".thread-card");
      if (!threadCard) return;
      const blocks = threadCard.querySelectorAll(".comment-block");
      if (blocks.length >= no) {
        const targetBlock = blocks[no - 1];
        const rect = targetBlock.getBoundingClientRect();
        const offset = 80;
        window.scrollBy({
          top: rect.top - offset,
          behavior: "smooth",
        });
      }
    }
  });

  // モーダル背景クリックで閉じる（C）
  [dom.imageModal, dom.gearModal, dom.profileModal].forEach((modalEl) => {
    if (!modalEl) return;
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) {
        if (modalEl === dom.imageModal) hideModal("imageModal");
        else if (modalEl === dom.gearModal) hideModal("gearModal");
        else if (modalEl === dom.profileModal) hideModal("profileModal");
      }
    });
  });
}

/* ===== モーダル開閉・スクロールロック ===== */

let openModalCount = 0;

function initModalsHidden() {
  [dom.imageModal, dom.gearModal, dom.profileModal].forEach((el) => {
    if (!el) return;
    if (!el.classList.contains("ld-modal-hidden")) {
      el.classList.add("ld-modal-hidden");
    }
  });
  document.body.style.overflow = "";
}

function showModalElement(el) {
  if (!el) return;
  if (el.classList.contains("ld-modal-hidden")) {
    el.classList.remove("ld-modal-hidden");
    openModalCount++;
  }
  if (openModalCount > 0) {
    document.body.style.overflow = "hidden";
  }
}

function hideModalElement(el) {
  if (!el) return;
  if (!el.classList.contains("ld-modal-hidden")) {
    el.classList.add("ld-modal-hidden");
    openModalCount = Math.max(0, openModalCount - 1);
  }
  if (openModalCount === 0) {
    document.body.style.overflow = "";
  }
}

function hideModal(id) {
  if (id === "imageModal") {
    hideModalElement(dom.imageModal);
  } else if (id === "gearModal") {
    hideModalElement(dom.gearModal);
  } else if (id === "profileModal") {
    hideModalElement(dom.profileModal);
  }
}

/* =====================
 * localStorage
 * ===================== */

function loadGuestId() {
  const key = "ld_board_guest_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateRandomId(12);
    localStorage.setItem(key, id);
  }
  state.guestId = id;
}

function loadLikeCache() {
  const key = "ld_board_like_cache";
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      state.likeCache = new Set(arr);
    }
  } catch (e) {
    console.error("like cache parse error", e);
  }
}

function saveLikeCache() {
  const key = "ld_board_like_cache";
  const arr = Array.from(state.likeCache);
  localStorage.setItem(key, JSON.stringify(arr));
}

function loadUserInputsFromLocalStorage() {
  const raw = localStorage.getItem("ld_board_user");
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      if (obj.name) dom.userNameInput.value = obj.name;
      if (obj.tag) dom.userTagInput.value = obj.tag;
    }
  } catch (e) {
    console.error("user local load error", e);
  }
}

function saveUserInputsToLocalStorage() {
  const payload = {
    name: dom.userNameInput.value.trim(),
    tag: dom.userTagInput.value.trim(),
  };
  localStorage.setItem("ld_board_user", JSON.stringify(payload));
}

/* =====================
 * ユーザー / 誤字ルール読み込み
 * ===================== */

async function loadUsers() {
  try {
    const { data, error } = await supabase
      .from("ld_users")
      .select("id, name, tag, mis_input_count")
      .order("name", { ascending: true });

    if (error) {
      console.error("ld_users fetch error", error);
      state.users = [];
      return;
    }
    state.users = data || [];
  } catch (e) {
    console.error("ld_users fetch error", e);
    state.users = [];
  }
}

async function loadAutofixRules() {
  try {
    const { data, error } = await supabase
      .from("ld_board_autofix_words")
      .select("pattern, replacement")
      .order("id", { ascending: true });

    if (error) {
      console.warn("autofix load error", error.message);
      state.autofixRules = [];
      return;
    }
    state.autofixRules = data || [];
  } catch (e) {
    console.error("autofix fetch error", e);
    state.autofixRules = [];
  }
}

/* =====================
 * スレッド読み込み
 * ===================== */

async function loadInitialThreads() {
  state.threads = [];
  state.hasMoreParents = true;
  state.oldestParentCreatedAt = null;
  dom.threadsContainer.innerHTML = "";
  dom.loadMoreStatus.textContent = "";
  await loadMoreThreads();
}

async function loadMoreThreads() {
  if (!state.hasMoreParents || state.isLoadingParents) return;

  state.isLoadingParents = true;
  dom.loadMoreBtn.disabled = true;
  dom.loadMoreStatus.textContent = "読み込み中...";

  try {
    let query = supabase
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", "info")
      .is("parent_comment_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(state.pageSize);

    if (state.oldestParentCreatedAt) {
      query = query.lt("created_at", state.oldestParentCreatedAt);
    }

    const { data: parents, error } = await query;
    if (error) {
      console.error("load parents error", error);
      showToast("コメントの読み込みに失敗しました。");
      return;
    }
    if (!parents || parents.length === 0) {
      state.hasMoreParents = false;
      dom.loadMoreStatus.textContent = "これ以上古いコメントはありません。";
      return;
    }

    const minCreated = parents[parents.length - 1].created_at;
    state.oldestParentCreatedAt = minCreated;

    const parentIds = parents.map((p) => p.id);

    const { data: children, error: childErr } = await supabase
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", "info")
      .in("root_comment_id", parentIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (childErr) {
      console.error("load children error", childErr);
      showToast("子コメントの読み込みに失敗しました。");
      return;
    }

    const threads = buildThreadsFromRaw(parents, children || []);
    state.threads = state.threads.concat(threads);

    applyFiltersAndRender();
  } finally {
    state.isLoadingParents = false;
    dom.loadMoreBtn.disabled = !state.hasMoreParents;
    if (!state.hasMoreParents) {
      dom.loadMoreStatus.textContent = "最後まで読み込みました。";
    } else {
      dom.loadMoreStatus.textContent = "";
    }
  }
}

/**
 * parents, children から ThreadView[] を構成
 * - parent_comment_id が null の行は子として扱わない
 * - 親と同じ id の行を子から除外（重複防止）
 */
function buildThreadsFromRaw(parents, children) {
  const byRoot = new Map();

  children.forEach((c) => {
    if (!c.parent_comment_id) return;
    const rootId = c.root_comment_id || c.parent_comment_id;
    if (!rootId) return;
    if (!byRoot.has(rootId)) byRoot.set(rootId, []);
    byRoot.get(rootId).push(c);
  });

  const threads = parents.map((p) => {
    const rootId = p.id;
    let childrenList = byRoot.get(rootId) || [];
    childrenList = childrenList.filter((c) => c.id !== p.id);
    childrenList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const allComments = [p, ...childrenList];
    const latest = allComments.reduce((acc, c) => {
      if (!acc) return c;
      return new Date(c.created_at) > new Date(acc.created_at) ? c : acc;
    }, null);

    const totalLikes = allComments.reduce((sum, c) => sum + (c.like_count || 0), 0);

    return {
      rootId,
      parent: p,
      children: childrenList,
      allComments,
      latest,
      totalLikes,
    };
  });

  return threads;
}

/* =====================
 * フィルタ
 * ===================== */

function handleFilterChange() {
  state.filters.keyword = dom.keywordInput.value.trim();
  state.filters.targets.body = dom.targetBody.checked;
  state.filters.targets.title = dom.targetTitle.checked;
  state.filters.targets.user = dom.targetUser.checked;
  state.filters.genres.normal = dom.genreNormal.checked;
  state.filters.genres.qa = dom.genreQa.checked;
  state.filters.genres.report = dom.genreReport.checked;
  state.filters.genres.announce = dom.genreAnnounce.checked;
  state.filters.sinceMyLast = dom.filterSinceMyLast.checked;
  state.filters.hasAttachment = dom.filterHasAttachment.checked;

  updateFilterSummary();

  if (state.filters.sinceMyLast) {
    fetchLastOwnCommentTime().then(() => {
      applyFiltersAndRender();
    });
  } else {
    state.lastOwnCommentTime = null;
    applyFiltersAndRender();
  }
}

async function fetchLastOwnCommentTime() {
  const info = getCurrentUserInfo();
  if (!info || !info.isRegistered) {
    state.lastOwnCommentTime = null;
    return;
  }
  try {
    const { data, error } = await supabase
      .from("ld_board_comments")
      .select("created_at")
      .eq("board_kind", "info")
      .eq("owner_name", info.name)
      .eq("owner_tag", info.tag)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("fetchLastOwnCommentTime error", error);
      state.lastOwnCommentTime = null;
      return;
    }
    if (data && data.length > 0) {
      state.lastOwnCommentTime = data[0].created_at;
    } else {
      state.lastOwnCommentTime = null;
    }
  } catch (e) {
    console.error("fetchLastOwnCommentTime error", e);
    state.lastOwnCommentTime = null;
  }
}

function updateFilterSummary() {
  const parts = [];
  const keyword = state.filters.keyword;
  const t = state.filters.targets;

  if (keyword && anyFilterTargetSelected()) {
    const targets = [];
    if (t.body) targets.push("本文");
    if (t.title) targets.push("タイトル");
    if (t.user) targets.push("ユーザー名");
    parts.push(`"${keyword}" in ${targets.join("・")}`);
  }

  const g = state.filters.genres;
  const selGenres = [];
  if (g.normal) selGenres.push("通常");
  if (g.qa) selGenres.push("質問・相談");
  if (g.report) selGenres.push("報告");
  if (g.announce) selGenres.push("アナウンス");
  if (selGenres.length !== 4) {
    parts.push(`ジャンル: ${selGenres.join("・")}`);
  }

  if (state.filters.sinceMyLast) {
    parts.push("自身の最終書込み以降のみ");
  }
  if (state.filters.hasAttachment) {
    parts.push("盤面・画像付きのみ");
  }

  dom.filterSummaryText.textContent = parts.length > 0 ? parts.join(" / ") : "（すべて表示中）";
}

function anyFilterTargetSelected() {
  const t = state.filters.targets;
  return t.body || t.title || t.user;
}

function applyFiltersAndRender() {
  const keyword = state.filters.keyword.trim().toLowerCase();
  const hasKeyword = !!keyword && anyFilterTargetSelected();

  const genres = state.filters.genres;
  const sinceMyLast = state.filters.sinceMyLast;
  const hasAttachmentOnly = state.filters.hasAttachment;

  const lastOwnTime = state.lastOwnCommentTime ? new Date(state.lastOwnCommentTime).getTime() : null;

  const filtered = state.threads.filter((thread) => {
    const parent = thread.parent;

    // ジャンル
    let genre = (parent.genre || "normal").toLowerCase();
    if (genre === "recruit") genre = "normal";
    if (
      (genre === "normal" && !genres.normal) ||
      (genre === "qa" && !genres.qa) ||
      (genre === "report" && !genres.report) ||
      (genre === "announce" && !genres.announce)
    ) {
      return false;
    }

    // 自身の最終書込み以降
    if (sinceMyLast && lastOwnTime != null) {
      const latestTime = new Date(thread.latest.created_at).getTime();
      if (latestTime < lastOwnTime) return false;
    }

    // 添付
    if (hasAttachmentOnly) {
      const hasAttach = thread.allComments.some((c) => c.board_layout_id || c.image_url);
      if (!hasAttach) return false;
    }

    if (hasKeyword) {
      let hit = false;

      if (state.filters.targets.body && !hit) {
        for (const c of thread.allComments) {
          if (c.body && c.body.toLowerCase().includes(keyword)) {
            hit = true;
            break;
          }
        }
      }

      if (state.filters.targets.title && !hit) {
        const title = parent.thread_title || "";
        if (title.toLowerCase().includes(keyword)) hit = true;
      }

      if (state.filters.targets.user && !hit) {
        const name = parent.owner_name || "";
        if (name.toLowerCase().includes(keyword)) hit = true;
      }

      if (!hit) return false;
    }

    return true;
  });

  // 古い → 新しい（下が最新）
  filtered.sort((a, b) => {
    return new Date(a.latest.created_at) - new Date(b.latest.created_at);
  });

  renderThreads(filtered);
}

/* =====================
 * レンダリング
 * ===================== */

function renderThreads(threads) {
  dom.threadsContainer.innerHTML = "";
  threads.forEach((thread) => {
    const card = renderThreadCard(thread);
    dom.threadsContainer.appendChild(card);
  });
}

function renderThreadCard(thread) {
  const { parent, children, totalLikes } = thread;
  const card = document.createElement("article");
  card.className = "thread-card";
  if (children.length > 0) {
    // 子コメントを持つものだけ左枠を青く
    card.classList.add("thread-card--thread");
  }
  card.dataset.threadId = thread.rootId;

  // タイトル行
  if (parent.thread_title || parent.genre) {
    const titleRow = document.createElement("div");
    titleRow.className = "thread-title-row";

    const leftBox = document.createElement("div");
    leftBox.style.display = "flex";
    leftBox.style.alignItems = "center";
    leftBox.style.gap = "4px";

    if (parent.genre && parent.genre !== "normal") {
      const badge = document.createElement("span");
      badge.className = "thread-genre-badge";
      const genreKey = (parent.genre || "").toLowerCase();
      if (genreKey === "qa") {
        badge.textContent = "質問";
        badge.classList.add("qa");
      } else if (genreKey === "report") {
        badge.textContent = "報告";
        badge.classList.add("report");
      } else if (genreKey === "announce") {
        badge.textContent = "アナウンス";
        badge.classList.add("announce");
      } else {
        badge.textContent = genreKey;
      }
      leftBox.appendChild(badge);
    }

    if (parent.thread_title) {
      const titleText = document.createElement("div");
      titleText.className = "thread-title-text";
      titleText.textContent = parent.thread_title;
      leftBox.appendChild(titleText);
    }

    titleRow.appendChild(leftBox);

    const rightBox = document.createElement("div");
    rightBox.className = "thread-title-likes";

    // 合計イイ数：タイトルがある & 1以上のときだけ
    if (parent.thread_title && totalLikes > 0) {
      rightBox.textContent = `(・∀・)ｲｲ!!合計: ${totalLikes}`;
    } else {
      rightBox.textContent = "";
    }

    titleRow.appendChild(rightBox);
    card.appendChild(titleRow);
  }

  // 親コメント
  const parentBlock = renderCommentBlock({
    thread,
    comment: parent,
    isParent: true,
    localNo: children.length > 0 ? 1 : null, // 子がいるスレッドだけ 1 番を付与
    forceNoNumber: children.length === 0, // 単発コメントは番号なし
  });
  card.appendChild(parentBlock);

  // 子コメント
  const childCount = children.length;
  if (childCount > 0) {
    const childrenHeader = document.createElement("div");
    childrenHeader.className = "children-header-row";

    const countSpan = document.createElement("span");
    countSpan.className = "children-count";
    countSpan.textContent = `子コメント ${childCount}件`;

    const toggleSpan = document.createElement("span");
    toggleSpan.className = "children-toggle";
    toggleSpan.textContent = "▼子コメントを開く";

    childrenHeader.appendChild(countSpan);
    childrenHeader.appendChild(toggleSpan);
    card.appendChild(childrenHeader);

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "children-container";
    card.appendChild(childrenContainer);

    let isExpanded = false;

    function updateChildrenView() {
      childrenContainer.innerHTML = "";
      if (!isExpanded) {
        const last = children[children.length - 1];
        const block = renderCommentBlock({
          thread,
          comment: last,
          isParent: false,
          forceNoNumber: true, // 最新子だけ番号なし
        });
        childrenContainer.appendChild(block);
        toggleSpan.textContent = "▼子コメントを開く";
      } else {
        const all = [thread.parent].concat(thread.children);
        all.forEach((c, index) => {
          if (index === 0) return;
          const block = renderCommentBlock({
            thread,
            comment: c,
            isParent: false,
            localNo: index + 1,
            forceNoNumber: false,
          });
          childrenContainer.appendChild(block);
        });
        toggleSpan.textContent = "▲子コメントを閉じる";
      }
    }

    toggleSpan.addEventListener("click", () => {
      isExpanded = !isExpanded;
      updateChildrenView();
    });

    updateChildrenView();
  }

  return card;
}

/**
 * コメント1件の描画
 */
function renderCommentBlock({ thread, comment, isParent, localNo = null, forceNoNumber = false }) {
  const block = document.createElement("div");
  block.className = "comment-block";
  block.dataset.commentId = comment.id;

  // ステータス行
  const metaRow = document.createElement("div");
  metaRow.className = "comment-meta-row";
  metaRow.dataset.commentId = comment.id;

  // 番号
  if (!forceNoNumber && localNo != null) {
    const noSpan = document.createElement("span");
    noSpan.className = "comment-no";
    noSpan.textContent = `${localNo}:`;
    metaRow.appendChild(noSpan);
  } else {
    const empty = document.createElement("span");
    empty.className = "comment-no";
    empty.textContent = "";
    metaRow.appendChild(empty);
  }

  // 名前
  const nameSpan = document.createElement("span");
  nameSpan.className = "comment-name";
  const profBtn = document.createElement("button");
  profBtn.className = "comment-prof-link";
  profBtn.textContent = "プロフ";
  profBtn.style.display = "none";

  const nameDisplay = getDisplayNameForComment(comment);
  nameSpan.textContent = nameDisplay.text;
  if (nameDisplay.className && nameDisplay.className.trim()) {
    nameSpan.className += " " + nameDisplay.className.trim();
  }
  if (nameDisplay.showProfile) {
    profBtn.style.display = "inline-block";
    profBtn.addEventListener("click", () => {
      openUserProfile(nameDisplay.userName, nameDisplay.userTag);
    });
  }

  metaRow.appendChild(nameSpan);
  metaRow.appendChild(profBtn);

  // タイムスタンプ
  const tsSpan = document.createElement("span");
  tsSpan.className = "comment-timestamp";
  tsSpan.textContent = formatTimestamp(comment.created_at);
  metaRow.appendChild(tsSpan);

  // 各コメントのイイ数
  const likeSpan = document.createElement("span");
  likeSpan.className = "comment-like-count";
  if (comment.like_count && comment.like_count > 0) {
    likeSpan.textContent = `(・∀・)ｲｲ!!: ${comment.like_count}`;
  } else {
    likeSpan.textContent = "";
  }
  metaRow.appendChild(likeSpan);

  // 歯車
  const gearBtn = document.createElement("button");
  gearBtn.className = "comment-gear-btn";
  gearBtn.type = "button";
  gearBtn.textContent = "⚙";
  gearBtn.addEventListener("click", () => {
    openGearModal(comment, thread);
  });
  metaRow.appendChild(gearBtn);

  block.appendChild(metaRow);

  // 本文
  const bodyEl = document.createElement("div");
  bodyEl.className = "comment-body";
  bodyEl.innerHTML = convertAnchorsToLinks(escapeHtml(comment.body || ""));
  block.appendChild(bodyEl);

  // 添付
  if (comment.board_layout_id || comment.image_url) {
    const attachRow = document.createElement("div");
    attachRow.className = "comment-attachments";

    if (comment.board_layout_id) {
      const boardBtn = document.createElement("button");
      boardBtn.className = "attachment-pill";
      boardBtn.type = "button";
      boardBtn.textContent = "盤面を開く";
      boardBtn.addEventListener("click", () => {
        openBoardLayout(comment.board_layout_id);
      });
      attachRow.appendChild(boardBtn);
    }

    if (comment.image_url) {
      const img = document.createElement("img");
      img.className = "thumb-image";
      img.src = comment.image_url;
      img.alt = "添付画像";
      img.addEventListener("click", () => {
        openImageModal(comment.image_url);
      });
      attachRow.appendChild(img);
    }

    block.appendChild(attachRow);
  }

  // 本文フッター（折りたたみ ＋ 返信/イイ）
  const footerRow = document.createElement("div");
  footerRow.className = "comment-footer-row";

  const toggleEl = document.createElement("div");
  toggleEl.className = "comment-body-toggle";
  toggleEl.textContent = "";
  footerRow.appendChild(toggleEl);

  const actions = document.createElement("div");
  actions.className = "comment-actions";
  const replyLink = document.createElement("span");
  replyLink.className = "comment-action-link";
  replyLink.textContent = "[ 返信 ]";
  replyLink.addEventListener("click", () => {
    const all = [thread.parent].concat(thread.children);
    let localNoForThis = 1;
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === comment.id) {
        localNoForThis = i + 1;
        break;
      }
    }
    startReply(thread, comment, localNoForThis);
  });
  const likeLink = document.createElement("span");
  likeLink.className = "comment-action-link";
  likeLink.textContent = "(・∀・)ｲｲ!!";
  likeLink.addEventListener("click", () => {
    handleLike(comment);
  });

  actions.appendChild(replyLink);
  actions.appendChild(likeLink);
  footerRow.appendChild(actions);

  block.appendChild(footerRow);

  // 長文折りたたみ判定
  initBodyCollapse(bodyEl, toggleEl);

  return block;
}

/* 本文行数を見て折りたたみの要否を決める */
function initBodyCollapse(bodyEl, toggleEl) {
  toggleEl.style.display = "none";

  requestAnimationFrame(() => {
    const style = window.getComputedStyle(bodyEl);
    const lineHeight = parseFloat(style.lineHeight) || 16;
    const lines = Math.round(bodyEl.scrollHeight / lineHeight);

    if (lines <= 3) {
      bodyEl.classList.remove("collapsible", "collapsed");
      toggleEl.style.display = "none";
      return;
    }

    bodyEl.classList.add("collapsible", "collapsed");
    toggleEl.style.display = "inline";
    let isCollapsed = true;
    toggleEl.textContent = "▼長文表示(タップ)";
    toggleEl.addEventListener("click", () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        bodyEl.classList.add("collapsed");
        toggleEl.textContent = "▼長文表示(タップ)";
      } else {
        bodyEl.classList.remove("collapsed");
        toggleEl.textContent = "▲折りたたむ(タップ)";
      }
    });
  });
}

/* =====================
 * 名前表示 / プロフ
 * ===================== */

function getDisplayNameForComment(comment) {
  const guestId = comment.guest_daily_id || "--";
  const ownerName = comment.owner_name || "";
  const ownerTag = comment.owner_tag || null;

  const base = {
    text: "",
    className: "",
    showProfile: false,
    userName: ownerName,
    userTag: ownerTag,
  };

  if (!ownerName || ownerName === "名無し") {
    base.text = `名無しの傭兵員 ${guestId}`;
    return base;
  }

  const user = state.users.find((u) => u.name === ownerName);

  if (ownerTag && user && user.tag === ownerTag) {
    base.text = `★${ownerName}`;
    base.className = "registered";
    base.showProfile = true;
    return base;
  }

  if (!ownerTag && user) {
    base.text = `${ownerName}(騙りw ${guestId})`;
    base.className = "imposter";
    base.showProfile = false;
    return base;
  }

  base.text = `${ownerName} ${guestId}`;
  return base;
}

function openUserProfile(name, tag) {
  if (!name) {
    showToast("ユーザー名が不明です");
    return;
  }

  const body = dom.profileModalBody;
  body.innerHTML = "";

  const meta = document.createElement("div");
  meta.className = "profile-meta";
  meta.textContent = tag ? `★${name} / タグ: ${tag}` : `★${name}`;
  body.appendChild(meta);

  const note = document.createElement("div");
  note.className = "profile-note";
  note.textContent = "詳しいプロフィールはユーザーデータページで確認できます。";
  body.appendChild(note);

  const link = document.createElement("div");
  link.className = "profile-link";
  link.textContent = "ユーザーデータページを別タブで開く";
  link.addEventListener("click", () => {
    const url = `ld_users_editor_full_v5.html?name=${encodeURIComponent(
      name
    )}&tag=${encodeURIComponent(tag || "")}`;
    window.open(url, "_blank");
  });
  body.appendChild(link);

  showModalElement(dom.profileModal);
}

/* =====================
 * ユーザー入力の状態
 * ===================== */

function getCurrentUserInfo() {
  const name = dom.userNameInput.value.trim();
  const tag = dom.userTagInput.value.trim();

  if (!name) {
    return {
      mode: "anonymous",
      label: "名無しとして投稿",
      isRegistered: false,
      name: "",
      tag: "",
    };
  }

  const user = state.users.find((u) => u.name === name);

  if (!user) {
    if (!tag) {
      return {
        mode: "unregistered",
        label: `${name}（未登録名／ゲスト）`,
        isRegistered: false,
        name,
        tag: "",
      };
    } else {
      return {
        mode: "unregistered-with-tag",
        label: `${name}（未登録名／ゲストID:${tag}）`,
        isRegistered: false,
        name,
        tag,
      };
    }
  }

  if (tag && tag === user.tag) {
    return {
      mode: "registered",
      label: `★${name}（登録済）`,
      isRegistered: true,
      name,
      tag,
      user,
    };
  }

  return {
    mode: "imposter",
    label: `${name}（タグ不一致→騙り扱い）`,
    isRegistered: false,
    name,
    tag,
    user,
  };
}

function updateUserStatusLabel() {
  const info = getCurrentUserInfo();
  dom.userStatusLabel.textContent = info.label;
}

/* =====================
 * 投稿処理
 * ===================== */

async function handleSubmit() {
  const info = getCurrentUserInfo();
  const bodyRaw = dom.commentBodyInput.value;
  if (!bodyRaw.trim()) {
    showToast("本文を入力してください。");
    return;
  }

  let finalBody = applyAutofix(bodyRaw);

  // 返信なら >>N を頭に付ける
  if (state.replyState && state.replyState.anchorNo != null) {
    finalBody = `>>${state.replyState.anchorNo} ` + finalBody;
  }

  const genre = getSelectedGenre();

  let ownerName = info.name;
  let ownerTag = null;
  if (!ownerName) ownerName = "名無し";
  if (info.mode === "registered" && info.user && info.user.tag) {
    ownerTag = info.user.tag;
  }

  const guestDailyId = getGuestDailyId();

  const payload = {
    board_kind: "info",
    genre,
    owner_name: ownerName,
    owner_tag: ownerTag,
    guest_daily_id: guestDailyId,
    body: finalBody,
    thread_title: null,
    parent_comment_id: state.replyState ? state.replyState.parentId : null,
    root_comment_id: state.replyState ? state.replyState.rootId : null,
    board_layout_id: state.draftBoardLayoutId,
    image_url: state.draftImageUrl,
    is_recruit: false,
    recruit_level: null,
    expires_at: null,
  };

  dom.submitCommentBtn.disabled = true;
  dom.composerStatus.textContent = "投稿中...";

  try {
    const { error } = await supabase.from("ld_board_comments").insert(payload).single();
    if (error) {
      console.error("insert error", error);
      showToast("投稿に失敗しました。");
      return;
    }

    if (info.mode === "imposter" && info.user) {
      incrementUserMisInput(info.user);
    }

    showToast("投稿しました。");
    resetComposer();
    await loadInitialThreads();
    if (state.filters.sinceMyLast) {
      await fetchLastOwnCommentTime();
      applyFiltersAndRender();
    }
  } finally {
    dom.submitCommentBtn.disabled = false;
    dom.composerStatus.textContent = "";
  }
}

function getSelectedGenre() {
  const radios = document.querySelectorAll('input[name="genre"]');
  for (const r of radios) {
    if (r.checked) return r.value;
  }
  return "normal";
}

function applyAutofix(text) {
  if (!text || state.autofixRules.length === 0) return text;
  let result = text;
  for (const rule of state.autofixRules) {
    if (!rule.pattern) continue;
    const pattern = rule.pattern;
    const replacement = rule.replacement || "";
    result = result.split(pattern).join(replacement);
  }
  return result;
}

async function incrementUserMisInput(user) {
  const current = user.mis_input_count || 0;
  const next = current + 1;
  user.mis_input_count = next;
  try {
    const { error } = await supabase
      .from("ld_users")
      .update({ mis_input_count: next })
      .eq("id", user.id);
    if (error) {
      console.error("update mis_input_count error", error);
    }
  } catch (e) {
    console.error("update mis_input_count error", e);
  }
}

function resetComposer() {
  dom.commentBodyInput.value = "";
  clearReplyState();
  state.draftBoardLayoutId = null;
  state.draftImageUrl = null;
  updateAttachLabels();
}

function clearReplyState() {
  state.replyState = null;
  dom.replyInfoRow.classList.add("reply-info-row--hidden");
  dom.replyInfoText.textContent = "";
  dom.submitCommentBtn.textContent = "投稿する";
}

function startReply(thread, comment, localNo) {
  state.replyState = {
    threadId: thread.rootId,
    parentId: comment.id,
    rootId: thread.rootId,
    anchorNo: localNo,
    ownerName: comment.owner_name || "",
  };
  dom.replyInfoRow.classList.remove("reply-info-row--hidden");
  const name = comment.owner_name || "名無し";
  dom.replyInfoText.textContent = `返信対象: ${name} さん（No.${localNo}）`;
  dom.submitCommentBtn.textContent = "返信する";
  dom.commentBodyInput.focus();
}

/* =====================
 * 添付
 * ===================== */

function handleAttachBoardClick() {
  const current = state.draftBoardLayoutId || "";
  const result = window.prompt(
    "盤面IDを入力してください（将来的に盤面エディタと連携予定）",
    current
  );
  if (result === null) return;
  const trimmed = result.trim();
  state.draftBoardLayoutId = trimmed || null;
  updateAttachLabels();
}

function handleAttachImageClick() {
  const current = state.draftImageUrl || "";
  const result = window.prompt(
    "画像のURLを入力してください（Supabase Storage の公開URLなど）",
    current
  );
  if (result === null) return;
  const trimmed = result.trim();
  state.draftImageUrl = trimmed || null;
  updateAttachLabels();
}

function updateAttachLabels() {
  if (state.draftBoardLayoutId) {
    dom.attachedBoardLabel.textContent = `盤面ID: ${state.draftBoardLayoutId}`;
    dom.attachedBoardLabel.classList.remove("attach-chip--hidden");
  } else {
    dom.attachedBoardLabel.textContent = "";
    dom.attachedBoardLabel.classList.add("attach-chip--hidden");
  }

  if (state.draftImageUrl) {
    dom.attachedImageLabel.textContent = `画像URL: ${shorten(state.draftImageUrl, 32)}`;
    dom.attachedImageLabel.classList.remove("attach-chip--hidden");
  } else {
    dom.attachedImageLabel.textContent = "";
    dom.attachedImageLabel.classList.add("attach-chip--hidden");
  }
}

/* =====================
 * イイ!!
 * ===================== */

async function handleLike(comment) {
  const id = comment.id;
  const key = String(id);

  if (state.likeCache.has(key)) {
    showToast("同じ端末からの二重イイネはできません。");
    return;
  }

  try {
    const { error } = await supabase.rpc("increment_like_count", { comment_id: id });
    if (error) {
      console.error("like rpc error", error);
      showToast("イイネに失敗しました。");
      return;
    }
    state.likeCache.add(key);
    saveLikeCache();
    showToast("(・∀・)ｲｲ!! しました。");

    const thread = state.threads.find((t) => t.allComments.some((c) => c.id === id));
    if (thread) {
      const target = thread.allComments.find((c) => c.id === id);
      target.like_count = (target.like_count || 0) + 1;
      thread.totalLikes += 1;
      applyFiltersAndRender();
    }
  } catch (e) {
    console.error("like error", e);
    showToast("イイネに失敗しました。");
  }
}

/* =====================
 * モーダル
 * ===================== */

function openImageModal(url) {
  dom.modalImage.src = url;
  showModalElement(dom.imageModal);
}

function openBoardLayout(boardLayoutId) {
  const url = `ld_board_editor_drag_v5.html?layout_id=${encodeURIComponent(
    boardLayoutId
  )}&mode=view`;
  window.open(url, "_blank");
}

/* =====================
 * 歯車メニュー
 * ===================== */

let currentGearTarget = null;

function openGearModal(comment, thread) {
  currentGearTarget = { comment, thread };
  renderGearModalContent(comment, thread);
  showModalElement(dom.gearModal);
}

function renderGearModalContent(comment, thread) {
  const isParent = comment.id === thread.parent.id;

  const wrapper = document.createElement("div");

  // タイトル作成 / 編集（親のみ）
  if (isParent) {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const title = document.createElement("div");
    title.className = "gear-section-title";
    title.textContent = "スレッドタイトル";
    sec.appendChild(title);

    const row = document.createElement("div");
    row.className = "gear-row";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 20;
    input.placeholder = "タイトル（20文字まで）";
    input.value = thread.parent.thread_title || "";
    row.appendChild(input);
    sec.appendChild(row);

    const actions = document.createElement("div");
    actions.className = "gear-actions";
    const saveBtn = document.createElement("button");
    saveBtn.className = "primary";
    saveBtn.textContent = thread.parent.thread_title ? "タイトルを更新" : "タイトルを作成";
    saveBtn.addEventListener("click", async () => {
      const v = input.value.trim();
      await updateThreadTitle(thread, v);
    });
    actions.appendChild(saveBtn);
    sec.appendChild(actions);

    wrapper.appendChild(sec);
  }

  // ジャンル変更
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const title = document.createElement("div");
    title.className = "gear-section-title";
    title.textContent = "コメントのジャンル";
    sec.appendChild(title);

    const row = document.createElement("div");
    row.className = "gear-row";
    const select = document.createElement("select");
    const genres = [
      { value: "normal", label: "通常" },
      { value: "qa", label: "質問・相談" },
      { value: "report", label: "報告" },
      { value: "announce", label: "アナウンス" },
    ];
    const currentGenre = (thread.parent.genre || "normal").toLowerCase();
    genres.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.value;
      opt.textContent = g.label;
      if (g.value === currentGenre) opt.selected = true;
      select.appendChild(opt);
    });
    row.appendChild(select);
    sec.appendChild(row);

    const actions = document.createElement("div");
    actions.className = "gear-actions";
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = isParent
      ? "スレッド全体のジャンルを変更"
      : "このコメントの属するスレッドのジャンルを変更";
    btn.addEventListener("click", async () => {
      await updateCommentGenre(thread, select.value);
    });
    actions.appendChild(btn);
    sec.appendChild(actions);

    wrapper.appendChild(sec);
  }

  // 非表示 / 完全削除
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const title = document.createElement("div");
    title.className = "gear-section-title";
    title.textContent = "削除／非表示";
    sec.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "gear-actions";

    const hideBtn = document.createElement("button");
    hideBtn.className = "danger";
    hideBtn.textContent = isParent ? "スレッド（親＋子）を非表示" : "このコメントを非表示";
    hideBtn.addEventListener("click", async () => {
      await hideComment(comment, thread, false);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = isParent ? "スレッド（親＋子）を完全削除" : "このコメントを完全削除";
    delBtn.addEventListener("click", async () => {
      await hideComment(comment, thread, true);
    });

    actions.appendChild(hideBtn);
    actions.appendChild(delBtn);
    sec.appendChild(actions);

    wrapper.appendChild(sec);
  }

  // 追記
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const title = document.createElement("div");
    title.className = "gear-section-title";
    title.textContent = "コメントへの追記";
    sec.appendChild(title);

    const row = document.createElement("div");
    row.className = "gear-row";
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.placeholder = "追記内容を入力";
    row.appendChild(textarea);
    sec.appendChild(row);

    const actions = document.createElement("div");
    actions.className = "gear-actions";
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "追記を追加";
    btn.addEventListener("click", async () => {
      const text = textarea.value.trim();
      if (!text) {
        showToast("追記内容を入力してください。");
        return;
      }
      await appendToComment(comment, text);
    });
    actions.appendChild(btn);
    sec.appendChild(actions);

    wrapper.appendChild(sec);
  }

  // 推薦（将来機能）
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const title = document.createElement("div");
    title.className = "gear-section-title";
    title.textContent = "攻略wikiへの推薦（将来機能）";
    sec.appendChild(title);

    const row = document.createElement("div");
    row.className = "gear-row";
    const select = document.createElement("select");
    const dummyPages = [
      { value: "", label: "選択してください（ダミー）" },
      { value: "unit_tips", label: "ユニット個別ページ" },
      { value: "strategy_general", label: "攻略の手引き（全般）" },
    ];
    dummyPages.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.value;
      opt.textContent = p.label;
      select.appendChild(opt);
    });
    row.appendChild(select);
    sec.appendChild(row);

    const actions = document.createElement("div");
    actions.className = "gear-actions";
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "選択ページへ推薦";
    btn.addEventListener("click", () => {
      showToast("推薦機能はまだ未実装です（UIのみ）");
    });
    actions.appendChild(btn);
    sec.appendChild(actions);

    wrapper.appendChild(sec);
  }

  dom.gearModalBody.innerHTML = "";
  dom.gearModalBody.appendChild(wrapper);
}

async function updateThreadTitle(thread, newTitle) {
  const title = newTitle.trim().slice(0, 20);
  try {
    const { error } = await supabase
      .from("ld_board_comments")
      .update({ thread_title: title || null })
      .eq("id", thread.parent.id);
    if (error) {
      console.error("updateThreadTitle error", error);
      showToast("タイトルの更新に失敗しました。");
      return;
    }
    thread.parent.thread_title = title || null;
    showToast("タイトルを更新しました。");
    hideModal("gearModal");
    applyFiltersAndRender();
  } catch (e) {
    console.error("updateThreadTitle error", e);
    showToast("タイトルの更新に失敗しました。");
  }
}

async function updateCommentGenre(thread, newGenre) {
  try {
    const { error } = await supabase
      .from("ld_board_comments")
      .update({ genre: newGenre })
      .eq("root_comment_id", thread.rootId)
      .or(`id.eq.${thread.rootId}`);
    if (error) {
      console.error("updateCommentGenre error", error);
      showToast("ジャンル変更に失敗しました。");
      return;
    }
    thread.parent.genre = newGenre;
    thread.allComments.forEach((c) => {
      if (c.id === thread.parent.id) c.genre = newGenre;
    });
    showToast("ジャンルを変更しました。");
    hideModal("gearModal");
    applyFiltersAndRender();
  } catch (e) {
    console.error("updateCommentGenre error", e);
    showToast("ジャンル変更に失敗しました。");
  }
}

async function hideComment(comment, thread, hardDelete) {
  const isParent = comment.id === thread.parent.id;
  const confirmText = hardDelete
    ? isParent
      ? "このスレッド（親＋子）を完全削除します。よろしいですか？"
      : "このコメントを完全削除します。よろしいですか？"
    : isParent
    ? "このスレッド（親＋子）を非表示にします。よろしいですか？"
    : "このコメントを非表示にします。よろしいですか？";

  if (!window.confirm(confirmText)) return;

  try {
    if (hardDelete) {
      const ids = isParent ? thread.allComments.map((c) => c.id) : [comment.id];
      const { error } = await supabase.from("ld_board_comments").delete().in("id", ids);
      if (error) {
        console.error("delete error", error);
        showToast("削除に失敗しました。");
        return;
      }
    } else {
      const ids = isParent ? thread.allComments.map((c) => c.id) : [comment.id];
      const { error } = await supabase
        .from("ld_board_comments")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) {
        console.error("hide error", error);
        showToast("非表示に失敗しました。");
        return;
      }
    }

    showToast(hardDelete ? "削除しました。" : "非表示にしました。");
    hideModal("gearModal");
    await loadInitialThreads();
  } catch (e) {
    console.error("hideComment error", e);
    showToast("処理に失敗しました。");
  }
}

async function appendToComment(comment, appendText) {
  const body = comment.body || "";
  const timestamp = formatTimestampShort(new Date().toISOString());
  const appendBlock = `\n\n[追記 ${timestamp}]\n${appendText}`;
  const newBody = body + appendBlock;

  try {
    const { error } = await supabase
      .from("ld_board_comments")
      .update({ body: newBody })
      .eq("id", comment.id);
    if (error) {
      console.error("append error", error);
      showToast("追記に失敗しました。");
      return;
    }
    comment.body = newBody;
    showToast("追記しました。");
    hideModal("gearModal");
    applyFiltersAndRender();
  } catch (e) {
    console.error("append error", e);
    showToast("追記に失敗しました。");
  }
}

/* =====================
 * ユーティリティ
 * ===================== */

function getGuestDailyId() {
  const key = "ld_board_guest_daily_id";
  const today = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const obj = JSON.parse(stored);
      if (obj.date === today && obj.id) {
        return obj.id;
      }
    } catch (e) {}
  }
  const id = ("" + Math.floor(Math.random() * 10000)).padStart(4, "0");
  localStorage.setItem(key, JSON.stringify({ date: today, id }));
  return id;
}

function formatTimestamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}

function formatTimestampShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function showToast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2500);
}

function generateRandomId(len) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function convertAnchorsToLinks(text) {
  return text.replace(/&gt;&gt;(\d+)/g, (m, p1) => {
    return `<a href="#comment-${p1}" class="anchor-link" data-anchor-no="${p1}">&gt;&gt;${p1}</a>`;
  });
}

function shorten(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}
