// ld_board.js
// ラッキー傭兵団 情報掲示板 フロントエンドロジック（Ver1 改＋返信ジャンル非表示＆添付削除ボタン）

/* =====================
 * 定数 / 設定
 * ===================== */

const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyNjU0NzUsImV4cCI6MjA0Nzg0MTQ3NX0.GPZcFxX0ql8Qj3sNtIizmT30Y0LndgUAdLHMMIUPIPc";

const BOARD_KIND = "info";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =====================
 * ユーティリティ
 * ===================== */

function $(id) {
  return document.getElementById(id);
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* トースト */

const toastState = {
  timerId: null,
};

function showToast(message, duration = 2500) {
  const container = $("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  if (toastState.timerId) {
    clearTimeout(toastState.timerId);
  }
  toastState.timerId = setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, duration);
}

/* =====================
 * 状態
 * ===================== */

const state = {
  rawComments: [],
  threads: [],
  displayedThreads: [],
  oldestLoaded: null,
  newestLoaded: null,
  isInitialLoading: false,
  isLoadingMore: false,
  pageSize: 20,
  hasDoneInitialScroll: false,

  filters: {
    keyword: "",
    targets: { body: true, title: true, user: true },
    genres: { normal: true, qa: true, report: true, announce: true },
    sinceMyLast: false,
    hasAttachment: false,
  },
  lastOwnCommentTime: null,

  replyState: null,

  draftBoardLayoutId: null,
  draftImageUrls: [],

  userInfo: {
    name: "",
    tag: "",
    mode: "guest",
    user: null,
  },
};

const dom = {};

/* =====================
 * 初期化
 * ===================== */

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  setupBasicHandlers();
  restoreUserInfoFromStorage();
  initFiltersFromState();
  updateUserModeLabel();
  updateFilterSummary();
  loadInitialThreads();
});

/* =====================
 * DOM キャッシュ
 * ===================== */

function cacheDom() {
  dom.userNameInput = $("userNameInput");
  dom.userTagInput = $("userTagInput");
  dom.userModeLabel = $("userModeLabel");
  dom.userModeToggleBtn = $("userModeToggleBtn");

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
  dom.sinceMyLastCheckbox = $("sinceMyLastCheckbox");
  dom.hasAttachmentCheckbox = $("hasAttachmentCheckbox");
  dom.currentFilterSummary = $("currentFilterSummary");
  dom.applyFilterBtn = $("applyFilterBtn");
  dom.resetFilterBtn = $("resetFilterBtn");

  dom.threadContainer = $("threadContainer");
  dom.initialLoading = $("initialLoading");
  dom.loadMoreBtn = $("loadMoreBtn");
  dom.loadMoreStatus = $("loadMoreStatus");

  dom.footerToggle = $("footerToggle");
  dom.composerToggleLabel = $("composerToggleLabel");
  dom.composerBody = $("composerBody");
  dom.composerGenreRow = $("composerGenreRow");
  dom.replyInfoRow = $("replyInfoRow");
  dom.replyInfoText = $("replyInfoText");
  dom.cancelReplyBtn = $("cancelReplyBtn");
  dom.commentBodyInput = $("commentBodyInput");
  dom.attachBoardBtn = $("attachBoardBtn");
  dom.attachImageBtn = $("attachImageBtn");
  dom.attachedBoardLabel = $("attachedBoardLabel");
  dom.clearBoardAttachBtn = $("clearBoardAttachBtn");
  dom.attachedImageLabel = $("attachedImageLabel");
  dom.clearImageAttachBtn = $("clearImageAttachBtn");
  dom.submitCommentBtn = $("submitCommentBtn");
  dom.composerStatus = $("composerStatus");
  dom.imageFileInput = $("imageFileInput");

  dom.imageModal = $("imageModal");
  dom.modalImage = $("modalImage");

  dom.gearModal = $("gearModal");
  dom.gearModalBody = $("gearModalBody");

  dom.profileModal = $("profileModal");
  dom.profileModalTitle = $("profileModalTitle");
  dom.profileModalBody = $("profileModalBody");
}

/* =====================
 * イベントハンドラ設定
 * ===================== */

