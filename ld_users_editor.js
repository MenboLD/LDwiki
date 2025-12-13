

/**
 * ユーザーデータ編集ページのユニット画像URL
 * - 末尾は必ず *_big.png
 * - 615 の a/b 特例は本ページでは使わない（615_big.png を採用）
 * - code は "526" / "615" / "615_a" / "615b" 等が来てもOK
 */
function getUserEditorIconUrl(code) {
  const raw = String(code || "").trim();
  if (!raw) return "";

  // 先頭の3桁だけ採用（615_a / 615b 等は 615 になる）
  const m = raw.match(/^(\d{3})/);
  const base3 = m ? m[1] : raw;

  return `https://menbold.github.io/LDwiki/images/${base3}_big.png`;
}

function setImgSrcWithFallback(imgEl, code) {
  const url = getUserEditorIconUrl(code);
  imgEl.src = url;
  imgEl.onerror = function () {
    imgEl.onerror = null;
    imgEl.src = "";
    imgEl.alt = "no image";
    imgEl.style.opacity = "0.35";
  };
}



  };
}
function getSupabaseCreateClient() {
  // UMD build provides window.supabase
  if (window.supabase && typeof window.supabase.createClient === "function") {
    return window.supabase.createClient;
  }
  return null;
}

const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

    const __createClient = getSupabaseCreateClient();
const supabase = __createClient ? __createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;




const BOARD_COMMENTS_TABLE = "ld_board_comments";

/**
 * 一覧表示用の統計を掲示板から補正して返す
 * comment_count: owner_name一致 & owner_tag一致（登録名★相当）
 * mis_input_total: ld_users.mis_input_count + owner_name一致 & owner_tag不一致（騙り相当）
 */
