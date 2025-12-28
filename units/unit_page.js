(() => {
  "use strict";

  const unitId = Number(document.body.dataset.unitId || 0);

  function getUserLevel(){
    try{
      const a = (window.loadAuth && window.loadAuth()) || {};
      return Number(a.level || 1);
    }catch(_e){
      return 1;
    }
  }

  const LV_SUGGEST = 30;
  const LV_VOTE    = 900;

  const $ = (id) => document.getElementById(id);

  function fmtInt(n){
    if(n === null || n === undefined || Number.isNaN(Number(n))) return "-";
    return Number(n).toLocaleString("ja-JP");
  }
  function fmtFloat(n, digits){
    if(n === null || n === undefined || Number.isNaN(Number(n))) return "-";
    return Number(n).toFixed(digits);
  }
  function renderMd(el, md){ el.textContent = md || ""; }

  async function fetchUnitCore(unit_id){
    return {
      unit_id,
      name_jp: `unit ${unit_id}`,
      name_en: "",
      race: "人間",
      rank: "神話",
      icon_url: `units/${unit_id}.png`,
      atk: 12345,
      aspd: 1.23,
      range_min: 0.0,
      range_max: 3.5
    };
  }

  async function fetchUnitDetails(unit_id){
    return {
      materials: [],
      awaken_text: "",
      forms: [],
      abilities: [
        { no: 1, name: "能力名1", type: "分類", effect: "効果短文", nomf: "NoMF", detail_md: "詳細Markdown" }
      ],
      level_mods: [
        { lv: 3,  text: "Lv3特性" },
        { lv: 6,  text: "Lv6特性" },
        { lv: 9,  text: "Lv9特性" },
        { lv: 12, text: "Lv12特性" },
        { lv: 15, text: "Lv15特性" }
      ],
      treasure: null,
      article: { overview: "", role: "", rating: "" }
    };
  }

  function renderTop(core, det){
    $("unitIcon").src = core.icon_url || "";
    $("unitIcon").alt = core.name_jp || "";
    $("unitNameJP").textContent = core.name_jp || "";
    $("unitNameEN").textContent = core.name_en || "";
    $("unitRace").textContent = core.race || "";
    $("unitRank").textContent = core.rank || "";

    $("statAtk").textContent = fmtInt(core.atk);
    $("statAspd").textContent = fmtFloat(core.aspd, 2);
    const rmin = (core.range_min ?? 0);
    const rmax = (core.range_max ?? 0);
    $("statRange").textContent = `${fmtFloat(rmin, 1)}〜${fmtFloat(rmax, 1)}`;

    if(det.materials && det.materials.length){
      const wrap = $("matList");
      wrap.innerHTML = "";
      det.materials.forEach(m => {
        const div = document.createElement("div");
        div.className = "mat-item";
        div.textContent = `${m.name} ×${m.count}`;
        wrap.appendChild(div);
      });
      $("matBlock").hidden = false;
    }

    if(det.awaken_text){
      renderMd($("awakeText"), det.awaken_text);
      $("awakeBlock").hidden = false;
    }

    if(det.forms && det.forms.length){
      const wrap = $("formLinks");
      wrap.innerHTML = "";
      det.forms.forEach(f => {
        const a = document.createElement("a");
        a.className = "form-link";
        a.href = f.href || "#";
        a.textContent = f.label || "形態";
        wrap.appendChild(a);
      });
      $("formBlock").hidden = false;
    }
  }

  function renderAbilities(det){
    const wrap = $("abilityTable");
    wrap.innerHTML = "";
    (det.abilities || []).forEach(row => {
      const item = document.createElement("div");
      item.className = "row-acc";
      item.innerHTML = `
        <button class="acc-head" type="button" aria-expanded="false">
          <span class="c1">${row.name || ""}</span>
          <span class="c2">${row.type || ""}</span>
          <span class="c3">${row.effect || ""}</span>
          <span class="c4">${row.nomf || ""}</span>
          <span class="chev">▾</span>
        </button>
        <div class="acc-body" hidden></div>
      `;
      const head = item.querySelector(".acc-head");
      const body = item.querySelector(".acc-body");
      head.addEventListener("click", () => {
        const open = body.hidden;
        body.hidden = !open;
        head.setAttribute("aria-expanded", open ? "true" : "false");
        if(open && body.childElementCount === 0){
          const md = document.createElement("div");
          md.className = "md";
          renderMd(md, row.detail_md || "");
          body.appendChild(md);
        }
      });
      wrap.appendChild(item);
    });
  }

  function renderLevelMods(det){
    const wrap = $("levelModTable");
    wrap.innerHTML = "";
    (det.level_mods || []).forEach(m => {
      const r = document.createElement("div");
      r.className = "trow";
      r.innerHTML = `<div class="tcell k">Lv${m.lv}</div><div class="tcell v">${(m.text || "")}</div>`;
      wrap.appendChild(r);
    });
    if(det.treasure){
      $("treasureBlock").hidden = false;
      $("treasureName").textContent = det.treasure.name || "";
      $("treasureIcon").src = det.treasure.icon_url || "";
      const tw = $("treasureTable");
      tw.innerHTML = "";
      (det.treasure.lv || []).forEach(x => {
        const r = document.createElement("div");
        r.className = "trow";
        r.innerHTML = `<div class="tcell k">Lv${x.lv}</div><div class="tcell v">${(x.text || "")}</div>`;
        tw.appendChild(r);
      });
    }
  }

  function renderArticle(det){
    renderMd($("mdOverview"), det.article?.overview || "");
    renderMd($("mdRole"), det.article?.role || "");
    renderMd($("mdRating"), det.article?.rating || "");
    const lv = getUserLevel();
    const canSuggest = lv >= LV_SUGGEST;
    const canEdit = lv >= LV_VOTE;
    $("btnSuggestOverview").hidden = !canSuggest;
    $("btnSuggestRole").hidden = !canSuggest;
    $("btnSuggestRating").hidden = !canSuggest;
    $("btnEditOverview").hidden = !canEdit;
    $("btnEditRole").hidden = !canEdit;
    $("btnEditRating").hidden = !canEdit;
  }

  function initDpsCompare(){
    const key = `ld_dpscmp_u:${unitId}`;
    const lvSelA = $("dpsALv");
    const lvSelB = $("dpsBLv");
    const treA = $("dpsATre");
    const treB = $("dpsBTre");
    function fillSelect(sel, min, max){
      sel.innerHTML = "";
      for(let i=min;i<=max;i++){
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = String(i);
        sel.appendChild(opt);
      }
    }
    fillSelect(lvSelA, 1, 15);
    fillSelect(lvSelB, 1, 15);
    fillSelect(treA, 0, 11);
    fillSelect(treB, 0, 11);
    function calcDummy(){
      const a = Number(lvSelA.value) * 100 + Number(treA.value) * 20;
      const b = Number(lvSelB.value) * 100 + Number(treB.value) * 20;
      $("dpsAOut").textContent = fmtInt(a);
      $("dpsBOut").textContent = fmtInt(b);
    }
    function load(){
      try{
        const raw = localStorage.getItem(key);
        if(!raw) return;
        const o = JSON.parse(raw);
        if(o.a){ lvSelA.value = String(o.a.lv||1); treA.value = String(o.a.tre||0); }
        if(o.b){ lvSelB.value = String(o.b.lv||1); treB.value = String(o.b.tre||0); }
      }catch(_e){}
    }
    $("dpsSaveBtn").addEventListener("click", () => {
      const obj = {
        a: { lv: Number(lvSelA.value), tre: Number(treA.value) },
        b: { lv: Number(lvSelB.value), tre: Number(treB.value) }
      };
      try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(_e){}
    });
    $("dpsResetBtn").addEventListener("click", () => {
      try{ localStorage.removeItem(key); }catch(_e){}
      lvSelA.value = "1"; treA.value = "0";
      lvSelB.value = "1"; treB.value = "0";
      calcDummy();
    });
    [lvSelA, lvSelB, treA, treB].forEach(x => x.addEventListener("change", calcDummy));
    load();
    calcDummy();
  }

  function initComments(){
    $("cPostBtn").addEventListener("click", async () => {
      const text = ($("cText").value || "").trim();
      if(!text) return;
      $("cHint").textContent = "（未接続：コメント保存のDB設計確定後に実装）";
      $("cText").value = "";
    });
  }

  async function main(){
    if(!unitId){
      $("unitNameJP").textContent = "unit_id 未設定";
      return;
    }
    const core = await fetchUnitCore(unitId);
    const det = await fetchUnitDetails(unitId);
    renderTop(core, det);
    renderAbilities(det);
    renderLevelMods(det);
    renderArticle(det);
    initDpsCompare();
    initComments();
  }

  main().catch(err => console.error("[unit_page] init failed", err));
})();