function setupBasicHandlers() {
  if (dom.userNameInput) {
    dom.userNameInput.addEventListener(
      "input",
      debounce(handleUserNameChange, 300)
    );
  }
  if (dom.userTagInput) {
    dom.userTagInput.addEventListener(
      "input",
      debounce(handleUserTagChange, 300)
    );
  }
  if (dom.userModeToggleBtn) {
    dom.userModeToggleBtn.addEventListener("click", toggleUserMode);
  }

  if (dom.filterToggleBtn && dom.filterPanel) {
    dom.filterToggleBtn.addEventListener("click", () => {
      const isHidden = dom.filterPanel.style.display === "none";
      dom.filterPanel.style.display = isHidden ? "block" : "none";
      dom.filterToggleBtn.textContent = isHidden
        ? "▲フィルタを閉じる"
        : "▼フィルタを開く";
    });
  }

  if (dom.keywordInput) {
    dom.keywordInput.addEventListener(
      "input",
      debounce(() => {
        state.filters.keyword = dom.keywordInput.value.trim();
        updateFilterSummary();
      }, 300)
    );
  }

  if (dom.targetBody) {
    dom.targetBody.addEventListener("change", () => {
      state.filters.targets.body = dom.targetBody.checked;
      updateFilterSummary();
    });
  }
  if (dom.targetTitle) {
    dom.targetTitle.addEventListener("change", () => {
      state.filters.targets.title = dom.targetTitle.checked;
      updateFilterSummary();
    });
  }
  if (dom.targetUser) {
    dom.targetUser.addEventListener("change", () => {
      state.filters.targets.user = dom.targetUser.checked;
      updateFilterSummary();
    });
  }

  if (dom.genreNormal) {
    dom.genreNormal.addEventListener("change", () => {
      state.filters.genres.normal = dom.genreNormal.checked;
      updateFilterSummary();
    });
  }
  if (dom.genreQa) {
    dom.genreQa.addEventListener("change", () => {
      state.filters.genres.qa = dom.genreQa.checked;
      updateFilterSummary();
    });
  }
  if (dom.genreReport) {
    dom.genreReport.addEventListener("change", () => {
      state.filters.genres.report = dom.genreReport.checked;
      updateFilterSummary();
    });
  }
  if (dom.genreAnnounce) {
    dom.genreAnnounce.addEventListener("change", () => {
      state.filters.genres.announce = dom.genreAnnounce.checked;
      updateFilterSummary();
    });
  }

  if (dom.sinceMyLastCheckbox) {
    dom.sinceMyLastCheckbox.addEventListener("change", () => {
      state.filters.sinceMyLast = dom.sinceMyLastCheckbox.checked;
      updateFilterSummary();
    });
  }
  if (dom.hasAttachmentCheckbox) {
    dom.hasAttachmentCheckbox.addEventListener("change", () => {
      state.filters.hasAttachment = dom.hasAttachmentCheckbox.checked;
      updateFilterSummary();
    });
  }

  if (dom.applyFilterBtn) {
    dom.applyFilterBtn.addEventListener("click", async () => {
      if (state.filters.sinceMyLast) {
        await fetchLastOwnCommentTime();
      } else {
        state.lastOwnCommentTime = null;
      }
      applyFiltersAndRender();
    });
  }

  if (dom.resetFilterBtn) {
    dom.resetFilterBtn.addEventListener("click", () => {
      resetFilters();
      initFiltersFromState();
      updateFilterSummary();
      applyFiltersAndRender();
    });
  }

  if (dom.loadMoreBtn) {
    dom.loadMoreBtn.addEventListener("click", () => {
      loadMoreThreads();
    });
  }

  if (dom.footerToggle && dom.composerBody && dom.composerToggleLabel) {
    dom.footerToggle.addEventListener("click", () => {
      const opened = !dom.composerBody.classList.contains("footer-body--open");
      dom.composerBody.classList.toggle("footer-body--open", opened);
      dom.composerToggleLabel.textContent = opened
        ? "▼コメントの入力ツールを非表示(タップ)"
        : "▲コメントの入力ツールを表示(タップ)";
    });
  }

  if (dom.cancelReplyBtn) {
    dom.cancelReplyBtn.addEventListener("click", () => {
      clearReplyState();
    });
  }

  if (dom.attachBoardBtn) {
    dom.attachBoardBtn.addEventListener("click", handleAttachBoardClick);
  }
  if (dom.attachImageBtn) {
    dom.attachImageBtn.addEventListener("click", handleAttachImageClick);
  }
  if (dom.imageFileInput) {
    dom.imageFileInput.addEventListener("change", handleImageFileChange);
  }

  if (dom.clearBoardAttachBtn) {
    dom.clearBoardAttachBtn.addEventListener("click", () => {
      state.draftBoardLayoutId = null;
      updateAttachLabels();
    });
  }

  if (dom.clearImageAttachBtn) {
    dom.clearImageAttachBtn.addEventListener("click", () => {
      state.draftImageUrls = [];
      if (dom.imageFileInput) {
        dom.imageFileInput.value = "";
      }
      updateAttachLabels();
    });
  }

  if (dom.submitCommentBtn) {
    dom.submitCommentBtn.addEventListener("click", () => {
      handleSubmit();
    });
  }

  // モーダルクローズ
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const closeType = target.getAttribute("data-modal-close");
    if (closeType === "image") {
      hideImageModal();
    } else if (closeType === "gear") {
      hideGearModal();
    } else if (closeType === "profile") {
      hideProfileModal();
    }
  });

  if (dom.imageModal) {
    dom.imageModal.addEventListener("click", (e) => {
      if (e.target === dom.imageModal) {
        hideImageModal();
      }
    });
  }
  if (dom.gearModal) {
    dom.gearModal.addEventListener("click", (e) => {
      if (e.target === dom.gearModal) {
        hideGearModal();
      }
    });
  }
  if (dom.profileModal) {
    dom.profileModal.addEventListener("click", (e) => {
      if (e.target === dom.profileModal) {
        hideProfileModal();
      }
    });
  }
}

/* =====================
 * ユーザー情報管理
 * ===================== */

function restoreUserInfoFromStorage() {
  try {
    const raw = localStorage.getItem("ld_board_user_info");
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (obj.name) state.userInfo.name = obj.name;
    if (obj.tag) state.userInfo.tag = obj.tag;
    if (obj.mode) state.userInfo.mode = obj.mode;
    if (dom.userNameInput) dom.userNameInput.value = state.userInfo.name;
    if (dom.userTagInput) dom.userTagInput.value = state.userInfo.tag;
  } catch (e) {
    console.error("restoreUserInfo error", e);
  }
}

function saveUserInfoToStorage() {
  try {
    const obj = {
      name: state.userInfo.name,
      tag: state.userInfo.tag,
      mode: state.userInfo.mode,
    };
    localStorage.setItem("ld_board_user_info", JSON.stringify(obj));
  } catch (e) {
    console.error("saveUserInfo error", e);
  }
}

function handleUserNameChange() {
  state.userInfo.name = dom.userNameInput.value.trim();
  saveUserInfoToStorage();
  updateUserModeLabel();
}

function handleUserTagChange() {
  state.userInfo.tag = dom.userTagInput.value.trim();
  saveUserInfoToStorage();
  updateUserModeLabel();
}

function toggleUserMode() {
  const current = state.userInfo.mode || "guest";
  if (current === "guest") {
    state.userInfo.mode = "registered";
  } else if (current === "registered") {
    state.userInfo.mode = "imposter";
  } else {
    state.userInfo.mode = "guest";
  }
  saveUserInfoToStorage();
  updateUserModeLabel();
}

function updateUserModeLabel() {
  const info = getCurrentUserInfo();
  if (!dom.userModeLabel) return;
  if (info.mode === "registered" && info.user) {
    dom.userModeLabel.textContent = `『${info.user.name}』として投稿`;
  } else if (info.mode === "imposter" && info.user) {
    dom.userModeLabel.textContent = `『${info.user.name}』への騙り投稿モード（非推奨w）`;
  } else {
    dom.userModeLabel.textContent = "名無しとして投稿";
  }

  if (dom.userTagInput) {
    dom.userTagInput.disabled = info.mode !== "registered" && info.mode !== "imposter";
  }
}

function getCurrentUserInfo() {
  return {
    name: state.userInfo.name.trim(),
    tag: state.userInfo.tag.trim(),
    mode: state.userInfo.mode || "guest",
    user: state.userInfo.user || null,
  };
}

/* =====================
 * フィルタ
 * ===================== */

function resetFilters() {
  state.filters.keyword = "";
  state.filters.targets = { body: true, title: true, user: true };
  state.filters.genres = { normal: true, qa: true, report: true, announce: true };
  state.filters.sinceMyLast = false;
  state.filters.hasAttachment = false;
  state.lastOwnCommentTime = null;
}

