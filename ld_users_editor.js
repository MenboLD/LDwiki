const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc"; // 元のv5と同じものを入れてください

    import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const ADMIN_SECRET = "CHANGE_THIS_SECRET"; // 合言葉。任意の文字列に変更してください。

    const appState = {
      mode: "home",
      currentUser: null,
      usersCount: null,
      isAdmin: false,
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

    const ICON_BASE_PATH = "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld-assets/unit_icons/";

    let mythicNames = {};

    async function loadMythicNames() {
      try {
        const { data, error } = await supabase
          .from("ld_units_master")
          .select("base_id, name_jp")
          .in("base_id", MYTHIC_IDS.map(id => parseInt(id, 10)));
        if (error) {
          console.error("ld_units_master 読み込みエラー", error);
          return;
        }
        data.forEach(row => {
          const key = String(row.base_id);
          if (!mythicNames[key]) {
            mythicNames[key] = row.name_jp;
          }
        });
      } catch (e) {
        console.error("ld_units_master 読み込み中にエラー", e);
      }
    }

    function getUnitName(id) {
      return mythicNames[id] || id;
    }

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
      const homeView = document.getElementById("homeView");
      const formView = document.getElementById("formView");
      if (mode === "home") {
        homeView.classList.remove("hidden");
        formView.classList.add("hidden");
      } else {
        homeView.classList.add("hidden");
        formView.classList.remove("hidden");
      }
    }

    function formatStatsHeader() {
      const el = document.getElementById("headerStats");
      if (appState.usersCount == null) {
        el.textContent = "";
      } else {
        el.textContent = `登録ユーザー数: ${appState.usersCount}人`;
      }
    }

    async function fetchUsersCount() {
      const { count, error } = await supabase
        .from("ld_users")
        .select("*", { count: "exact", head: true });
      if (error) {
        console.error(error);
        return;
      }
      appState.usersCount = count ?? 0;
      formatStatsHeader();
    }

    const btnGoNew = document.getElementById("btnGoNew");
    const btnSearch = document.getElementById("btnSearch");
    const searchNameInput = document.getElementById("searchNameInput");
    const searchResults = document.getElementById("searchResults");
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
    const btnAdmin = document.getElementById("btnAdmin");
    const adminStatus = document.getElementById("adminStatus");

    const MAX_NAME_LENGTH = 7;
    inputName.setAttribute("maxlength", String(MAX_NAME_LENGTH));

    function updateAdminStatus() {
      adminStatus.textContent = appState.isAdmin ? "管理者モード" : "";
    }

    function renderSearchResults(list) {
      searchResults.innerHTML = "";
      if (!list || list.length === 0) {
        const div = document.createElement("div");
        div.textContent = "該当するユーザーが見つかりません。";
        div.style.fontSize = "11px";
        div.style.color = "var(--text-sub)";
        searchResults.appendChild(div);
        return;
      }
      list.forEach((user) => {
        const item = document.createElement("div");
        item.className = "search-item";

        const main = document.createElement("div");
        main.className = "search-item-main";

        const nameLine = document.createElement("div");
        nameLine.className = "search-item-name";
        nameLine.textContent = user.name;

        const subLine = document.createElement("div");
        subLine.className = "search-item-sub";
        subLine.textContent = `識別番号: ${user.tag} / 金庫Lv: ${user.vault_level ?? "-"}`;

        main.appendChild(nameLine);
        main.appendChild(subLine);

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.flexDirection = "column";
        right.style.gap = "4px";
        right.style.alignItems = "flex-end";

        const badges = document.createElement("div");
        badges.style.display = "flex";
        badges.style.gap = "4px";
        badges.style.flexWrap = "wrap";

        const badgeComments = document.createElement("span");
        badgeComments.className = "badge";
        badgeComments.textContent = `コメ: ${user.comment_count ?? 0}`;
        badges.appendChild(badgeComments);

        const badgeMis = document.createElement("span");
        badgeMis.className = user.mis_input_count > 0 ? "badge badge-danger" : "badge";
        badgeMis.textContent = `誤: ${user.mis_input_count ?? 0}`;
        badges.appendChild(badgeMis);

        const badgeLikes = document.createElement("span");
        badgeLikes.className = "badge badge-accent";
        badgeLikes.textContent = `イイね: ${user.like_count ?? 0}`;
        badges.appendChild(badgeLikes);

        right.appendChild(badges);

        const btnEdit = document.createElement("button");
        btnEdit.className = "btn-small primary";
        btnEdit.textContent = "編集";

        btnEdit.addEventListener("click", () => {
          openTagConfirmModal(user);
        });

        right.appendChild(btnEdit);

        item.appendChild(main);
        item.appendChild(right);
        searchResults.appendChild(item);
      });
    }

    async function searchUsers() {
      const keyword = searchNameInput.value.trim();
      if (!keyword) {
        showToast("検索するユーザー名を入力してください。");
        return;
      }
      const { data, error } = await supabase
        .from("ld_users")
        .select("id, name, tag, vault_level, comment_count, mis_input_count, like_count")
        .ilike("name", `%${keyword}%`)
        .order("name", { ascending: true })
        .limit(50);
      if (error) {
        console.error(error);
        showToast("ユーザー検索に失敗しました。");
        return;
      }
      renderSearchResults(data || []);
    }

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

      const btnTreasureOn = document.createElement("button");
      btnTreasureOn.className = "btn-small";
      btnTreasureOn.textContent = "👑 ON";
      btnTreasureOn.addEventListener("click", () => applyTreasureToSelection(true));

      const btnTreasureOff = document.createElement("button");
      btnTreasureOff.className = "btn-small";
      btnTreasureOff.textContent = "👑 OFF";
      btnTreasureOff.addEventListener("click", () => applyTreasureToSelection(false));

      const btnToggleForm = document.createElement("button");
      btnToggleForm.className = "btn-small";
      btnToggleForm.textContent = "神話⇄不滅";
      btnToggleForm.addEventListener("click", () => toggleFormForSelection());

      row2.appendChild(btnLv6);
      row2.appendChild(btnLv12);
      row2.appendChild(btnLv15);
      row2.appendChild(btnTreasureOn);
      row2.appendChild(btnTreasureOff);
      row2.appendChild(btnToggleForm);

      container.appendChild(row2);

      const grid = document.createElement("div");
      grid.className = "unit-grid";
      container.appendChild(grid);

      for (const id of MYTHIC_IDS) {
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
        img.src = ICON_BASE_PATH + id + ".png";

        const nameLabel = document.createElement("div");
        nameLabel.className = "unit-name";
        nameLabel.textContent = getUnitName(id);

        const badge = document.createElement("div");
        badge.className = "unit-badge";
        badge.textContent = "Lv0";

        inner.appendChild(img);
        inner.appendChild(nameLabel);
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
          if (lv > 0) {
            item.classList.remove("dim");
          } else {
            item.classList.add("dim");
          }
          updateUnitVisual(item);
        }

        item.addEventListener("click", () => {
          if (multiSelectMode) {
            if (selectedUnitIds.has(id)) {
              selectedUnitIds.delete(id);
            } else {
              selectedUnitIds.add(id);
            }
            refreshUnitSelectionVisual();
          } else {
            selectedUnitIds = new Set([id]);
            refreshUnitSelectionVisual();
          }
        });
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
      selectedUnitIds.forEach(id => {
        const item = grid.querySelector(`.unit-item[data-id="${id}"]`);
        if (!item) return;
        item.dataset.level = String(level);
        updateUnitVisual(item);
      });
    }

    function applyTreasureToSelection(on) {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      if (!grid) return;
      selectedUnitIds.forEach(id => {
        if (!AWAKENABLE_IDS.has(id)) return;
        const item = grid.querySelector(`.unit-item[data-id="${id}"]`);
        if (!item) return;
        const level = parseInt(item.dataset.level || "0", 10);
        if (level < 12 && on) {
          return;
        }
        item.dataset.treasure = on ? "1" : "0";
        updateUnitVisual(item);
      });
    }

    function toggleFormForSelection() {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      if (!grid) return;
      selectedUnitIds.forEach(id => {
        const item = grid.querySelector(`.unit-item[data-id="${id}"]`);
        if (!item) return;
        const current = item.dataset.form || "mythic";
        const next = current === "mythic" ? "immortal" : "mythic";
        item.dataset.form = next;
        updateUnitVisual(item);
      });
    }

    function collectMythicStateFromUI() {
      const grid = document.querySelector("#mythicGrid .unit-grid");
      if (!grid) return {};
      const items = grid.querySelectorAll(".unit-item");
      const json = {};
      items.forEach(item => {
        const id = item.dataset.id;
        const level = parseInt(item.dataset.level || "0", 10);
        const treasure = item.dataset.treasure === "1";
        const form = item.dataset.form || "mythic";
        if (level > 0 || treasure || form === "immortal") {
          json[id] = {
            level,
            treasure,
            form
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

    function openTagConfirmModal(user) {
      modalUser = user;
      modalTagInput.value = "";
      modalError.style.display = "none";
      modalBackdrop.style.display = "flex";
    }

    function closeTagModal() {
      modalBackdrop.style.display = "none";
      modalUser = null;
    }

    function getEditLockRemainingMs() {
      const key = "ld_users_edit_lock_until";
      const val = localStorage.getItem(key);
      if (!val) return 0;
      const until = parseInt(val, 10);
      const now = Date.now();
      if (Number.isNaN(until) || until <= now) {
        localStorage.removeItem(key);
        return 0;
      }
      return until - now;
    }

    function setEditLockMinutes(min) {
      const key = "ld_users_edit_lock_until";
      const now = Date.now();
      const until = now + min * 60 * 1000;
      localStorage.setItem(key, String(until));
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

    btnModalCancel.addEventListener("click", () => {
      closeTagModal();
    });

    btnModalOk.addEventListener("click", async () => {
      if (!modalUser) {
        closeTagModal();
        return;
      }
      if (checkEditLocked()) {
        closeTagModal();
        return;
      }
      const inputTagVal = modalTagInput.value.trim();
      if (inputTagVal.length !== 2 || isNaN(parseInt(inputTagVal, 10))) {
        modalError.textContent = "識別番号は数字2桁で入力してください。";
        modalError.style.display = "block";
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
        const remainMis = newMis;
        if (remainMis >= 3) {
          setEditLockMinutes(10);
          showToast("誤入力が続いたため、一時的に編集をロックしました（約10分）。", 3000);
        } else {
          showToast("識別番号が違います。", 2000);
        }
        closeTagModal();
      }
    });

    function openNewForm() {
      appState.mode = "new";
      appState.currentUser = null;
      formModeLabel.textContent = "新規ユーザー登録";
      inputName.value = "";
      inputName.disabled = false;
      inputTag.value = "";
      inputTag.disabled = false;
      fieldTag.style.display = "";
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
      if (name.length > MAX_NAME_LENGTH) {
        showToast(`ユーザー名は最大${MAX_NAME_LENGTH}文字までです。`);
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
          mythic_state: mythicState,
        };
        const { error } = await supabase
          .from("ld_users")
          .insert(payload)
          .single();
        if (error) {
          console.error(error);
          if (error.code === "23505") {
            showToast("同じユーザー名または識別番号が既に登録されています。");
          } else {
            showToast("ユーザーの新規登録に失敗しました。");
          }
          return;
        }
        showToast("新規ユーザーを登録しました。");
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

    btnGoNew.addEventListener("click", () => {
      openNewForm();
    });

    btnBackHome.addEventListener("click", () => {
      appState.currentUser = null;
      setView("home");
    });

    btnAdmin.addEventListener("click", () => {
      const input = prompt("管理者用の合言葉を入力してください");
      if (!input) return;
      if (input === ADMIN_SECRET) {
        appState.isAdmin = true;
        localStorage.setItem("ld_users_admin", "1");
        updateAdminStatus();
        showToast("管理者モードになりました。", 2000);
      } else {
        showToast("合言葉が違います。", 2000);
      }
    });

    btnSaveUser.addEventListener("click", () => {
      saveUser();
    });

    btnSearch.addEventListener("click", () => {
      searchUsers();
    });

    searchNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        searchUsers();
      }
    });

    (async function init() {
      setView("home");
      if (localStorage.getItem("ld_users_admin") === "1") {
        appState.isAdmin = true;
      }
      updateAdminStatus();
      await loadMythicNames();
      await fetchUsersCount();
    })();
