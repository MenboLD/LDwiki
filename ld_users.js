// ld_users.js (v20251219f) - RPC-based register/edit + auto-login + stable UI
(() => {
  "use strict";

  const SUPABASE_URL = window.LD_SUPABASE_URL || "https://teggcuiyqkbcvbhdntni.supabase.co";
  const SUPABASE_ANON_KEY = window.LD_SUPABASE_ANON_KEY || "";

  const AUTH_STORAGE_KEY = "ld_auth_v1";

  const RPC_USER_EXISTS = "ld_user_exists";
  const RPC_REGISTER = "ld_register";
  const RPC_GET = "ld_get_user_data";        // 推奨：存在しない場合は edit 判定だけ動作
  const RPC_UPDATE = "ld_update_user_data";
  const RPC_LOGIN = "ld_login";

  const $ = (id) => document.getElementById(id);

  const homeView = $("homeView");
  const formView = $("formView");

  const userNameInput = $("userNameInput");
  const userPassInput = $("userPassInput");
  const userActionBtn = $("userActionBtn");
  const userStatusLabel = $("userStatusLabel");

  const formModeLabel = $("formModeLabel");
  const inputName = $("inputName");
  const inputPass = $("inputPass");
  const selectVaultLevel = $("selectVaultLevel");
  const mythicJson = $("mythicJson");
  const btnBackHome = $("btnBackHome");
  const btnSaveUser = $("btnSaveUser");
  const statusComments = $("statusComments");
  const statusMisInputs = $("statusMisInputs");
  const statusLikes = $("statusLikes");
  const btnJsonReset = $("btnJsonReset");
  const btnJsonFormat = $("btnJsonFormat");

  let existsKnown = false;
  let existsValue = false;
  let lastExistsQuery = "";
  let existsTimer = null;

  function safeTrim(s){ return (s ?? "").toString().trim(); }

  // 半角=1 / それ以外=2 の「擬似バイト」
  function pseudoBytes(str){
    let n = 0;
    for (const ch of str){
      const code = ch.codePointAt(0);
      n += (code <= 0x7f) ? 1 : 2;
    }
    return n;
  }

  function readAuth(){
    try{
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw) return null;
      const o = JSON.parse(raw);
      if(o && typeof o.name === "string" && typeof o.pass === "string"){
        return { name: o.name, pass: o.pass };
      }
    }catch(_){}
    return null;
  }

  function writeAuth(name, pass){
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ name, pass, ts: Date.now() }));
    window.dispatchEvent(new CustomEvent("ld-auth-changed", { detail: { name } }));
  }

  function clearAuth(){
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("ld-auth-changed", { detail: { name: null } }));
  }

  async function rpc(fn, payload){
    if(!SUPABASE_ANON_KEY){
      throw new Error("anon_key_missing");
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });
    const text = await res.text();
    let data = null;
    try{ data = text ? JSON.parse(text) : null; }catch(_){}
    if(!res.ok){
      const msg = (data && data.message) ? data.message : text || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function setHomeMessage(msg){
    if(userStatusLabel) userStatusLabel.textContent = msg;
  }

  function setActionLabel(){
    if(!userActionBtn) return;
    if(!existsKnown){
      userActionBtn.textContent = "続ける";
      return;
    }
    userActionBtn.textContent = existsValue ? "編集へ" : "新規登録";
  }

  function refreshHomeButton(){
    const name = safeTrim(userNameInput?.value);
    const pass = safeTrim(userPassInput?.value);

    const okName = name.length > 0;
    const passBytes = pseudoBytes(pass);
    const okPass = pass.length > 0 && passBytes <= 10;

    if(!okName){
      setHomeMessage("ユーザー名を入力してください");
    }else if(!pass){
      setHomeMessage("パスを入力してください");
    }else if(passBytes > 10){
      setHomeMessage("パスが長すぎます（最大: 全角5文字/半角10文字）");
    }else{
      setHomeMessage(existsKnown ? (existsValue ? "登録済み：編集へ進めます" : "未登録：新規登録できます") : "確認中…");
    }

    if(userActionBtn) userActionBtn.disabled = !(okName && okPass);
    setActionLabel();
  }

  async function checkExistsDebounced(){
    const name = safeTrim(userNameInput?.value);
    if(!name){
      existsKnown = false;
      existsValue = false;
      refreshHomeButton();
      return;
    }
    if(name === lastExistsQuery) return;

    lastExistsQuery = name;
    existsKnown = false;
    existsValue = false;
    refreshHomeButton();

    if(existsTimer) clearTimeout(existsTimer);
    existsTimer = setTimeout(async () => {
      try{
        const v = await rpc(RPC_USER_EXISTS, { p_username: name });
        existsKnown = true;
        existsValue = !!v;
      }catch(_){
        // RPCが無い/失敗でも進行は可能（続けるは押せる）
        existsKnown = false;
        existsValue = false;
      }finally{
        refreshHomeButton();
      }
    }, 250);
  }

  function showHome(clearInputs=false){
    if(clearInputs){
      if(userNameInput) userNameInput.value = "";
      if(userPassInput) userPassInput.value = "";
    }
    existsKnown = false;
    existsValue = false;
    lastExistsQuery = "";
    if(homeView) homeView.classList.remove("hidden");
    if(formView) formView.classList.add("hidden");
    refreshHomeButton();
  }

  function populateVaultOptions(){
    if(!selectVaultLevel) return;
    if(selectVaultLevel.options.length) return;
    for(let i=1;i<=11;i++){
      const opt=document.createElement("option");
      opt.value=String(i);
      opt.textContent=String(i);
      selectVaultLevel.appendChild(opt);
    }
  }

  function setFormMode(mode){
    if(formModeLabel) formModeLabel.textContent = (mode === "register") ? "新規登録後の編集" : "編集";
  }

  function setStats(data){
    if(!data){
      if(statusComments) statusComments.textContent = "コメ数: -";
      if(statusMisInputs) statusMisInputs.textContent = "誤入力: -";
      if(statusLikes) statusLikes.textContent = "イイね: -";
      return;
    }
    if(statusComments) statusComments.textContent = `コメ数: ${data.comment_count ?? "-"}`;
    if(statusMisInputs) statusMisInputs.textContent = `誤入力: ${data.mis_input_count ?? "-"}`;
    if(statusLikes) statusLikes.textContent = `イイね: ${data.like_count ?? "-"}`;
  }

  async function openFormWith(name, pass, mode){
    populateVaultOptions();
    setFormMode(mode);

    if(inputName) inputName.value = name;
    if(inputPass) inputPass.value = pass;

    // defaults
    if(selectVaultLevel) selectVaultLevel.value = "1";
    if(mythicJson) mythicJson.value = "{}";
    setStats(null);

    if(formView) formView.classList.remove("hidden");
    if(homeView) homeView.classList.add("hidden");

    // Try load user data (if RPC exists)
    try{
      const data = await rpc(RPC_GET, { p_username: name, p_pass: pass });
      if(data && data.ok){
        const u = data.data || data.user || data;
        if(selectVaultLevel && u.vault_level != null) selectVaultLevel.value = String(u.vault_level);
        if(mythicJson && u.mythic_state != null) mythicJson.value = JSON.stringify(u.mythic_state);
        setStats(u);
      }
    }catch(_){
      // ignore if RPC missing
    }
  }

  async function ensureCanSwitchTo(name){
    const auth = readAuth();
    if(!auth || !auth.name) return true;
    if(auth.name === name) return true;
    return window.confirm(`既に「${auth.name}」でログイン中です。\n「${name}」に切り替えますか？`);
  }

  async function handleProceed(){
    const name = safeTrim(userNameInput?.value);
    const pass = safeTrim(userPassInput?.value);
    if(!name || !pass) return;

    if(!await ensureCanSwitchTo(name)){
      return;
    }

    const mode = (existsKnown && existsValue) ? "edit" : "register";

    if(mode === "register"){
      const bytes = pseudoBytes(pass);
      const ok = window.confirm(`新規登録を実行します。\n\nユーザー名: ${name}\nパス: ${pass} (${bytes}バイト相当)\n\nよろしいですか？`);
      if(!ok) return;

      const r = await rpc(RPC_REGISTER, { p_username: name, p_pass: pass });
      if(!r || !r.ok){
        alert("登録に失敗しました");
        return;
      }
      // 自動ログインへ
      writeAuth(name, pass);
      // 登録直後は編集画面へ
      await openFormWith(name, pass, "register");
      return;
    }

    // edit
    // Validate credentials via ld_login (more reliable) if available
    try{
      const lr = await rpc(RPC_LOGIN, { p_username: name, p_pass: pass });
      if(lr && lr.ok){
        writeAuth(name, pass);
      }
    }catch(_){
      // fallback: proceed to form anyway
      writeAuth(name, pass);
    }
    await openFormWith(name, pass, "edit");
  }

  async function handleSave(){
    const name = safeTrim(inputName?.value);
    const pass = safeTrim(inputPass?.value);
    if(!name || !pass){
      alert("ユーザー名/パスが不正です");
      return;
    }
    if(!await ensureCanSwitchTo(name)){
      return;
    }

    const vault = parseInt(selectVaultLevel?.value ?? "1", 10);
    let mythicObj = {};
    try{
      mythicObj = JSON.parse(mythicJson?.value ?? "{}");
    }catch(_){
      alert("mythic_state のJSONが不正です");
      return;
    }

    const r = await rpc(RPC_UPDATE, { p_username: name, p_pass: pass, p_vault_level: vault, p_mythic_state: mythicObj });
    if(!r || !r.ok){
      alert("保存に失敗しました");
      return;
    }

    // 保存成功：自動ログイン → ホームへ戻る（入力クリア）
    writeAuth(name, pass);
    showHome(true);
  }

  function setupJsonHelpers(){
    if(btnJsonReset){
      btnJsonReset.addEventListener("click", () => {
        if(mythicJson) mythicJson.value = "{}";
      });
    }
    if(btnJsonFormat){
      btnJsonFormat.addEventListener("click", () => {
        if(!mythicJson) return;
        try{
          const obj = JSON.parse(mythicJson.value || "{}");
          mythicJson.value = JSON.stringify(obj, null, 2);
        }catch(_){
          alert("整形できません（JSONが不正です）");
        }
      });
    }
  }

  function setup(){
    // force pass inputs visible + full width mode
    if(userPassInput){
      userPassInput.type = "text";
      userPassInput.setAttribute("inputmode","text");
      userPassInput.disabled = false;
    }
    if(inputPass){
      inputPass.type = "text";
      inputPass.setAttribute("inputmode","text");
    }

    populateVaultOptions();
    refreshHomeButton();
    setupJsonHelpers();

    userNameInput?.addEventListener("input", () => { refreshHomeButton(); checkExistsDebounced(); });
    userPassInput?.addEventListener("input", () => { refreshHomeButton(); });

    userActionBtn?.addEventListener("click", () => { handleProceed().catch(e => alert(e.message || "失敗しました")); });

    btnBackHome?.addEventListener("click", () => showHome(false));
    btnSaveUser?.addEventListener("click", () => { handleSave().catch(e => alert(e.message || "保存に失敗しました")); });

    // If already logged in, auto-open edit form
    const auth = readAuth();
    if(auth && auth.name && auth.pass){
      openFormWith(auth.name, auth.pass, "edit").catch(_ => {});
    }

    // When header login occurs, move to edit form
    window.addEventListener("ld-auth-changed", () => {
      const a = readAuth();
      if(a && a.name && a.pass){
        openFormWith(a.name, a.pass, "edit").catch(_ => {});
      }else{
        showHome(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", setup);
})();