function initFiltersFromState() {
  if (dom.keywordInput) dom.keywordInput.value = state.filters.keyword;
  if (dom.targetBody) dom.targetBody.checked = state.filters.targets.body;
  if (dom.targetTitle) dom.targetTitle.checked = state.filters.targets.title;
  if (dom.targetUser) dom.targetUser.checked = state.filters.targets.user;
  if (dom.genreNormal) dom.genreNormal.checked = state.filters.genres.normal;
  if (dom.genreQa) dom.genreQa.checked = state.filters.genres.qa;
  if (dom.genreReport) dom.genreReport.checked = state.filters.genres.report;
  if (dom.genreAnnounce) dom.genreAnnounce.checked = state.filters.genres.announce;
  if (dom.sinceMyLastCheckbox)
    dom.sinceMyLastCheckbox.checked = state.filters.sinceMyLast;
  if (dom.hasAttachmentCheckbox)
    dom.hasAttachmentCheckbox.checked = state.filters.hasAttachment;
}

function updateFilterSummary() {
  const parts = [];
  if (state.filters.keyword) {
    parts.push(`「${state.filters.keyword}」`);
  }
  const tgts = [];
  if (state.filters.targets.body) tgts.push("本文");
  if (state.filters.targets.title) tgts.push("タイトル");
  if (state.filters.targets.user) tgts.push("ユーザー名");
  if (tgts.length > 0) {
    parts.push(`対象: ${tgts.join("・")}`);
  }

  const gs = [];
  if (state.filters.genres.normal) gs.push("通常");
  if (state.filters.genres.qa) gs.push("質問");
  if (state.filters.genres.report) gs.push("報告");
  if (state.filters.genres.announce) gs.push("アナウンス");
  if (gs.length > 0 && gs.length < 4) {
    parts.push(`ジャンル: ${gs.join("・")}`);
  }

  if (state.filters.sinceMyLast) {
    parts.push("自身の最終書込み以降のみ");
  }
  if (state.filters.hasAttachment) {
    parts.push("盤面・画像付きのみ");
  }

  if (dom.currentFilterSummary) {
    dom.currentFilterSummary.textContent =
      parts.length > 0 ? parts.join(" / ") : "フィルタ未指定";
  }
}

/* =====================
 * データロード
 * ===================== */

async function loadInitialThreads() {
  if (state.isInitialLoading) return;
  state.isInitialLoading = true;
  if (dom.initialLoading) dom.initialLoading.style.display = "block";
  try {
    const { data, error } = await supabaseClient
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", BOARD_KIND)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .limit(state.pageSize);
    if (error) {
      console.error("loadInitialThreads error", error);
      showToast("コメントの取得に失敗しました。");
      return;
    }
    state.rawComments = data || [];
    state.oldestLoaded =
      state.rawComments.length > 0
        ? state.rawComments[state.rawComments.length - 1].created_at
        : null;
    state.newestLoaded =
      state.rawComments.length > 0 ? state.rawComments[0].created_at : null;

    await loadChildCommentsForParents(state.rawComments);

    buildThreadsFromRaw();
    applyFiltersAndRender();
  } finally {
    state.isInitialLoading = false;
    if (dom.initialLoading) dom.initialLoading.style.display = "none";
  }
}

async function loadMoreThreads() {
  if (state.isLoadingMore) return;
  if (!state.oldestLoaded) {
    showToast("これ以上古いコメントはありません。");
    return;
  }
  state.isLoadingMore = true;
  if (dom.loadMoreStatus) dom.loadMoreStatus.textContent = "読み込み中...";

  try {
    const { data, error } = await supabaseClient
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", BOARD_KIND)
      .is("parent_comment_id", null)
      .lt("created_at", state.oldestLoaded)
      .order("created_at", { ascending: false })
      .limit(state.pageSize);
    if (error) {
      console.error("loadMoreThreads error", error);
      showToast("コメントの取得に失敗しました。");
      return;
    }
    if (!data || data.length === 0) {
      showToast("これ以上古いコメントはありません。");
      if (dom.loadMoreStatus) dom.loadMoreStatus.textContent = "これ以上ありません";
      return;
    }

    state.rawComments = state.rawComments.concat(data);
    state.oldestLoaded =
      state.rawComments[state.rawComments.length - 1].created_at;

    await loadChildCommentsForParents(data);

    buildThreadsFromRaw();
    applyFiltersAndRender();
  } finally {
    state.isLoadingMore = false;
    if (dom.loadMoreStatus) dom.loadMoreStatus.textContent = "";
  }
}

async function loadChildCommentsForParents(parents) {
  if (!parents || parents.length === 0) return;
  const rootIds = parents.map((p) => p.id);
  const { data, error } = await supabaseClient
    .from("ld_board_comments")
    .select("*")
    .eq("board_kind", BOARD_KIND)
    .in("root_comment_id", rootIds)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("loadChildCommentsForParents error", error);
    showToast("子コメントの取得に失敗しました。");
    return;
  }
  state.rawComments = state.rawComments.concat(data || []);
}

/* 自身の最終書込み時刻 */

async function fetchLastOwnCommentTime() {
  const info = getCurrentUserInfo();
  if (!info.name || !info.tag) {
    showToast("ユーザーデータベースに登録済みユーザー名＋パスを入力してください。");
    state.lastOwnCommentTime = null;
    return;
  }
  const { data: userRows, error: userError } = await supabaseClient
    .from("ld_users")
    .select("*")
    .eq("name", info.name)
    .eq("tag", info.tag)
    .limit(1)
    .maybeSingle();
  if (userError) {
    console.error("fetchLastOwnCommentTime ld_users error", userError);
    showToast("ユーザー情報の確認に失敗しました。");
    state.lastOwnCommentTime = null;
    return;
  }
  if (!userRows) {
    showToast("ユーザーデータベースに登録されていません。");
    state.lastOwnCommentTime = null;
    return;
  }

  const { data, error } = await supabaseClient
    .from("ld_board_comments")
    .select("created_at")
    .eq("board_kind", BOARD_KIND)
    .eq("owner_name", info.name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("fetchLastOwnCommentTime comments error", error);
    showToast("最終書込み時刻の取得に失敗しました。");
    state.lastOwnCommentTime = null;
    return;
  }

  state.lastOwnCommentTime = data ? data.created_at : null;
}

/* =====================
 * スレッド構築
 * ===================== */

