(() => {
  const F = 40;
  // ---------- PVカウント（SupabaseへINSERT） ----------
  const PV_SITE_NAME = "BaseDPS";
  const SUPABASE_URL = "https://teggcuiyqkbcvbhdntni.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioK";

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
      }).catch(() => {});
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

  let _rafPending = false;
  function scheduleRender() {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(() => {
      _rafPending = false;
      validateAndRender();
    });
  }

  const addComma = (nStr) => String(nStr).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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

  function toProbPctDisplay(raw) {
    const t = trimDecimals(raw, 1);
    if (!t) return "";
    const x = parseFloat(t);
    const v = isFinite(x) ? x : 0;
    return `${v.toFixed(1)}%`;
  }

  function toAspdDisplay(raw) {
    const t = trimDecimals(raw, 2);
    if (!t) return "";
    const x = parseFloat(t);
    const v = isFinite(x) ? x : 0;
    return v.toFixed(2);
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
    setDisabledRegen(ultType !== "mana");
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
      lbl.textContent = "規定回数";
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

  function initBindings() {
    bindField($("atk"), (v)=>sanitizeIntKeepComma(v,6), (v)=>toAtkDisplay(v));
    bindField($("aspd"), (v)=>trimDecimalsLive(v,2), (v)=>toAspdDisplay(v));
    bindField($("gaugeMax"), (v)=>sanitizeIntKeepComma(v,3), (v)=>toIntDisplay(v,3));

    bindField($("manaRegenPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,4));

    bindField($("ultMulPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("ultF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

    bindField($("aMulPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("aPPct"), (v)=>trimDecimalsLive(v,1), (v)=>toProbPctDisplay(v));
    bindField($("aF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

    bindField($("bMulPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("bF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

    $("bThird").addEventListener("input", () => {
      const bType = $("bType").value;
      if (bType === "prob") $("bThird").value = trimDecimalsLive($("bThird").value, 1);
      else if (bType === "count") $("bThird").value = sanitizeIntKeepComma($("bThird").value, 2);
      else $("bThird").value = "0.0%";
    });
    const commitBThird = () => {
      const bType = $("bType").value;
      if (bType === "prob") $("bThird").value = toProbPctDisplay($("bThird").value);
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
    $("bType").addEventListener("change", () => { syncSkillBMode(); validateAndRender(); });

    $("calcBtn").addEventListener("click", () => { normalizeAll(); validateAndRender(); });
    $("saveBtn").addEventListener("click", save);
    $("loadBtn").addEventListener("click", load);
    $("resetBtn").addEventListener("click", resetAll);
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

      // 初期状態：openクラスがあれば開く
      body.style.display = card.classList.contains("open") ? "block" : "none";

      h.addEventListener("click", (e) => {
        // トグル操作中はアコーディオンを開閉しない
        if (e.target && e.target.closest && e.target.closest(".seg")) return;

        card.classList.toggle("open");
        body.style.display = card.classList.contains("open") ? "block" : "none";
      });
    });
  }


  function normalizeAll() {
    $("atk").value = toAtkDisplay($("atk").value);
    $("aspd").value = toAspdDisplay($("aspd").value);
    $("gaugeMax").value = toIntDisplay($("gaugeMax").value, 3);
    $("manaRegenPct").value = toPctDisplay($("manaRegenPct").value, 1, 4);
    $("defReduce").value = toIntDisplay($("defReduce").value, 3);
    syncEnvDerivedUI();

    $("ultMulPct").value = toPctDisplay($("ultMulPct").value, 1, 6);
    $("ultF").value = toIntDisplay($("ultF").value, 4);

    $("aMulPct").value = toPctDisplay($("aMulPct").value, 1, 6);
    $("aPPct").value = toProbPctDisplay($("aPPct").value);
    $("aF").value = toIntDisplay($("aF").value, 4);

    $("bMulPct").value = toPctDisplay($("bMulPct").value, 1, 6);
    $("bF").value = toIntDisplay($("bF").value, 4);

    syncSkillBMode();
    syncSegmentsFromHidden();
    syncEnvDerivedUI();
    if ($("bType").value === "prob") $("bThird").value = toProbPctDisplay($("bThird").value);
    if ($("bType").value === "count") $("bThird").value = String(readInt($("bThird").value));
  }

  function getValInternal() {
    const atk = readInt($("atk").value);
    const aspd = readNumber($("aspd").value);
    const gaugeMax = readInt($("gaugeMax").value);

    const regenPct = readNumber($("manaRegenPct").value);
    const manaPerSec = regenPct / 100;

    const envDiff = $("envDiff").value;
    const baseDef = DIFF_DEF[envDiff] ?? 148;
    const defReduce = readInt($("defReduce").value);
    const realDef = defReduce - baseDef;
    const physMul = computePhysMul(realDef);

    const ultType = $("ultType").value;
    const ultReset = $("ultReset").value;
    const ultMul = readNumber($("ultMulPct").value) / 100;
    const ultF = readInt($("ultF").value);
    const ultStopsGauge = $("ultStopsGauge").checked;

    const aMul = readNumber($("aMulPct").value) / 100;
    const aP = readNumber($("aPPct").value) / 100;
    const aF = readInt($("aF").value);

    const bType = $("bType").value;
    const bMul = readNumber($("bMulPct").value) / 100;
    const bF = readInt($("bF").value);

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

    return { atk, aspd, gaugeMax, manaPerSec, envDiff, baseDef, defReduce, realDef, physMul, ultType, ultReset, ultMul, ultF, ultStopsGauge, aMul, aP, aF, bType, bMul, bF, bP, bN,
      basicAttr, basicTarget, aAttr, aTarget, bAttr, bTarget, uAttr, uTarget };
  }

  function clearErrAll() {
    const ids = ["atk","aspd","gaugeMax","manaRegenPct","defReduce","ultMulPct","ultF","aMulPct","aPPct","aF","bMulPct","bThird","bF"];
    ids.forEach(id => setErr($(id), false));
    setLblErr($("regenLbl"), false);
  }

  function validateInputs() {
    clearErrAll();
    const errors = [];

    const atk = readInt($("atk").value);
    if (atk <= 0) { setErr($("atk"), true); errors.push("攻撃力は1以上"); }

    const aspd = readNumber($("aspd").value);
    if (!(aspd > 0 && aspd <= 8)) { setErr($("aspd"), true); errors.push("攻撃速度は0より大きく8.00以下"); }

    const gaugeMax = readInt($("gaugeMax").value);
    if (gaugeMax <= 0) { setErr($("gaugeMax"), true); errors.push("Maxマナ(CT)は1以上"); }

    const defReduce = readInt($("defReduce").value);
    if (defReduce < 0 || defReduce > 999) { setErr($("defReduce"), true); errors.push("防御力減少値は0〜999"); }

    const ultType = $("ultType").value;
    if (ultType !== "none") {
      const ultF = readInt($("ultF").value);
      if (ultF <= 0) { setErr($("ultF"), true); errors.push("究極のＦ数は1以上"); }
    }

    const aPpct = readNumber($("aPPct").value);
    if (aPpct < 0 || aPpct > 90) { setErr($("aPPct"), true); errors.push("スキルA確率は0〜90.0%"); }

    const bType = $("bType").value;
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

    return errors;
  }

  function calcNonUlt(v) {
    const T0 = F / v.aspd;
    const pA = clamp01(v.aP);
    const mA = v.aMul;
    const fA = v.aF;

    if (v.bType === "count") {
      const N = v.bN;
      const mB = v.bMul;
      const fB = v.bF;

      if (!(N > 0)) return { err: "スキルB（規定回数）の規定回数が0以下です" };
      if (pA >= 1) return { err: "スキルA確率が1以上です（規定回数タイプは未定義）" };

      const EA = (N + 1) * pA / (1 - pA);
      const expFrames = T0 * N + fA * EA + fB;
      const expDamage = v.atk * (N * 1 + mA * EA + mB);

      const nonUltDPS = expDamage / (expFrames / F);
      const basicPerFrame = N / expFrames;

      return { mode:"countB", T0, pA, EA, expFrames, expDamage, nonUltDPS, basicPerFrame };
    }

    const pB = (v.bType === "prob") ? clamp01(v.bP) : 0;
    const mB = (v.bType === "prob") ? v.bMul : 0;
    const fB = (v.bType === "prob") ? v.bF : 0;

    const p0 = clamp01(1 - pA - pB);

    const avgFrames = T0 * p0 + fA * pA + fB * pB;
    const avgMul = 1 * p0 + mA * pA + mB * pB;

    const nonUltDPS = (v.atk * avgMul) / (avgFrames / F);
    const basicPerFrame = p0 / avgFrames;

    return { mode:"prob", T0, pA, pB, p0, avgFrames, avgMul, nonUltDPS, basicPerFrame };
  }

  function calcTotal(v) {
    const nu = calcNonUlt(v);
    if (nu.err) return { err: nu.err };

    if (v.ultType === "none") {
      const pm = (isFinite(v.physMul) ? v.physMul : 1);
      const split = calcNonUltDpsSplit(v, nu);
      const nonUltDPS_adj0 = split.phys * pm + split.magic;
      return { dps: nonUltDPS_adj0, detail: { ...nu, nonUltDPS_adj: nonUltDPS_adj0, cycleFrames: NaN, cycleDamage: NaN, framesNonUltToReady: NaN } };
    }


    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const ultDamage = v.atk * v.ultMul * (v.uAttr === "phys" ? pm : 1);
    const split = calcNonUltDpsSplit(v, nu);
    const nonUltDPS_adj = split.phys * pm + split.magic;

    if (v.ultType === "mana") {
      const timeManaPerFrame_nonUlt = v.manaPerSec / F; // 期待値（平均）
      const basicManaPerFrame_nonUlt = nu.basicPerFrame * 1;
      const manaPerFrame_nonUlt = timeManaPerFrame_nonUlt + basicManaPerFrame_nonUlt;

      if (!(manaPerFrame_nonUlt > 0)) {
        return { err: "マナが増加しないため、究極に到達しません（Regeと基本攻撃率を確認）" };
      }

      let framesNonUltToReady, cycleFrames, cycleDamage;

      if (v.ultReset === "end") {
        framesNonUltToReady = v.gaugeMax / manaPerFrame_nonUlt;
        cycleFrames = framesNonUltToReady + v.ultF;
        cycleDamage = nonUltDPS_adj * (framesNonUltToReady / F) + ultDamage;
      } else {
        const timeManaPerFrame_ult = (v.ultStopsGauge ? 0 : (v.manaPerSec / F));
        const manaGainDuringUlt = timeManaPerFrame_ult * v.ultF;

        const remain = Math.max(0, v.gaugeMax - manaGainDuringUlt);
        framesNonUltToReady = remain / manaPerFrame_nonUlt;

        cycleFrames = v.ultF + framesNonUltToReady;
        cycleDamage = ultDamage + nonUltDPS_adj * (framesNonUltToReady / F);
      }

      const dps = cycleDamage / (cycleFrames / F);
      return { dps, detail: { ...nu, timeManaPerFrame_nonUlt, basicManaPerFrame_nonUlt, manaPerFrame_nonUlt, framesNonUltToReady, cycleFrames, cycleDamage } };
    }

    if (v.ultType === "cool") {
      const coolPerFrame_nonUlt = 1 / F;

      let framesNonUltToReady, cycleFrames, cycleDamage;

      if (v.ultReset === "end") {
        framesNonUltToReady = v.gaugeMax / coolPerFrame_nonUlt;
        cycleFrames = framesNonUltToReady + v.ultF;
        cycleDamage = nonUltDPS_adj * (framesNonUltToReady / F) + ultDamage;
      } else {
        const coolPerFrame_ult = (v.ultStopsGauge ? 0 : (1 / F));
        const coolGainDuringUlt = coolPerFrame_ult * v.ultF;

        const remain = Math.max(0, v.gaugeMax - coolGainDuringUlt);
        framesNonUltToReady = remain / coolPerFrame_nonUlt;

        cycleFrames = v.ultF + framesNonUltToReady;
        cycleDamage = ultDamage + nonUltDPS_adj * (framesNonUltToReady / F);
      }

      const dps = cycleDamage / (cycleFrames / F);
      return { dps, detail: { ...nu, coolPerFrame_nonUlt, framesNonUltToReady, cycleFrames, cycleDamage } };
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
      const N = v.bN;
      const EA = d.EA;
      basicPerSec_nonUlt = N / secPerUnit;
      aPerSec_nonUlt = EA / secPerUnit;
      bPerSec_nonUlt = 1 / secPerUnit;
      actPerSec_nonUlt = (N + EA + 1) / secPerUnit;
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
    const basicDPS = basicDPS0 * (v.basicAttr === "phys" ? pm : 1);
    const aDPS = aDPS0 * (v.aAttr === "phys" ? pm : 1);
    const bDPS = bDPS0 * (v.bAttr === "phys" ? pm : 1);
    const ultDPS = ultDPS0 * (v.uAttr === "phys" ? pm : 1);

    const sum = basicDPS + aDPS + bDPS + ultDPS;
const pct = (x) => (sum > 0 ? (100 * x / sum) : 0);

    return {
      nonUltFrac,
      actPerSec, basicPerSec, aPerSec, bPerSec, ultPerSec,
      basicDPS, aDPS, bDPS, ultDPS,
      basicPct: pct(basicDPS), aPct: pct(aDPS), bPct: pct(bDPS), ultPct: pct(ultDPS),
      checkTotalDPS: sum,
    };
  }

  
  function calcNonUltDpsSplit(v, d) {
    // Expected non-ultimate DPS split by attribute (physical / magic), based on current skill mode.
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
      return {
        phys: v.atk * physW / denom,
        magic: v.atk * magW / denom,
      };
    } else {
      const N = v.bN;
      const pA = v.aP;
      const fA = v.aF;
      const fB = v.bF;
      const T0 = d.T0;
      const EA = (N + 1) * pA / (1 - pA);
      const expFrames = T0 * N + fA * EA + fB;
      const denom = expFrames / 40;

      const physW = (v.basicAttr === "phys" ? N * 1 : 0)
                  + (v.aAttr === "phys" ? EA * mA : 0)
                  + (v.bAttr === "phys" ? 1 * mB : 0);
      const magW  = (v.basicAttr === "magic" ? N * 1 : 0)
                  + (v.aAttr === "magic" ? EA * mA : 0)
                  + (v.bAttr === "magic" ? 1 * mB : 0);
      return {
        phys: v.atk * physW / denom,
        magic: v.atk * magW / denom,
      };
    }
  }
function calcBoundaryRange(v, res) {
    if (v.ultType === "none") return null;
    if (v.ultReset !== "start") return null;
    if (v.ultStopsGauge) return null;

    const d = res.detail;
    const minTick = Math.floor(v.ultF / 40);
    const maxTick = Math.ceil(v.ultF / 40);
    if (minTick === maxTick) return null;

    const perTick = (v.ultType === "mana") ? v.manaPerSec : 1;
    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const ultDamage = v.atk * v.ultMul * (v.uAttr === "phys" ? pm : 1);
    const split = calcNonUltDpsSplit(v, d);
    const nonUltDPS_adj = split.phys * pm + split.magic;

    function dpsFromTick(ticks) {
      const gain = ticks * perTick;
      const remain = Math.max(0, v.gaugeMax - gain);

      let framesNonUltToReady;
      if (v.ultType === "mana") {
        const manaPerFrame_nonUlt = d.manaPerFrame_nonUlt;
        if (!(manaPerFrame_nonUlt > 0)) return NaN;
        framesNonUltToReady = remain / manaPerFrame_nonUlt;
      } else {
        const coolPerFrame_nonUlt = 1 / 40;
        framesNonUltToReady = remain / coolPerFrame_nonUlt;
      }

      const cycleFrames = v.ultF + framesNonUltToReady;
      const cycleDamage = ultDamage + nonUltDPS_adj * (framesNonUltToReady / 40);
      return cycleDamage / (cycleFrames / 40);
    }

    const dps1 = dpsFromTick(minTick);
    const dps2 = dpsFromTick(maxTick);
    if (!isFinite(dps1) || !isFinite(dps2)) return null;

    return { minTick, maxTick, lo: Math.min(dps1, dps2), hi: Math.max(dps1, dps2), perTick };
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

  function buildFormulaText(v, res, ex, tb, br) {
    const d = res.detail;
    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const baseDef = DIFF_DEF[v.envDiff] ?? 175;
    const realDef = v.defReduce - baseDef;
    const hasUlt = (v.ultType !== "none");

    const lines = [];
    lines.push("=== 行動レート～検算 の算出式 ===");

    if (d.mode === "prob") {
      const actPerSec_nonUlt = 40 / d.avgFrames;
      const basicPerSec_nonUlt = actPerSec_nonUlt * d.p0;
      const aPerSec_nonUlt = actPerSec_nonUlt * d.pA;
      const bPerSec_nonUlt = actPerSec_nonUlt * d.pB;
      const ultPerSec = hasUlt ? (40 / d.cycleFrames) : 0;

      lines.push("■ 行動レート（通常抽選型）");
      lines.push("基本攻撃モーションF = 40 / 攻撃速度");
      lines.push(`  = 40 / ${r6(v.aspd)} = ${r6(d.T0)}`);
      lines.push("基本攻撃確率 = 1 − スキルA確率 − スキルB確率");
      lines.push(`  = 1 − ${r6(d.pA)} − ${r6(d.pB)} = ${r6(d.p0)}`);
      lines.push("平均行動F = 基本攻撃確率×基本攻撃モーションF + スキルA確率×スキルA_F数 + スキルB確率×スキルB_F数");
      lines.push(`  = ${r6(d.p0)}×${r6(d.T0)} + ${r6(d.pA)}×${v.aF} + ${r6(d.pB)}×${v.bF} = ${r6(d.avgFrames)}`);
      lines.push("非究極時の行動合計毎秒 = 40 / 平均行動F");
      lines.push(`  = 40 / ${r6(d.avgFrames)} = ${r6(actPerSec_nonUlt)}`);
      lines.push("非究極時の基本攻撃毎秒 = 非究極時の行動合計毎秒 × 基本攻撃確率");
      lines.push(`  = ${r6(actPerSec_nonUlt)} × ${r6(d.p0)} = ${r6(basicPerSec_nonUlt)}`);
      lines.push("非究極時のスキルA毎秒 = 非究極時の行動合計毎秒 × スキルA確率");
      lines.push(`  = ${r6(actPerSec_nonUlt)} × ${r6(d.pA)} = ${r6(aPerSec_nonUlt)}`);
      lines.push("非究極時のスキルB毎秒 = 非究極時の行動合計毎秒 × スキルB確率");
      lines.push(`  = ${r6(actPerSec_nonUlt)} × ${r6(d.pB)} = ${r6(bPerSec_nonUlt)}`);
      lines.push("非究極時間比率 = 非究極F / 周期F");
      lines.push(`  = ${r6(d.framesNonUltToReady)} / ${r6(d.cycleFrames)} = ${r6(ex.nonUltFrac)}`);
      if (hasUlt) {
        lines.push("究極毎秒 = 40 / 周期F");
        lines.push(`  = 40 / ${r6(d.cycleFrames)} = ${r6(ultPerSec)}`);
      } else {
        lines.push("究極毎秒 = 0（究極なし）");
      }
      lines.push("基本攻撃毎秒（究極時間込み平均） = 非究極時の基本攻撃毎秒 × 非究極時間比率");
      lines.push(`  = ${r6(basicPerSec_nonUlt)} × ${r6(ex.nonUltFrac)} = ${r6(ex.basicPerSec)}`);
      lines.push("スキルA毎秒（究極時間込み平均） = 非究極時のスキルA毎秒 × 非究極時間比率");
      lines.push(`  = ${r6(aPerSec_nonUlt)} × ${r6(ex.nonUltFrac)} = ${r6(ex.aPerSec)}`);
      lines.push("スキルB毎秒（究極時間込み平均） = 非究極時のスキルB毎秒 × 非究極時間比率");
      lines.push(`  = ${r6(bPerSec_nonUlt)} × ${r6(ex.nonUltFrac)} = ${r6(ex.bPerSec)}`);
      lines.push("行動合計毎秒（究極時間込み平均） = 非究極時の行動合計毎秒 × 非究極時間比率 + 究極毎秒");
      lines.push(`  = ${r6(actPerSec_nonUlt)} × ${r6(ex.nonUltFrac)} + ${r6(ultPerSec)} = ${r6(ex.actPerSec)}`);
      lines.push("");
    } else {
      const secPerUnit = d.expFrames / 40;
      const actPerSec_nonUlt = (v.bN + d.EA + 1) / secPerUnit;
      lines.push("■ 行動レート（スキルB=規定回数型）");
      lines.push("基本攻撃モーションF = 40 / 攻撃速度");
      lines.push(`  = 40 / ${r6(v.aspd)} = ${r6(d.T0)}`);
      lines.push("EA = (規定回数 + 1) × p / (1 − p)");
      lines.push(`  = (${v.bN} + 1) × ${r6(d.pA)} / (1 − ${r6(d.pA)}) = ${r6(d.EA)}`);
      lines.push("非究極周期F = 基本攻撃モーションF×規定回数 + スキルA_F数×EA + スキルB_F数");
      lines.push(`  = ${r6(d.T0)}×${v.bN} + ${v.aF}×${r6(d.EA)} + ${v.bF} = ${r6(d.expFrames)}`);
      lines.push("非究極周期秒 = 非究極周期F / 40");
      lines.push(`  = ${r6(d.expFrames)} / 40 = ${r6(secPerUnit)}`);
      lines.push("非究極時の基本攻撃毎秒 = 規定回数 / 非究極周期秒");
      lines.push(`  = ${v.bN} / ${r6(secPerUnit)} = ${r6(ex.basicPerSec / ex.nonUltFrac)}`);
      lines.push("非究極時のスキルA毎秒 = EA / 非究極周期秒");
      lines.push(`  = ${r6(d.EA)} / ${r6(secPerUnit)} = ${r6(ex.aPerSec / ex.nonUltFrac)}`);
      lines.push("非究極時のスキルB毎秒 = 1 / 非究極周期秒");
      lines.push(`  = 1 / ${r6(secPerUnit)} = ${r6(ex.bPerSec / ex.nonUltFrac)}`);
      lines.push("行動合計毎秒（究極時間込み平均） = 非究極時の行動合計毎秒 × 非究極時間比率 + 究極毎秒");
      lines.push(`  = ${r6(actPerSec_nonUlt)} × ${r6(ex.nonUltFrac)} + ${r6(ex.ultPerSec)} = ${r6(ex.actPerSec)}`);
      lines.push("");
    }

    lines.push("■ 環境（物理補正）");
    lines.push("80w防御力 = 難易度に対応する値");
    lines.push(`  = ${v.envDiff} → ${baseDef}`);
    lines.push("実防御力 = 防御力減少値 − 80w防御力");
    lines.push(`  = ${v.defReduce} − ${baseDef} = ${realDef}`);
    lines.push("物理補正倍率(raw) = 1 × (1 + (SIGN(実防御力) × (1 − 50 / (3×ABS(実防御力)+50))))");
    lines.push(`  = 1 × (1 + (${Math.sign(realDef)} × (1 − 50 / (3×${Math.abs(realDef)}+50)))) = ${r6(1 * (1 + (Math.sign(realDef) * (1 - 50 / (3 * Math.abs(realDef) + 50)))))}`);
    lines.push("物理補正倍率 = 上式を小数第3位四捨五入");
    lines.push(`  = ${pm.toFixed(2)}`);
    lines.push("");

    const basicRaw = ex.basicPerSec * v.atk * 1;
    const aRaw = ex.aPerSec * v.atk * v.aMul;
    const bRaw = ex.bPerSec * v.atk * ((v.bType === "none") ? 0 : v.bMul);
    const uRaw = ex.ultPerSec * v.atk * (hasUlt ? v.ultMul : 0);

    const basicCoef = v.basicAttr === "phys" ? pm : 1;
    const aCoef = v.aAttr === "phys" ? pm : 1;
    const bCoef = v.bAttr === "phys" ? pm : 1;
    const uCoef = v.uAttr === "phys" ? pm : 1;

    lines.push("■ ダメージ内訳（DPS成分）");
    lines.push("基本DPS成分 = 基本攻撃毎秒 × 攻撃力 × 1 × 物理補正係数");
    lines.push(`  = ${r6(ex.basicPerSec)} × ${r6(v.atk)} × 1 × ${r6(basicCoef)} = ${r6(ex.basicDPS)}`);
    lines.push("スキルA DPS成分 = スキルA毎秒 × 攻撃力 × スキルA倍率 × 物理補正係数");
    lines.push(`  = ${r6(ex.aPerSec)} × ${r6(v.atk)} × ${r6(v.aMul)} × ${r6(aCoef)} = ${r6(ex.aDPS)}`);
    lines.push("スキルB DPS成分 = スキルB毎秒 × 攻撃力 × スキルB倍率 × 物理補正係数");
    lines.push(`  = ${r6(ex.bPerSec)} × ${r6(v.atk)} × ${r6((v.bType === "none") ? 0 : v.bMul)} × ${r6(bCoef)} = ${r6(ex.bDPS)}`);
    lines.push("究極DPS成分 = 究極毎秒 × 攻撃力 × 究極倍率 × 物理補正係数");
    lines.push(`  = ${r6(ex.ultPerSec)} × ${r6(v.atk)} × ${r6(hasUlt ? v.ultMul : 0)} × ${r6(uCoef)} = ${r6(ex.ultDPS)}`);
    lines.push("基本割合(%) = 基本DPS成分 / 内訳合計DPS × 100");
    lines.push(`  = ${r6(ex.basicDPS)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(ex.basicPct)}`);
    lines.push("スキルA割合(%) = スキルA DPS成分 / 内訳合計DPS × 100");
    lines.push(`  = ${r6(ex.aDPS)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(ex.aPct)}`);
    lines.push("スキルB割合(%) = スキルB DPS成分 / 内訳合計DPS × 100");
    lines.push(`  = ${r6(ex.bDPS)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(ex.bPct)}`);
    lines.push("究極割合(%) = 究極DPS成分 / 内訳合計DPS × 100");
    lines.push(`  = ${r6(ex.ultDPS)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(ex.ultPct)}`);
    lines.push("");

    lines.push("■ 属性内訳（物理/魔法）");
    lines.push("物理DPS = 物理属性に属する各DPS成分の合計");
    lines.push(`  = ${v.basicAttr === "phys" ? r6(ex.basicDPS) : 0} + ${v.aAttr === "phys" ? r6(ex.aDPS) : 0} + ${v.bAttr === "phys" ? r6(ex.bDPS) : 0} + ${v.uAttr === "phys" ? r6(ex.ultDPS) : 0} = ${r6(tb.phys)}`);
    lines.push("魔法DPS = 魔法属性に属する各DPS成分の合計");
    lines.push(`  = ${v.basicAttr === "magic" ? r6(ex.basicDPS) : 0} + ${v.aAttr === "magic" ? r6(ex.aDPS) : 0} + ${v.bAttr === "magic" ? r6(ex.bDPS) : 0} + ${v.uAttr === "magic" ? r6(ex.ultDPS) : 0} = ${r6(tb.magic)}`);
    lines.push("物理割合(%) = 物理DPS / 内訳合計DPS × 100");
    lines.push(`  = ${r6(tb.phys)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(tb.physPct)}`);
    lines.push("魔法割合(%) = 魔法DPS / 内訳合計DPS × 100");
    lines.push(`  = ${r6(tb.magic)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(tb.magicPct)}`);
    lines.push("");

    lines.push("■ 特性内訳（単体/複数）");
    lines.push("単体DPS = 単体に属する各DPS成分の合計");
    lines.push(`  = ${v.basicTarget === "single" ? r6(ex.basicDPS) : 0} + ${v.aTarget === "single" ? r6(ex.aDPS) : 0} + ${v.bTarget === "single" ? r6(ex.bDPS) : 0} + ${v.uTarget === "single" ? r6(ex.ultDPS) : 0} = ${r6(tb.single)}`);
    lines.push("複数DPS = 複数に属する各DPS成分の合計");
    lines.push(`  = ${v.basicTarget === "multi" ? r6(ex.basicDPS) : 0} + ${v.aTarget === "multi" ? r6(ex.aDPS) : 0} + ${v.bTarget === "multi" ? r6(ex.bDPS) : 0} + ${v.uTarget === "multi" ? r6(ex.ultDPS) : 0} = ${r6(tb.multi)}`);
    lines.push("単体割合(%) = 単体DPS / 内訳合計DPS × 100");
    lines.push(`  = ${r6(tb.single)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(tb.singlePct)}`);
    lines.push("複数割合(%) = 複数DPS / 内訳合計DPS × 100");
    lines.push(`  = ${r6(tb.multi)} / ${r6(ex.checkTotalDPS)} × 100 = ${r6(tb.multiPct)}`);
    lines.push("");

    lines.push("■ 検算");
    lines.push("内訳合計DPS = 基本DPS成分 + スキルA DPS成分 + スキルB DPS成分 + 究極DPS成分");
    lines.push(`  = ${r6(ex.basicDPS)} + ${r6(ex.aDPS)} + ${r6(ex.bDPS)} + ${r6(ex.ultDPS)} = ${r6(ex.checkTotalDPS)}`);
    lines.push("表示DPS（周期合成） = 周期ダメージ / (周期F / 40)");
    lines.push(`  = ${r6(res.detail.cycleDamage)} / (${r6(res.detail.cycleFrames)} / 40) = ${r6(res.dps)}`);

    lines.push("");
    lines.push("=== 既存の算出式（一般形 + 代入値） ===");
    lines.push("■ 基本攻撃");
    lines.push("基本攻撃モーションF = 40 / 攻撃速度");
    lines.push(`  = 40 / ${r6(v.aspd)} = ${r6(d.T0)}`);
    lines.push("基本攻撃ダメージ = 攻撃力 × 100%");
    lines.push(`  = ${r6(v.atk)} × 1 = ${r6(v.atk)}`);
    lines.push("");

    lines.push("■ スキル抽選（究極が未発動の行動1回ごと）");
    if (d.mode === "prob") {
      lines.push("スキルA確率 = スキルA確率(%) / 100");
      lines.push(`  = ${r6(v.aP * 100)} / 100 = ${r6(v.aP)}`);
      lines.push("スキルB確率 = スキルB確率(%) / 100");
      lines.push(`  = ${r6(v.bP * 100)} / 100 = ${r6(v.bP)}`);
      lines.push("基本攻撃確率 = 1 − スキルA確率 − スキルB確率");
      lines.push(`  = 1 − ${r6(v.aP)} − ${r6(v.bP)} = ${r6(d.p0)}`);
      lines.push("平均行動F = 基本攻撃確率×基本攻撃モーションF + スキルA確率×スキルA_F数 + スキルB確率×スキルB_F数");
      lines.push(`  = ${r6(d.p0)}×${r6(d.T0)} + ${r6(v.aP)}×${v.aF} + ${r6(v.bP)}×${v.bF} = ${r6(d.avgFrames)}`);
      lines.push("平均倍率 = 基本攻撃確率×100% + スキルA確率×スキルA倍率 + スキルB確率×スキルB倍率");
      lines.push(`  = ${r6(d.p0)}×1 + ${r6(v.aP)}×${r6(v.aMul)} + ${r6(v.bP)}×${r6(v.bMul)} = ${r6(d.avgMul)}`);
      lines.push("非究極DPS = 攻撃力 × 平均倍率 / (平均行動F / 40)");
      lines.push(`  = ${r6(v.atk)} × ${r6(d.avgMul)} / (${r6(d.avgFrames)} / 40) = ${r6(d.nonUltDPS)}`);
    } else {
      lines.push("p = スキルA確率(%) / 100");
      lines.push(`  = ${r6(v.aP * 100)} / 100 = ${r6(v.aP)}`);
      lines.push("EA = (規定回数 + 1) × p / (1 − p)");
      lines.push(`  = (${v.bN} + 1) × ${r6(v.aP)} / (1 − ${r6(v.aP)}) = ${r6(d.EA)}`);
      lines.push("非究極周期F = 基本攻撃モーションF×規定回数 + スキルA_F数×EA + スキルB_F数");
      lines.push(`  = ${r6(d.T0)}×${v.bN} + ${v.aF}×${r6(d.EA)} + ${v.bF} = ${r6(d.expFrames)}`);
      lines.push("非究極周期ダメージ = 攻撃力 × (規定回数×100% + EA×スキルA倍率 + 1×スキルB倍率)");
      lines.push(`  = ${r6(v.atk)} × (${v.bN}×1 + ${r6(d.EA)}×${r6(v.aMul)} + 1×${r6(v.bMul)}) = ${r6(d.expDamage)}`);
      lines.push("非究極DPS = 非究極周期ダメージ / (非究極周期F / 40)");
      lines.push(`  = ${r6(d.expDamage)} / (${r6(d.expFrames)} / 40) = ${r6(d.nonUltDPS)}`);
    }

    lines.push("");
    lines.push("■ 究極");
    if (v.ultType === "none") {
      lines.push("究極：無し");
    } else if (v.ultType === "mana") {
      lines.push("時間マナ(毎秒) = Regeマナ毎秒 / 100");
      lines.push(`  = ${r6(readNumber($("manaRegenPct").value))} / 100 = ${r6(v.manaPerSec)}`);
      lines.push("時間マナ(毎フレーム)(非究極中) = 時間マナ(毎秒) / 40");
      lines.push(`  = ${r6(v.manaPerSec)} / 40 = ${r6(d.timeManaPerFrame_nonUlt)}`);
      lines.push("基本攻撃マナ(毎フレーム)(非究極中) = 基本攻撃毎フレーム × 1");
      lines.push(`  = ${r6(d.basicPerFrame)} × 1 = ${r6(d.basicManaPerFrame_nonUlt)}`);
      lines.push("マナ増加(毎フレーム)(非究極中) = 時間マナ(毎フレーム) + 基本攻撃マナ(毎フレーム)");
      lines.push(`  = ${r6(d.timeManaPerFrame_nonUlt)} + ${r6(d.basicManaPerFrame_nonUlt)} = ${r6(d.manaPerFrame_nonUlt)}`);
      if (v.ultReset === "end") {
        lines.push("究極到達までの非究極F = Maxマナ / マナ増加(毎フレーム)(非究極中)");
        lines.push(`  = ${r6(v.gaugeMax)} / ${r6(d.manaPerFrame_nonUlt)} = ${r6(d.framesNonUltToReady)}`);
        lines.push("周期F = 究極到達F + 究極F数");
        lines.push(`  = ${r6(d.framesNonUltToReady)} + ${r6(v.ultF)} = ${r6(d.cycleFrames)}`);
        lines.push("周期ダメージ = 非究極DPS×(究極到達F/40) + 攻撃力×究極倍率");
        lines.push(`  = ${r6(d.nonUltDPS_adj ?? d.nonUltDPS)}×(${r6(d.framesNonUltToReady)}/40) + ${r6(v.atk)}×${r6(v.ultMul)} = ${r6(d.cycleDamage)}`);
        lines.push("DPS = 周期ダメージ / (周期F/40)");
        lines.push(`  = ${r6(d.cycleDamage)} / (${r6(d.cycleFrames)}/40) = ${r6(res.dps)}`);
      } else {
        const manaGainDuringUlt = v.ultStopsGauge ? 0 : ((v.manaPerSec / 40) * v.ultF);
        const remain = Math.max(0, v.gaugeMax - manaGainDuringUlt);
        lines.push("究極中マナ増加（平均近似） = (時間マナ(毎秒) / 40) × 究極F数");
        lines.push(`  = (${r6(v.manaPerSec)} / 40) × ${r6(v.ultF)} = ${r6(manaGainDuringUlt)}`);
        lines.push("残マナ = max(0, Maxマナ − 究極中マナ増加)");
        lines.push(`  = max(0, ${r6(v.gaugeMax)} − ${r6(manaGainDuringUlt)}) = ${r6(remain)}`);
        lines.push("残マナ到達F(非究極) = 残マナ / マナ増加(毎フレーム)(非究極中)");
        lines.push(`  = ${r6(remain)} / ${r6(d.manaPerFrame_nonUlt)} = ${r6(d.framesNonUltToReady)}`);
        lines.push("周期F = 究極F数 + 残マナ到達F");
        lines.push(`  = ${r6(v.ultF)} + ${r6(d.framesNonUltToReady)} = ${r6(d.cycleFrames)}`);
        lines.push("周期ダメージ = 攻撃力×究極倍率 + 非究極DPS×(残マナ到達F/40)");
        lines.push(`  = ${r6(v.atk)}×${r6(v.ultMul)} + ${r6(d.nonUltDPS_adj ?? d.nonUltDPS)}×(${r6(d.framesNonUltToReady)}/40) = ${r6(d.cycleDamage)}`);
        lines.push("DPS = 周期ダメージ / (周期F/40)");
        lines.push(`  = ${r6(d.cycleDamage)} / (${r6(d.cycleFrames)}/40) = ${r6(res.dps)}`);
      }
    } else {
      lines.push("クール進行(毎フレーム)(非究極中) = 1 / 40");
      lines.push(`  = 1 / 40 = ${r6(d.coolPerFrame_nonUlt)}`);
      if (v.ultReset === "end") {
        lines.push("究極到達までの非究極F = MaxCT / (1/40)");
        lines.push(`  = ${r6(v.gaugeMax)} / ${r6(d.coolPerFrame_nonUlt)} = ${r6(d.framesNonUltToReady)}`);
        lines.push("周期F = 究極到達F + 究極F数");
        lines.push(`  = ${r6(d.framesNonUltToReady)} + ${r6(v.ultF)} = ${r6(d.cycleFrames)}`);
        lines.push("周期ダメージ = 非究極DPS×(究極到達F/40) + 攻撃力×究極倍率");
        lines.push(`  = ${r6(d.nonUltDPS_adj ?? d.nonUltDPS)}×(${r6(d.framesNonUltToReady)}/40) + ${r6(v.atk)}×${r6(v.ultMul)} = ${r6(d.cycleDamage)}`);
        lines.push("DPS = 周期ダメージ / (周期F/40)");
        lines.push(`  = ${r6(d.cycleDamage)} / (${r6(d.cycleFrames)}/40) = ${r6(res.dps)}`);
      } else {
        const coolGainDuringUlt = v.ultStopsGauge ? 0 : (v.ultF / 40);
        const remain = Math.max(0, v.gaugeMax - coolGainDuringUlt);
        lines.push("究極中CT増加（平均近似） = 究極F数 / 40");
        lines.push(`  = ${r6(v.ultF)} / 40 = ${r6(coolGainDuringUlt)}`);
        lines.push("残CT = max(0, MaxCT − 究極中CT増加)");
        lines.push(`  = max(0, ${r6(v.gaugeMax)} − ${r6(coolGainDuringUlt)}) = ${r6(remain)}`);
        lines.push("残CT到達F(非究極) = 残CT / (1/40)");
        lines.push(`  = ${r6(remain)} / ${r6(d.coolPerFrame_nonUlt)} = ${r6(d.framesNonUltToReady)}`);
        lines.push("周期F = 究極F数 + 残CT到達F");
        lines.push(`  = ${r6(v.ultF)} + ${r6(d.framesNonUltToReady)} = ${r6(d.cycleFrames)}`);
        lines.push("周期ダメージ = 攻撃力×究極倍率 + 非究極DPS×(残CT到達F/40)");
        lines.push(`  = ${r6(v.atk)}×${r6(v.ultMul)} + ${r6(d.nonUltDPS_adj ?? d.nonUltDPS)}×(${r6(d.framesNonUltToReady)}/40) = ${r6(d.cycleDamage)}`);
        lines.push("DPS = 周期ダメージ / (周期F/40)");
        lines.push(`  = ${r6(d.cycleDamage)} / (${r6(d.cycleFrames)}/40) = ${r6(res.dps)}`);
      }
    }

    if (br) {
      lines.push("");
      lines.push("■ 40F境界の厳密レンジ");
      lines.push("minTick = floor(究極F / 40)");
      lines.push(`  = floor(${r6(v.ultF)} / 40) = ${br.minTick}`);
      lines.push("maxTick = ceil(究極F / 40)");
      lines.push(`  = ceil(${r6(v.ultF)} / 40) = ${br.maxTick}`);
      lines.push(`DPSレンジ = ${r6(br.lo)} ～ ${r6(br.hi)}`);
    }

    return lines.join("\n");
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
function setBar(fillId, valId, pct) {
    const p = Math.max(0, Math.min(100, pct));
    $(fillId).style.width = `${p}%`;
    $(valId).textContent = `${r6(p)}%`;
  }

  
  function buildDetailHtml(v, res, ex, tb, br) {
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
    html += lineHtml(`<span class="sectionHead">=== 行動レート（回/秒）※究極時間込み平均 ===</span>`);
    html += lineHtml(`非究極時間比率（=非究極F/周期F）: ${hVal("valMix", r6(ex.nonUltFrac))}`);
    html += lineHtml(`行動合計/秒（究極も1行動扱い）: ${hVal("valMix", r6(ex.actPerSec))}`);
    html += lineHtml(`基本攻撃/秒: ${hVal("valSpd", r6(ex.basicPerSec))}`);
    html += lineHtml(`スキルA/秒: ${hVal("valA", r6(ex.aPerSec))}`);
    html += lineHtml(`スキルB/秒: ${hVal("valB", r6(ex.bPerSec))}`);
    html += lineHtml(`究極/秒: ${hVal("valUlt", r6(ex.ultPerSec))}`);

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== 環境（物理補正） ===</span>`);
    html += lineHtml(`難易度: ${hVal("valEnv", diffLabel)}（80w防御力は難易度に応じて内部適用）`);
    html += lineHtml(`防御力減少値: ${hVal("valEnv", v.defReduce)} / 実防御力=${hVal("valEnv", realDef)}`);
    html += lineHtml(`物理補正倍率（小数第2位まで）: ${hVal("valMixEnvPhys", $("physMulOut").value)}`);

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

    if (br) {
      html += lineHtml("");
      html += lineHtml(`<span class="sectionHead">=== 境界(40F)による厳密レンジ（開始位相で±1tickの差） ===</span>`);
      html += lineHtml(`究極中のtick数: ${hVal("valUlt", br.minTick)}〜${hVal("valUlt", br.maxTick)} （1tickあたり+${hVal("valGauge", br.perTick)} ${v.ultType === "mana" ? "マナ" : "秒"}）`);
      html += lineHtml(`DPSレンジ: ${hVal("valMix", r6(br.lo))} 〜 ${hVal("valMix", r6(br.hi))}`);
    }

    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">--- 検算（丸めで微差が出る場合あり） ---</span>`);
    html += lineHtml(`内訳合計DPS（基本+スキルA+スキルB+究極）: ${hVal("valMix", r6(ex.checkTotalDPS))}`);
    html += lineHtml(`表示DPS（周期合成）: ${hVal("valMix", r6(ex.checkTotalDPS))}`);
    return html;
  }

function render() {
    syncUltType();
    syncSkillBMode();
    syncSegmentsFromHidden();
    syncEnvDerivedUI();

    const v = getValInternal();
    const res = calcTotal(v);

    if (res.err) {
      $("dpsOut").textContent = "計算エラー";
      $("dpsSub").textContent = res.err;
      $("detailOut").innerHTML = "";

      if (String(res.err).includes("究極に到達しません")) {
        if ($("ultType").value === "mana") {
          setErr($("manaRegenPct"), true);
          setLblErr($("regenLbl"), true);
          if ($("bType").value === "prob") setErr($("bThird"), true);
          setErr($("aPPct"), true);
        }
      }

      setBar("barBasic","valBasic",0);
      setBar("barA","valA",0);
      setBar("barB","valB",0);
      $("boundaryOut").textContent = "究極中tick数: - / DPSレンジ: -";
      $("formulaOut").textContent = "-";
      setBar("barU","valU",0);

      setBar("barPhys","valPhys",0);
      setBar("barMagic","valMagic",0);
      setBar("barSingle","valSingle",0);
      setBar("barMulti","valMulti",0);
      return;
    }

    $("dpsOut").textContent = `${r6(res.dps)}`;
    $("dpsSub").textContent = "（小数第6位まで = 第7位四捨五入）";
    // 40F境界ズレ（上限）の可視化：究極中tick数(min/max)と、それに基づくDPSレンジ
    const brTop = calcBoundaryRange(v, res);
    if (brTop) {
      const minTick = brTop.minTick;
      const maxTick = brTop.maxTick;
      const lo = r6(brTop.lo);
      const hi = r6(brTop.hi);
      $("boundaryOut").textContent = `究極中tick数: ${minTick}〜${maxTick} / DPSレンジ: ${lo}〜${hi}`;
    } else {
      $("boundaryOut").textContent = "究極中tick数: - / DPSレンジ: -";
      $("formulaOut").textContent = "-";
    }


    const ex = calcRatesAndShares(v, res);
    $("dpsOut").textContent = `${r6(ex.checkTotalDPS)}`;

    setBar("barBasic","valBasic", ex.basicPct);
    setBar("barA","valA", ex.aPct);
    setBar("barB","valB", ex.bPct);
    setBar("barU","valU", ex.ultPct);

    const lines = [];
    lines.push("=== 行動レート（回/秒）※究極時間込み平均 ===");
    lines.push(`非究極時間比率 (=非究極F/周期F): ${r6(ex.nonUltFrac)}`);
    lines.push(`行動合計/秒（究極も1行動扱い）: ${r6(ex.actPerSec)}`);
    lines.push(`基本攻撃/秒: ${r6(ex.basicPerSec)}`);
    lines.push(`スキルA/秒: ${r6(ex.aPerSec)}`);
    lines.push(`スキルB/秒: ${r6(ex.bPerSec)}`);
    lines.push(`究極/秒: ${r6(ex.ultPerSec)}`);

    lines.push("\n=== 環境（物理補正） ===");
    lines.push(`難易度: ${$("envDiff").value}（80w防御力は難易度に応じて内部適用）`);
    lines.push(`防御力減少値: ${readInt($("defReduce").value)} / 実防御力=${readInt($("defReduce").value) - (DIFF_DEF[$("envDiff").value] ?? 175)}`);
    lines.push(`物理補正倍率（小数第2位まで）: ${$("physMulOut").value}`);

    lines.push("\n=== ダメージ内訳（DPS成分）と割合（合計=100%） ===");
    lines.push(`基本DPS成分: ${r6(ex.basicDPS)} / 基本割合(%): ${r6(ex.basicPct)}`);
    lines.push(`スキルA DPS成分: ${r6(ex.aDPS)} / スキルA割合(%): ${r6(ex.aPct)}`);
    lines.push(`スキルB DPS成分: ${r6(ex.bDPS)} / スキルB割合(%): ${r6(ex.bPct)}`);
    lines.push(`究極DPS成分: ${r6(ex.ultDPS)} / 究極割合(%): ${r6(ex.ultPct)}`);

    const tb = calcTypeBreakdown(v, ex);
    // 物理/魔法・単体/複数（割合）※既存4種バーの直下に追加した表示
    setBar("barPhys","valPhys", tb.physPct);
    setBar("barMagic","valMagic", tb.magicPct);
    setBar("barSingle","valSingle", tb.singlePct);
    setBar("barMulti","valMulti", tb.multiPct);
    lines.push("\n=== 属性内訳（物理/魔法） ===");
    lines.push(`物理DPS: ${r6(tb.phys)} / 物理割合(%): ${r6(tb.physPct)}`);
    lines.push(`魔法DPS: ${r6(tb.magic)} / 魔法割合(%): ${r6(tb.magicPct)}`);

    lines.push("\n=== 特性内訳（単体/複数） ===");
    lines.push(`単体DPS: ${r6(tb.single)} / 単体割合(%): ${r6(tb.singlePct)}`);
    lines.push(`複数DPS: ${r6(tb.multi)} / 複数割合(%): ${r6(tb.multiPct)}`);

    const br = calcBoundaryRange(v, res);
    if (br) {
      lines.push("\n=== 境界(40F)による厳密レンジ（開始位相で±1tickの差） ===");
      lines.push(`究極中のtick数: ${br.minTick}〜${br.maxTick} （1tickあたり+${br.perTick} ${v.ultType === "mana" ? "マナ" : "秒"}）`);
      lines.push(`DPSレンジ: ${r6(br.lo)} 〜 ${r6(br.hi)}`);
    }

    lines.push("\n--- 検算（丸めで微差が出る場合あり） ---");
    lines.push(`内訳合計DPS（基本+スキルA+スキルB+究極）: ${r6(ex.checkTotalDPS)}`);
    lines.push(`表示DPS（周期合成）: ${r6(res.dps)}`);

    $("detailOut").innerHTML = buildDetailHtml(v, res, ex, tb, br);
    $("formulaOut").textContent = buildFormulaText(v, res, ex, tb, br);
  }

  function validateAndRender() {
    syncUltType();
    syncSkillBMode();
    syncSegmentsFromHidden();

    const errs = validateInputs();
    if (errs.length) {
      $("dpsOut").textContent = "入力エラー";
      $("dpsSub").textContent = errs.join(" / ");
      $("detailOut").innerHTML = "";
      setBar("barBasic","valBasic",0);
      setBar("barA","valA",0);
      setBar("barB","valB",0);
      $("boundaryOut").textContent = "究極中tick数: - / DPSレンジ: -";
      $("formulaOut").textContent = "-";
      setBar("barU","valU",0);
      setBar("barPhys","valPhys",0);
      setBar("barMagic","valMagic",0);
      setBar("barSingle","valSingle",0);
      setBar("barMulti","valMulti",0);
      return;
    }
    render();
  }

  function save() {
    const v = {};
    document.querySelectorAll("input,select").forEach(el => {
      if (!el.id) return;
      if (el.type === "checkbox") v[el.id] = el.checked;
      else v[el.id] = el.value;
    });
    localStorage.setItem("LD_DPS_TOOL_V5_ZIP", JSON.stringify(v));
    alert("保存しました");
  }

  function load() {
    const raw = localStorage.getItem("LD_DPS_TOOL_V5_ZIP");
    if (!raw) return alert("保存データがありません");
    const v = JSON.parse(raw);
    for (const [k,val] of Object.entries(v)) {
      const el = $(k);
      if (!el) continue;
      if (el.type === "checkbox") el.checked = !!val;
      else el.value = val;
    }
    normalizeAll();
    syncUltType();
    syncSkillBMode();
    syncSegmentsFromHidden();
    validateAndRender();
    alert("読み込みました");
  }

  function resetAll() {
    localStorage.removeItem("LD_DPS_TOOL_V5_ZIP");
    location.reload();
  }

  function seedDefaults() {
    $("atk").value = "1500";
    $("aspd").value = "2.40";
    $("gaugeMax").value = "100";
    $("manaRegenPct").value = "100%";
    $("envDiff").value = "god";
    $("defReduce").value = "250";
    syncEnvDerivedUI();

    $("ultType").value = "mana";
    $("ultReset").value = "end";
    $("ultMulPct").value = "1500%";
    $("ultF").value = "44";
    $("ultStopsGauge").checked = true;

    $("aMulPct").value = "600%";
    $("aPPct").value = "10.0%";
    $("aF").value = "32";

    $("bType").value = "none";
    $("bMulPct").value = "1500%";
    $("bThird").value = "0.0%";
    $("bF").value = "40";
  }

  syncUltType();
  syncSkillBMode();
  seedDefaults();
  normalizeAll();
  initBindings();
  setupSegments();
  setupAccordions();
  validateAndRender();
  pvCountOnce();
})();