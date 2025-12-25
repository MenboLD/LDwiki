(async () => {
  const status = document.getElementById('ptStatus');
  const tbody = document.getElementById('payTableBody');
  const elSelectedInfo = document.getElementById('selectedRowInfo');
  const elSelectedInfoText = document.getElementById('selectedRowInfoText');

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


  // row selection state (main + summary)
  let selectedKeyMain = null;
  let selectedKeySummary = null;

  // last computed rows (for selected-row info)
  let lastRowsMain = [];
  let lastSummaryDetail = [];
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
        <td class="name sticky-col sticky-col1" title="${r.package_name}"><span class="pt-nameText">${fmtName(r.package_name)}</span></td>
        <td class="count sticky-col sticky-col2"><span class="pt-countText">${qty}/${maxDisp}</span></td>
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

        lastRowsMain = rows;
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
    const detailItems = [];


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
        <td class="name sticky-col sticky-col1 pt-summary-total-label">合計</td>
        <td class="count sticky-col sticky-col2 pt-summary-total-qty"><span class="pt-countText">${sumQty}</span></td>
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

      const key = rowKey(r);
      detailItems.push({
        key,
        package_name: r.package_name,
        qty,
        purchase_limit: r.purchase_limit,
        yen,
        dia,
        dpy: dpy2,
        ratio: ratio2,
        res: {
          gold: resMul('gold'),
          mine_key: resMul('mine_key'),
          churu: resMul('churu'),
          battery: resMul('battery'),
          pet_food: resMul('pet_food'),
          mythic_stone: resMul('mythic_stone'),
          immortal_stone: resMul('immortal_stone'),
          diamond: resMul('diamond'),
          invite: resMul('invite'),
        }
      });

      return `
      <tr data-key="${rowKey(r)}">
         <td class="name sticky-col sticky-col1" title="${r.package_name}"><span class="pt-nameText">${fmtName(r.package_name)}</span></td>
         <td class="count sticky-col sticky-col2"><span class="pt-countText">${fmtNum(qty)}</span></td>
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
    lastSummaryDetail = detailItems;
    updateSelectedInfo();
  }

  
  
  function updateSelectedInfo(){
    if(!elSelectedInfoText) return;

    const key = selectedKeyMain || selectedKeySummary;
    if(!key){
      elSelectedInfoText.classList.add('pt-selected-placeholder');
      elSelectedInfoText.textContent = '選択された行の商品内容がここに表示されます';
      return;
    }

    const row = packages.find(p => rowKey(p) === key) || (lastRowsMain||[]).find(r=>rowKey(r)===key);
    if(!row){
      elSelectedInfoText.classList.add('pt-selected-placeholder');
      elSelectedInfoText.textContent = '選択された行の商品内容がここに表示されます';
      return;
    }

    // Show raw package content (NOT multiplied by purchase qty)
    const yen = Number(row.jpy)||0;

    const RES = [
      {k:'gold', alt:'ゴールド',  icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_01_gold_20x20px.png'},
      {k:'mine_key', alt:'鉱山の鍵', icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_02_key_20x20px.png'},
      {k:'churu', alt:'チュール',   icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_03_chur_20x20px.png'},
      {k:'battery', alt:'バッテリー', icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_04_battery_20x20px.png'},
      {k:'pet_food', alt:'ペットフード', icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_05_petfood_20x20px.png'},
      {k:'mythic_stone', alt:'神話石', icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_06_Mythstone_20x20px.png'},
      {k:'immortal_stone', alt:'不滅石', icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_07_immotalstone_20x20px.png'},
      {k:'diamond', alt:'ダイヤ', icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_08_dia_20x20px.png'},
      {k:'invite', alt:'招待状', icon:'https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_Resource_20px/Resource_09_Scroll_20x20px.png'},
    ];

    const parts = [];
    parts.push(`<span class="pt-sel-price">¥${fmtNum(yen)}</span>`);
    for(const r of RES){
      const v = Number(row[r.k]||0);
      if(!v) continue;
      parts.push(`<span class="pt-sel-item"><img class="pt-sel-ico" src="${r.icon}" alt="${r.alt}"><span class="pt-sel-val">${fmtNum(v)}</span></span>`);
    }

    elSelectedInfoText.classList.remove('pt-selected-placeholder');
    elSelectedInfoText.innerHTML = `<div class="pt-sel-items">${parts.join('')}</div>`;
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
    updateSelectedInfo();
  }


  function normalizeSelection(){
    // 選択キーがDOMから消えていたら解除（合計テーブルの0化など）
    if(selectedKeyMain){
      const exists = !!tbody?.querySelector(`tr[data-key="${CSS.escape(selectedKeyMain)}"]`);
      if(!exists) selectedKeyMain = null;
    }
    if(selectedKeySummary){
      const exists = !!elSummaryTbody?.querySelector(`tr[data-key="${CSS.escape(selectedKeySummary)}"]`);
      if(!exists) selectedKeySummary = null;
    }
  }

  function applyRowClasses(){
    normalizeSelection();
    updateRowStates(tbody, selectedKeyMain);
    if(elSummaryTbody) updateRowStates(elSummaryTbody, selectedKeySummary);
  }

function applyAll(){
    const { out, budgetDiaPerYen } = calcAndSort();
    render(out);
    updateSummary(out, budgetDiaPerYen);
    // 量に応じた行背景色/上限到達色/選択枠などの状態は、描画のたび必ず反映する
    applyRowClasses();
    updateSelectedInfo();
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
    const bPurchased = document.getElementById('ptBudgetPurchased');
    const bClear   = document.getElementById('ptBudgetClear');
    const bOk      = document.getElementById('ptBudgetOk');

    function getBudgetVal(){ return clampInt(elBudgetYen.value, 0, 200000); }

    // decision-style temp value (only applied on OK)
    let bTemp = 0;

    function calcPurchasedYen(){
      let sum = 0;
      for(const p of (packages||[])){
        const key = rowKey(p);
        const qty = clampInt(cart[key] ?? 0, 0, 999999);
        if(qty <= 0) continue;
        sum += (Number(p.jpy)||0) * qty;
      }
      return sum;
    }

    function refreshBudgetPopupUI(){
      if(bValue) bValue.textContent = fmtNum(bTemp);
      if(bPurchased) bPurchased.textContent = fmtNum(calcPurchasedYen());
    }

    function openBudgetPopup(){
      if(!bOverlay || !bPopup) return;
      bTemp = getBudgetVal();
      refreshBudgetPopupUI();
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

    function commitBudget(){
      const nv = clampInt(bTemp, 0, 200000);
      elBudgetYen.value = String(nv);
      applyAll();
      closeBudgetPopup();
    }

    if(elBudgetQuick) elBudgetQuick.addEventListener('click', openBudgetPopup);
    if(bOverlay) bOverlay.addEventListener('click', closeBudgetPopup);
    if(bClose) bClose.addEventListener('click', closeBudgetPopup);
    if(bClear) bClear.addEventListener('click', ()=>{ bTemp = 0; refreshBudgetPopupUI(); });
    if(bOk) bOk.addEventListener('click', commitBudget);

    bPopup?.addEventListener('click', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      const btn = t.closest('[data-delta]');
      if(!btn) return;
      const delta = Number(btn.getAttribute('data-delta'));
      if(!Number.isFinite(delta)) return;
      bTemp = clampInt(bTemp + delta, 0, 200000);
      refreshBudgetPopupUI();
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
    const popClear = document.getElementById('ptPopupClear');
    const popMinus = document.getElementById('ptPopupMinus');
    const popPlus  = document.getElementById('ptPopupPlus');
    const popMaxBtn = document.getElementById('ptPopupMaxBtn');
    const popQty   = document.getElementById('ptPopupQty');
    const popMax   = document.getElementById('ptPopupMax');
    const popSum   = document.getElementById('ptPopupSum');
    const popOk    = document.getElementById('ptPopupOk');

    let popKey = null;
    let popTempQty = 0;
    let popCap = 0;
    let popDirty = false;


    function closePopup(){
      if(!overlay || !popup) return;
      overlay.hidden = true;
      popup.hidden = true;
      popKey = null;
      popDirty = false;
    }

    function openPopupFor(key, clientY){
      const row = packages.find(p => rowKey(p) === key);
      if(!row || !overlay || !popup) return;

      popKey = key;
      const maxRaw = row.purchase_limit;
      const max = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999 : Number(maxRaw);
      const cap = (Number.isFinite(max) && max > 0) ? max : 999;

      popCap = cap;
      popTempQty = clampInt(cart[key] ?? 0, 0, cap);
      popDirty = false;
      const maxDisp = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? '∞' : fmtNum(maxRaw);

      popTitle.textContent = row.package_name ?? '';
      popQty.textContent = String(popTempQty);
      popMax.textContent = String(maxDisp);
      popSum.textContent = fmtNum((Number(row.jpy)||0) * popTempQty);

      popMinus.disabled = popTempQty <= 0;
      popPlus.disabled  = popTempQty >= popCap;
      if(popClear){
        const showClear = popTempQty >= 2;
        popClear.hidden = !showClear;
        popMinus.classList.toggle('pt-popup-btn--solo', !showClear);
      }
      if(popMaxBtn){
        const showMax = (popCap - popTempQty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = popTempQty >= popCap;
        popPlus.classList.toggle('pt-popup-btn--solo', !showMax);
      }
      if(popMaxBtn){
        const showMax = (popCap - popTempQty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = popTempQty >= popCap;
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
      popQty.textContent = String(popTempQty);
      popSum.textContent = fmtNum((Number(row.jpy)||0) * popTempQty);
      popMinus.disabled = popTempQty <= 0;
      popPlus.disabled  = popTempQty >= popCap;
      if(popMaxBtn){
        const showMax = (popCap - popTempQty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = popTempQty >= popCap;
        popPlus.classList.toggle('pt-popup-btn--solo', !showMax);
      }
      if(popMaxBtn){
        const showMax = (popCap - popTempQty) >= 2;
        popMaxBtn.hidden = !showMax;
        popMaxBtn.disabled = popTempQty >= popCap;
        // layout: if no MAX, plus spans both columns
        popPlus.classList.toggle('pt-popup-btn--solo', !showMax);
      }
    }

    if(overlay) overlay.addEventListener('click', closePopup);
    if(popClose) popClose.addEventListener('click', closePopup);
      document.addEventListener('dblclick', (e)=>{ e.preventDefault(); }, {passive:false}); // prevent double-tap zoom
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closePopup(); });

    function setPopupQty(next){
  if(popKey === null) return;
  popTempQty = clampInt(next, 0, popCap || 999);
  popDirty = true;
  updatePopup();
}
if(popMinus) popMinus.addEventListener('click', ()=>{
      if(!popKey) return;
      setPopupQty(popTempQty - 1);
    });
    if(popPlus) popPlus.addEventListener('click', ()=>{
      if(!popKey) return;
      setPopupQty(popTempQty + 1);
    });

if(popMaxBtn) popMaxBtn.addEventListener('click', ()=>{
  if(popKey === null) return;
  setPopupQty(popCap);
});
if(popClear) popClear.addEventListener('click', ()=>{
  if(popKey === null) return;
  setPopupQty(0);
});
if(popOk) popOk.addEventListener('click', ()=>{
  if(popKey === null) return;
  const committed = clampInt(popTempQty, 0, popCap || 999);
  cart[popKey] = committed;
  saveCart();
  applyAll();
  closePopup();
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
      const tdPkg = el.closest('td.name, td.count');

      if(!tr){
        // click on empty area => clear selection
        selectedKeyMain = null;
        updateRowStates(tbody, selectedKeyMain);
        return;
      }

      const key = tr.getAttribute('data-key');
      if(!key) return;

      // パッケージ列（名前/購入数）タップ
      if(tdPkg){
        if(selectedKeyMain === key){
          openPopupFor(key, lastTap.y || e.clientY);
        }else{
          selectedKeyMain = key;
          selectedKeySummary = null; // mutual exclusive selection
          updateRowStates(elSummaryTbody, selectedKeySummary);
          updateRowStates(tbody, selectedKeyMain);
        }
        return;
      }

      // それ以外をタップ：選択中の同一行なら解除、別行なら選択
      if(selectedKeyMain === key){
        selectedKeyMain = null;
      }else{
        selectedKeyMain = key;
        selectedKeySummary = null;
        updateRowStates(elSummaryTbody, selectedKeySummary);
      }
      updateRowStates(tbody, selectedKeyMain);
    });

    if(elSummaryTbody){
      // pointer tracking for tap vs scroll on summary table
      elSummaryTbody.addEventListener('pointerdown', (e)=>{
        lastTap.x = e.clientX; lastTap.y = e.clientY; lastTap.moved = false;
      }, { passive:true });
      elSummaryTbody.addEventListener('pointermove', (e)=>{
        const dx = Math.abs(e.clientX - lastTap.x);
        const dy = Math.abs(e.clientY - lastTap.y);
        if(dx > 8 || dy > 8) lastTap.moved = true;
      }, { passive:true });

      elSummaryTbody.addEventListener('click', (e)=>{
        if(lastTap.moved) return;
        const el = e.target instanceof HTMLElement ? e.target : null;
        if(!el) return;

        const tr = el.closest('tr[data-key]');
        const tdPkg = el.closest('td.name, td.count');

        if(!tr){
          selectedKeySummary = null;
          updateRowStates(elSummaryTbody, selectedKeySummary);
          return;
        }

        const key = tr.getAttribute('data-key');
        if(!key) return;

        if(tdPkg){
          if(selectedKeySummary === key){
            openPopupFor(key, lastTap.y || e.clientY);
          }else{
            selectedKeySummary = key;
            selectedKeyMain = null;
            updateRowStates(tbody, selectedKeyMain);
            updateRowStates(elSummaryTbody, selectedKeySummary);
          }
          return;
        }

        if(selectedKeySummary === key){
          selectedKeySummary = null;
        }else{
          selectedKeySummary = key;
          selectedKeyMain = null;
          updateRowStates(tbody, selectedKeyMain);
        }
        updateRowStates(elSummaryTbody, selectedKeySummary);
      });
    }

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

/* iOS Safari: prevent tiny accidental horizontal drift while the user is clearly vertical-scrolling */
function installVerticalScrollXLock(scroller){
  if(!scroller) return;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let mode = null; // 'h' | 'v'

  scroller.addEventListener('touchstart', (e) => {
    if(!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startLeft = scroller.scrollLeft;
    mode = null;
  }, { passive: true });

  scroller.addEventListener('touchmove', (e) => {
    if(!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Decide gesture direction a bit earlier, but avoid misclassifying slight diagonal drags.
    if(!mode){
      const TH = 6;
      const R  = 1.2;
      if(ady > TH && ady >= adx * R) mode = 'v';
      else if(adx > TH && adx >= ady * R) mode = 'h';
    }

    if(mode === 'v'){
      // keep X fixed; allow normal Y scrolling (no preventDefault)
      if(scroller.scrollLeft !== startLeft) scroller.scrollLeft = startLeft;
    }
  }, { passive: true });

  scroller.addEventListener('touchend', () => { mode = null; }, { passive: true });
}

window.addEventListener('load', () => {
  const listX = document.querySelector('.pt-table-wrap') || document.getElementById('tableScroll') || document.querySelector('#tableScroll');
  const sumX  = document.getElementById('summaryScroll') || document.querySelector('#summaryScroll');

  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if(isIOS){
    installVerticalScrollXLock(listX);
    installVerticalScrollXLock(sumX);
  }

  // 横スクロール同期（任意）。両方存在する場合のみ有効化。
  if(listX && sumX) syncHorizontalScroll(listX, sumX);
}, { once:true });