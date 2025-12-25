(async () => {
  const status = document.getElementById('ptStatus');
  const tbody = document.getElementById('payTableBody');

  const elMineKeyRate = document.getElementById('optMineKeyRate');
  const elBudgetYen = document.getElementById('optBudgetYen');
  const elBudgetQuick = document.getElementById('btnBudgetQuick');
  const elRateEditor = document.getElementById('rateEditor');
  const elBtnResAll = document.getElementById('btnResAll');
  const elBtnDoubleAll = document.getElementById('btnDoubleAll');
    const elToggles = document.getElementById('resourceToggles');
  const elDoubleToggles = document.getElementById('doubleToggles');
  const elSort = document.getElementById('optSort');
  const elKpi = document.getElementById('kpiBaseline');

  const elSummaryTbody = document.getElementById('summaryTableBody');

  function fmtName(name){ return name ?? ""; }
  const _nf = new Intl.NumberFormat('ja-JP');
  function fmtNum(v){
    if(v === null || v === undefined || v === '') return '0';
    const n = Number(String(v).replaceAll(',', '').trim());
    if(!Number.isFinite(n)) return String(v);
    return _nf.format(Math.round(n));
  }
  function fmtFloat2(v){
    if(!Number.isFinite(v) || v <= 0) return '-';
    return (Math.round(v * 100) / 100).toFixed(2);
  }
  function fmtPct1(v){
    if(!Number.isFinite(v) || v <= 0) return '-';
    return (Math.round(v * 1000) / 10).toFixed(1) + '%';
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
    const url = `${window.LD_SUPABASE_URL}/rest/v1/${table}?select=*` + (orderClause ? `&order=${orderClause}` : '');
    const res = await fetch(url, { headers: supaHeaders() });
    if(!res.ok) throw new Error(`${table} fetch failed: ${res.status}`);
    return res.json();
  }

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
  let rateBase = {};
  let toggles = {};
  let baselinePacks = [];
  let doublePacks = [];
  let doubleAvailability = {}; // price_yen -> bool
  let cart = {}; // key -> qty

  const CART_LS_KEY = "ld_paytool_cart_v1";

  function rowKey(p){
    // primary key is first column, but we don't know its name; try common ones then fallback
    return String(p.id ?? p.package_id ?? p.pk ?? p.sort_order ?? p.package_name);
  }
  function loadCart(){
    try{
      const raw = localStorage.getItem(CART_LS_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(obj && typeof obj === 'object') cart = obj;
    }catch(_){}
  }
  function saveCart(){
    try{
      localStorage.setItem(CART_LS_KEY, JSON.stringify(cart));
    }catch(_){}
  }

  function buildResourceToggleUI(){
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

  function buildDoubleAvailabilityUI(){
    if(!elDoubleToggles) return;
    elDoubleToggles.innerHTML = '';

    const tiers = baselinePacks
      .filter(p => p.is_active !== false)
      .map(p => Number(p.price_yen))
      .filter(n => Number.isFinite(n) && n > 0);

    const uniq = Array.from(new Set(tiers)).sort((a,b)=>a-b);

    for(const price of uniq){
      if(!(price in doubleAvailability)) doubleAvailability[price] = true;
    }

    for(const price of uniq){
      const row = document.createElement('label');
      row.className = 'pt-double-item';
      row.innerHTML = `
        <input type="checkbox" data-price="${price}" ${doubleAvailability[price] ? 'checked':''}>
        <span class="pt-badge">${fmtNum(price)}円</span>
        <span>初回2倍</span>
      `;
      elDoubleToggles.appendChild(row);
    }

    elDoubleToggles.addEventListener('change', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLInputElement)) return;
      const price = Number(t.dataset.price);
      if(!Number.isFinite(price)) return;
      doubleAvailability[price] = !!t.checked;
    });
  }

  
  function buildRateEditorUI(){
    if(!elRateEditor) return;
    const items = [
      { key:'gold', name:'ゴールド', icon:'Resource_01_gold_20x20px.png' },
      { key:'battery', name:'バッテリー', icon:'Resource_04_battery_20x20px.png' },
      { key:'pet_food', name:'ペットフード', icon:'Resource_05_petfood_20x20px.png' },
      { key:'mythic_stone', name:'神話石', icon:'Resource_06_Mythstone_20x20px.png' },
      { key:'immortal_stone', name:'不滅石', icon:'Resource_07_immotalstone_20x20px.png' },
      { key:'churu', name:'チュール', icon:'Resource_03_chur_20x20px.png' },
      { key:'diamond', name:'ダイヤ', icon:'Resource_08_dia_20x20px.png' },
      { key:'invite', name:'招待状', icon:'Resource_09_Scroll_20x20px.png' },
    ];
    const baseUrl = 'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/';
    elRateEditor.innerHTML = '';
    for(const it of items){
      const row = document.createElement('div');
      row.className = 'pt-rate-item';
      row.innerHTML = `
        <img class="pt-rate-icon" src="${baseUrl}${it.icon}" alt="${it.name}">
        <div class="pt-rate-name">${it.name}</div>
        <input class="pt-rate-input" type="number" inputmode="decimal" step="0.01" min="0" data-key="${it.key}" value="${String(rateBase[it.key] ?? 0)}" aria-label="${it.name}のレート">
      `;
      elRateEditor.appendChild(row);
    }
    elRateEditor.addEventListener('change', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLInputElement)) return;
      const k = t.dataset.key;
      if(!k) return;
      rateBase[k] = Number(t.value) || 0;
      applyAll();
    });
  }

