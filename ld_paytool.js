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
        <td class="res res-gold">${fmtNum(r.gold)}</td>
        <td class="res res-mine_key">${fmtNum(r.mine_key)}</td>
        <td class="res res-churu">${fmtNum(r.churu)}</td>
        <td class="res res-battery">${fmtNum(r.battery)}</td>
        <td class="res res-pet_food">${fmtNum(r.pet_food)}</td>
        <td class="res res-mythic_stone">${fmtNum(r.mythic_stone)}</td>
        <td class="res res-immortal_stone">${fmtNum(r.immortal_stone)}</td>
        <td class="res res-diamond">${fmtNum(r.diamond)}</td>
        <td class="res res-invite">${fmtNum(r.invite)}</td>
      </tr>
    `).join('');

    status.textContent = `表示中：${rows.length}件`;
  } catch(e){
    console.error(e);
    status.textContent = 'データの取得に失敗しました';
  }
})();