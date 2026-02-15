// ld_kouryaku_indicator.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const $ = (id) => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
const statusEl = $("status");

// ---- Supabase client ----
function assertSupabaseConfig(){
  if(!window.LD_SUPABASE_URL || !window.LD_SUPABASE_ANON_KEY){
    throw new Error("supabase_config.js が読み込まれていません（LD_SUPABASE_URL / LD_SUPABASE_ANON_KEY）");
  }
}
assertSupabaseConfig();
const supabase = createClient(window.LD_SUPABASE_URL, window.LD_SUPABASE_ANON_KEY);

// ---- State ----
const STATE = {
  masters: {
    modename: [],
    enm_hp: [],
    atk_up: [],
    safebox: [],
    byModeWave: new Map(), // key: `${mode}|${wave}`
    atkUpById: new Map(),
    safeboxBySafeLv: new Map(),
    safeboxByMoneyLv: new Map(),
  },
  uiReady: false,
};

const WAVE_OPTIONS = [10,20,30,40,50,60,70];

function setStatus(msg){ statusEl.textContent = msg; }

function clamp(n, min, max){
  const x = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, x));
}

function parseIntLoose(s){
  if (s == null) return NaN;
  const t = String(s).replace(/,/g,"").trim();
  if(!t) return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}
function formatComma(n){
  const x = Number(n);
  if(!Number.isFinite(x)) return "-";
  return x.toLocaleString("ja-JP");
}
function roundToThousand(n){
  const x = Number(n);
  if(!Number.isFinite(x)) return NaN;
  return Math.round(x / 1000) * 1000;
}

function safeGetEnm(mode, wave){
  return STATE.masters.byModeWave.get(`${mode}|${wave}`) || null;
}

function buildRadioRow(containerId, name, items, defaultValue){
  const root = $(containerId);
  root.innerHTML = "";
  for(const it of items){
    const id = `${name}_${it}`;
    const label = document.createElement("label");
    label.className = "radio-pill";
    label.innerHTML = `
      <input type="radio" name="${name}" id="${id}" value="${it}">
      <span>${it}</span>
    `;
    root.appendChild(label);
  }
  // set default
  const toCheck = root.querySelector(`input[value="${defaultValue}"]`) || root.querySelector("input");
  if(toCheck) toCheck.checked = true;
}

function buildModeRadios(){
  const modes = STATE.masters.modename.map(r => r.mode_name);
  // keep hidden radios for compatibility (not shown)
  const root = $("modeRadios");
  if(root){
    root.innerHTML = "";
    modes.forEach((m, idx) => {
      const id = `mode_${idx}`;
      const label = document.createElement("label");
      label.className = "radio-pill";
      label.innerHTML = `
        <input type="radio" name="mode" id="${id}" value="${m}">
        <span>${m}</span>
      `;
      root.appendChild(label);
    });
  }

  // visible wheel select
  const sel = $("modeSel");
  sel.innerHTML = "";
  modes.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

function buildSelectRange(selectId, min, max, defaultValue){
  const sel = $(selectId);
  sel.innerHTML = "";
  for(let i=min;i<=max;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    sel.appendChild(opt);
  }
  sel.value = String(defaultValue);
}

function buildVaultMoneySelects(){
  const vaultLvSel = $("vaultLv");
  const moneyLvSel = $("moneyLv");
  vaultLvSel.innerHTML = "";
  moneyLvSel.innerHTML = "";

  const safeLvList = [...STATE.masters.safeboxBySafeLv.keys()].sort((a,b)=>a-b);
  const moneyLvList = [...STATE.masters.safeboxByMoneyLv.keys()].sort((a,b)=>a-b);

  for(const lv of safeLvList){
    const opt = document.createElement("option");
    opt.value = String(lv);
    opt.textContent = String(lv);
    vaultLvSel.appendChild(opt);
  }
  for(const lv of moneyLvList){
    const opt = document.createElement("option");
    opt.value = String(lv);
    opt.textContent = String(lv);
    moneyLvSel.appendChild(opt);
  }

  vaultLvSel.value = String(safeLvList[0] ?? 1);
  moneyLvSel.value = String(moneyLvList[0] ?? 1);
}

function getChecked(name){
  if(name === "mode"){
    const sel = document.getElementById("modeSel");
    if(sel) return sel.value || null;
  }
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}


function updateTimeSelect(selectId, maxVal){
  const sel = document.getElementById(selectId);
  const max = Number(maxVal);
  if(!sel || !Number.isFinite(max)) return;

  const cur = Number(sel.value);
  sel.innerHTML = "";
  for(let i=1;i<=max;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    sel.appendChild(opt);
  }
  const next = clamp(Number.isFinite(cur)?cur:max, 1, max);
  sel.value = String(next);

  const api = WHEELS.get(selectId);
  if(api && typeof api.rebuildFromSelect === "function"){
    api.rebuildFromSelect();
  }
}

function setRangeMax(id, max){
  const r = $(id);
  const newMax = Number(max);
  r.max = String(newMax);
  const v = clamp(Number(r.value), Number(r.min), newMax);
  r.value = String(v);
}

function stepRange(targetId, step){
  const r = $(targetId);
  const v = Number(r.value) + Number(step);
  const min = Number(r.min);
  const max = Number(r.max);
  r.value = String(clamp(v, min, max));
  r.dispatchEvent(new Event("input", {bubbles:true}));
  r.dispatchEvent(new Event("change", {bubbles:true}));
}

function attachStepButtons(){
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-step-target]");
    if(!btn) return;
    e.preventDefault();
    const tid = btn.getAttribute("data-step-target");
    const step = Number(btn.getAttribute("data-step"));
    stepRange(tid, step);
  });
}