function buildThreadsFromRaw() {
  const parents = state.rawComments.filter((c) => !c.parent_comment_id);
  const children = state.rawComments.filter((c) => !!c.parent_comment_id);

  const childrenByRoot = {};
  for (const child of children) {
    if (!child.root_comment_id) continue;
    if (!childrenByRoot[child.root_comment_id]) {
      childrenByRoot[child.root_comment_id] = [];
    }
    childrenByRoot[child.root_comment_id].push(child);
  }

  const threads = [];
  for (const parent of parents) {
    const rootId = parent.id;
    const ch = childrenByRoot[rootId] || [];
    ch.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const all = [parent].concat(ch);
    let latest = parent;
    let totalLikes = 0;
    for (const c of all) {
      totalLikes += c.like_count || 0;
      if (new Date(c.created_at) > new Date(latest.created_at)) {
        latest = c;
      }
    }

    threads.push({
      rootId,
      parent,
      children: ch,
      allComments: all,
      latest,
      totalLikes,
      showAllChildren: false,
    });
  }

  threads.sort(
    (a, b) => new Date(a.latest.created_at) - new Date(b.latest.created_at)
  );

  state.threads = threads;
}

/* =====================
 * フィルタ適用 & レンダリング
 * ===================== */

function applyFiltersAndRender() {
  let threads = state.threads.slice();

  const f = state.filters;

  if (f.keyword) {
    const kw = f.keyword.toLowerCase();
    threads = threads.filter((t) => {
      const parent = t.parent;
      let hit = false;
      if (f.targets.title && parent.thread_title) {
        hit = parent.thread_title.toLowerCase().includes(kw);
      }
      if (!hit && f.targets.body) {
        for (const c of t.allComments) {
          if (c.body && c.body.toLowerCase().includes(kw)) {
            hit = true;
            break;
          }
        }
      }
      if (!hit && f.targets.user) {
        for (const c of t.allComments) {
          if (c.owner_name && c.owner_name.toLowerCase().includes(kw)) {
            hit = true;
            break;
          }
        }
      }
      return hit;
    });
  }

  threads = threads.filter((t) => {
    const g = t.parent.genre || "normal";
    if (g === "normal" && !f.genres.normal) return false;
    if (g === "qa" && !f.genres.qa) return false;
    if (g === "report" && !f.genres.report) return false;
    if (g === "announce" && !f.genres.announce) return false;
    return true;
  });

  if (f.sinceMyLast && state.lastOwnCommentTime) {
    const baseTime = new Date(state.lastOwnCommentTime);
    threads = threads.filter(
      (t) => new Date(t.latest.created_at) >= baseTime
    );
  }

  if (f.hasAttachment) {
    threads = threads.filter((t) => {
      return t.allComments.some(
        (c) => c.board_layout_id || c.image_url_left || c.image_url_right
      );
    });
  }

  state.displayedThreads = threads;
  renderThreads();
}

/* =====================
 * スレッド描画
 * ===================== */

function renderThreads() {
  if (!dom.threadContainer) return;
  dom.threadContainer.innerHTML = "";

  if (state.displayedThreads.length === 0) {
    const empty = document.createElement("div");
    empty.className = "initial-loading";
    empty.textContent = "条件に一致するコメントがありません。";
    dom.threadContainer.appendChild(empty);
    return;
  }

  for (const thread of state.displayedThreads) {
    const card = renderThreadCard(thread);
    dom.threadContainer.appendChild(card);
  }
}

/* スレッドカード */

function renderThreadCard(thread) {
  const card = document.createElement("article");
  card.className = "thread-card";

  const headerEl = document.createElement("div");
  headerEl.className = "thread-header";

  const titleArea = document.createElement("div");
  titleArea.className = "thread-title-area";

  const parent = thread.parent;

  const genre = parent.genre || "normal";
  let genreLabel = "";
  let genreClass = "";
  if (genre === "qa") {
    genreLabel = "質問・相談";
    genreClass = "thread-genre-badge--qa";
  } else if (genre === "report") {
    genreLabel = "報告";
    genreClass = "thread-genre-badge--report";
  } else if (genre === "announce") {
    genreLabel = "アナウンス";
    genreClass = "thread-genre-badge--announce";
  }

  if (genre !== "normal") {
    const badge = document.createElement("span");
    badge.className = `thread-genre-badge ${genreClass}`;
    badge.textContent = genreLabel || "通常";
    titleArea.appendChild(badge);
  }

  if (parent.thread_title) {
    const titleEl = document.createElement("div");
    titleEl.className = "thread-title";
    titleEl.textContent = parent.thread_title;
    titleArea.appendChild(titleEl);
  }

  const metaEl = document.createElement("div");
  metaEl.className = "thread-meta";
  metaEl.textContent = `最終更新: ${formatDateTime(
    thread.latest.created_at
  )}`;
  titleArea.appendChild(metaEl);

  headerEl.appendChild(titleArea);

  if (parent.thread_title && thread.totalLikes > 0) {
    const likeSummary = document.createElement("div");
    likeSummary.className = "thread-like-summary";
    likeSummary.textContent = `(・∀・)ｲｲ!!合計: ${thread.totalLikes}`;
    headerEl.appendChild(likeSummary);
  }

  card.appendChild(headerEl);

  const list = document.createElement("div");
  list.className = "comment-list";

  const parentCard = renderCommentCard(thread, parent, 1, true);
  list.appendChild(parentCard);

  if (thread.children.length > 0) {
    if (thread.showAllChildren) {
      let localNo = 2;
      for (const child of thread.children) {
        const childCard = renderCommentCard(thread, child, localNo, false);
        list.appendChild(childCard);
        localNo++;
      }
    } else {
      const lastChild = thread.children[thread.children.length - 1];
      const childCard = renderCommentCard(
        thread,
        lastChild,
        thread.children.length + 1,
        false
      );
      list.appendChild(childCard);

      if (thread.children.length > 1) {
        const toggle = document.createElement("div");
        toggle.className = "thread-children-toggle";
        toggle.textContent = `▼子コメント(全${thread.children.length}件)を開く`;
        toggle.addEventListener("click", () => {
          thread.showAllChildren = true;
          renderThreads();
        });
        list.appendChild(toggle);
      }
    }
  }

  card.appendChild(list);

  return card;
}

/* コメントカード */

