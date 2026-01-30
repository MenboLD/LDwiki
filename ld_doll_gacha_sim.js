/* ld_doll_gacha_sim.js (step 1-4) */
(() => {
  'use strict';

  const VERSION = '20260129j';

  const GRADE_JP_TO_SHORT = {
    'ノーマル':'N',
    'レア':'R',
    'エピック':'E',
    'レジェンド':'L',
    '神話':'M',
  };
  const GRADE_SHORT_TO_JP = {
    'N':'ノーマル',
    'R':'レア',
    'E':'エピック',
    'L':'レジェンド',
    'M':'神話',
  };
  const GRADE_ORDER = ['N','R','E','L','M'];
  const STEP_LABEL = {
    1:'①',2:'②',3:'③',4:'④',5:'⑤',6:'⑥',7:'⑦'
  };

  const RARITY_BG_CLASS = { N:'card-bgN', R:'card-bgR', E:'card-bgE', L:'card-bgL', M:'card-bgM' };

  const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="100%" height="100%" rx="14" ry="14" fill="#22262d"/>
      <path d="M18 44c7-18 21-18 28 0" fill="none" stroke="#8a93a3" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="26" r="8" fill="none" stroke="#8a93a3" stroke-width="3"/>
    </svg>`
  );

  const $ = (sel, root=document) => root.querySelector(sel);

  const app = {
    supabase: null,
    masterByNumber: new Map(), // number -> {number,name,picurl,basetxt, byGrade:{N:row..}}
    state: null,
  };

  function makeBlankSlot(){
    return { number:null, name:null, grade:null, value:null, score:null, picurl:null, desc:null, locked:false };
  }

  function initState(){
    return {
      currentStep: 1,
      maxReached: 1,
      confirmedSlotsSig: null,
      slot: [makeBlankSlot(),makeBlankSlot(),makeBlankSlot(),makeBlankSlot(),makeBlankSlot()],
      selectedSlotIndex: null,
      candidate1: [],
      candidate2: [],
      candidate3: [],
      stepStates: {
        1: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
        2: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
        3: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
        4: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
      },
      modal: { open:false, step:null, number:null, idx:0 },
      confirm: { open:false, title:'', message:'', yesLabel:'', noLabel:'', action:null },
      error: null,
      loading: true,
    };
  }

  function assertSupabaseConfig(){
    if (!window.LD_SUPABASE_URL || !window.LD_SUPABASE_ANON_KEY){
      throw new Error('supabase_config.js が見つからないか、LD_SUPABASE_URL / LD_SUPABASE_ANON_KEY が未設定です。');
    }
    if (!window.supabase || !window.supabase.createClient){
      throw new Error('supabase-js の読み込みに失敗しました。');
    }
  }

  async function loadMaster(){
    // ld_piece_gacha
    const { data: gacha, error: e1 } = await app.supabase
      .from('ld_piece_gacha')
      .select('*')
      .order('number', { ascending: true })
      .order('id', { ascending: true });
    if (e1) throw e1;
    if (!Array.isArray(gacha) || gacha.length < 30) throw new Error('ld_piece_gacha の取得に失敗しました。');

    // build map
    for (const row of gacha){
      const num = Number(row.number);
      if (!app.masterByNumber.has(num)){
        app.masterByNumber.set(num, {
          number: num,
          name: String(row.name),
          picurl: row.picurl || null,
          basetxt: String(row.basetxt || ''),
          byGrade: {},
        });
      }
      const m = app.masterByNumber.get(num);
      const g = GRADE_JP_TO_SHORT[String(row.grade)] || null;
      if (!g) continue;

      m.byGrade[g] = {
        id: row.id,
        number: num,
        name: String(row.name),
        grade: g,
        stepmin: Number(row.stepmin),
        stepmax: Number(row.stepmax),
        paramemin: Number(row.paramemin),
        paramebase: Number(row.paramebase), // defensive
        paramemax: Number(row.paramemax),
        fp: Number(row.fp),
        basetxt: String(row.basetxt || ''),
        ability1: String(row.ability1 || ''),
        ability2: String(row.ability2 || ''),
        picurl: row.picurl || null,
      };
    }

    // sanity: ensure all grades exist
    for (let i=1;i<=30;i++){
      const m = app.masterByNumber.get(i);
      if (!m) throw new Error('master missing number=' + i);
      for (const g of GRADE_ORDER){
        if (!m.byGrade[g]) throw new Error(`master missing number=${i} grade=${g}`);
      }
    }
  }

  function getStepState(step){
    return app.state.stepStates[step];
  }

  function formatValue(v, fp){
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '';
    const n = Number(v);
    const f = Math.max(0, Number(fp)||0);
    return n.toFixed(f);
  }

  function buildDesc(number, grade, value){
    const m = app.masterByNumber.get(Number(number));
    if (!m) return '';
    if (!grade){
      return m.basetxt || '';
    }
    const r = m.byGrade[grade];
    const vv = (value === null || value === undefined) ? r.paramemin : Number(value);
    return `${(r.ability1||'').trim()}${formatValue(vv, r.fp)}${(r.ability2||'').trim()}`;
  }

  function calcScore(number, grade, value){
    const m = app.masterByNumber.get(Number(number));
    if (!m || !grade) return null;
    const r = m.byGrade[grade];
    const stepmin = r.stepmin;
    const paramebase = r.paramebase;
    const paramemax = r.paramemax;

    // integerize by stepmin
    const rankSteps = Math.round((Number(value) - paramebase) / stepmin) + 1;
    const totalSteps = Math.round((paramemax - paramebase) / stepmin) + 1;
    const score = Math.round((rankSteps / totalSteps) * 10000);
    return Number.isFinite(score) ? score : null;
  }

  function getLockedNames(){
    const s = app.state.slot;
    const set = new Set();
    for (let i=0;i<3;i++){
      if (s[i] && s[i].locked && s[i].name) set.add(s[i].name);
    }
    return set;
  }

  function getTransferredGradeByNumber(){
    const map = new Map();
    for (const sl of app.state.slot){
      if (sl && sl.number){
        map.set(Number(sl.number), sl.grade);
      }
    }
    return map;
  }

  function getCandidateNameSet(list){
    const set = new Set();
    for (const c of (list||[])){
      if (c && c.name) set.add(c.name);
    }
    return set;
  }

  function isDisabledInStep(step, number){
    if (step < 2 || step > 4) return false;
    const num = Number(number);
    const m = app.masterByNumber.get(num);
    if (!m) return true;

    const st = getStepState(step);
    if (st.selected.size >= 10 && !st.selected.has(num)) return true;

    const locked = getLockedNames();
    const c1 = getCandidateNameSet(app.state.candidate1);
    const c2 = getCandidateNameSet(app.state.candidate2);
    const c3 = getCandidateNameSet(app.state.candidate3);

    if (locked.has(m.name)) return true;
    // other-step selections are not allowed
    if (step === 2 && (c2.has(m.name) || c3.has(m.name))) return true;
    if (step === 3 && (c1.has(m.name) || c3.has(m.name))) return true;
    if (step === 4 && (c1.has(m.name) || c2.has(m.name))) return true;
    return false;
  }

  function getOverlayLabel(step, number){
    const num = Number(number);
    const m = app.masterByNumber.get(num);
    if (!m) return null;

    // when the reason is only "limit reached", do not show a label
    if (step >= 2 && step <= 4){
      const st = getStepState(step);
      if (st.selected.size >= 10 && !st.selected.has(num)){
        // may still have other reasons; keep checking
      }
    }

    const locked = getLockedNames();
    const c1 = getCandidateNameSet(app.state.candidate1);
    const c2 = getCandidateNameSet(app.state.candidate2);
    const c3 = getCandidateNameSet(app.state.candidate3);

    if (locked.has(m.name)) return 'スロットでロック中';
    if (c1.has(m.name)) return '第1候補で選択中';
    if (c2.has(m.name)) return '第2候補で選択中';
    if (c3.has(m.name)) return '第3候補で選択中';
    return null;
  }

  function selectCard(step, num, initGrade){
    const st = getStepState(step);
    const number = Number(num);
    if (step >= 2 && step <= 4){
      if (isDisabledInStep(step, number)) return;
      if (st.selected.size >= 10 && !st.selected.has(number)) return;
    }
    st.selected.add(number);
    const grade = initGrade || (step === 1 ? 'N' : 'M');
    st.grade.set(number, grade);
    const r = app.masterByNumber.get(number).byGrade[grade];
    st.value.set(number, r.paramemin);
    if (step === 1){
      upsertSlotFromStep1(number, false);
    }
  }

  function deselectCard(step, num){
    const st = getStepState(step);
    const number = Number(num);
    st.selected.delete(number);
    st.grade.delete(number);
    st.value.delete(number);
  }

  function toggleCardByImage(step, num){
    const st = getStepState(step);
    const number = Number(num);

    if (step === 1){
      // basic 1-card workflow: selecting a new card replaces the old selection
      if (!st.selected.has(number) && st.selected.size >= 1){
        for (const old of Array.from(st.selected)) deselectCard(1, old);
      }
    }

    if (st.selected.has(number)){
      deselectCard(step, number);
    } else {
      selectCard(step, number, step === 1 ? 'N' : 'M');
      if (step === 1){
        upsertSlotFromStep1(number, true);
      }
    }
  }

  function setCardGrade(step, num, grade){
    const st = getStepState(step);
    const number = Number(num);

    if (step >= 2 && step <= 4 && isDisabledInStep(step, number) && !st.selected.has(number)) return;

    if (!st.selected.has(number)){
      if (step === 1 && st.selected.size >= 1){
        for (const old of Array.from(st.selected)) deselectCard(1, old);
      }
      selectCard(step, number, grade);
      if (step === 1){
        upsertSlotFromStep1(number, true);
      }
      return;
    }

    const prev = st.grade.get(number) || null;

    // Step①: re-tap same grade => unselect (E-05)
    if (step === 1 && prev === grade){
      deselectCard(step, number);
      return;
    }

    st.grade.set(number, grade);
    const r = app.masterByNumber.get(number).byGrade[grade];
    st.value.set(number, r.paramemin);
    if (step === 1){
      upsertSlotFromStep1(number, false);
    }
  }

  function openModal(step, num){
    const st = getStepState(step);
    const number = Number(num);
    if (!st.selected.has(number)) return;

    const grade = st.grade.get(number);
    if (!grade) return;

    const r = app.masterByNumber.get(number).byGrade[grade];
    const cur = st.value.get(number);
    const idx = Math.round((Number(cur) - r.paramemin) / r.stepmin);
    app.state.modal = { open:true, step, number, idx: clampInt(idx, 0, Math.max(0, (r.stepmax||1) - 1)) };
  }

  function closeModal(){
    app.state.modal = { open:false, step:null, number:null, idx:0 };
  }

  function openConfirm({ title, message, yesLabel, noLabel, action }){
    app.state.confirm = {
      open: true,
      title: String(title || ''),
      message: String(message || ''),
      yesLabel: String(yesLabel || 'OK'),
      noLabel: String(noLabel || 'キャンセル'),
      action: action || null,
    };
    // value modal is mutually exclusive
    closeModal();
  }

  function closeConfirm(){
    app.state.confirm = { open:false, title:'', message:'', yesLabel:'', noLabel:'', action:null };
  }

  function clampInt(v, min, max){
    return Math.max(min, Math.min(max, Math.trunc(v)));
  }

  function modalApplyIdx(newIdx){
    const m = app.state.modal;
    if (!m.open) return;
    const st = getStepState(m.step);
    const number = m.number;
    const grade = st.grade.get(number);
    const r = app.masterByNumber.get(number).byGrade[grade];
    const maxIdx = Math.max(0, (r.stepmax||1) - 1);
    m.idx = clampInt(newIdx, 0, maxIdx);
  }

  function modalCurrentValue(){
    const m = app.state.modal;
    if (!m.open) return null;
    const st = getStepState(m.step);
    const number = m.number;
    const grade = st.grade.get(number);
    const r = app.masterByNumber.get(number).byGrade[grade];
    return r.paramemin + (r.stepmin * m.idx);
  }

  function modalPreset(p){
    const m = app.state.modal;
    if (!m.open) return;
    const st = getStepState(m.step);
    const number = m.number;
    const grade = st.grade.get(number);
    const r = app.masterByNumber.get(number).byGrade[grade];

    // Percent is within this rarity band: [paramemin, paramemax]
    const span = (r.paramemax - r.paramemin);
    const target = r.paramemin + span * p;

    // snap to discrete step grid
    const k = Math.round((target - r.paramemin) / r.stepmin);
    const value = clampNum(r.paramemin + k * r.stepmin, r.paramemin, r.paramemax);

    const idx = Math.round((value - r.paramemin) / r.stepmin);
    modalApplyIdx(idx);
  }

function clampNum(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function modalDecide(){
    const m = app.state.modal;
    if (!m.open) return;

    const st = getStepState(m.step);
    const number = m.number;
    const grade = st.grade.get(number);
    const r = app.masterByNumber.get(number).byGrade[grade];
    const value = r.paramemin + (r.stepmin * m.idx);

    st.value.set(number, clampNum(value, r.paramemin, r.paramemax));
    if (m.step === 1){
      upsertSlotFromStep1(number, false);
    }
    closeModal();
  }

  
  function findSlotIndexByNumber(number){
    const n = Number(number);
    for (let i=0;i<5;i++){
      const sl = app.state.slot[i];
      if (sl && sl.number && Number(sl.number) === n) return i;
    }
    return -1;
  }

  function upsertSlotFromStep1(number, allowInsert){
    const st = getStepState(1);
    const n = Number(number);
    const m = app.masterByNumber.get(n);
    if (!m) return;

    const grade = st.grade.get(n);
    const value = st.value.get(n);
    if (!grade || value == null) return;

    const desc = buildDesc(n, grade, value);
    const score = calcScore(n, grade, value);

    // find existing same number/name
    let idx = -1;
    for (let i=0;i<5;i++){
      const sl = app.state.slot[i];
      if (sl && sl.number && Number(sl.number) === n){ idx = i; break; }
      if (sl && sl.name && sl.name === m.name){ idx = i; break; }
    }
    if (idx === -1){
      if (!allowInsert) return;
      for (let i=0;i<5;i++){
        if (!app.state.slot[i].number){ idx = i; break; }
      }
    }
    if (idx === -1){
      toast('スロットが満杯です（空きを作ってください）');
      return;
    }

    const keepLocked = app.state.slot[idx].locked === true;
    app.state.slot[idx] = {
      number: m.number,
      name: m.name,
      grade,
      value,
      score,
      picurl: m.picurl,
      desc,
      locked: keepLocked,
    };
    enforceLockContinuity();
  }

  function deleteSlotAt(idx){
    const index = Number(idx);
    if (!(index >= 0 && index < 5)) return;
    if (!app.state.slot[index] || !app.state.slot[index].number) return;

    const newSlot = buildSlotAfterDelete(index);

    const clearNames = [];
    for (let i=0;i<3;i++){
      const sl = newSlot[i];
      if (sl && sl.locked && sl.name){
        const overlap = findOverlapsByName(sl.name);
        if (overlap && overlap.hasAny){
          if (!clearNames.includes(sl.name)) clearNames.push(sl.name);
        }
      }
    }

    if (clearNames.length){
      openConfirm({
        title: '確認',
        message: `スロット削除によりロック枠に入る人形が、ステップ②〜④で選択済みです。\n選択状態を解除して削除しますか？\n（対象：${clearNames.join('、')}）`,
        yesLabel: '解除して削除',
        noLabel: 'キャンセル',
        action: { type:'delete-and-clear', slotAfter: newSlot, clearNames },
      });
      return;
    }

    // apply directly
    app.state.slot = newSlot;
    if (app.state.selectedSlotIndex === index) app.state.selectedSlotIndex = null;
    enforceLockContinuity();
  }
  function deleteSelectedSlot(){
    const idx = app.state.selectedSlotIndex;
    if (idx === null || idx === undefined) return;
    deleteSlotAt(idx);
  }



function transferToSlot(){
    const st = getStepState(1);
    if (st.selected.size < 1) return;

    const number = Array.from(st.selected)[0];
    const m = app.masterByNumber.get(number);
    const grade = st.grade.get(number);
    const value = st.value.get(number);
    const desc = buildDesc(number, grade, value);
    const score = calcScore(number, grade, value);

    // find existing same name
    let idx = -1;
    for (let i=0;i<5;i++){
      if (app.state.slot[i] && app.state.slot[i].name === m.name){
        idx = i; break;
      }
    }
    if (idx === -1){
      // find first blank (topmost)
      for (let i=0;i<5;i++){
        if (!app.state.slot[i].number){
          idx = i; break;
        }
      }
    }
    if (idx === -1){
      // all filled and no same name
      toast('スロットが満杯です（同名がないため転写できません）');
      return;
    }

    const keepLocked = app.state.slot[idx].locked === true;
    app.state.slot[idx] = {
      number: m.number,
      name: m.name,
      grade,
      value,
      score,
      picurl: m.picurl,
      desc,
      locked: keepLocked,
    };

    // after transfer: clear list selection (workflow friendly)
    deselectCard(1, number);
    app.state.selectedSlotIndex = null;

    // enforce lock rule after overwrite
    enforceLockContinuity();
  }

  
      }
    }

    if (clearNames.length){
      openConfirm({
        title: '確認',
        message: `スロット削除によりロック枠に入る人形が、ステップ②〜④で選択済みです。\n選択状態を解除して削除しますか？\n（対象：${clearNames.join('、')}）`,
        yesLabel: '解除して削除',
        noLabel: 'キャンセル',
        action: { type:'delete-and-clear', newSlot, clearNames },
      });
      return;
    }

    app.state.slot = newSlot;
    app.state.selectedSlotIndex = null;
    enforceLockContinuity();
  }

  function buildSlotAfterDelete(idx){
    const arr = app.state.slot.slice();
    arr.splice(idx, 1);
    arr.push(makeBlankSlot());

    const lockedFlags = app.state.slot.map(s => !!s.locked);
    const newSlot = [];
    for (let i=0;i<5;i++){
      const content = arr[i] || makeBlankSlot();
      newSlot.push({
        ...content,
        locked: (i <= 2) ? (lockedFlags[i] && !!content.number) : false,
      });
    }

    // blank => locked false
    for (let i=0;i<5;i++){
      if (!newSlot[i].number) newSlot[i].locked = false;
      if (i >= 3) newSlot[i].locked = false;
    }

    enforceLockContinuityOn(newSlot);
    return newSlot;
  }

  function enforceLockContinuityOn(slots){
    // enforce prefix lock only for 0..2; 3..4 are always unlocked
    for (let i=3;i<5;i++){
      if (slots[i]) slots[i].locked = false;
    }
    for (let i=0;i<3;i++){
      if (!slots[i].number){
        slots[i].locked = false;
      }
      if (i > 0 && !slots[i-1].locked){
        slots[i].locked = false;
      }
    }
  }

  function enforceLockContinuity(){
    // lock is only for slot 0..2 (1〜3). 3..4 are always unlocked.
    for (let i=3;i<5;i++){
      if (app.state.slot[i]) app.state.slot[i].locked = false;
    }
    for (let i=0;i<3;i++){
      if (!app.state.slot[i].number){
        app.state.slot[i].locked = false;
      }
      if (i>0 && !app.state.slot[i-1].locked){
        app.state.slot[i].locked = false;
      }
    }
  }

  function toggleLock(index){
    const i = Number(index);
    if (i < 0 || i > 2) return;
    const sl = app.state.slot[i];
    if (!sl.number) return;

    const next = !sl.locked;
    // unlock
    if (!next){
      sl.locked = false;
      enforceLockContinuity();
      return;
    }

    // lock: must be prefix (1->2->3)
    if (i > 0 && !app.state.slot[i-1].locked){
      toast(`先にスロット${i}をロックしてください`);
      return;
    }

    // if this doll is already selected in steps 2-4, ask to clear
    const name = sl.name;
    const overlap = findOverlapsByName(name);
    if (overlap.hasAny){
      openConfirm({
        title: '確認',
        message: `スロット②〜④ですでに選択済みの人形の選択状態を解除する？\n（対象：${name}）`,
        yesLabel: '解除してロック',
        noLabel: 'キャンセル',
        action: { type:'lock-and-clear', slotIndex:i, dollName:name },
      });
      return;
    }

    sl.locked = true;
    enforceLockContinuity();
  }

  function findOverlapsByName(name){
    const out = { hasAny:false };
    // confirmed candidates
    const inC1 = app.state.candidate1.some(x => x.name === name);
    const inC2 = app.state.candidate2.some(x => x.name === name);
    const inC3 = app.state.candidate3.some(x => x.name === name);
    if (inC1 || inC2 || inC3) out.hasAny = true;

    // in-progress selections
    for (const s of [2,3,4]){
      const st = getStepState(s);
      for (const num of st.selected){
        const m = app.masterByNumber.get(num);
        if (m && m.name === name){
          out.hasAny = true;
          break;
        }
      }
      if (out.hasAny) break;
    }
    return out;
  }

  function applyLockAndClear(action){
    if (!action || action.type !== 'lock-and-clear') return;
    const i = Number(action.slotIndex);
    const name = String(action.dollName || '');
    if (!(i >= 0 && i <= 2)) return;
    const sl = app.state.slot[i];
    if (!sl || !sl.number) return;
    if (sl.name !== name) return;

    // clear confirmed candidates
    app.state.candidate1 = app.state.candidate1.filter(x => x.name !== name);
    app.state.candidate2 = app.state.candidate2.filter(x => x.name !== name);
    app.state.candidate3 = app.state.candidate3.filter(x => x.name !== name);

    // clear in-progress selections (2-4)
    for (const step of [2,3,4]){
      const st = getStepState(step);
      const removeNums = Array.from(st.selected).filter(num => {
        const m = app.masterByNumber.get(num);
        return m && m.name === name;
      });
      for (const num of removeNums){
        deselectCard(step, num);
      }
    }

    // now lock
    if (i > 0 && !app.state.slot[i-1].locked){
      toast(`先にスロット${i}をロックしてください`);
      return;
    }
    sl.locked = true;
    enforceLockContinuity();
  


  function applyDeleteAndClear(action){
    if (!action || action.type !== 'delete-and-clear') return;
    const names = Array.isArray(action.clearNames) ? action.clearNames.map(x => String(x||'')).filter(Boolean) : [];
    if (!names.length) return;

    // clear confirmed candidates
    for (const name of names){
      app.state.candidate1 = app.state.candidate1.filter(x => x.name !== name);
      app.state.candidate2 = app.state.candidate2.filter(x => x.name !== name);
      app.state.candidate3 = app.state.candidate3.filter(x => x.name !== name);
    }

    // clear in-progress selections (2-4)
    for (const step of [2,3,4]){
      const st = getStepState(step);
      const removeNums = Array.from(st.selected).filter(num => {
        const m = app.masterByNumber.get(num);
        return m && names.includes(m.name);
      });
      for (const num of removeNums){
        deselectCard(step, num);
      }
    }

    // commit slot state after deletion
    if (Array.isArray(action.newSlot) && action.newSlot.length === 5){
      app.state.slot = action.newSlot.map(s => ({ ...s, locked: !!s.locked }));
    }

    app.state.selectedSlotIndex = null;
    enforceLockContinuity();
  }

}

  function swapSlotContentWithConfirm(i, j){
  const a = app.state.slot[i];
  const b = app.state.slot[j];
  if (!a?.number || !b?.number) return;

  // compute locked names before
  const beforeLocked = new Set();
  for (let k=0;k<=2;k++){
    const sl = app.state.slot[k];
    if (sl?.locked && sl?.name) beforeLocked.add(sl.name);
  }

  // compute new slot state after swap (lock is position-based)
  const keepLockA = !!a.locked;
  const keepLockB = !!b.locked;
  const newSlot = app.state.slot.map((s, idx) => ({...s}));
  newSlot[i] = { ...b, locked: keepLockA };
  newSlot[j] = { ...a, locked: keepLockB };

  // compute new locked names after & detect newly-locked dolls
  const afterLocked = new Set();
  for (let k=0;k<=2;k++){
    const sl = newSlot[k];
    if (sl?.locked && sl?.name) afterLocked.add(sl.name);
  }
  const newlyLocked = Array.from(afterLocked).filter(name => !beforeLocked.has(name));

  // Only when a NEWLY locked doll conflicts with step2-4 selections/candidates, ask confirm
  const clearNames = newlyLocked.filter(name => findOverlapsByName(name).hasAny);

  if (clearNames.length){
    const uniq = Array.from(new Set(clearNames));
    openConfirm({
      title: '確認',
      message: `移動によりロック枠に入る人形が、ステップ②〜④で選択済みです。
選択状態を解除して移動しますか？
（対象：${uniq.join('、')}）`,
      yesLabel: '解除して移動',
      noLabel: 'キャンセル',
      action: { type:'swap-and-clear', clearNames: uniq, newSlot },
    });
    return;
  }

  // no conflicts => commit immediately
  app.state.slot = newSlot.map(s => ({...s, locked: !!s.locked}));
  enforceLockContinuity();
}

function applySwapAndClear(action){
  if (!action || action.type !== 'swap-and-clear') return;
  const names = Array.isArray(action.clearNames) ? action.clearNames.map(x => String(x||'')).filter(Boolean) : [];
  const newSlot = Array.isArray(action.newSlot) && action.newSlot.length === 5 ? action.newSlot : null;
  if (!newSlot) return;

  // clear confirmed candidates
  for (const name of names){
    app.state.candidate1 = app.state.candidate1.filter(x => x.name !== name);
    app.state.candidate2 = app.state.candidate2.filter(x => x.name !== name);
    app.state.candidate3 = app.state.candidate3.filter(x => x.name !== name);
  }

  // clear in-progress selections (2-4)
  for (const step of [2,3,4]){
    const st = getStepState(step);
    const removeNums = Array.from(st.selected).filter(num => {
      const m = app.masterByNumber.get(num);
      return m && names.includes(m.name);
    });
    for (const num of removeNums){
      deselectCard(step, num);
    }
  }

  // commit swap
  app.state.slot = newSlot.map(s => ({ ...s, locked: !!s.locked }));
  enforceLockContinuity();
}




// ---------- dirty check (step tab auto-confirm) ----------
function slotSignature(){
  return app.state.slot.map(s => {
    const num = s?.number ?? '';
    const grade = s?.grade ?? '';
    const v = (s?.valueMin ?? s?.value ?? '');
    return `${num}:${grade}:${v}`;
  }).join('|');
}
function selectionSignature(step){
  const st = getStepState(step);
  const nums = Array.from(st.selected).sort((a,b)=>a-b);
  return nums.map(num => {
    const grade = st.grade.get(num) ?? '';
    const v = st.value.get(num) ?? '';
    return `${num}:${grade}:${v}`;
  }).join('|');
}
function candidateSignature(list){
  if (!Array.isArray(list) || list.length === 0) return '';
  const sorted = list.slice().sort((a,b)=>Number(a.number)-Number(b.number));
  return sorted.map(x => `${x.number}:${x.grade}:${x.valueMin}`).join('|');
}
function isDirtyStep(step){
  const s = Number(step);
  if (s === 1){
    if (app.state.maxReached < 2) return true;
    if (!app.state.confirmedSlotsSig) return true;
    return slotSignature() !== app.state.confirmedSlotsSig;
  }
  if (s === 2) return selectionSignature(2) !== candidateSignature(app.state.candidate1);
  if (s === 3) return selectionSignature(3) !== candidateSignature(app.state.candidate2);
  if (s === 4) return selectionSignature(4) !== candidateSignature(app.state.candidate3);
  return false;
}

  function confirmStep(step){
    const s = Number(step);

    if (s === 1){
      const allFilled = app.state.slot.every(x => !!x.number);
      if (!allFilled){
        toast('スロット5枠をすべて埋めてください');
        return;
      }
      // if re-confirm, invalidate candidates
      app.state.candidate1 = [];
      app.state.candidate2 = [];
      app.state.candidate3 = [];
      app.state.confirmedSlotsSig = slotSignature();
      app.state.currentStep = 2;
      app.state.maxReached = 2;
      // reset selection states for 2-4
      for (const k of [2,3,4]){
        const st = getStepState(k);
        st.selected = new Set();
        st.grade = new Map();
        st.value = new Map();
        st.activeTab = 1;
      }
      return;
    }

    if (s >= 2 && s <= 4){
      const st = getStepState(s);
      const n = st.selected.size;
      if (n < 1 || n > 10){
        toast('このステップで選択中の人形を 1〜10 個にしてください');
        return;
      }
      const list = Array.from(st.selected).sort((a,b)=>a-b).map(num => {
        const m = app.masterByNumber.get(num);
        const grade = st.grade.get(num);
        const value = st.value.get(num);
        const desc = buildDesc(num, grade, value);
        const score = calcScore(num, grade, value);
        return { number: num, name: m.name, grade, valueMin: value, score, desc };
      });

      if (s === 2){
        app.state.candidate1 = list;
        app.state.candidate2 = [];
        app.state.candidate3 = [];
        app.state.currentStep = 3;
        app.state.maxReached = 3;
      } else if (s === 3){
        // ensure no overlap with candidate1 (should already be blocked)
        const c1 = getCandidateNameSet(app.state.candidate1);
        if (list.some(x => c1.has(x.name))){
          toast('候補1と同名は候補2で選べません');
          return;
        }
        app.state.candidate2 = list;
        app.state.candidate3 = [];
        app.state.currentStep = 4;
        app.state.maxReached = 4;
      } else if (s === 4){
        const c1 = getCandidateNameSet(app.state.candidate1);
        const c2 = getCandidateNameSet(app.state.candidate2);
        if (list.some(x => c1.has(x.name) || c2.has(x.name))){
          toast('候補1/2と同名は候補3で選べません');
          return;
        }
        app.state.candidate3 = list;
        app.state.currentStep = 5;
        app.state.maxReached = 5;
      }
    }
  }

  function resetStepState(step){
    const st = getStepState(step);
    st.selected = new Set();
    st.grade = new Map();
    st.value = new Map();
    st.activeTab = 1;
  }

  function resetFromStep(step){
    const s = Number(step);
    if (s <= 1){
      // full reset
      app.state.slot = Array.from({length:5}, () => ({ number:null, name:'', picurl:'', grade:null, valueMin:null, score:null, desc:'', locked:false }));
      app.state.selectedSlotIndex = null;
      app.state.candidate1 = [];
      app.state.candidate2 = [];
      app.state.candidate3 = [];
      app.state.currentStep = 1;
      app.state.maxReached = 1;
      app.state.confirmedSlotsSig = null;
      for (const k of [1,2,3,4]) resetStepState(k);
      return;
    }

    if (s === 2){
      app.state.candidate1 = [];
      app.state.candidate2 = [];
      app.state.candidate3 = [];
      for (const k of [2,3,4]) resetStepState(k);
      app.state.currentStep = 2;
      app.state.maxReached = 2;
      return;
    }
    if (s === 3){
      app.state.candidate2 = [];
      app.state.candidate3 = [];
      for (const k of [3,4]) resetStepState(k);
      app.state.currentStep = 3;
      app.state.maxReached = 3;
      return;
    }
    if (s === 4){
      app.state.candidate3 = [];
      resetStepState(4);
      app.state.currentStep = 4;
      app.state.maxReached = 4;
      return;
    }
  }

  function setAllGrade(step, grade){
    const s = Number(step);
    if (s < 2 || s > 4) return;
    const st = getStepState(s);
    if (st.selected.size < 1) return;

    for (const num of st.selected){
      st.grade.set(num, grade);
      const r = app.masterByNumber.get(num).byGrade[grade];
      st.value.set(num, r.paramemin);
    }
  }

  function removeFromPanel(step, num){
    const s = Number(step);
    if (s < 2 || s > 4) return;
    const st = getStepState(s);
    const number = Number(num);
    if (st.selected.has(number)){
      deselectCard(s, number);
    }
  }

  function goStep(step){
    const s = Number(step);
    if (!Number.isFinite(s)) return;
    if (s < 1 || s > 7) return;
    if (s > app.state.maxReached) return;
    app.state.currentStep = s;
    closeModal();
    closeConfirm();
    if (s === 1){
      app.state.selectedSlotIndex = null;
    }
  }

  function setActiveTab(step, tab){
    const st = getStepState(step);
    st.activeTab = Number(tab) || 1;
  }

  // ---------- rendering ----------
  function render(){
    renderStepTabs();
    renderMain();
    renderModal();
  }

  function renderStepTabs(){
    const host = $('#stepTabs');
    const { currentStep, maxReached } = app.state;
    const items = [];
    for (let s=1; s<=7; s++){
      const disabled = s > maxReached;
      const isCurrent = s === currentStep;
      items.push(
        `<button class="step-btn" data-action="go-step" data-step="${s}" ${disabled?'disabled':''} ${isCurrent?'aria-current="step"':''}>
          <span>${STEP_LABEL[s]}</span>
        </button>`
      );
    }
    host.innerHTML = items.join('');
  }

  function renderMain(){
    const main = $('#main');
    const s = app.state.currentStep;

    if (app.state.loading){
      main.innerHTML = `<div class="section"><div class="section-title">読み込み中…</div><div class="section-sub">Supabase からマスタデータを取得しています</div></div>`;
      return;
    }
    if (app.state.error){
      main.innerHTML = `<div class="section"><div class="section-title">エラー</div><div class="small">${escapeHtml(app.state.error)}</div></div>`;
      return;
    }

    if (s === 1){
      main.innerHTML = renderStep1();
    } else if (s === 2){
      main.innerHTML = renderStepCandidates(2, '第1候補（候補1）', '②確定');
    } else if (s === 3){
      main.innerHTML = renderStepCandidates(3, '第2候補（候補2）', '③確定');
    } else if (s === 4){
      main.innerHTML = renderStepCandidates(4, '第3候補（候補3）', '④確定');
    } else {
      main.innerHTML = `<div class="section">
        <div class="section-title">この先（⑤〜⑦）は未実装</div>
        <div class="section-sub">このZIPはステップ①〜④までを先に固めるための土台です。</div>
        <div class="panel-list">
          <div class="panel-item ref">
            <div><div class="t">候補1</div><div class="d">${escapeHtml(summaryCandidate(app.state.candidate1))}</div></div>
          </div>
          <div class="panel-item ref">
            <div><div class="t">候補2</div><div class="d">${escapeHtml(summaryCandidate(app.state.candidate2))}</div></div>
          </div>
          <div class="panel-item ref">
            <div><div class="t">候補3</div><div class="d">${escapeHtml(summaryCandidate(app.state.candidate3))}</div></div>
          </div>
        </div>
      </div>`;
    }
  }

  function summaryCandidate(list){
    if (!list || list.length === 0) return '（未確定）';
    return list.map(x => `${x.name}(${x.grade}${formatValue(x.valueMin, getFp(x.number,x.grade))})`).join(' / ');
  }

  function getFp(number, grade){
    const m = app.masterByNumber.get(Number(number));
    if (!m) return 0;
    return m.byGrade[grade].fp;
  }
  function renderStep1(){
    const st = getStepState(1);
    const tab = st.activeTab; 

    const transferred = getTransferredGradeByNumber();

    // list (top)
    const listNumbers = getNumbersByTab(tab);
    const ordered = orderByTwoColumn(listNumbers);
    const gridHtml = ordered.map(num => {
      const m = app.masterByNumber.get(num);
      const selected = st.selected.has(num);
      const grade = st.grade.get(num) || null;
      const value = st.value.get(num);
      const desc = selected ? buildDesc(num, grade, value) : (m.basetxt||'');
      const bgGrade = selected ? grade : (transferred.get(num) || null);
      return renderDollCard({
        step: 1,
        number: num,
        name: m.name,
        picurl: m.picurl,
        desc,
        selected,
        grade,
        bgGrade,
        disabled: false,
      });
    }).join('');

    // slots (bottom)
    const slotHtml = app.state.slot.map((sl, i) => renderSlotCard(sl, i)).join(''); 
    const allFilled = app.state.slot.every(x => !!x.number);

    return `
      <div class="section">
        <div class="section-title list-head">
          <span class="head-left"><span class="caret">▲</span>人形一覧</span>
          <div class="head-right">
            <span class="section-sub">画像タップで自動転写</span>
          </div>
        </div>

        ${renderListTabs(1, tab)}
        <div class="doll-grid">${gridHtml}</div>
      </div>


      <div class="section">
        <div class="section-title">
          <span>ステップ①：所持状況（スロット/ロック）</span>
          <span class="pill">スロット：5枠</span>
        </div>

        <div class="slot-list">${slotHtml}</div>

        <div class="cta-row">
          <button class="btn reset" data-action="reset-step" data-step="1">リセット</button>
          <button class="btn primary" data-action="confirm-step" data-step="1" ${allFilled?'':'disabled'}>①確定</button>
        </div>
      </div>
    `;
  }
  function renderSlotCard(sl, index){
    const filled = !!sl.number;
    const selected = app.state.selectedSlotIndex === index;
    const img = filled ? (sl.picurl || PLACEHOLDER_IMG) : PLACEHOLDER_IMG;
    const name = filled ? sl.name : `（空き）`;
    const grade = filled ? sl.grade : null;
    const desc = filled ? (sl.desc || '') : '—';

    const lockVisible = filled && index <= 2;
    const lockOn = lockVisible && sl.locked;
    const lockCanToggle = lockVisible && (lockOn || index === 0 || !!app.state.slot[index-1].locked);

    const upEnabled = filled && index > 0 && !!app.state.slot[index-1].number;
    const downEnabled = filled && index < 4 && !!app.state.slot[index+1].number;

    const gradeChip = filled ? `<span class="chip grade ${grade}">${grade}</span>` : '';
    const scoreChip = filled ? `<span class="chip">${sl.score ?? '-'}</span>` : '';

    return `
      <div class="slot-card ${selected?'selected':''} ${grade?RARITY_BG_CLASS[grade]:''}" data-action="slot-select" data-index="${index}">
        ${filled ? `<button class="xbtn x-slot" data-action="slot-delete-at" data-index="${index}" aria-label="削除">×</button>` : ``}
        ${filled ? `
          <div class="slot-move" aria-label="入替">
            <button class="move-btn" data-action="slot-swap" data-dir="up" data-index="${index}" ${upEnabled?'':'disabled'}>▲</button>
            <button class="move-btn" data-action="slot-swap" data-dir="down" data-index="${index}" ${downEnabled?'':'disabled'}>▼</button>
          </div>
        ` : `
          <div class="slot-move empty" aria-hidden="true"></div>
        `}
        <div class="slot-left"><img alt="" src="${escapeAttr(img)}" /></div>

        <div class="slot-mid">
          <div class="slot-name">${escapeHtml(name)}</div>
          <div class="slot-desc">${escapeHtml(desc)}</div>
        </div>

        <div class="slot-tail">
          ${lockVisible ? `<button class="icon-btn lock ${lockOn?'on':''}" data-action="slot-lock" data-index="${index}" ${lockCanToggle?'':'disabled'}>${lockOn?'🔒':'🔓'}</button>` : `<span class="slot-tail-spacer"></span>`}
          ${scoreChip}
          ${gradeChip}
        </div>
      </div>
    `;
  }

  function renderListTabs(step, activeTab){
    return `
      <div class="tabs">
        <button class="tab-btn" data-action="tab" data-step="${step}" data-tab="1" aria-current="${activeTab===1?'true':'false'}">リスト1</button>
        <button class="tab-btn" data-action="tab" data-step="${step}" data-tab="2" aria-current="${activeTab===2?'true':'false'}">リスト2</button>
        <button class="tab-btn" data-action="tab" data-step="${step}" data-tab="3" aria-current="${activeTab===3?'true':'false'}">リスト3</button>
      </div>
    `;
  }
  function renderStepCandidates(step, title, confirmLabel){
    const st = getStepState(step);
    const tab = st.activeTab;

    const listNumbers = getNumbersByTab(tab);
    const ordered = orderByTwoColumn(listNumbers);

    const gridHtml = ordered.map(num => {
      const m = app.masterByNumber.get(num);
      const selected = st.selected.has(num);
      const grade = st.grade.get(num) || null;
      const value = st.value.get(num);
      const desc = selected ? buildDesc(num, grade, value) : (m.basetxt||'');
      const disabled = isDisabledInStep(step, num) && !selected;
      const bgGrade = selected ? grade : null;
      return renderDollCard({
        step,
        number: num,
        name: m.name,
        picurl: m.picurl,
        desc,
        selected,
        grade,
        bgGrade,
        disabled,
      });
    }).join('');

    const canConfirm = st.selected.size >= 1 && st.selected.size <= 10;

    const panel = renderSelectedPanel(step);

    const allButtons = `
      <div class="row" style="margin:8px 0 6px;">
        <span class="pill">一括変更（選択中のみ）</span>
        ${GRADE_ORDER.map(g => `<button class="icon-btn" data-action="all-grade" data-step="${step}" data-grade="${g}" ${st.selected.size?'':'disabled'}>All ${g}</button>`).join('')}
      </div>
    `;

    const note = (step === 2)
      ? '選択不可：ロック中スロット（枠1〜3で🔒）と同名'
      : (step === 3)
        ? '選択不可：ロック中同名 / 候補1と同名'
        : '選択不可：ロック中同名 / 候補1・2と同名';

    return `
      <div class="section">
        <div class="section-title list-head">
          <span class="head-left"><span class="caret">▲</span>人形一覧</span>
          <span class="section-sub">画像タップで選択 / 説明文タップで能力値下限</span>
        </div>

        ${renderListTabs(step, tab)}
        <div class="doll-grid">${gridHtml}</div>
      </div>

      <div class="section">
        <div class="section-title">
          <span>ステップ${STEP_LABEL[step]}：${escapeHtml(title)}</span>
          <span class="pill">このステップで選択中：${st.selected.size}/10</span>
        </div>
        <div class="section-sub">${escapeHtml(note)}</div>

        ${allButtons}

        ${panel}

        <div class="cta-row">
          <button class="btn reset" data-action="reset-step" data-step="${step}">リセット</button>
          <button class="btn primary" data-action="confirm-step" data-step="${step}" ${canConfirm?'':'disabled'}>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
  }

  function renderSelectedPanel(step){
    const st = getStepState(step);

    const parts = [];
    const refs = [];
    if (step >= 3 && app.state.candidate1.length){
      refs.push({ title:'候補1（確定済み）', list: app.state.candidate1 });
    }
    if (step >= 4 && app.state.candidate2.length){
      refs.push({ title:'候補2（確定済み）', list: app.state.candidate2 });
    }

    for (const r of refs){
      parts.push(`<div class="panel-item ref">
        <div style="min-width:0;">
          <div class="t">${escapeHtml(r.title)}</div>
          <div class="d">${escapeHtml(r.list.map(x=>x.name).join(' / '))}</div>
        </div>
      </div>`);
    }

    const selected = Array.from(st.selected).sort((a,b)=>a-b).map(num => {
      const m = app.masterByNumber.get(num);
      const grade = st.grade.get(num);
      const value = st.value.get(num);
      const desc = buildDesc(num, grade, value);
      return { number:num, name:m.name, desc };
    });

    for (const it of selected){
      parts.push(`<div class="panel-item">
        <div style="min-width:0;">
          <div class="t">${escapeHtml(it.name)}</div>
          <div class="d">${escapeHtml(it.desc)}</div>
        </div>
        <button class="x" data-action="panel-remove" data-step="${step}" data-number="${it.number}">×</button>
      </div>`);
    }

    if (!parts.length){
      return `<div class="panel-list"><div class="small">（まだ選択されていません）</div></div>`;
    }
    return `<div class="panel-list">${parts.join('')}</div>`;
  }
  function renderDollCard({step, number, name, picurl, desc, selected, grade, bgGrade, disabled}){
    const bgClass = bgGrade ? (RARITY_BG_CLASS[bgGrade] || '') : '';
    const classes = ['card', bgClass];
    if (selected) classes.push('selected');
    if (disabled) classes.push('disabled');

    const master = app.masterByNumber.get(number);
    const avail = (master && master.byGrade)
      ? GRADE_ORDER.filter(g => master.byGrade[g] && master.byGrade[g].paramemin != null)
      : GRADE_ORDER;
    const grades = avail.length ? avail : GRADE_ORDER;

    const gButtons = grades.map(g => {
      const on = (grade === g);
      return `<button class="gbtn ${on?'on':''}" data-action="grade" data-step="${step}" data-number="${number}" data-grade="${g}">${g}</button>`;
    }).join('');

    const overlayLabel = (step === 1)
      ? getOverlayLabel(step, number)
      : (disabled ? getOverlayLabel(step, number) : null);
    const overlay = (!selected && overlayLabel)
      ? `<div class="card-block-label">${escapeHtml(overlayLabel)}</div>`
      : '';

    const inSlot = (step === 1) ? (findSlotIndexByNumber(number) >= 0) : false;
    const xBtn = inSlot ? `<button class="xbtn x-list" data-action="list-remove" data-number="${number}" aria-label="削除">×</button>` : '';

    return `
      <div class="${classes.join(' ')}" data-card="${number}">
        ${xBtn}
        <div class="card-top">
          <div class="card-left" data-action="card-toggle" data-step="${step}" data-number="${number}">
            <img alt="" src="${escapeAttr(picurl || PLACEHOLDER_IMG)}" />
          </div>
          <div class="card-right">
            <div class="name-row">
              <div class="name">${escapeHtml(name)}</div>
            </div>
            <div class="grade-row">${gButtons}</div>
          </div>
        </div>
        <div class="desc" data-action="desc" data-step="${step}" data-number="${number}" title="${escapeAttr(desc)}">${escapeHtml(desc)}</div>
        ${overlay}
      </div>
    `;
  }

  function renderModal(){
    const host = $('#modalHost');
    const c = app.state.confirm;
    const m = app.state.modal;
    if (!c.open && !m.open){
      host.innerHTML = '';
      document.body.classList.remove('modal-open');
      return;
    }
    document.body.classList.add('modal-open');

    if (c.open){
      host.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(c.title||'確認')}">
            <div class="modal-title">${escapeHtml(c.title||'確認')}</div>
            <div class="small" style="white-space:pre-line; margin-top:8px;">${escapeHtml(c.message||'')}</div>
            <div class="modal-actions" style="margin-top:16px;">
              <button class="btn" data-action="confirm-no">${escapeHtml(c.noLabel||'キャンセル')}</button>
              <button class="btn primary" data-action="confirm-yes">${escapeHtml(c.yesLabel||'OK')}</button>
            </div>
          </div>
        </div>
      `;
      return;
    }
    const st = getStepState(m.step);
    const num = m.number;
    const grade = st.grade.get(num);
    const master = app.masterByNumber.get(num);
    const r = master.byGrade[grade];
    const maxIdx = Math.max(0, (r.stepmax||1) - 1);
    const value = modalCurrentValue();
    const vText = formatValue(value, r.fp);

    host.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="能力値下限">
          <div class="modal-title">${escapeHtml(master.name)} / ${grade}（${escapeHtml(GRADE_SHORT_TO_JP[grade]||'')}）</div>
          <div class="row" style="justify-content:space-between;">
            <div class="small">下限値</div>
            <div class="modal-value">${escapeHtml(vText)}</div>
          </div>
          <input class="slider" type="range" min="0" max="${maxIdx}" step="1"
            value="${m.idx}" data-action="modal-range" />

          <div class="modal-grid">
            <button class="btn" data-action="modal-step" data-delta="-5">-5</button>
            <button class="btn" data-action="modal-step" data-delta="-1">-1</button>
            <button class="btn" data-action="modal-step" data-delta="0">=</button>
            <button class="btn" data-action="modal-step" data-delta="1">+1</button>
            <button class="btn" data-action="modal-step" data-delta="5">+5</button>
          </div>

          <div class="preset-row">
            ${[0.25,0.33,0.50,0.66,0.75].map(p => `<button class="preset" data-action="preset" data-p="${p}">${Math.round(p*100)}%</button>`).join('')}
          </div>

          <div class="modal-actions">
            <button class="btn" data-action="modal-cancel">キャンセル</button>
            <button class="btn primary" data-action="modal-ok">決定</button>
          </div>
        </div>
      </div>
    `;
  }

  function getNumbersByTab(tab){
    const t = Number(tab) || 1;
    const start = (t - 1) * 10 + 1;
    const arr = [];
    for (let i=0;i<10;i++) arr.push(start+i);
    return arr;
  }

  function orderByTwoColumn(list10){
    // expected 10 numbers 1..10 (or shifted)
    const out = [];
    for (let i=0;i<5;i++){
      out.push(list10[i]);
      out.push(list10[i+5]);
    }
    return out;
  }

  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function escapeAttr(s){
    return escapeHtml(s).replace(/\n/g, ' ');
  }

  // ---------- events ----------
  function bindEvents(){
    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-action]');
      if (!t) return;

      const action = t.dataset.action;

      // modal backdrop: allow click to cancel
      if (action === 'modal-cancel'){
        closeModal();
        closeConfirm();
        render();
        return;
      }

      if (action === 'confirm-no'){
        closeConfirm();
        render();
        return;
      }
      if (action === 'confirm-yes'){
        const a = app.state.confirm && app.state.confirm.action;
        closeConfirm();
        if (a && a.type === 'lock-and-clear'){
          applyLockAndClear(a);
        }
        if (a && a.type === 'delete-and-clear'){
          applyDeleteAndClear(a);
        }
        if (a && a.type === 'swap-and-clear'){
          applySwapAndClear(a);
        }
        render();
        return;
      }

      if (action === 'go-step'){
  const target = Number(t.dataset.step);
  const cur = app.state.currentStep;
  // When moving forward via the step list, auto-confirm the current step if it has unsaved changes.
  if (target > cur && isDirtyStep(cur)){
    const before = app.state.currentStep;
    confirmStep(before);
    render();
    return;
  }
  goStep(target);
  render();
  return;
}
      if (action === 'tab'){
        setActiveTab(Number(t.dataset.step), Number(t.dataset.tab));
        render();
        return;
      }
      if (action === 'card-toggle'){
        const step = Number(t.dataset.step);
        const num = Number(t.dataset.number);
        if (step >= 2 && step <= 4 && isDisabledInStep(step, num) && !getStepState(step).selected.has(num)){
          return;
        }
        toggleCardByImage(step, num);
        render();
        return;
      }
      if (action === 'grade'){
        const step = Number(t.dataset.step);
        const num = Number(t.dataset.number);
        const grade = t.dataset.grade;
        if (step >= 2 && step <= 4 && isDisabledInStep(step, num) && !getStepState(step).selected.has(num)){
          return;
        }
        setCardGrade(step, num, grade);
        render();
        return;
      }
      if (action === 'desc'){
        const step = Number(t.dataset.step);
        const num = Number(t.dataset.number);
        openModal(step, num);
        render();
        return;
      }      if (action === 'slot-select'){
        const idx = Number(t.dataset.index);
        if (idx === app.state.selectedSlotIndex) app.state.selectedSlotIndex = null;
        else app.state.selectedSlotIndex = idx;
        render();
        return;
      }
      if (action === 'slot-delete'){
        deleteSelectedSlot();
        render();
        return;
      }

      if (action === 'slot-delete-at'){
        const idx = Number(t.dataset.index);
        deleteSlotAt(idx);
        render();
        return;
      }
      if (action === 'list-remove'){
        const num = Number(t.dataset.number);
        const idx = findSlotIndexByNumber(num);
        if (idx >= 0) deleteSlotAt(idx);
        render();
        return;
      }
      if (action === 'slot-lock'){
        toggleLock(t.dataset.index);
        render();
        return;
      }
      if (action === 'slot-swap'){
        const idx = Number(t.dataset.index);
        const dir = t.dataset.dir;
        if (dir === 'up' && idx > 0) swapSlotContentWithConfirm(idx, idx-1);
        if (dir === 'down' && idx < 4) swapSlotContentWithConfirm(idx, idx+1);
        render();
        return;
      }
      if (action === 'reset-step'){
        resetFromStep(t.dataset.step);
        render();
        return;
      }
      if (action === 'confirm-step'){
        confirmStep(t.dataset.step);
        render();
        return;
      }
      if (action === 'panel-remove'){
        removeFromPanel(t.dataset.step, t.dataset.number);
        render();
        return;
      }
      if (action === 'all-grade'){
        setAllGrade(t.dataset.step, t.dataset.grade);
        render();
        return;
      }
      if (action === 'modal-step'){
        const delta = Number(t.dataset.delta);
        if (delta === 0){
          // noop
        } else {
          modalApplyIdx(app.state.modal.idx + delta);
        }
        render();
        return;
      }
      if (action === 'preset'){
        modalPreset(Number(t.dataset.p));
        render();
        return;
      }
      if (action === 'modal-ok'){
        modalDecide();
        render();
        return;
      }
    });

    document.addEventListener('input', (ev) => {
      const t = ev.target;
      if (!t || t.dataset.action !== 'modal-range') return;
      modalApplyIdx(Number(t.value));
      render();
    }, true);

    
    // prevent double-tap zoom while modal is open (iOS Safari)
    let __lastTap = 0;
    document.addEventListener('touchend', (ev) => {
      if (!(app.state && app.state.modal && app.state.modal.open)) return;
      const now = Date.now();
      if (now - __lastTap <= 300){
        ev.preventDefault();
      }
      __lastTap = now;
    }, { passive:false, capture:true });

