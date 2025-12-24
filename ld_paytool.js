(async () => {
  const status = document.getElementById('ptStatus');
  const tbody = document.getElementById('payTableBody');

  const elMineKeyRate = document.getElementById('optMineKeyRate');
  const elBudgetYen = document.getElementById('optBudgetYen');
  const elFirstDouble = document.getElementById('optFirstDouble');
  const elRecalc = document.getElementById('btnRecalc');
  const elToggles = document.getElementById('resourceToggles');
  const elSort = document.getElementById('optSort');
  const elKpi = document.getElementById('kpiBaseline');

  function fmtName(name){
    const s = String(name ?? '');
    return s.replaceAll('パッケージ', 'P').replaceAll('スペシャル', 'SP');
  }
  const _nf = new Intl.NumberFormat('ja-JP');
  function fmtNum(v){
    if(v === null || v === undefined || v === '') return '0';
    const n = Number(String(v).replaceAll(',', '').trim());
    if(!Number.isFinite(n)) return String(v);
    return _nf.format(Math.round(n));
  }
  function fmtRatio(x){
    if(!Number.isFinite(x) || x <= 0) return '-';
    return (Math.round(x * 1000) / 10).toFixed(1) + '%'; // 0.1%
  }
  function clampInt(n, min, max){
    n = Math.floor(Number(n));
    if(!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function supaHeaders(){
    return {
      apikey: window.LD_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${window.LD_SUPABASE_ANON_KEY}`
    };
  }
  async function fetchTable(table, orderClause){
    const base = `${window.LD_SUPABASE_URL}/rest/v1/${table}?select=*` + (orderClause ? `&order=${orderClause}` : '');
    const res = await fetch(base, { headers: supaHeaders() });
    if(!res.ok) throw new Error(`${table} fetch failed: ${res.status}`);
    return res.json();
  }

  // Resource icons
  const ICONS = {
    gold: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_01_gold_20x20px.png",
    mine_key: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_02_key_20x20px.png",
    churu: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_03_chur_20x20px.png",
    battery: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_04_battery_20x20px.png",
    pet_food: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_05_petfood_20x20px.png",
    mythic_stone: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_06_Mythstone_20x20px.png",
    immortal_stone: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_07_immotalstone_20x20px.png",
    diamond: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_08_dia_20x20px.png",
    invite: "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_09_Scroll_20x20px.png"
  };

  const RESOURCE_KEYS = ["gold","mine_key","churu","battery","pet_food","mythic_stone","immortal_stone","diamond","invite"];

  let packages = [];
  let rateBase = {};      // base rates from table
  let toggles = {};       // key -> bool
  let baselinePacks = [];
  let doublePacks = [];

  function buildToggleUI(){
    elToggles.innerHTML = '';
    for(const k of RESOURCE_KEYS){
      const wrap = document.createElement('label');
      wrap.className = 'pt-toggle';
      wrap.innerHTML = `
        <input type="checkbox" data-key="${k}" ${toggles[k] ? 'checked':''}>
        <img src="${ICONS[k]}" alt="${k}">
      `;
      elToggles.appendChild(wrap);
    }
    elToggles.addEventListener('change', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLInputElement)) return;
      const k = t.dataset.key;
      if(!k) return;
      toggles[k] = !!t.checked;
    });
  }

  function getEffectiveRates(){
    // start from base rates
    const r = {...rateBase};
    // mine_key override by select
    r.mine_key = Number(elMineKeyRate.value);
    // invite uses precise calc rate (but UI may show 1.54 elsewhere)
    // toggle off => 0
    for(const k of RESOURCE_KEYS){
      if(!toggles[k]) r[k] = 0;
    }
    return r;
  }

  function calcPackageDiaValue(row, rates){
    let sum = 0;
    for(const k of RESOURCE_KEYS){
      const qty = Number(row[k] ?? 0) || 0;
      const rate = Number(rates[k] ?? 0) || 0;
      sum += qty * rate;
    }
    // invite: after calculation, show integer (四捨五入) already covered by fmtNum (round)
    return sum;
  }

  function baselineBestRate(){
    // max diamonds per yen among baseline packs (unlimited)
    let best = 0;
    for(const p of baselinePacks){
      if(p.is_active === false) continue;
      const yen = Number(p.price_yen);
      const dia = Number(p.diamonds);
      if(yen > 0 && dia > 0){
        best = Math.max(best, dia / yen);
      }
    }
    return best; // dia per yen
  }

  function baselineBudgetBestDia(budgetYen, useDouble){
    // optimize diamonds with unlimited baseline packs + optional one-time double packs per price tier
    // Scale by gcd 100 to keep DP light
    const gcd = 100;
    const B = Math.max(0, Math.floor(budgetYen / gcd));
    if(B <= 0) return 0;

    const baseItems = baselinePacks
      .filter(p => p.is_active !== false)
      .map(p => ({ w: Math.floor(Number(p.price_yen)/gcd), v: Number(p.diamonds) }))
      .filter(it => it.w > 0 && it.v > 0);

    // unbounded knapsack
    const dp = new Array(B + 1).fill(0);
    for(let b = 0; b <= B; b++){
      const cur = dp[b];
      for(const it of baseItems){
        const nb = b + it.w;
        if(nb <= B){
          const nv = cur + it.v;
          if(nv > dp[nb]) dp[nb] = nv;
        }
      }
    }

    if(!useDouble){
      return dp[B];
    }

    const dblItems = doublePacks
      .filter(p => p.is_active !== false)
      .map(p => ({ w: Math.floor(Number(p.price_yen)/gcd), v: Number(p.diamonds) }))
      .filter(it => it.w > 0 && it.v > 0);

    // 0/1 knapsack on top of unbounded result
    // dp2 starts from dp (meaning: using unlimited normal packs)
    let dp2 = dp.slice();
    for(const it of dblItems){
      for(let b = B; b >= it.w; b--){
        const cand = dp2[b - it.w] + it.v;
        if(cand > dp2[b]) dp2[b] = cand;
      }
    }
    return dp2[B];
  }

  function render(rows){
    tbody.innerHTML = rows.map(r => {
      const cls0 = (v) => ((Number(v)||0)===0 ? ' zero' : '');
      return `
      <tr>
        <td class="name">${fmtName(r.package_name)}</td>
        <td class="jpy">${fmtNum(r.jpy)}</td>
        <td class="limit">${r.purchase_limit ?? '-'}</td>

        <td class="res res-gold${cls0(r.gold)}">${fmtNum(r.gold)}</td>
        <td class="res res-mine_key${cls0(r.mine_key)}">${fmtNum(r.mine_key)}</td>
        <td class="res res-churu${cls0(r.churu)}">${fmtNum(r.churu)}</td>
        <td class="res res-battery${cls0(r.battery)}">${fmtNum(r.battery)}</td>
        <td class="res res-pet_food${cls0(r.pet_food)}">${fmtNum(r.pet_food)}</td>
        <td class="res res-mythic_stone${cls0(r.mythic_stone)}">${fmtNum(r.mythic_stone)}</td>
        <td class="res res-immortal_stone${cls0(r.immortal_stone)}">${fmtNum(r.immortal_stone)}</td>
        <td class="res res-diamond${cls0(r.diamond)}">${fmtNum(r.diamond)}</td>
        <td class="res res-invite${cls0(r.invite)}">${fmtNum(r.invite)}</td>

        <td class="calc">${fmtNum(r._calc_dia)}</td>
        <td class="calc">${(r._calc_dpy && r._calc_dpy>0) ? (Math.round(r._calc_dpy*1000)/1000).toFixed(3) : '-'}</td>
        <td class="calc">${fmtRatio(r._calc_best_ratio)}</td>
        <td class="calc">${fmtRatio(r._calc_budget_ratio)}</td>
      </tr>`;
    }).join('');
  }

  function applyCalcAndRender(){
    const rates = getEffectiveRates();
    const budget = clampInt(elBudgetYen.value, 0, 200000);
    const useDouble = !!elFirstDouble.checked;

    const bestDiaPerYen = baselineBestRate(); // dia/yen
    const budgetBestDia = baselineBudgetBestDia(budget, useDouble);
    const budgetDiaPerYen = (budget > 0 && budgetBestDia > 0) ? (budgetBestDia / budget) : 0;

    elKpi.textContent = `基準(最高) Dia/¥=${bestDiaPerYen ? (Math.round(bestDiaPerYen*1000)/1000).toFixed(3) : '-'} / 基準(予算${budget}) Dia/¥=${budgetDiaPerYen ? (Math.round(budgetDiaPerYen*1000)/1000).toFixed(3) : '-'}`;

    // calc per package
    const rows = packages.map(p => {
      const yen = Number(p.jpy) || 0;
      const dia = calcPackageDiaValue(p, rates);
      const dpy = yen > 0 ? (dia / yen) : 0;
      const bestRatio = (bestDiaPerYen > 0) ? (dpy / bestDiaPerYen) : 0;
      const budgetRatio = (budgetDiaPerYen > 0) ? (dpy / budgetDiaPerYen) : 0;
      return { ...p, _calc_dia: dia, _calc_dpy: dpy, _calc_best_ratio: bestRatio, _calc_budget_ratio: budgetRatio };
    });

    // sort
    const mode = elSort.value;
    let out = rows.slice();
    switch(mode){
      case 'dpy_desc': out.sort((a,b)=> (b._calc_dpy||0) - (a._calc_dpy||0)); break;
      case 'best_desc': out.sort((a,b)=> (b._calc_best_ratio||0) - (a._calc_best_ratio||0)); break;
      case 'budget_desc': out.sort((a,b)=> (b._calc_budget_ratio||0) - (a._calc_budget_ratio||0)); break;
      case 'dia_desc': out.sort((a,b)=> (b._calc_dia||0) - (a._calc_dia||0)); break;
      case 'jpy_asc': out.sort((a,b)=> (Number(a.jpy)||0) - (Number(b.jpy)||0)); break;
      case 'jpy_desc': out.sort((a,b)=> (Number(b.jpy)||0) - (Number(a.jpy)||0)); break;
      default: /* keep default sort_order */ out.sort((a,b)=> (a.sort_order||0)-(b.sort_order||0)); break;
    }

    render(out);
    status.textContent = `表示中：${out.length}件（計算反映）`;
  }

  try {
    // load all tables
    const [pkgRows, rateRows, baseRows, dblRows] = await Promise.all([
      fetchTable('ld_pay_packages', 'sort_order.asc'),
      fetchTable('ld_pay_exchange_rates', 'resource_key.asc'),
      fetchTable('ld_pay_baseline_diamond_packs', 'sort_order.asc'),
      fetchTable('ld_pay_first_double_diamond_packs', 'sort_order.asc')
    ]);

    packages = (pkgRows || []).filter(r => r.is_active !== false);
    baselinePacks = baseRows || [];
    doublePacks = dblRows || [];

    // base rate map
    rateBase = {};
    toggles = {};
    for(const r of (rateRows||[])){
      const key = r.resource_key;
      if(!key) continue;
      rateBase[key] = Number(r.base_rate_diamond ?? 0) || 0;
      toggles[key] = true; // default ON
    }
    // ensure keys exist
    for(const k of RESOURCE_KEYS){
      if(!(k in rateBase)) rateBase[k] = 0;
      if(!(k in toggles)) toggles[k] = true;
    }

    buildToggleUI();
    applyCalcAndRender();

    elRecalc.addEventListener('click', applyCalcAndRender);
    elSort.addEventListener('change', applyCalcAndRender);
  } catch (e) {
    console.error(e);
    status.textContent = 'データの取得に失敗しました（Supabase接続/テーブル名を確認）';
  }
})();