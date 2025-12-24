(async () => {
  const status = document.getElementById('ptStatus');
  const tbody = document.getElementById('payTableBody');
  
  
  function fmtNum(v){
    const n = Number(v ?? 0);
    if(!Number.isFinite(n)) return String(v ?? 0);
    // Display as integer with commas (e.g., 0,000). Decimals are not expected in phase A.
    return Math.round(n).toLocaleString('ja-JP');
  }
function fmtName(name){
    const s = String(name ?? '');
    return s.replaceAll('パッケージ', 'P').replaceAll('スペシャル', 'SP');
  }


  try {
    const url = `${window.LD_SUPABASE_URL}/rest/v1/ld_pay_packages?select=*&order=sort_order.asc`;
    const res = await fetch(url, {
      headers:{
        apikey: window.LD_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.LD_SUPABASE_ANON_KEY}`
      }
    });

    if(!res.ok) throw new Error(res.statusText);

    const rows = await res.json();

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="name">${fmtName(r.package_name)}</td>
        <td class="jpy">${fmtNum(r.jpy)}</td>
        <td class="limit">${(r.purchase_limit==null?'-':fmtNum(r.purchase_limit))}</td>
        <td class="res res-gold ${(Number(r.gold)||0)===0 ? "zero" : ""}">${fmtNum(r.gold)}</td>
        <td class="res res-mine_key ${(Number(r.mine_key)||0)===0 ? "zero" : ""}">${fmtNum(r.mine_key)}</td>
        <td class="res res-churu ${(Number(r.churu)||0)===0 ? "zero" : ""}">${fmtNum(r.churu)}</td>
        <td class="res res-battery ${(Number(r.battery)||0)===0 ? "zero" : ""}">${fmtNum(r.battery)}</td>
        <td class="res res-pet_food ${(Number(r.pet_food)||0)===0 ? "zero" : ""}">${fmtNum(r.pet_food)}</td>
        <td class="res res-mythic_stone ${(Number(r.mythic_stone)||0)===0 ? "zero" : ""}">${fmtNum(r.mythic_stone)}</td>
        <td class="res res-immortal_stone ${(Number(r.immortal_stone)||0)===0 ? "zero" : ""}">${fmtNum(r.immortal_stone)}</td>
        <td class="res res-diamond ${(Number(r.diamond)||0)===0 ? "zero" : ""}">${fmtNum(r.diamond)}</td>
        <td class="res res-invite ${(Number(r.invite)||0)===0 ? "zero" : ""}">${fmtNum(r.invite)}</td>
      </tr>
    `).join('');

    status.textContent = `表示中：${rows.length}件`;
  } catch(e){
    console.error(e);
    status.textContent = 'データの取得に失敗しました';
  }
})();