function renderCommentCard(thread, comment, localNo, isParent) {
  const card = document.createElement("div");
  card.className = "comment-card " + (isParent ? "comment-card--parent" : "comment-card--child");

  const header = document.createElement("div");
  header.className = "comment-header";

  const headerLeft = document.createElement("div");
  headerLeft.className = "comment-header-left";

  const numberEl = document.createElement("span");
  numberEl.className = "comment-number";
  if (isParent && thread.children.length > 0) {
    numberEl.textContent = "No.1";
  } else if (!isParent && thread.children.length > 0) {
    numberEl.textContent = `No.${localNo}`;
  } else {
    numberEl.textContent = "";
  }
  headerLeft.appendChild(numberEl);

  const nameEl = document.createElement("span");
  nameEl.className = "comment-owner-name";

  const nameInfo = buildDisplayNameForComment(comment);

  nameEl.textContent = nameInfo.display;
  nameEl.className +=
    " " +
    (nameInfo.kind === "registered"
      ? "comment-owner-name--registered"
      : nameInfo.kind === "imposter"
      ? "comment-owner-name--imposter"
      : "");

  headerLeft.appendChild(nameEl);

  if (nameInfo.tagSuffix) {
    const tagEl = document.createElement("span");
    tagEl.className = "comment-owner-tag";
    tagEl.textContent = nameInfo.tagSuffix;
    headerLeft.appendChild(tagEl);
  }

  header.appendChild(headerLeft);

  const headerRight = document.createElement("div");
  headerRight.className = "comment-header-right";

  const timeEl = document.createElement("span");
  timeEl.className = "comment-time";
  timeEl.textContent = formatDateTime(comment.created_at);
  headerRight.appendChild(timeEl);

  if (nameInfo.kind === "registered" && nameInfo.user) {
    const profileBtn = document.createElement("button");
    profileBtn.className = "profile-btn";
    profileBtn.type = "button";
    profileBtn.textContent = "プロフ";
    profileBtn.addEventListener("click", () => {
      openProfileModal(nameInfo.user, comment);
    });
    headerRight.appendChild(profileBtn);
  }

  const gearBtn = document.createElement("button");
  gearBtn.className = "gear-btn";
  gearBtn.type = "button";
  gearBtn.textContent = "歯車";
  gearBtn.addEventListener("click", () => {
    openGearModal(thread, comment);
  });
  headerRight.appendChild(gearBtn);

  header.appendChild(headerRight);

  card.appendChild(header);

  const bodyEl = document.createElement("div");
  bodyEl.className = "comment-body";

  const html = buildCommentBodyHtml(comment.body, thread);
  bodyEl.innerHTML = html;

  card.appendChild(bodyEl);

  const lineCount = (comment.body || "").split(/\r?\n/).length;
  if (lineCount > 3) {
    bodyEl.classList.add("comment-body--collapsed");
    const toggle = document.createElement("div");
    toggle.className = "longtext-toggle";
    toggle.textContent = "▼長文表示(タップ)";
    toggle.addEventListener("click", () => {
      const collapsed = bodyEl.classList.contains("comment-body--collapsed");
      bodyEl.classList.toggle("comment-body--collapsed", !collapsed);
      toggle.textContent = collapsed
        ? "▲折りたたむ(タップ)"
        : "▼長文表示(タップ)";
    });
    card.appendChild(toggle);
  }

  const attachArea = document.createElement("div");
  attachArea.className = "comment-attachments";

  if (comment.board_layout_id) {
    const btn = document.createElement("button");
    btn.className = "board-link-btn";
    btn.type = "button";
    btn.textContent = "盤面を開く";
    btn.addEventListener("click", () => {
      const url =
        "ld_board_editor_drag_v5.html?layout_id=" +
        encodeURIComponent(comment.board_layout_id) +
        "&mode=view";
      window.open(url, "_blank");
    });
    attachArea.appendChild(btn);
  }

  const leftUrl = comment.image_url_left || comment.image_url || null;
  const rightUrl = comment.image_url_right || null;
  if (leftUrl) {
    const img = document.createElement("img");
    img.src = leftUrl;
    img.alt = "添付画像1";
    img.className = "image-thumb";
    img.addEventListener("click", () => {
      showImageModal(leftUrl);
    });
    attachArea.appendChild(img);
  }
  if (rightUrl) {
    const img2 = document.createElement("img");
    img2.src = rightUrl;
    img2.alt = "添付画像2";
    img2.className = "image-thumb";
    img2.addEventListener("click", () => {
      showImageModal(rightUrl);
    });
    attachArea.appendChild(img2);
  }

  if (attachArea.children.length > 0) {
    card.appendChild(attachArea);
  }

  const footer = document.createElement("div");
  footer.className = "comment-footer";

  const footerLeft = document.createElement("div");
  footerLeft.className = "comment-footer-left";
  footer.appendChild(footerLeft);

  const footerRight = document.createElement("div");
  footerRight.className = "comment-footer-right";

  const replyLink = document.createElement("span");
  replyLink.className = "comment-action";
  replyLink.textContent = "返信";
  replyLink.addEventListener("click", () => {
    startReply(thread, comment, localNo);
  });
  footerRight.appendChild(replyLink);

  const likeLink = document.createElement("span");
  likeLink.className = "comment-action";
  likeLink.textContent = "(・∀・)ｲｲ!!";
  likeLink.addEventListener("click", () => {
    handleLikeClick(thread, comment);
  });
  footerRight.appendChild(likeLink);

  if (comment.like_count && comment.like_count > 0) {
    const likeCountEl = document.createElement("span");
    likeCountEl.className = "comment-like-count";
    likeCountEl.textContent = `(・∀・)ｲｲ!!: ${comment.like_count}`;
    footerRight.appendChild(likeCountEl);
  }

  footer.appendChild(footerRight);

  card.appendChild(footer);

  return card;
}

/* 表示名 */

function buildDisplayNameForComment(comment) {
  const name = comment.owner_name || "";
  const tag = comment.owner_tag || null;
  const guestId = comment.guest_daily_id || "";

  const info = getCurrentUserInfo();
  const myName = info.name;
  const myTag = info.tag;

  if (!name || name === "名無し") {
    return {
      display: `名無しの傭兵員 ${guestId || "????"}`,
      tagSuffix: "",
      kind: "guest",
      user: null,
    };
  }

  if (myName && myTag && name === myName && tag === myTag && info.user) {
    return {
      display: `★${name}`,
      tagSuffix: "",
      kind: "registered",
      user: info.user,
    };
  }

  if (name === myName && (!tag || tag !== myTag)) {
    return {
      display: name,
      tagSuffix: `(騙りw ${guestId || "????"})`,
      kind: "imposter",
      user: info.user || null,
    };
  }

  return {
    display: `${name}`,
    tagSuffix: guestId ? ` ${guestId}` : "",
    kind: "other",
    user: null,
  };
}

