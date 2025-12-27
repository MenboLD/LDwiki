(async () => {
  const status = document.getElementById('ptStatus');
  const tbody = document.getElementById('payTableBody');
  const elSelectedInfo = document.getElementById('selectedRowInfo');
  const elSelectedInfoText = document.getElementById('selectedRowInfoText');
  const elPlannedSummaryText = document.getElementById('ptPlannedSummaryText');

  let elMineKeyRate = null;
  const elBudgetYen = document.getElementById('optBudgetYen');
  const elBudgetQuick = document.getElementById('btnBudgetQuick');
  const elBtnCategoryFilter = document.getElementById('btnCategoryFilter');
  const elCategoryFilterSummary = document.getElementById('ptCategoryFilterSummary');
  const elRateEditor = document.getElementById('rateEditor');
  const elRateReset = document.getElementById('btnRateReset');
  const elBtnResAll = document.getElementById('btnResAll');
  const elBtnDoubleAll = document.getElementById('btnDoubleAll');
    const elToggles = document.getElementById('resourceToggles');
  const elDoubleToggles = document.getElementById('doubleToggles');
  const elSort = document.getElementById('optSort');
  const elQtySort = document.getElementById('optQtySort');
  const elKpi = null;
  const elSummaryTbody = document.getElementById('summaryTableBody');

  function fmtName(name){ return name ?? ""; }
  const _nf = new Intl.NumberFormat('ja-JP');
  function fmtNum(v){
    if(v === null || v === undefined || v === '') return '0';
    const n = Number(String(v).replaceAll(',', '').trim());
    if(!Number.isFinite(n)) return String(v);
    return _nf.format(Math.round(n));
  }
  function fmtYen(n){ return `¥${fmtNum(n)}`; }
  function fmtFloat2(v){
    if(!Number.isFinite(v) || v <= 0) return '-';
    return (Math.round(v * 100) / 100).toFixed(2);
  }
  function fmtPct1(v){
    if(!Number.isFinite(v) || v <= 0) return '-';
    return (Math.round(v * 1000) / 10).toFixed(1) + '%';
  }
  function clampInt(n, min, max){
    // accept strings with commas/spaces (e.g., "15,000")
    if(typeof n === "string") n = n.replaceAll(/[,\s]/g, "");
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
  let initialRateBase = null;
  let toggles = {};

  // ---------- Sort State (base / icon / qty) ----------
  const ICON_SORT_KEYS = ['mine_key','churu','battery','pet_food','mythic_stone','immortal_stone','diamond','invite'];
  let sortStamp = 3;
  const sortState = {
    base: { mode: (elSort && elSort.value) ? elSort.value : 'default', lastChanged: 3 },
    icon: { key: null, dir: 'desc', lastChanged: 2 },
    qty:  { enabled: false, lastChanged: 1 },
  };
  function bumpSort(which){
    sortStamp += 1;
    if(sortState[which]) sortState[which].lastChanged = sortStamp;
  }
  function getActiveSorts(){
    const out = [];
    out.push({ type:'base', lastChanged: sortState.base.lastChanged });
    if(sortState.icon.key && ICON_SORT_KEYS.includes(sortState.icon.key) && (toggles[sortState.icon.key] !== false)){
      out.push({ type:'icon', key: sortState.icon.key, dir: sortState.icon.dir, lastChanged: sortState.icon.lastChanged });
    }
    if(sortState.qty.enabled){
      out.push({ type:'qty', lastChanged: sortState.qty.lastChanged });
    }
    out.sort((a,b)=> (b.lastChanged||0) - (a.lastChanged||0));
    return out;
  }
  function cmpNumber(va, vb, dir){
    const a = Number.isFinite(va) ? va : (Number(va) || 0);
    const b = Number.isFinite(vb) ? vb : (Number(vb) || 0);
    return (dir === 'asc') ? (a - b) : (b - a);
  }
  function cmpBase(a,b,mode){
    switch(mode){
      case 'dpy_desc': return cmpNumber(a._calc_dpy||0, b._calc_dpy||0, 'desc');
      case 'budget_desc': return cmpNumber(a._calc_budget_ratio||0, b._calc_budget_ratio||0, 'desc');
      case 'dia_desc': return cmpNumber(a._calc_dia||0, b._calc_dia||0, 'desc');
      case 'jpy_asc': return cmpNumber(Number(a.jpy)||0, Number(b.jpy)||0, 'asc');
      case 'jpy_desc': return cmpNumber(Number(a.jpy)||0, Number(b.jpy)||0, 'desc');
      default: return cmpNumber(a.sort_order||0, b.sort_order||0, 'asc');
    }
  }
  function cmpIcon(a,b,key,dir){
    return cmpNumber(Number(a[key])||0, Number(b[key])||0, dir);
  }
  function cmpQty(a,b){
    // Purchase-amount priority (total planned spend in JPY), using effective quantity.
    const ta = (Number(a.jpy)||0) * (a._effQty||0);
    const tb = (Number(b.jpy)||0) * (b._effQty||0);
    if(tb !== ta) return tb - ta; // desc
    // tie-breaker: higher effective quantity first
    const qa = (a._effQty||0);
    const qb = (b._effQty||0);
    if(qb !== qa) return qb - qa;
    return 0;
  }
  function cmpStableKey(a,b){
    const ka = String(a._key ?? rowKey(a));
    const kb = String(b._key ?? rowKey(b));
    if(ka < kb) return -1;
    if(ka > kb) return 1;
    return 0;
  }
  function multiCompare(a,b,activeSorts){
    for(const s of activeSorts){
      let d = 0;
      if(s.type === 'base') d = cmpBase(a,b, sortState.base.mode);
      else if(s.type === 'icon') d = cmpIcon(a,b, s.key, s.dir);
      else if(s.type === 'qty') d = cmpQty(a,b);
      if(d !== 0) return d;
    }
    return cmpStableKey(a,b);
  }

  function setIconSort(key){
    if(!ICON_SORT_KEYS.includes(key)) return;
    if(sortState.icon.key === key){
      sortState.icon.dir = (sortState.icon.dir === 'desc') ? 'asc' : 'desc';
    }else{
      sortState.icon.key = key;
      sortState.icon.dir = 'desc';
    }
    bumpSort('icon');
    updateIconSortAria();
    applyAll();
  }

  function updateIconSortAria(){
    const table = document.querySelector('.pt-table:not(.pt-table-summary)');
    if(!table) return;
    const ths = Array.from(table.querySelectorAll('thead th.res'));
    for(const th of ths){
      th.removeAttribute('aria-sort');
    }
    if(!sortState.icon.key) return;
    const activeTh = table.querySelector(`thead th.res-${sortState.icon.key}`);
    if(activeTh){
      activeTh.setAttribute('aria-sort', sortState.icon.dir === 'asc' ? 'ascending' : 'descending');
    }
  }

  function installIconSortHandlers(){
    const table = document.querySelector('.pt-table:not(.pt-table-summary)');
    if(!table) return;
    const ths = Array.from(table.querySelectorAll('thead th.res'));
    for(const th of ths){
      const cls = Array.from(th.classList).find(c => c.startsWith('res-'));
      if(!cls) continue;
      const key = cls.replace('res-','');
      if(!ICON_SORT_KEYS.includes(key)) continue;
      th.classList.add('pt-icon-sortable');
      th.addEventListener('click', (e)=>{
        e.preventDefault();
        setIconSort(key);
      });
    }
  }

  let baselinePacks = [];
  let doublePacks = [];
  let doubleAvailability = {}; // price_yen -> bool
  let doublePackDiamondByPrice = {}; // price_yen -> diamonds (first-double pack)

  function rebuildDoublePackIndex(){
    doublePackDiamondByPrice = {};
    for(const p of (doublePacks || [])){
      if(!p || p.is_active === false) continue;
      const price = Number(p.price_yen);
      const dia = Number(p.diamonds);
      if(!Number.isFinite(price) || price <= 0) continue;
      if(!Number.isFinite(dia) || dia <= 0) continue;
      doublePackDiamondByPrice[price] = dia;
    }
  }

  function isFirstDoubleDiamondRow(row){
    if(!row) return false;
    const cat = normalizeCategoryKey(row.category_key);
    if(cat !== 'normal_diamond' && cat !== 'limited_diamond') return false;
    const price = Number(row.jpy ?? 0);
    if(!Number.isFinite(price) || price <= 0) return false;
    const target = doublePackDiamondByPrice[price];
    if(!Number.isFinite(target) || target <= 0) return false;
    const dia = Number(row.diamond ?? 0);
    if(!Number.isFinite(dia) || dia <= 0) return false;
    return Math.abs(dia - target) < 0.0001;
  }

  function isRowAllowedByFirstDoubleSetting(row){
    if(!isFirstDoubleDiamondRow(row)) return true;
    const price = Number(row.jpy ?? 0);
    return (doubleAvailability[price] !== false);
  }

  function applyFirstDoubleSettingToCartForPrice(price){
    if(!Number.isFinite(price) || price <= 0) return;
    if(doubleAvailability[price] !== false) return;
    for(const p of (packages || [])){
      if(!isFirstDoubleDiamondRow(p)) continue;
      const pPrice = Number(p.jpy ?? 0);
      if(pPrice !== price) continue;
      const key = rowKey(p);
      cart[key] = 0;
    }
    saveCart();
  }

  function applyFirstDoubleSettingToCartAll(){
    for(const k of Object.keys(doubleAvailability || {})){
      const price = Number(k);
      if(doubleAvailability[price] === false) applyFirstDoubleSettingToCartForPrice(price);
    }
  }

  let cart = {}; // key -> qty


  // row selection state (main + summary)
  let selectedKeyMain = null;
  let selectedKeySummary = null;

  // last computed rows (for selected-row info)
  let lastRowsMain = [];
  let lastSummaryDetail = [];
  const CART_LS_KEY = "ld_paytool_cart_v1";
  const CAT_FILTER_LS_KEY = "ld_paytool_cat_filter_v1";
  const DOUBLE_AVAIL_LS_KEY = "ld_paytool_double_avail_v1";


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
  
  // === Category filter (UI + calc visibility) ===
  const CATEGORY_DEFS = [
    { key:'weekly',         label:'週間',     aliases:['weekly','週間'] },
    { key:'monthly',        label:'月間',     aliases:['monthly','月間'] },
    { key:'period_pass',    label:'期間パス', aliases:['period_pass','期間パス'] },
    { key:'limited_pass',   label:'限定パス', aliases:['limited_pass','限定パス'] },
    { key:'badge',          label:'バッジ',   aliases:['badge','バッジ'] },
    { key:'normal_diamond', label:'通常ダイヤ', aliases:['normal_diamond','通常ダイヤ'] },
    { key:'limited_diamond',label:'限定ダイヤ', aliases:['limited_diamond','限定ダイヤ'] },
  ];

  const CATEGORY_ALIAS_TO_KEY = (() => {
    const map = {};
    for(const d of CATEGORY_DEFS){
      for(const a of (d.aliases||[])){
        map[String(a).toLowerCase()] = d.key;
      }
      map[String(d.key).toLowerCase()] = d.key;
    }
    return map;
  })();

  function defaultCategoryFilter(){
    return {
      weekly: true,
      monthly: true,
      period_pass: true,
      limited_pass: true,
      normal_diamond: true,
      limited_diamond: true,
      badge: {
        vvip: true,
        vvip_cont: true,
        vip: true,
        vip_cont: true
      }
    };
  }

  let categoryFilter = defaultCategoryFilter();

  function loadCategoryFilter(){
    try{
      const raw = localStorage.getItem(CAT_FILTER_LS_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== 'object') return;

      // merge with defaults to keep forward compatibility
      const def = defaultCategoryFilter();
      for(const k of Object.keys(def)){
        if(k === 'badge'){
          def.badge = def.badge || {};
          const src = (obj.badge && typeof obj.badge === 'object') ? obj.badge : {};
          for(const bk of Object.keys(def.badge)){
            if(typeof src[bk] === 'boolean') def.badge[bk] = src[bk];
          }
        }else{
          if(typeof obj[k] === 'boolean') def[k] = obj[k];
        }
      }
      categoryFilter = def;
    }catch(_e){}
  }

  function saveCategoryFilter(){
    try{
      localStorage.setItem(CAT_FILTER_LS_KEY, JSON.stringify(categoryFilter));
    }catch(_e){}
  }

  
  function loadDoubleAvailability(){
    try{
      const raw = localStorage.getItem(DOUBLE_AVAIL_LS_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(obj && typeof obj === 'object') doubleAvailability = obj;
    }catch(_e){}
  }

  function saveDoubleAvailability(){
    try{
      localStorage.setItem(DOUBLE_AVAIL_LS_KEY, JSON.stringify(doubleAvailability));
    }catch(_e){}
  }
function normalizeCategoryKey(raw){
    if(raw === null || raw === undefined || raw === '') return null;
    const k = String(raw).toLowerCase();
    return CATEGORY_ALIAS_TO_KEY[k] || null;
  }

  function badgeSubKeyFromName(name){
    const s = String(name || '');
    const isVVIP = s.includes('VVIP');
    const isVIP  = !isVVIP && s.includes('VIP');
    const cont   = s.includes('継続');
    if(isVVIP) return cont ? 'vvip_cont' : 'vvip';
    if(isVIP)  return cont ? 'vip_cont' : 'vip';
    // fallback (shouldn't happen if names are consistent)
    return cont ? 'vip_cont' : 'vip';
  }

  function isRowVisibleByCategory(row){
    const cat = normalizeCategoryKey(row ? row.category_key : null);
    if(!cat) return true; // unknown / null -> keep visible (safe)
    if(cat === 'badge'){
      const sub = badgeSubKeyFromName(row ? row.package_name : '');
      const b = categoryFilter.badge || {};
      return (b[sub] !== false);
    }
    // default: visible unless explicitly false
    return (categoryFilter[cat] !== false);
  }

  function isRowVisible(row){
    // Initial double availability (初回ダイヤ) should override category when it disables a row.
    return isRowVisibleByCategory(row) && isRowAllowedByFirstDoubleSetting(row);
  }

function saveCart(){
    try{
      localStorage.setItem(CART_LS_KEY, JSON.stringify(cart));
    }catch(_){}
  }

  // === Quantity for calculations (effective qty) ===
  // Step 1: same as raw qty (no category filtering yet).
  // Later steps can make isRowEnabledForCalc(row) depend on category filter state,
  // so totals/budget/sorting can treat disabled categories as qty=0 without erasing user inputs.
  function getPurchaseCap(row){
    const maxRaw = row ? row.purchase_limit : null;
    const maxNum = (maxRaw === null || maxRaw === undefined || maxRaw === '') ? 999999 : Number(maxRaw);
    const cap = (Number.isFinite(maxNum) && maxNum > 0) ? Math.floor(maxNum) : 999999;
    return cap;
  }

  function isRowEnabledForCalc(row){
    return isRowVisible(row);
  }

  function getEffectiveQty(key, row, capOverride){
    const cap = (capOverride !== undefined && capOverride !== null) ? capOverride : getPurchaseCap(row);
    const raw = clampInt(cart[key] ?? 0, 0, cap);
    if(raw <= 0) return 0;
    if(!isRowEnabledForCalc(row)) return 0;
    return raw;
  }

  function getEffectiveQtyOverride(key, row, capOverride, overrideQty){
    const cap = (capOverride !== undefined && capOverride !== null) ? capOverride : getPurchaseCap(row);
    const base = (overrideQty !== undefined && overrideQty !== null) ? overrideQty : (cart[key] ?? 0);
    const raw = clampInt(base, 0, cap);
    if(raw <= 0) return 0;
    if(!isRowEnabledForCalc(row)) return 0;
    return raw;
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

    const note = document.createElement('div');
    note.className = 'pt-note pt-note--purpose';
    note.textContent = `※パッケージの価値をダイヤ換算した場合の値に影響します。

例：神話ユニットが全てLv.15 → 神話石のチェックを外す
例：デイリーショップの鉱山の鍵とは別に鍵が欲しい → 鉱山の鍵以外のチェックを外す

上記のように自分にとっての価値を正確にし、必要リソースを絞れます。`;
    elToggles.appendChild(note);
    elToggles.addEventListener('change', (e)=>{
      const t = e.target;
      if(t instanceof HTMLSelectElement && t.id==='optMineKeyRate'){
        rateBase.mine_key = Number(t.value)||0;
        applyAll();
        return;
      }
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


    const note = document.createElement('div');
    note.className = 'pt-note pt-note--double';
    note.textContent = `※すでに過去に購入した初回２倍ダイヤの項目は外してください。`;
    elDoubleToggles.appendChild(note);
    elDoubleToggles.addEventListener('change', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLInputElement)) return;
      const price = Number(t.dataset.price);
      if(!Number.isFinite(price)) return;
      doubleAvailability[price] = !!t.checked;
      saveDoubleAvailability();
      if(!t.checked) applyFirstDoubleSettingToCartForPrice(price);
    });
  }

  
  function buildRateEditorUI(){
    if(!elRateEditor) return;
    const items = [
      { key:'gold', name:'ゴールド', icon:'Resource_01_gold_20x20px.png' },
      { key:'mine_key', name:'鍵', icon:'Resource_02_key_20x20px.png', kind:'select' },
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
      // icon
      const img = document.createElement('img');
      img.className = 'pt-rate-icon';
      img.src = `${baseUrl}${it.icon}`;
      img.alt = it.name;
      row.appendChild(img);

      const nm = document.createElement('div');
      nm.className = 'pt-rate-name';
      nm.textContent = it.name;
      row.appendChild(nm);

      if(it.kind === 'select' && it.key === 'mine_key'){
        const sel = document.createElement('select');
        sel.id = 'optMineKeyRate';
        sel.className = 'pt-rate-input';
        ['420','500','600'].forEach(v=>{
          const opt=document.createElement('option');
          opt.value=v; opt.textContent=v;
          sel.appendChild(opt);
        });
        sel.value = String(rateBase.mine_key ?? 420);
        sel.setAttribute('aria-label', `${it.name}のレート`);
        row.appendChild(sel);
        elMineKeyRate = sel;
      }else{
        const inp = document.createElement('input');
        inp.className = 'pt-rate-input';
        inp.type = 'number';
        inp.inputMode = 'decimal';
        inp.min = '0';
        inp.step = '1';
        inp.value = String(rateBase[it.key] ?? 0);
        inp.setAttribute('data-key', it.key);
        inp.setAttribute('aria-label', `${it.name}のレート`);
        row.appendChild(inp);
      }
      elRateEditor.appendChild(row);
    }

    // note about invite handling
    const note = document.createElement('div');
    note.className = 'pt-note pt-note--rate';
    note.textContent = `※招待状の扱いについて\nそれ１枚のユニット募集における期待値は\n　・ゴールド≒7.24枚\n　・神話石≒0.019個\n　・ダイヤ≒0.238個\n以上のようになっています。\n商品リストへ反映しても良かったのですが、商品内容に実際との相違が生じてしまいます。\nそのため、すべてをダイヤ換算した場合の値として扱う方式を採用しました。\nつまり、デフォルトの招待状レートはこれらの合計値になっています。`;
    elRateEditor.appendChild(note);
    elRateEditor.addEventListener('change', (e)=>{
      const t = e.target;
      if(t instanceof HTMLSelectElement && t.id==='optMineKeyRate'){
        rateBase.mine_key = Number(t.value)||0;
        applyAll();
        return;
      }
      if(!(t instanceof HTMLInputElement)) return;
      const k = t.dataset.key;
      if(!k) return;
      rateBase[k] = Number(t.value) || 0;
      applyAll();
    });
  }

  function pullRatesFromUI(){
    if(!elRateEditor) return;
    // numeric inputs
    const inputs = elRateEditor.querySelectorAll('input.pt-rate-input[data-key]');
    inputs.forEach(inp=>{
      const k = inp.getAttribute('data-key');
      const v = Number(String(inp.value||'').replace(/,/g,''));
      if(!k) return;
      if(Number.isFinite(v)) rateBase[k] = v;
    });
    // mine_key select
    const sel = elRateEditor.querySelector('#optMineKeyRate');
    if(sel){
      const v = Number(sel.value);
      if(Number.isFinite(v)) rateBase.mine_key = v;
    }
  }


function getEffectiveRates(){
    const r = {...rateBase};
    r.mine_key = Number(elMineKeyRate ? elMineKeyRate.value : (rateBase.mine_key ?? 0));
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

      const rawQty = clampInt(cart[key] ?? 0, 0, cap);
      cart[key] = rawQty;
      const qty = getEffectiveQty(key, r, cap);

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
        <td class="calc">${(r._calc_dpy && r._calc_dpy>0) ? fmtInt(Math.round(r._calc_dpy*100)) : '-'}</td>
        <td class="calc">${fmtPct1(r._calc_budget_ratio)}</td>
      </tr>`;
    }).join('');
  }

  function calcAndSort(){
    const rates = getEffectiveRates();
    const budget = clampInt(elBudgetYen.value, 0, 3000000);

    const budgetBestDia = baselineBudgetBestDia(budget);
    const budgetDiaPerYen = (budget > 0 && budgetBestDia > 0) ? (budgetBestDia / budget) : 0;

    const tiers = baselinePacks
      .filter(p => p.is_active !== false)
      .map(p => Number(p.price_yen))
      .filter(n => Number.isFinite(n) && n > 0);
    const uniq = Array.from(new Set(tiers)).sort((a,b)=>a-b);
    const enabled = uniq.filter(p => doubleAvailability[p] !== false).length;
    // KPI baseline line removed per spec
    const rows = (packages||[])
      .filter(p => isRowVisible(p))
      .map(p => {
        const key = rowKey(p);
        const yen = Number(p.jpy) || 0;
        const dia = calcPackageDiaValue(p, rates);
        const dpy = yen > 0 ? (dia / yen) : 0;
        const budgetRatio = (budgetDiaPerYen > 0) ? (dpy / budgetDiaPerYen) : 0;
        const cap = getPurchaseCap(p);
        const effQty = getEffectiveQty(key, p, cap);
        return { ...p, _key: key, _effQty: effQty, _calc_dia: dia, _calc_dpy: dpy, _calc_budget_ratio: budgetRatio };
      });

    const activeSorts = getActiveSorts();
    let out = rows.slice();
    out.sort((a,b)=> multiCompare(a,b,activeSorts));
    lastRowsMain = out;
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
      const qty = getEffectiveQty(key, r, cap);
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
        <td class="calc">${(sumY>0)?fmtInt(Math.round(dpy*100)):'-'}</td>
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
    updatePlannedSummaryCard(sumY, sumRes);
    lastSummaryDetail = detailItems;
    updateSelectedInfo();
  }

  function updatePlannedSummaryCard(sumY, sumRes){
    if(!elPlannedSummaryText) return;
    const parts = [];
    parts.push(`<span class="pt-sel-price">¥${fmtNum(sumY)}</span>`);
    for(const k of RESOURCE_KEYS){
      const v = Number(sumRes?.[k] || 0);
      if(!v) continue;
      const icon = ICONS[k];
      if(!icon) continue;
      parts.push(`<span class="pt-sel-item"><img class="pt-sel-ico" src="${icon}" alt="${k}"><span class="pt-sel-val">${fmtNum(v)}</span></span>`);
    }
    elPlannedSummaryText.innerHTML = `<div class="pt-sel-items">${parts.join('')}</div>`;
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


  function buildCategoryFilterSummaryText(){
    // If all true -> "全て表示" else list hidden or visible
    const def = defaultCategoryFilter();
    const parts = [];
    const hidden = [];

    // main categories
    for(const d of CATEGORY_DEFS){
      if(d.key === 'badge') continue;
      const on = (categoryFilter[d.key] !== false);
      if(!on) hidden.push(d.label);
    }

    // badge sub
    const b = categoryFilter.badge || def.badge;
    const badgeOn = {
      'VVIP': (b.vvip !== false),
      'VVIP(継続)': (b.vvip_cont !== false),
      'VIP': (b.vip !== false),
      'VIP(継続)': (b.vip_cont !== false),
    };
    const badgeHidden = Object.entries(badgeOn).filter(([,v])=>!v).map(([k])=>k);
    if(badgeHidden.length > 0){
      hidden.push('バッジ:' + badgeHidden.join(','));
    }

    if(hidden.length === 0) return 'カテゴリ：全て表示';
    return 'カテゴリ：一部非表示（' + hidden.join(' / ') + '）';
  }

  function updateCategoryFilterSummary(){
    if(!elCategoryFilterSummary) return;
    elCategoryFilterSummary.textContent = buildCategoryFilterSummaryText();
  }


function applyAll(){
    pullRatesFromUI();
    const { out, budgetDiaPerYen } = calcAndSort();
    render(out);
    updateSummary(out, budgetDiaPerYen);
    // 量に応じた行背景色/上限到達色/選択枠などの状態は、描画のたび必ず反映する
    applyRowClasses();
    updateSelectedInfo();
    saveCart();
    status.textContent = `表示中：${out.length}件（計算反映）`;
    updateCategoryFilterSummary();
    updateBudgetInputWarning();
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
    loadCategoryFilter();
    loadDoubleAvailability();

    const [pkgRows, rateRows, baseRows, dblRows] = await Promise.all([
      fetchTable('ld_pay_packages', 'sort_order.asc'),
      fetchTable('ld_pay_exchange_rates', 'resource_key.asc'),
      fetchTable('ld_pay_baseline_diamond_packs', 'sort_order.asc'),
      fetchTable('ld_pay_first_double_diamond_packs', 'sort_order.asc')
    ]);

    packages = (pkgRows || []).filter(r => r.is_active !== false);
    baselinePacks = baseRows || [];
    doublePacks = dblRows || [];
    rebuildDoublePackIndex();

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
    applyFirstDoubleSettingToCartAll();
    buildRateEditorUI();

    // snapshot server/default rates for reset
    if(!initialRateBase) initialRateBase = JSON.parse(JSON.stringify(rateBase));


    // Auto recalcs
    if(elRateEditor){
      elRateEditor.addEventListener('input', ()=>{ pullRatesFromUI(); applyAll(); });
      elRateEditor.addEventListener('change', ()=>{ pullRatesFromUI(); applyAll(); });
    }
    if(elRateReset){
      elRateReset.addEventListener('click', ()=>{
        if(!initialRateBase) return;
        rateBase = JSON.parse(JSON.stringify(initialRateBase));
        buildRateEditorUI();
        pullRatesFromUI();
        applyAll();
      });
    }
    elToggles.addEventListener('change', applyAll);
    if(elDoubleToggles) elDoubleToggles.addEventListener('change', applyAll);
    elSort.addEventListener('change', ()=>{
      sortState.base.mode = elSort.value;
      bumpSort('base');
      applyAll();
    });

    if(elQtySort){
      sortState.qty.enabled = !!elQtySort.checked;
      elQtySort.addEventListener('change', ()=>{
        sortState.qty.enabled = !!elQtySort.checked;
        bumpSort('qty');
        applyAll();
      });
    }


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

        const bMatch = document.getElementById('ptBudgetMatchPlanned');
    const bConfirm = document.getElementById('ptBudgetConfirm');
    const bConfirmYes = document.getElementById('ptBudgetConfirmYes');
    const bConfirmNo  = document.getElementById('ptBudgetConfirmNo');
function getBudgetVal(){ return clampInt(elBudgetYen.value, 0, 3000000); }

    // decision-style temp value (only applied on OK)
    let bTemp = 0;
    let bInitial = 0; // value when popup open
    let bJustOpened = false; // prevent same-tap close (esp. iOS)
    let bOpenedAt = 0;

    function calcPlannedYen(){
      let sum = 0;
      for(const p of (packages||[])){
        const key = rowKey(p);
        const qty = getEffectiveQty(key, p, getPurchaseCap(p));
        if(qty <= 0) continue;
        sum += (Number(p.jpy)||0) * qty;
      }
      return sum;
    }

function calcPlannedYenWithOverride(overrideKey, overrideQty){
      let sum = 0;
      for(const p of (packages||[])){
        const key = rowKey(p);
        const cap = getPurchaseCap(p);
        const qty = (overrideKey && key === overrideKey)
          ? getEffectiveQtyOverride(key, p, cap, overrideQty)
          : getEffectiveQty(key, p, cap);
        if(qty <= 0) continue;
        sum += (Number(p.jpy)||0) * qty;
      }
      return sum;
    }

    
    function updateBudgetInputWarning(){
      if(!elBudgetYen) return;
      const budget = getBudgetVal();
      const planned = calcPlannedYen();
      const over = planned > budget;
      elBudgetYen.classList.toggle('pt-input--over', over);
    }

function refreshBudgetPopupUI(){
      if(bValue) bValue.textContent = fmtNum(bTemp);
      if(bPurchased) bPurchased.textContent = fmtNum(calcPlannedYen());
    }

    function openBudgetPopup(){
      if(!bOverlay || !bPopup) return;
      if(bConfirm) bConfirm.hidden = true;
      bTemp = getBudgetVal();
      bInitial = bTemp;
      refreshBudgetPopupUI();
      bOverlay.hidden = false; bPopup.hidden = false;
      // On mobile, the same tap that opens the popup can also hit the overlay. Ignore it.
      bJustOpened = true;
      bOpenedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      setTimeout(()=>{ bJustOpened = false; }, 220);

      // show slightly above center
      const h = bPopup.getBoundingClientRect().height || 260;
      const y = Math.max(8, Math.min(window.innerHeight - h - 8, window.innerHeight*0.25));
      bPopup.style.top = y + 'px';
    }

    function closeBudgetPopup(discard=false){
      if(!bOverlay || !bPopup) return;
      if(bConfirm) bConfirm.hidden = true;
      bOverlay.hidden = true;
      bPopup.hidden = true;
      if(discard){
        bTemp = bInitial;
      }
    }

    function requestCloseBudgetPopup(){
      if(bJustOpened) return;
      // Extra safety: ignore any close request that happens immediately after opening.
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if(bOpenedAt && (now - bOpenedAt) < 350) return;
      // If temp changed, confirm discard
      if(bTemp !== bInitial){
        if(bConfirm){ bConfirm.hidden = false; }
        return;
      }
      closeBudgetPopup(false);
    }

    function commitBudget(){
      const nv = clampInt(bTemp, 0, 3000000);
      elBudgetYen.value = String(nv);
      applyAll();
      closeBudgetPopup();
    }

    if(elBudgetQuick) elBudgetQuick.addEventListener('click', (e)=>{ e.stopPropagation(); openBudgetPopup(); });
    // Do NOT close by tapping the overlay.
    // It can be triggered by the same tap that opened the popup (esp. Safari), which causes the discard-confirm to appear immediately.
    if(bOverlay) bOverlay.addEventListener('click', (e)=>{ e.stopPropagation(); });
    if(bClose) bClose.addEventListener('click', requestCloseBudgetPopup);
    if(bClear) bClear.addEventListener('click', ()=>{ bTemp = 0; refreshBudgetPopupUI(); });
    if(bOk) bOk.addEventListener('click', commitBudget);

    // === Category filter popup ===
    const cOverlay = document.getElementById('ptCatOverlay');
    const cPopup   = document.getElementById('ptCatPopup');
    const cClose   = document.getElementById('ptCatClose');
    const cOk      = document.getElementById('ptCatOk');
    const cAllOn   = document.getElementById('ptCatAllOn');
    const cAllOff  = document.getElementById('ptCatAllOff');

    const cChecks = {
      weekly: document.getElementById('ptCat_weekly'),
      monthly: document.getElementById('ptCat_monthly'),
      period_pass: document.getElementById('ptCat_period_pass'),
      limited_pass: document.getElementById('ptCat_limited_pass'),
      normal_diamond: document.getElementById('ptCat_normal_diamond'),
      limited_diamond: document.getElementById('ptCat_limited_diamond'),
      badge_vvip: document.getElementById('ptCat_badge_vvip'),
      badge_vvip_cont: document.getElementById('ptCat_badge_vvip_cont'),
      badge_vip: document.getElementById('ptCat_badge_vip'),
      badge_vip_cont: document.getElementById('ptCat_badge_vip_cont'),
    };

    let cTemp = null;

    function syncCatChecksFromTemp(){
      if(!cTemp) return;
      const b = cTemp.badge || {};
      if(cChecks.weekly) cChecks.weekly.checked = (cTemp.weekly !== false);
      if(cChecks.monthly) cChecks.monthly.checked = (cTemp.monthly !== false);
      if(cChecks.period_pass) cChecks.period_pass.checked = (cTemp.period_pass !== false);
      if(cChecks.limited_pass) cChecks.limited_pass.checked = (cTemp.limited_pass !== false);
      if(cChecks.normal_diamond) cChecks.normal_diamond.checked = (cTemp.normal_diamond !== false);
      if(cChecks.limited_diamond) cChecks.limited_diamond.checked = (cTemp.limited_diamond !== false);

      if(cChecks.badge_vvip) cChecks.badge_vvip.checked = (b.vvip !== false);
      if(cChecks.badge_vvip_cont) cChecks.badge_vvip_cont.checked = (b.vvip_cont !== false);
      if(cChecks.badge_vip) cChecks.badge_vip.checked = (b.vip !== false);
      if(cChecks.badge_vip_cont) cChecks.badge_vip_cont.checked = (b.vip_cont !== false);
    }

    function readCatTempFromChecks(){
      if(!cTemp) cTemp = defaultCategoryFilter();
      cTemp.weekly = !!(cChecks.weekly && cChecks.weekly.checked);
      cTemp.monthly = !!(cChecks.monthly && cChecks.monthly.checked);
      cTemp.period_pass = !!(cChecks.period_pass && cChecks.period_pass.checked);
      cTemp.limited_pass = !!(cChecks.limited_pass && cChecks.limited_pass.checked);
      cTemp.normal_diamond = !!(cChecks.normal_diamond && cChecks.normal_diamond.checked);
      cTemp.limited_diamond = !!(cChecks.limited_diamond && cChecks.limited_diamond.checked);
      cTemp.badge = cTemp.badge || {};
      cTemp.badge.vvip = !!(cChecks.badge_vvip && cChecks.badge_vvip.checked);
      cTemp.badge.vvip_cont = !!(cChecks.badge_vvip_cont && cChecks.badge_vvip_cont.checked);
      cTemp.badge.vip = !!(cChecks.badge_vip && cChecks.badge_vip.checked);
      cTemp.badge.vip_cont = !!(cChecks.badge_vip_cont && cChecks.badge_vip_cont.checked);
    }

    function openCategoryPopup(){
      if(!cOverlay || !cPopup) return;
      // copy current state
      cTemp = JSON.parse(JSON.stringify(categoryFilter));
      syncCatChecksFromTemp();
      cOverlay.hidden = false;
      cPopup.hidden = false;

      // position: keep inside viewport (fixed without top can end up off-screen)
      try{
        const h = cPopup.getBoundingClientRect().height || 360;
        const y = Math.max(8, Math.min(window.innerHeight - h - 8, Math.floor(window.innerHeight * 0.10)));
        cPopup.style.top = y + 'px';
      }catch(_){ /* noop */ }

      updateCategoryFilterSummary();
    }
function closeCategoryPopup(){
      if(!cOverlay || !cPopup) return;
      cOverlay.hidden = true;
      cPopup.hidden = true;
      cTemp = null;
    }

    function commitCategoryPopup(){
      readCatTempFromChecks();
      categoryFilter = cTemp;
      saveCategoryFilter();

      // if currently selected row becomes invisible, clear selection
      const curKey = selectedKeyMain || selectedKeySummary;
      if(curKey){
        const row = (packages||[]).find(p => rowKey(p) === curKey);
        if(row && !isRowVisible(row)){
          selectedKeyMain = null;
          selectedKeySummary = null;
        }
      }

      applyAll();
      closeCategoryPopup();
    }

    function setAllCats(on){
      if(!cTemp) cTemp = JSON.parse(JSON.stringify(categoryFilter));
      // main categories
      cTemp.weekly = on;
      cTemp.monthly = on;
      cTemp.period_pass = on;
      cTemp.limited_pass = on;
      cTemp.normal_diamond = on;
      cTemp.limited_diamond = on;
      cTemp.badge = cTemp.badge || {};
      cTemp.badge.vvip = on;
      cTemp.badge.vvip_cont = on;
      cTemp.badge.vip = on;
      cTemp.badge.vip_cont = on;
      syncCatChecksFromTemp();
    }

    if(elBtnCategoryFilter) elBtnCategoryFilter.addEventListener('click', openCategoryPopup);
    if(cOverlay) cOverlay.addEventListener('click', (e)=>{ e.stopPropagation(); }); // do not close by overlay
    if(cClose) cClose.addEventListener('click', closeCategoryPopup);
    if(cOk) cOk.addEventListener('click', commitCategoryPopup);
    if(cAllOn) cAllOn.addEventListener('click', ()=>setAllCats(true));
    if(cAllOff) cAllOff.addEventListener('click', ()=>setAllCats(false));

    if(bMatch) bMatch.addEventListener('click', ()=>{ bTemp = clampInt(calcPlannedYen(),0,3000000); refreshBudgetPopupUI(); });
    if(bConfirmNo) bConfirmNo.addEventListener('click', ()=>{ if(bConfirm) bConfirm.hidden = true; });
    if(bConfirmYes) bConfirmYes.addEventListener('click', ()=>{ if(bConfirm) bConfirm.hidden = true; closeBudgetPopup(true); });
bPopup?.addEventListener('click', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      const btn = t.closest('[data-delta]');
      if(!btn) return;
      const delta = Number(btn.getAttribute('data-delta'));
      if(!Number.isFinite(delta)) return;
      bTemp = clampInt(bTemp + delta, 0, 3000000);
      refreshBudgetPopupUI();
    });


    
    // === Bulk buy popup ===
    const bulkBtn = document.getElementById('btnBulkBuy');
    const bulkOverlay = document.getElementById('ptBulkOverlay');
    const bulkPopup   = document.getElementById('ptBulkPopup');
    const bulkClose   = document.getElementById('ptBulkClose');
    const bulkOk      = document.getElementById('ptBulkOk');
    const bulkSumEl   = document.getElementById('ptBulkSum');
    const bulkListEl  = document.getElementById('ptBulkList');
    const bulkAllClr  = document.getElementById('ptBulkAllClear');
    const bulkAllMax  = document.getElementById('ptBulkAllMax');

    let bulkTemp = null;     // key -> qty (working copy)
    let bulkTargets = [];    // package rows in weekly/monthly

    function getBulkTargets(){
      const out = [];
      for(const p of (packages || [])){
        if(!p) continue;
        if(p.is_active === false) continue;
        const cat = normalizeCategoryKey(p.category_key);
        if(cat !== 'weekly' && cat !== 'monthly') continue;
        out.push(p);
      }
      out.sort((a,b)=>{
        const sa = Number(a.sort_order ?? 0);
        const sb = Number(b.sort_order ?? 0);
        if(Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
        return String(a.package_name||'').localeCompare(String(b.package_name||''), 'ja');
      });
      return out;
    }

    function closeBulkPopup(){
      if(bulkOverlay) bulkOverlay.hidden = true;
      if(bulkPopup) bulkPopup.hidden = true;
      bulkTemp = null;
      bulkTargets = [];
    }

    function calcBulkSumYen(){
      let sum = 0;
      for(const p of bulkTargets){
        const key = rowKey(p);
        const qty = bulkTemp ? (bulkTemp[key] ?? 0) : 0;
        const jpy = Number(p.jpy ?? p.price_yen ?? 0);
        if(!Number.isFinite(jpy)) continue;
        sum += jpy * qty;
      }
      return sum;
    }

    function renderBulkPopup(){
      if(!bulkListEl || !bulkSumEl) return;

      bulkSumEl.textContent = `下記パッケージの総合計金額：${fmtYen(calcBulkSumYen())}`;

      const frag = document.createDocumentFragment();
      let lastGroup = null;

      for(const p of bulkTargets){
        const cat = normalizeCategoryKey(p.category_key);
        const groupLabel = (cat === 'weekly') ? '週間' : '月間';
        if(groupLabel !== lastGroup){
          const gh = document.createElement('div');
          gh.className = 'pt-bulk-group';
          gh.textContent = groupLabel;
          frag.appendChild(gh);
          lastGroup = groupLabel;
        }

        const key = rowKey(p);
        const cap = getPurchaseCap(p);
        const capText = (cap >= 999999) ? '∞' : String(cap);
        const qty = bulkTemp ? (bulkTemp[key] ?? 0) : 0;

        const jpy = Number(p.jpy ?? p.price_yen ?? 0);
        const lineSum = (Number.isFinite(jpy) ? jpy : 0) * qty;

        const item = document.createElement('div');
        item.className = 'pt-bulk-item';
        item.dataset.key = key;

        const name = document.createElement('div');
        name.className = 'pt-bulk-name';
        name.textContent = String(p.package_name || '');

        const btnClr = document.createElement('button');
        btnClr.type = 'button';
        btnClr.className = 'pt-bulk-mini';
        btnClr.dataset.act = 'clr';
        btnClr.textContent = 'CLR';

        const qtyEl = document.createElement('div');
        qtyEl.className = 'pt-bulk-qty';
        qtyEl.textContent = `${qty}/${capText}`;

        const btnMax = document.createElement('button');
        btnMax.type = 'button';
        btnMax.className = 'pt-bulk-mini';
        btnMax.dataset.act = 'max';
        btnMax.textContent = 'MAX';

        const sumEl = document.createElement('div');
        sumEl.className = 'pt-bulk-line-sum';
        sumEl.textContent = fmtYen(lineSum);

        item.append(name, btnClr, qtyEl, btnMax, sumEl);
        frag.appendChild(item);
      }

      bulkListEl.innerHTML = '';
      bulkListEl.appendChild(frag);
    }

    function openBulkPopup(){
      if(!bulkOverlay || !bulkPopup || !bulkListEl) return;
      bulkTargets = getBulkTargets();
      bulkTemp = {};
      for(const p of bulkTargets){
        const key = rowKey(p);
        const cap = getPurchaseCap(p);
        bulkTemp[key] = clampInt(cart[key] ?? 0, 0, cap);
      }
      bulkOverlay.hidden = false;
      bulkPopup.hidden = false;

      // position inside viewport (fixed without top can end up off-screen)
      try{
        const h = bulkPopup.getBoundingClientRect().height || 520;
        const y = Math.max(8, Math.min(window.innerHeight - h - 8, Math.floor(window.innerHeight * 0.08)));
        bulkPopup.style.top = y + 'px';
      }catch(_){}

      renderBulkPopup();
    }

    function applyBulkAction(key, act){
      if(!bulkTemp) return;
      const p = bulkTargets.find(r => rowKey(r) === key);
      if(!p) return;
      const cap = getPurchaseCap(p);
      if(act === 'clr') bulkTemp[key] = 0;
      if(act === 'max') bulkTemp[key] = clampInt(cap, 0, cap);
      renderBulkPopup();
    }

    function setBulkAll(act){
      if(!bulkTemp) return;
      for(const p of bulkTargets){
        const key = rowKey(p);
        const cap = getPurchaseCap(p);
        bulkTemp[key] = (act === 'clr') ? 0 : clampInt(cap, 0, cap);
      }
      renderBulkPopup();
    }

    function commitBulkPopup(){
      if(!bulkTemp){
        closeBulkPopup();
        return;
      }
      for(const p of bulkTargets){
        const key = rowKey(p);
        cart[key] = bulkTemp[key] ?? 0;
      }
      applyAll();
      closeBulkPopup();
    }

    if(bulkBtn) bulkBtn.addEventListener('click', openBulkPopup);
    if(bulkOverlay) bulkOverlay.addEventListener('click', (e)=>{ e.stopPropagation(); }); // do not close by overlay
    if(bulkClose) bulkClose.addEventListener('click', closeBulkPopup);
    if(bulkOk) bulkOk.addEventListener('click', commitBulkPopup);
    if(bulkAllClr) bulkAllClr.addEventListener('click', ()=>setBulkAll('clr'));
    if(bulkAllMax) bulkAllMax.addEventListener('click', ()=>setBulkAll('max'));

    if(bulkListEl){
      bulkListEl.addEventListener('click', (e)=>{
        const t = e.target;
        if(!(t instanceof HTMLElement)) return;
        const btn = t.closest('button[data-act]');
        if(!btn) return;
        const act = btn.getAttribute('data-act');
        if(!act) return;
        const item = btn.closest('.pt-bulk-item');
        if(!item) return;
        const key = item.getAttribute('data-key');
        if(!key) return;
        applyBulkAction(key, act);
      });
    }


// purchase popup handlers (open only from 1st column)
    let lastTap = {x:0,y:0,moved:false};
    tbody.addEventListener('pointerdown', (e)=>{
      lastTap = {x:e.clientX,y:e.clientY,moved:false};
    }, {passive:true});
    tbody.addEventListener('pointermove', (e)=>{
      if(Math.abs(e.clientX-lastTap.x)+Math.abs(e.clientY-lastTap.y) > 12){
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
    const popGrandSum = document.getElementById('ptPopupGrandSum');
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
      if(popGrandSum) popGrandSum.textContent = fmtNum(calcPlannedYenWithOverride(popKey, popTempQty));
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
      if(popGrandSum) popGrandSum.textContent = fmtNum(calcPlannedYenWithOverride(popKey, popTempQty));
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

  function fmtInt(n){
    const v = Number(n);
    if(!Number.isFinite(v)) return '-';
    return String(Math.trunc(v));
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
      const el = (e.target instanceof Element) ? e.target : (e.target && e.target.parentElement ? e.target.parentElement : null);
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
        if(dx > 12 || dy > 12) lastTap.moved = true;
      }, { passive:true });

      elSummaryTbody.addEventListener('click', (e)=>{
        if(lastTap.moved) return;
        const el = (e.target instanceof Element) ? e.target : (e.target && e.target.parentElement ? e.target.parentElement : null);
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

installIconSortHandlers();
updateIconSortAria();
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