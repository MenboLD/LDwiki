/* ld_users.js
   - Home: username + pass + one button ("新規登録" / "編集へ")
   - Uses RPC only: ld_user_exists, ld_register, ld_get_user_data, ld_update_user_data
   - Pass rule: 1..10 pseudo-bytes (ASCII=1, others=2)
   - After save: return home, clear inputs, auto-login (update localStorage ld_auth_v1 + dispatch ld-auth-changed)
*/
(() => {
  "use strict";

  const AUTH_STORAGE_KEY = "ld_auth_v1";

  const $ = (id) => document.getElementById(id);
  const safeTrim = (v) => (v || "").trim();

  function pseudoBytes(str){
    // ASCII(0-127)=1, others=2
    let n = 0;
    for (const ch of (str || "")) {
      n += (ch.charCodeAt(0) <= 127) ? 1 : 2;
    }
    return n;
  }

  function getSupabaseConfig(){
    const url = window.LD_SUPABASE_URL;
    const key = window.LD_SUPABASE_ANON_KEY;
    if(!url || !key) throw new Error("Supabase config missing (LD_SUPABASE_URL / LD_SUPABASE_ANON_KEY)");
    return { url, key };
  }

  async function rpc(fn, params){
    const { url, key } = getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify(params || {}),
    });

    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch(_e){ data = text; }

    if(!res.ok){
      const err = (data && data.message) ? data.message : text;
      throw new Error(`RPC ${fn} failed: ${res.status} ${err || ""}`.trim());
    }
    return data;
  }

  function loadAuth(){
    try{
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return null;
      return obj;
    }catch(_e){ return null; }
  }
  function saveAuth(obj){
    try{ localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(obj)); }catch(_e){}
  }
  function dispatchAuthChanged(auth){
    window.dispatchEvent(new CustomEvent("ld-auth-changed", { detail: auth }));
  }

  function show(el){ if(el) el.style.display = ""; }
  function hide(el){ if(el) el.style.display = "none"; }

  document.addEventListener("DOMContentLoaded", () => {
    const userNameInput = $("userNameInput");
    const userPassInput = $("userPassInput");
    const userActionBtn = $("userActionBtn");
    const userStatusLabel = $("userStatusLabel");

    const screenHome = $("screenHome");
    const screenEdit = $("screenEdit");

    const inputName = $("inputName");
    const inputPass = $("inputPass");
    const selectVaultLevel = $("selectVaultLevel");
    const mythicStateJson = $("mythicStateJson");

    const btnBackHome = $("btnBackHome");
    const btnSaveUser = $("btnSaveUser");

    // Hard-fix: keep pass inputs visible + full-width typing
    try{
      if(userPassInput){
        userPassInput.type = "text";
        userPassInput.setAttribute("inputmode","text");
        userPassInput.setAttribute("autocapitalize","off");
        userPassInput.setAttribute("spellcheck","false");
        userPassInput.setAttribute("autocomplete","off");
      }
      if(inputPass){
        inputPass.type = "text";
        inputPass.setAttribute("inputmode","text");
        inputPass.setAttribute("autocapitalize","off");
        inputPass.setAttribute("spellcheck","false");
        inputPass.setAttribute("autocomplete","off");
      }
    }catch(_e){}

    let userExists = false;
    let userExistsKnown = false;
    let existsTimer = null;

    function setHomeButtonState(){
      const name = safeTrim(userNameInput?.value);
      const pass = safeTrim(userPassInput?.value);
      const bytes = pseudoBytes(pass);

      const passOk = (pass.length >= 1 && bytes <= 10);
      const ok = (!!name && passOk);

      if(userActionBtn){
        userActionBtn.disabled = !ok;
        userActionBtn.textContent = (userExistsKnown && userExists) ? "編集へ" : "新規登録";
      }
      if(userStatusLabel){
        if(!name){
          userStatusLabel.textContent = "ユーザー名を入力してください";
        }else if(!pass){
          userStatusLabel.textContent = "パスを入力してください";
        }else if(!passOk){
          userStatusLabel.textContent = `パスが長すぎます（上限10バイト相当 / 今 ${bytes}）`;
        }else{
          userStatusLabel.textContent = (userExistsKnown && userExists) ? "登録済みユーザーです（編集へ）" : "未登録ユーザーです（新規登録）";
        }
      }
    }

    async function checkExistsDebounced(){
      const name = safeTrim(userNameInput?.value);
      userExistsKnown = false;
      userExists = false;
      setHomeButtonState();

      if(existsTimer) clearTimeout(existsTimer);
      if(!name) return;

      existsTimer = setTimeout(async () => {
        try{
          const ok = await rpc("ld_user_exists", { p_username: name });
          userExists = (ok === true);
          userExistsKnown = true;
        }catch(_e){
          userExists = false;
          userExistsKnown = false;
        }finally{
          setHomeButtonState();
        }
      }, 350);
    }

    function toHome(clearInputs){
      hide(screenEdit);
      show(screenHome);
      if(clearInputs){
        if(userNameInput) userNameInput.value = "";
        if(userPassInput) userPassInput.value = "";
      }
      userExistsKnown = false;
      userExists = false;
      setHomeButtonState();
      // re-check if name exists after clear (noop)
      checkExistsDebounced();
    }

    async function toEdit(mode, name, pass){
      hide(screenHome);
      show(screenEdit);

      if(inputName) inputName.value = name;
      if(inputPass) inputPass.value = pass;

      // defaults
      if(selectVaultLevel){
        selectVaultLevel.value = "1";
      }
      if(mythicStateJson){
        mythicStateJson.value = "{}";
      }

      // fetch current data for edit
      if(mode === "edit"){
        const data = await rpc("ld_get_user_data", { p_username: name, p_pass: pass });
        if(data && data.ok){
          if(selectVaultLevel && data.vault_level != null){
            selectVaultLevel.value = String(data.vault_level);
          }
          if(mythicStateJson){
            const ms = (data.mythic_state != null) ? data.mythic_state : {};
            mythicStateJson.value = JSON.stringify(ms, null, 0);
          }
        }else{
          throw new Error((data && data.reason) ? data.reason : "failed_to_get_user_data");
        }
      }else{
        // register: edit screen starts with defaults
      }
    }

    async function doRegisterThenEdit(name, pass){
      const bytes = pseudoBytes(pass);
      if(pass.length < 1 || bytes > 10){
        setHomeButtonState();
        return;
      }
      const ok = window.confirm(`この内容で新規登録しますか？\n\nユーザー名: ${name}\nパス: ${pass}\n`);
      if(!ok) return;

      const r = await rpc("ld_register", { p_username: name, p_pass: pass });
      if(!r || r.ok !== true){
        const reason = r?.reason || "register_failed";
        throw new Error(reason);
      }

      // After register, go to edit screen (so user can save vault/mythic)
      await toEdit("register", name, pass);
    }

    async function doEdit(name, pass){
      await toEdit("edit", name, pass);
    }

    // Home input handlers
    if(userNameInput){
      userNameInput.addEventListener("input", () => {
        setHomeButtonState();
        checkExistsDebounced();
      });
    }
    if(userPassInput){
      userPassInput.addEventListener("input", () => {
        setHomeButtonState();
      });
    }

    // Main action button
    if(userActionBtn){
      userActionBtn.addEventListener("click", async () => {
        const name = safeTrim(userNameInput?.value);
        const pass = safeTrim(userPassInput?.value);
        if(!name || !pass) return;

        // Decide mode (prefer known exists, else treat as register)
        const mode = (userExistsKnown && userExists) ? "edit" : "register";

        try{
          if(mode === "edit"){
            await doEdit(name, pass);
          }else{
            await doRegisterThenEdit(name, pass);
          }
        }catch(e){
          alert(String(e?.message || e || "失敗しました"));
        }
      });
    }

    // Back button
    if(btnBackHome){
      btnBackHome.addEventListener("click", () => {
        toHome(false);
      });
    }

    // Save button
    if(btnSaveUser){
      btnSaveUser.addEventListener("click", async () => {
        const name = safeTrim(inputName?.value);
        const pass = safeTrim(inputPass?.value);
        const vault = parseInt(selectVaultLevel?.value || "1", 10);

        let mythic = {};
        try{
          const raw = safeTrim(mythicStateJson?.value || "{}");
          mythic = raw ? JSON.parse(raw) : {};
        }catch(_e){
          alert("mythic_state のJSONが不正です");
          return;
        }

        try{
          const r = await rpc("ld_update_user_data", {
            p_username: name,
            p_pass: pass,
            p_vault_level: vault,
            p_mythic_state: mythic
          });

          if(!r || r.ok !== true){
            throw new Error(r?.reason || "save_failed");
          }

          // Auto-login (switch confirmation if already logged in as someone else)
          const cur = loadAuth();
          if(cur?.loggedIn && cur.username && cur.username !== name){
            const ok = window.confirm(`現在「${cur.username}」でログイン中です。\n保存した「${name}」に切り替えてログインしますか？`);
            if(!ok){
              // Still return to home + clear inputs, but keep current auth
              toHome(true);
              return;
            }
          }

          const auth = {
            loggedIn: true,
            username: name,
            pass: pass,
            userId: r.user_id || null,
            lockedUntil: 0,
            lastLoginAt: new Date().toISOString()
          };
          saveAuth(auth);
          dispatchAuthChanged(auth);

          // Return to home and clear inputs
          toHome(true);

        }catch(e){
          alert(String(e?.message || e || "保存に失敗しました"));
        }
      });
    }

    // If already logged in when opening this page: jump to edit
    const initialAuth = loadAuth();
    if(initialAuth?.loggedIn && initialAuth.username && initialAuth.pass){
      // auto move to edit
      const name = safeTrim(initialAuth.username);
      const pass = safeTrim(initialAuth.pass);
      if(userNameInput) userNameInput.value = name;
      if(userPassInput) userPassInput.value = pass;
      // best-effort exists state
      userExistsKnown = true;
      userExists = true;
      setHomeButtonState();
      // go edit
      doEdit(name, pass).catch(_e => {});
    }else{
      setHomeButtonState();
      checkExistsDebounced();
    }

    // If header login happens while staying on home screen, move to edit
    window.addEventListener("ld-auth-changed", (ev) => {
      const a = ev?.detail;
      if(a?.loggedIn && a.username && a.pass){
        // If we're on home, go to edit automatically
        const isHomeVisible = screenHome && screenHome.style.display !== "none";
        if(isHomeVisible){
          doEdit(String(a.username), String(a.pass)).catch(_e => {});
        }
      }
    });
  });
})();