/* 本文HTML生成 */

function buildCommentBodyHtml(body, thread) {
  if (!body) return "";
  let escaped = escapeHtml(body);

  escaped = escaped.replace(/&gt;&gt;(\d+)/g, (match, numStr) => {
    const num = parseInt(numStr, 10);
    if (!Number.isInteger(num) || num <= 0) return match;
    return `<a href="#" class="comment-anchor-link" data-anchor-no="${num}">&gt;&gt;${num}</a>`;
  });

  const wrapper = document.createElement("div");
  wrapper.innerHTML = escaped;

  const links = wrapper.querySelectorAll("a.comment-anchor-link");
  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const noStr = a.getAttribute("data-anchor-no");
      const num = parseInt(noStr, 10);
      if (!Number.isInteger(num)) return;
      scrollToLocalNo(thread.rootId, num);
    });
  });

  return wrapper.innerHTML;
}

function scrollToLocalNo(rootId, localNo) {
  const cards = dom.threadContainer.querySelectorAll(".thread-card");
  for (const card of cards) {
    const commentCards = card.querySelectorAll(".comment-card");
    for (const c of commentCards) {
      const numEl = c.querySelector(".comment-number");
      if (!numEl) continue;
      if (numEl.textContent === `No.${localNo}`) {
        const rect = c.getBoundingClientRect();
        window.scrollBy({
          top: rect.top - 80,
          behavior: "smooth",
        });
        return;
      }
    }
  }
}

/* =====================
 * モーダル
 * ===================== */

function showImageModal(url) {
  if (!dom.imageModal || !dom.modalImage) return;
  dom.modalImage.src = url;
  dom.imageModal.classList.remove("ld-modal-hidden");
}

function hideImageModal() {
  if (!dom.imageModal || !dom.modalImage) return;
  dom.modalImage.src = "";
  dom.imageModal.classList.add("ld-modal-hidden");
}