// prevent scroll behind modal (simple)
    document.addEventListener('touchmove', (ev) => {
      if (app.state && app.state.modal && app.state.modal.open){
        // allow slider drag etc
      }
    }, { passive:true });
  }

  // ---------- tiny toast ----------
  let toastTimer = null;
  function toast(msg){
    clearTimeout(toastTimer);
    let el = document.getElementById('toast');
    if (!el){
      el = document.createElement('div');
      el.id = 'toast';
      el.style.position='fixed';
      el.style.left='50%';
      el.style.bottom='16px';
      el.style.transform='translateX(-50%)';
      el.style.background='rgba(0,0,0,0.75)';
      el.style.color='white';
      el.style.padding='10px 12px';
      el.style.border='1px solid rgba(255,255,255,0.15)';
      el.style.borderRadius='12px';
      el.style.fontWeight='800';
      el.style.fontSize='12px';
      el.style.zIndex='200';
      el.style.maxWidth='92vw';
      el.style.textAlign='center';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity='1';
    toastTimer = setTimeout(() => { el.style.opacity='0'; }, 2200);
  }

  // ---------- start ----------
  async function main(){
    app.state = initState();
    bindEvents();
    render();

    try{
      assertSupabaseConfig();
      app.supabase = window.supabase.createClient(window.LD_SUPABASE_URL, window.LD_SUPABASE_ANON_KEY);
      await loadMaster();
      app.state.loading = false;
      render();
    } catch (e){
      app.state.loading = false;
      app.state.error = (e && (e.message || e.error_description)) ? (e.message || e.error_description) : String(e);
      render();
    }
  }

  document.addEventListener('DOMContentLoaded', main);
})();
