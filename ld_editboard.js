// ld_editboard.js
(() => {
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function base64UrlEncode(str){
    const bytes=new TextEncoder().encode(str);
    let bin=""; bytes.forEach(b=>bin+=String.fromCharCode(b));
    return btoa(bin).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
  }
  function base64UrlDecode(b64url){
    let b64=b64url.replaceAll("-","+").replaceAll("_","/");
    while(b64.length%4) b64+="=";
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  const deepClone = (o)=>JSON.parse(JSON.stringify(o));

  function toast(msg, ms=1100){
    const el=document.createElement("div");
    el.className="toast";
    el.textContent=msg;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), ms);
  }

  function flash(el){ if(!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  document.addEventListener("click",(e)=>{ const p=e.target.closest(".pressable"); if(p) flash(p); }, true);

  document.addEventListener("gesturestart",(e)=>e.preventDefault(),{passive:false});
  let lastTouchEnd=0;
  document.addEventListener("touchend",(e)=>{ const now=Date.now(); if(now-lastTouchEnd<=300) e.preventDefault(); lastTouchEnd=now; },{passive:false});

  const ICON_BASE="./icon/";
  const PLACEHOLDER=ICON_BASE+"_placeholder.png";

  const RANKS=["N","R","E","L","神話","不滅"];
  const RANK_LABEL={N:"N",R:"R",E:"E",L:"L","神話":"神","不滅":"不"};
  const RANK_ORDER={N:1,R:2,E:3,L:4,"神話":5,"不滅":6};

  const UNIT_TABLE="ld_editboard_units";

  const DEFAULT_UNITS = [{"code": "1001", "name": "弓兵", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1002", "name": "擲弾兵", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1003", "name": "野蛮人", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1004", "name": "水の精霊", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "1005", "name": "山賊", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2001", "name": "レンジャー", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2002", "name": "ショックロボット", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2003", "name": "聖騎士", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2004", "name": "サンドマン", "rank": "R", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "2005", "name": "悪魔の兵士", "rank": "R", "mode": false, "after": null, "dff": 7.5, "speed": 0.0}, {"code": "3001", "name": "電気ロボット", "rank": "E", "mode": false, "after": null, "dff": 5.0, "speed": 0.0}, {"code": "3002", "name": "木", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "3003", "name": "ハンター", "rank": "E", "mode": false, "after": null, "dff": 15.0, "speed": 0.0}, {"code": "3005", "name": "イーグル将軍", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 5.0}, {"code": "3006", "name": "ウルフ戦士", "rank": "E", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "4003", "name": "ウォーマシン", "rank": "L", "mode": false, "after": null, "dff": 10.0, "speed": 0.0}, {"code": "4004", "name": "虎の師父", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 5.0}, {"code": "4005", "name": "嵐の巨人", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "4007", "name": "保安官", "rank": "L", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "3004", "name": "重力弾", "rank": "神話", "mode": true, "after": "13004", "dff": 0.0, "speed": 0.0}, {"code": "3007", "name": "忍者", "rank": "神話", "mode": true, "after": "13007", "dff": 0.0, "speed": 0.0}, {"code": "4001", "name": "オークシャーマン", "rank": "神話", "mode": false, "after": null, "dff": 20.0, "speed": 0.0}, {"code": "4002", "name": "パルス発生器", "rank": "神話", "mode": true, "after": "14002", "dff": 0.0, "speed": 0.0}, {"code": "4006", "name": "猫の魔法使い", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5001", "name": "バンバ", "rank": "神話", "mode": true, "after": "15001", "dff": 0.0, "speed": 0.0}, {"code": "5002", "name": "コルディ", "rank": "神話", "mode": true, "after": "15002", "dff": 0.0, "speed": 0.0}, {"code": "5003", "name": "ランスロット", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5004", "name": "アイアンニャン", "rank": "神話", "mode": true, "after": "5104", "dff": 0.0, "speed": 0.0}, {"code": "5104", "name": "アイアンニャン", "rank": "神話", "mode": true, "after": "5204", "dff": 0.0, "speed": 0.0}, {"code": "5204", "name": "アイアンニャンv2", "rank": "神話", "mode": true, "after": "15004", "dff": 0.0, "speed": 0.0}, {"code": "5005", "name": "ブロッブ", "rank": "神話", "mode": true, "after": "15005", "dff": 20.0, "speed": 0.0}, {"code": "5006", "name": "ドラゴン", "rank": "神話", "mode": true, "after": "5106", "dff": 0.0, "speed": 0.0}, {"code": "5106", "name": "ドラゴン", "rank": "神話", "mode": true, "after": "5206", "dff": 0.0, "speed": 0.0}, {"code": "5206", "name": "偉大な卵", "rank": "神話", "mode": true, "after": "5306", "dff": 0.0, "speed": 0.0}, {"code": "5306", "name": "ドレイン", "rank": "神話", "mode": true, "after": "15006", "dff": 0.0, "speed": 0.0}, {"code": "5007", "name": "モノポリーマン", "rank": "神話", "mode": false, "after": null, "dff": 20.0, "speed": 0.0}, {"code": "5008", "name": "ママ", "rank": "神話", "mode": true, "after": "15008", "dff": 20.0, "speed": 0.0}, {"code": "5108", "name": "インプ", "rank": "N", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5009", "name": "カエルの王様", "rank": "神話", "mode": true, "after": "5109", "dff": 0.0, "speed": 10.0}, {"code": "5109", "name": "キングダイアン", "rank": "神話", "mode": true, "after": "15009", "dff": 0.0, "speed": 10.0}, {"code": "5010", "name": "バットマン", "rank": "神話", "mode": true, "after": "15010", "dff": 0.0, "speed": 0.0}, {"code": "5011", "name": "ヴェイン", "rank": "神話", "mode": true, "after": "15011", "dff": 0.0, "speed": 0.0}, {"code": "5012", "name": "インディ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5013", "name": "ワット", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5014", "name": "タール", "rank": "神話", "mode": true, "after": "5114", "dff": 0.0, "speed": 0.0}, {"code": "5114", "name": "タール", "rank": "神話", "mode": true, "after": "5214", "dff": 0.0, "speed": 0.0}, {"code": "5214", "name": "タール", "rank": "神話", "mode": true, "after": "5014", "dff": 0.0, "speed": 0.0}, {"code": "5015", "name": "ロケッチュー", "rank": "神話", "mode": true, "after": "5115", "dff": 0.0, "speed": 0.0}, {"code": "5115", "name": "オーバークロック・ロケッチュー", "rank": "神話", "mode": true, "after": "5015", "dff": 0.0, "speed": 0.0}, {"code": "5016", "name": "ウチ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5017", "name": "ビリ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5018", "name": "マスタークン", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5019", "name": "チョナ", "rank": "神話", "mode": false, "after": null, "dff": 0.0, "speed": 0.0}, {"code": "5020", "name": "ペンギン楽師", "rank": "神話", "mode": true, "after": "15020", "dff": 0.0, "speed": 0.0}, {"code": "5021", "name": "ヘイリー", "rank": "神話", "mode": true, "after": "15021", "dff": 0.0, "speed": 0.0}, {"code": "5022", "name": "アト", "rank": "神話", "mode": true, "after": "15022", "dff": 20.0, "speed": 0.0}, {"code": "5023", "name": "ロカ", "rank": "神話", "mode": true, "after": "15023", "dff": 0.0, "speed": 0.0}, {"code": "5024", "name": "選鳥師", "rank": "神話", "mode": true, "after": "15024", "dff": 0.0, "speed": 0.0}, {"code": "5025", "name": "チャド", "rank": "神話", "mode": true, "after": "15025", "dff": 0.0, "speed": 0.0}, {"code": "15008", "name": "グランドママ", "rank": "不滅", "mode": true, "after": "5008", "dff": 0.0, "speed": 0.0}, {"code": "15009", "name": "カエルの死神", "rank": "不滅", "mode": true, "after": "15109", "dff": 0.0, "speed": 0.0}, {"code": "15109", "name": "死神ダイアン", "rank": "不滅", "mode": true, "after": "5009", "dff": 0.0, "speed": 0.0}, {"code": "15021", "name": "覚醒ヘイリー", "rank": "不滅", "mode": true, "after": "5021", "dff": 0.0, "speed": 0.0}, {"code": "15001", "name": "原始バンバ", "rank": "不滅", "mode": true, "after": "5001", "dff": 0.0, "speed": 0.0}, {"code": "13007", "name": "鬼神忍者", "rank": "不滅", "mode": true, "after": "3007", "dff": 0.0, "speed": 0.0}, {"code": "15022", "name": "時空アト", "rank": "不滅", "mode": true, "after": "5022", "dff": 0.0, "speed": 0.0}, {"code": "14002", "name": "ドクターパルス", "rank": "不滅", "mode": true, "after": "4002", "dff": 0.0, "speed": 0.0}, {"code": "15011", "name": "トップヴェイン", "rank": "不滅", "mode": true, "after": "5011", "dff": 0.0, "speed": 0.0}, {"code": "15006", "name": "魔王ドラゴン", "rank": "不滅", "mode": true, "after": "5006", "dff": 0.0, "speed": 0.0}, {"code": "13004", "name": "スーパー重力弾", "rank": "不滅", "mode": true, "after": "3004", "dff": 0.0, "speed": 0.0}, {"code": "15023", "name": "キャプテンロカ", "rank": "不滅", "mode": true, "after": "5023", "dff": 0.0, "speed": 0.0}, {"code": "15004", "name": "アイアムニャン", "rank": "不滅", "mode": true, "after": "5004", "dff": 0.0, "speed": 0.0}, {"code": "15010", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "15110", "dff": 0.0, "speed": 0.0}, {"code": "15110", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "15210", "dff": 0.0, "speed": 0.0}, {"code": "15210", "name": "エースバットマン", "rank": "不滅", "mode": true, "after": "5010", "dff": 0.0, "speed": 0.0}, {"code": "15020", "name": "ノイズキングペンギン楽師", "rank": "不滅", "mode": true, "after": "5020", "dff": 0.0, "speed": 0.0}, {"code": "15024", "name": "ボス選鳥師", "rank": "不滅", "mode": true, "after": "5024", "dff": 0.0, "speed": 0.0}, {"code": "15005", "name": "ブロッブ団", "rank": "不滅", "mode": true, "after": "5005", "dff": 0.0, "speed": 0.0}, {"code": "15002", "name": "女王コルディ", "rank": "不滅", "mode": true, "after": "5002", "dff": 0.0, "speed": 0.0}, {"code": "15025", "name": "ギガチャド", "rank": "不滅", "mode": true, "after": "5025", "dff": 0.0, "speed": 0.0}];
  let UNITS = Array.isArray(DEFAULT_UNITS) ? DEFAULT_UNITS.slice() : [];
  let UNIT_MAP = new Map();

  function normalizeRank(v){
    if(!v) return "N";
    if(v==="ノマ") return "N";
    if(v==="神") return "神話";
    if(v==="不") return "不滅";
    return String(v);
  }
  function rebuildUnitMap(){
    UNITS = (UNITS||[]).map(u=>({
      code:String(u.code),
      rank:normalizeRank(u.rank),
      mode:!!u.mode,
      after:(u.after==null||u.after==="")?null:String(u.after),
    })).filter(u=>!!u.code);

    UNITS.sort((a,b)=>{
      const ra=RANK_ORDER[a.rank]||999, rb=RANK_ORDER[b.rank]||999;
      if(ra!==rb) return ra-rb;
      return Number(a.code)-Number(b.code);
    });
    UNIT_MAP = new Map(UNITS.map(u=>[u.code,u]));
  }
  rebuildUnitMap();

  function isStackable(code){
    const u=UNIT_MAP.get(String(code));
    return !!u && (u.rank==="N"||u.rank==="R"||u.rank==="E"||u.rank==="L");
  }

  const LAYOUTS={
    nhpt_single:{ label:"3x6 1P",          rows:3, cols:6, split:false, altar:false },
    hg_single:  { label:"3x6+3 1P",        rows:3, cols:7, split:false, altar:false },
    nhpt_both:  { label:"3x6 1&2P",        rows:6, cols:6, split:true,  altar:false },
    hg_both:    { label:"3x6+3 1&2P",      rows:6, cols:7, split:true,  altar:false },
    raid:       { label:"4x6 Raid",        rows:4, cols:6, split:false, altar:false },
    limit:      { label:"5x6 Extra",       rows:5, cols:6, split:false, altar:false },
    infinite:   { label:"3x6+12 ∞",        rows:6, cols:6, split:true,  altar:true  },
  };

  function zoneForCell(layoutKey, r, c){
    if(layoutKey==="nhpt_both") return (r<=2) ? "red" : "blue";
    if(layoutKey==="hg_both"){
      if(r<=2) return (c<=5) ? "red" : "yellow";
      return (c<=5) ? "blue" : "green";
    }
    if(layoutKey==="hg_single") return (c<=5) ? "blue" : "green";
    if(layoutKey==="infinite"){
      if(r<=2){
        if(c<=1) return "yellow";
        if(c>=4) return "yellow";
      }
    }
    return null;
  }

  const STORAGE_BASE="ld_editboard_slot_v3_";
  const UI_RANK_KEY="ld_editboard_filter_rank_v4";
  const UI_SETTINGS_KEY="ld_editboard_settings_open_v4";
  const UI_LAYOUT_KEY="ld_editboard_layout_v3";
  const UI_PANE_KEY="ld_editboard_settings_pane_v1";
  const UI_INFO_KEY="ld_editboard_palette_mode_v1";

  const state={
    layoutKey: localStorage.getItem(UI_LAYOUT_KEY) || "nhpt_single",
    rows:3, cols:6,
    cells:[],
  };
  const ui={
    activeRank: localStorage.getItem(UI_RANK_KEY) || "N",
    settingsOpen: (localStorage.getItem(UI_SETTINGS_KEY)==="1"),
    settingsPane: "layout",
    infoMode: false,
  };
  try{
    const pane = localStorage.getItem(UI_PANE_KEY);
    if(pane==="layout"||pane==="save") ui.settingsPane = pane;
    ui.infoMode = (localStorage.getItem(UI_INFO_KEY) === "info");
  }catch(_){}

  const history={
    undo:[], redo:[],
    push(s){ this.undo.push(s); if(this.undo.length>80) this.undo.shift(); this.redo.length=0; refreshUndoRedoButtons(); },
    canUndo(){return this.undo.length>0;},
    canRedo(){return this.redo.length>0;},
    undoOnce(){ if(!this.canUndo()) return null; const p=this.undo.pop(); this.redo.push(serializeState()); refreshUndoRedoButtons(); return p; },
    redoOnce(){ if(!this.canRedo()) return null; const n=this.redo.pop(); this.undo.push(serializeState()); refreshUndoRedoButtons(); return n; },
    clear(){ this.undo.length=0; this.redo.length=0; refreshUndoRedoButtons(); },
  };

  const els={
    board: $("#board"),
    paletteArea: $("#paletteArea"),
    palette: $("#palette"),
    rankTabs: $("#rankTabs"),
    undoBtn: $("#undoBtn"),
    redoBtn: $("#redoBtn"),
    clearBtn: $("#clearBtn"),
    settingsPanel: $("#settingsPanel"),
    shareBtn: $("#shareBtn"),
    scrollPad: $("#scrollPad"),
    tabLayout: $("#tabLayout"),
    tabSave: $("#tabSave"),
    infoToggle: $("#infoToggle"),
    infoPanel: $("#infoPanel"),
    modePlaceLbl: $("#modePlaceLbl"),
    modeInfoLbl: $("#modeInfoLbl"),
  };

  function iconUrl(code){ return ICON_BASE+String(code)+".png"; }
  function makeEmptyCells(rows, cols){ return Array.from({length:rows},()=>Array.from({length:cols},()=>null)); }
  function toArr(v){ if(v==null) return []; return Array.isArray(v)?v.map(String):[String(v)]; }
  function setCell(r,c,arr){
    const a=(arr||[]).map(String).filter(Boolean);
    if(a.length===0) state.cells[r][c]=null;
    else if(a.length===1) state.cells[r][c]=a[0];
    else state.cells[r][c]=a;
  }
  function cellAllSame(arr){ if(!arr.length) return false; const x=arr[0]; return arr.every(v=>v===x); }

  function isBlockedCell(r,c){
    const L=LAYOUTS[state.layoutKey] || LAYOUTS.nhpt_single;
    if(!L.altar) return false;
    return (r>=0 && r<=2 && c>=2 && c<=3);
  }

  function applyLayoutKey(k){
    const L=LAYOUTS[k] || LAYOUTS.nhpt_single;
    state.layoutKey = (k in LAYOUTS) ? k : "nhpt_single";
    state.rows = L.rows;
    state.cols = L.cols;
    localStorage.setItem(UI_LAYOUT_KEY, state.layoutKey);
  }

  function normalizeState(){
    if(!(state.layoutKey in LAYOUTS)) applyLayoutKey("nhpt_single");
    else applyLayoutKey(state.layoutKey);

    const next = makeEmptyCells(state.rows, state.cols);
    for(let r=0;r<Math.min(state.rows,state.cells.length);r++){
      for(let c=0;c<Math.min(state.cols,(state.cells[r]||[]).length);c++){
        next[r][c]=state.cells[r][c] ?? null;
      }
    }
    state.cells = next;

    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        const v=state.cells[r][c];
        state.cells[r][c] = Array.isArray(v)?v.map(String):(v==null?null:String(v));
        if(isBlockedCell(r,c)) state.cells[r][c]=null;
      }
    }
  }

  function serializeState(){ return deepClone({layoutKey:state.layoutKey, rows:state.rows, cols:state.cols, cells:state.cells}); }
  function applyState(s){
    if(!s||typeof s!=="object") return;
    state.layoutKey = s.layoutKey || state.layoutKey;
    state.rows = (s.rows ?? state.rows);
    state.cols = (s.cols ?? state.cols);
    state.cells = (s.cells ?? state.cells);
    normalizeState();
    renderAll();
  }

  function calcCellWidth(){
    const L=LAYOUTS[state.layoutKey] || LAYOUTS.nhpt_single;
    const styles=getComputedStyle(document.documentElement);
    const gap=parseFloat(styles.getPropertyValue("--cell-gap"))||2;
    const pad=parseFloat(styles.getPropertyValue("--board-pad"))||6;
    const boardRect = els.board.getBoundingClientRect();
    const innerW = Math.max(120, boardRect.width - pad*2);
    const w = Math.floor((innerW - (L.cols-1)*gap) / L.cols);
    return Math.max(28, w);
  }

  function syncCellSize(){
    const L=LAYOUTS[state.layoutKey] || LAYOUTS.nhpt_single;
    const styles=getComputedStyle(document.documentElement);
    const gap=parseFloat(styles.getPropertyValue("--cell-gap"))||2;
    const pad=parseFloat(styles.getPropertyValue("--board-pad"))||6;
    const splitMult=parseFloat(styles.getPropertyValue("--split-gap-mult"))||3;

    const topbarH = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
    const barH = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar-h"))||52);
    const safeB = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-b"))||0);
    const bottomH = barH + safeB;

    const paletteH = els.paletteArea?.getBoundingClientRect().height || 0;
    const mainPad = 20;
    const mainGap = 8;
    const available = window.innerHeight - topbarH - bottomH - paletteH - mainPad - mainGap;

    const cellW = calcCellWidth();
    const sepH = (L.split && L.rows===6) ? (gap*splitMult) : 0;
    const innerH = Math.max(120, available - pad*2 - sepH);

    let gapTotal;
    if(L.split && L.rows===6) gapTotal = (3-1)*gap + (3-1)*gap;
    else gapTotal = (L.rows-1)*gap;

    const capByH = Math.floor((innerH - gapTotal) / L.rows);
    const finalH = Math.max(30, Math.min(cellW, capByH));
    document.documentElement.style.setProperty("--cell-h", finalH + "px");
  }

  function renderTabs(){
    els.rankTabs.innerHTML="";
    if(!RANKS.includes(ui.activeRank)) ui.activeRank="N";
    for(const r of RANKS){
      const btn=document.createElement("div");
      btn.className="tab pressable"+(ui.activeRank===r?" is-active":"");
      btn.textContent=RANK_LABEL[r]??r;
      btn.addEventListener("click",()=>{
        if(ui.settingsOpen) return;
        ui.activeRank=r;
        localStorage.setItem(UI_RANK_KEY,r);
        renderTabs(); renderPalette();
        updateInfoPanel();
      });
      els.rankTabs.appendChild(btn);
    }
  }

  function renderPalette(){
    const units=UNITS.filter(u=>normalizeRank(u.rank)===ui.activeRank);
    els.palette.innerHTML="";
    for(const u of units){
      const item=document.createElement("div");
      item.className="pItem pressable";
      item.dataset.code=u.code;
      const img=document.createElement("img");
      img.alt=u.code; img.src=iconUrl(u.code);
      img.onerror=()=>{ img.onerror=null; img.src=PLACEHOLDER; };
      item.appendChild(img);
      els.palette.appendChild(item);
    }
  }

  function renderGrid(rows, cols, rOffset=0){
    const grid=document.createElement("div");
    grid.className="grid";
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for(let r=0;r<rows;r++){
      const rr=rOffset+r;
      for(let c=0;c<cols;c++){
        if(state.layoutKey==="infinite" && rr<=2 && c>=2 && c<=3) continue;

        const cell=document.createElement("div");
        cell.className="cell";
        cell.dataset.r=String(rr);
        cell.dataset.c=String(c);

        const z=zoneForCell(state.layoutKey, rr, c);
        if(z) cell.classList.add("zone-"+z);

        const blocked=isBlockedCell(rr,c);
        if(blocked) cell.classList.add("cell--blocked");

        const wrap=document.createElement("div");
        wrap.className="cell__content";

        if(!blocked){
          const codes=toArr(state.cells[rr][c]);
          if(codes.length){
            const host=document.createElement("div");
            host.className="unitHost";
            host.dataset.r=String(rr);
            host.dataset.c=String(c);

            if(codes.length===1){
              const u=document.createElement("div"); u.className="unitSingle";
              const img=document.createElement("img");
              img.alt=codes[0]; img.src=iconUrl(codes[0]);
              img.onerror=()=>{ img.onerror=null; img.src=PLACEHOLDER; };
              u.appendChild(img); host.appendChild(u);
            } else if(codes.length===2){
              host.classList.add("stack2");
              for(let i=0;i<2;i++){
                const img=document.createElement("img");
                img.className="stackImg "+(i===0?"p1":"p2");
                img.alt=codes[i]; img.src=iconUrl(codes[i]);
                img.onerror=()=>{ img.onerror=null; img.src=PLACEHOLDER; };
                host.appendChild(img);
              }
            } else {
              host.classList.add("stack3");
              for(let i=0;i<3;i++){
                const img=document.createElement("img");
                img.className="stackImg "+(i===0?"p1":(i===1?"p2":"p3"));
                img.alt=codes[i]; img.src=iconUrl(codes[i]);
                img.onerror=()=>{ img.onerror=null; img.src=PLACEHOLDER; };
                host.appendChild(img);
              }
            }
            wrap.appendChild(host);
          }
        }

        cell.appendChild(wrap);
        grid.appendChild(cell);
      }
    }
    return grid;
  }

  function renderBoard(){
    const L=LAYOUTS[state.layoutKey] || LAYOUTS.nhpt_single;
    els.board.innerHTML="";

    if(L.split && L.rows===6){
      const top=renderGrid(3,L.cols,0);
      if(L.altar){
        const altar=document.createElement("div");
        altar.className="altar";
        altar.textContent="祭壇";
        altar.style.gridColumn="3 / 5";
        altar.style.gridRow="1 / 4";
        altar.style.borderRadius="12px";
        top.insertBefore(altar, top.firstChild);
      }
      const sep=document.createElement("div"); sep.className="splitSeparator";
      const bottom=renderGrid(3,L.cols,3);
      els.board.appendChild(top);
      els.board.appendChild(sep);
      els.board.appendChild(bottom);
    } else {
      const grid=renderGrid(L.rows,L.cols,0);
      els.board.appendChild(grid);
    }

    bindBoardInteractions();
  }

  
  function renderSettingsUI(){
    document.body.classList.toggle("settings-open", ui.settingsOpen);
    localStorage.setItem(UI_SETTINGS_KEY, ui.settingsOpen ? "1":"0");

    const isLayout = ui.settingsOpen && ui.settingsPane==="layout";
    const isSave = ui.settingsOpen && ui.settingsPane==="save";

    // labels + active state
    els.tabLayout.textContent = (isLayout ? "▼" : "▲") + "盤面種類";
    els.tabSave.textContent   = (isSave   ? "▼" : "▲") + "保存読込";

    els.tabLayout.classList.toggle("is-active", isLayout);
    els.tabSave.classList.toggle("is-active", isSave);
    els.tabLayout.setAttribute("aria-selected", isLayout ? "true":"false");
    els.tabSave.setAttribute("aria-selected", isSave ? "true":"false");

    const paneLayout = document.getElementById("paneLayout");
    const paneSave = document.getElementById("paneSave");
    if(paneLayout) paneLayout.classList.toggle("is-active", ui.settingsPane==="layout");
    if(paneSave) paneSave.classList.toggle("is-active", ui.settingsPane==="save");

    $$(".seg", els.settingsPanel).forEach(b=>{
      const k=(b.dataset.layout||"").trim();
      b.classList.toggle("is-active", k===state.layoutKey);
    });
  }

  function updateInfoPanel(){
    if(!els.infoPanel) return;

    const isBoth = (state.layoutKey === "nhpt_both" || state.layoutKey === "hg_both");
    let selfCount = 0;
    let oppCount = 0;

    for(let r=0;r<state.rows;r++){
      for(let c=0;c<state.cols;c++){
        if(isBlockedCell(r,c)) continue;
        const arr = toArr(state.cells[r][c]);
        if(!arr.length) continue;
        if(isBoth){
          if(r <= 2) oppCount += arr.length;
          else selfCount += arr.length;
        }else{
          selfCount += arr.length;
        }
      }
    }
    const total = selfCount + oppCount;
    const oppCls = isBoth ? "infoBadge" : "infoBadge infoBadge--muted infoBadge--strike";

    els.infoPanel.innerHTML =
      `<div class="infoRow infoRow--unit">` +
        `<span class="infoKey">ユニット数</span>` +
        `<span class="infoBadge">自：${selfCount}体</span>` +
        `<span class="${oppCls}">相：${oppCount}体</span>` +
        `<span class="infoBadge">計：${total}体</span>` +
      `</div>`;
  }


  function applyInfoMode(){
    document.body.classList.toggle("info-mode", ui.infoMode);
    if(els.infoToggle) els.infoToggle.checked = ui.infoMode;
    if(els.modePlaceLbl) els.modePlaceLbl.classList.toggle("is-active", !ui.infoMode);
    if(els.modeInfoLbl) els.modeInfoLbl.classList.toggle("is-active", ui.infoMode);
    try{ localStorage.setItem(UI_INFO_KEY, ui.infoMode ? "info" : "place"); }catch(_){}
    updateInfoPanel();
  }

  function renderAll(){
    renderTabs();
    renderPalette();
    renderBoard();
    renderSettingsUI();
    applyInfoMode();
    requestAnimationFrame(syncCellSize);
  }

  // drag/drop
  let drag=null;
  let currentTarget=null;

  function clearTarget(){ if(currentTarget) currentTarget.classList.remove("is-target"); currentTarget=null; }

  function createGhost(code){
    const g=document.createElement("div");
    g.style.position="fixed"; g.style.zIndex="9999";
    g.style.width="72px"; g.style.height="72px";
    g.style.borderRadius="18px";
    g.style.border="1px solid rgba(255,255,255,.24)";
    g.style.background="rgba(17,24,42,.55)";
    g.style.backdropFilter="blur(10px)";
    g.style.display="flex"; g.style.alignItems="center"; g.style.justifyContent="center";
    g.style.transform="translate(-50%, -50%)";
    g.style.pointerEvents="none";
    g.style.boxShadow="0 18px 34px rgba(0,0,0,.45)";
    const img=document.createElement("img");
    img.src=iconUrl(code); img.style.width="58px"; img.style.height="58px"; img.style.objectFit="contain";
    img.onerror=()=>{ img.onerror=null; img.src=PLACEHOLDER; };
    g.appendChild(img);
    document.body.appendChild(g);
    return g;
  }
  function moveGhost(g,x,y){ g.style.left=`${x}px`; g.style.top=`${y}px`; }

  function pickCellFromPoint(x,y){
    const el=document.elementFromPoint(x,y);
    if(!el) return null;
    if(el.closest && el.closest(".altar")) return null;
    const cell=el.closest && el.closest(".cell");
    if(!cell) return null;
    if(cell.classList.contains("cell--blocked")) return null;
    return cell;
  }

  function beginDrag(payloadCodes, from, pointerId, x, y){
    drag={ payloadCodes: payloadCodes.map(String), from, pointerId, ghostEl:createGhost(payloadCodes[0]) };
    moveGhost(drag.ghostEl, x, y);
    document.body.style.cursor="grabbing";
  }
  function cleanupDrag(){
    if(!drag) return;
    drag.ghostEl?.remove();
    drag=null; clearTarget();
    document.body.style.cursor="";
  }

  function placeFromPalette(r,c,code){
    const cur=toArr(state.cells[r][c]);
    if(isStackable(code)){
      if(cur.length===0) return setCell(r,c,[code]);
      if(cellAllSame(cur) && cur[0]===code && cur.length<3) return setCell(r,c, cur.concat([code]));
      return setCell(r,c,[code]);
    }
    return setCell(r,c,[code]);
  }

  function endDrag(x,y){
    if(!drag) return;
    const {payloadCodes, from} = drag;
    const cell=pickCellFromPoint(x,y);

    if(cell){
      const r=parseInt(cell.dataset.r,10), c=parseInt(cell.dataset.c,10);
      history.push(serializeState());
      const dstArr=toArr(state.cells[r][c]);

      if(from.type==="palette"){
        placeFromPalette(r,c,payloadCodes[0]);
      } else {
        const srcR=from.r, srcC=from.c;
        if(srcR!==r || srcC!==c){
          const srcArr=toArr(state.cells[srcR][srcC]);
          const canMerge = cellAllSame(dstArr) && cellAllSame(srcArr) && dstArr[0]===srcArr[0] && isStackable(dstArr[0]) && (dstArr.length+srcArr.length<=3);
          if(canMerge){
            setCell(r,c, dstArr.concat(srcArr));
            setCell(srcR,srcC, []);
          } else {
            setCell(r,c, srcArr);
            setCell(srcR,srcC, dstArr);
          }
        }
      }

      normalizeState();
      renderAll();
      cleanupDrag();
      return;
    }

    if(from.type==="cell"){
      history.push(serializeState());
      setCell(from.r, from.c, []);
      normalizeState();
      renderAll();
      toast("削除");
    }
    cleanupDrag();
  }

  function onPointerMove(e){
    if(!drag) return;
    if(e.pointerId!==drag.pointerId) return;
    moveGhost(drag.ghostEl, e.clientX, e.clientY);

    const cell=pickCellFromPoint(e.clientX, e.clientY);
    if(cell!==currentTarget){
      if(currentTarget) currentTarget.classList.remove("is-target");
      currentTarget=cell;
      if(currentTarget) currentTarget.classList.add("is-target");
    }
  }
  function onPointerUp(e){ if(!drag) return; if(e.pointerId!==drag.pointerId) return; endDrag(e.clientX, e.clientY); }
  function onPointerCancel(e){ if(!drag) return; if(e.pointerId!==drag.pointerId) return; cleanupDrag(); }

  function bindPaletteDrag(){
    els.palette.addEventListener("pointerdown",(e)=>{
      if(ui.settingsOpen || ui.infoMode) return;
      const item=e.target.closest(".pItem");
      if(!item) return;
      e.preventDefault();
      const code=item.dataset.code;
      if(!code) return;
      beginDrag([String(code)], {type:"palette"}, e.pointerId, e.clientX, e.clientY);
      item.setPointerCapture?.(e.pointerId);
    },{passive:false});
  }

  
  function bindScrollPad(){
    if(!els.scrollPad) return;

    const mult = 1.35; // 「ここで左右にスクロール」：体感スクロール量を少し増やす
    const friction = 0.92; // 慣性減衰（1フレームあたり）
    const minVel = 0.02;   // 停止閾値（px/ms）

    let active=false, lastX=0, lastT=0, pid=null;
    let vel=0;             // px/ms（スクロール量反映後）
    let raf=0;

    const clampScroll = ()=>{
      const max = Math.max(0, els.palette.scrollWidth - els.palette.clientWidth);
      if(els.palette.scrollLeft < 0) els.palette.scrollLeft = 0;
      if(els.palette.scrollLeft > max) els.palette.scrollLeft = max;
      return max;
    };

    const stopInertia = ()=>{
      if(raf){ cancelAnimationFrame(raf); raf=0; }
      vel = 0;
    };

    const startInertia = ()=>{
      stopInertia();
      if(Math.abs(vel) < minVel) return;

      let prev = performance.now();
      const step = (t)=>{
        const dt = Math.max(1, t - prev);
        prev = t;

        const f = Math.pow(friction, dt/16);
        vel *= f;

        if(Math.abs(vel) < minVel){
          stopInertia();
          return;
        }

        els.palette.scrollLeft -= vel * dt;
        const max = clampScroll();
        if(els.palette.scrollLeft <= 0 || els.palette.scrollLeft >= max){
          stopInertia();
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const stopDrag = ()=>{
      active=false; pid=null;
      startInertia();
    };

    els.scrollPad.addEventListener("pointerdown",(e)=>{
      if(ui.settingsOpen || ui.infoMode) return;
      stopInertia();
      active=true; pid=e.pointerId;
      lastX=e.clientX;
      lastT=performance.now();
      vel=0;
      els.scrollPad.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    },{passive:false});

    els.scrollPad.addEventListener("pointermove",(e)=>{
      if(!active) return;
      if(pid!=null && e.pointerId!=pid) return;

      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const dx = (e.clientX - lastX);

      lastX = e.clientX;
      lastT = now;

      const delta = dx * mult;
      els.palette.scrollLeft -= delta;
      clampScroll();

      // 速度（px/ms）をスムージング
      const inst = (delta / dt);
      vel = vel*0.75 + inst*0.25;

      e.preventDefault();
    },{passive:false});

    els.scrollPad.addEventListener("pointerup", stopDrag);
    els.scrollPad.addEventListener("pointercancel", stopDrag);
    els.scrollPad.addEventListener("lostpointercapture", stopDrag);
  }

function bindBoardInteractions(){
    $$(".unitHost", els.board).forEach(host=>{
      host.addEventListener("pointerdown",(e)=>{
        if(ui.settingsOpen) return;
        e.preventDefault();

        const cell=e.target.closest(".cell");
        if(!cell || cell.classList.contains("cell--blocked")) return;
        const r=parseInt(cell.dataset.r,10), c=parseInt(cell.dataset.c,10);
        const arr=toArr(state.cells[r][c]);
        if(!arr.length) return;

        const startX=e.clientX, startY=e.clientY;
        const pointerId=e.pointerId;
        const startT=performance.now();
        const moveThresh=6;
        let startedDrag=false;

        const onMove=(ev)=>{
          if(ev.pointerId!==pointerId) return;
          const dx=ev.clientX-startX, dy=ev.clientY-startY;
          if(!startedDrag && (dx*dx+dy*dy) >= moveThresh*moveThresh){
            startedDrag=true;
            beginDrag(arr, {type:"cell", r, c}, pointerId, startX, startY);
            moveGhost(drag.ghostEl, ev.clientX, ev.clientY);
          }
          if(startedDrag) onPointerMove(ev);
        };

        const onUp=(ev)=>{
          if(ev.pointerId!==pointerId) return;
          window.removeEventListener("pointermove", onMove, {passive:false});
          window.removeEventListener("pointerup", onUp, {passive:false});
          window.removeEventListener("pointercancel", onCancel, {passive:false});

          if(startedDrag) return onPointerUp(ev);

          const dur=performance.now()-startT;
          if(dur>350) return;

          const baseCode = arr[0];
          const stackable = isStackable(baseCode) && arr.every(x => x === baseCode);
          if(stackable){
            let nextArr;
            if(arr.length === 1) nextArr = [baseCode, baseCode];
            else if(arr.length === 2) nextArr = [baseCode, baseCode, baseCode];
            else nextArr = [baseCode];
            history.push(serializeState());
            setCell(r,c,nextArr);
            normalizeState();
            renderAll();
            toast("体数変更");
            return;
          }

          let changed=false;
          const nextArr=arr.map(code=>{
            const u=UNIT_MAP.get(code);
            if(u && u.mode && u.after && u.after!==code){
              changed=true;
              return String(u.after);
            }
            return code;
          });
          if(!changed) return;

          history.push(serializeState());
          setCell(r,c,nextArr);
          normalizeState();
          renderAll();
          toast("変化");
        };

        const onCancel=(ev)=>{
          if(ev.pointerId!==pointerId) return;
          window.removeEventListener("pointermove", onMove, {passive:false});
          window.removeEventListener("pointerup", onUp, {passive:false});
          window.removeEventListener("pointercancel", onCancel, {passive:false});
          if(startedDrag) onPointerCancel(ev);
        };

        host.setPointerCapture?.(pointerId);
        window.addEventListener("pointermove", onMove, {passive:false});
        window.addEventListener("pointerup", onUp, {passive:false});
        window.addEventListener("pointercancel", onCancel, {passive:false});
      },{passive:false});
    });
  }

  function refreshUndoRedoButtons(){
    els.undoBtn.disabled = !history.canUndo();
    els.redoBtn.disabled = !history.canRedo();
  }

  function makeShareHash(){
    const payload=JSON.stringify(serializeState());
    return `#b=${base64UrlEncode(payload)}`;
  }
  function applyShareHashIfAny(){
    const h=location.hash||"";
    const m=h.match(/#b=([A-Za-z0-9\-_]+)/);
    if(!m) return false;
    try{
      const json=base64UrlDecode(m[1]);
      const s=JSON.parse(json);
      applyState(s);
      toast("復元");
      return true;
    }catch(e){
      console.warn(e); toast("復元失敗"); return false;
    }
  }
  async function copyToClipboard(text){
    try{ await navigator.clipboard.writeText(text); return true; }
    catch(_){
      const ta=document.createElement("textarea");
      ta.value=text; ta.style.position="fixed"; ta.style.left="-9999px";
      document.body.appendChild(ta); ta.select();
      const ok=document.execCommand("copy");
      ta.remove(); return ok;
    }
  }

  function setSettingsOpen(open, pane){
    if(pane==="layout"||pane==="save"){
      ui.settingsPane = pane;
      try{ localStorage.setItem(UI_PANE_KEY, pane); }catch(_){}
    }
    ui.settingsOpen=!!open;
    renderSettingsUI();
    if(ui.settingsOpen) cleanupDrag();
  }

  function bindControls(){
    renderSettingsUI();
    refreshUndoRedoButtons();

    els.undoBtn.addEventListener("click",()=>{
      const prev=history.undoOnce(); if(!prev) return;
      applyState(prev); toast("戻す");
    });
    els.redoBtn.addEventListener("click",()=>{
      const nxt=history.redoOnce(); if(!nxt) return;
      applyState(nxt); toast("やり直し");
    });
    els.clearBtn.addEventListener("click",()=>{
      history.push(serializeState());
      state.cells=makeEmptyCells(state.rows, state.cols);
      normalizeState();
      renderAll();
      toast("全消し");
    });

    els.tabLayout.addEventListener("click",()=>{
      const willOpen = !(ui.settingsOpen && ui.settingsPane==="layout");
      setSettingsOpen(willOpen, "layout");
    });
    els.tabSave.addEventListener("click",()=>{
      const willOpen = !(ui.settingsOpen && ui.settingsPane==="save");
      setSettingsOpen(willOpen, "save");
    });

    $$(".seg", els.settingsPanel).forEach(b=>{
      b.addEventListener("click",()=>{
        const k=(b.dataset.layout||"").trim();
        if(!k || !(k in LAYOUTS)) return;
        if(k===state.layoutKey) return;
        history.push(serializeState());
        applyLayoutKey(k);
        normalizeState();
        renderAll();
        toast(LAYOUTS[k].label);
      });
    });

    document.addEventListener("click",(e)=>{
      const s=e.target.closest("[data-save]");
      if(s) return saveSlot(parseInt(s.dataset.save,10));
      const l=e.target.closest("[data-load]");
      if(l) return loadSlot(parseInt(l.dataset.load,10));
    });

    els.shareBtn.addEventListener("click", async ()=>{
      const url = `${location.origin}${location.pathname}${makeShareHash()}`;
      const ok=await copyToClipboard(url);
      toast(ok?"コピーされました":"コピー失敗");
    });

    if(els.infoToggle){
      els.infoToggle.addEventListener("change", ()=>{
        ui.infoMode = !!els.infoToggle.checked;
        applyInfoMode();
      });
    }
    if(els.modePlaceLbl){
      els.modePlaceLbl.addEventListener("click", ()=>{
        ui.infoMode = false; applyInfoMode();
      });
    }
    if(els.modeInfoLbl){
      els.modeInfoLbl.addEventListener("click", ()=>{
        ui.infoMode = true; applyInfoMode();
      });
    }

    window.addEventListener("pointermove", onPointerMove, {passive:false});
    window.addEventListener("pointerup", onPointerUp, {passive:false});
    window.addEventListener("pointercancel", onPointerCancel, {passive:false});
    window.addEventListener("resize", ()=>syncCellSize());
    window.addEventListener("orientationchange", ()=>setTimeout(syncCellSize, 60));
  }

  function saveSlot(i){
    localStorage.setItem(STORAGE_BASE+String(i), JSON.stringify(serializeState()));
    toast(`セーブ${i}`);
  }
  function loadSlot(i){
    const raw=localStorage.getItem(STORAGE_BASE+String(i));
    if(!raw) return toast(`ロード${i}：空`);
    try{
      const s=JSON.parse(raw);
      history.push(serializeState());
      applyState(s);
      toast(`ロード${i}`);
    }catch(e){
      console.warn(e); toast("ロード失敗");
    }
  }

  async function tryLoadUnitsFromSupabase(){
    try{
      const url = window.LD_SUPABASE_URL;
      const key = window.LD_SUPABASE_ANON_KEY;
      if(!url || !key || !window.supabase) return;
      const client = window.supabase.createClient(url, key);
      const {data, error} = await client.from(UNIT_TABLE).select("code, rank, mode, after");
      if(error) return console.warn("Supabase load error:", error);
      if(Array.isArray(data) && data.length){
        UNITS = data;
        rebuildUnitMap();
        renderTabs();
        renderPalette();
        updateInfoPanel();
      }
    }catch(e){
      console.warn(e);
    }
  }

  // boot
  if(!RANKS.includes(ui.activeRank)) ui.activeRank="N";
  normalizeState();
  renderAll();
  bindControls();
  bindPaletteDrag();
  bindScrollPad();

  if(applyShareHashIfAny()) history.clear();
  tryLoadUnitsFromSupabase();
})();