function getEffectiveRates(){
    const r = {...rateBase};
    r.mine_key = Number(elMineKeyRate.value);
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
    return sum;
  }

  function baselineBudgetBestDia(budgetYen){
    const gcd = 100;
    const B = Math.max(0, Math.floor(budgetYen / gcd));
    if(B <= 0) return 0;

    const baseItems = baselinePacks
      .filter(p => p.is_active !== false)
      .map(p => ({ w: Math.floor(Number(p.price_yen)/gcd), v: Number(p.diamonds) }))
      .filter(it => it.w > 0 && it.v > 0);

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

    const dblItems = doublePacks
      .filter(p => p.is_active !== false)
      .filter(p => doubleAvailability[Number(p.price_yen)] !== false)
      .map(p => ({ w: Math.floor(Number(p.price_yen)/gcd), v: Number(p.diamonds) }))
      .filter(it => it.w > 0 && it.v > 0);

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
      const key = rowKey(r);
      const maxRaw = r.purchase_limit;
      const max = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999 : Number(maxRaw);
      const cap = (Number.isFinite(max) && max > 0) ? max : 999;

      const qty = clampInt(cart[key] ?? 0, 0, cap);
      cart[key] = qty;

      const maxDisp = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? '∞' : fmtNum(maxRaw);

      return `
      <tr data-key="${key}">
        <td class="name pt-namecell" title="${r.package_name}"><span class="pt-nameText">${fmtName(r.package_name)}</span><span class="pt-nameMeta">：${qty}/${maxDisp}</span></td>
        <td class="jpy">${fmtNum(r.jpy)}</td>

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
        <td class="calc">${(r._calc_dpy && r._calc_dpy>0) ? fmtFloat2(r._calc_dpy) : '-'}</td>
        <td class="calc">${fmtPct1(r._calc_budget_ratio)}</td>
      </tr>`;
    }).join('');
  }

  function calcAndSort(){
    const rates = getEffectiveRates();
    const budget = clampInt(elBudgetYen.value, 0, 200000);

    const budgetBestDia = baselineBudgetBestDia(budget);
    const budgetDiaPerYen = (budget > 0 && budgetBestDia > 0) ? (budgetBestDia / budget) : 0;

    const tiers = baselinePacks
      .filter(p => p.is_active !== false)
      .map(p => Number(p.price_yen))
      .filter(n => Number.isFinite(n) && n > 0);
    const uniq = Array.from(new Set(tiers)).sort((a,b)=>a-b);
    const enabled = uniq.filter(p => doubleAvailability[p] !== false).length;
    elKpi.textContent = `基準(予算${budget}) Dia/¥=${budgetDiaPerYen ? (Math.round(budgetDiaPerYen*1000)/1000).toFixed(3) : '-'} / 初回2倍: ${enabled}/${uniq.length}使用可`;

    const rows = packages.map(p => {
      const yen = Number(p.jpy) || 0;
      const dia = calcPackageDiaValue(p, rates);
      const dpy = yen > 0 ? (dia / yen) : 0;
      const budgetRatio = (budgetDiaPerYen > 0) ? (dpy / budgetDiaPerYen) : 0;
      return { ...p, _calc_dia: dia, _calc_dpy: dpy, _calc_budget_ratio: budgetRatio };
    });

    const mode = elSort.value;
    let out = rows.slice();
    switch(mode){
      case 'dpy_desc': out.sort((a,b)=> (b._calc_dpy||0) - (a._calc_dpy||0)); break;
      case 'budget_desc': out.sort((a,b)=> (b._calc_budget_ratio||0) - (a._calc_budget_ratio||0)); break;
      case 'dia_desc': out.sort((a,b)=> (b._calc_dia||0) - (a._calc_dia||0)); break;
      case 'jpy_asc': out.sort((a,b)=> (Number(a.jpy)||0) - (Number(b.jpy)||0)); break;
      case 'jpy_desc': out.sort((a,b)=> (Number(b.jpy)||0) - (Number(a.jpy)||0)); break;
      default: out.sort((a,b)=> (a.sort_order||0)-(b.sort_order||0)); break;
    }
    return { out, budgetDiaPerYen };
  }

  function updateSummary(rows, budgetDiaPerYen){
    let sumY = 0;
    let sumDia = 0;
    let sumQty = 0;
    const sumRes = {
      gold:0, mine_key:0, churu:0, battery:0, pet_food:0,
      mythic_stone:0, immortal_stone:0, diamond:0, invite:0
    };

    const picked = [];
    for(const r of rows){
      const key = rowKey(r);
      const maxRaw = r.purchase_limit;
      const max = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999 : Number(maxRaw);
      const cap = (Number.isFinite(max) && max > 0) ? max : 999;
      const qty = clampInt(cart[key] ?? 0, 0, cap);
      if(qty <= 0) continue;

      picked.push({ r, qty });

      sumQty += qty;
      sumY += (Number(r.jpy) || 0) * qty;
      sumDia += (Number(r._calc_dia) || 0) * qty;

      for(const k of RESOURCE_KEYS){
        sumRes[k] += (Number(r[k]) || 0) * qty;
      }
    }

    const dpy = sumY > 0 ? (sumDia / sumY) : 0;
    const ratioB = (budgetDiaPerYen > 0 && dpy > 0) ? (dpy / budgetDiaPerYen) : 0;

    const cls0 = (v) => ((Number(v)||0)===0 ? ' zero' : '');

    const totalRow = `
      <tr>
        <td class="name pt-namecell"><span class="pt-nameText">合計</span><span class="pt-nameMeta">${sumQty}</span></td>
        <td class="jpy">${fmtNum(sumY)}</td>

        <td class="res res-gold${cls0(sumRes.gold)}">${fmtNum(sumRes.gold)}</td>
        <td class="res res-mine_key${cls0(sumRes.mine_key)}">${fmtNum(sumRes.mine_key)}</td>
        <td class="res res-churu${cls0(sumRes.churu)}">${fmtNum(sumRes.churu)}</td>
        <td class="res res-battery${cls0(sumRes.battery)}">${fmtNum(sumRes.battery)}</td>
        <td class="res res-pet_food${cls0(sumRes.pet_food)}">${fmtNum(sumRes.pet_food)}</td>
        <td class="res res-mythic_stone${cls0(sumRes.mythic_stone)}">${fmtNum(sumRes.mythic_stone)}</td>
        <td class="res res-immortal_stone${cls0(sumRes.immortal_stone)}">${fmtNum(sumRes.immortal_stone)}</td>
        <td class="res res-diamond${cls0(sumRes.diamond)}">${fmtNum(sumRes.diamond)}</td>
        <td class="res res-invite${cls0(sumRes.invite)}">${fmtNum(sumRes.invite)}</td>

        <td class="calc">${fmtNum(sumDia)}</td>
        <td class="calc">${(sumY>0)?fmtFloat2(dpy):'-'}</td>
        <td class="calc">${fmtPct1(ratioB)}</td>
      </tr>`;

    const detailRows = picked.map(({r, qty}) => {
      const yen = (Number(r.jpy)||0) * qty;
      const dia = (Number(r._calc_dia)||0) * qty;
      const dpy2 = yen > 0 ? (dia / yen) : 0;
      const ratio2 = (budgetDiaPerYen > 0 && dpy2 > 0) ? (dpy2 / budgetDiaPerYen) : 0;
      const resMul = (k) => (Number(r[k])||0) * qty;

      return `
      <tr>
        <td class="name pt-namecell" title="${r.package_name}"><span class="pt-nameText">${fmtName(r.package_name)}</span><span class="pt-nameMeta">${fmtNum(qty)}</span></td>
        <td class="jpy">${fmtNum(yen)}</td>

        <td class="res res-gold${cls0(resMul('gold'))}">${fmtNum(resMul('gold'))}</td>
        <td class="res res-mine_key${cls0(resMul('mine_key'))}">${fmtNum(resMul('mine_key'))}</td>
        <td class="res res-churu${cls0(resMul('churu'))}">${fmtNum(resMul('churu'))}</td>
        <td class="res res-battery${cls0(resMul('battery'))}">${fmtNum(resMul('battery'))}</td>
        <td class="res res-pet_food${cls0(resMul('pet_food'))}">${fmtNum(resMul('pet_food'))}</td>
        <td class="res res-mythic_stone${cls0(resMul('mythic_stone'))}">${fmtNum(resMul('mythic_stone'))}</td>
        <td class="res res-immortal_stone${cls0(resMul('immortal_stone'))}">${fmtNum(resMul('immortal_stone'))}</td>
        <td class="res res-diamond${cls0(resMul('diamond'))}">${fmtNum(resMul('diamond'))}</td>
        <td class="res res-invite${cls0(resMul('invite'))}">${fmtNum(resMul('invite'))}</td>

        <td class="calc">${fmtNum(dia)}</td>
        <td class="calc">${(yen>0)?fmtFloat2(dpy2):'-'}</td>
        <td class="calc">${fmtPct1(ratio2)}</td>
      </tr>`;
    }).join('');

    if(elSummaryTbody){
      elSummaryTbody.innerHTML = totalRow + detailRows;
    }
  }

  
  function updateRowStates(tableBodyEl, selectedKey){
    if(!tableBodyEl) return;
    const rows = tableBodyEl.querySelectorAll('tr[data-key]');
    for(const tr of rows){
      const key = tr.getAttribute('data-key') || '';
      const qty = clampInt(cart[key] ?? 0, 0, 999999);
      const row = packages.find(p => rowKey(p) === key);
      const maxRaw = row ? row.purchase_limit : null;
      const maxNum = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999 : Number(maxRaw);
      const cap = (Number.isFinite(maxNum) && maxNum > 0) ? maxNum : 999;
      tr.classList.toggle('pt-has-qty', qty > 0);
      tr.classList.toggle('pt-at-cap', qty > 0 && qty >= cap);
      tr.classList.toggle('pt-row-selected', !!selectedKey && key === selectedKey);
    }
  }

