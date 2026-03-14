(() => {
  const APP_VERSION = "v8_9_7";
  const F = 40;
  const STORAGE_KEYS = ["LD_DPS_TOOL_V8_9_7", "LD_DPS_TOOL_V8_9_6", "LD_DPS_TOOL_V8_9_5", "LD_DPS_TOOL_V8_9_4", "LD_DPS_TOOL_V8_9_3", "LD_DPS_TOOL_V8_9_2", "LD_DPS_TOOL_V8_9_1", "LD_DPS_TOOL_V8_8_19", "LD_DPS_TOOL_V8_8_18", "LD_DPS_TOOL_V8_8_13", "LD_DPS_TOOL_V8_8_8", "LD_DPS_TOOL_V8_8_7"];
  const MANUAL_SLOT_KEYS = ["LD_DPS_TOOL_SLOT1", "LD_DPS_TOOL_SLOT2", "LD_DPS_TOOL_SLOT3"];
  // ---------- PVカウント（SupabaseへINSERT） ----------
  const PV_SITE_NAME = "BaseDPS";
  const SUPABASE_URL = String(window.LD_SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = String(window.LD_SUPABASE_ANON_KEY || "").trim();

  function pvGetSessionId() {
    const k = "pv_session_id";
    try {
      let v = localStorage.getItem(k);
      if (!v) {
        v = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (String(Date.now()) + "_" + Math.random());
        localStorage.setItem(k, v);
      }
      return v;
    } catch (_) {
      return (crypto && crypto.randomUUID) ? crypto.randomUUID() : (String(Date.now()) + "_" + Math.random());
    }
  }

  function pvCountOnce() {
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
      const url = SUPABASE_URL + "/rest/v1/pageviews";
      const payload = {
        site: PV_SITE_NAME,
        path: location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
        session_id: pvGetSessionId(),
      };
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).then((res) => { if (!res.ok) return null; return null; }).catch(() => {});
    } catch (_) {}
  }

  const DIFF_DEF = {
    normal: 148,
    hard: 158,
    hell: 158,
    god: 175,
    prime: 175,
  };

  function round2(x) { return Math.round(x * 100) / 100; }

  function computePhysMul(realDef) {
    const s = Math.sign(realDef);
    const a = Math.abs(realDef);
    const raw = 1 * (1 + (s * (1 - 50 / (3 * a + 50))));
    return round2(raw);
  }

  function syncEnvDerivedUI() {
    const diff = $("envDiff") ? $("envDiff").value : "god";
    const base = DIFF_DEF[diff] ?? 175;

    const red = readInt($("defReduce") ? $("defReduce").value : "250");
    const realDef = red - base;
    const mul = computePhysMul(realDef);

    const out = $("physMulOut");
    if (out) out.value = (isFinite(mul) ? mul.toFixed(2) : "1.00");
  }

  const $ = (id) => document.getElementById(id);
  const r6 = (x) => (isFinite(x) ? Math.round(x * 1e6) / 1e6 : NaN);
  const rateToSecPerUse = (rate) => (rate > 0 ? r6(1 / rate) : null);
  const fmtRatePair = (rate) => `${r6(rate)} 回/秒 / ${rate > 0 ? r6(1 / rate) : "-"} 秒/回`;
  const RESULT_BAR_IDS = [
    ["barBasic","valBasic"], ["barA","valA"], ["barB","valB"], ["barU","valU"],
    ["barPhys","valPhys"], ["barMagic","valMagic"], ["barSingle","valSingle"], ["barMulti","valMulti"],
    ["barCorrPhys","valCorrPhys"], ["barCritMagic","valCritMagic"],
  ];

  let _rafPending = false;
  function scheduleRender() {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => {
      _rafPending = false;
      syncNoteVisibility();
      validateAndRender();
    });
  }

  const addComma = (nStr) => String(nStr).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  function fmtDec(x, maxDec = 6) {
    if (!isFinite(x)) return "";
    const s = Number(x).toFixed(maxDec);
    return s.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
  }

  function setErr(el, on) { if (el) el.classList.toggle("errField", !!on); }
  function setLblErr(el, on) { if (el) el.classList.toggle("errLbl", !!on); }
  function setLblDim(el, on) { if (el) el.classList.toggle("dimLbl", !!on); }

  function sanitizeNumDot(raw) {
    // Allow digits + decimal separators ('.' or ',').
    // Keep what the user typed while editing.
    // - If both '.' and ',' exist, treat '.' as decimal and commas as thousands separators.
    // - Otherwise allow at most one separator (either '.' or ',').
    let s = String(raw ?? "").replace(/%/g, "");
    s = s.replace(/[^0-9.,]/g, "");
    if (!s) return "";

    const hasDot = s.includes(".");
    const hasComma = s.includes(",");

    if (hasDot) {
      s = s.replace(/,/g, "");
      const parts = s.split(".");
      if (parts.length <= 1) return s;
      return parts[0] + "." + parts.slice(1).join("");
    }

    if (hasComma) {
      const parts = s.split(",");
      if (parts.length <= 1) return s;
      return parts[0] + "," + parts.slice(1).join("");
    }

    return s;
  }

  function trimDecimals(raw, maxDec) {
    const s = sanitizeNumDot(raw);
    if (!s) return "";
    if (maxDec <= 0) return (s.split(".")[0] || "");
    const [a, b = ""] = s.split(".");
    if (!b) return (a || "");
    return `${a || ""}.${b.slice(0, maxDec)}`;
  }

  function trimDecimalsLive(raw, maxDec) {
    // Like trimDecimals, but keeps a trailing decimal separator while typing (e.g. "1." or "1,")
    const s = sanitizeNumDot(raw);
    if (!s) return "";

    const endsWithDot = String(raw ?? "").endsWith(".");
    const endsWithComma = String(raw ?? "").endsWith(",");

    if (s.includes(".")) {
      const parts = s.split(".");
      const a = parts[0] || "";
      const b = parts.slice(1).join("");
      if ((endsWithDot || s.endsWith(".")) && b === "") return a + ".";
      return b ? `${a}.${b.slice(0, maxDec)}` : a;
    }
    if (s.includes(",")) {
      const parts = s.split(",");
      const a = parts[0] || "";
      const b = parts.slice(1).join("");
      if ((endsWithComma || s.endsWith(",")) && b === "") return a + ",";
      return b ? `${a},${b.slice(0, maxDec)}` : a;
    }
    return s; // integer-like
  }



  function sanitizeIntKeepComma(raw, maxDigits) {
    // Allow digits and commas while typing. Digits are limited to maxDigits (commas ignored for counting).
    let s = String(raw ?? "").replace(/%/g, "");
    s = s.replace(/[^0-9,]/g, "");
    if (!s) return "";

    let out = "";
    let used = 0;
    for (const ch of s) {
      if (ch === ",") { out += ch; continue; }
      if (used < maxDigits) { out += ch; used += 1; }
    }
    // avoid leading/trailing commas
    out = out.replace(/^,|,$/g, "");
    return out;
  }

  function trimIntDigits(raw, maxDigits) {
    let s = String(raw ?? "").replace(/,/g, "").replace(/%/g, "");
    s = s.replace(/[^\d]/g, "");
    if (!s) return "";
    s = s.slice(0, maxDigits);
    return s;
  }

  function toPctDisplay(raw, maxDec, maxIntDigits) {
    let t = trimDecimals(raw, maxDec);
    if (!t) return "";
    let [a, b = ""] = t.split(".");
    a = (a || "0").slice(0, maxIntDigits);
    a = String(parseInt(a, 10) || 0);
    if (b) {
      b = b.slice(0, maxDec);
      if (/^0+$/.test(b)) b = "";
    }
    return b ? `${a}.${b}%` : `${a}%`;
  }

  function toProbPctDisplay(raw, maxDec = 6) {
    const t = trimDecimals(raw, maxDec);
    if (!t) return "";
    const x = parseFloat(t);
    const v = isFinite(x) ? x : 0;
    return `${fmtDec(v, maxDec)}%`;
  }

  function toAspdDisplay(raw, maxDec = 6) {
    const t = trimDecimals(raw, maxDec);
    if (!t) return "";
    const x = parseFloat(t);
    const v = isFinite(x) ? x : 0;
    return fmtDec(v, maxDec);
  }

  function toAtkDisplay(raw) {
    const s = trimIntDigits(raw, 6);
    if (!s) return "";
    const n = parseInt(s, 10) || 0;
    return addComma(n);
  }

  function toIntDisplay(raw, maxDigits) {
    const s = trimIntDigits(raw, maxDigits);
    if (!s) return "";
    return String(parseInt(s, 10) || 0);
  }

  function readNumber(raw) {
    let t = String(raw ?? "").replace(/%/g, "");
    t = t.replace(/\s/g, "");
    if (!t) return 0;

    if (t.includes(".")) {
      t = t.replace(/,/g, "");
    } else if (t.includes(",")) {
      const parts = t.split(",");
      t = parts[0] + "." + parts.slice(1).join("");
    } else {
      t = t.replace(/,/g, "");
    }

    const x = parseFloat(t);
    return isFinite(x) ? x : 0;
  }

  function readInt(raw) {
    const t = String(raw ?? "").replace(/,/g, "").replace(/%/g, "").replace(/[^\d]/g, "");
    return parseInt(t || "0", 10) || 0;
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function computeAttackSpeed(baseSpeed, bowSpeed, shareSpeed, skillSpeedAdd = 0) {
    const base = Math.max(0, Number(baseSpeed) || 0);
    const bow = Math.max(0, Number(bowSpeed) || 0);
    const share = Math.max(0, Number(shareSpeed) || 0);
    const add = Math.max(0, Number(skillSpeedAdd) || 0);
    return base * (bow + add) * share;
  }

  function migrateLegacyState(state) {
    const next = Object.assign({}, state || {});
    const hasNewSpeed = Object.prototype.hasOwnProperty.call(next, "baseSpeed") || Object.prototype.hasOwnProperty.call(next, "bowSpeed") || Object.prototype.hasOwnProperty.call(next, "shareSpeed");
    if (!hasNewSpeed) {
      const oldAspd = next.aspd ?? "2.40";
      next.baseSpeed = oldAspd;
      next.bowSpeed = next.bowSpeed ?? "1";
      next.shareSpeed = next.shareSpeed ?? "1";
    }
    for (let i = 1; i <= 6; i++) {
      const key = `ext${i}ImpactF`;
      if (!Object.prototype.hasOwnProperty.call(next, key)) next[key] = "0";
    }
    return next;
  }

  // ---------- 外部支援（別ユニット由来） ----------
  function isCoverageSupportType(type){ return ["physPct","magicPct","basicPct","procMul","finalPct"].includes(type); }
  function isRateSupportType(type){ return ["manaPct","coolRemainPct","tempSpeedPct"].includes(type); }
  function supportTypeLabel(type){ return { none:"無し", physPct:"物理ダメージ増加", magicPct:"魔法ダメージ増加", basicPct:"基本攻撃ダメージ増加", procMul:"発動率倍率", finalPct:"最終ダメージ増加", tempSpeedPct:"一時速度増加", manaPct:"最大マナ割合獲得", coolRemainPct:"残りクールタイム割合減少" }[type] || type; }
  function copyBtn(text, label = "コピー") {
    const safe = encodeURIComponent(String(text ?? ""));
    return ` <button type="button" class="copyBtn" data-copy="${safe}">${label}</button>`;
  }
  function toSupportAmountDisplay(type, raw){
    if (type === "procMul") return fmtDec(readNumber(trimDecimals(raw, 6) || 0), 6);
    return toPctDisplay(raw, 6, 6);
  }
  function toSupportBaseDisplay(type, raw){
    if (isCoverageSupportType(type)) return toPctDisplay(raw, 6, 6);
    return fmtDec(readNumber(trimDecimals(raw, 6) || 0), 6);
  }
  function toImpactFDisplay(raw){
    return toIntDisplay(raw, 4);
  }
  function getSupportRows(){
    const rows=[];
    for (let i=1;i<=6;i++){
      rows.push({
        idx:i,
        enabled: $("ext"+i+"Enabled") ? $("ext"+i+"Enabled").checked : false,
        type: $("ext"+i+"Type") ? $("ext"+i+"Type").value : "none",
        amountRaw: $("ext"+i+"Amount") ? $("ext"+i+"Amount").value : "",
        baseRaw: $("ext"+i+"Base") ? $("ext"+i+"Base").value : "",
        countRaw: $("ext"+i+"Count") ? $("ext"+i+"Count").value : "1",
        impactFRaw: $("ext"+i+"ImpactF") ? $("ext"+i+"ImpactF").value : "0",
      });
    }
    return rows;
  }
  function calcExternalSupportAgg(vLike){
    const supports=vLike.supports||[];
    const agg={ physPct:0, magicPct:0, basicPct:0, finalPct:0, procCoverage:0, procMult:1, addManaPerSec:0, addCoolPerSec:0, skillSpeedAdd:0, rows:[] };
    for (const s of supports){
      if(!s.enabled||s.type==="none") continue;
      const count=Math.max(1, Math.min(36, readInt(s.countRaw||1)));
      const amountNum=readNumber(s.amountRaw||0);
      const baseNum=readNumber(s.baseRaw||0);
      if (isCoverageSupportType(s.type)) {
        const unitCov=clamp01(baseNum/100);
        const effective=clamp01(1-Math.pow(1-unitCov,count));
        const effectValue=(s.type==="procMul")? amountNum : (amountNum/100);
        agg.rows.push({ idx:s.idx, type:s.type, count, mode:"coverage", unitCov, effectiveCoverage:effective, amountNum:effectValue });
        if (s.type==="physPct") agg.physPct += effectValue*effective;
        else if (s.type==="magicPct") agg.magicPct += effectValue*effective;
        else if (s.type==="basicPct") agg.basicPct += effectValue*effective;
        else if (s.type==="finalPct") agg.finalPct += effectValue*effective;
        else if (s.type==="procMul") { agg.procCoverage=effective; agg.procMult=effectValue; }
      } else {
        const unitRate=Math.max(0, baseNum);
        const rate=unitRate*count;
        const effectValue=amountNum/100;
        const impactF=Math.max(0, readInt(s.impactFRaw || 0));
        const coverage = (s.type === "tempSpeedPct") ? clamp01((rate * impactF) / F) : 0;
        const addManaPerSec=(s.type==="manaPct") ? (rate * vLike.gaugeMax * effectValue) : 0;
        const addCoolPerSec=(s.type==="coolRemainPct") ? (rate * vLike.gaugeMax * effectValue * 0.5) : 0;
        agg.rows.push({ idx:s.idx, type:s.type, count, mode:"rate", unitRate, totalRate:rate, amountNum:effectValue, impactF, coverage, addManaPerSec, addCoolPerSec });
        agg.addManaPerSec += addManaPerSec;
        agg.addCoolPerSec += addCoolPerSec;
        if (s.type === "tempSpeedPct") agg.skillSpeedAdd += effectValue * coverage;
      }
    }
    agg.physMul=1+agg.physPct;
    agg.magicMul=1+agg.magicPct;
    agg.basicMul=1+agg.basicPct;
    agg.finalMul=1+agg.finalPct;
    return agg;
  }

  function syncSupportInputRows() {
    for (let i = 1; i <= 6; i++) {
      const type = $("ext" + i + "Type") ? $("ext" + i + "Type").value : "none";
      const row = $("ext" + i + "ImpactRow");
      if (row) row.hidden = type !== "tempSpeedPct";
    }
  }

  function syncAttackSpeedInputs() {
    const baseEl = $("baseSpeed");
    const bowEl = $("bowSpeed");
    const shareEl = $("shareSpeed");
    const aspdEl = $("aspd");
    if (!baseEl || !bowEl || !shareEl || !aspdEl) return;
    const baseSpeed = readNumber(baseEl.value);
    const bowSpeed = readNumber(bowEl.value);
    const shareSpeed = readNumber(shareEl.value);
    const ext = calcExternalSupportAgg({ gaugeMax: readInt($("gaugeMax")?.value || 0), supports: getSupportRows() });
    const finalAspd = computeAttackSpeed(baseSpeed, bowSpeed, shareSpeed, ext.skillSpeedAdd || 0);
    aspdEl.value = toAspdDisplay(String(finalAspd || 0), 6);
  }

  function syncNoteVisibility() {
    const show = !!($("showNotes") && $("showNotes").checked);
    document.querySelectorAll(".annotation").forEach(el => {
      el.classList.toggle("annotationHidden", !show);
    });
  }

  function setDisabledRegen(isDisabled) {
    const regenInput = $("manaRegenPct");
    const regenLbl = $("regenLbl");
    const group = $("regenGroup");
    regenInput.disabled = !!isDisabled;
    group.classList.toggle("disabledGroup", !!isDisabled);
    setLblDim(regenLbl, !!isDisabled);
  }

  function syncUltType() {
    const ultType = $("ultType").value;
    const gaugeLbl = $("gaugeMaxLbl");
    const gauge = $("gaugeMax");
    const hint = $("gaugeMaxHint");
    setDisabledRegen(ultType !== "mana");

    if (ultType === "cool") {
      if (gaugeLbl) gaugeLbl.textContent = "クールタイム";
      if (hint) hint.textContent = "・クールタイム：整数（最大3桁、秒）。内部では 秒×40F で扱います。初期値は40秒です。";
      if (gauge) {
        gauge.placeholder = "40";
        const n = readInt(gauge.value);
        if (!(n > 0) || n === 100) gauge.value = toIntDisplay("40", 3);
      }
    } else {
      if (gaugeLbl) gaugeLbl.textContent = "Maxマナ";
      if (hint) hint.textContent = "・Maxマナ：整数（最大3桁）。";
      if (gauge) gauge.placeholder = "100";
    }
  }

  function syncSkillBMode() {
    const bType = $("bType").value;
    const lbl = $("bThirdLbl");
    const third = $("bThird");
    const thirdWrap = third.parentElement;

    if (bType === "none") {
      lbl.textContent = "確率";
      third.disabled = true;
      thirdWrap.classList.add("disabledGroup");
      third.value = "0.0%";
      third.setAttribute("inputmode", "decimal");
    } else if (bType === "prob") {
      lbl.textContent = "確率";
      third.disabled = false;
      thirdWrap.classList.remove("disabledGroup");
      third.setAttribute("inputmode", "decimal");
      // 空入力はそのまま許可
    } else {
      lbl.textContent = "基本攻撃規定回数";
      third.disabled = false;
      thirdWrap.classList.remove("disabledGroup");
      third.setAttribute("inputmode", "numeric");
      third.value = String(readInt(third.value));
    }
  }

  function bindField(el, onInputSanitize, onCommitFormat) {
    el.addEventListener("input", () => { el.value = onInputSanitize(el.value); scheduleRender(); });
    const commit = () => { el.value = onCommitFormat(el.value); validateAndRender(); };
    el.addEventListener("blur", commit);
    el.addEventListener("change", commit);
  }

  let _calcTargetId = null;

  function getCalcFieldIds() {
    const ids = [
      "atk", "baseSpeed", "bowSpeed", "shareSpeed", "gaugeMax", "sameUnitCount",
      "manaRegenPct", "defReduce", "critChancePct", "critPhysBonusPct", "critMagicBonusPct",
      "ultMulPct", "ultF", "ultImpactF", "ultEventAmount",
      "aMulPct", "aPPct", "aF", "aImpactF",
      "bMulPct", "bThird", "bF", "bImpactF",
    ];
    for (let i = 1; i <= 6; i++) {
      ids.push(`ext${i}Amount`, `ext${i}Base`, `ext${i}Count`, `ext${i}ImpactF`);
    }
    return ids;
  }

  function getCalcFieldLabel(input) {
    if (!input) return "値";
    if (input.dataset.calcLabel) return input.dataset.calcLabel;
    const row = input.closest(".row");
    const lbl = row && row.querySelector(".lbl");
    const text = String(lbl ? lbl.textContent : "").replace(/\s+/g, " ").trim();
    return text || input.id || "値";
  }

  function formatCalcValueForInput(input, rawValue) {
    if (!input) return String(rawValue ?? "");
    const id = input.id || "";
    const value = String(rawValue ?? "");

    if (/^ext\d+Amount$/.test(id)) {
      const idx = id.match(/^ext(\d+)Amount$/)?.[1];
      const type = idx && $("ext" + idx + "Type") ? $("ext" + idx + "Type").value : "none";
      return toSupportAmountDisplay(type, value);
    }
    if (/^ext\d+Base$/.test(id)) {
      const idx = id.match(/^ext(\d+)Base$/)?.[1];
      const type = idx && $("ext" + idx + "Type") ? $("ext" + idx + "Type").value : "none";
      return toSupportBaseDisplay(type, value);
    }
    if (/^ext\d+Count$/.test(id)) return toIntDisplay(value, 2);

    if (id === "atk") return toAtkDisplay(value);
    if (id === "baseSpeed" || id === "bowSpeed" || id === "shareSpeed") return toAspdDisplay(value, 6);
    if (id === "aspd") return toAspdDisplay(value, 6);
    if (id === "gaugeMax") return toIntDisplay(value, 3);
    if (id === "sameUnitCount") return toIntDisplay(value, 2);
    if (id === "manaRegenPct") return toPctDisplay(value, 6, 4);
    if (id === "defReduce") return toIntDisplay(value, 3);
    if (id === "critChancePct") return toPctDisplay(value, 6, 4);
    if (id === "critPhysBonusPct") return toPctDisplay(value, 6, 4);
    if (id === "critMagicBonusPct") return toPctDisplay(value, 6, 4);

    if (id === "ultMulPct") return toPctDisplay(value, 6, 6);
    if (id === "ultF") return toIntDisplay(value, 4);
    if (id === "ultImpactF") return toIntDisplay(value, 4);
    if (id === "ultEventAmount") return toPctDisplay(value, 6, 6);

    if (id === "aMulPct") return toPctDisplay(value, 6, 6);
    if (id === "aPPct") return toProbPctDisplay(value, 6);
    if (id === "aF") return toIntDisplay(value, 4);
    if (id === "aImpactF") return toIntDisplay(value, 4);

    if (id === "bMulPct") return toPctDisplay(value, 6, 6);
    if (/^ext\d+ImpactF$/.test(id)) return toImpactFDisplay(value);
    if (id === "bF") return toIntDisplay(value, 4);
    if (id === "bImpactF") return toIntDisplay(value, 4);
    if (id === "bThird") {
      const bType = $("bType") ? $("bType").value : "none";
      return bType === "count" ? String(readInt(value)) : toProbPctDisplay(value, 6);
    }

    return fmtDec(readNumber(value), 6);
  }

  function prepareCalculatorFields() {
    getCalcFieldIds().forEach((id) => {
      const el = $(id);
      if (!el || el.type !== "text") return;
      el.classList.add("calcField");
      el.dataset.calcTarget = id;
      if (!el.dataset.calcLabel) el.dataset.calcLabel = getCalcFieldLabel(el);
      el.setAttribute("readonly", "readonly");
      el.setAttribute("inputmode", "none");
      el.setAttribute("autocomplete", "off");
      el.setAttribute("spellcheck", "false");
    });
  }

  function evaluateCalcExpression(expr) {
    const raw = String(expr || "").replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/");
    if (!raw) return null;
    if (!/^[0-9+\-*/().]+$/.test(raw)) return null;
    try {
      const val = Function(`"use strict"; return (${raw});`)();
      return (typeof val === "number" && isFinite(val)) ? val : null;
    } catch (_) {
      return null;
    }
  }

  function openCalc(targetId) {
    const input = $(targetId);
    const overlay = $("calcOverlay");
    const display = $("calcDisplay");
    if (!input || !overlay || !display) return;
    _calcTargetId = targetId;
    $("calcTargetLabel").textContent = input.dataset.calcLabel || "倍率";
    display.value = String(input.value || "").replace(/%/g, "");
    overlay.hidden = false;
    document.body.classList.add("calcOpen");
    setTimeout(() => { try { display.blur(); } catch (_) {} }, 0);
  }

  function closeCalc() {
    const overlay = $("calcOverlay");
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("calcOpen");
    _calcTargetId = null;
  }

  function applyCalcValue() {
    if (!_calcTargetId) return;
    const input = $(_calcTargetId);
    const display = $("calcDisplay");
    if (!input || !display) return;
    const val = evaluateCalcExpression(display.value);
    if (val === null) {
      display.classList.add("errField");
      return;
    }
    display.classList.remove("errField");
    input.value = formatCalcValueForInput(input, String(val));
    closeCalc();
    validateAndRender();
  }

  function setupCalculator() {
    prepareCalculatorFields();
    document.querySelectorAll(".calcField").forEach((el) => {
      el.addEventListener("click", () => openCalc(el.dataset.calcTarget || el.id));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCalc(el.dataset.calcTarget || el.id);
        }
      });
    });
    if ($("calcDisplay")) { $("calcDisplay").setAttribute("readonly", "readonly"); $("calcDisplay").setAttribute("inputmode", "none"); }
    $("calcBackdrop")?.addEventListener("click", closeCalc);
    $("calcCloseBtn")?.addEventListener("click", closeCalc);
    $("calcDisplay")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); applyCalcValue(); }
      if (e.key === "Escape") { e.preventDefault(); closeCalc(); }
    });
    $("calcKeys")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".calcKey");
      if (!btn) return;
      btn.classList.remove("flash");
      void btn.offsetWidth;
      btn.classList.add("flash");
      const display = $("calcDisplay");
      if (!display) return;
      const action = btn.dataset.calcAction || "";
      const value = btn.dataset.calcValue || "";
      display.classList.remove("errField");
      if (action === "clear") { display.value = ""; return; }
      if (action === "back") { display.value = display.value.slice(0, -1); return; }
      if (action === "apply") { applyCalcValue(); return; }
      if (value) {
        const start = display.selectionStart ?? display.value.length;
        const end = display.selectionEnd ?? display.value.length;
        display.value = display.value.slice(0, start) + value + display.value.slice(end);
        const pos = start + value.length;
        requestAnimationFrame(() => { try { display.setSelectionRange(pos, pos); display.focus(); } catch (_) {} });
      }
    });
  }


  let _openSheetKey = null;

  function setupBottomSheets() {
    const map = { env: "envCard", basic: "basicCard", a: "aCard", b: "bCard", ult: "ultCard", ext: "extCard" };
    Object.entries(map).forEach(([key, id]) => {
      const card = $(id);
      if (!card) return;
      card.dataset.sheet = key;
      card.classList.add("inputSheet");
      const head = card.querySelector('.headRow');
      if (head && !head.querySelector('[data-close-sheet]')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sheetClose';
        btn.setAttribute('data-close-sheet', '');
        btn.textContent = '×';
        head.appendChild(btn);
      }
      const body = card.querySelector('.cardBody');
      if (body) body.style.display = 'block';
    });
    document.querySelectorAll('[data-open-sheet]').forEach((btn) => {
      btn.addEventListener('click', () => openSheet(btn.dataset.openSheet || ''));
    });
    document.querySelectorAll('[data-close-sheet]').forEach((btn) => {
      btn.addEventListener('click', closeSheet);
    });
    $("sheetBackdrop")?.addEventListener("click", closeSheet);
  }

  function openSheet(key) {
    if (!key) return;
    _openSheetKey = key;
    document.body.classList.add('bodySheetOpen');
    if ($("sheetOverlay")) $("sheetOverlay").hidden = false;
    document.querySelectorAll('.inputSheet[data-sheet]').forEach((sheet) => {
      sheet.classList.toggle('openSheet', sheet.dataset.sheet === key);
    });
    updateOpenSheetButtons();
  }

  function closeSheet() {
    _openSheetKey = null;
    document.body.classList.remove('bodySheetOpen');
    if ($("sheetOverlay")) $("sheetOverlay").hidden = true;
    document.querySelectorAll('.inputSheet[data-sheet]').forEach((sheet) => sheet.classList.remove('openSheet'));
    updateOpenSheetButtons();
  }

  function updateOpenSheetButtons() {
    document.querySelectorAll('.bottomMenuBtn[data-open-sheet], .summaryCard[data-open-sheet]').forEach((btn) => {
      btn.classList.toggle('active', !!_openSheetKey && btn.dataset.openSheet === _openSheetKey);
    });
  }

  function saveSlot(idx) {
    try {
      const key = MANUAL_SLOT_KEYS[idx - 1];
      if (!key) return false;
      localStorage.setItem(key, JSON.stringify(readFormState()));
      alert(`セーブ${idx}に保存しました`);
      return true;
    } catch (_) {
      alert(`セーブ${idx}に保存できませんでした`);
      return false;
    }
  }

  function loadSlot(idx) {
    try {
      const key = MANUAL_SLOT_KEYS[idx - 1];
      if (!key) return false;
      const raw = localStorage.getItem(key);
      if (!raw) { alert(`セーブ${idx}は空です`); return false; }
      applyFormState(migrateLegacyState(JSON.parse(raw)));
      normalizeAll();
      syncUiState();
      validateAndRender();
      alert(`ロード${idx}を読み込みました`);
      return true;
    } catch (_) {
      alert(`ロード${idx}の読み込みに失敗しました`);
      return false;
    }
  }

  function updateSummaryCards() {
    const gaugeLabel = ($("ultType")?.value === "cool") ? "CT" : "マナ";
    const envDiffText = $("envDiff")?.selectedOptions?.[0]?.textContent || "-";
    const extUsed = Array.from({length:6}, (_,i)=> i+1).filter((i)=> $("ext"+i+"Enabled")?.checked).length;
    const ultEventText = $("ultEventType")?.selectedOptions?.[0]?.textContent || "無し";
    if ($("summaryEnv")) $("summaryEnv").textContent = `難易度:${envDiffText} / 防御減少:${$("defReduce")?.value || "-"} / Rege:${$("manaRegenPct")?.value || "-"}`;
    if ($("summaryBasic")) $("summaryBasic").textContent = `攻撃力:${$("atk")?.value || "-"} / 基礎:${$("baseSpeed")?.value || "-"} / 弓:${$("bowSpeed")?.value || "-"} / 共有:${$("shareSpeed")?.value || "-"} / 攻速:${$("aspd")?.value || "-"}`;
    if ($("summaryA")) $("summaryA").textContent = `倍率:${$("aMulPct")?.value || "-"} / 確率:${$("aPPct")?.value || "-"} / F:${$("aF")?.value || "-"} / 影響F:${$("aImpactF")?.value || "0"}` + ($("aUseGainMana5")?.checked ? " / 猫ON" : "");
    const bTypeText = $("bType")?.selectedOptions?.[0]?.textContent || "-";
    const bThirdLabel = ($("bType")?.value === "count") ? "規定" : "確率";
    if ($("summaryB")) $("summaryB").textContent = `タイプ:${bTypeText} / 倍率:${$("bMulPct")?.value || "-"} / ${bThirdLabel}:${$("bThird")?.value || "-"} / F:${$("bF")?.value || "-"} / 影響F:${$("bImpactF")?.value || "0"}`;
    if ($("summaryUlt")) $("summaryUlt").textContent = `タイプ:${$("ultType")?.selectedOptions?.[0]?.textContent || "-"} / 倍率:${$("ultMulPct")?.value || "-"} / ${gaugeLabel}:${$("gaugeMax")?.value || "-"} / F:${$("ultF")?.value || "-"} / 影響F:${$("ultImpactF")?.value || "0"} / イベント:${ultEventText}`;
    if ($("summaryExt")) $("summaryExt").textContent = extUsed > 0 ? `${extUsed}枠使用中` : "未使用";
  }

  function initBindings() {
    bindField($("atk"), (v)=>sanitizeIntKeepComma(v,6), (v)=>toAtkDisplay(v));
    bindField($("baseSpeed"), (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6));
    bindField($("bowSpeed"), (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6));
    bindField($("shareSpeed"), (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6));
    bindField($("gaugeMax"), (v)=>sanitizeIntKeepComma(v,3), (v)=>toIntDisplay(v,3));
    bindField($("sameUnitCount"), (v)=>sanitizeIntKeepComma(v,2), (v)=>toIntDisplay(v,2));

    bindField($("manaRegenPct"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,4));
    bindField($("defReduce"), (v)=>sanitizeIntKeepComma(v,3), (v)=>toIntDisplay(v,3));
    bindField($("critChancePct"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,4));
    bindField($("critPhysBonusPct"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,4));
    bindField($("critMagicBonusPct"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,4));

    bindField($("ultMulPct"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,6));
    bindField($("ultF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
    bindField($("ultImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
    bindField($("ultEventAmount"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,6));

    bindField($("aMulPct"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,6));
    bindField($("aPPct"), (v)=>trimDecimalsLive(v,6), (v)=>toProbPctDisplay(v,6));
    bindField($("aF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
    bindField($("aImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

    bindField($("bMulPct"), (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,6));
    bindField($("bF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
    bindField($("bImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

    // 外部支援（6枠）
    for (let i = 1; i <= 6; i++) {
      bindField($("ext" + i + "Amount"), (v)=>trimDecimalsLive(v,6), (v)=>toSupportAmountDisplay($("ext" + i + "Type").value, v));
      bindField($("ext" + i + "Base"), (v)=>trimDecimalsLive(v,6), (v)=>toSupportBaseDisplay($("ext" + i + "Type").value, v));
      bindField($("ext" + i + "Count"), (v)=>sanitizeIntKeepComma(v,2), (v)=>toIntDisplay(v,2));
      bindField($("ext" + i + "ImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toImpactFDisplay(v));
      $("ext" + i + "Enabled").addEventListener("change", validateAndRender);
      $("ext" + i + "Type").addEventListener("change", () => {
        $("ext" + i + "Amount").value = toSupportAmountDisplay($("ext" + i + "Type").value, $("ext" + i + "Amount").value);
        $("ext" + i + "Base").value = toSupportBaseDisplay($("ext" + i + "Type").value, $("ext" + i + "Base").value);
        syncSupportInputRows();
        validateAndRender();
      });
    }

    $("bThird").addEventListener("input", () => {
      const bType = $("bType").value;
      if (bType === "prob") $("bThird").value = trimDecimalsLive($("bThird").value, 6);
      else if (bType === "count") $("bThird").value = sanitizeIntKeepComma($("bThird").value, 2);
      else $("bThird").value = "0.0%";
    });
    const commitBThird = () => {
      const bType = $("bType").value;
      if (bType === "prob") $("bThird").value = toProbPctDisplay($("bThird").value, 6);
      else if (bType === "count") $("bThird").value = String(readInt($("bThird").value));
      else $("bThird").value = "0.0%";
      validateAndRender();
    };
    $("bThird").addEventListener("blur", commitBThird);
    $("bThird").addEventListener("change", commitBThird);

    $("ultType").addEventListener("change", () => { syncUltType(); validateAndRender(); });
    $("envDiff").addEventListener("change", () => { syncEnvDerivedUI(); validateAndRender(); });
    $("defReduce").addEventListener("input", () => { syncEnvDerivedUI(); validateAndRender(); });
    $("ultReset").addEventListener("change", validateAndRender);
    $("ultStopsGauge").addEventListener("change", validateAndRender);
    $("aUseGainMana5").addEventListener("change", validateAndRender);
    $("critABShortenUlt2s").addEventListener("change", validateAndRender);
    $("ultEventType").addEventListener("change", validateAndRender);
    $("bType").addEventListener("change", () => { syncSkillBMode(); validateAndRender(); });

    const onCopyBtnClick = async (e) => {
      const btn = e.target.closest(".copyBtn[data-copy]");
      if (!btn) return;
      const text = decodeURIComponent(btn.dataset.copy || "");
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        const prev = btn.textContent;
        btn.textContent = "コピー済み";
        btn.classList.add("done");
        setTimeout(() => { btn.textContent = prev === "コピー済み" ? "コピー" : prev; btn.classList.remove("done"); }, 1200);
      } catch (_) {
        alert("コピーに失敗しました");
      }
    };
    $("detailOut").addEventListener("click", onCopyBtnClick);
    if ($("effectBox")) $("effectBox").addEventListener("click", onCopyBtnClick);

    $("slotSave1")?.addEventListener("click", () => saveSlot(1));
    $("slotLoad1")?.addEventListener("click", () => loadSlot(1));
    $("slotSave2")?.addEventListener("click", () => saveSlot(2));
    $("slotLoad2")?.addEventListener("click", () => loadSlot(2));
    $("slotSave3")?.addEventListener("click", () => saveSlot(3));
    $("slotLoad3")?.addEventListener("click", () => loadSlot(3));
    $("resetBtn")?.addEventListener("click", resetAll);
    $("showNotes").addEventListener("change", () => { syncNoteVisibility(); updateSummaryCards(); save(true); });
  }

  // ---------- 物理/魔法・単体/複数 トグル（seg） ----------
  function applySegActive(segEl, value) {
    const btns = Array.from(segEl.querySelectorAll("button[data-val]"));
    btns.forEach(b => b.classList.toggle("active", b.dataset.val === value));
  }

  function setupSegments() {
    document.querySelectorAll(".seg[data-for]").forEach(seg => {
      const key = seg.dataset.for;
      const hidden = $(key);
      if (!hidden) return;

      // 初期反映
      applySegActive(seg, hidden.value);

      seg.querySelectorAll("button[data-val]").forEach(btn => {
        btn.addEventListener("click", (e) => { e.stopPropagation();
          hidden.value = btn.dataset.val;
          applySegActive(seg, hidden.value);
          validateAndRender();
        });
      });
    });
  }

  function syncSegmentsFromHidden() {
    document.querySelectorAll(".seg[data-for]").forEach(seg => {
      const key = seg.dataset.for;
      const hidden = $(key);
      if (!hidden) return;
      applySegActive(seg, hidden.value);
    });
  }

  // ---------- アコーディオン（入力カード） ----------
  function setupAccordions() {
    document.querySelectorAll(".accHeader[data-acc]").forEach(h => {
      const key = h.dataset.acc;
      const card = h.closest(".accordionCard");
      const body = document.getElementById(`accBody_${key}`);
      if (!card || !body) return;

      if (card.classList.contains("inputSheet")) {
        body.style.display = "block";
        return;
      }

      body.style.display = card.classList.contains("open") ? "block" : "none";

      h.addEventListener("click", (e) => {
        if (e.target && e.target.closest && e.target.closest(".seg")) return;

        card.classList.toggle("open");
        body.style.display = card.classList.contains("open") ? "block" : "none";
      });
    });
  }


  function normalizeAll() {
    $("atk").value = toAtkDisplay($("atk").value);
    $("baseSpeed").value = toAspdDisplay($("baseSpeed").value, 6);
    $("bowSpeed").value = toAspdDisplay($("bowSpeed").value, 6);
    $("shareSpeed").value = toAspdDisplay($("shareSpeed").value, 6);
    $("gaugeMax").value = toIntDisplay($("gaugeMax").value, 3);
    $("sameUnitCount").value = toIntDisplay($("sameUnitCount").value, 2);
    $("manaRegenPct").value = toPctDisplay($("manaRegenPct").value, 6, 4);
    $("defReduce").value = toIntDisplay($("defReduce").value, 3);
    $("critChancePct").value = toPctDisplay($("critChancePct").value, 6, 4);
    $("critPhysBonusPct").value = toPctDisplay($("critPhysBonusPct").value, 6, 4);
    $("critMagicBonusPct").value = toPctDisplay($("critMagicBonusPct").value, 6, 4);
    syncEnvDerivedUI();

    $("ultMulPct").value = toPctDisplay($("ultMulPct").value, 6, 6);
    $("ultF").value = toIntDisplay($("ultF").value, 4);
    $("ultImpactF").value = toIntDisplay($("ultImpactF").value, 4);
    $("ultEventAmount").value = toPctDisplay($("ultEventAmount").value, 6, 6);

    $("aMulPct").value = toPctDisplay($("aMulPct").value, 6, 6);
    $("aPPct").value = toProbPctDisplay($("aPPct").value, 6);
    $("aF").value = toIntDisplay($("aF").value, 4);
    $("aImpactF").value = toIntDisplay($("aImpactF").value, 4);

    $("bMulPct").value = toPctDisplay($("bMulPct").value, 6, 6);
    $("bF").value = toIntDisplay($("bF").value, 4);
    $("bImpactF").value = toIntDisplay($("bImpactF").value, 4);

    syncSkillBMode();
    syncSegmentsFromHidden();
    syncEnvDerivedUI();
    if ($("bType").value === "prob") $("bThird").value = toProbPctDisplay($("bThird").value, 6);
    if ($("bType").value === "count") $("bThird").value = String(readInt($("bThird").value));

    for (let i = 1; i <= 6; i++) {
      const type = $("ext" + i + "Type").value;
      $("ext" + i + "Amount").value = toSupportAmountDisplay(type, $("ext" + i + "Amount").value);
      $("ext" + i + "Base").value = toSupportBaseDisplay(type, $("ext" + i + "Base").value);
      $("ext" + i + "Count").value = toIntDisplay($("ext" + i + "Count").value, 2);
      $("ext" + i + "ImpactF").value = toImpactFDisplay($("ext" + i + "ImpactF").value);
    }
    syncSupportInputRows();
    syncAttackSpeedInputs();
  }

  function getValInternal() {
    const atk = readInt($("atk").value);
    const baseSpeed = readNumber($("baseSpeed").value);
    const bowSpeed = readNumber($("bowSpeed").value);
    const shareSpeed = readNumber($("shareSpeed").value);
    const gaugeMax = readInt($("gaugeMax").value);
    const sameUnitCount = readInt($("sameUnitCount").value) || 1;

    const regenPct = readNumber($("manaRegenPct").value);
    const manaPerSec = regenPct / 100;

    const envDiff = $("envDiff").value;
    const baseDef = DIFF_DEF[envDiff] ?? 148;
    const defReduce = readInt($("defReduce").value);
    const realDef = defReduce - baseDef;
    const physMul = computePhysMul(realDef);

    const critChancePct = readNumber($("critChancePct").value);
    const critPhysBonusPct = readNumber($("critPhysBonusPct").value);
    const critMagicBonusPct = readNumber($("critMagicBonusPct").value);
    const critChance = critChancePct / 100;
    const critPhysBonus = critPhysBonusPct / 100;
    const critMagicBonus = critMagicBonusPct / 100;
    const critPhysMul = 1 + critChance * critPhysBonus;
    const critMagicMul = 1 + critChance * critMagicBonus;

    const ultType = $("ultType").value;
    const ultReset = $("ultReset").value;
    const ultMul = readNumber($("ultMulPct").value) / 100;
    const ultF = readInt($("ultF").value);
    const ultImpactF = readInt($("ultImpactF").value);
    const ultEventType = $("ultEventType").value;
    const ultEventAmount = readNumber($("ultEventAmount").value) / 100;
    const ultStopsGauge = $("ultStopsGauge").checked;
    const critABShortenUlt2s = $("critABShortenUlt2s").checked;

    const aMul = readNumber($("aMulPct").value) / 100;
    const aP = readNumber($("aPPct").value) / 100;
    const aF = readInt($("aF").value);
    const aImpactF = readInt($("aImpactF").value);
    const aUseGainMana5 = $("aUseGainMana5").checked;

    const bType = $("bType").value;
    const bMul = readNumber($("bMulPct").value) / 100;
    const bF = readInt($("bF").value);
    const bImpactF = readInt($("bImpactF").value);

    let bP = 0, bN = 0;
    if (bType === "prob") bP = readNumber($("bThird").value) / 100;
    if (bType === "count") bN = readInt($("bThird").value);

    const basicAttr = $("basicAttr").value;
    const basicTarget = $("basicTarget").value;
    const aAttr = $("aAttr").value;
    const aTarget = $("aTarget").value;
    const bAttr = $("bAttr").value;
    const bTarget = $("bTarget").value;
    const uAttr = $("ultAttr").value;
    const uTarget = $("ultTarget").value;

    const supports = getSupportRows();
    const extPreview = calcExternalSupportAgg({ gaugeMax, supports });
    const aspd = computeAttackSpeed(baseSpeed, bowSpeed, shareSpeed, extPreview.skillSpeedAdd || 0);

    const base = { atk, baseSpeed, bowSpeed, shareSpeed, aspd, gaugeMax, sameUnitCount, manaPerSec, envDiff, baseDef, defReduce, realDef, physMul,
      critChancePct, critPhysBonusPct, critMagicBonusPct, critChance, critPhysBonus, critMagicBonus, critPhysMul, critMagicMul,
      ultType, ultReset, ultMul, ultF, ultImpactF, ultEventType, ultEventAmount, ultStopsGauge, critABShortenUlt2s,
      aMul, aP, aF, aImpactF, aUseGainMana5, bType, bMul, bF, bImpactF, bP, bN,
      basicAttr, basicTarget, aAttr, aTarget, bAttr, bTarget, uAttr, uTarget, supports };
    base.ext = calcExternalSupportAgg(base);
    return base;
  }

  function clearErrAll() {
    const ids = ["atk","baseSpeed","bowSpeed","shareSpeed","aspd","gaugeMax","sameUnitCount","manaRegenPct","defReduce","critChancePct","critPhysBonusPct","critMagicBonusPct","ultMulPct","ultF","ultImpactF","ultEventAmount","aMulPct","aPPct","aF","aImpactF","bMulPct","bThird","bF","bImpactF","ext1Amount","ext1Base","ext1Count","ext1ImpactF","ext2Amount","ext2Base","ext2Count","ext2ImpactF","ext3Amount","ext3Base","ext3Count","ext3ImpactF","ext4Amount","ext4Base","ext4Count","ext4ImpactF","ext5Amount","ext5Base","ext5Count","ext5ImpactF","ext6Amount","ext6Base","ext6Count","ext6ImpactF"];
    ids.forEach(id => setErr($(id), false));
    setLblErr($("regenLbl"), false);
  }

  function validateInputs() {
    clearErrAll();
    const errors = [];
    let procMulEnabledCount = 0;

    const atk = readInt($("atk").value);
    if (atk <= 0) { setErr($("atk"), true); errors.push("攻撃力は1以上"); }

    const baseSpeed = readNumber($("baseSpeed").value);
    const bowSpeed = readNumber($("bowSpeed").value);
    const shareSpeed = readNumber($("shareSpeed").value);
    if (!(baseSpeed > 0)) { setErr($("baseSpeed"), true); errors.push("基礎速度は0より大きくしてください"); }
    if (!(bowSpeed > 0)) { setErr($("bowSpeed"), true); errors.push("弓の速度は0より大きくしてください"); }
    if (!(shareSpeed > 0)) { setErr($("shareSpeed"), true); errors.push("共有速度は0より大きくしてください"); }
    const aspd = readNumber($("aspd").value);
    if (!(aspd > 0 && aspd <= 8)) { setErr($("aspd"), true); errors.push("現在の攻速は0より大きく8.00以下"); }

    const gaugeMax = readInt($("gaugeMax").value);
    if ($("ultType").value !== "none" && gaugeMax <= 0) { setErr($("gaugeMax"), true); errors.push($("ultType").value === "cool" ? "クールタイム秒数は1以上" : "Maxマナは1以上"); }
    const sameUnitCount = readInt($("sameUnitCount").value);
    if (!(sameUnitCount >= 1 && sameUnitCount <= 36)) { setErr($("sameUnitCount"), true); errors.push("同ユニット数は1〜36"); }

    const defReduce = readInt($("defReduce").value);
    if (defReduce < 0 || defReduce > 999) { setErr($("defReduce"), true); errors.push("防御力減少値は0〜999"); }

    const critChancePct = readNumber($("critChancePct").value);
    if (critChancePct < 0 || critChancePct > 100) { setErr($("critChancePct"), true); errors.push("クリ率は0〜100.0%"); }

    const critPhysBonusPct = readNumber($("critPhysBonusPct").value);
    if (critPhysBonusPct < 0 || critPhysBonusPct > 9999.9) { setErr($("critPhysBonusPct"), true); errors.push("物理クリ補正は0〜9999.9%"); }

    const critMagicBonusPct = readNumber($("critMagicBonusPct").value);
    if (critMagicBonusPct < 0 || critMagicBonusPct > 9999.9) { setErr($("critMagicBonusPct"), true); errors.push("魔法クリ補正は0〜9999.9%"); }

    const ultType = $("ultType").value;
    if (ultType !== "none") {
      const ultF = readInt($("ultF").value);
      const ultImpactF = readInt($("ultImpactF").value);
      if (ultF <= 0) { setErr($("ultF"), true); errors.push("究極のＦ数は1以上"); }
      if (ultImpactF < 0 || ultImpactF > 9999) { setErr($("ultImpactF"), true); errors.push("究極の影響Fは0〜9999"); }
      if ($("ultEventType").value !== "none") {
        const ultEventAmount = readNumber($("ultEventAmount").value);
        if (!(ultEventAmount >= 0 && ultEventAmount <= 9999)) { setErr($("ultEventAmount"), true); errors.push("究極の影響イベント効果量は0〜9999%"); }
      }
    }

    const aPpct = readNumber($("aPPct").value);
    if (aPpct < 0 || aPpct > 90) { setErr($("aPPct"), true); errors.push("スキルA確率は0〜90.0%"); }
    const aImpactF = readInt($("aImpactF").value);
    if (aImpactF < 0 || aImpactF > 9999) { setErr($("aImpactF"), true); errors.push("スキルA影響Fは0〜9999"); }

    const bType = $("bType").value;
    const bImpactF = readInt($("bImpactF").value);
    if (bImpactF < 0 || bImpactF > 9999) { setErr($("bImpactF"), true); errors.push("スキルB影響Fは0〜9999"); }
    if (bType === "prob") {
      const bPpct = readNumber($("bThird").value);
      if (bPpct < 0 || bPpct > 90) { setErr($("bThird"), true); errors.push("スキルB確率は0〜90.0%"); }

      if (aPpct + bPpct > 100) {
        errors.push("スキルA確率 + スキルB確率 が100%を超えています");
        if (aPpct > bPpct) setErr($("aPPct"), true);
        else if (bPpct > aPpct) setErr($("bThird"), true);
        else { setErr($("aPPct"), true); setErr($("bThird"), true); }
      }
    }
    if (bType === "count") {
      const n = readInt($("bThird").value);
      if (!(n >= 1 && n <= 99)) { setErr($("bThird"), true); errors.push("スキルB規定回数は1〜99"); }
      const bF = readInt($("bF").value);
      if (bF <= 0) { setErr($("bF"), true); errors.push("スキルBのＦ数は1以上"); }
    }

    if (ultType === "mana") {
      const regen = readNumber($("manaRegenPct").value);
      if (regen < 0) { setErr($("manaRegenPct"), true); setLblErr($("regenLbl"), true); errors.push("Regeマナ毎秒は0%以上"); }
    }

    for (let i = 1; i <= 6; i++) {
      const enabled = $("ext" + i + "Enabled") ? $("ext" + i + "Enabled").checked : false;
      const type = $("ext" + i + "Type") ? $("ext" + i + "Type").value : "none";
      if (!enabled || type === "none") continue;
      if (type === "procMul") procMulEnabledCount += 1;

      const amount = readNumber($("ext" + i + "Amount").value);
      const base = readNumber($("ext" + i + "Base").value);
      const count = readInt($("ext" + i + "Count").value);
      const impactF = readInt($("ext" + i + "ImpactF").value);
      if (!(count >= 1 && count <= 36)) { setErr($("ext" + i + "Count"), true); errors.push("外部支援の体数は1〜36"); }
      if (isCoverageSupportType(type)) {
        if (type === "procMul") {
          if (!(amount > 0)) { setErr($("ext" + i + "Amount"), true); errors.push("発動率倍率は0より大きくしてください"); }
        } else if (amount < 0) { setErr($("ext" + i + "Amount"), true); errors.push("外部支援の効果量は0%以上"); }
        if (base < 0 || base > 100) { setErr($("ext" + i + "Base"), true); errors.push("被覆率は0〜100%"); }
      } else {
        if (amount < 0) { setErr($("ext" + i + "Amount"), true); errors.push("発動レート型の効果量は0%以上"); }
        if (base < 0) { setErr($("ext" + i + "Base"), true); errors.push("単体発動回数/秒は0以上"); }
        if (type === "tempSpeedPct" && (impactF < 0 || impactF > 9999)) { setErr($("ext" + i + "ImpactF"), true); errors.push("一時速度増加の影響Fは0〜9999"); }
      }
    }

    if (procMulEnabledCount > 1) {
      errors.push("外部支援の発動率倍率は同時に1種類のみ設定してください");
    }

    return errors;
  }

  function calcNonUlt(v) {
    const T0 = F / v.aspd;
    const ext = v.ext || calcExternalSupportAgg(v);
    let pA = clamp01(v.aP);
    let pBsrc = (v.bType === "prob") ? clamp01(v.bP) : 0;
    if (ext.procCoverage > 0 && ext.procMult > 0) {
      pA = (1 - ext.procCoverage) * pA + ext.procCoverage * Math.min(1, pA * ext.procMult);
      pBsrc = (1 - ext.procCoverage) * pBsrc + ext.procCoverage * Math.min(1, pBsrc * ext.procMult);
    }
    const mA = v.aMul;
    const fA = v.aF;

    if (v.bType === "count") {
      const N = v.bN;
      const mB = v.bMul;
      const fB = v.bF;

      if (!(N > 0)) return { err: "スキルB（基本攻撃規定回数）の規定回数が0以下です" };
      if (pA >= 1) return { err: "スキルA確率が1以上です（基本攻撃規定回数型は未定義）" };

      const EA = N * pA / (1 - pA);
      const expBasicCount = N;
      const expACount = EA;
      const expBCount = 1;
      const expFrames = T0 * expBasicCount + fA * expACount + fB * expBCount;
      const expDamage = v.atk * (expBasicCount * 1 + mA * expACount + mB * expBCount);
      const nonUltDPS = expDamage / (expFrames / F);
      const basicPerFrame = expBasicCount / expFrames;
      const aPerFrame = expACount / expFrames;
      const bPerFrame = expBCount / expFrames;
      const actPerFrame = (expBasicCount + expACount + expBCount) / expFrames;

      return {
        mode: "countBasic",
        T0, pA, EA,
        expBasicCount, expACount, expBCount,
        expFrames, expDamage, nonUltDPS, basicPerFrame, aPerFrame, bPerFrame, actPerFrame,
      };
    }




    const pB = (v.bType === "prob") ? pBsrc : 0;
    const mB = (v.bType === "prob") ? v.bMul : 0;
    const fB = (v.bType === "prob") ? v.bF : 0;

    const p0 = clamp01(1 - pA - pB);
    const avgFrames = T0 * p0 + fA * pA + fB * pB;
    const avgMul = 1 * p0 + mA * pA + mB * pB;
    const nonUltDPS = (v.atk * avgMul) / (avgFrames / F);
    const basicPerFrame = p0 / avgFrames;
    const aPerFrame = pA / avgFrames;
    const bPerFrame = pB / avgFrames;
    const actPerFrame = 1 / avgFrames;

    return { mode: "prob", T0, pA, pB, p0, avgFrames, avgMul, nonUltDPS, basicPerFrame, aPerFrame, bPerFrame, actPerFrame };
  }

  function calcTotal(v) {
    const nu = calcNonUlt(v);
    if (nu.err) return { err: nu.err };

    const ext = v.ext || calcExternalSupportAgg(v);
    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const physCritMul = (isFinite(v.critPhysMul) ? v.critPhysMul : 1);
    const magicCritMul = (isFinite(v.critMagicMul) ? v.critMagicMul : 1);

    // --- non-ult action rates (per second) ---
    let basicPerSec_nonUlt = 0, aPerSec_nonUlt = 0, bPerSec_nonUlt = 0;
    if (nu.mode === "prob") {
      const actPerSec = F / nu.avgFrames;
      basicPerSec_nonUlt = actPerSec * nu.p0;
      aPerSec_nonUlt = actPerSec * nu.pA;
      bPerSec_nonUlt = actPerSec * nu.pB;
    } else {
      const secPerUnit = nu.expFrames / F;
      basicPerSec_nonUlt = nu.expBasicCount / secPerUnit;
      aPerSec_nonUlt = nu.expACount / secPerUnit;
      bPerSec_nonUlt = nu.expBCount / secPerUnit;
    }

    function componentNonUltDps(kind, rate, attr, mul) {
      if (!(rate > 0) || !(mul > 0)) return 0;
      const attrSupport = (attr === "phys") ? ext.physMul : ext.magicMul;
      const envMul = (attr === "phys") ? pm : 1;
      const critMul = (attr === "phys") ? physCritMul : magicCritMul;
      const basicMul = (kind === "basic") ? ext.basicMul : 1;
      return rate * v.atk * mul * basicMul * attrSupport * envMul * critMul * ext.finalMul;
    }

    const basicNonUltDPS = componentNonUltDps("basic", basicPerSec_nonUlt, v.basicAttr, 1);
    const aNonUltDPS = componentNonUltDps("a", aPerSec_nonUlt, v.aAttr, v.aMul);
    const bNonUltDPS = componentNonUltDps("b", bPerSec_nonUlt, v.bAttr, (v.bType === "none" ? 0 : v.bMul));
    const nonUltDPS_adj = basicNonUltDPS + aNonUltDPS + bNonUltDPS;

    if (v.ultType === "none") {
      return { dps: nonUltDPS_adj, detail: { ...nu, nonUltDPS_adj, cycleFrames: NaN, cycleDamage: NaN, framesNonUltToReady: NaN, ext } };
    }

    const ultAttrSupport = (v.uAttr === "phys") ? ext.physMul : ext.magicMul;
    const ultEnvMul = (v.uAttr === "phys") ? pm : 1;
    const ultCritMul = (v.uAttr === "phys") ? physCritMul : magicCritMul;
    const ultDamage = v.atk * v.ultMul * ultAttrSupport * ultEnvMul * ultCritMul * ext.finalMul;

    if (v.ultType === "mana") {
      const timeManaPerFrame_nonUlt = v.manaPerSec / F;
      const basicManaPerFrame_nonUlt = nu.basicPerFrame * 1;
      const aManaPerFrame_nonUlt = v.aUseGainMana5 ? (nu.aPerFrame * 8) : 0;
      const extManaPerFrame = ext.addManaPerSec / F;
      const manaPerFrame_nonUlt = timeManaPerFrame_nonUlt + basicManaPerFrame_nonUlt + aManaPerFrame_nonUlt + extManaPerFrame;

      if (!(manaPerFrame_nonUlt > 0)) {
        return { err: "マナが増加しないため、究極に到達しません（Regeと基本攻撃率を確認）" };
      }

      let framesNonUltToReady, cycleFrames, cycleDamage;

      if (v.ultReset === "end") {
        framesNonUltToReady = v.gaugeMax / manaPerFrame_nonUlt;
        cycleFrames = framesNonUltToReady + v.ultF;
        cycleDamage = nonUltDPS_adj * (framesNonUltToReady / F) + ultDamage;
      } else {
        const timeManaPerFrame_ult = (v.ultStopsGauge ? 0 : (v.manaPerSec / F)) + extManaPerFrame;
        const manaGainDuringUlt = timeManaPerFrame_ult * v.ultF;
        const remain = Math.max(0, v.gaugeMax - manaGainDuringUlt);
        framesNonUltToReady = remain / manaPerFrame_nonUlt;
        cycleFrames = v.ultF + framesNonUltToReady;
        cycleDamage = ultDamage + nonUltDPS_adj * (framesNonUltToReady / F);
      }

      const dps = cycleDamage / (cycleFrames / F);
      return { dps, detail: { ...nu, timeManaPerFrame_nonUlt, basicManaPerFrame_nonUlt, aManaPerFrame_nonUlt, extManaPerFrame, manaPerFrame_nonUlt, nonUltDPS_adj, framesNonUltToReady, cycleFrames, cycleDamage, ext } };
    }

    if (v.ultType === "cool") {
      const baseCoolPerFrame_nonUlt = 1 / F; // 秒/フレーム
      const critAbShortenPerFrame_nonUlt = v.critABShortenUlt2s
        ? (2 * v.critChance * (nu.aPerFrame + nu.bPerFrame))
        : 0;
      const extCoolPerFrame = ext.addCoolPerSec / F;
      const coolPerFrame_nonUlt = baseCoolPerFrame_nonUlt + critAbShortenPerFrame_nonUlt + extCoolPerFrame;

      let framesNonUltToReady, cycleFrames, cycleDamage;

      if (v.ultReset === "end") {
        framesNonUltToReady = v.gaugeMax / coolPerFrame_nonUlt;
        cycleFrames = framesNonUltToReady + v.ultF;
        cycleDamage = nonUltDPS_adj * (framesNonUltToReady / F) + ultDamage;
      } else {
        const coolPerFrame_ult = (v.ultStopsGauge ? 0 : (1 / F)) + extCoolPerFrame;
        const coolGainDuringUlt = coolPerFrame_ult * v.ultF;
        const remain = Math.max(0, v.gaugeMax - coolGainDuringUlt);
        framesNonUltToReady = remain / coolPerFrame_nonUlt;
        cycleFrames = v.ultF + framesNonUltToReady;
        cycleDamage = ultDamage + nonUltDPS_adj * (framesNonUltToReady / F);
      }

      const dps = cycleDamage / (cycleFrames / F);
      return { dps, detail: { ...nu, baseCoolPerFrame_nonUlt, critAbShortenPerFrame_nonUlt, extCoolPerFrame, coolPerFrame_nonUlt, nonUltDPS_adj, framesNonUltToReady, cycleFrames, cycleDamage, ext } };
    }

    return { err: "未知の究極タイプです" };
  }

  function calcRatesAndShares(v, res) {
    const d = res.detail;
    const hasUlt = (v.ultType !== "none");
    const nonUltFrac = hasUlt ? (d.framesNonUltToReady / d.cycleFrames) : 1;
    const ultPerSec = hasUlt ? (F / d.cycleFrames) : 0;

    let basicPerSec_nonUlt = 0, aPerSec_nonUlt = 0, bPerSec_nonUlt = 0, actPerSec_nonUlt = 0;

    if (d.mode === "prob") {
      const actPerSec = F / d.avgFrames;
      actPerSec_nonUlt = actPerSec;
      basicPerSec_nonUlt = actPerSec * d.p0;
      aPerSec_nonUlt = actPerSec * d.pA;
      bPerSec_nonUlt = actPerSec * d.pB;
    } else {
      const secPerUnit = d.expFrames / F;
      basicPerSec_nonUlt = d.expBasicCount / secPerUnit;
      aPerSec_nonUlt = d.expACount / secPerUnit;
      bPerSec_nonUlt = d.expBCount / secPerUnit;
      actPerSec_nonUlt = (d.expBasicCount + d.expACount + d.expBCount) / secPerUnit;
    }

    const basicPerSec = basicPerSec_nonUlt * nonUltFrac;
    const aPerSec = aPerSec_nonUlt * nonUltFrac;
    const bPerSec = bPerSec_nonUlt * nonUltFrac;
    const actPerSec = actPerSec_nonUlt * nonUltFrac + ultPerSec;

    const mA = v.aMul;
    const mB = (v.bType === "none") ? 0 : v.bMul;

    const basicDPS0 = basicPerSec * v.atk * 1;
    const aDPS0 = aPerSec * v.atk * mA;
    const bDPS0 = bPerSec * v.atk * mB;
    const ultDPS0 = ultPerSec * v.atk * (hasUlt ? v.ultMul : 0);

    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const physCritMul = (isFinite(v.critPhysMul) ? v.critPhysMul : 1);
    const magicCritMul = (isFinite(v.critMagicMul) ? v.critMagicMul : 1);
    const ext = v.ext || calcExternalSupportAgg(v);

    const basicAttrSupport = (v.basicAttr === "phys") ? ext.physMul : ext.magicMul;
    const aAttrSupport = (v.aAttr === "phys") ? ext.physMul : ext.magicMul;
    const bAttrSupport = (v.bAttr === "phys") ? ext.physMul : ext.magicMul;
    const uAttrSupport = (v.uAttr === "phys") ? ext.physMul : ext.magicMul;

    const basicBaseMul = ((v.basicAttr === "phys") ? pm : 1) * basicAttrSupport * ext.basicMul;
    const aBaseMul = ((v.aAttr === "phys") ? pm : 1) * aAttrSupport;
    const bBaseMul = ((v.bAttr === "phys") ? pm : 1) * bAttrSupport;
    const uBaseMul = ((v.uAttr === "phys") ? pm : 1) * uAttrSupport;

    const basicCritMul = ((v.basicAttr === "phys") ? physCritMul : magicCritMul) * ext.finalMul;
    const aCritMul = ((v.aAttr === "phys") ? physCritMul : magicCritMul) * ext.finalMul;
    const bCritMul = ((v.bAttr === "phys") ? physCritMul : magicCritMul) * ext.finalMul;
    const uCritMul = ((v.uAttr === "phys") ? physCritMul : magicCritMul) * ext.finalMul;

    const basicNoCritDPS = basicDPS0 * basicBaseMul;
    const aNoCritDPS = aDPS0 * aBaseMul;
    const bNoCritDPS = bDPS0 * bBaseMul;
    const ultNoCritDPS = ultDPS0 * uBaseMul;

    const basicDPS = basicNoCritDPS * basicCritMul;
    const aDPS = aNoCritDPS * aCritMul;
    const bDPS = bNoCritDPS * bCritMul;
    const ultDPS = ultNoCritDPS * uCritMul;

    const physCritGainDPS =
      (v.basicAttr === "phys" ? basicNoCritDPS * (physCritMul - 1) : 0) +
      (v.aAttr === "phys" ? aNoCritDPS * (physCritMul - 1) : 0) +
      (v.bAttr === "phys" ? bNoCritDPS * (physCritMul - 1) : 0) +
      (v.uAttr === "phys" ? ultNoCritDPS * (physCritMul - 1) : 0);

    const magicCritGainDPS =
      (v.basicAttr === "magic" ? basicNoCritDPS * (magicCritMul - 1) : 0) +
      (v.aAttr === "magic" ? aNoCritDPS * (magicCritMul - 1) : 0) +
      (v.bAttr === "magic" ? bNoCritDPS * (magicCritMul - 1) : 0) +
      (v.uAttr === "magic" ? ultNoCritDPS * (magicCritMul - 1) : 0);

    const totalCritGainDPS = physCritGainDPS + magicCritGainDPS;

    const sum = basicDPS + aDPS + bDPS + ultDPS;
    const pct = (x) => (sum > 0 ? (100 * x / sum) : 0);

    return {
      nonUltFrac,
      actPerSec, basicPerSec, aPerSec, bPerSec, ultPerSec,
      basicDPS0, aDPS0, bDPS0, ultDPS0,
      basicNoCritDPS, aNoCritDPS, bNoCritDPS, ultNoCritDPS,
      basicDPS, aDPS, bDPS, ultDPS,
      basicBaseMul, aBaseMul, bBaseMul, uBaseMul,
      basicCritMul, aCritMul, bCritMul, uCritMul,
      physCritGainDPS, magicCritGainDPS, totalCritGainDPS,
      physCritGainPct: pct(physCritGainDPS),
      magicCritGainPct: pct(magicCritGainDPS),
      totalCritGainPct: pct(totalCritGainDPS),
      basicPct: pct(basicDPS), aPct: pct(aDPS), bPct: pct(bDPS), ultPct: pct(ultDPS),
      checkTotalDPS: sum,
      ext,
    };
  }

  function calcNonUltDpsSplit(v, d) {
    const mA = v.aMul;
    const mB = (v.bType === "none") ? 0 : v.bMul;

    if (d.mode === "prob") {
      const denom = (d.avgFrames / 40);
      const physW = (v.basicAttr === "phys" ? d.p0 * 1 : 0)
                  + (v.aAttr === "phys" ? d.pA * mA : 0)
                  + (v.bAttr === "phys" ? d.pB * mB : 0);
      const magW  = (v.basicAttr === "magic" ? d.p0 * 1 : 0)
                  + (v.aAttr === "magic" ? d.pA * mA : 0)
                  + (v.bAttr === "magic" ? d.pB * mB : 0);
      return { phys: v.atk * physW / denom, magic: v.atk * magW / denom };
    }

    const denom = d.expFrames / 40;
    const physW = (v.basicAttr === "phys" ? d.expBasicCount * 1 : 0)
                + (v.aAttr === "phys" ? d.expACount * mA : 0)
                + (v.bAttr === "phys" ? d.expBCount * mB : 0);
    const magW  = (v.basicAttr === "magic" ? d.expBasicCount * 1 : 0)
                + (v.aAttr === "magic" ? d.expACount * mA : 0)
                + (v.bAttr === "magic" ? d.expBCount * mB : 0);
    return { phys: v.atk * physW / denom, magic: v.atk * magW / denom };
  }

function calcBoundaryRange(v, res) {
    if (v.ultType === "none") return null;
    if (v.ultReset !== "start") return null;
    if (v.ultStopsGauge) return null;

    const d = res.detail;
    const minTick = Math.floor(v.ultF / 40);
    const maxTick = Math.ceil(v.ultF / 40);
    if (minTick === maxTick) return null;

    const ext = v.ext || calcExternalSupportAgg(v);
    const perTick = (v.ultType === "mana") ? v.manaPerSec : 1;
    const fixedGainDuringUlt = (v.ultType === "mana")
      ? (ext.addManaPerSec * (v.ultF / 40))
      : (ext.addCoolPerSec * (v.ultF / 40));

    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const physCritMul = (isFinite(v.critPhysMul) ? v.critPhysMul : 1);
    const magicCritMul = (isFinite(v.critMagicMul) ? v.critMagicMul : 1);

    const ultAttrSupport = (v.uAttr === "phys") ? ext.physMul : ext.magicMul;
    const ultEnvMul = (v.uAttr === "phys") ? pm : 1;
    const ultCritMul = (v.uAttr === "phys") ? physCritMul : magicCritMul;
    const ultDamage = v.atk * v.ultMul * ultAttrSupport * ultEnvMul * ultCritMul * ext.finalMul;

    const nonUltDPS_adj = d.nonUltDPS_adj;

    function dpsFromTick(ticks) {
      const gain = ticks * perTick + fixedGainDuringUlt;
      const remain = Math.max(0, v.gaugeMax - gain);

      let framesNonUltToReady;
      if (v.ultType === "mana") {
        const manaPerFrame_nonUlt = d.manaPerFrame_nonUlt;
        if (!(manaPerFrame_nonUlt > 0)) return NaN;
        framesNonUltToReady = remain / manaPerFrame_nonUlt;
      } else {
        const coolPerFrame_nonUlt = d.coolPerFrame_nonUlt;
        if (!(coolPerFrame_nonUlt > 0)) return NaN;
        framesNonUltToReady = remain / coolPerFrame_nonUlt;
      }

      const cycleFrames = v.ultF + framesNonUltToReady;
      const cycleDamage = ultDamage + nonUltDPS_adj * (framesNonUltToReady / 40);
      return cycleDamage / (cycleFrames / 40);
    }

    const dps1 = dpsFromTick(minTick);
    const dps2 = dpsFromTick(maxTick);
    if (!isFinite(dps1) || !isFinite(dps2)) return null;

    return { minTick, maxTick, lo: Math.min(dps1, dps2), hi: Math.max(dps1, dps2), perTick, fixedGainDuringUlt };
  }


  function calcEffectTimes(v, ex) {
    const unitCount = Math.max(1, Math.min(36, v.sameUnitCount || 1));
    const build = (label, ratePerSec, impactF) => {
      const safeRate = Math.max(0, ratePerSec || 0);
      const safeImpactF = Math.max(0, impactF || 0);
      const rawFPerSec = safeRate * safeImpactF;
      const rawSecPerSec = rawFPerSec / F;
      const singleCoverageSecPerSec = Math.min(1, rawSecPerSec);
      const singleCoveragePct = singleCoverageSecPerSec * 100;
      const multiCoverageSecPerSec = 1 - Math.pow(1 - singleCoverageSecPerSec, unitCount);
      const multiCoveragePct = multiCoverageSecPerSec * 100;
      return {
        label, ratePerSec: safeRate, secPerProc: safeRate > 0 ? 1 / safeRate : 0, impactF: safeImpactF,
        rawFPerSec, rawSecPerSec,
        singleCoverageSecPerSec, singleCoveragePct,
        multiCoverageSecPerSec, multiCoveragePct
      };
    };

    const a = build("スキルA", ex.aPerSec, v.aImpactF);
    const bRate = (v.bType === "none") ? 0 : ex.bPerSec;
    const b = build("スキルB", bRate, v.bImpactF);
    const uRate = (v.ultType === "none") ? 0 : ex.ultPerSec;
    const u = build("究極", uRate, v.ultImpactF);

    const totalRawFPerSec = a.rawFPerSec + b.rawFPerSec + u.rawFPerSec;
    const totalRawSecPerSec = totalRawFPerSec / F;
    const totalSingleCoverageSecPerSec = Math.min(1, totalRawSecPerSec);
    const totalSingleCoveragePct = totalSingleCoverageSecPerSec * 100;
    const totalMultiCoverageSecPerSec = 1 - Math.pow(1 - totalSingleCoverageSecPerSec, unitCount);
    const totalMultiCoveragePct = totalMultiCoverageSecPerSec * 100;
    return {
      unitCount,
      a, b, u,
      totalRawFPerSec, totalRawSecPerSec,
      totalSingleCoverageSecPerSec, totalSingleCoveragePct,
      totalMultiCoverageSecPerSec, totalMultiCoveragePct
    };
  }

  function calcTypeBreakdown(v, ex) {
    const sum = ex.checkTotalDPS;
    const pct = (x) => (sum > 0 ? (100 * x / sum) : 0);

    const phys = (v.basicAttr === "phys" ? ex.basicDPS : 0)
               + (v.aAttr === "phys" ? ex.aDPS : 0)
               + (v.bAttr === "phys" ? ex.bDPS : 0)
               + (v.uAttr === "phys" ? ex.ultDPS : 0);

    const magic = (v.basicAttr === "magic" ? ex.basicDPS : 0)
                + (v.aAttr === "magic" ? ex.aDPS : 0)
                + (v.bAttr === "magic" ? ex.bDPS : 0)
                + (v.uAttr === "magic" ? ex.ultDPS : 0);

    const single = (v.basicTarget === "single" ? ex.basicDPS : 0)
                 + (v.aTarget === "single" ? ex.aDPS : 0)
                 + (v.bTarget === "single" ? ex.bDPS : 0)
                 + (v.uTarget === "single" ? ex.ultDPS : 0);

    const multi = (v.basicTarget === "multi" ? ex.basicDPS : 0)
                + (v.aTarget === "multi" ? ex.aDPS : 0)
                + (v.bTarget === "multi" ? ex.bDPS : 0)
                + (v.uTarget === "multi" ? ex.ultDPS : 0);

    return { phys, magic, single, multi,
      physPct: pct(phys), magicPct: pct(magic),
      singlePct: pct(single), multiPct: pct(multi)
    };
  }

  function buildFormulaText(v, res, ex, eff, tb, br) {
    const d = res.detail;
    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const baseDef = DIFF_DEF[v.envDiff] ?? 175;
    const realDef = v.defReduce - baseDef;
    const hasUlt = (v.ultType !== "none");
    const gaugeLabel = (v.ultType === "mana") ? "マナ" : "クールタイム";
    const lines = [];

    lines.push("=== 行動レート～検算 の算出式 ===");
    if ((v.ext?.skillSpeedAdd || 0) > 0) {
      lines.push("現在の攻速 = 基礎速度 × (弓の速度 + 一時速度増加平均値) × 共有速度");
      lines.push(`  = ${r6(v.baseSpeed)} × (${r6(v.bowSpeed)} + ${r6(v.ext.skillSpeedAdd)}) × ${r6(v.shareSpeed)} = ${r6(v.aspd)}`);
    } else {
      lines.push("現在の攻速 = 基礎速度 × 弓の速度 × 共有速度");
      lines.push(`  = ${r6(v.baseSpeed)} × ${r6(v.bowSpeed)} × ${r6(v.shareSpeed)} = ${r6(v.aspd)}`);
    }
    lines.push("基本攻撃モーションF = 40 / 攻撃速度");
    lines.push(`  = 40 / ${r6(v.aspd)} = ${r6(d.T0)}`);

    if (d.mode === "prob") {
      lines.push("■ 行動レート（確率型）");
      lines.push("基本攻撃確率 = 1 − スキルA確率 − スキルB確率");
      lines.push(`  = 1 − ${r6(d.pA)} − ${r6(d.pB)} = ${r6(d.p0)}`);
      lines.push("平均行動F = 基本攻撃確率×基本攻撃F + スキルA確率×スキルA_F + スキルB確率×スキルB_F");
      lines.push(`  = ${r6(d.p0)}×${r6(d.T0)} + ${r6(d.pA)}×${v.aF} + ${r6(d.pB)}×${v.bF} = ${r6(d.avgFrames)}`);
      lines.push("平均倍率 = 基本攻撃確率×100% + スキルA確率×スキルA倍率 + スキルB確率×スキルB倍率");
      lines.push(`  = ${r6(d.p0)}×1 + ${r6(d.pA)}×${r6(v.aMul)} + ${r6(d.pB)}×${r6(v.bMul)} = ${r6(d.avgMul)}`);
      lines.push("非究極DPS = 攻撃力 × 平均倍率 / (平均行動F / 40)");
      lines.push(`  = ${r6(v.atk)} × ${r6(d.avgMul)} / (${r6(d.avgFrames)} / 40) = ${r6(d.nonUltDPS)}`);
    } else if (d.mode === "countBasic") {
      const secPerUnit = d.expFrames / 40;
      lines.push("■ 行動レート（スキルB=基本攻撃規定回数型）");
      lines.push("期待スキルA回数 EA = 規定回数 × pA / (1 − pA)");
      lines.push(`  = ${v.bN} × ${r6(d.pA)} / (1 − ${r6(d.pA)}) = ${r6(d.EA)}`);
      lines.push("非究極周期F = 基本攻撃F×基本攻撃回数 + スキルA_F×期待スキルA回数 + スキルB_F");
      lines.push(`  = ${r6(d.T0)}×${r6(d.expBasicCount)} + ${v.aF}×${r6(d.expACount)} + ${v.bF} = ${r6(d.expFrames)}`);
      lines.push("非究極周期秒 = 非究極周期F / 40");
      lines.push(`  = ${r6(d.expFrames)} / 40 = ${r6(secPerUnit)}`);
      lines.push("非究極周期ダメージ = 攻撃力 × (基本攻撃回数×100% + 期待スキルA回数×スキルA倍率 + スキルB倍率)");
      lines.push(`  = ${r6(v.atk)} × (${r6(d.expBasicCount)}×1 + ${r6(d.expACount)}×${r6(v.aMul)} + ${r6(v.bMul)}) = ${r6(d.expDamage)}`);
      lines.push("非究極DPS = 非究極周期ダメージ / (非究極周期F / 40)");
      lines.push(`  = ${r6(d.expDamage)} / (${r6(d.expFrames)} / 40) = ${r6(d.nonUltDPS)}`);
      lines.push("※ 既存仕様どおり、期待回数ベースの平均周期近似です。");
    }

    lines.push("");
    lines.push("■ 究極 / ゲージ");
    if (v.ultType === "none") {
      lines.push("究極：無し");
    } else if (v.ultType === "mana") {
      lines.push("時間マナ(毎秒) = Regeマナ毎秒 / 100");
      lines.push(`  = ${r6(readNumber($("manaRegenPct").value))} / 100 = ${r6(v.manaPerSec)}`);
      lines.push("時間マナ(毎フレーム)(非究極中) = 時間マナ(毎秒) / 40");
      lines.push(`  = ${r6(v.manaPerSec)} / 40 = ${r6(d.timeManaPerFrame_nonUlt)}`);
      lines.push("基本攻撃マナ(毎フレーム)(非究極中) = 基本攻撃/フレーム × 1");
      lines.push(`  = ${r6(d.basicPerFrame)} × 1 = ${r6(d.basicManaPerFrame_nonUlt)}`);
      lines.push("スキルAマナ(毎フレーム)(非究極中) = スキルA/フレーム × 5");
      lines.push(`  = ${r6(d.aPerFrame)} × 8 = ${r6(d.aManaPerFrame_nonUlt || 0)}`);
      lines.push("マナ増加(毎フレーム)(非究極中) = 時間マナ + 基本攻撃マナ + スキルAマナ");
      lines.push(`  = ${r6(d.timeManaPerFrame_nonUlt)} + ${r6(d.basicManaPerFrame_nonUlt)} + ${r6(d.aManaPerFrame_nonUlt || 0)} = ${r6(d.manaPerFrame_nonUlt)}`);
    } else {
      lines.push("通常クールタイム進行(毎フレーム)(非究極中) = 1 / 40 秒");
      lines.push(`  = 1 / 40 = ${r6(d.baseCoolPerFrame_nonUlt || (1 / 40))} 秒`);
      lines.push("A/Bクリ由来クールタイム短縮(毎フレーム)(非究極中) = (スキルA/フレーム + スキルB/フレーム) × クリ率 × 2秒");
      lines.push(`  = (${r6(d.aPerFrame)} + ${r6(d.bPerFrame)}) × ${r6(v.critChance)} × 2 = ${r6(d.critAbShortenPerFrame_nonUlt || 0)} 秒`);
      lines.push("クールタイム進行(毎フレーム)(非究極中) = 通常進行 + A/Bクリ由来短縮");
      lines.push(`  = ${r6(d.baseCoolPerFrame_nonUlt || (1 / 40))} + ${r6(d.critAbShortenPerFrame_nonUlt || 0)} = ${r6(d.coolPerFrame_nonUlt)} 秒`);
    }
    if (hasUlt) {
      if (v.ultType === "cool") {
        if (v.ultReset === "end") {
          lines.push("究極到達までの非究極F = クールタイム秒数 / クールタイム進行(毎フレーム)(非究極中)");
          lines.push(`  = ${r6(v.gaugeMax)} / ${r6(d.coolPerFrame_nonUlt)} = ${r6(d.framesNonUltToReady)}`);
        } else {
          const coolGainDuringUlt = v.ultStopsGauge ? 0 : (v.ultF / 40);
          const remain = Math.max(0, v.gaugeMax - coolGainDuringUlt);
          lines.push("究極中クールタイム進行 = 究極F / 40 秒");
          lines.push(`  = ${r6(v.ultF)} / 40 = ${r6(coolGainDuringUlt)} 秒`);
          lines.push("残クールタイム秒数 = max(0, クールタイム秒数 − 究極中クールタイム進行)");
          lines.push(`  = max(0, ${r6(v.gaugeMax)} − ${r6(coolGainDuringUlt)}) = ${r6(remain)}`);
          lines.push("残クールタイム到達F = 残クールタイム秒数 / クールタイム進行(毎フレーム)(非究極中)");
          lines.push(`  = ${r6(remain)} / ${r6(d.coolPerFrame_nonUlt)} = ${r6(d.framesNonUltToReady)}`);
        }
      }
      lines.push("非究極時間比率 = 非究極F / 周期F");
      lines.push(`  = ${r6(d.framesNonUltToReady)} / ${r6(d.cycleFrames)} = ${r6(ex.nonUltFrac)}`);
      lines.push("表示DPS（周期合成） = 周期ダメージ / (周期F / 40)");
      lines.push(`  = ${r6(d.cycleDamage)} / (${r6(d.cycleFrames)} / 40) = ${r6(res.dps)}`);
    } else {
      lines.push(`表示DPS（周期合成） = ${r6(res.dps)}`);
    }

    lines.push("");
    lines.push("■ 行動レート（回/秒 / 秒/回）");
    lines.push(`行動合計 = ${r6(ex.actPerSec)} 回/秒 / ${ex.actPerSec > 0 ? r6(1 / ex.actPerSec) : "-"} 秒/回`);
    lines.push(`基本攻撃 = ${r6(ex.basicPerSec)} 回/秒 / ${ex.basicPerSec > 0 ? r6(1 / ex.basicPerSec) : "-"} 秒/回`);
    lines.push(`スキルA = ${r6(ex.aPerSec)} 回/秒 / ${ex.aPerSec > 0 ? r6(1 / ex.aPerSec) : "-"} 秒/回`);
    lines.push(`スキルB = ${r6(ex.bPerSec)} 回/秒 / ${ex.bPerSec > 0 ? r6(1 / ex.bPerSec) : "-"} 秒/回`);
    lines.push(`究極 = ${r6(ex.ultPerSec)} 回/秒 / ${ex.ultPerSec > 0 ? r6(1 / ex.ultPerSec) : "-"} 秒/回`);

    lines.push("");
    lines.push("■ 影響時間（平均・ダメージとは別計算）");
    lines.push(`同ユニット数 = ${eff.unitCount}`);
    lines.push("スキルA影響F/秒 = スキルA/秒 × スキルA影響F");
    lines.push(`  = ${r6(ex.aPerSec)} × ${r6(v.aImpactF)} = ${r6(eff.a.rawFPerSec)}`);
    lines.push("スキルA単体稼働率 = min(100%, スキルA影響F/秒 / 40 × 100)");
    lines.push(`  = min(100%, ${r6(eff.a.rawFPerSec)} / 40 × 100) = ${r6(eff.a.singleCoveragePct)}%`);
    lines.push(`スキルA ${eff.unitCount}体参考稼働率 = 1 − (1 − 単体稼働率)^${eff.unitCount}`);
    lines.push(`  = 1 − (1 − ${r6(eff.a.singleCoverageSecPerSec)})^${eff.unitCount} = ${r6(eff.a.multiCoveragePct)}%`);
    lines.push("スキルB影響F/秒 = スキルB/秒 × スキルB影響F");
    lines.push(`  = ${r6(ex.bPerSec)} × ${r6(v.bImpactF)} = ${r6(eff.b.rawFPerSec)}`);
    lines.push("スキルB単体稼働率 = min(100%, スキルB影響F/秒 / 40 × 100)");
    lines.push(`  = min(100%, ${r6(eff.b.rawFPerSec)} / 40 × 100) = ${r6(eff.b.singleCoveragePct)}%`);
    lines.push(`スキルB ${eff.unitCount}体参考稼働率 = 1 − (1 − 単体稼働率)^${eff.unitCount}`);
    lines.push(`  = 1 − (1 − ${r6(eff.b.singleCoverageSecPerSec)})^${eff.unitCount} = ${r6(eff.b.multiCoveragePct)}%`);
    lines.push("究極影響F/秒 = 究極/秒 × 究極影響F");
    lines.push(`  = ${r6(ex.ultPerSec)} × ${r6(v.ultImpactF)} = ${r6(eff.u.rawFPerSec)}`);
    lines.push("究極単体稼働率 = min(100%, 究極影響F/秒 / 40 × 100)");
    lines.push(`  = min(100%, ${r6(eff.u.rawFPerSec)} / 40 × 100) = ${r6(eff.u.singleCoveragePct)}%`);
    lines.push(`究極 ${eff.unitCount}体参考稼働率 = 1 − (1 − 単体稼働率)^${eff.unitCount}`);
    lines.push(`  = 1 − (1 − ${r6(eff.u.singleCoverageSecPerSec)})^${eff.unitCount} = ${r6(eff.u.multiCoveragePct)}%`);
    lines.push(`  = min(100%, ${r6(eff.totalRawFPerSec)} / 40 × 100) = ${r6(eff.totalSingleCoveragePct)}%`);
    lines.push(`  = 1 − (1 − ${r6(eff.totalSingleCoverageSecPerSec)})^${eff.unitCount} = ${r6(eff.totalMultiCoveragePct)}%`);
    if ((v.ext?.rows || []).some(row => row.type === "tempSpeedPct")) {
      const tempRows = (v.ext.rows || []).filter(row => row.type === "tempSpeedPct");
      tempRows.forEach((row) => {
        html += lineHtml(`外部支援${row.idx} 一時速度増加: スキル速度=${hVal("valSpd", r6(row.amountNum * 100))}% / 単体発動回数/秒=${hVal("valSpd", r6(row.unitRate))} / 体数=${hVal("valSpd", row.count)} / 影響F=${hVal("valSpd", row.impactF)} / 平均被覆率=${hVal("valSpd", r6(row.coverage * 100))}% / 平均加算=${hVal("valSpd", r6(row.amountNum * row.coverage))}`);
      });
    }
    if (eff.ultEvent.type !== "none" && eff.ultEvent.amount > 0) {
      lines.push(`究極イベント支援種別 = ${eff.ultEvent.typeLabel}`);
      lines.push(`究極イベント支援 効果量 = ${r6(eff.ultEvent.amount * 100)}%`);
      lines.push(`究極イベント支援 単体発動回数/秒 = 究極/秒 = ${r6(eff.ultEvent.unitRate)}`);
      lines.push(`究極イベント支援 ${eff.ultEvent.count}体合計発動回数/秒 = ${r6(eff.ultEvent.unitRate)} × ${eff.ultEvent.count} = ${r6(eff.ultEvent.totalRate)}`);
      if (eff.ultEvent.type === "manaPct") {
        lines.push(`参考マナ増加/秒 = 合計発動回数/秒 × 最大マナ × 効果量`);
        lines.push(`  = ${r6(eff.ultEvent.totalRate)} × ${r6(v.gaugeMax)} × ${r6(eff.ultEvent.amount)} = ${r6(eff.ultEvent.addManaPerSec)}`);
      } else if (eff.ultEvent.type === "coolRemainPct") {
        lines.push(`参考クール短縮 秒/秒 ≒ 合計発動回数/秒 × クールタイム × 効果量 × 0.5`);
        lines.push(`  = ${r6(eff.ultEvent.totalRate)} × ${r6(v.gaugeMax)} × ${r6(eff.ultEvent.amount)} × 0.5 = ${r6(eff.ultEvent.addCoolPerSec)}`);
      }
    }

    if ((v.ext?.rows || []).some(row => row.type === "tempSpeedPct")) {
      lines.push("");
      lines.push("■ 外部支援：一時速度増加");
      (v.ext.rows || []).filter(row => row.type === "tempSpeedPct").forEach((row) => {
        lines.push(`外部支援${row.idx}: 平均被覆率 = min(100%, 合計発動回数/秒 × 影響F / 40 × 100)`);
        lines.push(`  = min(100%, ${r6(row.totalRate)} × ${row.impactF} / 40 × 100) = ${r6(row.coverage * 100)}%`);
        lines.push(`外部支援${row.idx}: 平均加算スキル速度 = 効果量 × 平均被覆率`);
        lines.push(`  = ${r6(row.amountNum)} × ${r6(row.coverage)} = ${r6(row.amountNum * row.coverage)}`);
      });
      lines.push(`合計一時速度増加平均値 = ${r6(v.ext.skillSpeedAdd || 0)}`);
    }

    lines.push("");
    lines.push("■ 環境（物理補正・クリティカル）");
    lines.push("実防御力 = 防御力減少値 − 80w防御力");
    lines.push(`  = ${v.defReduce} − ${baseDef} = ${realDef}`);
    lines.push("物理補正倍率(raw) = 1 × (1 + (SIGN(実防御力) × (1 − 50 / (3×ABS(実防御力)+50))))");
    lines.push(`  = 1 × (1 + (${Math.sign(realDef)} × (1 − 50 / (3×${Math.abs(realDef)}+50)))) = ${r6(1 * (1 + (Math.sign(realDef) * (1 - 50 / (3 * Math.abs(realDef) + 50)))))}`);
    lines.push(`物理補正倍率 = ${pm.toFixed(2)}`);
    lines.push(`期待クリ倍率(物理) = ${r6(v.critPhysMul)}`);
    lines.push(`期待クリ倍率(魔法) = ${r6(v.critMagicMul)}`);

    lines.push("");
    lines.push("■ ダメージ内訳（DPS成分）");
    lines.push(`基本DPS成分 = ${r6(ex.basicPerSec)} × ${r6(v.atk)} × 1 × ${r6(ex.basicBaseMul)} × ${r6(ex.basicCritMul)} = ${r6(ex.basicDPS)}`);
    lines.push(`スキルA DPS成分 = ${r6(ex.aPerSec)} × ${r6(v.atk)} × ${r6(v.aMul)} × ${r6(ex.aBaseMul)} × ${r6(ex.aCritMul)} = ${r6(ex.aDPS)}`);
    lines.push(`スキルB DPS成分 = ${r6(ex.bPerSec)} × ${r6(v.atk)} × ${r6((v.bType === "none") ? 0 : v.bMul)} × ${r6(ex.bBaseMul)} × ${r6(ex.bCritMul)} = ${r6(ex.bDPS)}`);
    lines.push(`究極DPS成分 = ${r6(ex.ultPerSec)} × ${r6(v.atk)} × ${r6(hasUlt ? v.ultMul : 0)} × ${r6(ex.uBaseMul)} × ${r6(ex.uCritMul)} = ${r6(ex.ultDPS)}`);

    lines.push("");
    lines.push("■ 属性 / 特性 / クリ寄与");
    lines.push(`物理DPS / 割合 = ${r6(tb.phys)} / ${r6(tb.physPct)}%`);
    lines.push(`魔法DPS / 割合 = ${r6(tb.magic)} / ${r6(tb.magicPct)}%`);
    lines.push(`単体DPS / 割合 = ${r6(tb.single)} / ${r6(tb.singlePct)}%`);
    lines.push(`複数DPS / 割合 = ${r6(tb.multi)} / ${r6(tb.multiPct)}%`);
    lines.push(`物理クリ寄与DPS / 割合 = ${r6(ex.physCritGainDPS)} / ${r6(ex.physCritGainPct)}%`);
    lines.push(`魔法クリ寄与DPS / 割合 = ${r6(ex.magicCritGainDPS)} / ${r6(ex.magicCritGainPct)}%`);
    lines.push(`合計クリ寄与DPS / 割合 = ${r6(ex.totalCritGainDPS)} / ${r6(ex.totalCritGainPct)}%`);

    if (br) {
      lines.push("");
      lines.push("■ 40F境界の厳密レンジ");
      lines.push(`minTick = floor(究極F / 40) = ${br.minTick}`);
      lines.push(`maxTick = ceil(究極F / 40) = ${br.maxTick}`);
      lines.push(`1tickあたり増える${gaugeLabel}: ${r6(br.perTick)}`);
      lines.push(`DPSレンジ = ${r6(br.lo)} ～ ${r6(br.hi)}`);
    }

    lines.push("");
    lines.push("■ 検算");
    lines.push(`内訳合計DPS = ${r6(ex.basicDPS)} + ${r6(ex.aDPS)} + ${r6(ex.bDPS)} + ${r6(ex.ultDPS)} = ${r6(ex.checkTotalDPS)}`);
    lines.push(`表示DPS（周期合成） = ${r6(res.dps)}`);
    return lines.join("\n");
  }

function setBar(fillId, valId, pct) {
    const p = Math.max(0, Math.min(100, pct));
    $(fillId).style.width = `${p}%`;
    $(valId).textContent = `${r6(p)}%`;
  }

  
  function highlightFormulaHtml(text, v, ex) {
    let s = escHtml(text);

    const buckets = {
      atk: { cls: "valAtk", vals: [] },
      spd: { cls: "valSpd", vals: [] },
      gauge: { cls: "valGauge", vals: [] },
      a: { cls: "valA", vals: [] },
      b: { cls: "valB", vals: [] },
      ult: { cls: "valUlt", vals: [] },
      env: { cls: "valEnv", vals: [] },
      crit: { cls: "valCrit", vals: [] },
    };

    function addVals(bucket, arr) {
      for (const x of arr) {
        if (x === undefined || x === null || x === "" || x === "NaN") continue;
        bucket.vals.push(String(x));
      }
    }

    addVals(buckets.atk, [v.atk, r6(v.atk)]);
    addVals(buckets.spd, [v.baseSpeed, r6(v.baseSpeed), v.bowSpeed, r6(v.bowSpeed), v.shareSpeed, r6(v.shareSpeed), v.ext?.skillSpeedAdd, r6(v.ext?.skillSpeedAdd || 0), v.aspd, r6(v.aspd), Number(v.aspd).toFixed ? Number(v.aspd).toFixed(2) : ""]);
    addVals(buckets.gauge, [v.gaugeMax, r6(v.gaugeMax), v.manaPerSec, r6(v.manaPerSec), $("manaRegenPct") ? readNumber($("manaRegenPct").value) : ""]);
    addVals(buckets.a, [v.aP, r6(v.aP), v.aP * 100, r6(v.aP * 100), v.aF, v.aMul, r6(v.aMul)]);
    addVals(buckets.b, [v.bP, r6(v.bP), v.bP * 100, r6(v.bP * 100), v.bN, v.bF, v.bMul, r6(v.bMul)]);
    addVals(buckets.ult, [v.ultMul, r6(v.ultMul), v.ultF, r6(v.ultF)]);
    addVals(buckets.env, [v.defReduce, v.physMul, r6(v.physMul), $("physMulOut") ? $("physMulOut").value : "", DIFF_DEF[v.envDiff] ?? ""]);
    addVals(buckets.crit, [v.critChancePct, v.critPhysBonusPct, v.critMagicBonusPct, v.critChance, r6(v.critChance), v.critPhysBonus, r6(v.critPhysBonus), v.critMagicBonus, r6(v.critMagicBonus), v.critPhysMul, r6(v.critPhysMul), v.critMagicMul, r6(v.critMagicMul), ex.physCritGainDPS, r6(ex.physCritGainDPS), ex.magicCritGainDPS, r6(ex.magicCritGainDPS), ex.totalCritGainDPS, r6(ex.totalCritGainDPS)]);

    const items = Object.values(buckets).flatMap(o => {
      const uniq = [...new Set(o.vals.filter(x => x !== "undefined"))];
      uniq.sort((a,b) => b.length - a.length);
      return uniq.map(val => ({cls:o.cls, val}));
    });

    for (const it of items) {
      const esc = it.val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      s = s.replace(new RegExp(`(^|[^\\d.])(${esc})(?![\\d.])`, "g"), `$1<span class="hlVal ${it.cls}">$2</span>`);
    }

    return s.replace(/\n/g, "<br>");
  }

  function buildFormulaHtml(v, res, ex, eff, tb, br) {
    return highlightFormulaHtml(buildFormulaText(v, res, ex, eff, tb, br), v, ex);
  }


  
  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }


  function hVal(cls, val) {
    return `<span class="hlVal ${cls}">${escHtml(val)}</span>`;
  }


  function lineHtml(s) {
    return `${s}<br>`;
  }

function buildDetailHtml(v, res, ex, eff, tb, br) {
    const d = res.detail;
    const diffLabelMap = {
      normal: "ノーマル",
      hard: "ハード",
      hell: "地獄",
      god: "神",
      prime: "太初",
    };
    const diffLabel = diffLabelMap[v.envDiff] || v.envDiff;
    const baseDef = DIFF_DEF[v.envDiff] ?? 175;
    const realDef = v.defReduce - baseDef;

    let html = "";
    html += lineHtml(`<span class="sectionHead">=== 行動レート（回/秒 / 秒/回）※究極時間込み平均 ===</span>`);
    html += lineHtml(`攻速内訳: 基礎=${hVal("valSpd", r6(v.baseSpeed))} / 弓=${hVal("valSpd", r6(v.bowSpeed))} / 共有=${hVal("valSpd", r6(v.shareSpeed))} / 現在の攻速=${hVal("valSpd", r6(v.aspd))}${(v.ext?.skillSpeedAdd || 0) > 0 ? ` / 一時速度増加平均=${hVal("valSpd", r6(v.ext.skillSpeedAdd))}` : ""}`);
    html += lineHtml(`非究極時間比率（=非究極F/周期F）: ${hVal("valMix", r6(ex.nonUltFrac))}`);
    html += lineHtml(`行動合計（究極も1行動扱い）: ${hVal("valMix", r6(ex.actPerSec))} 回/秒 / ${hVal("valMix", ex.actPerSec > 0 ? r6(1 / ex.actPerSec) : "-")} 秒/回`);
    html += lineHtml(`基本攻撃: ${hVal("valSpd", r6(ex.basicPerSec))} 回/秒 / ${hVal("valSpd", ex.basicPerSec > 0 ? r6(1 / ex.basicPerSec) : "-")} 秒/回`);
    html += lineHtml(`スキルA: ${hVal("valA", r6(ex.aPerSec))} 回/秒 / ${hVal("valA", ex.aPerSec > 0 ? r6(1 / ex.aPerSec) : "-")} 秒/回`);
    html += lineHtml(`スキルB: ${hVal("valB", r6(ex.bPerSec))} 回/秒 / ${hVal("valB", ex.bPerSec > 0 ? r6(1 / ex.bPerSec) : "-")} 秒/回`);
    html += lineHtml(`究極: ${hVal("valUlt", r6(ex.ultPerSec))} 回/秒 / ${hVal("valUlt", ex.ultPerSec > 0 ? r6(1 / ex.ultPerSec) : "-")} 秒/回`);
    if (v.ultType === "mana" && v.aUseGainMana5) {
      html += lineHtml(`猫の魔法使い補正（スキルA由来マナ）: ${hVal("valA", r6((d.aManaPerFrame_nonUlt || 0) * F))} マナ/秒`);
    }
    if (v.ultType === "cool" && v.critABShortenUlt2s) {
      html += lineHtml(`鬼神忍者補正（A/Bクリ由来クール短縮）: ${hVal("valUlt", r6((d.critAbShortenPerFrame_nonUlt || 0) * F))} 秒/秒`);
    }

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== 影響時間（平均・ダメージとは別計算） ===</span>`);
    html += lineHtml(`同ユニット数: ${hVal("valMix", eff.unitCount)}`);
    const copyACover = `${r6(eff.a.singleCoveragePct)}`;
    const copyBCover = `${r6(eff.b.singleCoveragePct)}`;
    const copyUCover = `${r6(eff.u.singleCoveragePct)}`;
    const copyTotalCover = `${r6(eff.totalSingleCoveragePct)}`;
    html += lineHtml(`スキルA: 回/秒=${hVal("valA", r6(eff.a.ratePerSec))} / 秒/回=${hVal("valA", eff.a.ratePerSec > 0 ? r6(eff.a.secPerProc) : "-")} / 影響F/秒=${hVal("valA", r6(eff.a.rawFPerSec))} / 単体稼働率=${hVal("valA", r6(eff.a.singleCoveragePct))}% / ${eff.unitCount}体参考稼働率=${hVal("valA", r6(eff.a.multiCoveragePct))}%${copyBtn(copyACover, "外部支援用コピー")}`);
    html += lineHtml(`スキルB: 回/秒=${hVal("valB", r6(eff.b.ratePerSec))} / 秒/回=${hVal("valB", eff.b.ratePerSec > 0 ? r6(eff.b.secPerProc) : "-")} / 影響F/秒=${hVal("valB", r6(eff.b.rawFPerSec))} / 単体稼働率=${hVal("valB", r6(eff.b.singleCoveragePct))}% / ${eff.unitCount}体参考稼働率=${hVal("valB", r6(eff.b.multiCoveragePct))}%${copyBtn(copyBCover, "外部支援用コピー")}`);
    html += lineHtml(`究極: 回/秒=${hVal("valUlt", r6(eff.u.ratePerSec))} / 秒/回=${hVal("valUlt", eff.u.ratePerSec > 0 ? r6(eff.u.secPerProc) : "-")} / 影響F/秒=${hVal("valUlt", r6(eff.u.rawFPerSec))} / 単体稼働率=${hVal("valUlt", r6(eff.u.singleCoveragePct))}% / ${eff.unitCount}体参考稼働率=${hVal("valUlt", r6(eff.u.multiCoveragePct))}%${copyBtn(copyUCover, "外部支援用コピー")}`);
    if ((v.ext?.rows || []).some(row => row.type === "tempSpeedPct")) {
      const tempRows = (v.ext.rows || []).filter(row => row.type === "tempSpeedPct");
      tempRows.forEach((row) => {
        html += lineHtml(`外部支援${row.idx} 一時速度増加: スキル速度=${hVal("valSpd", r6(row.amountNum * 100))}% / 単体発動回数/秒=${hVal("valSpd", r6(row.unitRate))} / 体数=${hVal("valSpd", row.count)} / 影響F=${hVal("valSpd", row.impactF)} / 平均被覆率=${hVal("valSpd", r6(row.coverage * 100))}% / 平均加算=${hVal("valSpd", r6(row.amountNum * row.coverage))}`);
      });
    }
    if (eff.ultEvent.type !== "none" && eff.ultEvent.amount > 0) {
      const ultEventText = eff.ultEvent.type === "manaPct"
        ? `究極イベント支援: ${hVal("valUlt", eff.ultEvent.typeLabel)} / 効果量=${hVal("valUlt", r6(eff.ultEvent.amount * 100))}% / 単体発動回数/秒=${hVal("valUlt", r6(eff.ultEvent.unitRate))} / ${eff.ultEvent.count}体合計発動回数/秒=${hVal("valUlt", r6(eff.ultEvent.totalRate))} / 参考マナ増加=${hVal("valUlt", r6(eff.ultEvent.addManaPerSec))} /秒${copyBtn(`${r6(eff.ultEvent.unitRate)}`, "外部支援用コピー")}`
        : `究極イベント支援: ${hVal("valUlt", eff.ultEvent.typeLabel)} / 効果量=${hVal("valUlt", r6(eff.ultEvent.amount * 100))}% / 単体発動回数/秒=${hVal("valUlt", r6(eff.ultEvent.unitRate))} / ${eff.ultEvent.count}体合計発動回数/秒=${hVal("valUlt", r6(eff.ultEvent.totalRate))} / 参考クール短縮=${hVal("valUlt", r6(eff.ultEvent.addCoolPerSec))} 秒/秒${copyBtn(`${r6(eff.ultEvent.unitRate)}`, "外部支援用コピー")}`;
      html += lineHtml(ultEventText);
    }

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== 環境（物理補正） ===</span>`);
    html += lineHtml(`難易度: ${hVal("valEnv", diffLabel)}（80w防御力は難易度に応じて内部適用）`);
    html += lineHtml(`防御力減少値: ${hVal("valEnv", v.defReduce)} / 実防御力=${hVal("valEnv", realDef)}`);
    html += lineHtml(`物理補正倍率（小数第2位まで）: ${hVal("valMixEnvPhys", $("physMulOut").value)}`);
    html += lineHtml(`クリ率: ${hVal("valCrit", $("critChancePct").value)} / 物理クリ補正: ${hVal("valCrit", $("critPhysBonusPct").value)} / 魔法クリ寄与補正: ${hVal("valCrit", $("critMagicBonusPct").value)}`);
    html += lineHtml(`期待クリ倍率（物理/魔法）: ${hVal("valCrit", r6(v.critPhysMul))} / ${hVal("valCrit", r6(v.critMagicMul))}`);

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== ダメージ内訳（DPS成分）と割合（合計=100%） ===</span>`);
    html += lineHtml(`基本DPS成分: ${hVal(v.basicAttr === "phys" ? "valMixEnvPhys" : "valSpd", r6(ex.basicDPS))} / 基本割合(%): ${hVal("valSpd", r6(ex.basicPct))}`);
    html += lineHtml(`スキルA DPS成分: ${hVal(v.aAttr === "phys" ? "valMixEnvPhys" : "valA", r6(ex.aDPS))} / スキルA割合(%): ${hVal("valA", r6(ex.aPct))}`);
    html += lineHtml(`スキルB DPS成分: ${hVal(v.bAttr === "phys" ? "valMixEnvPhys" : "valB", r6(ex.bDPS))} / スキルB割合(%): ${hVal("valB", r6(ex.bPct))}`);
    html += lineHtml(`究極DPS成分: ${hVal(v.uAttr === "phys" ? "valMixEnvPhys" : "valUlt", r6(ex.ultDPS))} / 究極割合(%): ${hVal("valUlt", r6(ex.ultPct))}`);

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== 属性内訳（物理/魔法） ===</span>`);
    html += lineHtml(`物理DPS: ${hVal("valMixEnvPhys", r6(tb.phys))} / 物理割合(%): ${hVal("valEnv", r6(tb.physPct))}`);
    html += lineHtml(`魔法DPS: ${hVal("valMixAB", r6(tb.magic))} / 魔法割合(%): ${hVal("valMixAB", r6(tb.magicPct))}`);

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== 特性内訳（単体/複数） ===</span>`);
    html += lineHtml(`単体DPS: ${hVal("valMix", r6(tb.single))} / 単体割合(%): ${hVal("valMix", r6(tb.singlePct))}`);
    html += lineHtml(`複数DPS: ${hVal("valMix", r6(tb.multi))} / 複数割合(%): ${hVal("valMix", r6(tb.multiPct))}`);

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== クリティカル寄与内訳 ===</span>`);
    html += lineHtml(`物理クリ寄与DPS: ${hVal("valCrit", r6(ex.physCritGainDPS))} / 割合(%): ${hVal("valCrit", r6(ex.physCritGainPct))}`);
    html += lineHtml(`魔法クリ寄与DPS: ${hVal("valCrit", r6(ex.magicCritGainDPS))} / 割合(%): ${hVal("valCrit", r6(ex.magicCritGainPct))}`);
    html += lineHtml(`合計クリ寄与DPS: ${hVal("valCrit", r6(ex.totalCritGainDPS))} / 割合(%): ${hVal("valCrit", r6(ex.totalCritGainPct))}`);

    if (br) {
      html += lineHtml("");
      html += lineHtml(`<span class="sectionHead">=== 境界(40F)による厳密レンジ（開始位相で±1tickの差） ===</span>`);
      html += lineHtml(`究極中のtick数: ${hVal("valUlt", br.minTick)}〜${hVal("valUlt", br.maxTick)} （1tickあたり+${hVal("valGauge", br.perTick)} ${v.ultType === "mana" ? "マナ" : "クールタイム"}${br.fixedGainDuringUlt > 0 ? ` / 外部支援固定+${hVal("valGauge", r6(br.fixedGainDuringUlt))}` : ""}）`);
      html += lineHtml(`DPSレンジ: ${hVal("valMix", r6(br.lo))} 〜 ${hVal("valMix", r6(br.hi))}`);
    }

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">--- 検算（丸めで微差が出る場合あり） ---</span>`);
    html += lineHtml(`内訳合計DPS（基本+スキルA+スキルB+究極）: ${hVal("valMix", r6(ex.checkTotalDPS))}`);
    html += lineHtml(`表示DPS（周期合成）: ${hVal("valMix", r6(res.dps))}`);
    return html;
  }


  function buildLegendHtml() {
    const items = [
      ["valAtk", "攻撃力"],
      ["valSpd", "攻撃速度 / 基本攻撃系"],
      ["valGauge", "マナ・クールタイム・ゲージ系"],
      ["valA", "スキルA系"],
      ["valB", "スキルB系"],
      ["valUlt", "究極系"],
      ["valEnv", "環境・防御系"],
      ["valCrit", "クリティカル系"],
      ["valMix", "複合・最終結果"],
      ["valMixAB", "魔法寄り複合"],
      ["valMixEnvPhys", "物理補正込み複合"],
    ];
    let html = '<div class="legendTitle">色凡例</div><div class="legendItems">';
    for (const [cls, label] of items) {
      html += `<span class="legendItem"><span class="hlVal legendSwatch ${cls}">${label}</span></span>`;
    }
    html += '</div>';
    return html;
  }

  function syncUiState() {
    syncUltType();
    syncSkillBMode();
    syncSegmentsFromHidden();
    syncEnvDerivedUI();
    syncNoteVisibility();
    updateSummaryCards();
  }

  function clearResultBars() {
    RESULT_BAR_IDS.forEach(([fillId, valId]) => setBar(fillId, valId, 0));
  }

  function clearEffectOutputs() {
    if ($("effectMeta")) $("effectMeta").textContent = "同ユニット数: -";
    if ($("effectA")) $("effectA").textContent = "-";
    if ($("effectB")) $("effectB").textContent = "-";
    if ($("effectU")) $("effectU").textContent = "-";
  }

  function clearDetailOutputs() {
    $("detailOut").innerHTML = "";
    $("formulaOut").innerHTML = "-";
    if ($("detailLegend")) $("detailLegend").innerHTML = "";
    if ($("formulaLegend")) $("formulaLegend").innerHTML = "";
  }

  function renderFailure(title, message) {
    $("dpsOut").textContent = title;
    $("dpsSub").textContent = message;
    clearDetailOutputs();
    clearResultBars();
    clearEffectOutputs();
    $("boundaryOut").textContent = "究極中tick数: - / DPSレンジ: -";
  }

  function collectResultBundle(v) {
    const res = calcTotal(v);
    if (res.err) return { v, res, err: res.err };
    const ex = calcRatesAndShares(v, res);
    const effBase = calcEffectTimes(v, ex);
    const eff = {
      ...effBase,
      ultEvent: {
        type: v.ultEventType || "none",
        typeLabel: supportTypeLabel(v.ultEventType || "none"),
        amount: Math.max(0, v.ultEventAmount || 0),
        unitRate: (v.ultType === "none") ? 0 : Math.max(0, ex.ultPerSec || 0),
        count: Math.max(1, Math.min(36, v.sameUnitCount || 1)),
        totalRate: 0,
        addManaPerSec: 0,
        addCoolPerSec: 0,
      }
    };
    eff.ultEvent.totalRate = eff.ultEvent.unitRate * eff.ultEvent.count;
    if (eff.ultEvent.type === "manaPct") {
      eff.ultEvent.addManaPerSec = eff.ultEvent.totalRate * Math.max(0, v.gaugeMax || 0) * eff.ultEvent.amount;
    } else if (eff.ultEvent.type === "coolRemainPct") {
      eff.ultEvent.addCoolPerSec = eff.ultEvent.totalRate * Math.max(0, v.gaugeMax || 0) * eff.ultEvent.amount * 0.5;
    }
    const tb = calcTypeBreakdown(v, ex);
    const br = calcBoundaryRange(v, res);
    return { v, res, ex, eff, tb, br, err: null };
  }

  function applyResultBundle(bundle) {
    const { v, res, ex, eff, tb, br } = bundle;
    $("dpsOut").textContent = `${r6(res.dps)}`;
    $("dpsSub").textContent = "（小数第6位まで = 第7位四捨五入）";

    if (br) {
      $("boundaryOut").textContent = `究極中tick数: ${br.minTick}〜${br.maxTick} / DPSレンジ: ${r6(br.lo)}〜${r6(br.hi)}`;
    } else {
      $("boundaryOut").textContent = "究極中tick数: - / DPSレンジ: -";
    }

    setBar("barBasic","valBasic", ex.basicPct);
    setBar("barA","valA", ex.aPct);
    setBar("barB","valB", ex.bPct);
    setBar("barU","valU", ex.ultPct);
    setBar("barPhys","valPhys", tb.physPct);
    setBar("barMagic","valMagic", tb.magicPct);
    setBar("barSingle","valSingle", tb.singlePct);
    setBar("barMulti","valMulti", tb.multiPct);
    setBar("barCorrPhys","valCorrPhys", ex.physCritGainPct);
    setBar("barCritMagic","valCritMagic", ex.magicCritGainPct);

    if ($("effectMeta")) $("effectMeta").textContent = `同ユニット数: ${eff.unitCount}体`;
    const copyACoverMini = `${r6(eff.a.singleCoveragePct)}`;
    const copyBCoverMini = `${r6(eff.b.singleCoveragePct)}`;
    const copyUCoverMini = `${r6(eff.u.singleCoveragePct)}`;
    const ultEventCopyMini = `${r6(eff.ultEvent.unitRate)}`;
    const ultEventMini = (eff.ultEvent.type !== "none" && eff.ultEvent.amount > 0)
      ? (eff.ultEvent.type === "manaPct"
          ? `<div class="effectSub">イベント支援: ${eff.ultEvent.typeLabel} ${r6(eff.ultEvent.amount * 100)}% / ${eff.ultEvent.count}体合計 ${r6(eff.ultEvent.totalRate)} 回/秒 / 参考マナ増加 ${r6(eff.ultEvent.addManaPerSec)} /秒 / 単体 ${r6(eff.ultEvent.unitRate)} 回/秒${copyBtn(ultEventCopyMini, "イベントコピー")}</div>`
          : `<div class="effectSub">イベント支援: ${eff.ultEvent.typeLabel} ${r6(eff.ultEvent.amount * 100)}% / ${eff.ultEvent.count}体合計 ${r6(eff.ultEvent.totalRate)} 回/秒 / 参考CT短縮 ${r6(eff.ultEvent.addCoolPerSec)} 秒/秒 / 単体 ${r6(eff.ultEvent.unitRate)} 回/秒${copyBtn(ultEventCopyMini, "イベントコピー")}</div>`)
      : "";
    if ($("effectA")) $("effectA").innerHTML = `${r6(eff.a.ratePerSec)} 回/秒 / ${eff.a.ratePerSec > 0 ? r6(eff.a.secPerProc) : "-"} 秒/回 / ${v.aImpactF}F → ${r6(eff.a.rawFPerSec)}F/秒（単体 ${r6(eff.a.singleCoveragePct)}%, ${eff.unitCount}体 ${r6(eff.a.multiCoveragePct)}%）${copyBtn(copyACoverMini, "コピー")}`;
    if ($("effectB")) $("effectB").innerHTML = `${r6(eff.b.ratePerSec)} 回/秒 / ${eff.b.ratePerSec > 0 ? r6(eff.b.secPerProc) : "-"} 秒/回 / ${v.bImpactF}F → ${r6(eff.b.rawFPerSec)}F/秒（単体 ${r6(eff.b.singleCoveragePct)}%, ${eff.unitCount}体 ${r6(eff.b.multiCoveragePct)}%）${copyBtn(copyBCoverMini, "コピー")}`;
    if ($("effectU")) $("effectU").innerHTML = `${r6(eff.u.ratePerSec)} 回/秒 / ${eff.u.ratePerSec > 0 ? r6(eff.u.secPerProc) : "-"} 秒/回 / ${v.ultImpactF}F → ${r6(eff.u.rawFPerSec)}F/秒（単体 ${r6(eff.u.singleCoveragePct)}%, ${eff.unitCount}体 ${r6(eff.u.multiCoveragePct)}%）${copyBtn(copyUCoverMini, "コピー")}${ultEventMini}`;

    $("detailOut").innerHTML = buildDetailHtml(v, res, ex, eff, tb, br);
    $("detailLegend").innerHTML = buildLegendHtml();
    $("formulaOut").innerHTML = buildFormulaHtml(v, res, ex, eff, tb, br);
    $("formulaLegend").innerHTML = buildLegendHtml();
  }

function render() {
    syncAttackSpeedInputs();
    syncUiState();

    const v = getValInternal();
    const bundle = collectResultBundle(v);

    if (bundle.err) {
      renderFailure("計算エラー", bundle.err);

      if (String(bundle.err).includes("究極に到達しません")) {
        if ($("ultType").value === "mana") {
          setErr($("manaRegenPct"), true);
          setLblErr($("regenLbl"), true);
          if ($("bType").value === "prob") setErr($("bThird"), true);
          setErr($("aPPct"), true);
        }
      }
      return;
    }

    applyResultBundle(bundle);
  }

  function validateAndRender() {
    syncUiState();

    const errs = validateInputs();
    if (errs.length) {
      renderFailure("入力エラー", errs.join(" / "));
      save(true);
      return;
    }
    render();
    save(true);
  }

  function readFormState() {
    const v = {};
    document.querySelectorAll("input,select").forEach(el => {
      if (!el.id) return;
      if (el.type === "checkbox") v[el.id] = el.checked;
      else v[el.id] = el.value;
    });
    return v;
  }

  function applyFormState(v) {
    for (const [k, val] of Object.entries(v || {})) {
      const el = $(k);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!val;
      else el.value = val;
    }
  }

  function getStoredStateRaw() {
    for (const key of STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return { key, raw };
      } catch (_) {}
    }
    return null;
  }

  function save(silent = false) {
    try {
      localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(readFormState()));
      if (!silent) alert("保存しました");
      return true;
    } catch (_) {
      if (!silent) alert("保存に失敗しました");
      return false;
    }
  }

  function load(silent = false) {
    try {
      const found = getStoredStateRaw();
      if (!found) {
        if (!silent) alert("保存データがありません");
        return false;
      }
      applyFormState(migrateLegacyState(JSON.parse(found.raw)));
      normalizeAll();
      syncUiState();
      validateAndRender();
      if (!silent) alert("読み込みました");
      return true;
    } catch (_) {
      if (!silent) alert("読み込みに失敗しました");
      return false;
    }
  }

  function resetAll() {
    try { STORAGE_KEYS.forEach((key) => localStorage.removeItem(key)); } catch (_) {}
    seedDefaults();
    normalizeAll();
    syncUiState();
    validateAndRender();
  }

  function seedDefaults() {
    $("atk").value = "1500";
    $("baseSpeed").value = "2.40";
    $("bowSpeed").value = "1.00";
    $("shareSpeed").value = "1.00";
    $("aspd").value = "2.40";
    $("gaugeMax").value = "100";
    $("sameUnitCount").value = "1";
    $("manaRegenPct").value = "100%";
    $("envDiff").value = "god";
    $("defReduce").value = "250";
    $("critChancePct").value = "0%";
    $("critPhysBonusPct").value = "150%";
    $("critMagicBonusPct").value = "170%";
    syncEnvDerivedUI();

    $("ultType").value = "mana";
    $("ultReset").value = "end";
    $("ultMulPct").value = "1500%";
    $("ultF").value = "44";
    $("ultImpactF").value = "0";
    $("ultEventType").value = "none";
    $("ultEventAmount").value = "0%";
    $("ultStopsGauge").checked = true;
    $("critABShortenUlt2s").checked = false;

    $("aMulPct").value = "600%";
    $("aPPct").value = "10.0%";
    $("aF").value = "32";
    $("aImpactF").value = "0";
    $("aUseGainMana5").checked = false;

    $("bType").value = "none";
    $("bMulPct").value = "1500%";
    $("bThird").value = "0.0%";
    $("bF").value = "40";
    $("bImpactF").value = "0";

    for (let i = 1; i <= 6; i++) {
      $("ext" + i + "Enabled").checked = false;
      $("ext" + i + "Type").value = "none";
      $("ext" + i + "Amount").value = "";
      $("ext" + i + "Base").value = "";
      $("ext" + i + "Count").value = "1";
      $("ext" + i + "ImpactF").value = "0";
    }

    $("showNotes").checked = false;
  }

  syncUiState();
  seedDefaults();
  normalizeAll();
  syncUiState();
  initBindings();
  setupCalculator();
  setupSegments();
  setupBottomSheets();
  setupAccordions();
  if (!load(true)) {
    validateAndRender();
  }
  pvCountOnce();
})();