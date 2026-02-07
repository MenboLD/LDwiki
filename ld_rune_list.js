/* LDwiki Rune List JS
   BUILD: 20260207e
*/
(function(){
  'use strict';

  const BUILD = "20260207e";
  const RARITY_ORDER = ["ノマ","レア","エピ","レジェ","神話","不滅","超越"];

  // Default visible columns: Rune name + Effect only
  const COLS = [
    { key:"no", label:"No.", default:false },
    { key:"name", label:"ルーン名", default:true },
    { key:"grade", label:"レアリティ", default:false },
    { key:"effect", label:"効果", default:true },
    { key:"buff", label:"内部種目", default:false },
  ];

  // DOM
  const $ = (sel, el=document)=>el.querySelector(sel);
  const $$ = (sel, el=document)=>Array.from(el.querySelectorAll(sel));


// Column width freezing: keep current widths when enabling 内部種目 (horizontal scroll mode)
function captureColumnWidths(keys){
  const widths = {};
  keys.forEach(k=>{
    const th = $(`#runeTable thead th[data-col="${k}"]`);
    if (!th) return;
    if (th.classList.contains("hidden-col")) return;
    widths[k] = Math.max(40, Math.round(th.getBoundingClientRect().width));
  });
  return widths;
}
function applyColumnWidths(widths){
  if (!widths) return;
  Object.entries(widths).forEach(([k,w])=>{
    $$(`#runeTable [data-col="${k}"]`).forEach(el=>{
      el.style.width = w + "px";
      el.style.minWidth = w + "px";
      el.style.maxWidth = w + "px";
    });
  });
}
function clearColumnWidths(keys){
  keys.forEach(k=>{
    $$(`#runeTable [data-col="${k}"]`).forEach(el=>{
      el.style.width = "";
      el.style.minWidth = "";
      el.style.maxWidth = "";
    });
  });
}

  const elStatus = $("#statusText");
  const elTbody = $("#runeTbody");
  const elColToggles = $("#colToggles");
  const elRarityToggles = $("#rarityToggles");

  const elWordList = $("#wordList");
  const elWordCount = $("#wordCountLabel");
  const btnAndOr = $("#btnAndOr");
  const btnResetSort = $("#btnResetSort");
  const btnResetRarity = $("#btnResetRarity");
  const btnResetWord = $("#btnResetWord");

  const elTableScroll = document.querySelector(".tablewrap__scroll");

  const sidePanel = $("#sidePanel");
  const panelHandle = $("#panelHandle");
  const panelClose = $("#panelClose");
  const backdrop = $("#panelBackdrop");

  // State
  let allRunes = [];
  let wordList = [];
  let wordTotal = 0;

  function updateWordCountLabel(){
    if (!elWordCount) return;
    const sel = state.selectedWords.size;
    const total = wordTotal || wordList.length || 0;
    elWordCount.textContent = `選択中：${sel}/${total}`;
  }

  const state = {
    sortKey: "RuneSortOrder",
    sortDir: "asc", // asc|desc
    colVisible: Object.fromEntries(COLS.map(c=>[c.key, c.default])),
    // Default visible rarities: Legend, Mythic, Immortal, Transcend only
    rarityVisible: {
      "ノマ": false,
      "レア": false,
      "エピ": false,
      "レジェ": true,
      "神話": true,
      "不滅": true,
      "超越": true,
    },
    wordMode: "OR", // OR|AND
    selectedWords: new Set(),
  };

  function setStatus(text){
    elStatus.textContent = text;
  }

  function safeStr(v){
    if (v === null || v === undefined) return "";
    return String(v);
  }

  function formatParam(v){
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "number") {
      if (Number.isFinite(v) && Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
      // keep as-is but trim trailing zeros lightly
      const s = String(v);
      return s;
    }
    // for numeric strings like "2.0"
    const s = String(v);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  }

  function buildEffectPieces(row){
    // Pieces: text/param to allow BrValue split without losing styling
    const pieces = [];
    function pushText(t){ if (t) pieces.push({t:"text", v:t}); }
    function pushParam(p){ if (p !== "" && p !== null && p !== undefined && !Number.isNaN(p)) pieces.push({t:"param", v:formatParam(p)}); }

    pushText(safeStr(row.RuneTxt1));
    pushParam(row.Runeparame1);
    pushText(safeStr(row.RuneTxt2));
    pushParam(row.Runeparame2);
    pushText(safeStr(row.RuneTxt3));
    pushParam(row.Runeparame3);
    pushText(safeStr(row.RuneTxt4));

    return pieces;
  }

  function piecesToPlain(pieces){
    return pieces.map(p=>safeStr(p.v)).join("");
  }

  function renderPieces(pieces){
    return pieces.map(p => {
      if (p.t === "param") return `<span class="param">${escapeHtml(safeStr(p.v))}</span>`;
      return escapeHtml(safeStr(p.v));
    }).join("");
  }

  function splitPiecesByChar(pieces, brValue){
    // Split into two lists: first brValue chars, rest
    if (!brValue || brValue <= 0) return [pieces, []];

    let remaining = brValue;
    const a = [];
    const b = [];

    for (const piece of pieces){
      const s = safeStr(piece.v);
      if (!s) continue;

      if (remaining <= 0){
        b.push(piece);
        continue;
      }

      if (s.length <= remaining){
        a.push(piece);
        remaining -= s.length;
      } else {
        // split within this piece
        const left = s.slice(0, remaining);
        const right = s.slice(remaining);
        if (left) a.push({t:piece.t, v:left});
        if (right) b.push({t:piece.t, v:right});
        remaining = 0;
      }
    }

    return [a, b];
  }

  function buildEffectHTML(row){
    const pieces = buildEffectPieces(row);
    const plain = piecesToPlain(pieces);

    const brValue = Number(row.BrValue || 0);
    if (brValue && brValue > 0 && brValue < plain.length){
      const [p1, p2] = splitPiecesByChar(pieces, brValue);
      return `<div class="effect">${renderPieces(p1)}<br>${renderPieces(p2)}</div>`;
    }
    return `<div class="effect">${renderPieces(pieces)}</div>`;
  }

  function buildEffectPlain(row){
    return piecesToPlain(buildEffectPieces(row));
  }

  function escapeHtml(str){
    return str
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function buildChips(container, items, onChange){
    container.innerHTML = "";
    items.forEach(item => {
      const id = `${container.id}_${item.key}`;
      const chip = document.createElement("label");
      chip.className = "chip";
      chip.innerHTML = `
        <input type="checkbox" id="${id}" ${item.checked ? "checked" : ""} />
        <span>${escapeHtml(item.label)}</span>
      `;
      chip.querySelector("input").addEventListener("change", (e)=>onChange(item.key, e.target.checked));
      container.appendChild(chip);
    });
  }

  
function applyColumnVisibility(){
  const keys = ["no","name","grade","effect","buff"];
  const prevBuff = !!state._buffVisibleLast;
  const nextBuff = (state.colVisible.buff !== false);

  // If turning ON 内部種目, freeze current widths of existing visible columns.
  if (!prevBuff && nextBuff){
    state._frozenWidths = captureColumnWidths(["no","name","grade","effect"]);
  }

  $$("#runeTable [data-col]").forEach(el => {
    const colKey = el.getAttribute("data-col");
    const visible = state.colVisible[colKey] !== false;
    el.classList.toggle("hidden-col", !visible);
  });

  // Allow horizontal scroll only when 内部種目 is visible
  if (elTableScroll){
    elTableScroll.classList.toggle("allow-x", nextBuff);
    if (!nextBuff){
      elTableScroll.scrollLeft = 0;
      // Clear frozen widths when leaving horizontal-scroll mode
      clearColumnWidths(["no","name","grade","effect"]);
      state._frozenWidths = null;
    } else {
      // Re-apply frozen widths so existing columns don't change size
      applyColumnWidths(state._frozenWidths);
    }
  }

  state._buffVisibleLast = nextBuff;
}

  function setSort(key){
    if (state.sortKey === key){
      state.sortDir = (state.sortDir === "asc") ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = "asc";
    }
    render();
  }

  function resetSort(){
    state.sortKey = "RuneSortOrder";
    state.sortDir = "asc";
    render();
  }

  function resetRarity(){
    // Back to defaults (Legend/Mythic/Immortal/Transcend only)
    state.rarityVisible["ノマ"] = false;
    state.rarityVisible["レア"] = false;
    state.rarityVisible["エピ"] = false;
    state.rarityVisible["レジェ"] = true;
    state.rarityVisible["神話"] = true;
    state.rarityVisible["不滅"] = true;
    state.rarityVisible["超越"] = true;
    buildRarityUI();
    render();
  }

  function resetWords(){
    state.selectedWords.clear();
    if (elWordList){
      elWordList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    updateWordCountLabel();
    render();
  }

  function buildColUI(){
    buildChips(elColToggles, COLS.map(c=>({
      key:c.key,
      label:c.label,
      checked: !!state.colVisible[c.key],
    })), (key, checked)=>{
      state.colVisible[key] = checked;
      applyColumnVisibility();
    });
  }

  function buildRarityUI(){
    buildChips(elRarityToggles, RARITY_ORDER.map(r=>({
      key:r,
      label:r,
      checked: !!state.rarityVisible[r],
    })), (key, checked)=>{
      state.rarityVisible[key] = checked;
      render();
    });
  }

  function buildWordUI(){
    if (!elWordList) return;

    elWordList.innerHTML = "";
    const frag = document.createDocumentFragment();

    wordList.forEach((w, idx) => {
      const id = `word_${idx}`;
      const item = document.createElement('label');
      item.className = 'worditem';
      item.setAttribute('role', 'option');
      item.innerHTML = `
        <input type="checkbox" id="${id}" data-word="${escapeHtml(w)}" />
        <span>${escapeHtml(w)}</span>
      `;

      const cb = item.querySelector('input');
      cb.addEventListener('change', (e)=>{
        const word = w;
        if (e.target.checked) state.selectedWords.add(word);
        else state.selectedWords.delete(word);
        updateWordCountLabel();
        render();
      });

      frag.appendChild(item);
    });

    elWordList.appendChild(frag);
    wordTotal = wordList.length;
    updateWordCountLabel();
  }

  function sortRows(rows){
    const dir = (state.sortDir === "asc") ? 1 : -1;
    const key = state.sortKey;

    const getVal = (row)=>{
      if (key === "EffectText") return buildEffectPlain(row);
      if (key === "RuneType") return Number(row.RuneType ?? 0);
      return row[key];
    };

    rows.sort((a,b)=>{
      const va = getVal(a);
      const vb = getVal(b);

      // numeric first
      if (typeof va === "number" || typeof vb === "number"){
        const na = Number(va ?? 0);
        const nb = Number(vb ?? 0);
        if (na < nb) return -1*dir;
        if (na > nb) return  1*dir;
        // tie-breaker
        const sa = Number(a.RuneSortOrder ?? 0);
        const sb = Number(b.RuneSortOrder ?? 0);
        return (sa - sb) * dir;
      }

      const sa = safeStr(va);
      const sb = safeStr(vb);
      const cmp = sa.localeCompare(sb, "ja");
      if (cmp !== 0) return cmp*dir;

      const ta = Number(a.RuneSortOrder ?? 0);
      const tb = Number(b.RuneSortOrder ?? 0);
      return (ta - tb) * dir;
    });

    return rows;
  }

  function filterRows(rows){
    // 1) rarity filter (priority)
    let out = rows.filter(r => state.rarityVisible[safeStr(r.RuneGrade)] !== false);

    // 2) word filter on Effect plain text
    const words = Array.from(state.selectedWords);
    if (words.length > 0){
      const mode = state.wordMode;
      out = out.filter(r => {
        const t = buildEffectPlain(r);
        if (mode === "AND") return words.every(w => t.includes(w));
        return words.some(w => t.includes(w));
      });
    }
    return out;
  }

  function renderHeaderSortMarks(){
    $$("#runeTable thead th.is-sortable").forEach(th => {
      const key = th.getAttribute("data-sort");
      // clean existing
      const old = th.querySelector(".sortmark");
      if (old) old.remove();

      if (key === state.sortKey){
        const span = document.createElement("span");
        span.className = "sortmark";
        span.textContent = (state.sortDir === "asc") ? "▲" : "▼";
        th.appendChild(span);
      }
    });
  }

  function renderTable(rows){
    const frag = document.createDocumentFragment();

    rows.forEach(r => {
      const tr = document.createElement("tr");

      // Rarity row coloring (subtle)
      const grade = safeStr(r.RuneGrade);
      if (grade === "神話") tr.classList.add("rarity-mythic");
      else if (grade === "不滅") tr.classList.add("rarity-immortal");
      else if (grade === "超越") tr.classList.add("rarity-transcend");

      const tdNo = document.createElement("td");
      tdNo.className = "col-no";
      tdNo.setAttribute("data-col", "no");
      tdNo.textContent = safeStr(r.RuneSortOrder);

      const tdName = document.createElement("td");
      tdName.className = "col-name";
      tdName.setAttribute("data-col", "name");
      tdName.textContent = safeStr(r.RuneName);

      const tdGrade = document.createElement("td");
      tdGrade.className = "col-grade";
      tdGrade.setAttribute("data-col", "grade");
      tdGrade.textContent = safeStr(r.RuneGrade);

      const tdEffect = document.createElement("td");
      tdEffect.className = "col-effect";
      tdEffect.setAttribute("data-col", "effect");
      tdEffect.innerHTML = buildEffectHTML(r);

      const tdBuff = document.createElement("td");
      tdBuff.className = "col-buff";
      tdBuff.setAttribute("data-col", "buff");
      tdBuff.textContent = safeStr(r.RuneBuffType);

      tr.appendChild(tdNo);
      tr.appendChild(tdName);
      tr.appendChild(tdGrade);
      tr.appendChild(tdEffect);
      tr.appendChild(tdBuff);

      frag.appendChild(tr);
    });

    elTbody.innerHTML = "";
    elTbody.appendChild(frag);

    applyColumnVisibility();
  }

  function render(){
    updateWordCountLabel();
    const filtered = filterRows([...allRunes]);
    const sorted = sortRows(filtered);

    renderHeaderSortMarks();
    renderTable(sorted);

    const words = state.selectedWords.size ? ` / キーワード:${state.wordMode} ${state.selectedWords.size}件` : "";
    setStatus(`表示 ${sorted.length} / 全 ${allRunes.length}${words}`);
    updateWordCountLabel();
  }

  function setPanelOpen(open){
    sidePanel.classList.toggle("is-open", open);
    backdrop.hidden = !open;
    panelHandle.textContent = open ? "▶" : "◀";
    panelHandle.setAttribute("aria-label", open ? "フィルタを閉じる" : "フィルタを開く");
  }

  function setupEvents(){
    // Sort
    $$("#runeTable thead th.is-sortable").forEach(th => {
      th.addEventListener("click", ()=>setSort(th.getAttribute("data-sort")));
    });

    btnResetSort.addEventListener("click", resetSort);
    btnResetRarity.addEventListener("click", resetRarity);
    btnResetWord.addEventListener("click", resetWords);

    btnAndOr.addEventListener("click", ()=>{
      state.wordMode = (state.wordMode === "OR") ? "AND" : "OR";
      btnAndOr.textContent = state.wordMode;
      btnAndOr.setAttribute("aria-pressed", state.wordMode === "AND" ? "true" : "false");
      render();
    });

    panelHandle.addEventListener("click", ()=>setPanelOpen(!sidePanel.classList.contains("is-open")));
    panelClose.addEventListener("click", ()=>setPanelOpen(false));
    backdrop.addEventListener("click", ()=>setPanelOpen(false));

    // Esc close
    document.addEventListener("keydown", (e)=>{
      if (e.key === "Escape") setPanelOpen(false);
    });
  }

  async function loadSupabase(){
    const url = window.LD_SUPABASE_URL;
    const key = window.LD_SUPABASE_ANON_KEY;

    if (!url || !key){
      throw new Error("supabase_config.js の URL / ANON_KEY が読み込めませんでした。");
    }
    if (!window.supabase) {
      throw new Error("@supabase/supabase-js の読み込みに失敗しました。");
    }

    const client = window.supabase.createClient(url, key);

    // Load runes
    {
      const { data, error } = await client
        .from("ld_rune_list")
        .select("*")
        .order("RuneSortOrder", { ascending: true });

      if (error) throw error;
      allRunes = (data || []).map(r => {
        // normalize
        return {
          ...r,
          RuneType: Number(r.RuneType ?? 0),
          BrValue: Number(r.BrValue ?? 0),
        };
      });
    }

    // Load words
    {
      const { data, error } = await client
        .from("ld_rune_word")
        .select("WordTxt")
        .order("WordId", { ascending: true });

      if (error) throw error;
      wordList = (data || []).map(x=>x.WordTxt).filter(Boolean);
      wordTotal = wordList.length;
    }
  }

  async function init(){
    try{
      setStatus("Loading...");
      buildColUI();
      buildRarityUI();
      setupEvents();

      await loadSupabase();

      buildWordUI();
      resetSort(); // will render()
      setPanelOpen(false);
    } catch (err) {
      console.error("[ld_rune_list] init failed", err);
      setStatus("読み込みに失敗しました。SupabaseのRLS/テーブル名/設定を確認してください。");
    }
  }

  init();
})();