async function computeBoardStatsForUser(user) {
  const fallback = {
    comment_count: user.comment_count ?? 0,
    mis_input_total: user.mis_input_count ?? 0,
  };
  if (!supabase) return fallback;

  try {
    const { count: okCount, error: e1 } = await supabase
      .from(BOARD_COMMENTS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("owner_name", user.name)
      .eq("owner_tag", user.tag);

    if (e1) return fallback;

    const { count: fakeCount, error: e2 } = await supabase
      .from(BOARD_COMMENTS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("owner_name", user.name)
      .neq("owner_tag", user.tag);

    if (e2) {
      return { comment_count: okCount ?? fallback.comment_count, mis_input_total: fallback.mis_input_total };
    }

    return {
      comment_count: okCount ?? fallback.comment_count,
      mis_input_total: (fallback.mis_input_total ?? 0) + (fakeCount ?? 0),
    };
  } catch (e) {
    return fallback;
  }
}
function requireSupabase() {
  if (!supabase) {
    alert("Supabase クライアントの読み込みに失敗しました。\nネットワーク/キャッシュ、またはCDNブロックを確認してください。\n（UIは動きますが、検索・保存はできません）");
    return false;
  }
  return true;
}
    const appState = {
      mode: "home",
      currentUser: null,
      usersCount: null,
    };

    const MYTHIC_IDS = [
      "501","502","503","504","505",
      "506","507","508","509","510",
      "511","512","513","514","515",
      "516","517","518","519","520",
      "521","522","523","524","525",
      "526","527","528"
    ];

    // 不滅への覚醒が存在する神話ID
    const AWAKENABLE_IDS = new Set([
      "501","502","504","506","509","511","513","514","515","516","525","526","527","528"
    ]);

    const ICON_BASE_PATH = "./"; // 例: "./mythic_icons/" に 501.png などを置く

    let multiSelectMode = false;
    let selectedUnitIds = new Set();

    function showToast(message, ms = 2000) {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, ms);
    }

    function setView(mode) {
      appState.mode = mode;
      const home = document.getElementById("homeView");
      const form = document.getElementById("formView");
      if (mode === "home") {
        home.classList.remove("hidden");
        form.classList.add("hidden");
      } else {
        home.classList.add("hidden");
        form.classList.remove("hidden");
      }
    }

    function lockEditingFor10Minutes() {
      const lockUntil = Date.now() + 10 * 60 * 1000;
      localStorage.setItem("ld_user_edit_lock_until", String(lockUntil));
    }

    function getEditLockRemainingMs() {
      const raw = localStorage.getItem("ld_user_edit_lock_until");
      if (!raw) return 0;
      const lockUntil = parseInt(raw, 10);
      const now = Date.now();
      return Math.max(0, lockUntil - now);
    }

    function checkEditLocked() {
      const remain = getEditLockRemainingMs();
      if (remain > 0) {
        const minutes = Math.ceil(remain / 60000);
        showToast(`誤入力が続いたため、あと約${minutes}分は編集できません。`, 2500);
        return true;
      }
      return false;
    }

    function formatStatsHeader() {
      const el = document.getElementById("headerStats");
      if (appState.usersCount == null) {
        el.textContent = "";
      } else {
        el.textContent = `登録数: ${appState.usersCount}`;
      }
    }

    async function fetchUsersCount() {
      const { count, error } = await supabase
        .from("ld_users")
        .select("*", { count: "exact", head: true });
      if (!error) {
        appState.usersCount = count ?? 0;
        formatStatsHeader();
      }
    }

    // ユニットアイコンエディタ描画
    function renderMythicGrid(mythicState) {
      const container = document.getElementById("mythicGrid");
      container.innerHTML = "";

      const state = mythicState || {};
      selectedUnitIds = new Set();
      multiSelectMode = false;

      const row1 = document.createElement("div");
      row1.className = "unit-controls-row";

      const btnAll = document.createElement("button");
      btnAll.className = "btn-small";
      btnAll.textContent = "全選択";
      btnAll.addEventListener("click", () => {
        selectedUnitIds = new Set(MYTHIC_IDS);
        refreshUnitSelectionVisual();
      });

      const btnClear = document.createElement("button");
      btnClear.className = "btn-small";
      btnClear.textContent = "選択解除";
      btnClear.addEventListener("click", () => {
        selectedUnitIds = new Set();
        refreshUnitSelectionVisual();
      });

      const btnMulti = document.createElement("button");
      btnMulti.className = "btn-small";
      btnMulti.textContent = "複数選択:OFF";
      btnMulti.addEventListener("click", () => {
        multiSelectMode = !multiSelectMode;
        btnMulti.textContent = multiSelectMode ? "複数選択:ON" : "複数選択:OFF";
      });

      row1.appendChild(btnAll);
      row1.appendChild(btnClear);
      row1.appendChild(btnMulti);
      container.appendChild(row1);

      const row2 = document.createElement("div");
      row2.className = "unit-controls-row";

      const btnLv6 = document.createElement("button");
      btnLv6.className = "btn-small";
      btnLv6.textContent = "Lv6";
      btnLv6.addEventListener("click", () => applyLevelToSelection(6));

      const btnLv12 = document.createElement("button");
      btnLv12.className = "btn-small";
      btnLv12.textContent = "Lv12";
      btnLv12.addEventListener("click", () => applyLevelToSelection(12));

      const btnLv15 = document.createElement("button");
      btnLv15.className = "btn-small";
      btnLv15.textContent = "Lv15";
      btnLv15.addEventListener("click", () => applyLevelToSelection(15));

      const btnTreasure = document.createElement("button");
      btnTreasure.className = "btn-small";
      btnTreasure.textContent = "専用👑切替";
      btnTreasure.addEventListener("click", () => toggleTreasureOnSelection());

      row2.appendChild(btnLv6);
      row2.appendChild(btnLv12);
      row2.appendChild(btnLv15);
      row2.appendChild(btnTreasure);

      const btnAwaken = document.createElement("button");
      btnAwaken.className = "btn-small";
      btnAwaken.textContent = "覚醒/退化";
      btnAwaken.addEventListener("click", () => toggleFormAwakening());
      row2.appendChild(btnAwaken);

      container.appendChild(row2);

      const grid = document.createElement("div");
      grid.className = "unit-grid";

      MYTHIC_IDS.forEach(id => {
        const item = document.createElement("div");
        item.className = "unit-item dim";
        item.dataset.id = id;
        item.dataset.level = "0";
        item.dataset.treasure = "0";
        item.dataset.form = "mythic";

        const inner = document.createElement("div");
        inner.className = "unit-inner";

        const img = document.createElement("img");
        img.className = "unit-img";
        img.alt = id;
        setImgSrcWithFallback(img, id);

        const badge = document.createElement("div");
        badge.className = "unit-badge";
        badge.textContent = "Lv0";

        inner.appendChild(img);
        inner.appendChild(badge);
        item.appendChild(inner);
        grid.appendChild(item);

        const info = state[id];
        if (info) {
          const lv = typeof info.level === "number" ? info.level : 0;
          const tre = info.treasure === true;
          const form = info.form === "immortal" ? "immortal" : "mythic";
          item.dataset.level = String(lv);
          item.dataset.treasure = tre ? "1" : "0";
          item.dataset.form = form;
        }
        updateUnitVisual(item);

        item.addEventListener("click", () => {
          onClickUnitItem(id);
        });
      });

      container.appendChild(grid);
    }

    function onClickUnitItem(id) {
      if (!multiSelectMode) {
        selectedUnitIds = new Set([id]);
      } else {
        if (selectedUnitIds.has(id)) {
          selectedUnitIds.delete(id);
        } else {
          selectedUnitIds.add(id);
        }
      }
      refreshUnitSelectionVisual();
    }

    function refreshUnitSelectionVisual() {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      if (!grid) return;
      const items = grid.querySelectorAll(".unit-item");
      items.forEach(item => {
        const id = item.dataset.id;
        if (selectedUnitIds.has(id)) {
          item.classList.add("selected");
        } else {
          item.classList.remove("selected");
        }
      });
    }

    function updateUnitVisual(item) {
      const level = parseInt(item.dataset.level || "0", 10);
      const hasTreasure = item.dataset.treasure === "1";
      const form = item.dataset.form || "mythic";
      const badge = item.querySelector(".unit-badge");
      if (!badge) return;

      if (level <= 0) {
        item.classList.add("dim");
        badge.textContent = "Lv0";
      } else {
        item.classList.remove("dim");
        let label = form === "immortal" ? "不滅" : "Lv";
        let txt = label + level;
        if (form === "mythic" && hasTreasure) {
          txt += " 👑";
        }
        badge.textContent = txt;
      }
    }

    function applyLevelToSelection(level) {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      if (!grid) return;
      if (selectedUnitIds.size === 0) {
        showToast("ユニットが選択されていません。");
        return;
      }
      selectedUnitIds.forEach(id => {
        const item = grid.querySelector('.unit-item[data-id="' + id + '"]');
        if (!item) return;
        item.dataset.level = String(level);
        if (level === 0) {
          item.dataset.treasure = "0";
        }
        updateUnitVisual(item);
      });
    }

    function toggleTreasureOnSelection() {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      if (!grid) return;
      if (selectedUnitIds.size === 0) {
        showToast("ユニットが選択されていません。");
        return;
      }
      selectedUnitIds.forEach(id => {
        const item = grid.querySelector('.unit-item[data-id="' + id + '"]');
        if (!item) return;
        const form = item.dataset.form || "mythic";
        const level = parseInt(item.dataset.level || "0", 10);
        if (form === "immortal") {
          item.dataset.treasure = "0";
          updateUnitVisual(item);
          return;
        }
        if (level < 12) {
          item.dataset.treasure = "0";
          updateUnitVisual(item);
          return;
        }
        const current = item.dataset.treasure === "1";
        item.dataset.treasure = current ? "0" : "1";
        updateUnitVisual(item);
      });
    }

    function toggleFormAwakening() {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      if (!grid) return;
      if (selectedUnitIds.size === 0) {
        showToast("ユニットが選択されていません。");
        return;
      }
      selectedUnitIds.forEach(id => {
        if (!AWAKENABLE_IDS.has(id)) return;
        const item = grid.querySelector('.unit-item[data-id="' + id + '"]');
        if (!item) return;
        let form = item.dataset.form || "mythic";
        let level = parseInt(item.dataset.level || "0", 10);
        if (form === "mythic") {
          if (level === 0) level = 6;
          item.dataset.form = "immortal";
          item.dataset.level = String(level);
          item.dataset.treasure = "0";
        } else {
          item.dataset.form = "mythic";
          item.dataset.level = String(level);
        }
        updateUnitVisual(item);
      });
    }

    function collectMythicStateFromUI() {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      const json = {};
      if (!grid) return json;
      const items = grid.querySelectorAll(".unit-item");
      items.forEach(item => {
        const id = item.dataset.id;
        const level = parseInt(item.dataset.level || "0", 10);
        const hasTreasure = item.dataset.treasure === "1";
        const form = item.dataset.form || "mythic";
        if (level > 0 || hasTreasure) {
          json[id] = {
            form,
            level,
            treasure: form === "mythic" && hasTreasure
          };
        }
      });
      return json;
    }

    const modalBackdrop = document.getElementById("modalBackdrop");
    const modalBody = document.getElementById("modalBody");
    const modalError = document.getElementById("modalError");
    const modalTagInput = document.getElementById("modalTagInput");
    const btnModalCancel = document.getElementById("btnModalCancel");
    const btnModalOk = document.getElementById("btnModalOk");
    let modalUser = null;

    function openTagModal(user) {
      modalUser = user;
      modalBody.textContent = `ユーザー名: ${user.name}`;
      modalTagInput.value = "";
      modalError.style.display = "none";
      modalError.textContent = "";
      modalBackdrop.style.display = "flex";
      modalTagInput.focus();
    }

    function closeTagModal() {
      modalBackdrop.style.display = "none";
    }

    btnModalCancel.addEventListener("click", () => {
      modalUser = null;
      closeTagModal();
    });

    const searchInput = document.getElementById("searchNameInput");
    const btnSearch = document.getElementById("btnSearch");
    const searchResults = document.getElementById("searchResults");

    async function doSearch() {
      const term = searchInput.value.trim();
      if (!term) {
        searchResults.innerHTML = "";
        showToast("ユーザー名を入力してください。");
        return;
      }
      searchResults.innerHTML = "検索中...";

      const { data, error } = await supabase
        .from("ld_users")
        .select("id, name, tag, comment_count, mis_input_count")
        .ilike("name", `%${term}%`)
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        searchResults.innerHTML = "<div>検索中にエラーが発生しました。</div>";
        return;
      }

      if (!data || data.length === 0) {
        searchResults.innerHTML = "<div>該当ユーザーはいません。</div>";
        return;
      }

      searchResults.innerHTML = "";
      data.forEach(user => {
        const row = document.createElement("div");
        row.className = "search-item";

        const btnEdit = document.createElement("button");
        btnEdit.className = "btn-small";
        btnEdit.textContent = "編集";
        btnEdit.addEventListener("click", () => {
          onClickEditUser(user);
        });

        const main = document.createElement("div");
        main.className = "search-main";
        const nameEl = document.createElement("div");
        nameEl.className = "search-name";
        nameEl.textContent = user.name;
        const meta = document.createElement("div");
        meta.className = "search-meta";
        meta.textContent = `コメ:${user.comment_count ?? 0}  誤入力:${user.mis_input_count ?? 0}`;
        computeBoardStatsForUser(user).then((st) => {
          meta.textContent = `コメ:${st.comment_count}  誤入力:${st.mis_input_total}`;
        });
main.appendChild(nameEl);
        main.appendChild(meta);

        row.appendChild(btnEdit);
        row.appendChild(main);

        searchResults.appendChild(row);
      });
    }

    btnSearch.addEventListener("click", () => {
      doSearch();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        doSearch();
      }
    });

    async function onClickEditUser(userBasic) {
      if (checkEditLocked()) {
        return;
      }
      const { data, error } = await supabase
        .from("ld_users")
        .select("*")
        .eq("id", userBasic.id)
        .single();

      if (error || !data) {
        console.error(error);
        showToast("ユーザー情報の取得に失敗しました。");
        return;
      }
      openTagModal(data);
    }

    btnModalOk.addEventListener("click", async () => {
      if (!modalUser) return;
      const inputTagVal = modalTagInput.value.trim();
      if (inputTagVal.length !== 2) {
        modalError.style.display = "block";
        modalError.textContent = "識別番号は2桁で入力してください。";
        return;
      }

      const correctTag = modalUser.tag;
      if (inputTagVal === correctTag) {
        const userToEdit = modalUser;
        modalUser = null;
        closeTagModal();
        openEditForm(userToEdit);
      } else {
        const newMis = (modalUser.mis_input_count || 0) + 1;
        await supabase
          .from("ld_users")
          .update({ mis_input_count: newMis })
          .eq("id", modalUser.id);
        modalUser.mis_input_count = newMis;

        lockEditingFor10Minutes();
        modalError.style.display = "block";
        modalError.textContent = "識別番号が違います。10分間は編集できません。";
      }
    });

    const btnGoNew = document.getElementById("btnGoNew");
    const btnBackHome = document.getElementById("btnBackHome");
    const btnSaveUser = document.getElementById("btnSaveUser");
    const formModeLabel = document.getElementById("formModeLabel");
    const inputName = document.getElementById("inputName");
    const inputTag = document.getElementById("inputTag");
    const fieldTag = document.getElementById("fieldTag");
    const selectVaultLevel = document.getElementById("selectVaultLevel");
    const statusComments = document.getElementById("statusComments");
    const statusMisInputs = document.getElementById("statusMisInputs");
    const statusLikes = document.getElementById("statusLikes");

    for (let lv = 1; lv <= 11; lv++) {
      const opt = document.createElement("option");
      opt.value = String(lv);
      opt.textContent = String(lv);
      selectVaultLevel.appendChild(opt);
    }

    btnGoNew.addEventListener("click", () => {
      openNewForm();
    });

    btnBackHome.addEventListener("click", () => {
      appState.currentUser = null;
      setView("home");
    });

    function openNewForm() {
      appState.mode = "new";
      appState.currentUser = null;

      formModeLabel.textContent = "新規ユーザー登録";
      inputName.value = "";
      inputName.disabled = false;
      inputTag.value = "";
      inputTag.disabled = false;
      fieldTag.style.display = "block";
      selectVaultLevel.value = "1";

      renderMythicGrid({});
      statusComments.textContent = "コメ数: 0";
      statusMisInputs.textContent = "誤入力: 0";
      statusLikes.textContent = "イイね: 0";

      setView("form");
    }

    function openEditForm(user) {
      if (!user) {
        showToast("内部エラー: 編集対象ユーザーが不明です。");
        return;
      }
      appState.mode = "edit";
      appState.currentUser = user;

      formModeLabel.textContent = "ユーザーデータ編集";
      inputName.value = user.name;
      inputName.disabled = true;
      inputTag.value = user.tag;
      inputTag.disabled = true;
      fieldTag.style.display = "none";

      const v = user.vault_level || 1;
      selectVaultLevel.value = String(v);

      let state = {};
      try {
        state = user.mythic_state || {};
      } catch {
        state = {};
      }
      renderMythicGrid(state);

      statusComments.textContent = `コメ数: ${user.comment_count ?? 0}`;
      statusMisInputs.textContent = `誤入力: ${user.mis_input_count ?? 0}`;
      statusLikes.textContent = `イイね: ${user.like_count ?? 0}`;

      setView("form");
    }

    async function saveUser() {
      const name = inputName.value.trim();
      let tag = inputTag.value.trim();
      const vaultLevel = parseInt(selectVaultLevel.value, 10);
      const mythicState = collectMythicStateFromUI();

      if (!name) {
        showToast("ユーザー名を入力してください。");
        return;
      }

      const isNew = appState.mode === "new" || !appState.currentUser;

      if (isNew) {
        if (tag.length !== 2) {
          showToast("識別番号は2桁で入力してください。");
          return;
        }
        if (isNaN(parseInt(tag, 10))) {
          showToast("識別番号は数字2桁で入力してください。");
          return;
        }
      } else {
        tag = appState.currentUser.tag;
      }

      if (vaultLevel < 1 || vaultLevel > 11 || Number.isNaN(vaultLevel)) {
        showToast("金庫レベルは1〜11で指定してください。");
        return;
      }

      if (isNew) {
        const payload = {
          name,
          tag,
          vault_level: vaultLevel,
          mythic_state: mythicState
        };
        const { error } = await supabase
          .from("ld_users")
          .insert(payload)
          .single();
        if (error) {
          console.error(error);
          if (error.code === "23505") {
            showToast("同じユーザー名＋番号の組がすでに存在します。");
          } else {
            showToast("ユーザーの登録に失敗しました。");
          }
          return;
        }
        showToast("ユーザーを登録しました。");
        await fetchUsersCount();
        setView("home");
      } else {
        if (!appState.currentUser) {
          showToast("内部エラー: 編集対象ユーザーが不明です。");
          return;
        }
        const payload = {
          vault_level: vaultLevel,
          mythic_state: mythicState
        };
        const { error } = await supabase
          .from("ld_users")
          .update(payload)
          .eq("id", appState.currentUser.id);
        if (error) {
          console.error(error);
          showToast("ユーザー情報の更新に失敗しました。");
          return;
        }
        showToast("ユーザー情報を更新しました。");
        setView("home");
      }
    }

    btnSaveUser.addEventListener("click", () => {
      saveUser();
    });

    (async function init() {
      setView("home");
      await fetchUsersCount();
    })();



function sb() {
  if (!requireSupabase()) throw new Error("Supabase not ready");
  return supabase;
}
