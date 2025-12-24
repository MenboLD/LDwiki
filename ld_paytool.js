(async () => {
  const status = document.getElementById('ptStatus');
  const tbody = document.getElementById('payTableBody');

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
        <td class="name">${r.package_name}</td>
        <td class="jpy">${r.jpy}</td>
        <td class="limit">${r.purchase_limit ?? '-'}</td>
        <td class="res">${r.gold}</td>
        <td class="res">${r.mine_key}</td>
        <td class="res">${r.churu}</td>
        <td class="res">${r.battery}</td>
        <td class="res">${r.pet_food}</td>
        <td class="res">${r.mythic_stone}</td>
        <td class="res">${r.immortal_stone}</td>
        <td class="res">${r.diamond}</td>
        <td class="res">${r.invite}</td>
      </tr>
    `).join('');

    status.textContent = `表示中：${rows.length}件`;
  } catch(e){
    console.error(e);
    status.textContent = 'データの取得に失敗しました';
  }
})();