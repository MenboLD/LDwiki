/* ld_doll_gacha_sim.js (step 1-6) */
(() => {
  'use strict';

  const VERSION = '20260201b';

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
    1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7'
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
    costByLockcount: new Map(), // lockcount -> costkey
    state: null,
  };

  function makeBlankSlot(){
    return { number:null, name:null, grade:null, value:null, score:null, picurl:null, desc:null, locked:false };
  }

  function initState(){
    return {
      currentStep: 1,
      maxReached: 1,
      step5Confirmed: false,
      step6Confirmed: false,
      confirmedSlotsSig: null,
      slot: [makeBlankSlot(),makeBlankSlot(),makeBlankSlot(),makeBlankSlot(),makeBlankSlot()],
      selectedSlotIndex: null,
      candidate1: [],
      candidate2: [],
      candidate3: [],
      keyCount: 0,
      mythicGaugeInit: 0,
      simConfig: {
        lockStrategy: 'S1',
        tieBreaker: 'score',
        preferC1DontLockC2: false,
        endSets: [
          { enabled: true, slots: ['none','none','none','none','none'] },
          { enabled: false, slots: ['none','none','none','none','none'] },
          { enabled: false, slots: ['none','none','none','none','none'] },
        ],
        useKeyCount: false,
        trials: 10000,
        keySafetyMax: 100000,
        maxPullsSafety: 50000,
      },
      ui: { step5Target: 'key', accOpen:false, graphOpen:false },
      sim: { running:false, stop:false, done:0, total:0, startedAt:0, results:null, xAxis:'pull' },
      stepStates: {
        1: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
        2: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
        3: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
        4: { activeTab: 1, selected: new Set(), grade: new Map(), value: new Map() },
      },
      modal: { open:false, step:null, number:null, idx:0 },
      rarityModal: { open:false, number:null, slotIndex:null },
      saveModal: { open:false },
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


  async function loadCost(){
    const { data: cost, error } = await app.supabase
      .from('ld_piece_cost')
      .select('*')
      .order('lockcount', { ascending: true });
    if (error) throw error;
    if (!Array.isArray(cost) || cost.length < 4) throw new Error('ld_piece_cost の取得に失敗しました。');
    app.costByLockcount = new Map();
    for (const row of cost){
      const lc = Number(row.lockcount);
      const ck = Number(row.costkey);
      if (Number.isFinite(lc) && Number.isFinite(ck)){
        app.costByLockcount.set(lc, ck);
      }
    }
    // fallback
    for (const lc of [0,1,2,3]){
      if (!app.costByLockcount.has(lc)) app.costByLockcount.set(lc, [5,10,20,30][lc] || 0);
    }
  }

  function getStepState(step){
    return app.state.stepStates[step];
  }

  function clearStepCardState(step, number){
    const st = getStepState(step);
    const num = Number(number);
    if (!st) return;
    try{ st.selected && st.selected.delete(num); }catch(e){}
    try{ st.grade && st.grade.delete(num); }catch(e){}
    try{ st.value && st.value.delete(num); }catch(e){}
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

  function normalizeEndSets(cfg){
    if (!cfg.endSets || !Array.isArray(cfg.endSets) || cfg.endSets.length < 3){
      cfg.endSets = [
        { enabled: true, slots: ['none','none','none','none','none'] },
        { enabled: false, slots: ['none','none','none','none','none'] },
        { enabled: false, slots: ['none','none','none','none','none'] },
      ];
      return;
    }
    while (cfg.endSets.length < 3){
      cfg.endSets.push({ enabled:false, slots:['none','none','none','none','none'] });
    }
    cfg.endSets = cfg.endSets.slice(0,3);
    cfg.endSets.forEach((set, si) => {
      if (!set || typeof set !== 'object'){
        cfg.endSets[si] = set = { enabled: si===0, slots:['none','none','none','none','none'] };
      }
      if (si===0) set.enabled = true;
      set.enabled = !!set.enabled;
      if (!Array.isArray(set.slots) || set.slots.length < 5) set.slots = ['none','none','none','none','none'];
      set.slots = set.slots.slice(0,5).map(v => (v==='c1'||v==='c2'||v==='c3') ? v : 'none');

      // enforce: left to right cannot increase priority (c1>c2>c3). 'none' is excluded.
      let leftTok = null;
      for (let i=0;i<5;i++){
        const tok = set.slots[i];
        if (tok === 'none') continue;
        if (leftTok && endPriorityValue(tok) > endPriorityValue(leftTok)){
          set.slots[i] = 'none'; // invalid persisted state => clear
          continue;
        }
        leftTok = tok;
      }
    });
  }

  // ---------- save / load (localStorage) ----------
  const SAVE_SCHEMA = 1;
  const SAVE_KEY_PREFIX = 'ld_doll_gacha_sim_save_';

  function saveKey(slotNo){
    return `${SAVE_KEY_PREFIX}${slotNo}`;
  }

  function serializeStepState(st){
    return {
      activeTab: Number(st.activeTab)||1,
      selected: Array.from(st.selected||[]),
      grade: Array.from((st.grade||new Map()).entries()),
      value: Array.from((st.value||new Map()).entries()),
    };
  }

  function deserializeStepState(obj){
    const o = obj || {};
    return {
      activeTab: Number(o.activeTab)||1,
      selected: new Set(Array.isArray(o.selected)? o.selected.map(Number) : []),
      grade: new Map(Array.isArray(o.grade)? o.grade.map(([k,v])=>[Number(k), v]) : []),
      value: new Map(Array.isArray(o.value)? o.value.map(([k,v])=>[Number(k), Number(v)]) : []),
    };
  }

  function slotSignatureFromSlots(slots){
    return (slots||[]).map(s => {
      const num = s?.number ?? '';
      const grade = s?.grade ?? '';
      const v = (s?.valueMin ?? s?.value ?? '');
      return `${num}:${grade}:${v}`;
    }).join('|');
  }

  function getSaveMeta(slotNo){
    try{
      const raw = localStorage.getItem(saveKey(slotNo));
      if (!raw) return { exists:false, ts:null, ver:null };
      const obj = JSON.parse(raw);
      const ts = obj && obj.ts ? Number(obj.ts) : null;
      const ver = obj && obj.ver ? String(obj.ver) : null;
      return { exists:true, ts: ts && isFinite(ts) ? ts : null, ver };
    }catch(e){
      return { exists:false, ts:null, ver:null };
    }
  }

  function fmtTs(ts){
    if (!ts) return '—';
    try{
      const d = new Date(ts);
      const y = d.getFullYear();
      const mo = String(d.getMonth()+1).padStart(2,'0');
      const da = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${y}/${mo}/${da} ${hh}:${mm}`;
    }catch(e){
      return '—';
    }
  }

  function buildSavePayload(){
    const s = app.state;

    const slots = (s.slot||[]).map(x => {
      const b = makeBlankSlot();
      return {
        number: x?.number ?? null,
        name: x?.name ?? null,
        grade: x?.grade ?? null,
        value: (x?.valueMin ?? x?.value ?? null),
        valueMin: (x?.valueMin ?? x?.value ?? null),
        score: x?.score ?? null,
        picurl: x?.picurl ?? null,
        desc: x?.desc ?? null,
        locked: !!x?.locked,
      };
    });

    const payload = {
      schema: SAVE_SCHEMA,
      ver: VERSION,
      ts: Date.now(),
      slot: slots,
      selectedSlotIndex: s.selectedSlotIndex ?? null,
      stepStates: {
        1: serializeStepState(s.stepStates?.[1]),
        2: serializeStepState(s.stepStates?.[2]),
        3: serializeStepState(s.stepStates?.[3]),
        4: serializeStepState(s.stepStates?.[4]),
      },
      candidate1: Array.isArray(s.candidate1) ? s.candidate1 : [],
      candidate2: Array.isArray(s.candidate2) ? s.candidate2 : [],
      candidate3: Array.isArray(s.candidate3) ? s.candidate3 : [],
      keyCount: clampInt(s.keyCount||0, 0, 99999),
      mythicGaugeInit: clampInt(s.mythicGaugeInit||0, 0, 500),
      simConfig: {
        lockStrategy: s.simConfig?.lockStrategy || 'S1',
        tieBreaker: s.simConfig?.tieBreaker || 'score',
        preferC1DontLockC2: !!s.simConfig?.preferC1DontLockC2,
        endSets: Array.isArray(s.simConfig?.endSets) ? s.simConfig.endSets : null,
        useKeyCount: !!s.simConfig?.useKeyCount,
        trials: clampInt(s.simConfig?.trials||10000, 1, 200000),
        keySafetyMax: clampInt(s.simConfig?.keySafetyMax||100000, 1, 1000000),
        maxPullsSafety: clampInt(s.simConfig?.maxPullsSafety||50000, 1, 500000),
      },
      step5Confirmed: !!s.step5Confirmed,
      step6Confirmed: !!s.step6Confirmed,
      confirmedSlotsSig: s.confirmedSlotsSig || null,
      maxReached: clampInt(s.maxReached||1, 1, 7),
      currentStep: clampInt(s.currentStep||1, 1, 7),
    };

    return payload;
  }

  function normalizeSequentialLocks(slots){
    // Only allow locked in order from slot1 -> slot2 -> slot3. If a gap exists, clear subsequent locks.
    let allow = true;
    for (let i=0;i<3;i++){
      if (!allow){
        slots[i].locked = false;
        continue;
      }
      if (slots[i].locked){
        allow = true;
      }else{
        // if current is not locked, subsequent cannot be locked
        allow = false;
      }
    }
  }

  function applySaveLoadPayload(p){
    const base = initState(); // keep defaults for ui/sim, etc.

    const payload = p || {};

    // restore step states (1-4)
    base.stepStates = {
      1: deserializeStepState(payload.stepStates?.[1]),
      2: deserializeStepState(payload.stepStates?.[2]),
      3: deserializeStepState(payload.stepStates?.[3]),
      4: deserializeStepState(payload.stepStates?.[4]),
    };

    // restore slots
    base.slot = Array.from({length:5}, (_,i) => {
      const src = (payload.slot && payload.slot[i]) ? payload.slot[i] : null;
      const b = makeBlankSlot();
      if (!src) return b;
      b.number = src.number ?? null;
      b.name = src.name ?? null;
      b.grade = src.grade ?? null;
      b.value = (src.valueMin ?? src.value ?? null);
      b.valueMin = (src.valueMin ?? src.value ?? null);
      b.score = src.score ?? null;
      b.picurl = src.picurl ?? null;
      b.desc = src.desc ?? null;
      b.locked = !!src.locked;
      return b;
    });
    normalizeSequentialLocks(base.slot);

    base.selectedSlotIndex = payload.selectedSlotIndex ?? null;

    base.candidate1 = Array.isArray(payload.candidate1) ? payload.candidate1 : [];
    base.candidate2 = Array.isArray(payload.candidate2) ? payload.candidate2 : [];
    base.candidate3 = Array.isArray(payload.candidate3) ? payload.candidate3 : [];

    base.keyCount = clampInt(payload.keyCount||0, 0, 99999);
    base.mythicGaugeInit = clampInt(payload.mythicGaugeInit||0, 0, 500);

    // simConfig
    base.simConfig.lockStrategy = payload.simConfig?.lockStrategy || base.simConfig.lockStrategy;
    base.simConfig.tieBreaker = payload.simConfig?.tieBreaker || base.simConfig.tieBreaker;
    base.simConfig.preferC1DontLockC2 = !!payload.simConfig?.preferC1DontLockC2;
    base.simConfig.useKeyCount = !!payload.simConfig?.useKeyCount;
    base.simConfig.trials = clampInt(payload.simConfig?.trials || base.simConfig.trials, 1, 200000);
    base.simConfig.keySafetyMax = clampInt(payload.simConfig?.keySafetyMax || base.simConfig.keySafetyMax, 1, 1000000);
    base.simConfig.maxPullsSafety = clampInt(payload.simConfig?.maxPullsSafety || base.simConfig.maxPullsSafety, 1, 500000);
    if (payload.simConfig?.endSets){
      base.simConfig.endSets = payload.simConfig.endSets;
    }
    normalizeEndSets(base.simConfig);

    // workflow
    base.step5Confirmed = !!payload.step5Confirmed;
    base.step6Confirmed = !!payload.step6Confirmed;
    base.maxReached = clampInt(payload.maxReached||1, 1, 7);
    base.currentStep = clampInt(payload.currentStep||1, 1, 7);
    if (base.currentStep > base.maxReached) base.currentStep = base.maxReached;

    // signatures: recompute from restored slots
    base.confirmedSlotsSig = slotSignatureFromSlots(base.slot);

    // clear running sim results
    base.sim.running = false;
    base.sim.stop = false;
    base.sim.done = 0;
    base.sim.total = 0;
    base.sim.results = null;

    app.state = base;
  }

  function requestSaveTo(slotNo){
    const meta = getSaveMeta(slotNo);
    if (meta.exists){
      app.state.confirm = {
        open:true,
        title:'上書き保存',
        message:`セーブ${slotNo}を上書きしますか？\n（前回：${fmtTs(meta.ts)}）`,
        yesLabel:'上書き',
        noLabel:'キャンセル',
        action:{ type:'save-overwrite', slotNo }
      };
      return;
    }
    doSaveTo(slotNo);
  }

  function doSaveTo(slotNo){
    try{
      const payload = buildSavePayload();
      localStorage.setItem(saveKey(slotNo), JSON.stringify(payload));
      toast(`セーブ${slotNo}に保存しました`);
    }catch(e){
      toast('保存に失敗しました（容量不足の可能性）');
    }
  }

  function openLoadModal(){
    app.state.saveModal = { open:true };
  }

  function requestLoadFrom(slotNo){
    const meta = getSaveMeta(slotNo);
    if (!meta.exists){
      toast(`セーブ${slotNo}がありません`);
      return;
    }
    app.state.confirm = {
      open:true,
      title:'ロード',
      message:`セーブ${slotNo}をロードしますか？\n（現在の入力状態は上書きされます）\n（保存：${fmtTs(meta.ts)}）`,
      yesLabel:'ロード',
      noLabel:'キャンセル',
      action:{ type:'load-state', slotNo }
    };
  }

  function doLoadFrom(slotNo){
    try{
      const raw = localStorage.getItem(saveKey(slotNo));
      if (!raw){
        toast(`セーブ${slotNo}がありません`);
        return;
      }
      const payload = JSON.parse(raw);
      applySaveLoadPayload(payload);
      toast(`セーブ${slotNo}をロードしました`);
    }catch(e){
      toast('ロードに失敗しました（データ破損の可能性）');
    }
  }


  function isEndPriorityToken(v){
    return v === 'c1' || v === 'c2' || v === 'c3';
  }
  function endPriorityValue(v){
    if (v === 'c1') return 3;
    if (v === 'c2') return 2;
    if (v === 'c3') return 1;
    return 0; // none/locked
  }
  function isEndTokenAllowed(nextTok, leftLimitTok){
    if (nextTok === 'none') return true; // 未指定は常にOK（優先順位の対象外）
    if (!isEndPriorityToken(nextTok)) return false;
    if (!leftLimitTok) return true; // 左側に優先指定がない
    // 左側より高い優先（c1>c2>c3）を置けない
    return endPriorityValue(nextTok) <= endPriorityValue(leftLimitTok);
  }

  function cycleEndTokenConstrained(currentTok, leftLimitTok){
    const cycle = ['c1','c2','c3','none'];
    const cur = cycle.includes(currentTok) ? currentTok : 'none';
    const start = cycle.indexOf(cur);
    for (let k=1; k<=cycle.length; k++){
      const cand = cycle[(start + k) % cycle.length];
      if (isEndTokenAllowed(cand, leftLimitTok)) return cand;
    }
    return 'none';
  }

  function endTokenLabel(v){
    if (v === 'c1') return '第１';
    if (v === 'c2') return '第２';
    if (v === 'c3') return '第３';
    return '未指定';
  }

  function endTokenClass(v){
    if (v === 'c1') return 'endtok-c1';
    if (v === 'c2') return 'endtok-c2';
    if (v === 'c3') return 'endtok-c3';
    return 'endtok-none';
  }

  function renderEndSetsSummary(endSets){
    if (!Array.isArray(endSets) || endSets.length === 0) return '';
    const lines = [];
    endSets.forEach((set, si) => {
      if (si>0 && !set.enabled) return;
      const parts = (set.slots||[]).slice(0,5).map((tok, i) => {
        if (tok === 'c1') return `${i+1}:第１`;
        if (tok === 'c2') return `${i+1}:第２`;
        if (tok === 'c3') return `${i+1}:第３`;
        return `${i+1}:未`;
      }).join(' ');
      lines.push(`セット${si+1}［${parts}］`);
    });
    return lines.join(' / ');
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

  
  function focusStep1FromSlotIndex(idx){
    const index = Number(idx);
    const sl = app.state.slot[index];
    if (!sl || !sl.number) return null;
    const n = Number(sl.number);
    const st = getStepState(1);
    if (!st.selected.has(n)){
      // keep Step① "single focus" behavior
      for (const old of Array.from(st.selected)) deselectCard(1, old);
      st.selected.add(n);
    }
    // sync current values from the slot so modal edits reflect the actual slot values
    st.grade.set(n, sl.grade);
    st.value.set(n, sl.value);
    return n;
  }

  function setStep1GradeFromRarityModal(number, grade){
    const n = Number(number);
    const st = getStepState(1);
    if (!st.selected.has(n)){
      for (const old of Array.from(st.selected)) deselectCard(1, old);
      st.selected.add(n);
    }
    st.grade.set(n, grade);
    const r = app.masterByNumber.get(n).byGrade[grade];
    st.value.set(n, r.paramemin);
    // reflect to slot (keep locked flag)
    upsertSlotFromStep1(n, false);
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

    const deletedNumber = app.state.slot[index].number;
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
        action: { type:'delete-and-clear', slotAfter: newSlot, clearNames, deletedNumber },
      });
      return;
    }

    // apply directly
    app.state.slot = newSlot;
    clearStepCardState(1, deletedNumber);
    if (app.state.selectedSlotIndex === index) app.state.selectedSlotIndex = null;
    enforceLockContinuity();
  }
  function deleteSelectedSlot(){
    const idx = app.state.selectedSlotIndex;
    if (idx === null || idx === undefined) return;
    deleteSlotAt(idx);
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
}

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
    const nextSlot = (Array.isArray(action.newSlot) && action.newSlot.length === 5) ? action.newSlot
                  : ((Array.isArray(action.slotAfter) && action.slotAfter.length === 5) ? action.slotAfter : null);
    if (nextSlot){
      app.state.slot = nextSlot.map(s => ({ ...s, locked: !!s.locked }));
    }

    // clear step1 card state for removed doll (list background reset)
    if (action.deletedNumber != null){
      clearStepCardState(1, action.deletedNumber);
    }
    app.state.selectedSlotIndex = null;
    enforceLockContinuity();
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
  if (s === 5) return !app.state.step5Confirmed; // not confirmed yet
  if (s === 6) return !app.state.step6Confirmed; // not confirmed yet
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
      app.state.step5Confirmed = false;
      app.state.step6Confirmed = false;
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
        app.state.step5Confirmed = false;
        app.state.step6Confirmed = false;
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
        app.state.step5Confirmed = false;
        app.state.step6Confirmed = false;
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
        app.state.step5Confirmed = false;
        app.state.step6Confirmed = false;
        app.state.currentStep = 5;
        app.state.maxReached = 5;
      }
    }

    if (s === 5){
      // validate ranges
      const kc = clampInt(app.state.keyCount, 0, 99999);
      const mg = clampInt(app.state.mythicGaugeInit, 0, 500);
      app.state.keyCount = kc;
      app.state.mythicGaugeInit = mg;

      // (re)confirm -> invalidate step6/7
      app.state.currentStep = 6;
      app.state.step5Confirmed = true;
      app.state.step6Confirmed = false;
      app.state.maxReached = Math.max(app.state.maxReached, 6);
      return;
    }

    if (s === 6){
      const cfg = app.state.simConfig;
      normalizeEndSets(cfg);
      for (const set of cfg.endSets){
        for (let i=0;i<3;i++){
          if (app.state.slot[i].locked && app.state.slot[i].number){
            set.slots[i] = 'none';
          }
        }
      }
      app.state.step6Confirmed = true;
      // invalidate old results
      app.state.sim.results = null;
      app.state.currentStep = 7;
      app.state.maxReached = Math.max(app.state.maxReached, 7);
      return;
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
      app.state.step5Confirmed = false;
      app.state.step6Confirmed = false;
      app.state.confirmedSlotsSig = null;
      for (const k of [1,2,3,4]) resetStepState(k);
      return;
    }

    // Step 2-4: reset should only clear *this step's* current list selection state.
    // (Do NOT delete confirmed candidate lists / progress.)
    if (s === 2){
      resetStepState(2);
      app.state.currentStep = 2;
      return;
    }
    if (s === 3){
      resetStepState(3);
      app.state.currentStep = 3;
      return;
    }
    if (s === 4){
      resetStepState(4);
      app.state.currentStep = 4;
      return;
    }

    if (s === 5){
      // reset key/gauge and later configs
      app.state.keyCount = 0;
      app.state.mythicGaugeInit = 0;
      app.state.step5Confirmed = false;
      app.state.step6Confirmed = false;
      app.state.sim.results = null;
      app.state.simConfig = {
        lockStrategy: 'S1',
        tieBreaker: 'score',
        preferC1DontLockC2: false,
        endSets: [
          { enabled: true, slots: ['none','none','none','none','none'] },
          { enabled: false, slots: ['none','none','none','none','none'] },
          { enabled: false, slots: ['none','none','none','none','none'] },
        ],
        useKeyCount: false,
        trials: 10000,
        keySafetyMax: 100000,
        maxPullsSafety: 50000,
      };
      app.state.currentStep = 5;
      app.state.maxReached = Math.min(app.state.maxReached, 5);
      return;
    }

    if (s === 6){
      // reset strategy / end condition only
      app.state.step6Confirmed = false;
      app.state.sim.results = null;
      app.state.simConfig = {
        lockStrategy: 'S1',
        tieBreaker: 'score',
        preferC1DontLockC2: false,
        endSets: [
          { enabled: true, slots: ['none','none','none','none','none'] },
          { enabled: false, slots: ['none','none','none','none','none'] },
          { enabled: false, slots: ['none','none','none','none','none'] },
        ],
        useKeyCount: false,
        trials: 10000,
        keySafetyMax: 100000,
        maxPullsSafety: 50000,
      };
      app.state.currentStep = 6;
      app.state.maxReached = Math.min(app.state.maxReached, 6);
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
    // post-render hooks
    if (app && app.state && app.state.currentStep === 7){
      try{ drawStep7Graph(); }catch(e){}
    }
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
    } else if (s === 5){
      main.innerHTML = renderStep5();
    } else if (s === 6){
      main.innerHTML = renderStep6();
    } else if (s === 7){
      main.innerHTML = renderStep7();
    } else {
      main.innerHTML = `<div class="section">
        <div class="section-title">ステップ⑦（シミュレーション）は未実装</div>
        <div class="section-sub">ここまでの入力内容をもとに、次に⑦（実行・結果表示）を実装します。</div>
        <div class="panel-list">
          <div class="panel-item ref"><div><div class="t">鍵</div><div class="d">${escapeHtml(String(app.state.keyCount))} 本</div></div></div>
          <div class="panel-item ref"><div><div class="t">神話ゲージ</div><div class="d">${escapeHtml(String(app.state.mythicGaugeInit))} / 500</div></div></div>
          <div class="panel-item ref"><div><div class="t">候補1</div><div class="d">${escapeHtml(summaryCandidate(app.state.candidate1))}</div></div></div>
          <div class="panel-item ref"><div><div class="t">候補2</div><div class="d">${escapeHtml(summaryCandidate(app.state.candidate2))}</div></div></div>
          <div class="panel-item ref"><div><div class="t">候補3</div><div class="d">${escapeHtml(summaryCandidate(app.state.candidate3))}</div></div></div>
          <div class="panel-item ref"><div><div class="t">終了条件</div><div class="d">${escapeHtml(renderEndSetsSummary(app.state.simConfig.endSets))}</div></div></div>
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
          <div class="section">
        <div class="section-title">
          <span>保存 / ロード</span>
          <span class="pill">localStorage</span>
        </div>
        <div class="section-sub">ステップ①（スロット/ロック）とステップ②〜④（候補選択）などを保存できます</div>
        <div class="save-row">
          <button class="btn" data-action="save-state" data-slot="1">セーブ1</button>
          <button class="btn" data-action="save-state" data-slot="2">セーブ2</button>
          <button class="btn" data-action="save-state" data-slot="3">セーブ3</button>
          <button class="btn primary" data-action="open-load">ロード</button>
        </div>
        <div class="save-meta">
          <span>1:${fmtTs(getSaveMeta(1).ts)}</span>
          <span>2:${fmtTs(getSaveMeta(2).ts)}</span>
          <span>3:${fmtTs(getSaveMeta(3).ts)}</span>
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

    const gradeChip = filled
      ? `<button class="chip grade ${grade}" data-action="slot-edit-grade" data-index="${index}" aria-label="レアリティ変更">${grade}</button>`
      : '';
    const scoreChip = filled ? `<span class="chip">${sl.score ?? '-'}</span>` : '';
    const delBtn = filled
      ? `<button class="xbtn-inline" data-action="slot-delete-at" data-index="${index}" aria-label="削除">×</button>`
      : '';

    const descHtml = filled
      ? `<button class="slot-desc-btn" data-action="slot-edit-desc" data-index="${index}" title="${escapeAttr(desc)}">${escapeHtml(desc)}</button>`
      : `<div class="slot-desc">${escapeHtml(desc)}</div>`;

    return `
      <div class="slot-card ${selected?'selected':''} ${grade?RARITY_BG_CLASS[grade]:''}" data-action="slot-select" data-index="${index}">
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
          ${descHtml}
        </div>

        <div class="slot-tail">
          ${lockVisible ? `<button class="icon-btn lock ${lockOn?'on':''}" data-action="slot-lock" data-index="${index}" ${lockCanToggle?'':'disabled'}>${lockOn?'🔒':'🔓'}</button>` : `<span class="slot-tail-spacer"></span>`}
          ${scoreChip}
          ${gradeChip}
          ${delBtn}
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

  // ---------- step 5 ----------
  function renderStep5(){
    const target = app.state.ui.step5Target || 'key';
    const keyOn = target === 'key';
    const gaugeOn = target === 'gauge';
    const kc = clampInt(app.state.keyCount || 0, 0, 99999);
    const mg = clampInt(app.state.mythicGaugeInit || 0, 0, 500);

    return `
      <div class="section">
        <div class="section-title">ステップ⑤：鍵 / 神話ゲージ（初期値）</div>
        <div class="section-sub">下のキーパッドで値を入力（タップで入力対象を切替）</div>

        <div class="kv-row">
          <button class="kv-box ${keyOn?'on':''}" data-action="keypad-target" data-target="key" type="button">
            <div class="k">黄金の鍵</div>
            <div class="v">${escapeHtml(String(kc))} <span class="unit">本</span></div>
            <div class="h">0〜99999</div>
          </button>

          <button class="kv-box ${gaugeOn?'on':''}" data-action="keypad-target" data-target="gauge" type="button">
            <div class="k">神話ゲージ</div>
            <div class="v">${escapeHtml(String(mg))} <span class="unit">/ 500</span></div>
            <div class="h">0〜500</div>
          </button>
        </div>

        ${renderKeypad()}

        <div class="cta-row">
          <button class="btn reset" data-action="reset-step" data-step="5">リセット</button>
          <button class="btn primary wide" data-action="confirm-step" data-step="5">⑤確定</button>
        </div>
      </div>
    `;
  }

  function renderKeypad(){
    const nums = [1,2,3,4,5,6,7,8,9];
    const buttons = nums.map(n => `<button class="kbtn" data-action="keypad-digit" data-digit="${n}" type="button">${n}</button>`).join('');
    return `
      <div class="keypad">
        ${buttons}
        <button class="kbtn zero" data-action="keypad-digit" data-digit="0" type="button">0</button>
        <button class="kbtn bs" data-action="keypad-bs" type="button">BS</button>
      </div>
    `;
  }

  function keypadApplyDigit(digit){
    const t = (app.state.ui.step5Target || 'key');
    const d = String(digit);
    if (!/^[0-9]$/.test(d)) return;

    if (app.state.step5Confirmed) { app.state.step5Confirmed = false; app.state.step6Confirmed = false; }
    if (app.state.maxReached > 5) app.state.maxReached = 5;

    if (t === 'gauge'){
      const cur = clampInt(app.state.mythicGaugeInit || 0, 0, 500);
      const s = String(cur);
      const nextStr = (s === '0') ? d : (s + d);
      const next = clampInt(parseInt(nextStr, 10) || 0, 0, 500);
      app.state.mythicGaugeInit = next;
    } else {
      const cur = clampInt(app.state.keyCount || 0, 0, 99999);
      const s = String(cur);
      const nextStr = (s === '0') ? d : (s + d);
      const next = clampInt(parseInt(nextStr, 10) || 0, 0, 99999);
      app.state.keyCount = next;
    }
  }

  function keypadBackspace(){
    const t = (app.state.ui.step5Target || 'key');
    if (app.state.step5Confirmed) { app.state.step5Confirmed = false; app.state.step6Confirmed = false; }
    if (app.state.maxReached > 5) app.state.maxReached = 5;

    if (t === 'gauge'){
      const cur = clampInt(app.state.mythicGaugeInit || 0, 0, 500);
      const s = String(cur);
      const nextStr = (s.length <= 1) ? '0' : s.slice(0, -1);
      app.state.mythicGaugeInit = clampInt(parseInt(nextStr, 10) || 0, 0, 500);
    } else {
      const cur = clampInt(app.state.keyCount || 0, 0, 99999);
      const s = String(cur);
      const nextStr = (s.length <= 1) ? '0' : s.slice(0, -1);
      app.state.keyCount = clampInt(parseInt(nextStr, 10) || 0, 0, 99999);
    }
  }

  // ---------- step 6 ----------
  function renderStep6(){
    const cfg = app.state.simConfig;
    normalizeEndSets(cfg);

    const lockedCount = app.state.slot.slice(0,3).filter(x => x.locked && x.number).length;
    const remainingLock = 3 - lockedCount;

    // locked slots (1-3) are not part of end-condition input
    for (const set of cfg.endSets){
      for (let i=0;i<3;i++){
        if (app.state.slot[i].locked && app.state.slot[i].number){
          set.slots[i] = 'none';
        }
      }
    }

return `
      <div class="section">
        <div class="section-title list-head">
          <span class="head-left"><span class="caret">▲</span>状況一覧</span>
          <span class="section-sub">枠色：ロック=青（背景白） / 候補1=赤 / 候補2=橙 / 候補3=黄</span>
        </div>
        <div class="situ-grid">
          ${Array.from({length:30}, (_,i)=>renderSituTile(i+1)).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-title">ステップ⑥：戦略 / 終了条件</div>

        <div class="form-block">
          <div class="form-title">ロック方針</div>
          <div class="seg">
            <button class="seg-btn ${cfg.lockStrategy==='S1'?'on':''}" data-action="cfg-lock" data-value="S1" type="button">S1：即ロック</button>
            <button class="seg-btn ${cfg.lockStrategy==='S2'?'on':''}" data-action="cfg-lock" data-value="S2" type="button">S2：まとめてロック</button>
          </div>
          <div class="small muted">※S2は「残りロック可能数 ≥ 2」の間のみ『2体同時で追加ロック』が発動します（現在：残り ${remainingLock}）</div>
        </div>

        <div class="form-block">
          <div class="form-title">優先基準</div>
          <div class="seg">
            <button class="seg-btn ${cfg.tieBreaker==='score'?'on':''}" data-action="cfg-tie" data-value="score" type="button">評価点</button>
            <button class="seg-btn ${cfg.tieBreaker==='number'?'on':''}" data-action="cfg-tie" data-value="number" type="button">番号</button>
          </div>
          <div class="small muted">評価点：評価点DESC → 番号ASC / 番号：番号ASC → 評価点DESC</div>
        </div>

        <div class="form-block">
          <label class="check">
            <input type="checkbox" data-action="cfg-prefer" ${cfg.preferC1DontLockC2?'checked':''} />
            <span>第1候補が狙える間は、第2候補をロックしない</span>
          </label>
          <div class="small muted">※「ロック枠が残っている」＆「第1候補が出現する可能性がある状況で第2候補が出た」場合に、第1を優先します</div>
        </div>

        <div class="form-block">
          <div class="form-title">終了条件（セット）</div>
          <div class="small muted">セット1は常に適用。セット2/3はチェックONで追加（OR条件）。ロック中スロットは「ロック中」固定で、終了条件の入力対象外です。</div>

          <div class="endsets">
            ${cfg.endSets.map((set, si) => {
              const enabled = (si===0) ? true : !!set.enabled;
              const head = (si===0)
                ? `<div class="endset-head"><div class="endset-name">セット1</div><div class="endset-note muted">（常に適用）</div></div>`
                : `<div class="endset-head">
                     <div class="endset-name">セット${si+1}</div>
                     <label class="check mini">
                       <input type="checkbox" data-action="endset-enable" data-set="${si}" ${enabled?'checked':''}/>
                       <span>終了条件に含める</span>
                     </label>
                   </div>`;
              const cards = Array.from({length:5}, (_,i) => {
                const isLocked = (i<3) && app.state.slot[i].locked && app.state.slot[i].number;
                const tok = isLocked ? 'locked' : (set.slots[i] || 'none');
                const cls = isLocked ? 'endtok-locked' : endTokenClass(tok);
                const val = isLocked ? 'ロック中' : endTokenLabel(tok);
                return `<button class="endcard ${cls}" type="button" data-action="endset-cycle" data-set="${si}" data-idx="${i}" ${isLocked?'disabled':''}>
                          <div class="endcard-top">スロット${i+1}</div>
                          <div class="endcard-val">${val}</div>
                        </button>`;
              }).join('');
              return `<div class="endset">
                        ${head}
                        <div class="endset-cards">${cards}</div>
                      </div>`;
            }).join('')}
          </div>
        </div>

<div class="form-block">
          <button class="acc-btn" data-action="acc-toggle" type="button">${app.state.ui.accOpen?'▲':'▼'}人形の番号を確認</button>
          ${app.state.ui.accOpen ? renderIdList() : ''}
        </div>

        <div class="cta-row">
          <button class="btn reset" data-action="reset-step" data-step="6">リセット</button>
          <button class="btn primary wide" data-action="confirm-step" data-step="6">⑥確定</button>
        </div>
      </div>
    `;
  }

  
  function renderStep7(){
    const sim = app.state.sim;
    const cfg = app.state.simConfig;
    normalizeEndSets(cfg);
    const endSets = cfg.endSets;
    const keyMax = clampInt(app.state.keyCount, 0, 99999);
    const trials = clampInt(cfg.trials, 1, 200000);
    cfg.trials = trials;

    const useKey = !!cfg.useKeyCount;
    const xAxis = sim.xAxis || (useKey ? 'key' : 'pull');

    const canRun = app.state.step6Confirmed && !sim.running;

    const progText = sim.running
      ? `${sim.done.toLocaleString()} / ${sim.total.toLocaleString()}（${Math.floor((Date.now()-sim.startedAt)/1000)}s）`
      : (sim.results ? `${sim.results.done.toLocaleString()} / ${sim.results.total.toLocaleString()}（完了）` : '未実行');

    const r = sim.results;

    let summaryHtml = '';
    if (r){
      const axis = (xAxis === 'key') ? 'keys' : 'pulls';
      const stats = r.stats && r.stats[axis];
      const succRate = (r.successes / r.total) * 100;
      summaryHtml += `
        <div class="panel">
          <div class="panel-title">結果サマリー</div>
          <div class="kv">
            <div class="kv-row"><div class="k">達成率</div><div class="v">${succRate.toFixed(2)}%（成功 ${r.successes} / 失敗 ${r.fails}）</div></div>
            <div class="kv-row"><div class="k">平均${xAxis==='key'?'消費鍵':'試行回数'}</div><div class="v">${stats && stats.mean!=null ? formatNum(stats.mean) : '—'}</div></div>
            <div class="kv-row"><div class="k">中央値（50%点）</div><div class="v">${stats && stats.q50!=null ? formatNum(stats.q50) : '—'}</div></div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">分位点</div>
          <div class="quant-grid">
            ${renderQuantCell('10%', stats && stats.q10)}
            ${renderQuantCell('20%', stats && stats.q20)}
            ${renderQuantCell('30%', stats && stats.q30)}
            ${renderQuantCell('40%', stats && stats.q40)}
            ${renderQuantCell('60%', stats && stats.q60)}
            ${renderQuantCell('70%', stats && stats.q70)}
            ${renderQuantCell('80%', stats && stats.q80)}
            ${renderQuantCell('90%', stats && stats.q90)}
          </div>
          <div class="small dim">※達成率（成功率）が分位点の%未満の場合、その分位点は「—」になります。</div>
        </div>
        <div class="panel">
          <div class="panel-title">補助情報</div>
          <div class="kv">
            <div class="kv-row"><div class="k">神話確定発動（平均/成功回）</div><div class="v">${r.aux && r.aux.avgMythicAct!=null ? r.aux.avgMythicAct.toFixed(3) : '—'}</div></div>
            <div class="kv-row"><div class="k">平均消費鍵（成功回）</div><div class="v">${r.aux && r.aux.avgKeys!=null ? formatNum(r.aux.avgKeys) : '—'}</div></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="section">
        <div class="section-title">ステップ⑦ シミュレーション</div>
        <div class="section-sub">⑥で確定した戦略・終了条件にもとづき、モンテカルロで統計を出します。</div>

        <div class="panel">
          <div class="panel-title">実行設定</div>
          <div class="form-row">
            <label class="chk">
              <input type="checkbox" data-action="sim-usekey" ${useKey?'checked':''} ${sim.running?'disabled':''}/>
              <span>所持している黄金の鍵本数を考慮して実行（上限：⑤の鍵本数 = ${keyMax}）</span>
            </label>
          </div>

          <div class="form-row">
            <div class="field">
              <div class="field-label">試行回数</div>
              <input class="inp" type="number" min="1" max="200000" step="1" value="${trials}" data-action="sim-trials" ${sim.running?'disabled':''}/>
            </div>
            <div class="field">
              <div class="field-label">安全上限（消費鍵）</div>
              <input class="inp" type="number" min="1000" max="10000000" step="1000" value="${cfg.keySafetyMax ?? 100000}" data-action="sim-safety-keys" ${sim.running?'disabled':''}/>
              <div class="small">※鍵考慮OFFでも、この本数に達したら失敗扱いで打ち切ります</div>
            </div>
            <div class="field">
              <div class="field-label">最大ガチャ回数（1試行）</div>
              <input class="inp" type="number" min="1000" max="2000000" step="1000" value="${cfg.maxPullsSafety ?? 50000}" data-action="sim-maxpulls" ${sim.running?'disabled':''}/>
            
            </div>
            <div class="field">
              <div class="field-label">グラフ横軸</div>
              <select class="sel" data-action="sim-xaxis" ${sim.running?'disabled':''}>
                <option value="pull" ${(xAxis==='pull')?'selected':''}>ガチャ回数</option>
                <option value="key" ${(xAxis==='key')?'selected':''}>消費鍵本数</option>
              </select>
            </div>
          </div>

          <div class="cta-row">
            <button class="btn primary wide" data-action="sim-start" ${(!canRun || sim.running)?'disabled':''}>${sim.running?'シミュレート実行中':'シミュレートを実行'}</button>
            <button class="btn danger" data-action="sim-stop" ${sim.running?'':'disabled'}>停止</button>
          </div>

          <div class="progress">
            <div class="progress-text">${progText}</div>
            <div class="progress-bar"><div class="progress-bar-inner" style="width:${sim.running? (sim.total? (sim.done/sim.total*100):0) : (r? (r.done/r.total*100):0)}%"></div></div>
          </div>

          <div class="small dim">
            ⑥終了条件：${renderEndSetsSummary(endSets)}
          </div>
        </div>

        ${summaryHtml}

        <div class="panel">
          <button class="acc-btn" data-action="acc-toggle-graph" type="button">${app.state.ui.graphOpen?'▲':'▼'}グラフ（累積達成率）</button>
          ${app.state.ui.graphOpen ? `<div class="graph-wrap"><canvas id="cdfCanvas" width="360" height="220"></canvas></div>` : ''}
          <div class="small dim">縦軸：累積達成率（CDF） / 横軸：${xAxis==='key'?'消費鍵':'ガチャ回数'}。主要分位点（10/50/90%）を表示。</div>
        </div>

      </div>
    `;
  }

  function renderQuantCell(label, value){
    return `<div class="qcell"><div class="qk">${label}</div><div class="qv">${value!=null ? formatNum(value) : '—'}</div></div>`;
  }

  function formatNum(x){
    if (x==null || !Number.isFinite(x)) return '—';
    const v = (Math.abs(x) >= 1000) ? Math.round(x) : (Math.round(x*100)/100);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function ensureGraphOpenDefault(){
    if (app.state.ui.graphOpen == null) app.state.ui.graphOpen = false;
  }

  function drawStep7Graph(){
    const sim = app.state.sim;
    if (app.state.currentStep !== 7) return;
    if (!app.state.ui.graphOpen) return;
    const canvas = document.getElementById('cdfCanvas');
    if (!canvas) return;
    const r = sim.results;
    if (!r || !r.cdf) return;

    const xAxis = sim.xAxis || 'pull';
    const axisKey = (xAxis === 'key') ? 'keys' : 'pulls';
    const pts = r.cdf[axisKey] || [];
    const q = r.stats ? r.stats[axisKey] : null;

    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    // colors for dark background
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.fillStyle = 'rgba(255,255,255,0.86)';

    // padding
    const padL = 34, padR = 10, padT = 10, padB = 26;
    const x0 = padL, y0 = H - padB, x1 = W - padR, y1 = padT;

    // axes
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0,y1); ctx.lineTo(x0,y0); ctx.lineTo(x1,y0);
    ctx.stroke();

    if (!pts.length){
      ctx.fillText('データなし', x0+8, y1+18);
      return;
    }

    const maxX = pts[pts.length-1].x;
    const maxY = pts[pts.length-1].y; // <=1
    const xScale = (x1-x0) / Math.max(1, maxX);
    const yScale = (y0-y1) / 1.0;

    // grid y 0..1
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    for (const yv of [0,0.25,0.5,0.75,1.0]){
      const yy = y0 - yv*yScale;
      ctx.globalAlpha = 0.15;
      ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(x1,yy); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(String(Math.round(yv*100))+'%', 2, yy+4);
    }

    // curve
    ctx.beginPath();
    for (let i=0;i<pts.length;i++){
      const px = x0 + pts[i].x * xScale;
      const py = y0 - pts[i].y * yScale;
      if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();

    // quantile lines at 10/50/90 if exist
    const qs = [
      {p:0.10, v:q && q.q10},
      {p:0.50, v:q && q.q50},
      {p:0.90, v:q && q.q90},
    ];
    ctx.setLineDash([4,4]);
    for (const it of qs){
      if (it.v == null) continue;
      const xx = x0 + it.v * xScale;
      ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.moveTo(xx,y0); ctx.lineTo(xx,y1); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(Math.round(it.p*100)+'%', xx+2, y1+12);
    }
    ctx.setLineDash([]);

    // x labels
    ctx.fillText('0', x0-4, y0+14);
    ctx.fillText(String(maxX), x1-16, y0+14);
  }

  // ---------- Step7 simulation ----------
  function copySlots(slots){
    return slots.map(s => {
      const v = (s && s.valueMin != null) ? s.valueMin : ((s && s.value != null) ? s.value : null);
      return {...s, valueMin: v};
    });
  }

  function gradeIdx(g){
    const i = GRADE_ORDER.indexOf(g);
    return i >= 0 ? i : 0;
  }

  function buildCandidateReqMap(list){
    const map = new Map();
    for (const it of (list||[])){
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
      if (a.number !== b.number) return a.number - b.number;
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
      if (i<=2 && sl.locked){
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
      let bestKey = { r: rank(classifySlot(best,c1Map,c2Map,c3Map)), s: best.score||0, n: best.number||0 };
      for (let i=1;i<movable.length;i++){
        const it = movable[i];
        const k = { r: rank(classifySlot(it,c1Map,c2Map,c3Map)), s: it.score||0, n: it.number||0 };
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
        // ensure unlocked flags on placed slots (lock positions will be set later)
        picked.locked = false;
        out[pos] = picked;
      }
    }
    return out;
  }

  function lockPrefixLen(slots){
    let k=0;
    for (let i=0;i<3;i++){
      if (slots[i].locked) k++;
      else break;
    }
    return k;
  }

  function setLockPrefix(slots, k){
    k = clampInt(k, 0, 3);
    for (let i=0;i<3;i++){
      slots[i].locked = (i < k);
    }
    for (let i=3;i<5;i++){
      slots[i].locked = false;
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

  function isEndSatisfied(slots, endSets, c1Map, c2Map, c3Map){
    if (!Array.isArray(endSets) || endSets.length === 0) return false;
    for (let si=0; si<endSets.length; si++){
      const set = endSets[si] || {};
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

function lockDecision(slots, cfg, endSets, c1Map, c2Map){
    const strat = cfg.lockStrategy || 'S1';
    const prefer = !!cfg.preferC1DontLockC2;

    const curK = lockPrefixLen(slots);
    const cap = 3 - curK;
    if (cap <= 0) return curK;

    // status
    const set1 = (Array.isArray(endSets) && endSets[0]) ? endSets[0] : { slots: [] };
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

let c1Possible = false;
    const lockedNames = new Set();
    for (let i=0;i<3;i++){
      if (slots[i].locked && slots[i].name) lockedNames.add(slots[i].name);
    }
    for (const [name,_] of c1Map.entries()){
      if (!lockedNames.has(name)){ c1Possible = true; break; }
    }

    // has any C2 match in lock area
    let hasC2 = false;
    for (let i=0;i<3;i++){
      const sl = slots[i];
      const req = c2Map.get(sl.name);
      if (req && isMatch(sl, req)){ hasC2=true; break; }
    }

    const blockC2 = prefer && cap>0 && missingC1 && c1Possible && hasC2;

    let targetK = curK;

    // helper: extend lock to include matches up to capacity
    const canExtend = () => targetK < 3;

    const extendFor = (wantCls) => {
      for (let i=targetK;i<3 && canExtend();i++){
        const sl = slots[i];
        const req = (wantCls==='C1') ? c1Map.get(sl.name) : c2Map.get(sl.name);
        if (req && isMatch(sl, req)){
          targetK = i+1;
        } else {
          // stop if ordering ensures later won't match? no, continue.
        }
      }
    };

    if (strat === 'S1'){
      extendFor('C1');
    } else if (strat === 'S2'){
      if (cap >= 2){
        // count new C1 matches in unlocked part
        let newC1 = 0;
        for (let i=targetK;i<3;i++){
          const sl = slots[i];
          const req = c1Map.get(sl.name);
          if (req && isMatch(sl, req)) newC1++;
        }
        if (newC1 >= 2){
          extendFor('C1');
        }
      }
      // cap < 2 の間は、S2の条件を満たせないので追加ロックしない
    } else {
      // fallback
      extendFor('C1');
    }

    if (!blockC2){
      // If still capacity, allow C2 locking (fallback)
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

  async function simulateOnce(params){
    const { initialSlots, allNumbers, keyMax, gaugeInit, useKey, cfg, endSets, c1Map, c2Map, c3Map, tieBreaker } = params;

    let slots = copySlots(initialSlots);
    // normalize lock prefix
    const initK = lockPrefixLen(slots);
    setLockPrefix(slots, initK);

    let gauge = clampInt(gaugeInit, 0, 1000000);
    let keys = 0;
    let pulls = 0;
    let mythicActs = 0;
    let lockSum = 0;
    let pullEvents = 0;

    const safetyKeys = clampInt(Number(cfg.keySafetyMax ?? 100000), 1000, 10000000);
    const maxPulls = clampInt(Number(cfg.maxPullsSafety ?? (useKey ? 999999 : 200000)), 1000, 2000000);
    const yieldEvery = 400;

    for (let step=0; step<maxPulls; step++){
      if ((step % yieldEvery) === 0){
        if (params.sim && params.sim.stop) return { success:false, pulls, keys, mythicActs, lockSum, pullEvents };
        await new Promise(r => setTimeout(r, 0));
      }
      const curLock = lockPrefixLen(slots);
      const cost = Number(app.costByLockcount.get(curLock) || 0);

      if (keys + cost > safetyKeys){
        return { success:false, pulls, keys, mythicActs, lockSum, pullEvents };
      }
      if (useKey && (keys + cost > keyMax)){
        return { success:false, pulls, keys, mythicActs, lockSum, pullEvents };
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

      // draw names for unlocked slots without replacement, excluding locked names
      const lockedNums = new Set();
      for (let i=0;i<3;i++){
        if (slots[i].locked && slots[i].number!=null) lockedNums.add(slots[i].number);
      }
      const drawnNums = new Set();
      let firstUnlockedDone = false;

      for (let i=0;i<5;i++){
        if (i<=2 && slots[i].locked) continue;
        // available pool
        const pool = [];
        for (const n of allNumbers){
          if (lockedNums.has(n)) continue;
          if (drawnNums.has(n)) continue;
          pool.push(n);
        }
        if (!pool.length){
          // should not happen
          continue;
        }
        const num = chooseUniform(pool);
        drawnNums.add(num);

        const m = app.masterByNumber.get(num);
        const grade = drawGrade(forceMythic && !firstUnlockedDone);
        if (!firstUnlockedDone) firstUnlockedDone = true;

        const row = (m && m.byGrade && m.byGrade[grade]) ? m.byGrade[grade] : null;
        const stepmax = row ? Math.max(1, Number(row.stepmax||1)) : 1;
        const stepmin = row ? Number(row.stepmin||1) : 1;
        const paramemin = row ? Number(row.paramemin||0) : 0;
        const paramemax = row ? Number(row.paramemax||paramemin) : paramemin;
        const coef = randInt(1, stepmax);
        let value = paramemin + stepmin * (coef - 1);
        if (value < paramemin) value = paramemin;
        if (value > paramemax) value = paramemax;

        const score = calcScore(num, grade, value);
        const desc = buildDesc(num, grade, value);

        slots[i] = {
          number: num,
          name: m ? m.name : String(num),
          picurl: m ? m.picurl : null,
          grade: grade,
          valueMin: value,
          score: score,
          desc: desc,
          locked: slots[i].locked || false,
        };
      }

      pulls++;

      // classify+reorder
      slots = reorderSlots(slots, c1Map, c2Map, c3Map, tieBreaker);

      // lock decision
      const nextK = lockDecision(slots, cfg, endSets, c1Map, c2Map);
      setLockPrefix(slots, nextK);

      // end check
      if (isEndSatisfied(slots, endSets, c1Map, c2Map, c3Map)){
        return { success:true, pulls, keys, mythicActs, lockSum, pullEvents };
      }
    }

    // max loops
    return { success:false, pulls, keys, mythicActs, lockSum, pullEvents };
  }

  function buildCdf(values, total){
    // values: array of numbers (success only). total: trials total. CDF y uses total (includes failures)
    const arr = values.slice().sort((a,b)=>a-b);
    const pts = [];
    let i=0;
    while (i < arr.length){
      const x = arr[i];
      let j = i;
      while (j < arr.length && arr[j] === x) j++;
      const y = j / total;
      pts.push({x, y});
      i = j;
    }
    return pts;
  }

  function quantileFromCdf(valuesSorted, total, p){
    // overall quantile against total trials; returns null if not reachable
    if (!valuesSorted.length) return null;
    const target = p * total;
    const k = Math.ceil(target);
    if (k <= 0) return valuesSorted[0];
    if (k > valuesSorted.length) return null;
    return valuesSorted[k-1];
  }

  function computeStats(values, total){
    const arr = values.slice().sort((a,b)=>a-b);
    const n = arr.length;
    const sum = arr.reduce((a,b)=>a+b, 0);
    const mean = (n>0) ? (sum / n) : null;
    const q = (p)=>quantileFromCdf(arr, total, p);
    return {
      mean,
      q10: q(0.10),
      q20: q(0.20),
      q30: q(0.30),
      q40: q(0.40),
      q50: q(0.50),
      q60: q(0.60),
      q70: q(0.70),
      q80: q(0.80),
      q90: q(0.90),
    };
  }

  async function startSimulation(){
    if (!app.state.step6Confirmed){
      toast('先に⑥を確定してください');
      return;
    }
    ensureGraphOpenDefault();

    const sim = app.state.sim;
    if (sim.running) return;

    // Prefer Web Worker for step7 (avoid UI freeze). Fallback to main-thread loop if Worker unsupported.
    if (window.Worker){
      return startSimulationWithWorker();
    }

    // Fallback (legacy) – keep the previous behavior when Worker is unavailable.
    return startSimulationOnMainThread();
  }

  function buildWorkerSnapshot(){
    const masters = {};
;
    for (const [num, m] of app.masterByNumber.entries()){
      const byGrade = {};
      for (const g of GRADE_ORDER){
        const r = (m.byGrade && m.byGrade[g]) ? m.byGrade[g] : {};
        const stepmin = Number(r.stepmin ?? 1);
        const stepmax = Number(r.stepmax ?? 1);
        const paramemin = Number(r.paramemin ?? 0);
        const paramemax = Number(r.paramemax ?? paramemin);
        const paramebase = Number(r.paramebase ?? paramemin);
        byGrade[g] = {
          stepmin,
          stepmax,
          paramemin,
          paramemax,
          paramebase,
          fp: Number(r.fp||0),
        };
      }
      masters[num] = { number: Number(num), name: String(m.name||''), byGrade };
    }
    const costByLockcount = {};
    for (const [lc, ck] of app.costByLockcount.entries()){
      costByLockcount[String(lc)] = Number(ck);
    }
    return { masters, costByLockcount };
  }

  function ensureSimWorker(){
    if (app.simWorker){
      try { app.simWorker.terminate(); } catch(_e) {}
      app.simWorker = null;
    }
    const url = `ld_doll_gacha_sim_worker.js?v=${VERSION}`;
    const w = new Worker(url);
    w.onmessage = onSimWorkerMessage;
    w.onerror = (ev) => {
      console.error(ev);
      toast('シミュレーションでエラーが発生しました（Worker）');
      const sim = app.state.sim;
      sim.running = false;
      render();
    };
    app.simWorker = w;
    return w;
  }

  function stopSimulation(){
    const sim = app.state.sim;
    if (!sim || !sim.running) return;
    sim.stop = true;
    if (app.simWorker && sim.runId){
      try { app.simWorker.postMessage({ type:'stop', runId: sim.runId }); } catch(_e) {}
    }
    toast('停止要求を受け付けました');
    render();
  }

  function onSimWorkerMessage(ev){
    const msg = ev.data || {};
    const sim = app.state.sim;
    if (!sim || !sim.running) return;
    if (msg.runId && sim.runId && msg.runId !== sim.runId) return;

    if (msg.type === 'progress'){
      sim.done = clampInt(msg.done||0, 0, sim.total||0);
      render();
      return;
    }
    if (msg.type === 'done'){
      sim.running = false;
      sim.done = clampInt(msg.done||0, 0, sim.total||0);

      const totalUsed = clampInt(msg.done||0, 0, sim.total||0);
      const successes = clampInt(msg.successes||0, 0, totalUsed);
      const pulls = Array.isArray(msg.pulls) ? msg.pulls : [];
      const keys = Array.isArray(msg.keys) ? msg.keys : [];

      const stats = {
        pulls: computeStats(pulls, totalUsed),
        keys: computeStats(keys, totalUsed),
      };
      const cdf = {
        pulls: buildCdf(pulls, totalUsed),
        keys: buildCdf(keys, totalUsed),
      };

      const sumMythic = Number(msg.sumMythic||0);
      const sumKeys = Number(msg.sumKeys||0);
      const sumLock = Number(msg.sumLock||0);
      const sumPullEvents = Number(msg.sumPullEvents||0);

      const aux = {
        avgLockPerPull: (sumPullEvents>0) ? (sumLock / sumPullEvents) : null,
        avgMythicAct: (successes>0) ? (sumMythic / successes) : null,
        avgKeys: (successes>0) ? (sumKeys / successes) : null,
      };

      sim.results = {
        total: totalUsed,
        done: totalUsed,
        successes,
        fails: (totalUsed - successes),
        pulls,
        keys,
        stats,
        cdf,
        aux,
        failBreakdown: msg.failBreakdown || null,
      };
      render();
      return;
    }
    if (msg.type === 'error'){
      console.error('worker error', msg);
      sim.running = false;
      toast('シミュレーションでエラーが発生しました');
      render();
      return;
    }
  }

  async function startSimulationWithWorker(){
    const sim = app.state.sim;

    const total = clampInt(app.state.simConfig.trials, 1, 200000);
    const useKey = !!app.state.simConfig.useKeyCount;
    const keyMax = clampInt(app.state.keyCount, 0, 99999);
    const gaugeInit = clampInt(app.state.mythicGaugeInit, 0, 1000000);

    const cfg = app.state.simConfig;
    normalizeEndSets(cfg);
    const endSets = cfg.endSets;
    const tieBreaker = cfg.tieBreaker || 'score';

    const initialSlots = copySlots(app.state.slot);

    // build snapshot (plain objects only)
    const snap = buildWorkerSnapshot();
    const allNumbers = Object.keys(snap.masters).map(n=>Number(n)).sort((a,b)=>a-b);

    sim.running = true;
    sim.stop = false;
    sim.done = 0;
    sim.total = total;
    sim.startedAt = Date.now();
    sim.results = null;
    sim.runId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    render();

    let w;
    try {
      w = ensureSimWorker();
    } catch(e){
      console.error(e);
      toast('Workerが使えないため、メインスレッドで実行します');
      sim.running = false;
      render();
      return startSimulationOnMainThread();
    }

    w.postMessage({
      type: 'start',
      runId: sim.runId,
      total,
      useKey,
      keyMax,
      gaugeInit,
      cfg: {
        lockStrategy: cfg.lockStrategy || 'S1',
        tieBreaker,
        preferC1DontLockC2: !!cfg.preferC1DontLockC2,
        keySafetyMax: clampInt(Number(cfg.keySafetyMax ?? 100000), 1000, 10000000),
        maxPullsSafety: clampInt(Number(cfg.maxPullsSafety ?? 50000), 1000, 2000000),
      },
      endSets,
      candidates: {
        c1: (app.state.candidate1||[]).map(x=>({ name:x.name, grade:x.grade, valueMin:Number(x.valueMin??0) })),
        c2: (app.state.candidate2||[]).map(x=>({ name:x.name, grade:x.grade, valueMin:Number(x.valueMin??0) })),
        c3: (app.state.candidate3||[]).map(x=>({ name:x.name, grade:x.grade, valueMin:Number(x.valueMin??0) })),
      },
      initialSlots,
      allNumbers,
      masters: snap.masters,
      costByLockcount: snap.costByLockcount,
    });
  }

  async function startSimulationOnMainThread(){
    // Legacy fallback: keep previous main-thread simulation (with yielding).
    const sim = app.state.sim;
    const total = clampInt(app.state.simConfig.trials, 1, 200000);
    const useKey = !!app.state.simConfig.useKeyCount;
    const keyMax = clampInt(app.state.keyCount, 0, 99999);
    const gaugeInit = clampInt(app.state.mythicGaugeInit, 0, 1000000);

    const cfg = app.state.simConfig;
    normalizeEndSets(cfg);
    const endSets = cfg.endSets;
    const tieBreaker = cfg.tieBreaker || 'score';

    const c1Map = buildCandidateReqMap(app.state.candidate1);
    const c2Map = buildCandidateReqMap(app.state.candidate2);
    const c3Map = buildCandidateReqMap(app.state.candidate3);
    const allNumbers = Array.from(app.masterByNumber.keys()).sort((a,b)=>a-b);
    const initialSlots = copySlots(app.state.slot);

    sim.running = true;
    sim.stop = false;
    sim.done = 0;
    sim.total = total;
    sim.startedAt = Date.now();
    sim.results = null;
    render();

    const pulls = [];
    const keys = [];
    let successes = 0;
    let sumMythic = 0;
    let sumKeys = 0;
    let sumLock = 0;
    let sumPullEvents = 0;

    const chunk = 200;
    for (let i=0;i<total;i++){
      if (sim.stop) break;
      const res = await simulateOnce({ initialSlots, allNumbers, keyMax, gaugeInit, useKey, cfg, end, c1Map, c2Map, c3Map, tieBreaker, sim });
      if (res.success){
        successes++;
        pulls.push(res.pulls);
        keys.push(res.keys);
        sumMythic += res.mythicActs;
        sumKeys += res.keys;
        sumLock += res.lockSum;
        sumPullEvents += res.pullEvents;
      }
      sim.done = i+1;
      if ((i % chunk) === 0){
        render();
        await new Promise(r => setTimeout(r, 0));
      }
    }

    sim.running = false;

    const totalUsed = sim.done;
    const stats = {
      pulls: computeStats(pulls, totalUsed),
      keys: computeStats(keys, totalUsed),
    };
    const cdf = {
      pulls: buildCdf(pulls, totalUsed),
      keys: buildCdf(keys, totalUsed),
    };
    const aux = {
      avgLockPerPull: (sumPullEvents>0) ? (sumLock / sumPullEvents) : null,
      avgMythicAct: (successes>0) ? (sumMythic / successes) : null,
      avgKeys: (successes>0) ? (sumKeys / successes) : null,
    };
    sim.results = { total: totalUsed, done: totalUsed, successes, fails: (totalUsed - successes), pulls, keys, stats, cdf, aux };
    render();
  }

function renderRangeOptions(max, cur){
    const v = clampInt(cur||1, 1, max);
    let html='';
    for (let i=1;i<=max;i++){
      html += `<option value="${i}" ${i===v?'selected':''}>${i}</option>`;
    }
    return html;
  }

  function renderNOptions(max, cur){
    const v = clampInt(cur||0, 0, max);
    let html = '';
    for (let i=0;i<=max;i++){
      html += `<option value="${i}" ${i===v?'selected':''}>${i}</option>`;
    }
    return html;
  }

  function renderIdList(){
    let rows = '';
    for (let i=1;i<=30;i++){
      const m = app.masterByNumber.get(i);
      if (!m) continue;
      rows += `<div class="id-row"><div class="id-n">${String(i).padStart(2,'0')}</div><div class="id-name">${escapeHtml(m.name)}</div><div class="id-desc">${escapeHtml(singleLine(m.basetxt||''))}</div></div>`;
    }
    return `<div class="id-list">${rows}</div>`;
  }

  function renderSituTile(num){
    const m = app.masterByNumber.get(num);
    const img = (m && m.picurl) ? m.picurl : PLACEHOLDER_IMG;
    const st = getSituStatus(num);
    const cls = st.cls;
    const badge = st.badge ? `<div class="situ-badge">${escapeHtml(st.badge)}</div>` : '';
    return `<div class="situ-tile ${cls}">
      <img src="${escapeAttr(img)}" alt="" loading="lazy" />
      <div class="situ-num">${String(num).padStart(2,'0')}</div>
      ${badge}
    </div>`;
  }

  function getSituStatus(num){
    const n = Number(num);
    const locked = new Set(app.state.slot.slice(0,3).filter(x=>x.locked && x.number).map(x=>Number(x.number)));
    if (locked.has(n)) return { cls:'lock', badge:'ロック中' };
    const c1 = new Set((app.state.candidate1||[]).map(x=>Number(x.number)));
    const c2 = new Set((app.state.candidate2||[]).map(x=>Number(x.number)));
    const c3 = new Set((app.state.candidate3||[]).map(x=>Number(x.number)));
    if (c1.has(n)) return { cls:'c1', badge:'第1候補' };
    if (c2.has(n)) return { cls:'c2', badge:'第2候補' };
    if (c3.has(n)) return { cls:'c3', badge:'第3候補' };
    return { cls:'other', badge:'' };
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
    const rm = app.state.rarityModal;
    const sm = app.state.saveModal;
    if (!c.open && !(rm && rm.open) && !(sm && sm.open) && !m.open){
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


    if (sm && sm.open){
      const m1 = getSaveMeta(1), m2 = getSaveMeta(2), m3 = getSaveMeta(3);
      host.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal" role="dialog" aria-modal="true" aria-label="ロード">
            <div class="modal-title">ロード</div>
            <div class="small" style="white-space:pre-line; margin-top:8px;">ロードするセーブ枠を選択してください</div>
            <div class="save-modal-list" style="margin-top:12px;">
              <button class="btn ${m1.exists?'primary':''}" data-action="saveload-load" data-slot="1" ${m1.exists?'':'disabled'}>セーブ1（${fmtTs(m1.ts)}）</button>
              <button class="btn ${m2.exists?'primary':''}" data-action="saveload-load" data-slot="2" ${m2.exists?'':'disabled'}>セーブ2（${fmtTs(m2.ts)}）</button>
              <button class="btn ${m3.exists?'primary':''}" data-action="saveload-load" data-slot="3" ${m3.exists?'':'disabled'}>セーブ3（${fmtTs(m3.ts)}）</button>
            </div>
            <div class="modal-actions" style="margin-top:16px;">
              <button class="btn" data-action="saveload-close">閉じる</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (rm && rm.open){
      const num = Number(rm.number);
      const st1 = getStepState(1);
      const cur = st1.grade.get(num) || (app.state.slot[Number(rm.slotIndex)] && app.state.slot[Number(rm.slotIndex)].grade) || 'N';
      const master = app.masterByNumber.get(num);
      const avail = (master && master.byGrade)
        ? GRADE_ORDER.filter(g => master.byGrade[g] && master.byGrade[g].paramemin != null)
        : GRADE_ORDER;
      const grades = avail.length ? avail : GRADE_ORDER;

      host.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal" role="dialog" aria-modal="true" aria-label="レアリティ変更">
            <div class="modal-title">${escapeHtml(master.name)}：レアリティ</div>
            <div class="row" style="flex-wrap:wrap; gap:8px; margin-top:10px;">
              ${grades.map(g => `<button class="btn ${cur===g?'primary':''}" data-action="rmodal-grade" data-grade="${g}">${g}</button>`).join('')}
            </div>
            <div class="modal-actions" style="margin-top:16px;">
              <button class="btn" data-action="rmodal-cancel">閉じる</button>
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

      // rarity modal
      if (action === 'rmodal-cancel'){
        app.state.rarityModal = { open:false, number:null, slotIndex:null };
        render();
        return;
      }
      if (action === 'rmodal-grade'){
        const grade = t.dataset.grade;
        const rm = app.state.rarityModal;
        if (rm && rm.open && rm.number != null){
          setStep1GradeFromRarityModal(rm.number, grade);
        }
        app.state.rarityModal = { open:false, number:null, slotIndex:null };
        render();
        return;
      }

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
        if (a && a.type === 'save-overwrite'){
          doSaveTo(a.slotNo);
        }
        if (a && a.type === 'load-state'){
          doLoadFrom(a.slotNo);
        }
        render();
        return;
      }

      if (action === 'go-step'){
        const target = Number(t.dataset.step);
        const cur = app.state.currentStep;
        // When moving forward via the step list, auto-confirm the current step if it has unsaved changes.
        // If confirmation succeeds and the target becomes reachable, jump in the same click.
        if (target > cur && isDirtyStep(cur)){
          confirmStep(cur);
          if (target <= app.state.maxReached && !isDirtyStep(cur)){
            goStep(target);
          }
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

      if (action === 'save-state'){
        const slotNo = Number(t.dataset.slot);
        if (slotNo>=1 && slotNo<=3){
          requestSaveTo(slotNo);
        }
        render();
        return;
      }
      if (action === 'open-load'){
        openLoadModal();
        render();
        return;
      }
      if (action === 'saveload-close'){
        app.state.saveModal = { open:false };
        render();
        return;
      }
      if (action === 'saveload-load'){
        const slotNo = Number(t.dataset.slot);
        app.state.saveModal = { open:false };
        if (slotNo>=1 && slotNo<=3){
          requestLoadFrom(slotNo);
        }
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
      if (action === 'slot-edit-grade'){
        const idx = Number(t.dataset.index);
        const num = focusStep1FromSlotIndex(idx);
        if (num == null) return;
        app.state.rarityModal = { open:true, number:num, slotIndex: idx };
        render();
        return;
      }
      if (action === 'slot-edit-desc'){
        const idx = Number(t.dataset.index);
        const num = focusStep1FromSlotIndex(idx);
        if (num == null) return;
        openModal(1, num);
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

      if (action === 'keypad-target'){
        app.state.ui.step5Target = t.dataset.target === 'gauge' ? 'gauge' : 'key';
        render();
        return;
      }
      if (action === 'keypad-digit'){
        keypadApplyDigit(t.dataset.digit);
        render();
        return;
      }
      if (action === 'keypad-bs'){
        keypadBackspace();
        render();
        return;
      }
      if (action === 'cfg-lock'){
        const v = t.dataset.value;
        if (app.state.step6Confirmed) { app.state.step6Confirmed = false; }
    if (app.state.maxReached > 6) app.state.maxReached = 6;
        app.state.simConfig.lockStrategy = (v === 'S2') ? 'S2' : 'S1';
        render();
        return;
      }
      if (action === 'cfg-tie'){
        const v = t.dataset.value;
        if (app.state.step6Confirmed) { app.state.step6Confirmed = false; }
    if (app.state.maxReached > 6) app.state.maxReached = 6;
        app.state.simConfig.tieBreaker = (v === 'number') ? 'number' : 'score';
        render();
        return;
      }
      if (action === 'endset-cycle'){
        const si = clampInt(Number(t.dataset.set||0), 0, 2);
        const idx = clampInt(Number(t.dataset.idx||0), 0, 4);
        const cfg = app.state.simConfig;
        normalizeEndSets(cfg);
        const isLocked = (idx < 3) && app.state.slot[idx].locked && app.state.slot[idx].number;
        if (isLocked) return;
        // enforce monotone priority (left side cannot be lower priority than right)
        const set = cfg.endSets[si] || { slots: [] };
        let leftLimitTok = null;
        for (let j = idx - 1; j >= 0; j--){
          const lockedJ = (j < 3) && app.state.slot[j].locked && app.state.slot[j].number;
          if (lockedJ) continue; // ロック中は優先順位の対象外
          const t0 = (set.slots && set.slots[j]) ? set.slots[j] : 'none';
          if (t0 === 'c1' || t0 === 'c2' || t0 === 'c3'){
            leftLimitTok = t0;
            break;
          }
        }
        const curTok = (set.slots && set.slots[idx]) ? set.slots[idx] : 'none';
        cfg.endSets[si].slots[idx] = cycleEndTokenConstrained(curTok, leftLimitTok);
        app.state.step6Confirmed = false;
        if (app.state.maxReached > 6) app.state.maxReached = 6;
        render();
        return;
      }
      if (action === 'endset-enable'){
        const si = clampInt(Number(t.dataset.set||1), 1, 2);
        const cfg = app.state.simConfig;
        normalizeEndSets(cfg);
        cfg.endSets[si].enabled = !!t.checked;
        app.state.step6Confirmed = false;
        if (app.state.maxReached > 6) app.state.maxReached = 6;
        render();
        return;
      }
      if (action === 'acc-toggle'){
        app.state.ui.accOpen = !app.state.ui.accOpen;
        render();
        return;
      }

      if (action === 'acc-toggle-graph'){
        ensureGraphOpenDefault();
        app.state.ui.graphOpen = !app.state.ui.graphOpen;
        render();
        return;
      }
      if (action === 'sim-start'){
        startSimulation();
        return;
      }
      if (action === 'sim-stop'){
        stopSimulation();
        return;
      }

    });

    document.addEventListener('input', (ev) => {
      const t = ev.target;
      if (!t) return;
      if (t.dataset.action === 'modal-range'){
        modalApplyIdx(Number(t.value));
        render();
        return;
      }
      if (t.dataset.action === 'end-n-removed'){
        // (removed) legacy end-condition inputs
        return;
      }

      
      
      if (t.dataset.action === 'sim-trials'){
        const v = clampInt(Number(t.value), 1, 200000);
        app.state.simConfig.trials = v;
        render();
        return;
      }
      if (t.dataset.action === 'sim-usekey'){
        app.state.simConfig.useKeyCount = !!t.checked;
        render();
        return;
      }
      if (t.dataset.action === 'sim-safety-keys'){
        const v = clampInt(Number(t.value), 1000, 10000000);
        app.state.simConfig.keySafetyMax = v;
        render();
        return;
      }
      if (t.dataset.action === 'sim-maxpulls'){
        const v = clampInt(Number(t.value), 1000, 2000000);
        app.state.simConfig.maxPullsSafety = v;
        render();
        return;
      }
      if (t.dataset.action === 'sim-xaxis'){
        const v = String(t.value||'pull');
        app.state.sim.xAxis = (v==='key') ? 'key' : 'pull';
        render();
        return;
      }
if (t.dataset.action === 'cfg-prefer'){
        app.state.simConfig.preferC1DontLockC2 = !!t.checked;
        if (app.state.step6Confirmed) { app.state.step6Confirmed = false; }
    if (app.state.maxReached > 6) app.state.maxReached = 6;
        render();
        return;
      }
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
      await loadCost();
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