function openGearModal(thread, comment) {
  if (!dom.gearModal || !dom.gearModalBody) return;
  dom.gearModalBody.innerHTML = "";

  const section1 = document.createElement("div");
  section1.className = "gear-section";

  const title1 = document.createElement("div");
  title1.className = "gear-section-title";
  title1.textContent = "スレッドのタイトル";
  section1.appendChild(title1);

  const fieldRow = document.createElement("div");
  fieldRow.className = "gear-field-row";

  const label = document.createElement("label");
  label.textContent = "タイトル";
  fieldRow.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.value = thread.parent.thread_title || "";
  fieldRow.appendChild(input);

  section1.appendChild(fieldRow);

  const btnRow1 = document.createElement("div");
  btnRow1.className = "gear-btn-row";

  const saveTitleBtn = document.createElement("button");
  saveTitleBtn.type = "button";
  saveTitleBtn.className = "gear-primary-btn";
  saveTitleBtn.textContent = "タイトル保存";
  saveTitleBtn.addEventListener("click", async () => {
    await updateThreadTitle(thread, input.value);
  });
  btnRow1.appendChild(saveTitleBtn);

  section1.appendChild(btnRow1);

  dom.gearModalBody.appendChild(section1);

  const section2 = document.createElement("div");
  section2.className = "gear-section";

  const title2 = document.createElement("div");
  title2.className = "gear-section-title";
  title2.textContent = "スレッドのジャンル";
  section2.appendChild(title2);

  const rowInline = document.createElement("div");
  rowInline.className = "gear-row-inline gear-radio-group";

  const genres = [
    { value: "normal", label: "通常" },
    { value: "qa", label: "質問・相談" },
    { value: "report", label: "報告" },
    { value: "announce", label: "アナウンス" },
  ];
  const currentGenre = thread.parent.genre || "normal";

  for (const g of genres) {
    const lab = document.createElement("label");
    const r = document.createElement("input");
    r.type = "radio";
    r.name = "gearGenre";
    r.value = g.value;
    if (g.value === currentGenre) {
      r.checked = true;
    }
    lab.appendChild(r);
    lab.appendChild(document.createTextNode(g.label));
    rowInline.appendChild(lab);
  }

  section2.appendChild(rowInline);

  const btnRow2 = document.createElement("div");
  btnRow2.className = "gear-btn-row";

  const saveGenreBtn = document.createElement("button");
  saveGenreBtn.type = "button";
  saveGenreBtn.className = "gear-primary-btn";
  saveGenreBtn.textContent = "ジャンル保存";
  saveGenreBtn.addEventListener("click", async () => {
    const radios = dom.gearModalBody.querySelectorAll('input[name="gearGenre"]');
    let selected = currentGenre;
    for (const r of radios) {
      if (r.checked) {
        selected = r.value;
        break;
      }
    }
    await updateThreadGenre(thread, selected);
  });
  btnRow2.appendChild(saveGenreBtn);

  section2.appendChild(btnRow2);

  dom.gearModalBody.appendChild(section2);

  const section3 = document.createElement("div");
  section3.className = "gear-section";

  const title3 = document.createElement("div");
  title3.className = "gear-section-title";
  title3.textContent = "コメントの非表示 / 削除";
  section3.appendChild(title3);

  const btnRow3 = document.createElement("div");
  btnRow3.className = "gear-btn-row";

  const hideBtn = document.createElement("button");
  hideBtn.type = "button";
  hideBtn.className = "gear-secondary-btn";
  hideBtn.textContent = "コメントを非表示にする（未実装）";
  hideBtn.disabled = true;
  btnRow3.appendChild(hideBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "gear-danger-btn";
  deleteBtn.textContent = "コメントを削除（未実装）";
  deleteBtn.disabled = true;
  btnRow3.appendChild(deleteBtn);

  section3.appendChild(btnRow3);

  dom.gearModalBody.appendChild(section3);

  const section4 = document.createElement("div");
  section4.className = "gear-section";

  const title4 = document.createElement("div");
  title4.className = "gear-section-title";
  title4.textContent = "攻略wikiへの推薦（未実装）";
  section4.appendChild(title4);

  const p4 = document.createElement("div");
  p4.textContent =
    "このコメントを攻略wikiのネタとして推薦する機能を将来的に実装予定です。";
  section4.appendChild(p4);

  dom.gearModalBody.appendChild(section4);

  dom.gearModal.classList.remove("ld-modal-hidden");
}

function hideGearModal() {
  if (!dom.gearModal) return;
  dom.gearModal.classList.add("ld-modal-hidden");
}

/* プロフィールモーダル */

async function openProfileModal(userRow, comment) {
  if (!dom.profileModal || !dom.profileModalBody || !dom.profileModalTitle)
    return;

  dom.profileModalTitle.textContent = `★${userRow.name} さんのプロフィール`;

  dom.profileModalBody.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "profile-summary";

  const line1 = document.createElement("div");
  line1.className = "profile-summary-line";
  line1.innerHTML = `<span class="profile-summary-label">ユーザー名:</span> ★${userRow.name} (tag: ${userRow.tag})`;
  summary.appendChild(line1);

  const line2 = document.createElement("div");
  line2.className = "profile-summary-line";
  const vaultLevel = userRow.vault_level || "-";
  line2.innerHTML = `<span class="profile-summary-label">金庫Lv:</span> ${vaultLevel}`;
  summary.appendChild(line2);

  dom.profileModalBody.appendChild(summary);

  const mythicDiv = document.createElement("div");
  mythicDiv.className = "profile-mythic-grid";

  try {
    const mythicState = userRow.mythic_state || "";
    const entries = (mythicState || "").split(",");
    entries.forEach((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return;
      const [id, crown] = trimmed.split(":");
      const cell = document.createElement("div");
      cell.className = "profile-mythic-cell";

      const idEl = document.createElement("div");
      idEl.className = "profile-mythic-cell-id";
      idEl.textContent = id;
      cell.appendChild(idEl);

      const crownEl = document.createElement("div");
      crownEl.className = "profile-mythic-cell-state";
      crownEl.textContent = crown ? `👑x${crown}` : "なし";
      cell.appendChild(crownEl);

      mythicDiv.appendChild(cell);
    });
  } catch (e) {
    console.error("parse mythic_state error", e);
  }

  dom.profileModalBody.appendChild(mythicDiv);

  dom.profileModal.classList.remove("ld-modal-hidden");
}

function hideProfileModal() {
  if (!dom.profileModal) return;
  dom.profileModal.classList.add("ld-modal-hidden");
}

/* =====================
 * 歯車メニューからの更新処理（タイトル・ジャンル）
 * ===================== */

async function updateThreadTitle(thread, newTitle) {
  const parentId = thread.parent.id;
  const { error } = await supabaseClient
    .from("ld_board_comments")
    .update({ thread_title: newTitle || null })
    .eq("id", parentId)
    .eq("board_kind", BOARD_KIND);
  if (error) {
    console.error("updateThreadTitle error", error);
    showToast("タイトルの更新に失敗しました。");
    return;
  }
  showToast("タイトルを更新しました。");

  thread.parent.thread_title = newTitle || null;
  buildThreadsFromRaw();
  applyFiltersAndRender();
}

async function updateThreadGenre(thread, newGenre) {
  const parentId = thread.parent.id;
  const { error } = await supabaseClient
    .from("ld_board_comments")
    .update({ genre: newGenre || "normal" })
    .eq("id", parentId)
    .eq("board_kind", BOARD_KIND);
  if (error) {
    console.error("updateThreadGenre error", error);
    showToast("ジャンルの更新に失敗しました。");
    return;
  }
  showToast("ジャンルを更新しました。");

  thread.parent.genre = newGenre || "normal";
  buildThreadsFromRaw();
  applyFiltersAndRender();
}

/* =====================
 * イイネ
 * ===================== */

async function handleLikeClick(thread, comment) {
  const cacheKey = "ld_board_like_cache";
  let cache = {};
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cache = JSON.parse(raw);
  } catch (e) {
    console.error("like cache parse error", e);
  }

  const key = String(comment.id);
  if (cache[key]) {
    showToast("このコメントにはすでにイイネ済みです。");
    return;
  }

  try {
    const { data, error } = await supabaseClient.rpc("increment_like_count", {
      comment_id: comment.id,
    });
    if (error) {
      console.error("increment_like_count error", error);
      showToast("イイネ処理に失敗しました。");
      return;
    }

    comment.like_count = (comment.like_count || 0) + 1;
    thread.totalLikes = (thread.totalLikes || 0) + 1;

    cache[key] = true;
    localStorage.setItem(cacheKey, JSON.stringify(cache));

    showToast("(・∀・)ｲｲ!!しました。");
    renderThreads();
  } catch (e) {
    console.error("handleLikeClick exception", e);
    showToast("イイネ処理中にエラーが発生しました。");
  }
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

  if (state.replyState && state.replyState.anchorNo != null) {
    finalBody = ">>" + state.replyState.anchorNo + " " + finalBody;
  }

  let ownerName = info.name;
  let ownerTag = null;

  if (info.mode === "registered") {
    if (!info.name || !info.tag) {
      showToast("ユーザーデータベースに登録済みユーザー名＋パスを入力してください。");
      return;
    }
    const user = await fetchUserByNameAndTag(info.name, info.tag);
    if (!user) {
      showToast("ユーザーデータベースに登録されていません。");
      return;
    }
    state.userInfo.user = user;
    ownerName = user.name;
    ownerTag = user.tag;
  } else if (info.mode === "imposter") {
    ownerName = info.name || "名無し";
    ownerTag = null;
  } else {
    ownerName = info.name || "名無し";
    ownerTag = null;
  }

  const guestDailyId = getGuestDailyId();

  const imageLeft = state.draftImageUrls[0] || null;
  const imageRight = state.draftImageUrls[1] || null;

  const payload = {
    board_kind: BOARD_KIND,
    owner_name: ownerName,
    owner_tag: ownerTag,
    guest_daily_id: guestDailyId,
    body: finalBody,
    thread_title: null,
    parent_comment_id: state.replyState ? state.replyState.parentId : null,
    root_comment_id: state.replyState ? state.replyState.rootId : null,
    board_layout_id: state.draftBoardLayoutId,
    image_url: null,
    image_url_left: imageLeft,
    image_url_right: imageRight,
    is_recruit: false,
    recruit_level: null,
    expires_at: null,
  };

  if (!state.replyState) {
    payload.genre = getSelectedGenre();
  }

  dom.submitCommentBtn.disabled = true;
  dom.composerStatus.textContent = "投稿中...";

  try {
    const { error } = await supabaseClient
      .from("ld_board_comments")
      .insert(payload);
    if (error) {
      console.error("insert comment error", error);
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
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) return radios[i].value;
  }
  return "normal";
}

function resetComposer() {
  dom.commentBodyInput.value = "";
  clearReplyState();
  state.draftBoardLayoutId = null;
  state.draftImageUrls = [];
  updateAttachLabels();
}

