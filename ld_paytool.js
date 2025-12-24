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
        <td>${r.jpy}</td>
        <td>${r.purchase_limit ?? '-'}</td>
        <td>${r.gold}</td>
        <td>${r.mine_key}</td>
        <td>${r.churu}</td>
        <td>${r.battery}</td>
        <td>${r.pet_food}</td>
        <td>${r.mythic_stone}</td>
        <td>${r.immortal_stone}</td>
        <td>${r.diamond}</td>
        <td>${r.invite}</td>
      </tr>
    `).join('');

    status.textContent = `表示中：${rows.length}件`;
  } catch(e){
    console.error(e);
    status.textContent = 'データの取得に失敗しました';
  }
})();