'use strict';

// Step7 Monte Carlo simulation worker
// Receives a plain snapshot of master data + cost table from main thread.

const GRADE_ORDER = ['N','R','E','L','M'];

let currentRunId = null;
let stopRequested = false;

self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.type === 'start'){
    startRun(msg).catch((e) => {
      try {
        self.postMessage({ type:'error', runId: msg.runId, message: String(e && e.message ? e.message : e) });
      } catch(_e) {}
    });
    return;
  }
  if (msg.type === 'stop'){
    if (!currentRunId) return;
    if (msg.runId && msg.runId !== currentRunId) return;
    stopRequested = true;
    return;
  }
};

function sleep0(){
  return new Promise(r => setTimeout(r, 0));
}

function clampInt(v, min, max){
  v = Number(v);
  if (!Number.isFinite(v)) v = min;
  v = Math.floor(v);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function copySlots(slots){
  return (slots || []).map(s => s ? ({...s}) : null);
}

function gradeIdx(g){
  const i = GRADE_ORDER.indexOf(g);
  return i >= 0 ? i : 0;
}

function buildCandidateReqMap(list){
  const map = new Map();
  for (const it of (list||[])){
    if (!it || !it.name) continue;
    map.set(it.name, { grade: it.grade, gradeIdx: gradeIdx(it.grade), valueMin: Number(it.valueMin ?? 0) });
  }
  return map;
}

function slotValue(slot){
  if (!slot) return 0;
  const v = (slot.valueMin != null) ? slot.valueMin : ((slot.value != null) ? slot.value : null);
  return Number(v ?? 0);
}

function isMatch(slot, req){
  if (!slot || !req) return false;
  if (req.name != null && slot.name !== req.name) return false;
  const sg = gradeIdx(slot.grade);
  return (sg >= req.gradeIdx && slotValue(slot) >= req.valueMin);
}

function classifySlot(slot, c1Map, c2Map, c3Map){
  if (!slot || !slot.name) return 'OUT';
  const r1 = c1Map.get(slot.name);
  if (r1 && isMatch(slot, r1)) return 'C1';
  const r2 = c2Map.get(slot.name);
  if (r2 && isMatch(slot, r2)) return 'C2';
  const r3 = c3Map.get(slot.name);
  if (r3 && isMatch(slot, r3)) return 'C3';
  return 'OUT';
}

function cmpTie(a, b, mode){
  // mode: 'score' or 'number'
  if (mode === 'number'){
    if ((a.number||0) !== (b.number||0)) return (a.number||0) - (b.number||0);
    return (b.score||0) - (a.score||0);
  } else {
    const ds = (b.score||0) - (a.score||0);
    if (ds !== 0) return ds;
    return (a.number||0) - (b.number||0);
  }
}

function reorderSlots(slots, c1Map, c2Map, c3Map, tieBreaker){
  const fixed = new Array(5).fill(null);
  const movable = [];
  for (let i=0;i<5;i++){
    const sl = slots[i];
    if (i<=2 && sl && sl.locked){
      fixed[i] = sl;
    } else {
      movable.push(sl);
    }
  }

  function pickBestForPos(pos){
    const isLockPos = (pos <= 2);
    const pref = isLockPos ? ['C1','C2','OUT'] : ['C3','C2','OUT'];
    const rank = (cls) => {
      const idx = pref.indexOf(cls);
      return idx>=0 ? idx : 2;
    };

    let bestIdx = 0;
    let best = movable[0];
    let bestKey = { r: rank(classifySlot(best,c1Map,c2Map,c3Map)), s: best && best.score ? best.score : 0, n: best && best.number ? best.number : 0 };
    for (let i=1;i<movable.length;i++){
      const it = movable[i];
      const k = { r: rank(classifySlot(it,c1Map,c2Map,c3Map)), s: it && it.score ? it.score : 0, n: it && it.number ? it.number : 0 };
      if (k.r < bestKey.r){
        bestIdx = i; best = it; bestKey = k;
      } else if (k.r === bestKey.r){
        const c = cmpTie(it, best, tieBreaker);
        if (c < 0){ bestIdx=i; best=it; bestKey=k; }
      }
    }
    movable.splice(bestIdx,1);
    return best;
  }

  const out = new Array(5).fill(null);
  for (let pos=0; pos<5; pos++){
    if (fixed[pos]){
      out[pos] = fixed[pos];
    } else {
      const picked = pickBestForPos(pos);
      if (picked) picked.locked = false;
      out[pos] = picked;
    }
  }
  return out;
}

function lockPrefixLen(slots){
  let k=0;
  for (let i=0;i<3;i++){
    if (slots[i] && slots[i].locked) k++;
    else break;
  }
  return k;
}

function setLockPrefix(slots, k){
  k = clampInt(k, 0, 3);
  for (let i=0;i<3;i++){
    if (!slots[i]) slots[i] = { locked: (i<k) };
    else slots[i].locked = (i < k);
  }
  for (let i=3;i<5;i++){
    if (slots[i]) slots[i].locked = false;
  }
}

function countMatchesInRange(slots, a, b, cmap){
  let n=0;
  for (let i=a;i<=b;i++){
    const sl = slots[i];
    if (!sl || !sl.name) continue;
    const req = cmap.get(sl.name);
    if (req && isMatch(sl, req)) n++;
  }
  return n;
}

function isEndSatisfied(slots, end, c1Map, c2Map, c3Map){
  // end: Array<{enabled?:boolean, slots: ('c1'|'c2'|'c3'|'none')[] }>
  if (!Array.isArray(end) || end.length === 0) return false;
  for (let si=0; si<end.length; si++){
    const set = end[si] || {};
    const enabled = (si===0) ? true : !!set.enabled;
    if (!enabled) continue;
    const tokArr = Array.isArray(set.slots) ? set.slots : [];
    let ok = true;
    for (let i=0;i<5;i++){
      const tok = tokArr[i] || 'none';
      if (tok === 'none') continue;
      const sl = slots[i];
      if (!sl || !sl.name){ ok = false; break; }
      let req = null;
      if (tok === 'c1') req = c1Map.get(sl.name);
      if (tok === 'c2') req = c2Map.get(sl.name);
      if (tok === 'c3') req = c3Map.get(sl.name);
      if (!req || !isMatch(sl, req)){ ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

function needC1InLockRange(slots, set1, c1Map){
  const tokArr = (set1 && Array.isArray(set1.slots)) ? set1.slots : [];
  const reqIdx = [];
  for (let i=0;i<3;i++){
    if ((tokArr[i]||'none') === 'c1') reqIdx.push(i);
  }
  if (reqIdx.length === 0) return false;
  let have = 0;
  for (const i of reqIdx){
    const sl = slots[i];
    const req = sl && sl.name ? c1Map.get(sl.name) : null;
    if (req && isMatch(sl, req)) have++;
  }
  return have < reqIdx.length;
}

function lockDecision(slots, cfg, end, c1Map, c2Map){
  const strat = cfg.lockStrategy || 'S1';
  const prefer = !!cfg.preferC1DontLockC2;

  const curK = lockPrefixLen(slots);
  const cap = 3 - curK;
  if (cap <= 0) return curK;

  const set1 = (Array.isArray(end) && end[0]) ? end[0] : { slots: [] };
  const missingC1 = needC1InLockRange(slots, set1, c1Map);

  // S2 endgame (slot3 focus)
  if (strat === 'S2' && cap === 1 && missingC1){
    const sl3 = slots[2];
    const tok3 = (set1 && Array.isArray(set1.slots)) ? (set1.slots[2]||'none') : 'none';
    if (tok3 === 'c1'){
      const r1 = sl3 && sl3.name ? c1Map.get(sl3.name) : null;
      if (r1 && isMatch(sl3, r1)) return 3;
    }
    if (tok3 === 'c2'){
      const r2 = sl3 && sl3.name ? c2Map.get(sl3.name) : null;
      if (r2 && isMatch(sl3, r2)) return 3;
    }
    return curK;
  }
// Determine whether C1 is still possible (not already locked in 1-3)
  let c1Possible = false;
  const lockedNames = new Set();
  for (let i=0;i<3;i++){
    if (slots[i] && slots[i].locked && slots[i].name) lockedNames.add(slots[i].name);
  }
  for (const [name,_req] of c1Map.entries()){
    if (!lockedNames.has(name)){ c1Possible = true; break; }
  }

  // has any C2 match in lock area
  let hasC2 = false;
  for (let i=0;i<3;i++){
    const sl = slots[i];
    const req = sl && sl.name ? c2Map.get(sl.name) : null;
    if (req && isMatch(sl, req)){ hasC2=true; break; }
  }

  const blockC2 = prefer && cap>0 && missingC1 && c1Possible && hasC2;

  let targetK = curK;

  const canExtend = () => targetK < 3;

  const extendFor = (wantCls) => {
    for (let i=targetK;i<3 && canExtend();i++){
      const sl = slots[i];
      const req = (!sl || !sl.name) ? null : ((wantCls==='C1') ? c1Map.get(sl.name) : c2Map.get(sl.name));
      if (req && isMatch(sl, req)){
        targetK = i+1;
      }
    }
  };

  if (strat === 'S1'){
    extendFor('C1');
  } else if (strat === 'S2'){
    if (cap >= 2){
      let newC1 = 0;
      for (let i=targetK;i<3;i++){
        const sl = slots[i];
        const req = (!sl || !sl.name) ? null : c1Map.get(sl.name);
        if (req && isMatch(sl, req)) newC1++;
      }
      if (newC1 >= 2){
        extendFor('C1');
      }
    }
  } else {
    extendFor('C1');
  }

  if (!blockC2){
    extendFor('C2');
  }

  return targetK;
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chooseUniform(arr){
  return arr[randInt(0, arr.length-1)];
}

function drawGrade(forceMythic){
  if (forceMythic) return 'M';
  const r = Math.random();
  if (r < 0.35) return 'N';
  if (r < 0.65) return 'R';
  if (r < 0.90) return 'E';
  if (r < 0.99) return 'L';
  return 'M';
}

function calcScore(masters, number, grade, value){
  const m = masters[String(number)] || masters[number];
  if (!m || !grade || !m.byGrade) return null;
  const r = m.byGrade[grade] || {};
  const stepmin = Number(r.stepmin ?? 1);
  const paramebase = Number(r.paramebase ?? r.paramemin ?? 0);
  const paramemax = Number(r.paramemax ?? r.paramemin ?? 0);

  const rankSteps = Math.round((Number(value) - paramebase) / stepmin) + 1;
  const totalSteps = Math.round((paramemax - paramebase) / stepmin) + 1;
  const score = Math.round((rankSteps / totalSteps) * 10000);
  return Number.isFinite(score) ? score : null;
}

async function simulateOnce(params){
  const { initialSlots, allNumbers, keyMax, gaugeInit, useKey, cfg, end, c1Map, c2Map, c3Map, tieBreaker, masters, costByLockcount } = params;

  let slots = copySlots(initialSlots);
  const initK = lockPrefixLen(slots);
  setLockPrefix(slots, initK);

  let gauge = clampInt(gaugeInit, 0, 1000000);
  let keys = 0;
  let pulls = 0;
  let mythicActs = 0;
  let lockSum = 0;
  let pullEvents = 0;

  const safetyKeys = clampInt(Number(cfg.keySafetyMax ?? 100000), 1000, 10000000);
  const maxPulls = clampInt(Number(cfg.maxPullsSafety ?? 50000), 1000, 2000000);

  const yieldEvery = 300; // pulls per yielding inside a single trial

  for (let step=0; step<maxPulls; step++){
    if (stopRequested) return { stop:true, pulls, keys, mythicActs, lockSum, pullEvents };
    if ((step % yieldEvery) === 0){
      await sleep0();
      if (stopRequested) return { stop:true, pulls, keys, mythicActs, lockSum, pullEvents };
    }

    const curLock = lockPrefixLen(slots);
    const cost = Number(costByLockcount[String(curLock)] ?? 0);

    if (keys + cost > safetyKeys){
      return { success:false, reason:'safety_keys', pulls, keys, mythicActs, lockSum, pullEvents };
    }
    if (useKey && (keys + cost > keyMax)){
      return { success:false, reason:'key_max', pulls, keys, mythicActs, lockSum, pullEvents };
    }

    keys += cost;
    gauge += cost;

    let forceMythic = false;
    if (gauge >= 500){
      forceMythic = true;
      gauge -= 500;
      mythicActs++;
    }

    lockSum += curLock;
    pullEvents++;

    const lockedNums = new Set();
    for (let i=0;i<3;i++){
      if (slots[i] && slots[i].locked && slots[i].number!=null) lockedNums.add(Number(slots[i].number));
    }
    const drawnNums = new Set();
    let firstUnlockedDone = false;

    for (let i=0;i<5;i++){
      if (i<=2 && slots[i] && slots[i].locked) continue;

      const pool = [];
      for (const n of allNumbers){
        if (lockedNums.has(n)) continue;
        if (drawnNums.has(n)) continue;
        pool.push(n);
      }
      if (!pool.length) continue;

      const num = chooseUniform(pool);
      drawnNums.add(num);

      const mm = masters[String(num)] || masters[num];
      const name = mm ? mm.name : String(num);

      const grade = drawGrade(forceMythic && !firstUnlockedDone);
      if (!firstUnlockedDone) firstUnlockedDone = true;

      const row = (mm && mm.byGrade && mm.byGrade[grade]) ? mm.byGrade[grade] : null;
      const stepmax = row ? Math.max(1, Number(row.stepmax||1)) : 1;
      const stepmin = row ? Number(row.stepmin||1) : 1;
      const paramemin = row ? Number(row.paramemin||0) : 0;
      const paramemax = row ? Number(row.paramemax ?? paramemin) : paramemin;

      const coef = randInt(1, stepmax);
      let value = paramemin + stepmin * (coef - 1);
      if (value < paramemin) value = paramemin;
      if (value > paramemax) value = paramemax;

      const score = calcScore(masters, num, grade, value);

      const keepLock = (i<=2 && slots[i]) ? !!slots[i].locked : false;
      slots[i] = {
        number: num,
        name,
        grade,
        valueMin: value,
        score,
        locked: keepLock,
      };
    }

    pulls++;

    slots = reorderSlots(slots, c1Map, c2Map, c3Map, tieBreaker);

    const nextK = lockDecision(slots, cfg, end, c1Map, c2Map);
    setLockPrefix(slots, nextK);

    if (isEndSatisfied(slots, end, c1Map, c2Map, c3Map)){
      return { success:true, pulls, keys, mythicActs, lockSum, pullEvents };
    }
  }

  return { success:false, reason:'max_pulls', pulls, keys, mythicActs, lockSum, pullEvents };
}

async function startRun(msg){
  currentRunId = msg.runId || `run_${Date.now()}`;
  stopRequested = false;

  const total = clampInt(msg.total||1, 1, 200000);
  const useKey = !!msg.useKey;
  const keyMax = clampInt(msg.keyMax||0, 0, 99999);
  const gaugeInit = clampInt(msg.gaugeInit||0, 0, 1000000);

  const cfg = msg.cfg || {};
  const endSets = msg.endSets || [];
  const tieBreaker = cfg.tieBreaker || 'score';

  const masters = msg.masters || {};
  const costByLockcount = msg.costByLockcount || {};
  const allNumbers = Array.isArray(msg.allNumbers) ? msg.allNumbers.map(Number) : Object.keys(masters).map(Number);

  const initialSlots = Array.isArray(msg.initialSlots) ? msg.initialSlots : [];

  const c1Map = buildCandidateReqMap((msg.candidates && msg.candidates.c1) ? msg.candidates.c1 : []);
  const c2Map = buildCandidateReqMap((msg.candidates && msg.candidates.c2) ? msg.candidates.c2 : []);
  const c3Map = buildCandidateReqMap((msg.candidates && msg.candidates.c3) ? msg.candidates.c3 : []);

  const pulls = [];
  const keysArr = [];

  let done = 0;
  let successes = 0;
  let sumMythic = 0;
  let sumKeys = 0;
  let sumLock = 0;
  let sumPullEvents = 0;

  const failBreakdown = { key_max:0, safety_keys:0, max_pulls:0 };

  const progressEvery = 50;
  const yieldEveryTrials = 25;

  for (let i=0;i<total;i++){
    if (stopRequested) break;

    const res = await simulateOnce({
      initialSlots,
      allNumbers,
      keyMax,
      gaugeInit,
      useKey,
      cfg,
      end: endSets,
      c1Map,
      c2Map,
      c3Map,
      tieBreaker,
      masters,
      costByLockcount,
    });

    if (res && res.stop){
      break;
    }

    done = i + 1;

    if (res && res.success){
      successes++;
      pulls.push(res.pulls);
      keysArr.push(res.keys);
      sumMythic += res.mythicActs || 0;
      sumKeys += res.keys || 0;
      sumLock += res.lockSum || 0;
      sumPullEvents += res.pullEvents || 0;
    } else {
      const reason = (res && res.reason) ? res.reason : 'max_pulls';
      if (failBreakdown[reason] != null) failBreakdown[reason]++;
    }

    if ((i % progressEvery) === 0){
      self.postMessage({ type:'progress', runId: currentRunId, done, successes });
    }

    if ((i % yieldEveryTrials) === 0){
      await sleep0();
    }
  }

  self.postMessage({
    type: 'done',
    runId: currentRunId,
    done,
    successes,
    pulls,
    keys: keysArr,
    sumMythic,
    sumKeys,
    sumLock,
    sumPullEvents,
    failBreakdown,
  });
}