/* =====================
 * 返信状態管理
 * ===================== */

function clearReplyState() {
  state.replyState = null;
  dom.replyInfoRow.classList.add("reply-info-row--hidden");
  dom.replyInfoText.textContent = "";
  dom.submitCommentBtn.textContent = "投稿する";
  if (dom.composerGenreRow) {
    dom.composerGenreRow.classList.remove("composer-row--genre-hidden");
  }
}

function ensureComposerOpen() {
  if (!dom.composerBody.classList.contains("footer-body--open")) {
    dom.composerBody.classList.add("footer-body--open");
    dom.composerToggleLabel.textContent =
      "▼コメントの入力ツールを非表示(タップ)";
  }
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
  dom.replyInfoText.textContent =
    "返信対象: " + name + " さん（No." + localNo + "）";
  dom.submitCommentBtn.textContent = "返信する";

  ensureComposerOpen();

  if (dom.composerGenreRow) {
    dom.composerGenreRow.classList.add("composer-row--genre-hidden");
  }

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
  if (!trimmed) {
    state.draftBoardLayoutId = null;
  } else {
    state.draftBoardLayoutId = trimmed;
  }
  updateAttachLabels();
}

function handleAttachImageClick() {
  if (!dom.imageFileInput) return;
  dom.imageFileInput.click();
}

async function handleImageFileChange(e) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  dom.composerStatus.textContent = "画像を処理中...";
  try {
    const urls = [];
    for (let i = 0; i < files.length && i < 2; i++) {
      const url = await compressAndUploadImage(files[i]);
      urls.push(url);
    }
    state.draftImageUrls = urls;
    updateAttachLabels();
  } catch (err) {
    console.error("image upload error", err);
    showToast("画像のアップロードに失敗しました。");
    state.draftImageUrls = [];
    updateAttachLabels();
  } finally {
    dom.composerStatus.textContent = "";
    dom.imageFileInput.value = "";
  }
}

function updateAttachLabels() {
  if (state.draftBoardLayoutId) {
    dom.attachedBoardLabel.textContent = "盤面ID: " + state.draftBoardLayoutId;
    dom.attachedBoardLabel.classList.remove("attach-chip--hidden");
    if (dom.clearBoardAttachBtn) {
      dom.clearBoardAttachBtn.classList.remove("attach-chip-remove-btn--hidden");
    }
  } else {
    dom.attachedBoardLabel.textContent = "";
    dom.attachedBoardLabel.classList.add("attach-chip--hidden");
    if (dom.clearBoardAttachBtn) {
      dom.clearBoardAttachBtn.classList.add("attach-chip-remove-btn--hidden");
    }
  }

  if (state.draftImageUrls.length > 0) {
    dom.attachedImageLabel.textContent =
      "画像添付: " + state.draftImageUrls.length + "枚";
    dom.attachedImageLabel.classList.remove("attach-chip--hidden");
    if (dom.clearImageAttachBtn) {
      dom.clearImageAttachBtn.classList.remove("attach-chip-remove-btn--hidden");
    }
  } else {
    dom.attachedImageLabel.textContent = "";
    dom.attachedImageLabel.classList.add("attach-chip--hidden");
    if (dom.clearImageAttachBtn) {
      dom.clearImageAttachBtn.classList.add("attach-chip-remove-btn--hidden");
    }
  }
}

/* 画像圧縮＋アップロード */

function compressAndUploadImage(file) {
  const MAX_SIZE = 1024;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            try {
              const ext = "jpg";
              const fileName = `board_img_${Date.now()}_${Math.random()
                .toString(16)
                .slice(2)}.${ext}`;
              const { data, error } = await supabaseClient.storage
                .from("ld_board_images")
                .upload(fileName, blob, {
                  contentType: "image/jpeg",
                });
              if (error) {
                console.error("supabase upload error", error);
                reject(error);
                return;
              }

              const {
                data: publicUrlData,
                error: publicUrlError,
              } = supabaseClient.storage
                .from("ld_board_images")
                .getPublicUrl(data.path);

              if (publicUrlError) {
                reject(publicUrlError);
                return;
              }

              resolve(publicUrlData.publicUrl);
            } catch (e) {
              reject(e);
            } finally {
              URL.revokeObjectURL(url);
            }
          },
          "image/jpeg",
          0.85
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました。"));
    };
    img.src = url;
  });
}

/* =====================
 * オートフィックス（誤字修正）
 * ===================== */

function applyAutofix(text) {
  const words = state.autofixWords || [];
  let result = text;
  for (const w of words) {
    if (!w.before || !w.after) continue;
    const re = new RegExp(w.before, "g");
    result = result.replace(re, w.after);
  }
  return result;
}

state.autofixWords = [];

async function loadAutofixWords() {
  const { data, error } = await supabaseClient
    .from("ld_board_autofix_words")
    .select("*");
  if (error) {
    console.error("loadAutofixWords error", error);
    return;
  }
  state.autofixWords = data || [];
}

loadAutofixWords().catch((e) => console.error(e));

/* =====================
 * ユーザーデータベース連携
 * ===================== */

async function fetchUserByNameAndTag(name, tag) {
  const { data, error } = await supabaseClient
    .from("ld_users")
    .select("*")
    .eq("name", name)
    .eq("tag", tag)
    .maybeSingle();
  if (error) {
    console.error("fetchUserByNameAndTag error", error);
    showToast("ユーザー情報の取得に失敗しました。");
    return null;
  }
  if (!data) return null;
  return data;
}

async function incrementUserMisInput(userRow) {
  try {
    const mis = (userRow.mis_input_count || 0) + 1;
    const { error } = await supabaseClient
      .from("ld_users")
      .update({ mis_input_count: mis })
      .eq("id", userRow.id);
    if (error) {
      console.error("update mis_input_count error", error);
    } else {
      userRow.mis_input_count = mis;
    }
  } catch (e) {
    console.error("incrementUserMisInput exception", e);
  }
}

/* =====================
 * ゲストID（日替わり）
 * ===================== */

function getGuestDailyId() {
  try {
    const key = "ld_board_guest_id";
    const raw = localStorage.getItem(key);
    const today = new Date();
    const dstr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj.date === dstr && obj.id) {
        return obj.id;
      }
    }
    const id = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    localStorage.setItem(key, JSON.stringify({ date: dstr, id }));
    return id;
  } catch (e) {
    console.error("getGuestDailyId error", e);
    return "????";
  }
}
