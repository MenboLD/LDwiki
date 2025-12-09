import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** ★ Supabase 接続設定（実プロジェクトの値に差し替えてください） */
const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** アプリ状態 */
const state = {
  users: [], // ld_users（登録ユーザー）
  autofixRules: [], // 誤字自動修正ルール

  // スレッド関連
  threads: [], // ThreadView[]
  hasMoreParents: true,
  isLoadingParents: false,
  oldestParentCreatedAt: null, // 追加読み込み用境界
  pageSize: 20,

  // フィルタ状態
  filters: {
    keyword: "",
    targets: { body: true, title: true, user: true },
    genres: { normal: true, qa: true, report: true, announce: true },
    sinceMyLast: false,
    hasAttachment: false,
  },
  lastOwnCommentTime: null, // ISO 文字列 or null

  // 投稿フォーム
  replyState: null, // { threadId, parentId, rootId, anchorNo, ownerName }
  draftBoardLayoutId: null,
  draftImageUrl: null,

  // ローカル
  guestId: null, // localStorage 固定ID
  likeCache: new Set(), // "commentId" セット
};

/** DOM の参照 */
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
  loadGuestId();
  loadLikeCache();
  loadUserInputsFromLocalStorage();
  updateUserStatusLabel();

  await Promise.all([loadUsers(), loadAutofixRules()]);

  await loadInitialThreads();
});

function cacheDom() {
  dom.filterToggleBtn = $("filterToggleBtn");
  dom.filterPanel = $("filterPanel");

  dom.userNameInput = $("userNameInput");
  dom.userTagInput = $("userTagInput");
  dom.userStatusLabel = $("userStatusLabel");

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

  dom.loadOlderHint = $("loadOlderHint");
  dom.threadsContainer = $("threadsContainer");
  dom.loadMoreBtn = $("loadMoreBtn");
  dom.loadMoreStatus = $("loadMoreStatus");

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

  dom.imageModal = $("imageModal");
  dom.modalImage = $("modalImage");
  dom.gearModal = $("gearModal");
  dom.gearModalBody = $("gearModalBody");
  dom.toastContainer = $("toastContainer");
}

