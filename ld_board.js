import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Supabase 接続設定 */
const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BOARD_KIND = "info";
const IMAGE_BUCKET = "ld_board_images";

/** アプリ状態 */
const state = {
  users: [],
  autofixRules: [],

  threads: [],
  hasMoreParents: true,
  isLoadingParents: false,
  oldestParentCreatedAt: null,
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

window.addEventListener("DOMContentLoaded", async function () {
  cacheDom();
  setupBasicHandlers();
  initModalsHidden();
  loadGuestId();
  loadLikeCache();
  loadUserInputsFromLocalStorage();
  updateNameTagEnabled();
  updateUserStatusLabel();

  await Promise.all([loadUsers(), loadAutofixRules()]);
  await loadInitialThreads();
});

function cacheDom() {
  dom.userNameInput = $("userNameInput");
  dom.userTagInput = $("userTagInput");
  dom.userStatusLabel = $("userStatusLabel");

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

  dom.threadsContainer = $("threadsContainer");
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
  dom.attachedImageLabel = $("attachedImageLabel");
  dom.clearBoardAttachBtn = $("clearBoardAttachBtn");
  dom.clearImageAttachBtn = $("clearImageAttachBtn");
  dom.imageFileInput = $("imageFileInput");
  dom.submitCommentBtn = $("submitCommentBtn");
  dom.composerStatus = $("composerStatus");

  dom.imageModal = $("imageModal");
  dom.modalImage = $("modalImage");
  dom.gearModal = $("gearModal");
  dom.gearModalBody = $("gearModalBody");
  dom.profileModal = $("profileModal");
  dom.profileModalBody = $("profileModalBody");

  dom.toastContainer = $("toastContainer");
}

function setupBasicHandlers() {
  dom.filterToggleBtn.addEventListener("click", function () {
    const collapsed = dom.filterPanel.classList.toggle("filter-panel--collapsed");
    dom.filterToggleBtn.textContent = collapsed ? "🔍 フィルターを開く" : "🔍 フィルターを閉じる";
  });

  dom.userNameInput.addEventListener("input", function () {
    updateNameTagEnabled();
    saveUserInputsToLocalStorage();
    updateUserStatusLabel();
  });
  dom.userTagInput.addEventListener("input", function () {
    if (dom.userTagInput.value.length > 10) {
      dom.userTagInput.value = dom.userTagInput.value.slice(0, 10);
    }
    saveUserInputsToLocalStorage();
    updateUserStatusLabel();
  });

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
  filterElems.forEach(function (el) {
    el.addEventListener("input", handleFilterChange);
    el.addEventListener("change", handleFilterChange);
  });

  dom.loadMoreBtn.addEventListener("click", function () {
    loadMoreThreads();
  });

  dom.footerToggle.addEventListener("click", function () {
    const opened = dom.composerBody.classList.toggle("footer-body--open");
    dom.composerToggleLabel.textContent = opened
      ? "▼コメントの入力ツールを非表示(タップ)"
      : "▲コメントの入力ツールを表示(タップ)";
  });

  dom.cancelReplyBtn.addEventListener("click", function () {
    clearReplyState();
  });

  dom.attachBoardBtn.addEventListener("click", handleAttachBoardClick);
  dom.attachImageBtn.addEventListener("click", handleAttachImageClick);
  dom.clearBoardAttachBtn.addEventListener("click", function () {
    state.draftBoardLayoutId = null;
    updateAttachLabels();
  });
  dom.clearImageAttachBtn.addEventListener("click", function () {
    state.draftImageUrls = [];
    dom.imageFileInput.value = "";
    updateAttachLabels();
  });
  dom.imageFileInput.addEventListener("change", handleImageFileChange);

  dom.submitCommentBtn.addEventListener("click", handleSubmit);

  document.addEventListener("click", function (e) {
    const closeTarget = e.target.getAttribute("data-modal-close");
    if (closeTarget) {
      hideModal(closeTarget);
      return;
    }

    const anchor = e.target.closest("a.anchor-link");
    if (anchor) {
      e.preventDefault();
      const noStr = anchor.getAttribute("data-anchor-no");
      const no = parseInt(noStr, 10);
      if (!no || isNaN(no)) return;
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

  [dom.imageModal, dom.gearModal, dom.profileModal].forEach(function (modalEl) {
    if (!modalEl) return;
    modalEl.addEventListener("click", function (e) {
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
  [dom.imageModal, dom.gearModal, dom.profileModal].forEach(function (el) {
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
    const result = await supabase
      .from("ld_users")
      .select("id, name, tag, mis_input_count, vault_level, mythic_state")
      .order("name", { ascending: true });

    if (result.error) {
      console.error("ld_users fetch error", result.error);
      state.users = [];
      return;
    }
    state.users = result.data || [];
  } catch (e) {
    console.error("ld_users fetch error", e);
    state.users = [];
  }
}

async function loadAutofixRules() {
  try {
    const result = await supabase
      .from("ld_board_autofix_words")
      .select("pattern, replacement")
      .order("id", { ascending: true });

    if (result.error) {
      console.warn("autofix load error", result.error.message);
      state.autofixRules = [];
      return;
    }
    state.autofixRules = result.data || [];
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
  state.hasDoneInitialScroll = false;
  dom.threadsContainer.innerHTML = "";
  dom.loadMoreStatus.textContent = "";
  await loadMoreThreads();
}

async function loadMoreThreads() {
  if (!state.hasMoreParents || state.isLoadingParents) return;

  state.isLoadingParents = true;
  dom.loadMoreBtn.disabled = true;
  dom.loadMoreStatus.textContent = "読み込み中...";

  const prevScrollY = window.scrollY;
  const prevHeight = document.body.scrollHeight;
  const hadOldest = state.oldestParentCreatedAt !== null;

  try {
    let query = supabase
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", BOARD_KIND)
      .is("parent_comment_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(state.pageSize);

    if (state.oldestParentCreatedAt) {
      query = query.lt("created_at", state.oldestParentCreatedAt);
    }

    const parentsResult = await query;
    if (parentsResult.error) {
      console.error("load parents error", parentsResult.error);
      showToast("コメントの読み込みに失敗しました。");
      return;
    }
    const parents = parentsResult.data;
    if (!parents || parents.length === 0) {
      state.hasMoreParents = false;
      dom.loadMoreStatus.textContent = "これ以上古いコメントはありません。";
      return;
    }

    const minCreated = parents[parents.length - 1].created_at;
    state.oldestParentCreatedAt = minCreated;

    const parentIds = parents.map(function (p) {
      return p.id;
    });

    const childrenResult = await supabase
      .from("ld_board_comments")
      .select("*")
      .eq("board_kind", BOARD_KIND)
      .in("root_comment_id", parentIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (childrenResult.error) {
      console.error("load children error", childrenResult.error);
      showToast("子コメントの読み込みに失敗しました。");
      return;
    }

    const children = childrenResult.data || [];
    const threads = buildThreadsFromRaw(parents, children);
    state.threads = state.threads.concat(threads);

    applyFiltersAndRender();

    // スクロール補正
    if (!hadOldest && !state.hasDoneInitialScroll) {
      state.hasDoneInitialScroll = true;
      setTimeout(scrollLatestThreadToCenter, 0);
    } else if (hadOldest) {
      const newHeight = document.body.scrollHeight;
      const delta = newHeight - prevHeight;
      window.scrollTo(0, prevScrollY + delta);
    }
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

function buildThreadsFromRaw(parents, children) {
  const byRoot = new Map();

  children.forEach(function (c) {
    if (!c.parent_comment_id) return;
    const rootId = c.root_comment_id || c.parent_comment_id;
    if (!rootId) return;
    if (!byRoot.has(rootId)) byRoot.set(rootId, []);
    byRoot.get(rootId).push(c);
  });

  const threads = parents.map(function (p) {
    const rootId = p.id;
    let childrenList = byRoot.get(rootId) || [];
    childrenList = childrenList.filter(function (c) {
      return c.id !== p.id;
    });
    childrenList.sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });

    const allComments = [p].concat(childrenList);
    let latest = null;
    allComments.forEach(function (c) {
      if (!latest || new Date(c.created_at) > new Date(latest.created_at)) {
        latest = c;
      }
    });

    const totalLikes = allComments.reduce(function (sum, c) {
      return sum + (c.like_count || 0);
    }, 0);

    return {
      rootId: rootId,
      parent: p,
      children: childrenList,
      allComments: allComments,
      latest: latest,
      totalLikes: totalLikes,
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
    fetchLastOwnCommentTime().then(function () {
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
    const result = await supabase
      .from("ld_board_comments")
      .select("created_at")
      .eq("board_kind", BOARD_KIND)
      .eq("owner_name", info.name)
      .eq("owner_tag", info.tag)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (result.error) {
      console.error("fetchLastOwnCommentTime error", result.error);
      state.lastOwnCommentTime = null;
      return;
    }
    if (result.data && result.data.length > 0) {
      state.lastOwnCommentTime = result.data[0].created_at;
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
  const keyword = state.filters.keyword.trim().toLowerCase();
  const hasKeyword = keyword.length > 0 && anyFilterTargetSelected();
  const t = state.filters.targets;

  if (hasKeyword) {
    const targets = [];
    if (t.body) targets.push("本文");
    if (t.title) targets.push("タイトル");
    if (t.user) targets.push("ユーザー名");
    parts.push('"' + keyword + '" in ' + targets.join("・"));
  }

  const g = state.filters.genres;
  const selGenres = [];
  if (g.normal) selGenres.push("通常");
  if (g.qa) selGenres.push("質問・相談");
  if (g.report) selGenres.push("報告");
  if (g.announce) selGenres.push("アナウンス");
  if (selGenres.length !== 4) {
    parts.push("ジャンル: " + selGenres.join("・"));
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
  const hasKeyword = keyword.length > 0 && anyFilterTargetSelected();

  const genres = state.filters.genres;
  const sinceMyLast = state.filters.sinceMyLast;
  const hasAttachmentOnly = state.filters.hasAttachment;

  const lastOwnTime = state.lastOwnCommentTime ? new Date(state.lastOwnCommentTime).getTime() : null;

  const filtered = state.threads.filter(function (thread) {
    const parent = thread.parent;

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

    if (sinceMyLast && lastOwnTime !== null) {
      const latestTime = new Date(thread.latest.created_at).getTime();
      if (latestTime < lastOwnTime) return false;
    }

    if (hasAttachmentOnly) {
      const hasAttach = thread.allComments.some(function (c) {
        return c.board_layout_id || c.image_url || c.image_url_left || c.image_url_right;
      });
      if (!hasAttach) return false;
    }

    if (hasKeyword) {
      let hit = false;

      if (state.filters.targets.body && !hit) {
        for (let i = 0; i < thread.allComments.length; i++) {
          const c = thread.allComments[i];
          if (c.body && c.body.toLowerCase().indexOf(keyword) !== -1) {
            hit = true;
            break;
          }
        }
      }

      if (state.filters.targets.title && !hit) {
        const title = parent.thread_title || "";
        if (title.toLowerCase().indexOf(keyword) !== -1) hit = true;
      }

      if (state.filters.targets.user && !hit) {
        const name = parent.owner_name || "";
        if (name.toLowerCase().indexOf(keyword) !== -1) hit = true;
      }

      if (!hit) return false;
    }

    return true;
  });

  // タイムライン：古い → 新しい（最新が一番下）
  filtered.sort(function (a, b) {
    return new Date(a.latest.created_at) - new Date(b.latest.created_at);
  });

  renderThreads(filtered);
}

/* =====================
 * レンダリング
 * ===================== */

function renderThreads(threads) {
  dom.threadsContainer.innerHTML = "";
  threads.forEach(function (thread) {
    const card = renderThreadCard(thread);
    dom.threadsContainer.appendChild(card);
  });
}

function renderThreadCard(thread) {
  const parent = thread.parent;
  const children = thread.children;
  const totalLikes = thread.totalLikes;

  const card = document.createElement("article");
  card.className = "thread-card";
  if (children.length > 0) {
    card.classList.add("thread-card--thread");
  }
  card.dataset.threadId = thread.rootId;

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

    if (parent.thread_title && totalLikes > 0) {
      rightBox.textContent = "(・∀・)ｲｲ!!合計: " + totalLikes;
    } else {
      rightBox.textContent = "";
    }

    titleRow.appendChild(rightBox);
    card.appendChild(titleRow);
  }

  const parentBlock = renderCommentBlock({
    thread: thread,
    comment: parent,
    isParent: true,
    localNo: children.length > 0 ? 1 : null,
    forceNoNumber: children.length === 0,
  });
  card.appendChild(parentBlock);

  const childCount = children.length;
  if (childCount > 0) {
    const childrenHeader = document.createElement("div");
    childrenHeader.className = "children-header-row";

    const toggleSpan = document.createElement("span");
    toggleSpan.className = "children-toggle";
    toggleSpan.textContent = "▼子コメント(全" + childCount + "件)を開く";

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
          thread: thread,
          comment: last,
          isParent: false,
          forceNoNumber: true,
        });
        childrenContainer.appendChild(block);
        toggleSpan.textContent = "▼子コメント(全" + childCount + "件)を開く";
      } else {
        const all = [thread.parent].concat(thread.children);
        all.forEach(function (c, index) {
          if (index === 0) return;
          const block = renderCommentBlock({
            thread: thread,
            comment: c,
            isParent: false,
            localNo: index + 1,
            forceNoNumber: false,
          });
          childrenContainer.appendChild(block);
        });
        toggleSpan.textContent = "▲子コメント(全" + childCount + "件)を閉じる";
      }
    }

    toggleSpan.addEventListener("click", function () {
      isExpanded = !isExpanded;
      updateChildrenView();
    });

    updateChildrenView();
  }

  return card;
}

function renderCommentBlock(options) {
  const thread = options.thread;
  const comment = options.comment;
  const localNo = options.localNo;
  const forceNoNumber = options.forceNoNumber;

  const block = document.createElement("div");
  block.className = "comment-block";
  block.dataset.commentId = comment.id;

  const metaRow = document.createElement("div");
  metaRow.className = "comment-meta-row";
  metaRow.dataset.commentId = comment.id;

  // 番号
  const noSpan = document.createElement("span");
  noSpan.className = "comment-no";
  if (!forceNoNumber && localNo != null) {
    noSpan.textContent = localNo + ":";
  } else {
    noSpan.textContent = "";
  }
  metaRow.appendChild(noSpan);

  // 名前
  const nameSpan = document.createElement("span");
  nameSpan.className = "comment-name";
  const nameDisplay = getDisplayNameForComment(comment);
  nameSpan.textContent = nameDisplay.text;
  if (nameDisplay.className && nameDisplay.className.trim()) {
    nameSpan.className += " " + nameDisplay.className.trim();
  }
  metaRow.appendChild(nameSpan);

  // プロフボタン
  const profBtn = document.createElement("button");
  profBtn.className = "comment-prof-link";
  profBtn.textContent = "プロフ";
  if (nameDisplay.showProfile) {
    profBtn.style.display = "inline-block";
    profBtn.addEventListener("click", function () {
      openUserProfile(nameDisplay.userName, nameDisplay.userTag);
    });
  } else {
    profBtn.style.display = "none";
  }
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
    likeSpan.textContent = "(・∀・)ｲｲ!!: " + comment.like_count;
  } else {
    likeSpan.textContent = "";
  }
  metaRow.appendChild(likeSpan);

  // 歯車
  const gearBtn = document.createElement("button");
  gearBtn.className = "comment-gear-btn";
  gearBtn.type = "button";
  gearBtn.textContent = "⚙";
  gearBtn.addEventListener("click", function () {
    openGearModal(comment, thread);
  });
  metaRow.appendChild(gearBtn);

  block.appendChild(metaRow);

  // 本文
  const bodyEl = document.createElement("div");
  bodyEl.className = "comment-body";
  bodyEl.innerHTML = convertAnchorsToLinks(escapeHtml(comment.body || ""));
  block.appendChild(bodyEl);

  // 添付（盤面・画像）
  if (comment.board_layout_id || comment.image_url || comment.image_url_left || comment.image_url_right) {
    const attachRow = document.createElement("div");
    attachRow.className = "comment-attachments";

    if (comment.board_layout_id) {
      const boardBtn = document.createElement("button");
      boardBtn.className = "attachment-pill";
      boardBtn.type = "button";
      boardBtn.textContent = "盤面を開く";
      boardBtn.addEventListener("click", function () {
        openBoardLayout(comment.board_layout_id);
      });
      attachRow.appendChild(boardBtn);
    }

    const thumbUrls = [];
    if (comment.image_url_left) thumbUrls.push(comment.image_url_left);
    if (comment.image_url_right) thumbUrls.push(comment.image_url_right);
    if (thumbUrls.length === 0 && comment.image_url) thumbUrls.push(comment.image_url);

    thumbUrls.slice(0, 2).forEach(function (url) {
      const img = document.createElement("img");
      img.className = "thumb-image";
      img.src = url;
      img.alt = "添付画像";
      img.addEventListener("click", function () {
        openImageModal(url);
      });
      attachRow.appendChild(img);
    });

    block.appendChild(attachRow);
  }

  // 本文フッター（折りたたみ＋返信/イイ）
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
  replyLink.addEventListener("click", function () {
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
  likeLink.addEventListener("click", function () {
    handleLike(comment);
  });

  actions.appendChild(replyLink);
  actions.appendChild(likeLink);
  footerRow.appendChild(actions);

  block.appendChild(footerRow);

  initBodyCollapse(bodyEl, toggleEl);

  return block;
}

function initBodyCollapse(bodyEl, toggleEl) {
  toggleEl.style.display = "none";

  window.requestAnimationFrame(function () {
    const style = window.getComputedStyle(bodyEl);
    const lineHeight = parseFloat(style.lineHeight) || 16;
    const lines = Math.round(bodyEl.scrollHeight / lineHeight);

    if (lines <= 3) {
      bodyEl.classList.remove("collapsible");
      bodyEl.classList.remove("collapsed");
      toggleEl.style.display = "none";
      return;
    }

    bodyEl.classList.add("collapsible");
    bodyEl.classList.add("collapsed");
    toggleEl.style.display = "inline";
    let isCollapsed = true;
    toggleEl.textContent = "▼長文表示(タップ)";
    toggleEl.addEventListener("click", function () {
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
    base.text = "名無しの傭兵員 " + guestId;
    return base;
  }

  const user = state.users.find(function (u) {
    return u.name === ownerName;
  });

  if (ownerTag && user && user.tag === ownerTag) {
    base.text = "★" + ownerName;
    base.className = "registered";
    base.showProfile = true;
    return base;
  }

  if (!ownerTag && user) {
    base.text = ownerName + "(騙りw " + guestId + ")";
    base.className = "imposter";
    base.showProfile = false;
    return base;
  }

  base.text = ownerName + " " + guestId;
  return base;
}

async function openUserProfile(name, tag) {
  if (!name) {
    showToast("ユーザー名が不明です");
    return;
  }

  const body = dom.profileModalBody;
  body.innerHTML = "";

  try {
    let query = supabase.from("ld_users").select("name, tag, vault_level, mythic_state").eq("name", name);
    if (tag) query = query.eq("tag", tag);
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const text = document.createElement("div");
      text.className = "profile-meta";
      text.textContent = "このユーザーはまだユーザーデータベースに登録されていません。";
      body.appendChild(text);
      showModalElement(dom.profileModal);
      return;
    }

    const meta = document.createElement("div");
    meta.className = "profile-meta";
    meta.textContent = "★" + data.name + " / 金庫Lv" + (data.vault_level || "?");
    body.appendChild(meta);

    const note = document.createElement("div");
    note.className = "profile-note";
    note.textContent = "所持している神話ユニット（Lv・専用👑の有無）";
    body.appendChild(note);

    const mythicState = data.mythic_state || {};
    const ids = Object.keys(mythicState).sort(function (a, b) {
      return Number(a) - Number(b);
    });

    if (!ids.length) {
      const t = document.createElement("div");
      t.className = "profile-note";
      t.textContent = "神話ユニットの登録はまだありません。";
      body.appendChild(t);
    } else {
      const grid = document.createElement("div");
      grid.className = "profile-grid";
      ids.forEach(function (id) {
        const info = mythicState[id] || {};
        const cell = document.createElement("div");
        cell.className = "profile-unit";
        const crown = info.treasure ? "👑" : "";
        cell.textContent = id.slice(-2) + crown;
        cell.title = "ID:" + id + " Lv" + (info.level || "?") + " " + (info.form || "");
        grid.appendChild(cell);
      });
      body.appendChild(grid);
    }

    showModalElement(dom.profileModal);
  } catch (e) {
    console.error("openUserProfile error", e);
    const text = document.createElement("div");
    text.className = "profile-meta";
    text.textContent = "プロフィール情報の取得に失敗しました。";
    body.appendChild(text);
    showModalElement(dom.profileModal);
  }
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

  const user = state.users.find(function (u) {
    return u.name === name;
  });

  if (!user) {
    return {
      mode: "unregistered",
      label: "「" + name + "」として投稿",
      isRegistered: false,
      name: name,
      tag: tag,
    };
  }

  if (tag && tag === user.tag) {
    return {
      mode: "registered",
      label: "「" + name + "」として投稿",
      isRegistered: true,
      name: name,
      tag: tag,
      user: user,
    };
  }

  return {
    mode: "imposter",
    label: "「" + name + "」として投稿",
    isRegistered: false,
    name: name,
    tag: tag,
    user: user,
  };
}

function updateUserStatusLabel() {
  const info = getCurrentUserInfo();
  dom.userStatusLabel.textContent = info.label;
}

function updateNameTagEnabled() {
  const hasName = dom.userNameInput.value.trim().length > 0;
  if (!hasName) {
    dom.userTagInput.value = "";
    dom.userTagInput.disabled = true;
  } else {
    dom.userTagInput.disabled = false;
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

  let genre = getSelectedGenre();
  if (state.replyState && state.replyState.genre) {
    genre = state.replyState.genre;
  }

  let ownerName = info.name;
  let ownerTag = null;
  if (!ownerName) ownerName = "名無し";
  if (info.mode === "registered" && info.user && info.user.tag) {
    ownerTag = info.user.tag;
  }

  const guestDailyId = getGuestDailyId();

  const imageLeft = state.draftImageUrls[0] || null;
  const imageRight = state.draftImageUrls[1] || null;

  const payload = {
    board_kind: BOARD_KIND,
    genre: genre,
    owner_name: ownerName,
    owner_tag: ownerTag,
    guest_daily_id: guestDailyId,
    guest_device_id: state.guestId,
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

  dom.submitCommentBtn.disabled = true;
  dom.composerStatus.textContent = "投稿中...";

  try {
    const insertResult = await supabase.from("ld_board_comments").insert(payload).single();
    if (insertResult.error) {
      console.error("insert error", insertResult.error);
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

function applyAutofix(text) {
  if (!text || state.autofixRules.length === 0) return text;
  let result = text;
  state.autofixRules.forEach(function (rule) {
    if (!rule.pattern) return;
    const pattern = rule.pattern;
    const replacement = rule.replacement || "";
    result = result.split(pattern).join(replacement);
  });
  return result;
}

async function incrementUserMisInput(user) {
  const current = user.mis_input_count || 0;
  const next = current + 1;
  user.mis_input_count = next;
  try {
    const result = await supabase
      .from("ld_users")
      .update({ mis_input_count: next })
      .eq("id", user.id);
    if (result.error) {
      console.error("update mis_input_count error", result.error);
    }
  } catch (e) {
    console.error("update mis_input_count error", e);
  }
}

function resetComposer() {
  dom.commentBodyInput.value = "";
  clearReplyState();
  state.draftBoardLayoutId = null;
  state.draftImageUrls = [];
  updateAttachLabels();
}

function clearReplyState() {
  state.replyState = null;
  dom.replyInfoRow.classList.add("reply-info-row--hidden");
  dom.replyInfoText.textContent = "";
  dom.submitCommentBtn.textContent = "投稿する";
  if (dom.composerGenreRow) dom.composerGenreRow.classList.remove("composer-row--genre-hidden");
  if (dom.composerGenreRow) {
    dom.composerGenreRow.classList.remove("composer-row--genre-hidden");
  }
}

function startReply(thread, comment, localNo) {
  const parentGenre =
    thread && thread.parent && thread.parent.genre
      ? String(thread.parent.genre).toLowerCase()
      : "normal";

  state.replyState = {
    threadId: thread.rootId,
    parentId: comment.id,
    rootId: thread.rootId,
    anchorNo: localNo,
    ownerName: comment.owner_name || "",
    genre: parentGenre,
  };
  dom.replyInfoRow.classList.remove("reply-info-row--hidden");
  const name = comment.owner_name || "名無し";
  dom.replyInfoText.textContent = "返信対象: " + name + " さん（No." + localNo + "）";
  dom.submitCommentBtn.textContent = "返信する";
  if (dom.composerGenreRow) dom.composerGenreRow.classList.add("composer-row--genre-hidden");
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
  state.draftBoardLayoutId = trimmed || null;
  updateAttachLabels();
}

function handleAttachImageClick() {
  dom.imageFileInput.click();
}

async function handleImageFileChange(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const limited = files.slice(0, 2);

  dom.composerStatus.textContent = "画像をアップロード中...";
  state.draftImageUrls = [];

  try {
    const urls = [];
    for (let i = 0; i < limited.length; i++) {
      const url = await compressAndUploadImage(limited[i]);
      urls.push(url);
    }
    state.draftImageUrls = urls;
    updateAttachLabels();
    showToast("画像を添付しました。");
  } catch (err) {
    console.error("img upload error", err);
    showToast("画像のアップロードに失敗しました。");
    state.draftImageUrls = [];
    updateAttachLabels();
  } finally {
    dom.composerStatus.textContent = "";
    dom.imageFileInput.value = "";
  }
}

function updateAttachLabels() {
  // 盤面ID（未実装だが表示は維持）
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

  // 画像添付
  if (state.draftImageUrls.length > 0) {
    dom.attachedImageLabel.textContent = "画像添付: " + state.draftImageUrls.length + "枚";
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
  const maxSize = 1024; // ピクセル
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = async function () {
        try {
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxSize) {
            h = Math.round(h * (maxSize / w));
            w = maxSize;
          } else if (h >= w && h > maxSize) {
            w = Math.round(w * (maxSize / h));
            h = maxSize;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            async function (blob) {
              try {
                if (!blob) throw new Error("画像の圧縮に失敗しました");
                const fileExt = "jpg";
                const fileName =
                  Date.now().toString() +
                  "_" +
                  Math.random().toString(36).slice(2) +
                  "." +
                  fileExt;
                const filePath = fileName;
                const { error } = await supabase.storage
                  .from(IMAGE_BUCKET)
                  .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });
                if (error) throw error;
                const { data: publicData } = supabase.storage
                  .from(IMAGE_BUCKET)
                  .getPublicUrl(filePath);
                if (!publicData || !publicData.publicUrl) {
                  throw new Error("画像URLの取得に失敗しました");
                }
                resolve(publicData.publicUrl);
              } catch (err) {
                reject(err);
              }
            },
            "image/jpeg",
            0.8
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () {
        reject(new Error("画像の読み込みに失敗しました"));
      };
      img.src = e.target.result;
    };
    reader.onerror = function () {
      reject(new Error("画像ファイルの読み込みに失敗しました"));
    };
    reader.readAsDataURL(file);
  });
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
    const result = await supabase.rpc("increment_like_count", { comment_id: id });
    if (result.error) {
      console.error("like rpc error", result.error);
      showToast("イイネに失敗しました。");
      return;
    }
    state.likeCache.add(key);
    saveLikeCache();
    showToast("(・∀・)ｲｲ!! しました。");

    const thread = state.threads.find(function (t) {
      return t.allComments.some(function (c) {
        return c.id === id;
      });
    });
    if (thread) {
      const target = thread.allComments.find(function (c) {
        return c.id === id;
      });
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
  const url =
    "ld_board_editor_drag_v5.html?layout_id=" +
    encodeURIComponent(boardLayoutId) +
    "&mode=view";
  window.open(url, "_blank");
}

/* =====================
 * 歯車メニュー
 * ===================== */

function openGearModal(comment, thread) {
  renderGearModalContent(comment, thread);
  showModalElement(dom.gearModal);
}

function renderGearModalContent(comment, thread) {
  const isParent = comment.id === thread.parent.id;

  const wrapper = document.createElement("div");

  if (isParent) {
    const secTitle = document.createElement("div");
    secTitle.className = "gear-section-title";
    secTitle.textContent = "スレッドタイトル";
    const sec1 = document.createElement("div");
    sec1.className = "gear-section";
    sec1.appendChild(secTitle);

    const row1 = document.createElement("div");
    row1.className = "gear-row";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 20;
    input.placeholder = "タイトル（20文字まで）";
    input.value = thread.parent.thread_title || "";
    row1.appendChild(input);
    sec1.appendChild(row1);

    const actions1 = document.createElement("div");
    actions1.className = "gear-actions";
    const saveBtn = document.createElement("button");
    saveBtn.className = "primary";
    saveBtn.textContent = thread.parent.thread_title ? "タイトルを更新" : "タイトルを作成";
    saveBtn.addEventListener("click", function () {
      const v = input.value.trim();
      updateThreadTitle(thread, v);
    });
    actions1.appendChild(saveBtn);
    sec1.appendChild(actions1);

    wrapper.appendChild(sec1);
  }

  const sec2 = document.createElement("div");
  sec2.className = "gear-section";
  const title2 = document.createElement("div");
  title2.className = "gear-section-title";
  title2.textContent = "コメントのジャンル";
  sec2.appendChild(title2);

  const row2 = document.createElement("div");
  row2.className = "gear-row";
  const select = document.createElement("select");
  const genres = [
    { value: "normal", label: "通常" },
    { value: "qa", label: "質問・相談" },
    { value: "report", label: "報告" },
    { value: "announce", label: "アナウンス" },
  ];
  const currentGenre = (thread.parent.genre || "normal").toLowerCase();
  genres.forEach(function (g) {
    const opt = document.createElement("option");
    opt.value = g.value;
    opt.textContent = g.label;
    if (g.value === currentGenre) opt.selected = true;
    select.appendChild(opt);
  });
  row2.appendChild(select);
  sec2.appendChild(row2);

  const actions2 = document.createElement("div");
  actions2.className = "gear-actions";
  const genreBtn = document.createElement("button");
  genreBtn.className = "primary";
  genreBtn.textContent = isParent
    ? "スレッド全体のジャンルを変更"
    : "このコメントの属するスレッドのジャンルを変更";
  genreBtn.addEventListener("click", function () {
    updateCommentGenre(thread, select.value);
  });
  actions2.appendChild(genreBtn);
  sec2.appendChild(actions2);
  wrapper.appendChild(sec2);

  const sec3 = document.createElement("div");
  sec3.className = "gear-section";
  const title3 = document.createElement("div");
  title3.className = "gear-section-title";
  title3.textContent = "削除／非表示";
  sec3.appendChild(title3);

  const actions3 = document.createElement("div");
  actions3.className = "gear-actions";

  const hideBtn = document.createElement("button");
  hideBtn.className = "danger";
  hideBtn.textContent = isParent ? "スレッド（親＋子）を非表示" : "このコメントを非表示";
  hideBtn.addEventListener("click", function () {
    hideComment(comment, thread, false);
  });

  const delBtn = document.createElement("button");
  delBtn.className = "danger";
  delBtn.textContent = isParent ? "スレッド（親＋子）を完全削除" : "このコメントを完全削除";
  delBtn.addEventListener("click", function () {
    hideComment(comment, thread, true);
  });

  actions3.appendChild(hideBtn);
  actions3.appendChild(delBtn);
  sec3.appendChild(actions3);
  wrapper.appendChild(sec3);

  const sec4 = document.createElement("div");
  sec4.className = "gear-section";
  const title4 = document.createElement("div");
  title4.className = "gear-section-title";
  title4.textContent = "コメントへの追記";
  sec4.appendChild(title4);

  const row4 = document.createElement("div");
  row4.className = "gear-row";
  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.placeholder = "追記内容を入力";
  row4.appendChild(textarea);
  sec4.appendChild(row4);

  const actions4 = document.createElement("div");
  actions4.className = "gear-actions";
  const appendBtn = document.createElement("button");
  appendBtn.className = "primary";
  appendBtn.textContent = "追記を追加";
  appendBtn.addEventListener("click", function () {
    const text = textarea.value.trim();
    if (!text) {
      showToast("追記内容を入力してください。");
      return;
    }
    appendToComment(comment, text);
  });
  actions4.appendChild(appendBtn);
  sec4.appendChild(actions4);
  wrapper.appendChild(sec4);

  const sec5 = document.createElement("div");
  sec5.className = "gear-section";
  const title5 = document.createElement("div");
  title5.className = "gear-section-title";
  title5.textContent = "攻略wikiへの推薦（将来機能）";
  sec5.appendChild(title5);

  const row5 = document.createElement("div");
  row5.className = "gear-row";
  const select2 = document.createElement("select");
  const dummyPages = [
    { value: "", label: "選択してください（ダミー）" },
    { value: "unit_tips", label: "ユニット個別ページ" },
    { value: "strategy_general", label: "攻略の手引き（全般）" },
  ];
  dummyPages.forEach(function (p) {
    const opt = document.createElement("option");
    opt.value = p.value;
    opt.textContent = p.label;
    select2.appendChild(opt);
  });
  row5.appendChild(select2);
  sec5.appendChild(row5);

  const actions5 = document.createElement("div");
  actions5.className = "gear-actions";
  const recommendBtn = document.createElement("button");
  recommendBtn.className = "primary";
  recommendBtn.textContent = "選択ページへ推薦";
  recommendBtn.addEventListener("click", function () {
    showToast("推薦機能はまだ未実装です（UIのみ）");
  });
  actions5.appendChild(recommendBtn);
  sec5.appendChild(actions5);
  wrapper.appendChild(sec5);

  dom.gearModalBody.innerHTML = "";
  dom.gearModalBody.appendChild(wrapper);
}

async function updateThreadTitle(thread, newTitle) {
  const title = newTitle.trim().slice(0, 20);
  try {
    const result = await supabase
      .from("ld_board_comments")
      .update({ thread_title: title || null })
      .eq("id", thread.parent.id);
    if (result.error) {
      console.error("updateThreadTitle error", result.error);
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
    const result = await supabase
      .from("ld_board_comments")
      .update({ genre: newGenre })
      .eq("root_comment_id", thread.rootId)
      .or("id.eq." + thread.rootId);
    if (result.error) {
      console.error("updateCommentGenre error", result.error);
      showToast("ジャンル変更に失敗しました。");
      return;
    }
    thread.parent.genre = newGenre;
    thread.allComments.forEach(function (c) {
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
  let confirmText;
  if (hardDelete) {
    confirmText = isParent
      ? "このスレッド（親＋子）を完全削除します。よろしいですか？"
      : "このコメントを完全削除します。よろしいですか？";
  } else {
    confirmText = isParent
      ? "このスレッド（親＋子）を非表示にします。よろしいですか？"
      : "このコメントを非表示にします。よろしいですか？";
  }

  if (!window.confirm(confirmText)) return;

  try {
    if (hardDelete) {
      const idsDel = isParent
        ? thread.allComments.map(function (c) {
            return c.id;
          })
        : [comment.id];
      const resultDel = await supabase.from("ld_board_comments").delete().in("id", idsDel);
      if (resultDel.error) {
        console.error("delete error", resultDel.error);
        showToast("削除に失敗しました。");
        return;
      }
    } else {
      const idsUpd = isParent
        ? thread.allComments.map(function (c) {
            return c.id;
          })
        : [comment.id];
      const resultUpd = await supabase
        .from("ld_board_comments")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", idsUpd);
      if (resultUpd.error) {
        console.error("hide error", resultUpd.error);
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
  const appendBlock = "\n\n[追記 " + timestamp + "]\n" + appendText;
  const newBody = body + appendBlock;

  try {
    const result = await supabase
      .from("ld_board_comments")
      .update({ body: newBody })
      .eq("id", comment.id);
    if (result.error) {
      console.error("append error", result.error);
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
  // 16進6桁（000000〜ffffff）の日替わりID
  const n = Math.floor(Math.random() * 0x1000000);
  const id = n.toString(16).padStart(6, "0");
  localStorage.setItem(key, JSON.stringify({ date: today, id: id }));
  return id;
}

function formatTimestamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  let yy = String(d.getFullYear()).slice(2);
  let mm = String(d.getMonth() + 1);
  if (mm.length < 2) mm = "0" + mm;
  let dd = String(d.getDate());
  if (dd.length < 2) dd = "0" + dd;
  let hh = String(d.getHours());
  if (hh.length < 2) hh = "0" + hh;
  let mi = String(d.getMinutes());
  if (mi.length < 2) mi = "0" + mi;
  return yy + "/" + mm + "/" + dd + " " + hh + ":" + mi;
}

function formatTimestampShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  let mm = String(d.getMonth() + 1);
  if (mm.length < 2) mm = "0" + mm;
  let dd = String(d.getDate());
  if (dd.length < 2) dd = "0" + dd;
  let hh = String(d.getHours());
  if (hh.length < 2) hh = "0" + hh;
  let mi = String(d.getMinutes());
  if (mi.length < 2) mi = "0" + mi;
  return mm + "/" + dd + " " + hh + ":" + mi;
}

function showToast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  dom.toastContainer.appendChild(el);
  setTimeout(function () {
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
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function convertAnchorsToLinks(text) {
  return text.replace(/&gt;&gt;(\d+)/g, function (match, p1) {
    return (
      '<a href="#comment-' +
      p1 +
      '" class="anchor-link" data-anchor-no="' +
      p1 +
      '">&gt;&gt;' +
      p1 +
      "</a>"
    );
  });
}

function scrollLatestThreadToCenter() {
  const container = dom.threadsContainer;
  if (!container) return;
  const cards = container.querySelectorAll(".thread-card");
  if (!cards.length) return;
  const lastCard = cards[cards.length - 1];
  const rect = lastCard.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const offset =
    rect.top + window.scrollY - viewportHeight / 2 + rect.height / 2;
  window.scrollTo(0, offset);
}