function applyAll(){
    const { out, budgetDiaPerYen } = calcAndSort();
    render(out);
    updateSummary(out, budgetDiaPerYen);
    saveCart();
    status.textContent = `表示中：${out.length}件（計算反映）`;
  }

  function bumpQty(key, delta){
    const row = packages.find(p => rowKey(p) === key);
    if(!row) return;
    const maxRaw = row.purchase_limit;
    const max = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999 : Number(maxRaw);
    const cap = (Number.isFinite(max) && max > 0) ? max : 999;
    const cur = clampInt(cart[key] ?? 0, 0, cap);
    const next = clampInt(cur + delta, 0, cap);
    cart[key] = next;
  }

  try {
    loadCart();

    const [pkgRows, rateRows, baseRows, dblRows] = await Promise.all([
      fetchTable('ld_pay_packages', 'sort_order.asc'),
      fetchTable('ld_pay_exchange_rates', 'resource_key.asc'),
      fetchTable('ld_pay_baseline_diamond_packs', 'sort_order.asc'),
      fetchTable('ld_pay_first_double_diamond_packs', 'sort_order.asc')
    ]);

    packages = (pkgRows || []).filter(r => r.is_active !== false);
    baselinePacks = baseRows || [];
    doublePacks = dblRows || [];

    rateBase = {};
    toggles = {};
    for(const r of (rateRows||[])){
      const key = r.resource_key;
      if(!key) continue;
      rateBase[key] = Number(r.base_rate_diamond ?? 0) || 0;
      toggles[key] = true;
    }
    for(const k of RESOURCE_KEYS){
      if(!(k in rateBase)) rateBase[k] = 0;
      if(!(k in toggles)) toggles[k] = true;
    }

    buildResourceToggleUI();
    buildDoubleAvailabilityUI();
    buildRateEditorUI();

    // Auto recalcs
    elMineKeyRate.addEventListener('change', applyAll);
    elToggles.addEventListener('change', applyAll);
    if(elDoubleToggles) elDoubleToggles.addEventListener('change', applyAll);
    elSort.addEventListener('change', applyAll);

    // All toggle buttons
    if(elBtnResAll){
      elBtnResAll.addEventListener('click', ()=>{
        const allOn = RESOURCE_KEYS.every(k => toggles[k] === true);
        for(const k of RESOURCE_KEYS) toggles[k] = !allOn;
        buildResourceToggleUI();
        applyAll();
      });
    }
    if(elBtnDoubleAll){
      elBtnDoubleAll.addEventListener('click', ()=>{
        const tiers = Object.keys(doubleAvailability).map(n=>Number(n)).filter(n=>Number.isFinite(n));
        const allOn = tiers.length>0 && tiers.every(p => doubleAvailability[p] === true);
        for(const p of tiers) doubleAvailability[p] = !allOn;
        buildDoubleAvailabilityUI();
        applyAll();
      });
    }

    // Budget: no live recalc while typing
    const applyBudget = () => applyAll();
    elBudgetYen.addEventListener('blur', applyBudget);
    elBudgetYen.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault();
        elBudgetYen.blur();
        applyBudget();
      }
    });

    // Budget quick input popup
    const bOverlay = document.getElementById('ptBudgetOverlay');
    const bPopup   = document.getElementById('ptBudgetPopup');
    const bClose   = document.getElementById('ptBudgetClose');
    const bValue   = document.getElementById('ptBudgetValue');
    const bBack    = document.getElementById('ptBudgetBack');
    const bClear   = document.getElementById('ptBudgetClear');

    function getBudgetVal(){ return clampInt(elBudgetYen.value, 0, 200000); }
    function setBudgetVal(v){
      const nv = clampInt(v, 0, 200000);
      elBudgetYen.value = String(nv);
      if(bValue) bValue.textContent = fmtNum(nv);
      applyAll();
    }
    function openBudgetPopup(){
      if(!bOverlay || !bPopup) return;
      const v = getBudgetVal();
      if(bValue) bValue.textContent = fmtNum(v);
      bOverlay.hidden = false; bPopup.hidden = false;
      // show slightly above center
      const h = bPopup.getBoundingClientRect().height || 260;
      const y = Math.max(8, Math.min(window.innerHeight - h - 8, window.innerHeight*0.25));
      bPopup.style.top = y + 'px';
    }
    function closeBudgetPopup(){
      if(!bOverlay || !bPopup) return;
      bOverlay.hidden = true; bPopup.hidden = true;
    }
    if(elBudgetQuick) elBudgetQuick.addEventListener('click', openBudgetPopup);
    if(bOverlay) bOverlay.addEventListener('click', closeBudgetPopup);
    if(bClose) bClose.addEventListener('click', closeBudgetPopup);
    if(bBack) bBack.addEventListener('click', closeBudgetPopup);
    if(bClear) bClear.addEventListener('click', ()=> setBudgetVal(0));

    bPopup?.addEventListener('click', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      const btn = t.closest('[data-delta]');
      if(!btn) return;
      const delta = Number(btn.getAttribute('data-delta'));
      if(!Number.isFinite(delta)) return;
      setBudgetVal(getBudgetVal() + delta);
    });

    // purchase popup handlers (open only from 1st column)
    let lastTap = {x:0,y:0,moved:false};
    tbody.addEventListener('pointerdown', (e)=>{
      lastTap = {x:e.clientX,y:e.clientY,moved:false};
    }, {passive:true});
    tbody.addEventListener('pointermove', (e)=>{
      if(Math.abs(e.clientX-lastTap.x)+Math.abs(e.clientY-lastTap.y) > 6){
        lastTap.moved = true;
      }
    }, {passive:true});

    const overlay = document.getElementById('ptPopupOverlay');
    const popup = document.getElementById('ptPkgPopup');
    const popTitle = document.getElementById('ptPopupTitle');
    const popClose = document.getElementById('ptPopupClose');
    const popMinus = document.getElementById('ptPopupMinus');
    const popPlus  = document.getElementById('ptPopupPlus');
    const popMaxBtn = document.getElementById('ptPopupMaxBtn');
    const popQty   = document.getElementById('ptPopupQty');
    const popMax   = document.getElementById('ptPopupMax');
    const popSum   = document.getElementById('ptPopupSum');

    let popKey = null;
    let selectedKeyMain = null;
    let selectedKeySummary = null;

    function closePopup(){
      if(!overlay || !popup) return;
      overlay.hidden = true;
      popup.hidden = true;
      popKey = null;
    }

    function openPopupFor(key, clientY){
      const row = packages.find(p => rowKey(p) === key);
      if(!row || !overlay || !popup) return;

      popKey = key;
      const maxRaw = row.purchase_limit;
      const max = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999 : Number(maxRaw);
      const cap = (Number.isFinite(max) && max > 0) ? max : 999;

      const qty = clampInt(cart[key] ?? 0, 0, cap);
      const maxDisp = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? '∞' : fmtNum(maxRaw);

      popTitle.textContent = row.package_name ?? '';
      popQty.textContent = String(qty);
      popMax.textContent = String(maxDisp);
      popSum.textContent = fmtNum((Number(row.jpy)||0) * qty);

      popMinus.disabled = qty <= 0;
      popPlus.disabled  = qty >= cap;
      if(popMaxBtn){
        const showMax = (cap - qty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = qty >= cap;
        popPlus.classList.toggle('pt-popup-btn--solo', !showMax);
      }
      if(popMaxBtn){
        const showMax = (cap - qty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = qty >= cap;
        // layout: if no MAX, plus spans both columns
        popPlus.classList.toggle('pt-popup-btn--solo', !showMax);
      }

      overlay.hidden = false;
      popup.hidden = false;

      // position slightly above tap
      popup.style.top = '8px';
      const h = popup.getBoundingClientRect().height || 140;
      const y = Math.max(8, Math.min(window.innerHeight - h - 8, (clientY || (window.innerHeight*0.5)) - h - 10));
      popup.style.top = y + 'px';
    }

    function updatePopup(){
      if(!popKey) return;
      const row = packages.find(p => rowKey(p) === popKey);
      if(!row) return;
      const maxRaw = row.purchase_limit;
      const max = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999 : Number(maxRaw);
      const cap = (Number.isFinite(max) && max > 0) ? max : 999;
      const qty = clampInt(cart[popKey] ?? 0, 0, cap);
      popQty.textContent = String(qty);
      popSum.textContent = fmtNum((Number(row.jpy)||0) * qty);
      popMinus.disabled = qty <= 0;
      popPlus.disabled  = qty >= cap;
      if(popMaxBtn){
        const showMax = (cap - qty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = qty >= cap;
        popPlus.classList.toggle('pt-popup-btn--solo', !showMax);
      }
      if(popMaxBtn){
        const showMax = (cap - qty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = qty >= cap;
        // layout: if no MAX, plus spans both columns
        popPlus.classList.toggle('pt-popup-btn--solo', !showMax);
      }
    }

    if(overlay) overlay.addEventListener('click', closePopup);
    if(popClose) popClose.addEventListener('click', closePopup);
      document.addEventListener('dblclick', (e)=>{ e.preventDefault(); }, {passive:false}); // prevent double-tap zoom
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closePopup(); });

    if(popMinus) popMinus.addEventListener('click', ()=>{
      if(!popKey) return;
      bumpQty(popKey, -1);
      applyAll();
      updatePopup();
    });
    if(popPlus) popPlus.addEventListener('click', ()=>{
      if(!popKey) return;
      bumpQty(popKey, +1);
      applyAll();
      updatePopup();
    });

    
    // Row selection + popup rule:
    // - tap row (non-name cell) -> select
    // - tap outside selected row -> clear selection
    // - when selected, tap name cell -> open popup
    tbody.addEventListener('click', (e)=>{
      if(lastTap.moved) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if(!el) return;

      const tr = el.closest('tr[data-key]');
      const tdName = el.closest('td.name');

      if(!tr){
        // click on empty area => clear selection
        selectedKeyMain = null;
        updateRowStates(tbody, selectedKeyMain);
        return;
      }

      const key = tr.getAttribute('data-key');
      if(!key) return;

      if(tdName){
        if(selectedKeyMain === key){
          openPopupFor(key, lastTap.y || e.clientY);
        }else{
          // tapping name when not selected => just select
          selectedKeyMain = key;
          updateRowStates(tbody, selectedKeyMain);
        }
        return;
      }

      // non-name cell => select
      selectedKeyMain = key;
      updateRowStates(tbody, selectedKeyMain);
    });
applyAll();
  } catch (e) {
    console.error(e);
    status.textContent = 'データの取得に失敗しました（Supabase接続/テーブル名を確認）';
  }
})();
/* Phase3v6: Horizontal scroll sync between list table and summary table */
function syncHorizontalScroll(a, b){
  let syncing = false;
  const onA = () => {
    if (syncing) return;
    syncing = true;
    b.scrollLeft = a.scrollLeft;
    syncing = false;
  };
  const onB = () => {
    if (syncing) return;
    syncing = true;
    a.scrollLeft = b.scrollLeft;
    syncing = false;
  };
  a.addEventListener('scroll', onA, { passive: true });
  b.addEventListener('scroll', onB, { passive: true });
}

window.addEventListener('load', () => {
  const listX = document.getElementById('tableScroll') || document.querySelector('#tableScroll');
  const sumX  = document.getElementById('summaryScroll') || document.querySelector('#summaryScroll');
  if(listX && sumX) syncHorizontalScroll(listX, sumX);
}, { once:true });