function setupBasicHandlers() {
  // フィルタ開閉
  dom.filterToggleBtn.addEventListener("click", () => {
    const collapsed = dom.filterPanel.classList.toggle(
      "filter-panel--collapsed"
    );
    dom.filterToggleBtn.textContent = collapsed
      ? "🔍 フィルターを開く"
      : "🔍 フィルターを閉じる";
  });

  // ユーザー入力変更 → ローカル保存＆表示更新
  dom.userNameInput.addEventListener("input", () => {
    saveUserInputsToLocalStorage();
    updateUserStatusLabel();
  });
  dom.userTagInput.addEventListener("input", () => {
    if (dom.userTagInput.value.length > 2) {
      dom.userTagInput.value = dom.userTagInput.value.slice(0, 2);
    }
    saveUserInputsToLocalStorage();
    updateUserStatusLabel();
  });

  // フィルタ変更ハンドラ
  const filterChangeTargets = [
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
  filterChangeTargets.forEach((el) => {
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

  // 返信解除
  dom.cancelReplyBtn.addEventListener("click", () => {
    clearReplyState();
  });

  // 添付
  dom.attachBoardBtn.addEventListener("click", handleAttachBoardClick);
  dom.attachImageBtn.addEventListener("click", handleAttachImageClick);

  // 投稿
  dom.submitCommentBtn.addEventListener("click", handleSubmit);

  // モーダル閉じる（デリゲーション）
  document.addEventListener("click", (e) => {
    const closeTarget = e.target.getAttribute("data-modal-close");
    if (closeTarget) {
      hideModal(closeTarget);
    }
  });
}

/* =====================
 * localStorage 周り
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
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        state.likeCache = new Set(arr);
      }
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
 * 誤字修正ルール / ユーザー一覧
 * ===================== */

async function loadAutofixRules() {
  try {
    const { data, error } = await supabase
      .from("ld_board_autofix_words")
      .select("pattern, replacement")
      .order("id", { ascending: true });

    if (error) {
      // テーブルがまだ無ければ無視してOK
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
    const query = supabase
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", "info")
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .limit(state.pageSize);

    if (state.oldestParentCreatedAt) {
      query.lt("created_at", state.oldestParentCreatedAt);
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

    // 取得した親の created_at の最小値を更新
    const minCreated = parents[parents.length - 1].created_at;
    state.oldestParentCreatedAt = minCreated;

    // 親ID一覧
    const parentIds = parents.map((p) => p.id);

    // 子コメント
    const { data: children, error: childErr } = await supabase
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", "info")
      .in("root_comment_id", parentIds)
      .order("created_at", { ascending: true });

    if (childErr) {
      console.error("load children error", childErr);
      showToast("子コメントの読み込みに失敗しました。");
      return;
    }

    // 親＋子をスレッド単位にまとめる
    const threads = buildThreadsFromRaw(parents, children || []);
    // 既存threadsに追加（古い順を底に積んでいく）
    state.threads = state.threads.concat(threads);

    applyFiltersAndRender();
  } finally {
    state.isLoadingParents = false;
    dom.loadMoreBtn.disabled = !state.hasMoreParents;
    dom.loadMoreStatus.textContent = state.hasMoreParents ? "" : "最後まで読み込みました。";
  }
}

function buildThreadsFromRaw(parents, children) {
  const byRoot = new Map();
  children.forEach((c) => {
    const rootId = c.root_comment_id || c.parent_comment_id || c.id;
    if (!byRoot.has(rootId)) byRoot.set(rootId, []);
    byRoot.get(rootId).push(c);
  });

  const threads = parents.map((p) => {
    const rootId = p.id;
    const childrenList = byRoot.get(rootId) || [];
    // created_at 昇順でソート
    childrenList.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    const allComments = [p, ...childrenList];
    const latest = allComments.reduce((acc, c) => {
      return !acc ||
        new Date(c.created_at).getTime() > new Date(acc.created_at).getTime()
        ? c
        : acc;
    }, null);

    const totalLikes = allComments.reduce(
      (sum, c) => sum + (c.like_count || 0),
      0
    );

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
    // 必要なら自分の最終書込み時間を取得してからフィルタ
    fetchLastOwnCommentTime().then(() => {
      applyFiltersAndRender();
    });
  } else {
    state.lastOwnCommentTime = null;
    applyFiltersAndRender();
  }
}

async function fetchLastOwnCommentTime() {
  const userInfo = getCurrentUserInfo();
  if (!userInfo || !userInfo.isRegistered) {
    state.lastOwnCommentTime = null;
    return;
  }

  try {
    const { data, error } = await supabase
      .from("ld_board_comments")
      .select("created_at")
      .eq("board_kind", "info")
      .eq("owner_name", userInfo.name)
      .eq("owner_tag", userInfo.tag)
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

  // キーワード
  if (state.filters.keyword && anyFilterTargetSelected()) {
    const targets = [];
    if (state.filters.targets.body) targets.push("本文");
    if (state.filters.targets.title) targets.push("タイトル");
    if (state.filters.targets.user) targets.push("ユーザー名");
    parts.push(`"${state.filters.keyword}" in ${targets.join("・")}`);
  }

  // ジャンル
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

  dom.filterSummaryText.textContent =
    parts.length > 0 ? parts.join(" / ") : "（すべて表示中）";
}

function anyFilterTargetSelected() {
  const t = state.filters.targets;
  return t.body || t.title || t.user;
}

function applyFiltersAndRender() {
  const keyword = state.filters.keyword;
  const keywordLower = keyword.toLowerCase();
  const hasKeyword = !!keyword && anyFilterTargetSelected();

  const genres = state.filters.genres;
  const sinceMyLast = state.filters.sinceMyLast;
  const hasAttachmentOnly = state.filters.hasAttachment;

  const lastOwnTime = state.lastOwnCommentTime
    ? new Date(state.lastOwnCommentTime).getTime()
    : null;

  const filteredThreads = state.threads.filter((thread) => {
    const parent = thread.parent;

    // ジャンルフィルタ
    let genre = (parent.genre || "normal").toLowerCase();
    if (genre === "recruit") genre = "normal"; // 募集は通常扱い
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

    // 添付フィルタ
    if (hasAttachmentOnly) {
      const hasAttach = thread.allComments.some((c) => {
        return !!(c.board_layout_id || c.image_url);
      });
      if (!hasAttach) return false;
    }

    // キーワード
    if (hasKeyword) {
      let hit = false;

      if (state.filters.targets.body && !hit) {
        for (const c of thread.allComments) {
          if (c.body && c.body.toLowerCase().includes(keywordLower)) {
            hit = true;
            break;
          }
        }
      }

      if (state.filters.targets.title && !hit) {
        const title = parent.thread_title || "";
        if (title.toLowerCase().includes(keywordLower)) hit = true;
      }

      if (state.filters.targets.user && !hit) {
        const name = parent.owner_name || "";
        if (name.toLowerCase().includes(keywordLower)) hit = true;
      }

      if (!hit) return false;
    }

    return true;
  });

  // 最新コメント時間でソート（新しい順）
  filteredThreads.sort((a, b) => {
    return (
      new Date(b.latest.created_at).getTime() -
      new Date(a.latest.created_at).getTime()
    );
  });

  renderThreads(filteredThreads);
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

/**
 * ThreadView -> DOM
 */
function renderThreadCard(thread) {
  const { parent, children, totalLikes } = thread;
  const card = document.createElement("article");
  card.className = "thread-card";
  card.dataset.threadId = thread.rootId;

  // タイトル行（必要なら）
  if (parent.thread_title || parent.genre) {
    const titleRow = document.createElement("div");
    titleRow.className = "thread-title-row";

    if (parent.genre && parent.genre !== "normal") {
      const badge = document.createElement("span");
      badge.className = "thread-genre-badge";
      let label = "";
      let genreKey = parent.genre.toLowerCase();
      if (genreKey === "qa") {
        label = "質問";
        badge.classList.add("qa");
      } else if (genreKey === "report") {
        label = "報告";
        badge.classList.add("report");
      } else if (genreKey === "announce") {
        label = "アナウンス";
        badge.classList.add("announce");
      } else {
        label = genreKey;
      }
      badge.textContent = label;
      titleRow.appendChild(badge);
    }

    if (parent.thread_title) {
      const titleText = document.createElement("div");
      titleText.className = "thread-title-text";
      titleText.textContent = parent.thread_title;
      titleRow.appendChild(titleText);
    }

    const likes = document.createElement("div");
    likes.className = "thread-title-likes";
    likes.textContent = `(・∀・)ｲｲ!!合計: ${totalLikes}`;
    titleRow.appendChild(likes);

    card.appendChild(titleRow);
  }

  // 親コメント
  const parentBlock = renderCommentBlock({
    thread,
    comment: parent,
    isParent: true,
  });
  card.appendChild(parentBlock);

  // 子コメントヘッダー・本体
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
        // 最新の子コメントのみ表示
        const last = children[children.length - 1];
        const block = renderCommentBlock({
          thread,
          comment: last,
          isParent: false,
          // 番号は「すべて表示」時しか出さないのでここでは null
          forceNoNumber: true,
        });
        childrenContainer.appendChild(block);
        toggleSpan.textContent = "▼子コメントを開く";
      } else {
        // 全件表示＆番号振り
        const all = [parent].concat(children);
        all.forEach((c, index) => {
          if (index === 0) return; // parent はすでに親コメントとして表示済み
          const block = renderCommentBlock({
            thread,
            comment: c,
            isParent: false,
            localNo: index + 1, // 親が1なので子は2〜
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

    // 初期状態：折りたたみ
    updateChildrenView();
  }

  return card;
}

function renderCommentBlock({
  thread,
  comment,
  isParent,
  localNo = null,
  forceNoNumber = false,
}) {
  const block = document.createElement("div");
  block.className = "comment-block";
  block.dataset.commentId = comment.id;

  // メタ行
  const metaRow = document.createElement("div");
  metaRow.className = "comment-meta-row";
  metaRow.dataset.commentId = comment.id;
  if (!forceNoNumber && localNo != null) {
    const noSpan = document.createElement("span");
    noSpan.className = "comment-no";
    noSpan.textContent = `${localNo}:`;
    metaRow.appendChild(noSpan);
  }

  const nameSpan = document.createElement("span");
  nameSpan.className = "comment-name";
  const profBtn = document.createElement("button");
  profBtn.className = "comment-prof-link";
  profBtn.textContent = "プロフ";
  profBtn.style.display = "none";

  const nameDisplay = getDisplayNameForComment(comment);
  nameSpan.textContent = nameDisplay.text;
  nameSpan.classList.add(nameDisplay.className);
  if (nameDisplay.showProfile) {
    profBtn.style.display = "inline-block";
    profBtn.addEventListener("click", () => {
      openUserProfile(nameDisplay.userName, nameDisplay.userTag);
    });
  }

  metaRow.appendChild(nameSpan);
  if (nameDisplay.showProfile) {
    metaRow.appendChild(profBtn);
  }

  const tsSpan = document.createElement("span");
  tsSpan.className = "comment-timestamp";
  tsSpan.textContent = formatTimestamp(comment.created_at);
  metaRow.appendChild(tsSpan);

  const gearBtn = document.createElement("button");
  gearBtn.className = "comment-gear-btn";
  gearBtn.type = "button";
  gearBtn.textContent = "⚙";
  gearBtn.addEventListener("click", () => {
    openGearModal(comment, thread);
  });
  metaRow.appendChild(gearBtn);

  if (comment.like_count && comment.like_count > 0) {
    const likeSpan = document.createElement("span");
    likeSpan.className = "comment-like-count";
    likeSpan.textContent = `(・∀・)ｲｲ!!: ${comment.like_count}`;
    metaRow.appendChild(likeSpan);
  }

  block.appendChild(metaRow);

  // 本文
  const bodyEl = document.createElement("div");
  bodyEl.className = "comment-body";
  bodyEl.innerHTML = convertAnchorsToLinks(
    escapeHtml(comment.body || "")
  );

  // 長文折りたたみ（4行程度）
  const toggleEl = document.createElement("div");
  toggleEl.className = "comment-body-toggle";
  let isCollapsed = true;

  function updateBodyCollapse() {
    if (isCollapsed) {
      bodyEl.classList.add("collapsed");
      toggleEl.textContent = "▼長文表示(タップ)";
    } else {
      bodyEl.classList.remove("collapsed");
      toggleEl.textContent = "▲折りたたむ(タップ)";
    }
  }

  // 行数判定のため、一度 DOM に追加してから高さを見たいが、
  // 簡易的に常にトグルを付ける運用にしておく
  updateBodyCollapse();
  toggleEl.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    updateBodyCollapse();
  });

  block.appendChild(bodyEl);

  // 添付
  if (comment.board_layout_id || comment.image_url) {
    const attachRow = document.createElement("div");
    attachRow.className = "comment-attachments";

    if (comment.board_layout_id) {
      const boardBtn = document.createElement("button");
      boardBtn.className = "attachment-pill";
      boardBtn.type = "button";
      boardBtn.textContent = `盤面を開く`;
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

  // アクション
  const actions = document.createElement("div");
  actions.className = "comment-actions-row";

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

  block.appendChild(toggleEl);
  block.appendChild(actions);

  return block;
}

/* =====================
 * 名前表示・プロフィール
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
    base.className = "";
    return base;
  }

  // ld_users に存在するか
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
  base.className = "";
  return base;
}

function openUserProfile(name, tag) {
  // とりあえず ld_users 編集画面を別タブで開く（クエリパラメータは将来拡張用）
  const url = `ld_users_editor_full_v5.html?name=${encodeURIComponent(
    name
  )}&tag=${encodeURIComponent(tag || "")}`;
  window.open(url, "_blank");
}

/* =====================
 * ユーザー入力の「現在状態」ラベル
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

  // 名前は存在する
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

  // 名前は存在するがタグ不一致
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

  let finalBody = bodyRaw;

  // 誤字自動修正
  finalBody = applyAutofix(finalBody);

  // 返信モードなら >>N を先頭に付与（入力欄には表示しない仕様）
  if (state.replyState && state.replyState.anchorNo != null) {
    finalBody = `>>${state.replyState.anchorNo} ` + finalBody;
  }

  // ジャンル
  const genre = getSelectedGenre();

  // owner_name / owner_tag
  let ownerName = info.name;
  let ownerTag = null;
  if (!ownerName) {
    ownerName = "名無し";
  }
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
    thread_title: null, // タイトルは歯車から編集
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
    const { error } = await supabase
      .from("ld_board_comments")
      .insert(payload)
      .single();

    if (error) {
      console.error("insert error", error);
      showToast("投稿に失敗しました。");
      return;
    }

    // 騙りの場合は mis_input_count を増やす
    if (info.mode === "imposter" && info.user) {
      incrementUserMisInput(info.user);
    }

    showToast("投稿しました。");
    resetComposer();
    // 最新状態を再読み込み
    await loadInitialThreads();
    // 自分の最終書込み時間が必要かもしれないので更新
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
    // 単純な文字列置換（全置換）
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

/* =====================
 * 返信
 * ===================== */

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

  // 入力欄にフォーカス
  dom.commentBodyInput.focus();
}

/* =====================
 * 添付
 * ===================== */

function handleAttachBoardClick() {
  const current = state.draftBoardLayoutId || "";
  const result = window.prompt(
    "盤面IDを入力してください（将来的に盤面エディタ連携予定）",
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
    dom.attachedImageLabel.textContent = `画像URL: ${shorten(
      state.draftImageUrl,
      32
    )}`;
    dom.attachedImageLabel.classList.remove("attach-chip--hidden");
  } else {
    dom.attachedImageLabel.textContent = "";
    dom.attachedImageLabel.classList.add("attach-chip--hidden");
  }
}

/* =====================
 * イイネ
 * ===================== */

async function handleLike(comment) {
  const id = comment.id;
  const key = String(id);
  if (state.likeCache.has(key)) {
    showToast("同じ端末からの二重イイネはできません。");
    return;
  }

  try {
    // DBのカウントを +1
    const { error } = await supabase.rpc("increment_like_count", {
      comment_id: id,
    });
    if (error) {
      console.error("like rpc error", error);
      showToast("イイネに失敗しました。");
      return;
    }
    state.likeCache.add(key);
    saveLikeCache();
    showToast("(・∀・)ｲｲ!! しました。");

    // ローカルの comment.like_count も更新（簡易）
    const thread = state.threads.find((t) =>
      t.allComments.some((c) => c.id === id)
    );
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
  dom.imageModal.classList.remove("hidden");
}

function openBoardLayout(boardLayoutId) {
  // 盤面エディタのビューアモードと連携する想定
  // 例: ld_board_editor_drag_v5.html?layout_id=xxx&mode=view
  const url = `ld_board_editor_drag_v5.html?layout_id=${encodeURIComponent(
    boardLayoutId
  )}&mode=view`;
  window.open(url, "_blank");
}

function hideModal(id) {
  if (id === "imageModal") {
    dom.imageModal.classList.add("hidden");
  } else if (id === "gearModal") {
    dom.gearModal.classList.add("hidden");
  }
}

/* =====================
 * 歯車メニュー
 * ===================== */

let currentGearTarget = null; // { comment, thread }

function openGearModal(comment, thread) {
  currentGearTarget = { comment, thread };
  renderGearModalContent(comment, thread);
  dom.gearModal.classList.remove("hidden");
}

function renderGearModalContent(comment, thread) {
  const isParent = comment.id === thread.parent.id;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = "";

  // タイトル作成／編集
  if (isParent) {
    const titleSection = document.createElement("div");
    titleSection.className = "gear-section";

    const titleLabel = document.createElement("div");
    titleLabel.className = "gear-section-title";
    titleLabel.textContent = "スレッドタイトル";
    titleSection.appendChild(titleLabel);

    const inputRow = document.createElement("div");
    inputRow.className = "gear-row";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 20;
    input.value = thread.parent.thread_title || "";
    input.placeholder = "タイトル（20文字まで）";
    inputRow.appendChild(input);
    titleSection.appendChild(inputRow);

    const buttons = document.createElement("div");
    buttons.className = "gear-actions";
    const saveBtn = document.createElement("button");
    saveBtn.className = "primary";
    saveBtn.textContent = thread.parent.thread_title
      ? "タイトルを更新"
      : "タイトルを作成";
    saveBtn.addEventListener("click", async () => {
      const v = input.value.trim();
      await updateThreadTitle(thread, v);
    });
    buttons.appendChild(saveBtn);
    titleSection.appendChild(buttons);

    wrapper.appendChild(titleSection);
  }

  // ジャンル変更
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const label = document.createElement("div");
    label.className = "gear-section-title";
    label.textContent = "コメントのジャンル";
    sec.appendChild(label);

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

    const btnRow = document.createElement("div");
    btnRow.className = "gear-actions";
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = isParent
      ? "スレッド全体のジャンルを変更"
      : "このコメントの属するスレッドのジャンルを変更";
    btn.addEventListener("click", async () => {
      await updateCommentGenre(thread, select.value);
    });
    btnRow.appendChild(btn);
    sec.appendChild(btnRow);

    wrapper.appendChild(sec);
  }

  // 非表示・完全削除
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const label = document.createElement("div");
    label.className = "gear-section-title";
    label.textContent = "削除／非表示";
    sec.appendChild(label);

    const btnRow = document.createElement("div");
    btnRow.className = "gear-actions";

    const hideBtn = document.createElement("button");
    hideBtn.className = "danger";
    hideBtn.textContent = isParent
      ? "スレッド（親＋子）を非表示"
      : "このコメントを非表示";
    hideBtn.addEventListener("click", async () => {
      await hideComment(comment, thread, false);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger";
    deleteBtn.textContent = isParent
      ? "スレッド（親＋子）を完全削除"
      : "このコメントを完全削除";
    deleteBtn.addEventListener("click", async () => {
      await hideComment(comment, thread, true);
    });

    btnRow.appendChild(hideBtn);
    btnRow.appendChild(deleteBtn);
    sec.appendChild(btnRow);

    wrapper.appendChild(sec);
  }

  // 追記
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const label = document.createElement("div");
    label.className = "gear-section-title";
    label.textContent = "コメントへの追記";
    sec.appendChild(label);

    const row = document.createElement("div");
    row.className = "gear-row";
    const textarea = document.createElement("textarea");
    textarea.rows = 3;
    textarea.placeholder = "追記内容を入力";
    row.appendChild(textarea);
    sec.appendChild(row);

    const btnRow = document.createElement("div");
    btnRow.className = "gear-actions";
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
    btnRow.appendChild(btn);
    sec.appendChild(btnRow);

    wrapper.appendChild(sec);
  }

  // 推薦（将来機能）
  {
    const sec = document.createElement("div");
    sec.className = "gear-section";
    const label = document.createElement("div");
    label.className = "gear-section-title";
    label.textContent = "攻略wikiへの推薦（将来機能）";
    sec.appendChild(label);

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

    const btnRow = document.createElement("div");
    btnRow.className = "gear-actions";
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "選択ページへ推薦";
    btn.addEventListener("click", () => {
      showToast("推薦機能はまだ未実装です（UIのみ先行）");
    });
    btnRow.appendChild(btn);
    sec.appendChild(btnRow);

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
    dom.gearModal.classList.add("hidden");
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
    // ローカル反映
    thread.parent.genre = newGenre;
    thread.allComments.forEach((c) => {
      if (c.id === thread.parent.id) c.genre = newGenre;
    });
    showToast("ジャンルを変更しました。");
    dom.gearModal.classList.add("hidden");
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
      // 完全削除
      const ids = isParent
        ? thread.allComments.map((c) => c.id)
        : [comment.id];
      const { error } = await supabase
        .from("ld_board_comments")
        .delete()
        .in("id", ids);
      if (error) {
        console.error("delete error", error);
        showToast("削除に失敗しました。");
        return;
      }
    } else {
      // 非表示（論理削除）
      const ids = isParent
        ? thread.allComments.map((c) => c.id)
        : [comment.id];
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
    dom.gearModal.classList.add("hidden");
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
    dom.gearModal.classList.add("hidden");
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
    } catch (e) {
      // ignore
    }
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
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function convertAnchorsToLinks(text) {
  // >>数字 をアンカーリンクに変換
  return text.replace(/&gt;&gt;(\d+)/g, (m, p1) => {
    return `<a href="#comment-${p1}" class="anchor-link" data-anchor-no="${p1}">&gt;&gt;${p1}</a>`;
  });
}

function shorten(str, max) {
  if (!str || str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}
