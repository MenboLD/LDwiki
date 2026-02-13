// ld_kouryaku_indicator.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const $ = (id) => document.getElementById(id);
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
  const root = $("modeRadios");
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
  const first = root.querySelector("input");
  if(first) first.checked = true;
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
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
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
  const n = clamp(parseIntLoose(el.value), 0, 9999);
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

function coinPower(coin, moneyLv, buff){
  const sb = STATE.masters.safeboxByMoneyLv.get(Number(moneyLv));
  if(!sb) return NaN;
  const money = Number(sb.money_value);
  return (Number(coin) * money) + Number(buff);
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
  $("testWaveLabel").textContent = String(testWave);

  // battle time max
  const prevEnm = safeGetEnm(mode, prevWave);
  const testEnm = safeGetEnm(mode, testWave);
  if(prevEnm) setRangeMax("prevTime", prevEnm.battle_time);
  if(testEnm) setRangeMax("testTime", testEnm.battle_time);

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
  // refresh slider labels
  $("prevTimeVal").textContent = String($("prevTime").value);
  $("testTimeVal").textContent = String($("testTime").value);
  $("prevAtkCntVal").textContent = String($("prevAtkCnt").value);
  $("testAtkCntVal").textContent = String($("testAtkCnt").value);

  const vaultLv = Number($("vaultLv").value);
  const moneyLv = Number($("moneyLv").value);

  const coinPrev = getCoinPrevRaw();
  const buff = getBuffAsFloat();

  const coinTest = computeCoinAfter10Waves({mode, coinPrev, vaultLv});
  $("coinTestLabel").textContent = Number.isFinite(coinTest) ? formatComma(roundToThousand(coinTest)) : "-";

  // Need enm rows
  if(!prevEnm || !testEnm){
    $("mEnemy").textContent = "-";
    $("mUser").textContent = "-";
    $("judge").textContent = "データ不足";
    $("judge").className = "judge";
    return;
  }

  const hpPrev = Number(prevEnm.hitpoint_int);
  const hpTest = Number(testEnm.hitpoint_int);
  const mEnemy = hpTest / hpPrev;

  // user ratios
  const fPrev = coinPower(coinPrev, moneyLv, buff);
  const fTest = coinPower(coinTest, moneyLv, buff);
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
  $("mEnemy").textContent = toFixed4(mEnemy);
  $("mUser").textContent = toFixed4(mUser);
  $("mCoin").textContent = toFixed4(mCoin);
  $("mUp").textContent = toFixed4(mUp);
  $("mTime").textContent = toFixed4(mTime);
  $("mAtkCnt").textContent = toFixed4(mAtkCnt);

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
  $("needUpLv").textContent = needUpText;

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
  $("needAtkCnt").textContent = needAtkText;
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


function initTabs(){
  const tabPrev = document.getElementById("tabPrev");
  const tabTest = document.getElementById("tabTest");
  const panelPrev = document.getElementById("panelPrev");
  const panelTest = document.getElementById("panelTest");
  if(!tabPrev || !tabTest || !panelPrev || !panelTest) return;

  const activate = (which) => {
    const isPrev = which === "prev";
    tabPrev.classList.toggle("is-active", isPrev);
    tabTest.classList.toggle("is-active", !isPrev);

    tabPrev.setAttribute("aria-selected", isPrev ? "true" : "false");
    tabTest.setAttribute("aria-selected", !isPrev ? "true" : "false");

    panelPrev.hidden = !isPrev;
    panelTest.hidden = isPrev;

    // keep numbers fresh even when switching
    calcAndRender();
  };

  tabPrev.addEventListener("click", () => activate("prev"));
  tabTest.addEventListener("click", () => activate("test"));

  // default
  activate("prev");
}

function attachListeners(){
  // recompute on any input changes
  const ids = [
    "coinPrev","buffPct","vaultLv","moneyLv",
    "prevUpLv","testUpLv",
    "prevTime","testTime",
    "prevAtkCnt","testAtkCnt"
  ];
  for(const id of ids){
    $(id).addEventListener("input", () => {
      if(id === "coinPrev"){
        // allow typing; update on blur for display rounding, but compute on input using raw parse
        $("coinPrev").dataset.raw = String(parseIntLoose($("coinPrev").value.replace(/,/g,"")) || "");
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

function initUI(){
  buildModeRadios();
  buildRadioRow("prevWaveRadios", "prevWave", WAVE_OPTIONS, 10);
  buildSelectRange("prevUpLv", 1, 31, 1);
  buildSelectRange("testUpLv", 1, 31, 1);

  buildVaultMoneySelects();

  // default values
  $("coinPrev").value = "100,000";
  $("coinPrev").dataset.raw = "100000";
  $("buffPct").value = "0";

  setSliderLabel("prevTime","prevTimeVal");
  setSliderLabel("testTime","testTimeVal");
  setSliderLabel("prevAtkCnt","prevAtkCntVal");
  setSliderLabel("testAtkCnt","testAtkCntVal");

  attachStepButtons();
  attachListeners();
  initTabs();

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
