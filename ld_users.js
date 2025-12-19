/* ld_users.js (stabilized minimal)
   - Enables "続ける" when username+pass entered
   - Calls ld_user_exists to decide register/edit message (no disable of pass)
*/
(function(){
  'use strict';

  const SB_URL = window.LD_SUPABASE_URL;
  const SB_KEY = window.LD_SUPABASE_ANON_KEY;

  function safeTrim(s){ return (s ?? '').toString().trim(); }

  function pseudoBytes(s){
    // ASCII(<=127)=1, else=2
    let n=0;
    for(const ch of s){
      const code = ch.codePointAt(0) ?? 0;
      n += (code <= 127) ? 1 : 2;
    }
    return n;
  }

  async function rpc(name, body){
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${name}`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      },
      body: JSON.stringify(body ?? {})
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
    return {ok: res.ok, status: res.status, data};
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const userNameInput = document.getElementById('userNameInput');
    const userPassInput = document.getElementById('userPassInput');
    const userActionBtn = document.getElementById('userActionBtn');
    const userStatusLabel = document.getElementById('userStatusLabel');

    // Ensure visible + full-width capable
    if(userPassInput){
      userPassInput.type='text';
      userPassInput.setAttribute('inputmode','text');
      userPassInput.disabled=false;
      userPassInput.readOnly=false;
    }

    let lastExistsCheck = 0;
    let userExists = false;
    let userExistsKnown = false;

    async function checkExists(){
      const name = safeTrim(userNameInput.value);
      if(!name){
        userExistsKnown=false; userExists=false;
        userStatusLabel.textContent='ユーザー名を入力してください';
        return;
      }
      const t = Date.now();
      lastExistsCheck = t;
      const r = await rpc('ld_user_exists', { p_username: name });
      if(lastExistsCheck !== t) return;
      // ld_user_exists returns boolean (not json), but supabase wraps sometimes:
      let exists = false;
      if(r.ok){
        if(typeof r.data === 'boolean') exists = r.data;
        else if(r.data === true || r.data === false) exists = r.data;
        else if(r.data && typeof r.data === 'object' && 'result' in r.data) exists = !!r.data.result;
      }
      userExists = exists;
      userExistsKnown = true;
      userStatusLabel.textContent = exists ? '登録済み：編集へ進みます' : '未登録：新規登録になります';
    }

    function refreshBtn(){
      const name = safeTrim(userNameInput.value);
      const pass = safeTrim(userPassInput.value);
      const b = pseudoBytes(pass);
      const ok = !!name && !!pass && b>=1 && b<=10;
      userActionBtn.disabled = !ok;
      if(!pass){
        userStatusLabel.textContent = name ? 'パスを入力してください' : 'ユーザー名を入力してください';
      }else if(b>10){
        userStatusLabel.textContent = 'パスが長すぎます（最大10バイト相当）';
      }
    }

    userNameInput.addEventListener('input', ()=>{
      refreshBtn();
      clearTimeout(window.__ld_exists_t);
      window.__ld_exists_t = setTimeout(checkExists, 250);
    });
    userPassInput.addEventListener('input', refreshBtn);

    userActionBtn.addEventListener('click', async ()=>{
      // This patch focuses on enabling input and correct UI; flow stays simple
      await checkExists();
      alert(userExists ? '編集へ進む（次ステップ）' : '新規登録する（次ステップ）');
    });

    refreshBtn();
    checkExists();
  });
})();