function setSliderLabel(rangeId, labelId){
  const r = $(rangeId);
  const lab = $(labelId);
  const apply = () => { lab.textContent = String(r.value); };
  r.addEventListener("input", apply);
  apply();
}

function normalizeCoinInput(){
  const el = $("coinPrev");
  const n = clamp(parseIntLoose(el.value), 100, 9999000);
  if(!Number.isFinite(n)){
    el.value = "";
    return;
  }
  // Show rounded-to-thousand only for display, keep raw as data-raw.
  el.dataset.raw = String(n);
  el.value = formatComma(roundToThousand(n));
}

function getCoinPrevRaw(){
  const el = $("coinPrev");
  // prefer data-raw
  const dr = parseIntLoose(el.dataset.raw);
  if(Number.isFinite(dr)) return dr;
  // fallback parse the display value
  const n = parseIntLoose(el.value);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeBuff(){
  const el = $("buffPct");
  const raw = clamp(parseIntLoose(el.value), 0, 9950);
  const n = Math.round(raw/50)*50;
  el.value = Number.isFinite(n) ? String(n) : "";
}

function getBuffAsFloat(){
  const n = parseIntLoose($("buffPct").value);
  if(!Number.isFinite(n)) return 0;
  return n / 100;
}

function computeCoinAfter10Waves({mode, coinPrev, vaultLv}){
  const sb = STATE.masters.safeboxBySafeLv.get(Number(vaultLv));
  if(!sb) return NaN;

  const safe = Number(sb.safe_value);
  const line = Number(sb.safe_line);
  let coin = Number(coinPrev);

  if(!Number.isFinite(coin)) return NaN;

  if(mode !== "太初"){
    return coin * Math.pow(safe, 10);
  }

  for(let i=0;i<10;i++){
    if(coin >= line){
      coin += 10000;
    }else{
      coin *= safe;
    }
  }
  return coin;
}

function moneyGunBuffPct(coin, moneyLv){
  // money_value: e.g. 1.007 (Lv1)
  const sb = STATE.masters.safeboxByMoneyLv.get(Number(moneyLv));
  if(!sb) return NaN;
  const moneyValue = Number(sb.money_value);
  // Game behavior:
  // moneyBuffPct = (money_value - 1) * coin * 100
  // Example: coin=10000, money_value=1.007 -> 0.007*10000=70 (%)
  return (moneyValue - 1) * Number(coin);
}

function coinPowerMult(coin, moneyLv, sharedBuffFloat){
  // sharedBuffFloat = sharedBuffPct / 100 (e.g. 300% -> 3.0)
  const mgPct = moneyGunBuffPct(coin, moneyLv); // percent value, e.g. 70
  if(!Number.isFinite(mgPct)) return NaN;
  return 1 + Number(sharedBuffFloat) + (mgPct / 100);
}

function toFixed4(x){
  if(!Number.isFinite(x)) return "-";
  return x.toFixed(4);
}

function calcAndRender(){
  if(!STATE.uiReady) return;

  const mode = getChecked("mode");
  const prevWave = Number(getChecked("prevWave"));
  const testWave = prevWave + 10;
  const _tw = $("testWaveLabel");
  if(_tw) _tw.textContent = String(testWave);

  // battle time max
  const prevEnm = safeGetEnm(mode, prevWave);
  const testEnm = safeGetEnm(mode, testWave);
  if(prevEnm) updateTimeSelect("prevTime", prevEnm.battle_time);
  if(testEnm) updateTimeSelect("testTime", testEnm.battle_time);

  // enforce constraints: testUpLv >= prevUpLv, testAtkCnt >= prevAtkCnt
  const prevUpLv = Number($("prevUpLv").value);
  const testUpLvSel = $("testUpLv");
  const testUpLv = Number(testUpLvSel.value);
  if(testUpLv < prevUpLv){
    testUpLvSel.value = String(prevUpLv);
  }

  const prevAtkCnt = Number($("prevAtkCnt").value);
  const testAtkCntRange = $("testAtkCnt");
  const testAtkCnt = Number(testAtkCntRange.value);
  if(testAtkCnt < prevAtkCnt){
    testAtkCntRange.value = String(prevAtkCnt);
  }
  syncWheels();

  // refresh slider labels

  const vaultLv = Number($("vaultLv").value);
  const moneyLv = Number($("moneyLv").value);

  const coinPrev = getCoinPrevRaw();
  const buff = getBuffAsFloat();

  const coinTest = computeCoinAfter10Waves({mode, coinPrev, vaultLv});
  setText("coinTestLabel", Number.isFinite(coinTest) ? formatComma(roundToThousand(coinTest)) : "-");

  // Need enm rows
  if(!prevEnm || !testEnm){
    setText("mEnemy", "-");
    setText("mUser", "-");
    setText("judge", "データ不足");
    $("judge").className = "judge";
    return;
  }

  const hpPrev = Number(prevEnm.hitpoint_int);
  const hpTest = Number(testEnm.hitpoint_int);
  const mEnemy = hpTest / hpPrev;

  // user ratios
  const fPrev = coinPowerMult(coinPrev, moneyLv, buff);
  const fTest = coinPowerMult(coinTest, moneyLv, buff);
  const mCoin = fTest / fPrev;

  const uPrev = Number(STATE.masters.atkUpById.get(prevUpLv));
  const uTest = Number(STATE.masters.atkUpById.get(Number($("testUpLv").value)));
  const mUp = uTest / uPrev;

  const tPrev = Number($("prevTime").value);
  const tTest = Number($("testTime").value);
  const mTime = tTest / tPrev;

  const aPrev = Number($("prevAtkCnt").value);
  const aTest = Number($("testAtkCnt").value);
  const mAtkCnt = aTest / aPrev;

  const mUser = mCoin * mUp * mTime * mAtkCnt;

  // render
  setText("mEnemy", toFixed4(mEnemy));
  setText("mUser", toFixed4(mUser));
  setText("mCoin", toFixed4(mCoin));
  setText("mUp", toFixed4(mUp));
  setText("mTime", toFixed4(mTime));
  setText("mAtkCnt", toFixed4(mAtkCnt));

  // --- 検証ウェーブ：倍率カード & 要約テキスト ---
  const _up = $("lblUpRatio"), _ti = $("lblTimeRatio"), _at = $("lblAtkRatio");
  if(_up) _up.textContent = toFixed4(mUp);
  if(_ti) _ti.textContent = toFixed4(mTime);
  if(_at) _at.textContent = toFixed4(mAtkCnt);

  const s1 = $("sumLine1"), s2 = $("sumLine2"), s3 = $("sumLine3"), s4 = $("sumLine4");
  // 共通で使う値
  const mgPrevPct = moneyGunBuffPct(coinPrev, moneyLv);
  const mgTestPct = moneyGunBuffPct(coinTest, moneyLv);
  const sharedPct = buff * 100; // 例: 750% -> 750

  if(s1){
    const coinRatio = coinPrev > 0 ? (coinTest / coinPrev) : NaN;
    s1.textContent = `コイン枚数の変化：${formatComma(coinPrev)} → ${formatComma(roundToThousand(coinTest))} = ${toFixed4(coinRatio)} 倍`;
  }
  if(s2){
    s2.textContent = `マネーガンによるバフの変化：${formatComma(Math.round(mgPrevPct))} % → ${formatComma(Math.round(mgTestPct))} %`;
  }
  if(s3){
    s3.textContent = `共有バフ「攻撃力増加」：${formatComma(Math.round(sharedPct))} %`;
  }
  if(s4){
    const pPrev = 100 + sharedPct + mgPrevPct;
    const pTest = 100 + sharedPct + mgTestPct;
    const pr = (pPrev > 0) ? (pTest / pPrev) : NaN;
    s4.textContent = `コイン火力の変化：${formatComma(Math.round(pPrev))} % → ${formatComma(Math.round(pTest))} % = ${toFixed4(pr)} 倍`;
  }


  const judge = $("judge");
  if(Number.isFinite(mUser) && Number.isFinite(mEnemy) && mUser >= mEnemy){
    judge.textContent = "OK（倒せる目安）";
    judge.className = "judge ok";
  }else{
    judge.textContent = "不足（火力が足りない目安）";
    judge.className = "judge ng";
  }

  // Required test upgrade level (min)
  // need_u_test >= u_prev * (mEnemy / (mCoin * mTime * mAtkCnt))
  const denomForUp = mCoin * mTime * mAtkCnt;
  let needUpText = "-";
  if(Number.isFinite(denomForUp) && denomForUp > 0 && Number.isFinite(mEnemy)){
    const needU = uPrev * (mEnemy / denomForUp);
    const minLv = Math.max(prevUpLv, findMinUpgradeLv(needU));
    if(minLv === null){
      needUpText = "到達不可（Lv31でも不足）";
    }else{
      needUpText = String(minLv);
    }
  }
  setText("needUpLv", needUpText);

  // Required attacker count (min)
  // a_test >= a_prev * (mEnemy / (mCoin * mUp * mTime))
  const denomForAtk = mCoin * mUp * mTime;
  let needAtkText = "-";
  if(Number.isFinite(denomForAtk) && denomForAtk > 0 && Number.isFinite(mEnemy)){
    const needCnt = aPrev * (mEnemy / denomForAtk);
    const req = Math.max(aPrev, Math.ceil(needCnt));
    if(req > 24){
      needAtkText = "到達不可（24でも不足）";
    }else{
      needAtkText = String(req);
    }
  }
  setText("needAtkCnt", needAtkText);
}

function findMinUpgradeLv(needU){
  // returns smallest id_upgr whose atk_upgr >= needU, or null if not found
  const rows = STATE.masters.atk_up;
  for(const r of rows){
    if(Number(r.atk_upgr) >= Number(needU)){
      return Number(r.id_upgr);
    }
  }
  return null;
}





// ---- Inline Wheel Picker ----
const WHEELS = new Map(); // selectId -> {wheelEl, rowH, options, sync}
const SELECT_CACHE = new Map(); // selectId -> [{value,text}]

function cacheSelectOptions(selectId){
  if(SELECT_CACHE.has(selectId)) return;
  const sel = $(selectId);
  const arr = Array.from(sel.options).map(o => ({value: String(o.value), text: o.textContent || String(o.value)}));
  SELECT_CACHE.set(selectId, arr);
}

function rebuildSelectMin(selectId, minValue){
  cacheSelectOptions(selectId);
  const sel = $(selectId);
  const before = Number(sel.value);
  const src = SELECT_CACHE.get(selectId) || [];
  const filtered = src.filter(o => Number(o.value) >= Number(minValue));
  // rebuild options
  sel.innerHTML = "";
  for(const o of filtered){
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.text;
    sel.appendChild(opt);
  }
  // keep selection if possible; otherwise clamp to min
  let next = before;
  const has = filtered.some(o => Number(o.value) === Number(next));
  if(!has){
    next = filtered.length ? Number(filtered[0].value) : Number(minValue);
  }
  sel.value = String(next);
}

function applyTestMinConstraints(){
  const minUp = parseIntLoose($("prevUpLv").value);
  const minAtk = parseIntLoose($("prevAtkCnt").value);

  // まず select を元データから再生成（min 未満は表示しない）
  if(Number.isFinite(minUp)) rebuildSelectMin("testUpLv", minUp);
  if(Number.isFinite(minAtk)) rebuildSelectMin("testAtkCnt", minAtk);

  // 既存ホイールを「再描画」するだけ（イベント二重登録を避ける）
  const wUp = WHEELS.get("testUpLv");
  if(wUp) wUp.rebuildFromSelect();
  const wAtk = WHEELS.get("testAtkCnt");
  if(wAtk) wAtk.rebuildFromSelect();

  // 値が min 未満だった場合のみ、rebuildSelectMin 内で min へクランプされる
}

function buildWheelForSelect(selectId, wheelId, {rows=5, rowH=20} = {}){
  const sel = document.getElementById(selectId);
  const wheelEl = document.getElementById(wheelId);
  if(!sel || !wheelEl) return null;

  wheelEl.style.setProperty("--wheel-rows", String(rows));
  wheelEl.style.setProperty("--wheel-row-h", `${rowH}px`);

  let options = Array.from(sel.options).map(o => ({value: o.value, label: o.textContent}));
  const items = [];

  const renderItems = () => {
    wheelEl.innerHTML = "";
    items.length = 0;
    options = Array.from(sel.options).map(o => ({value: o.value, label: o.textContent}));
    for(const opt of options){
    const div = document.createElement("div");
    div.className = "wheel__item";
    div.dataset.value = opt.value;
    div.textContent = opt.label;
    wheelEl.appendChild(div);
      items.push(div);
    }
  };

  renderItems();

  const setSelectedClass = (value) => {
    for(const it of items){
      it.classList.toggle("is-selected", it.dataset.value === String(value));
    }
  };

  const scrollToValue = (value, behavior="auto") => {
    const idx = options.findIndex(o => String(o.value) === String(value));
    const targetIdx = idx >= 0 ? idx : 0;
    wheelEl.scrollTo({ top: targetIdx * rowH, behavior });
    setSelectedClass(options[targetIdx]?.value);
  };

  let stopTimer = null;
  const settle = () => {
    const idx = Math.round(wheelEl.scrollTop / rowH);
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    const value = options[clamped]?.value;

    // snap to exact
    wheelEl.scrollTo({ top: clamped * rowH, behavior: "smooth" });

    if(value != null && sel.value !== String(value)){
      sel.value = String(value);
      sel.dispatchEvent(new Event("change", {bubbles:true}));
      sel.dispatchEvent(new Event("input", {bubbles:true}));
    }
    setSelectedClass(value);
  };

  const onScroll = () => {
    if(stopTimer) clearTimeout(stopTimer);
    stopTimer = setTimeout(settle, 90);
  };

  wheelEl.addEventListener("scroll", onScroll, {passive:true});
  wheelEl.addEventListener("click", (e) => {
    const item = e.target.closest(".wheel__item");
    if(!item) return;
    const idx = items.indexOf(item);
    if(idx >= 0){
      wheelEl.scrollTo({ top: idx * rowH, behavior: "smooth" });
    }
  });

  sel.addEventListener("change", () => scrollToValue(sel.value, "auto"));

  // initial
  scrollToValue(sel.value || options[0]?.value, "auto");

  const rebuildFromSelect = () => {
    const cur = sel.value;
    renderItems();
    scrollToValue(cur || options[0]?.value, "auto");
  };

  const api = { wheelEl, rowH, get options(){ return options; }, sync: ()=>scrollToValue(sel.value, "auto"), rebuildFromSelect };
  WHEELS.set(selectId, api);
  return api;
}

function initInlineWheels(){
  buildWheelForSelect("vaultLv", "wheelVaultLv", {rows:5, rowH:20});
  buildWheelForSelect("moneyLv", "wheelMoneyLv", {rows:5, rowH:20});
  buildWheelForSelect("prevUpLv", "wheelPrevUpLv", {rows:5, rowH:20});
  buildWheelForSelect("testUpLv", "wheelTestUpLv", {rows:5, rowH:20});
  buildWheelForSelect("prevTime", "wheelPrevTime", {rows:5, rowH:20});
  buildWheelForSelect("testTime", "wheelTestTime", {rows:5, rowH:20});
  buildWheelForSelect("prevAtkCnt", "wheelPrevAtkCnt", {rows:5, rowH:20});
  buildWheelForSelect("testAtkCnt", "wheelTestAtkCnt", {rows:5, rowH:20});
  buildWheelForSelect("modeSel", "wheelMode", {rows:5, rowH:20});
  buildWheelForSelect("buffPctSel", "wheelBuff", {rows:5, rowH:20});
  buildWheelForSelect("coinD1", "wheelCoinD1", {rows:2.5, rowH:20});
  buildWheelForSelect("coinD2", "wheelCoinD2", {rows:2.5, rowH:20});
  buildWheelForSelect("coinD3", "wheelCoinD3", {rows:2.5, rowH:20});
  buildWheelForSelect("coinD4", "wheelCoinD4", {rows:2.5, rowH:20});
}

function syncWheels(){
  for(const api of WHEELS.values()){
    api.sync();
  }
}

function attachListeners(){
  // recompute on any input changes
  const ids = [
    "coinPrev","buffPct","modeSel","buffPctSel","coinD1","coinD2","coinD3","coinD4","vaultLv","moneyLv",
    "prevUpLv","testUpLv",
    "prevTime","testTime",
    "prevAtkCnt","testAtkCnt"
  ];
  for(const id of ids){
    $(id).addEventListener("input", () => {
      if(id === "coinPrev"){
        $("coinPrev").dataset.raw = String(parseIntLoose($("coinPrev").value.replace(/,/g,"")) || "");
      }
      if(id === "buffPctSel"){
        updateBuffFromWheel();
      }
      if(id === "coinD1" || id === "coinD2" || id === "coinD3" || id === "coinD4"){
        updateCoinFromDigits();
      }
      if(id === "prevUpLv" || id === "prevAtkCnt"){
        applyTestMinConstraints();
      }
      calcAndRender();
    });
    $(id).addEventListener("change", () => calcAndRender());
  }

  document.body.addEventListener("change", (e) => {
    const t = e.target;
    if(!(t instanceof HTMLInputElement)) return;
    if(t.name === "mode" || t.name === "prevWave"){
      calcAndRender();
    }
  });

  $("coinPrev").addEventListener("blur", () => { normalizeCoinInput(); calcAndRender(); });
  $("buffPct").addEventListener("blur", () => { normalizeBuff(); calcAndRender(); });
}

async function loadMasters(){
  setStatus("Supabase からマスタ取得中…");

  const fetchAll = async (table, orderCol) => {
    let q = supabase.from(table).select("*");
    if(orderCol) q = q.order(orderCol, {ascending:true});
    const { data, error } = await q;
    if(error) throw new Error(`${table} の取得に失敗: ${error.message}`);
    return data ?? [];
  };

  STATE.masters.modename = await fetchAll("ld_modename", "id_mode");
  STATE.masters.enm_hp = await fetchAll("ld_enm_hp", "id_enm");
  STATE.masters.atk_up = await fetchAll("ld_atk_up", "id_upgr");
  STATE.masters.safebox = await fetchAll("ld_safebox", "id_safelv");

  STATE.masters.byModeWave.clear();
  for(const r of STATE.masters.enm_hp){
    STATE.masters.byModeWave.set(`${r.mode_type}|${r.wave_count}`, r);
  }

  STATE.masters.atkUpById.clear();
  for(const r of STATE.masters.atk_up){
    STATE.masters.atkUpById.set(Number(r.id_upgr), Number(r.atk_upgr));
  }

  STATE.masters.safeboxBySafeLv.clear();
  STATE.masters.safeboxByMoneyLv.clear();
  for(const r of STATE.masters.safebox){
    STATE.masters.safeboxBySafeLv.set(Number(r.id_safelv), r);
    STATE.masters.safeboxByMoneyLv.set(Number(r.money_lv), r);
  }

  setStatus("準備完了");
}

function buildDigitSelect(selectId, defaultVal){
  const sel = $(selectId);
  sel.innerHTML = "";
  for(let i=0;i<=9;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    sel.appendChild(opt);
  }
  sel.value = String(clamp(Number(defaultVal)||0, 0, 9));
}

function buildBuffSelect(selectId, defaultVal){
  const sel = $(selectId);
  sel.innerHTML = "";
  for(let v=0; v<=9950; v+=50){
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = String(v) + "%";
    sel.appendChild(opt);
  }
  const dv = clamp(Math.round((Number(defaultVal)||0)/50)*50, 0, 9950);
  sel.value = String(dv);
}

function updateCoinFromDigits(){
  const d1 = Number($("coinD1").value);
  const d2 = Number($("coinD2").value);
  const d3 = Number($("coinD3").value);
  const d4 = Number($("coinD4").value);
  const coin = (d1*1000000) + (d2*100000) + (d3*10000) + (d4*1000);
  $("coinPrev").dataset.raw = String(coin);
  $("coinPrev").value = formatComma(coin);
  const disp = document.getElementById("coinPrevDisplay");
  if(disp) disp.textContent = formatComma(coin);
}

function updateBuffFromWheel(){
  const v = Number($("buffPctSel").value);
  $("buffPct").value = String(Number.isFinite(v)?v:0);
}

function initUI(){
  buildModeRadios();
  buildRadioRow("prevWaveRadios", "prevWave", WAVE_OPTIONS, 70);
  buildSelectRange("prevUpLv", 1, 31, 11);
  buildSelectRange("testUpLv", 1, 31, 11);
  buildSelectRange("prevTime", 1, 60, 30);
  buildSelectRange("testTime", 1, 60, 30);
  buildSelectRange("prevAtkCnt", 1, 24, 12);
  buildSelectRange("testAtkCnt", 1, 24, 12);

  buildVaultMoneySelects();

  // coin digits (X,XXX,000)
  buildDigitSelect("coinD1", 0);
  buildDigitSelect("coinD2", 1);
  buildDigitSelect("coinD3", 0);
  buildDigitSelect("coinD4", 0);
  buildBuffSelect("buffPctSel", 0);

  initInlineWheels();
  // enforce: 検証ウェーブは踏破ウェーブ未満を表示しない
  applyTestMinConstraints();
  // default values
  $("modeSel").value = "地獄";
  $("vaultLv").value = "6";
  $("moneyLv").value = "6";
  updateBuffFromWheel();
  updateCoinFromDigits();
  // sync wheels to selected values
  for(const id of ["modeSel","vaultLv","moneyLv","buffPctSel","coinD1","coinD2","coinD3","coinD4","prevUpLv","testUpLv","prevTime","testTime","prevAtkCnt","testAtkCnt"]){
    const api = WHEELS.get(id);
    if(api) api.sync();
  }

  attachListeners();
STATE.uiReady = true;
  calcAndRender();
}

async function boot(){
  try{
    await loadMasters();
    initUI();
  }catch(e){
    console.error(e);
    setStatus("エラー");
    alert(String(e?.message || e));
  }
}
boot();
