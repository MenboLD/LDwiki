(() => {
  const APP_VERSION = "v8_9_16";
  const F = 40;
  const STORAGE_KEYS = ["LD_DPS_TOOL_V8_9_16", "LD_DPS_TOOL_V8_9_12", "LD_DPS_TOOL_V8_9_1", "LD_DPS_TOOL_V8_8_19", "LD_DPS_TOOL_V8_8_18", "LD_DPS_TOOL_V8_8_13", "LD_DPS_TOOL_V8_8_8", "LD_DPS_TOOL_V8_8_7"];
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
  function clampAspd(x) { return Math.max(0.000001, Math.min(8, Number(x) || 0)); }
  function computeCurrentAspd(baseSpd, bowSpd, shareSpd) {
    const base = Math.max(0, Number(baseSpd) || 0);
    const bow = Math.max(0, Number(bowSpd) || 0);
    const share = Math.max(0, Number(shareSpd) || 0);
    return clampAspd(base * bow * share);
  }
  function computeStateAspd(baseSpd, bowSpd, shareSpd, bonusPct) {
    const base = Math.max(0, Number(baseSpd) || 0);
    const bow = Math.max(0, Number(bowSpd) || 0);
    const share = Math.max(0, Number(shareSpd) || 0);
    const bonus = Math.max(0, Number(bonusPct) || 0) / 100;
    return clampAspd(base * (bow + bonus) * share);
  }
  function syncAttackSpeedInputs() {
    const out = $("aspd");
    if (!out) return;
    out.value = fmtDec(computeCurrentAspd(readNumber($("baseSpd")?.value || "0"), readNumber($("bowSpd")?.value || "0"), readNumber($("shareSpd")?.value || "0")), 6);
  }
  function computeAssistCurrentAspd(baseSpd, bowSpd, shareSpd) {
    return computeCurrentAspd(baseSpd, bowSpd, shareSpd);
  }
  function computeAssistFinalAspd(baseSpd, bowSpd, shareSpd, incomingCoverageSec) {
    const base = Math.max(0, Number(baseSpd) || 0);
    const bow = Math.max(0, Number(bowSpd) || 0);
    const share = Math.max(0, Number(shareSpd) || 0);
    const bonus = 0.2 * clamp01(incomingCoverageSec || 0);
    return clampAspd(base * (bow + bonus) * share);
  }
  function syncAssistAttackSpeedInputs() {
    const pairs = [
      ['assistPengBaseSpd', 'assistPengBowSpd', 'assistPengShareSpd', 'assistPengAspd'],
      ['assistTigerBaseSpd', 'assistTigerBowSpd', 'assistTigerShareSpd', 'assistTigerAspd'],
    ];
    pairs.forEach(([baseId, bowId, shareId, outId]) => {
      const out = $(outId);
      if (!out) return;
      out.value = fmtDec(computeAssistCurrentAspd(readNumber($(baseId)?.value || '0'), readNumber($(bowId)?.value || '0'), readNumber($(shareId)?.value || '0')), 6);
    });
  }

  // ---------- 外部支援（別ユニット由来） ----------
  function isCoverageSupportType(type){ return ["physPct","magicPct","basicPct","procMul","finalPct"].includes(type); }
  function supportTypeLabel(type){ return { none:"無し", physPct:"物理ダメージ増加", magicPct:"魔法ダメージ増加", basicPct:"基本攻撃ダメージ増加", procMul:"発動率倍率", finalPct:"最終ダメージ増加", manaPct:"最大マナ割合獲得", coolRemainPct:"残りクールタイム割合減少", tempAspd:"一時速度増加" }[type] || type; }
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
  function getSupportRows(){
    const rows=[];
    for (let i=1;i<=6;i++){
      rows.push({
        idx:i,
        enabled: $("ext"+i+"Enabled") ? $("ext"+i+"Enabled").checked : false,
        type: $("ext"+i+"Type") ? $("ext"+i+"Type").value : "none",
        amountRaw: $("ext"+i+"Amount") ? $("ext"+i+"Amount").value : "",
        baseRaw: $("ext"+i+"Base") ? $("ext"+i+"Base").value : "",
        impactRaw: $("ext"+i+"ImpactF") ? $("ext"+i+"ImpactF").value : "",
        countRaw: $("ext"+i+"Count") ? $("ext"+i+"Count").value : "1",
      });
    }
    return rows;
  }

  function calcExternalSupportAgg(vLike){
    const supports=vLike.supports||[];
    const agg={ physPct:0, magicPct:0, basicPct:0, finalPct:0, procCoverage:0, procMult:1, addManaPerSec:0, addCoolPerSec:0, tempSpeedBowAdd:0, rows:[] };
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
      } else if (s.type === "tempAspd") {
        const rate=Math.max(0, baseNum)*count;
        const impactF=Math.max(0, readInt(s.impactRaw || 0));
        const coverage=clamp01((rate * impactF) / F);
        const effectValue=amountNum/100;
        agg.rows.push({ idx:s.idx, type:s.type, count, mode:"tempAspd", unitRate:Math.max(0, baseNum), totalRate:rate, impactF, effectiveCoverage:coverage, amountNum:effectValue });
        agg.tempSpeedBowAdd += effectValue * coverage;
      } else {
        const rate=Math.max(0, baseNum)*count;
        const effectValue=amountNum/100;
        const addManaPerSec=(s.type==="manaPct") ? (rate * vLike.gaugeMax * effectValue) : 0;
        const addCoolPerSec=(s.type==="coolRemainPct") ? (rate * vLike.gaugeMax * effectValue * 0.5) : 0;
        agg.rows.push({ idx:s.idx, type:s.type, count, mode:"rate", unitRate:Math.max(0, baseNum), totalRate:rate, amountNum:effectValue, addManaPerSec, addCoolPerSec });
        agg.addManaPerSec += addManaPerSec;
        agg.addCoolPerSec += addCoolPerSec;
      }
    }
    agg.physMul=1+agg.physPct;
    agg.magicMul=1+agg.magicPct;
    agg.basicMul=1+agg.basicPct;
    agg.finalMul=1+agg.finalPct;
    return agg;
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
    } else {
      lbl.textContent = "基本攻撃規定回数";
      third.disabled = false;
      thirdWrap.classList.remove("disabledGroup");
      third.setAttribute("inputmode", "numeric");
      third.value = String(readInt(third.value));
    }
  }

  function syncSkillAMode() {
    const aType = $("aType") ? $("aType").value : "use";
    ["aMulPct","aPPct","aF","aImpactF","aUseGainMana5"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.disabled = (aType === 'none');
      const wrap = el.closest('.inp') || el.parentElement;
      if (wrap) wrap.classList.toggle('disabledGroup', aType === 'none');
    });
  }

  function syncExternalSupportRows() {
    for (let i = 1; i <= 6; i++) {
      const type = $("ext" + i + "Type")?.value || 'none';
      const impactRow = $("ext" + i + "ImpactRow");
      if (impactRow) impactRow.hidden = (type !== 'tempAspd');
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
    return Array.from(document.querySelectorAll('input[type="text"]')).map((el) => el.id).filter(Boolean);
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
    if (/^ext\d+ImpactF$/.test(id)) return toIntDisplay(value, 4);
    if (/^ext\d+Count$/.test(id)) return toIntDisplay(value, 2);
    if (id === "atk") return toAtkDisplay(value);
    if (["gaugeMax","assistTigerGaugeMax"].includes(id)) return toIntDisplay(value, 3);
    if (["sameUnitCount","assistPengCount","assistTigerCount"].includes(id)) return toIntDisplay(value, 2);
    if (id === "defReduce") return toIntDisplay(value, 3);
    if (["baseSpd","bowSpd","shareSpd","assistPengBaseSpd","assistPengBowSpd","assistPengShareSpd","assistTigerBaseSpd","assistTigerBowSpd","assistTigerShareSpd"].includes(id)) return toAspdDisplay(value, 6);
    if (["manaRegenPct","critChancePct","critPhysBonusPct","critMagicBonusPct","ultEventAmount","assistPengRegenPct","assistTigerRegenPct","assistTigerUltEventAmount"].includes(id)) return toPctDisplay(value, 6, 6);
    if (["aPPct","assistPengAPct","assistTigerAPct","assistPengBProb"].includes(id)) return toProbPctDisplay(value, 6);
    if (["aMulPct","bMulPct","ultMulPct"].includes(id)) return toPctDisplay(value, 6, 6);
    if (["aF","aImpactF","bF","bImpactF","ultF","ultImpactF","assistPengAF","assistPengBF","assistTigerAF","assistTigerUltF"].includes(id)) return toIntDisplay(value, 4);
    if (id === "bThird") {
      const bType = $("bType") ? $("bType").value : "none";
      return bType === "count" ? String(readInt(value)) : toProbPctDisplay(value, 6);
    }
    return fmtDec(readNumber(value), 6);
  }


  function prepareCalculatorFields() {
    document.querySelectorAll('input[type="text"]').forEach((el) => {
      if (!el.id || el.id === 'calcDisplay') return;
      if (el.classList.contains('computedField')) return;
      if (el.dataset.noCalc === '1') return;
      el.classList.add('calcField');
      el.dataset.calcTarget = el.id;
      if (!el.dataset.calcLabel) el.dataset.calcLabel = getCalcFieldLabel(el);
      el.setAttribute('readonly', 'readonly');
      el.setAttribute('inputmode', 'none');
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('spellcheck', 'false');
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
    let lastTouchTime = 0;
    const blockDoubleTap = (e) => {
      const now = Date.now();
      if (e.type === 'dblclick') {
        e.preventDefault();
        return;
      }
      if (e.type === 'touchend') {
        if (now - lastTouchTime < 320) e.preventDefault();
        lastTouchTime = now;
      }
    };
    $("calcOverlay")?.addEventListener('dblclick', blockDoubleTap, { passive: false });
    $("calcOverlay")?.addEventListener('touchend', blockDoubleTap, { passive: false });
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
    const map = { env: "envCard", basic: "basicCard", a: "aCard", b: "bCard", ult: "ultCard", ext: "extCard", assist: "assistSheet", record: "recordSheet" };
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
      applyFormState(JSON.parse(raw));
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
    if ($("summaryBasic")) $("summaryBasic").textContent = `攻撃力:${$("atk")?.value || "-"} / 基礎:${$("baseSpd")?.value || "-"} / 弓:${$("bowSpd")?.value || "-"} / 共有:${$("shareSpd")?.value || "-"} / 攻速:${$("aspd")?.value || "-"}`;
    if ($("summaryA")) $("summaryA").textContent = `タイプ:${$("aType")?.selectedOptions?.[0]?.textContent || "-"} / 倍率:${$("aMulPct")?.value || "-"} / 確率:${$("aPPct")?.value || "-"} / F:${$("aF")?.value || "-"} / 影響F:${$("aImpactF")?.value || "0"}` + ($("aUseGainMana5")?.checked ? " / 猫ON" : "");
    const bTypeText = $("bType")?.selectedOptions?.[0]?.textContent || "-";
    const bThirdLabel = ($("bType")?.value === "count") ? "規定" : "確率";
    if ($("summaryB")) $("summaryB").textContent = `タイプ:${bTypeText} / 倍率:${$("bMulPct")?.value || "-"} / ${bThirdLabel}:${$("bThird")?.value || "-"} / F:${$("bF")?.value || "-"} / 影響F:${$("bImpactF")?.value || "0"}`;
    if ($("summaryUlt")) $("summaryUlt").textContent = `タイプ:${$("ultType")?.selectedOptions?.[0]?.textContent || "-"} / 倍率:${$("ultMulPct")?.value || "-"} / ${gaugeLabel}:${$("gaugeMax")?.value || "-"} / F:${$("ultF")?.value || "-"} / 影響F:${$("ultImpactF")?.value || "0"} / イベント:${ultEventText}`;
    if ($("summaryExt")) $("summaryExt").textContent = extUsed > 0 ? `${extUsed}枠使用中` : "未使用";
    const assist = calcMutualSpeedAssist();
    if ($("summaryAssist")) $("summaryAssist").textContent = assist.enabled ? `ON / 20帯 ${r6((assist.p20 || 0) * 100)}% / 40帯 ${r6((assist.p40 || 0) * 100)}%` : "OFF";
  }

  function initBindings() {
    bindField($("atk"), (v)=>sanitizeIntKeepComma(v,6), (v)=>toAtkDisplay(v));
    bindField($("baseSpd"), (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6));
    bindField($("bowSpd"), (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6));
    bindField($("shareSpd"), (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6));
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

    const commitBThird = () => {
      const bType = $("bType").value;
      if (bType === "prob") $("bThird").value = toProbPctDisplay($("bThird").value, 6);
      else if (bType === "count") $("bThird").value = String(readInt($("bThird").value));
      else $("bThird").value = "0.0%";
      validateAndRender();
    };
    $("bThird").addEventListener("blur", commitBThird);
    $("bThird").addEventListener("change", commitBThird);

    for (let i = 1; i <= 6; i++) {
      bindField($("ext" + i + "Amount"), (v)=>trimDecimalsLive(v,6), (v)=>toSupportAmountDisplay($("ext" + i + "Type").value, v));
      bindField($("ext" + i + "Base"), (v)=>trimDecimalsLive(v,6), (v)=>toSupportBaseDisplay($("ext" + i + "Type").value, v));
      bindField($("ext" + i + "ImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
      bindField($("ext" + i + "Count"), (v)=>sanitizeIntKeepComma(v,2), (v)=>toIntDisplay(v,2));
      $("ext" + i + "Type").addEventListener("change", () => {
        $("ext" + i + "Amount").value = toSupportAmountDisplay($("ext" + i + "Type").value, $("ext" + i + "Amount").value);
        $("ext" + i + "Base").value = toSupportBaseDisplay($("ext" + i + "Type").value, $("ext" + i + "Base").value);
        syncExternalSupportRows();
        validateAndRender();
      });
      $("ext" + i + "Enabled").addEventListener("change", validateAndRender);
    }

    [
      ["assistPengCount", (v)=>sanitizeIntKeepComma(v,2), (v)=>toIntDisplay(v,2)],
      ["assistTigerCount", (v)=>sanitizeIntKeepComma(v,2), (v)=>toIntDisplay(v,2)],
      ["assistTigerGaugeMax", (v)=>sanitizeIntKeepComma(v,3), (v)=>toIntDisplay(v,3)],
      ["assistPengAF", (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4)],
      ["assistPengBF", (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4)],
      ["assistTigerAF", (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4)],
      ["assistTigerUltF", (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4)],
      ["assistPengBaseSpd", (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6)],
      ["assistPengBowSpd", (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6)],
      ["assistPengShareSpd", (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6)],
      ["assistTigerBaseSpd", (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6)],
      ["assistTigerBowSpd", (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6)],
      ["assistTigerShareSpd", (v)=>trimDecimalsLive(v,6), (v)=>toAspdDisplay(v,6)],
      ["assistPengRegenPct", (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,4)],
      ["assistTigerRegenPct", (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,4)],
      ["assistPengAPct", (v)=>trimDecimalsLive(v,6), (v)=>toProbPctDisplay(v,6)],
      ["assistTigerAPct", (v)=>trimDecimalsLive(v,6), (v)=>toProbPctDisplay(v,6)],
      ["assistPengBProb", (v)=>trimDecimalsLive(v,6), (v)=>toProbPctDisplay(v,6)],
      ["assistTigerUltEventAmount", (v)=>trimDecimalsLive(v,6), (v)=>toPctDisplay(v,6,6)],
    ].forEach(([id, onInput, onCommit]) => { if ($(id)) bindField($(id), onInput, onCommit); });

    $("ultType").addEventListener("change", () => { syncUltType(); validateAndRender(); });
    $("envDiff").addEventListener("change", () => { syncEnvDerivedUI(); validateAndRender(); });
    $("defReduce").addEventListener("input", () => { syncEnvDerivedUI(); validateAndRender(); });
    $("ultReset").addEventListener("change", validateAndRender);
    $("ultStopsGauge").addEventListener("change", validateAndRender);
    $("aType").addEventListener("change", () => { syncSkillAMode(); validateAndRender(); });
    $("aUseGainMana5").addEventListener("change", validateAndRender);
    $("critABShortenUlt2s").addEventListener("change", validateAndRender);
    $("ultEventType").addEventListener("change", validateAndRender);
    $("bType").addEventListener("change", () => { syncSkillBMode(); validateAndRender(); });
    ["assistEnabled","assistTigerUltStopsGauge"].forEach((id) => $(id)?.addEventListener("change", validateAndRender));
    ["assistTigerUltReset","assistTigerUltEventType"].forEach((id) => $(id)?.addEventListener("change", validateAndRender));

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
    $("formulaOut").addEventListener("click", onCopyBtnClick);
    $("effectBox").addEventListener("click", onCopyBtnClick);

    $("slotSave1")?.addEventListener("click", () => saveSlot(1));
    $("slotSave2")?.addEventListener("click", () => saveSlot(2));
    $("slotSave3")?.addEventListener("click", () => saveSlot(3));
    $("slotLoad1")?.addEventListener("click", () => loadSlot(1));
    $("slotLoad2")?.addEventListener("click", () => loadSlot(2));
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
    $("baseSpd").value = toAspdDisplay($("baseSpd").value, 6);
    $("bowSpd").value = toAspdDisplay($("bowSpd").value, 6);
    $("shareSpd").value = toAspdDisplay($("shareSpd").value, 6);
    syncAttackSpeedInputs();
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

    syncSkillAMode();
    syncSkillBMode();
    syncExternalSupportRows();
    syncSegmentsFromHidden();
    syncEnvDerivedUI();
    if ($("bType").value === "prob") $("bThird").value = toProbPctDisplay($("bThird").value, 6);
    if ($("bType").value === "count") $("bThird").value = String(readInt($("bThird").value));

    for (let i = 1; i <= 6; i++) {
      const type = $("ext" + i + "Type").value;
      $("ext" + i + "Amount").value = toSupportAmountDisplay(type, $("ext" + i + "Amount").value);
      $("ext" + i + "Base").value = toSupportBaseDisplay(type, $("ext" + i + "Base").value);
      $("ext" + i + "ImpactF").value = toIntDisplay($("ext" + i + "ImpactF").value, 4);
      $("ext" + i + "Count").value = toIntDisplay($("ext" + i + "Count").value, 2);
    }

    ["assistPengCount","assistTigerCount"].forEach((id) => $(id) && ($(id).value = toIntDisplay($(id).value, 2)));
    ["assistPengRegenPct","assistTigerRegenPct"].forEach((id) => $(id) && ($(id).value = toPctDisplay($(id).value, 6, 4)));
    ["assistPengBaseSpd","assistPengBowSpd","assistPengShareSpd","assistTigerBaseSpd","assistTigerBowSpd","assistTigerShareSpd"].forEach((id) => $(id) && ($(id).value = toAspdDisplay($(id).value, 6)));
    ["assistPengAPct","assistTigerAPct","assistPengBProb"].forEach((id) => $(id) && ($(id).value = toProbPctDisplay($(id).value, 6)));
    ["assistPengAF","assistPengBF","assistTigerAF","assistTigerUltF"].forEach((id) => $(id) && ($(id).value = toIntDisplay($(id).value, 4)));
    if ($("assistTigerGaugeMax")) $("assistTigerGaugeMax").value = toIntDisplay($("assistTigerGaugeMax").value, 3);
    if ($("assistTigerUltEventAmount")) $("assistTigerUltEventAmount").value = toPctDisplay($("assistTigerUltEventAmount").value, 6, 6);
    syncAssistAttackSpeedInputs();
  }


  function getValInternal() {
    const atk = readInt($("atk").value);
    const baseSpd = readNumber($("baseSpd").value);
    const bowSpd = readNumber($("bowSpd").value);
    const shareSpd = readNumber($("shareSpd").value);
    const aspdCurrent = computeCurrentAspd(baseSpd, bowSpd, shareSpd);
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

    const aType = $("aType").value;
    const aMul = readNumber($("aMulPct").value) / 100;
    const aP = aType === 'use' ? (readNumber($("aPPct").value) / 100) : 0;
    const aF = readInt($("aF").value);
    const aImpactF = readInt($("aImpactF").value);
    const aUseGainMana5 = aType === 'use' && $("aUseGainMana5").checked;

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

    const base = { atk, baseSpd, bowSpd, shareSpd, aspd: aspdCurrent, aspdCurrent, gaugeMax, sameUnitCount, manaPerSec, envDiff, baseDef, defReduce, realDef, physMul,
      critChancePct, critPhysBonusPct, critMagicBonusPct, critChance, critPhysBonus, critMagicBonus, critPhysMul, critMagicMul,
      ultType, ultReset, ultMul, ultF, ultImpactF, ultEventType, ultEventAmount, ultStopsGauge, critABShortenUlt2s,
      aType, aMul, aP, aF, aImpactF, aUseGainMana5, bType, bMul, bF, bImpactF, bP, bN,
      basicAttr, basicTarget, aAttr, aTarget, bAttr, bTarget, uAttr, uTarget, supports };
    base.ext = calcExternalSupportAgg(base);
    if (base.ext.tempSpeedBowAdd > 0) {
      base.aspd = clampAspd(base.baseSpd * (base.bowSpd + base.ext.tempSpeedBowAdd) * base.shareSpd);
    }
    return base;
  }


  function clearErrAll() {
    const ids = ["atk","baseSpd","bowSpd","shareSpd","gaugeMax","sameUnitCount","manaRegenPct","defReduce","critChancePct","critPhysBonusPct","critMagicBonusPct","ultMulPct","ultF","ultImpactF","ultEventAmount","aMulPct","aPPct","aF","aImpactF","bMulPct","bThird","bF","bImpactF",
      "ext1Amount","ext1Base","ext1ImpactF","ext1Count","ext2Amount","ext2Base","ext2ImpactF","ext2Count","ext3Amount","ext3Base","ext3ImpactF","ext3Count","ext4Amount","ext4Base","ext4ImpactF","ext4Count","ext5Amount","ext5Base","ext5ImpactF","ext5Count","ext6Amount","ext6Base","ext6ImpactF","ext6Count"];
    ids.forEach(id => setErr($(id), false));
    setLblErr($("regenLbl"), false);
  }


  function validateInputs() {
    clearErrAll();
    const errors = [];
    let procMulEnabledCount = 0;

    const atk = readInt($("atk").value);
    if (atk <= 0) { setErr($("atk"), true); errors.push("攻撃力は1以上"); }

    const baseSpd = readNumber($("baseSpd").value);
    const bowSpd = readNumber($("bowSpd").value);
    const shareSpd = readNumber($("shareSpd").value);
    if (!(baseSpd > 0 && baseSpd <= 8)) { setErr($("baseSpd"), true); errors.push("基礎速度は0より大きく8.00以下"); }
    if (!(bowSpd > 0 && bowSpd <= 8)) { setErr($("bowSpd"), true); errors.push("弓の速度は0より大きく8.00以下"); }
    if (!(shareSpd > 0 && shareSpd <= 8)) { setErr($("shareSpd"), true); errors.push("共有速度は0より大きく8.00以下"); }
    const aspd = computeCurrentAspd(baseSpd, bowSpd, shareSpd);
    if (!(aspd > 0 && aspd <= 8)) { setErr($("baseSpd"), true); setErr($("bowSpd"), true); setErr($("shareSpd"), true); errors.push("現在の攻撃速度は0より大きく8.00以下"); }

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

    const aType = $("aType").value;
    const aMul = readNumber($("aMulPct").value);
    const aP = readNumber($("aPPct").value);
    const aF = readInt($("aF").value);
    const aImpactF = readInt($("aImpactF").value);
    if (aType === 'use') {
      if (aMul < 0 || aMul > 999999.9) { setErr($("aMulPct"), true); errors.push("スキルA倍率は0〜999999.9%"); }
      if (aP < 0 || aP > 90) { setErr($("aPPct"), true); errors.push("スキルA確率は0〜90.0%"); }
      if (aF <= 0 || aF > 9999) { setErr($("aF"), true); errors.push("スキルAのＦ数は1〜9999"); }
      if (aImpactF < 0 || aImpactF > 9999) { setErr($("aImpactF"), true); errors.push("スキルAの影響Fは0〜9999"); }
    }

    const bType = $("bType").value;
    const bMul = readNumber($("bMulPct").value);
    const bF = readInt($("bF").value);
    const bImpactF = readInt($("bImpactF").value);
    if (bMul < 0 || bMul > 999999.9) { setErr($("bMulPct"), true); errors.push("スキルB倍率は0〜999999.9%"); }
    if (bType === "prob") {
      const bP = readNumber($("bThird").value);
      if (bP < 0 || bP > 90) { setErr($("bThird"), true); errors.push("スキルB確率は0〜90.0%"); }
    } else if (bType === "count") {
      const bN = readInt($("bThird").value);
      if (!(bN >= 1 && bN <= 99)) { setErr($("bThird"), true); errors.push("スキルBの規定回数は1〜99"); }
    }
    if (bType !== "none") {
      if (bF <= 0 || bF > 9999) { setErr($("bF"), true); errors.push("スキルBのＦ数は1〜9999"); }
      if (bImpactF < 0 || bImpactF > 9999) { setErr($("bImpactF"), true); errors.push("スキルBの影響Fは0〜9999"); }
    }

    for (let i = 1; i <= 6; i++) {
      if (!$("ext" + i + "Enabled").checked) continue;
      const type = $("ext" + i + "Type") ? $("ext" + i + "Type").value : "none";
      const amount = readNumber($("ext" + i + "Amount").value);
      const base = readNumber($("ext" + i + "Base").value);
      const impactF = readInt($("ext" + i + "ImpactF").value);
      const count = readInt($("ext" + i + "Count").value);
      if (!(count >= 1 && count <= 36)) { setErr($("ext" + i + "Count"), true); errors.push("外部支援の体数は1〜36"); }
      if (type === "procMul") procMulEnabledCount += 1;
      if (isCoverageSupportType(type)) {
        if (type === "procMul") {
          if (!(amount >= 0 && amount <= 999999.9)) { setErr($("ext" + i + "Amount"), true); errors.push("発動率倍率は0以上"); }
        } else {
          if (amount < 0 || amount > 9999) { setErr($("ext" + i + "Amount"), true); errors.push("外部支援の効果量は0〜9999%"); }
        }
        if (base < 0 || base > 100) { setErr($("ext" + i + "Base"), true); errors.push("被覆率は0〜100%"); }
      } else if (type === 'tempAspd') {
        if (amount < 0 || amount > 9999) { setErr($("ext" + i + "Amount"), true); errors.push("一時速度増加の効果量は0〜9999%"); }
        if (base < 0) { setErr($("ext" + i + "Base"), true); errors.push("一時速度増加の単体発動回数/秒は0以上"); }
        if (!(impactF > 0 && impactF <= 9999)) { setErr($("ext" + i + "ImpactF"), true); errors.push("一時速度増加の影響Fは1〜9999"); }
      } else if (type !== "none") {
        if (amount < 0 || amount > 9999) { setErr($("ext" + i + "Amount"), true); errors.push("外部支援の効果量は0〜9999%"); }
        if (base < 0) { setErr($("ext" + i + "Base"), true); errors.push("単体発動回数/秒は0以上"); }
      }
    }

    if (procMulEnabledCount > 1) errors.push("発動率倍率の外部支援は同時に1種類のみ想定です");
    errors.push(...validateAssistInputs());
    return errors;
  }


  function collectResultBundleSingle(v) {
    const res = calcTotal(v);
    if (res.err) return { v, res, err: res.err };
    const ex = calcRatesAndShares(v, res);
    const effBase = calcEffectTimes(v, ex);
    const eff = { ...effBase };
    const tb = calcTypeBreakdown(v, ex);
    const br = calcBoundaryRange(v, res);
    return { v, res, ex, eff, tb, br, err: null };
  }

  function getMutualSpeedAssistConfig() {
    return {
      enabled: !!($("assistEnabled") && $("assistEnabled").checked),
      peng: {
        count: readInt($("assistPengCount")?.value || "1"),
        manaRegenPct: readNumber($("assistPengRegenPct")?.value || "0"),
        baseSpd: readNumber($("assistPengBaseSpd")?.value || "0"),
        bowSpd: readNumber($("assistPengBowSpd")?.value || "0"),
        shareSpd: readNumber($("assistPengShareSpd")?.value || "0"),
        aPct: readNumber($("assistPengAPct")?.value || "0"),
        aF: readInt($("assistPengAF")?.value || "0"),
        bProb: readNumber($("assistPengBProb")?.value || "0"),
        bF: readInt($("assistPengBF")?.value || "0"),
      },
      tiger: {
        count: readInt($("assistTigerCount")?.value || "1"),
        manaRegenPct: readNumber($("assistTigerRegenPct")?.value || "0"),
        baseSpd: readNumber($("assistTigerBaseSpd")?.value || "0"),
        bowSpd: readNumber($("assistTigerBowSpd")?.value || "0"),
        shareSpd: readNumber($("assistTigerShareSpd")?.value || "0"),
        gaugeMax: readInt($("assistTigerGaugeMax")?.value || "100"),
        aPct: readNumber($("assistTigerAPct")?.value || "0"),
        aF: readInt($("assistTigerAF")?.value || "0"),
        ultReset: $("assistTigerUltReset")?.value || "end",
        ultF: readInt($("assistTigerUltF")?.value || "44"),
        ultStopsGauge: !!($("assistTigerUltStopsGauge") && $("assistTigerUltStopsGauge").checked),
        ultEventType: $("assistTigerUltEventType")?.value || "none",
        ultEventAmount: readNumber($("assistTigerUltEventAmount")?.value || "0"),
      }
    };
  }

  function validateAssistInputs() {
    const cfg = getMutualSpeedAssistConfig();
    if (!cfg.enabled) return [];
    const errs = [];
    const chkCount = (v, label) => { if (!(v >= 1 && v <= 36)) errs.push(`${label}の体数は1〜36`); };
    const chkRate = (v, label) => { if (!(v > 0 && v <= 8)) errs.push(`${label}は0より大きく8.00以下`); };
    const chkPct90 = (v, label) => { if (v < 0 || v > 90) errs.push(`${label}は0〜90.0%`); };
    const chkF = (v, label) => { if (!(v > 0 && v <= 9999)) errs.push(`${label}は1〜9999`); };
    chkCount(cfg.peng.count, 'ペンギン楽師');
    chkCount(cfg.tiger.count, '虎の師父');
    chkRate(cfg.peng.baseSpd, 'ペンギン楽師の基礎速度');
    chkRate(cfg.peng.bowSpd, 'ペンギン楽師の弓の速度');
    chkRate(cfg.peng.shareSpd, 'ペンギン楽師の共有速度');
    chkRate(cfg.tiger.baseSpd, '虎の師父の基礎速度');
    chkRate(cfg.tiger.bowSpd, '虎の師父の弓の速度');
    chkRate(cfg.tiger.shareSpd, '虎の師父の共有速度');
    chkPct90(cfg.peng.aPct, 'ペンギン楽師スキルA確率');
    chkPct90(cfg.peng.bProb, 'ペンギン楽師スキルB確率');
    chkPct90(cfg.tiger.aPct, '虎の師父スキルA確率');
    if (cfg.peng.aPct + cfg.peng.bProb > 100) errs.push('ペンギン楽師のスキルA確率 + スキルB確率 が100%を超えています');
    chkF(cfg.peng.aF, 'ペンギン楽師スキルA F数');
    chkF(cfg.peng.bF, 'ペンギン楽師スキルB F数');
    chkF(cfg.tiger.aF, '虎の師父スキルA F数');
    chkF(cfg.tiger.ultF, '虎の師父究極 F数');
    if (!(cfg.tiger.gaugeMax > 0 && cfg.tiger.gaugeMax <= 999)) errs.push('虎の師父Maxマナは1〜999');
    return errs;
  }

  function buildAssistSimUnit(kind, conf, incomingCoverageSec) {
    const aspd = computeAssistFinalAspd(conf.baseSpd || 0, conf.bowSpd || 0, conf.shareSpd || 0, incomingCoverageSec);
    const sameUnitCount = Math.max(1, Math.min(36, conf.count || 1));
    const v = {
      atk: 1,
      baseSpd: conf.baseSpd || 0,
      bowSpd: conf.bowSpd || 0,
      shareSpd: conf.shareSpd || 0,
      aspd,
      aspdCurrent: computeAssistCurrentAspd(conf.baseSpd || 0, conf.bowSpd || 0, conf.shareSpd || 0),
      gaugeMax: kind === 'tiger' ? Math.max(1, conf.gaugeMax || 100) : 100,
      sameUnitCount,
      manaPerSec: Math.max(0, conf.manaRegenPct || 0) / 100,
      envDiff: 'god', baseDef: DIFF_DEF.god, defReduce: 250, realDef: 250 - DIFF_DEF.god, physMul: computePhysMul(250 - DIFF_DEF.god),
      critChancePct: 0, critPhysBonusPct: 150, critMagicBonusPct: 170, critChance: 0, critPhysBonus: 1.5, critMagicBonus: 1.7, critPhysMul: 1, critMagicMul: 1,
      ultType: kind === 'tiger' ? 'mana' : 'none', ultReset: kind === 'tiger' ? (conf.ultReset || 'end') : 'end', ultMul: 1, ultF: kind === 'tiger' ? Math.max(1, conf.ultF || 44) : 44, ultImpactF: 0,
      ultEventType: kind === 'tiger' ? (conf.ultEventType || 'none') : 'none', ultEventAmount: kind === 'tiger' ? (Math.max(0, conf.ultEventAmount || 0) / 100) : 0, ultStopsGauge: kind === 'tiger' ? !!conf.ultStopsGauge : true, critABShortenUlt2s: false,
      aType:'use', aMul: 1, aP: Math.max(0, conf.aPct || 0) / 100, aF: Math.max(1, conf.aF || 32), aImpactF: kind === 'peng' ? 120 : 80, aUseGainMana5: false,
      bType: kind === 'peng' ? 'prob' : 'none', bMul: 1, bF: kind === 'peng' ? Math.max(1, conf.bF || 40) : 40, bImpactF: 0, bP: kind === 'peng' ? (Math.max(0, conf.bProb || 0) / 100) : 0, bN: 0,
      basicAttr:'phys', basicTarget:'single', aAttr:'phys', aTarget:'single', bAttr:'phys', bTarget:'single', uAttr:'phys', uTarget:'single', supports:[]
    };
    v.ext = calcExternalSupportAgg(v);
    return v;
  }

  function calcMutualSpeedAssist() {
    const cfg = getMutualSpeedAssistConfig();
    const empty = { enabled: false, cfg, cA: 0, cB: 0, p0: 1, p20: 0, p40: 0 };
    if (!cfg.enabled) return empty;
    let covAtoB = 0;
    let covBtoA = 0;
    let finalPeng = null;
    let finalTiger = null;
    for (let i = 0; i < 24; i++) {
      const pengBundle = collectResultBundleSingle(buildAssistSimUnit('peng', cfg.peng, covBtoA));
      const tigerBundle = collectResultBundleSingle(buildAssistSimUnit('tiger', cfg.tiger, covAtoB));
      if (pengBundle.err || tigerBundle.err) return { ...empty, enabled: true, err: pengBundle.err || tigerBundle.err };
      const nextAtoB = clamp01(pengBundle.eff.a.multiCoverageSecPerSec);
      const nextBtoA = clamp01(tigerBundle.eff.a.multiCoverageSecPerSec);
      finalPeng = pengBundle; finalTiger = tigerBundle;
      if (Math.abs(nextAtoB - covAtoB) < 1e-9 && Math.abs(nextBtoA - covBtoA) < 1e-9) { covAtoB = nextAtoB; covBtoA = nextBtoA; break; }
      covAtoB = nextAtoB; covBtoA = nextBtoA;
    }
    if (!finalPeng || !finalTiger) return empty;
    const cA = clamp01(finalPeng.eff.a.multiCoverageSecPerSec);
    const cB = clamp01(finalTiger.eff.a.multiCoverageSecPerSec);
    return { enabled: true, cfg, cA, cB, p0: (1-cA)*(1-cB), p20: cA*(1-cB)+(1-cA)*cB, p40: cA*cB, pengFinalAspd: finalPeng.v.aspd, tigerFinalAspd: finalTiger.v.aspd };
  }

  function updateAssistOutputs(assist) {
    const setVal = (id, text) => { if ($(id)) $(id).value = text; };
    if (!assist || !assist.enabled || assist.err) {
      setVal('assistPengFinalAspd', assist && assist.err ? 'エラー' : '-');
      setVal('assistTigerFinalAspd', assist && assist.err ? 'エラー' : '-');
      setVal('assistCA', '-'); setVal('assistCB', '-'); setVal('assistP0', '-'); setVal('assistP20', '-'); setVal('assistP40', '-');
      return;
    }
    setVal('assistPengFinalAspd', fmtDec(assist.pengFinalAspd, 6));
    setVal('assistTigerFinalAspd', fmtDec(assist.tigerFinalAspd, 6));
    setVal('assistCA', `${fmtDec((assist.cA || 0) * 100, 6)}%`);
    setVal('assistCB', `${fmtDec((assist.cB || 0) * 100, 6)}%`);
    setVal('assistP0', `${fmtDec((assist.p0 || 0) * 100, 6)}%`);
    setVal('assistP20', `${fmtDec((assist.p20 || 0) * 100, 6)}%`);
    setVal('assistP40', `${fmtDec((assist.p40 || 0) * 100, 6)}%`);
  }

  function mergeAssistBundles(v, assist, stateBundles) {
    const weighted = (getter) => stateBundles.reduce((sum, s) => sum + s.prob * getter(s.bundle), 0);
    const totalDPS = weighted((b) => b.res.dps);
    const basicDPS = weighted((b) => b.ex.basicDPS);
    const aDPS = weighted((b) => b.ex.aDPS);
    const bDPS = weighted((b) => b.ex.bDPS);
    const ultDPS = weighted((b) => b.ex.ultDPS);
    const pctOf = (x) => totalDPS > 0 ? (100 * x / totalDPS) : 0;
    const phys = weighted((b) => b.tb.phys);
    const magic = weighted((b) => b.tb.magic);
    const single = weighted((b) => b.tb.single);
    const multi = weighted((b) => b.tb.multi);
    const eff = { unitCount: v.sameUnitCount, a: { ratePerSec: weighted((b) => b.eff.a.ratePerSec), secPerProc: weighted((b) => b.eff.a.secPerProc), rawFPerSec: weighted((b) => b.eff.a.rawFPerSec), singleCoveragePct: weighted((b) => b.eff.a.singleCoveragePct), multiCoveragePct: weighted((b) => b.eff.a.multiCoveragePct) }, b: { ratePerSec: weighted((b) => b.eff.b.ratePerSec), secPerProc: weighted((b) => b.eff.b.secPerProc), rawFPerSec: weighted((b) => b.eff.b.rawFPerSec), singleCoveragePct: weighted((b) => b.eff.b.singleCoveragePct), multiCoveragePct: weighted((b) => b.eff.b.multiCoveragePct) }, u: { ratePerSec: weighted((b) => b.eff.u.ratePerSec), secPerProc: weighted((b) => b.eff.u.secPerProc), rawFPerSec: weighted((b) => b.eff.u.rawFPerSec), singleCoveragePct: weighted((b) => b.eff.u.singleCoveragePct), multiCoveragePct: weighted((b) => b.eff.u.multiCoveragePct) } };
    return { v, res: { dps: totalDPS, detail: { mode:'assistStates' } }, ex: { basicDPS, aDPS, bDPS, ultDPS, basicPct: pctOf(basicDPS), aPct: pctOf(aDPS), bPct: pctOf(bDPS), ultPct: pctOf(ultDPS), basicPerSec: weighted((b) => b.ex.basicPerSec), aPerSec: weighted((b) => b.ex.aPerSec), bPerSec: weighted((b) => b.ex.bPerSec), ultPerSec: weighted((b) => b.ex.ultPerSec), physCritGainPct:0, magicCritGainPct:0, checkTotalDPS: totalDPS }, eff, tb: { phys, magic, single, multi, physPct: pctOf(phys), magicPct: pctOf(magic), singlePct: pctOf(single), multiPct: pctOf(multi) }, br: null, assistMode: true, assist, assistStates: stateBundles.map((s) => ({ label:s.label, prob:s.prob, dps:s.bundle.res.dps, aspd:s.bundle.v.aspd })) };
  }

  function buildAssistDetailHtml(bundle) {
    const { assist, assistStates, ex } = bundle;
    const line = (t) => `<div>${t}</div>`;
    let html = '';
    html += line(`楽師 最終攻速: <span class="hlVal valSpd">${r6(assist.pengFinalAspd)}</span> / 師父 最終攻速: <span class="hlVal valSpd">${r6(assist.tigerFinalAspd)}</span>`);
    html += line(`楽師→Z 被覆率: <span class="hlVal valA">${r6(assist.cA * 100)}%</span> / 師父→Z 被覆率: <span class="hlVal valB">${r6(assist.cB * 100)}%</span>`);
    html += line(`0%帯: <span class="hlVal valMix">${r6(assist.p0 * 100)}%</span> / 20%帯: <span class="hlVal valMix">${r6(assist.p20 * 100)}%</span> / 40%帯: <span class="hlVal valMix">${r6(assist.p40 * 100)}%</span>`);
    assistStates.forEach((state) => { html += line(`${state.label}: 攻速 <span class="hlVal valSpd">${r6(state.aspd)}</span> / DPS <span class="hlVal valMix">${r6(state.dps)}</span> / 割合 <span class="hlVal valMix">${r6(state.prob * 100)}%</span>`); });
    html += line(`期待DPS = <span class="hlVal valMix">${r6(bundle.res.dps)}</span>`);
    html += line(`内訳: 基本 ${r6(ex.basicPct)}% / A ${r6(ex.aPct)}% / B ${r6(ex.bPct)}% / 究極 ${r6(ex.ultPct)}%`);
    return html;
  }

  function buildAssistFormulaHtml(bundle) {
    const { assist, assistStates } = bundle;
    const lines = [];
    lines.push(`cA = 楽師→Z 被覆率 = ${r6(assist.cA)}`);
    lines.push(`cB = 師父→Z 被覆率 = ${r6(assist.cB)}`);
    lines.push(`P0 = (1-cA)(1-cB) = ${r6(assist.p0)}`);
    lines.push(`P20 = cA(1-cB) + (1-cA)cB = ${r6(assist.p20)}`);
    lines.push(`P40 = cA×cB = ${r6(assist.p40)}`);
    assistStates.forEach((state) => lines.push(`${state.label} DPS = ${r6(state.dps)}（攻速 ${r6(state.aspd)}）`));
    const s0 = assistStates.find((s) => s.label === '0%帯');
    const s20 = assistStates.find((s) => s.label === '20%帯');
    const s40 = assistStates.find((s) => s.label === '40%帯');
    lines.push(`期待DPS = ${r6(assist.p0)}×${r6(s0 ? s0.dps : 0)} + ${r6(assist.p20)}×${r6(s20 ? s20.dps : 0)} + ${r6(assist.p40)}×${r6(s40 ? s40.dps : 0)}`);
    lines.push(`= ${r6(bundle.res.dps)}`);
    return lines.join('<br>');
  }

  function syncUiState() {
    syncUltType();
    syncSkillAMode();
    syncSkillBMode();
    syncExternalSupportRows();
    syncSegmentsFromHidden();
    syncEnvDerivedUI();
    syncAttackSpeedInputs();
    syncAssistAttackSpeedInputs();
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
    const assist = calcMutualSpeedAssist();
    updateAssistOutputs(assist);
    if (assist.enabled) {
      if (assist.err) return { v, err: assist.err, assistMode: true, assist };
      const stateBundles = [
        { label: '0%帯', prob: assist.p0, bonusPct: 0 },
        { label: '20%帯', prob: assist.p20, bonusPct: 20 },
        { label: '40%帯', prob: assist.p40, bonusPct: 40 },
      ].map((state) => {
        const stateV = { ...v, aspd: clampAspd(v.baseSpd * (v.bowSpd + (v.ext?.tempSpeedBowAdd || 0) + (state.bonusPct / 100)) * v.shareSpd) };
        return { ...state, bundle: collectResultBundleSingle(stateV) };
      });
      for (const s of stateBundles) if (s.bundle.err) return { v, err: s.bundle.err, assistMode: true, assist };
      return mergeAssistBundles(v, assist, stateBundles);
    }
    return collectResultBundleSingle(v);
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

    if (bundle.assistMode) {
      $("detailOut").innerHTML = buildAssistDetailHtml(bundle);
      $("detailLegend").innerHTML = buildLegendHtml();
      $("formulaOut").innerHTML = buildAssistFormulaHtml(bundle);
      $("formulaLegend").innerHTML = buildLegendHtml();
    } else {
      $("detailOut").innerHTML = buildDetailHtml(v, res, ex, eff, tb, br);
      $("detailLegend").innerHTML = buildLegendHtml();
      $("formulaOut").innerHTML = buildFormulaHtml(v, res, ex, eff, tb, br);
      $("formulaLegend").innerHTML = buildLegendHtml();
    }
  }

function render() {
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
    const state = { ...(v || {}) };
    if ((state.baseSpd == null || state.baseSpd === "") && state.aspd != null) {
      state.baseSpd = state.aspd;
      state.bowSpd = state.bowSpd ?? "1";
      state.shareSpd = state.shareSpd ?? "1";
    }
    if ((state.assistPengBaseSpd == null || state.assistPengBaseSpd === "") && state.assistPengAspd != null) {
      state.assistPengBaseSpd = state.assistPengAspd;
      state.assistPengBowSpd = state.assistPengBowSpd ?? "1";
      state.assistPengShareSpd = state.assistPengShareSpd ?? "1";
    }
    if ((state.assistTigerBaseSpd == null || state.assistTigerBaseSpd === "") && state.assistTigerAspd != null) {
      state.assistTigerBaseSpd = state.assistTigerAspd;
      state.assistTigerBowSpd = state.assistTigerBowSpd ?? "1";
      state.assistTigerShareSpd = state.assistTigerShareSpd ?? "1";
    }
    if (state.aType == null || state.aType === "") state.aType = "use";
    for (const [k, val] of Object.entries(state)) {
      const el = $(k);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!val;
      else el.value = val;
    }
    syncAttackSpeedInputs();
    syncAssistAttackSpeedInputs();
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
      applyFormState(JSON.parse(found.raw));
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
    $("baseSpd").value = "2.40";
    $("bowSpd").value = "1.00";
    $("shareSpd").value = "1.00";
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

    $("aType").value = "use";
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
      $("ext" + i + "ImpactF").value = "";
      $("ext" + i + "Count").value = "1";
    }

    if ($("assistEnabled")) $("assistEnabled").checked = false;
    if ($("assistPengCount")) $("assistPengCount").value = "1";
    if ($("assistPengRegenPct")) $("assistPengRegenPct").value = "100%";
    if ($("assistPengBaseSpd")) $("assistPengBaseSpd").value = "2.40";
    if ($("assistPengBowSpd")) $("assistPengBowSpd").value = "1.00";
    if ($("assistPengShareSpd")) $("assistPengShareSpd").value = "1.00";
    if ($("assistPengAspd")) $("assistPengAspd").value = "2.40";
    if ($("assistPengAPct")) $("assistPengAPct").value = "10.0%";
    if ($("assistPengAF")) $("assistPengAF").value = "32";
    if ($("assistPengBProb")) $("assistPengBProb").value = "0.0%";
    if ($("assistPengBF")) $("assistPengBF").value = "40";
    if ($("assistTigerCount")) $("assistTigerCount").value = "1";
    if ($("assistTigerRegenPct")) $("assistTigerRegenPct").value = "100%";
    if ($("assistTigerBaseSpd")) $("assistTigerBaseSpd").value = "2.40";
    if ($("assistTigerBowSpd")) $("assistTigerBowSpd").value = "1.00";
    if ($("assistTigerShareSpd")) $("assistTigerShareSpd").value = "1.00";
    if ($("assistTigerAspd")) $("assistTigerAspd").value = "2.40";
    if ($("assistTigerGaugeMax")) $("assistTigerGaugeMax").value = "100";
    if ($("assistTigerAPct")) $("assistTigerAPct").value = "10.0%";
    if ($("assistTigerAF")) $("assistTigerAF").value = "32";
    if ($("assistTigerUltReset")) $("assistTigerUltReset").value = "end";
    if ($("assistTigerUltF")) $("assistTigerUltF").value = "44";
    if ($("assistTigerUltStopsGauge")) $("assistTigerUltStopsGauge").checked = true;
    if ($("assistTigerUltEventType")) $("assistTigerUltEventType").value = "none";
    if ($("assistTigerUltEventAmount")) $("assistTigerUltEventAmount").value = "0%";

    $("showNotes").checked = false;
  }

  syncUiState();

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