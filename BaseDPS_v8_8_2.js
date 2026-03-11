(() => {
  const F = 40;
  const STORAGE_KEY = "LD_DPS_TOOL_V8_8_2";
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
  const rateToSecPerUse = (rate) => (rate > 0 ? r6(1 / rate) : null);
  const fmtRatePair = (rate) => `${r6(rate)} 回/秒 / ${rate > 0 ? r6(1 / rate) : "-"} 秒/回`;

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

  function initBindings() {
    bindField($("atk"), (v)=>sanitizeIntKeepComma(v,6), (v)=>toAtkDisplay(v));
    bindField($("aspd"), (v)=>trimDecimalsLive(v,2), (v)=>toAspdDisplay(v));
    bindField($("gaugeMax"), (v)=>sanitizeIntKeepComma(v,3), (v)=>toIntDisplay(v,3));
    bindField($("sameUnitCount"), (v)=>sanitizeIntKeepComma(v,2), (v)=>toIntDisplay(v,2));

    bindField($("manaRegenPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,4));
    bindField($("defReduce"), (v)=>sanitizeIntKeepComma(v,3), (v)=>toIntDisplay(v,3));
    bindField($("critChancePct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,4));
    bindField($("critPhysBonusPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,4));
    bindField($("critMagicBonusPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,4));

    bindField($("ultMulPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("ultF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
    bindField($("ultImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

    bindField($("aMulPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("aPPct"), (v)=>trimDecimalsLive(v,1), (v)=>toProbPctDisplay(v));
    bindField($("aF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
    bindField($("aImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

    bindField($("bMulPct"), (v)=>trimDecimalsLive(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("bF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));
    bindField($("bImpactF"), (v)=>sanitizeIntKeepComma(v,4), (v)=>toIntDisplay(v,4));

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
    $("aUseGainMana5").addEventListener("change", validateAndRender);
    $("critABShortenUlt2s").addEventListener("change", validateAndRender);
    $("bType").addEventListener("change", () => { syncSkillBMode(); validateAndRender(); });

    $("calcBtn").addEventListener("click", () => { normalizeAll(); validateAndRender(); });
    $("saveBtn").addEventListener("click", save);
    $("loadBtn").addEventListener("click", load);
    $("resetBtn").addEventListener("click", resetAll);
    $("showNotes").addEventListener("change", () => { syncNoteVisibility(); save(true); });
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
    $("sameUnitCount").value = toIntDisplay($("sameUnitCount").value, 2);
    $("manaRegenPct").value = toPctDisplay($("manaRegenPct").value, 1, 4);
    $("defReduce").value = toIntDisplay($("defReduce").value, 3);
    $("critChancePct").value = toPctDisplay($("critChancePct").value, 1, 4);
    $("critPhysBonusPct").value = toPctDisplay($("critPhysBonusPct").value, 1, 4);
    $("critMagicBonusPct").value = toPctDisplay($("critMagicBonusPct").value, 1, 4);
    syncEnvDerivedUI();

    $("ultMulPct").value = toPctDisplay($("ultMulPct").value, 1, 6);
    $("ultF").value = toIntDisplay($("ultF").value, 4);
    $("ultImpactF").value = toIntDisplay($("ultImpactF").value, 4);

    $("aMulPct").value = toPctDisplay($("aMulPct").value, 1, 6);
    $("aPPct").value = toProbPctDisplay($("aPPct").value);
    $("aF").value = toIntDisplay($("aF").value, 4);
    $("aImpactF").value = toIntDisplay($("aImpactF").value, 4);

    $("bMulPct").value = toPctDisplay($("bMulPct").value, 1, 6);
    $("bF").value = toIntDisplay($("bF").value, 4);
    $("bImpactF").value = toIntDisplay($("bImpactF").value, 4);

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

    return { atk, aspd, gaugeMax, sameUnitCount, manaPerSec, envDiff, baseDef, defReduce, realDef, physMul,
      critChancePct, critPhysBonusPct, critMagicBonusPct, critChance, critPhysBonus, critMagicBonus, critPhysMul, critMagicMul,
      ultType, ultReset, ultMul, ultF, ultImpactF, ultStopsGauge, critABShortenUlt2s,
      aMul, aP, aF, aImpactF, aUseGainMana5, bType, bMul, bF, bImpactF, bP, bN,
      basicAttr, basicTarget, aAttr, aTarget, bAttr, bTarget, uAttr, uTarget };
  }

  function clearErrAll() {
    const ids = ["atk","aspd","gaugeMax","sameUnitCount","manaRegenPct","defReduce","critChancePct","critPhysBonusPct","critMagicBonusPct","ultMulPct","ultF","ultImpactF","aMulPct","aPPct","aF","aImpactF","bMulPct","bThird","bF","bImpactF"];
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




    const pB = (v.bType === "prob") ? clamp01(v.bP) : 0;
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

    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const physCritMul = (isFinite(v.critPhysMul) ? v.critPhysMul : 1);
    const magicCritMul = (isFinite(v.critMagicMul) ? v.critMagicMul : 1);
    const split = calcNonUltDpsSplit(v, nu);

    const nonUltDPS_adj0 = split.phys * pm * physCritMul + split.magic * magicCritMul;

    if (v.ultType === "none") {
      return { dps: nonUltDPS_adj0, detail: { ...nu, nonUltDPS_adj: nonUltDPS_adj0, cycleFrames: NaN, cycleDamage: NaN, framesNonUltToReady: NaN } };
    }

    const ultDamage = v.atk * v.ultMul * ((v.uAttr === "phys") ? (pm * physCritMul) : magicCritMul);
    const nonUltDPS_adj = nonUltDPS_adj0;

    if (v.ultType === "mana") {
      const timeManaPerFrame_nonUlt = v.manaPerSec / F;
      const basicManaPerFrame_nonUlt = nu.basicPerFrame * 1;
      const aManaPerFrame_nonUlt = v.aUseGainMana5 ? (nu.aPerFrame * 5) : 0;
      const manaPerFrame_nonUlt = timeManaPerFrame_nonUlt + basicManaPerFrame_nonUlt + aManaPerFrame_nonUlt;

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
      return { dps, detail: { ...nu, timeManaPerFrame_nonUlt, basicManaPerFrame_nonUlt, aManaPerFrame_nonUlt, manaPerFrame_nonUlt, nonUltDPS_adj, framesNonUltToReady, cycleFrames, cycleDamage } };
    }

    if (v.ultType === "cool") {
      const baseCoolPerFrame_nonUlt = 1 / F; // 秒/フレーム
      const critAbShortenPerFrame_nonUlt = v.critABShortenUlt2s
        ? (2 * v.critChance * (nu.aPerFrame + nu.bPerFrame))
        : 0;
      const coolPerFrame_nonUlt = baseCoolPerFrame_nonUlt + critAbShortenPerFrame_nonUlt;

      let framesNonUltToReady, cycleFrames, cycleDamage;

      if (v.ultReset === "end") {
        framesNonUltToReady = (v.gaugeMax * F);
        cycleFrames = framesNonUltToReady + v.ultF;
        cycleDamage = nonUltDPS_adj * (framesNonUltToReady / F) + ultDamage;
      } else {
        const coolPerFrame_ult = (v.ultStopsGauge ? 0 : (1 / F));
        const coolGainDuringUlt = coolPerFrame_ult * v.ultF;
        const remain = Math.max(0, v.gaugeMax - coolGainDuringUlt);
        framesNonUltToReady = remain * F;
        cycleFrames = v.ultF + framesNonUltToReady;
        cycleDamage = ultDamage + nonUltDPS_adj * (framesNonUltToReady / F);
      }

      const dps = cycleDamage / (cycleFrames / F);
      return { dps, detail: { ...nu, baseCoolPerFrame_nonUlt, critAbShortenPerFrame_nonUlt, coolPerFrame_nonUlt, nonUltDPS_adj, framesNonUltToReady, cycleFrames, cycleDamage } };
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

    const basicBaseMul = (v.basicAttr === "phys") ? pm : 1;
    const aBaseMul = (v.aAttr === "phys") ? pm : 1;
    const bBaseMul = (v.bAttr === "phys") ? pm : 1;
    const uBaseMul = (v.uAttr === "phys") ? pm : 1;

    const basicCritMul = (v.basicAttr === "phys") ? physCritMul : magicCritMul;
    const aCritMul = (v.aAttr === "phys") ? physCritMul : magicCritMul;
    const bCritMul = (v.bAttr === "phys") ? physCritMul : magicCritMul;
    const uCritMul = (v.uAttr === "phys") ? physCritMul : magicCritMul;

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

    const perTick = (v.ultType === "mana") ? v.manaPerSec : 1;
    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const physCritMul = (isFinite(v.critPhysMul) ? v.critPhysMul : 1);
    const magicCritMul = (isFinite(v.critMagicMul) ? v.critMagicMul : 1);
    const ultDamage = v.atk * v.ultMul * ((v.uAttr === "phys") ? (pm * physCritMul) : magicCritMul);
    const split = calcNonUltDpsSplit(v, d);
    const nonUltDPS_adj = split.phys * pm * physCritMul + split.magic * magicCritMul;

    function dpsFromTick(ticks) {
      const gain = ticks * perTick;
      const remain = Math.max(0, v.gaugeMax - gain);

      let framesNonUltToReady;
      if (v.ultType === "mana") {
        const manaPerFrame_nonUlt = d.manaPerFrame_nonUlt;
        if (!(manaPerFrame_nonUlt > 0)) return NaN;
        framesNonUltToReady = remain / manaPerFrame_nonUlt;
      } else {
        const coolPerFrame_nonUlt = d.coolPerFrame_nonUlt;
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

  function buildFormulaText(v, res, ex, tb, br) {
    const d = res.detail;
    const pm = (isFinite(v.physMul) ? v.physMul : 1);
    const baseDef = DIFF_DEF[v.envDiff] ?? 175;
    const realDef = v.defReduce - baseDef;
    const hasUlt = (v.ultType !== "none");
    const gaugeLabel = (v.ultType === "mana") ? "マナ" : "クールタイム";
    const lines = [];

    lines.push("=== 行動レート～検算 の算出式 ===");
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
      lines.push(`  = ${r6(d.aPerFrame)} × 5 = ${r6(d.aManaPerFrame_nonUlt || 0)}`);
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

    const eff = calcEffectTimes(v, ex);
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
    lines.push("参考合計影響F/秒 = A + B + 究極");
    lines.push(`  = ${r6(eff.a.rawFPerSec)} + ${r6(eff.b.rawFPerSec)} + ${r6(eff.u.rawFPerSec)} = ${r6(eff.totalRawFPerSec)}`);
    lines.push("参考合計単体稼働率 = min(100%, 参考合計影響F/秒 / 40 × 100)");
    lines.push(`  = min(100%, ${r6(eff.totalRawFPerSec)} / 40 × 100) = ${r6(eff.totalSingleCoveragePct)}%`);
    lines.push(`参考合計 ${eff.unitCount}体稼働率 = 1 − (1 − 参考合計単体稼働率)^${eff.unitCount}`);
    lines.push(`  = 1 − (1 − ${r6(eff.totalSingleCoverageSecPerSec)})^${eff.unitCount} = ${r6(eff.totalMultiCoveragePct)}%`);

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
    addVals(buckets.spd, [v.aspd, r6(v.aspd), Number(v.aspd).toFixed ? Number(v.aspd).toFixed(2) : ""]);
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

  function buildFormulaHtml(v, res, ex, tb, br) {
    return highlightFormulaHtml(buildFormulaText(v, res, ex, tb, br), v, ex);
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
    html += lineHtml(`<span class="sectionHead">=== 行動レート（回/秒 / 秒/回）※究極時間込み平均 ===</span>`);
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

    const eff = calcEffectTimes(v, ex);
    html += lineHtml("");
    html += lineHtml(`<span class="sectionHead">=== 影響時間（平均・ダメージとは別計算） ===</span>`);
    html += lineHtml(`同ユニット数: ${hVal("valMix", eff.unitCount)}`);
    html += lineHtml(`スキルA: 回/秒=${hVal("valA", r6(eff.a.ratePerSec))} / 秒/回=${hVal("valA", eff.a.ratePerSec > 0 ? r6(eff.a.secPerProc) : "-")} / 影響F/秒=${hVal("valA", r6(eff.a.rawFPerSec))} / 単体稼働率=${hVal("valA", r6(eff.a.singleCoveragePct))}% / ${eff.unitCount}体参考稼働率=${hVal("valA", r6(eff.a.multiCoveragePct))}%`);
    html += lineHtml(`スキルB: 回/秒=${hVal("valB", r6(eff.b.ratePerSec))} / 秒/回=${hVal("valB", eff.b.ratePerSec > 0 ? r6(eff.b.secPerProc) : "-")} / 影響F/秒=${hVal("valB", r6(eff.b.rawFPerSec))} / 単体稼働率=${hVal("valB", r6(eff.b.singleCoveragePct))}% / ${eff.unitCount}体参考稼働率=${hVal("valB", r6(eff.b.multiCoveragePct))}%`);
    html += lineHtml(`究極: 回/秒=${hVal("valUlt", r6(eff.u.ratePerSec))} / 秒/回=${hVal("valUlt", eff.u.ratePerSec > 0 ? r6(eff.u.secPerProc) : "-")} / 影響F/秒=${hVal("valUlt", r6(eff.u.rawFPerSec))} / 単体稼働率=${hVal("valUlt", r6(eff.u.singleCoveragePct))}% / ${eff.unitCount}体参考稼働率=${hVal("valUlt", r6(eff.u.multiCoveragePct))}%`);
    html += lineHtml(`参考合計: 影響F/秒=${hVal("valMix", r6(eff.totalRawFPerSec))} / 単体稼働率=${hVal("valMix", r6(eff.totalSingleCoveragePct))}% / ${eff.unitCount}体参考稼働率=${hVal("valMix", r6(eff.totalMultiCoveragePct))}%`);

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
      html += lineHtml(`究極中のtick数: ${hVal("valUlt", br.minTick)}〜${hVal("valUlt", br.maxTick)} （1tickあたり+${hVal("valGauge", br.perTick)} ${v.ultType === "mana" ? "マナ" : "クールタイム"}）`);
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
      if ($("detailLegend")) $("detailLegend").innerHTML = "";
      if ($("formulaLegend")) $("formulaLegend").innerHTML = "";

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
      setBar("barU","valU",0);

      setBar("barPhys","valPhys",0);
      setBar("barMagic","valMagic",0);
      setBar("barSingle","valSingle",0);
      setBar("barMulti","valMulti",0);
      setBar("barCorrPhys","valCorrPhys",0);
      setBar("barCritMagic","valCritMagic",0);
      if ($("effectMeta")) $("effectMeta").textContent = "同ユニット数: -";
      if ($("effectMeta")) $("effectMeta").textContent = "同ユニット数: -";
      if ($("effectA")) $("effectA").textContent = "-";
      if ($("effectB")) $("effectB").textContent = "-";
      if ($("effectU")) $("effectU").textContent = "-";
      if ($("effectTotal")) $("effectTotal").textContent = "-";
      save(true);
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
    }


    const ex = calcRatesAndShares(v, res);
    const eff = calcEffectTimes(v, ex);
    $("dpsOut").textContent = `${r6(res.dps)}`;

    setBar("barBasic","valBasic", ex.basicPct);
    setBar("barA","valA", ex.aPct);
    setBar("barB","valB", ex.bPct);
    setBar("barU","valU", ex.ultPct);

    const lines = [];
    lines.push("=== 行動レート（回/秒 / 秒/回）※究極時間込み平均 ===");
    lines.push(`非究極時間比率 (=非究極F/周期F): ${r6(ex.nonUltFrac)}`);
    lines.push(`行動合計（究極も1行動扱い）: ${r6(ex.actPerSec)} 回/秒 / ${ex.actPerSec > 0 ? r6(1 / ex.actPerSec) : "-"} 秒/回`);
    lines.push(`基本攻撃: ${r6(ex.basicPerSec)} 回/秒 / ${ex.basicPerSec > 0 ? r6(1 / ex.basicPerSec) : "-"} 秒/回`);
    lines.push(`スキルA: ${r6(ex.aPerSec)} 回/秒 / ${ex.aPerSec > 0 ? r6(1 / ex.aPerSec) : "-"} 秒/回`);
    lines.push(`スキルB: ${r6(ex.bPerSec)} 回/秒 / ${ex.bPerSec > 0 ? r6(1 / ex.bPerSec) : "-"} 秒/回`);
    lines.push(`究極: ${r6(ex.ultPerSec)} 回/秒 / ${ex.ultPerSec > 0 ? r6(1 / ex.ultPerSec) : "-"} 秒/回`);

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
    setBar("barCorrPhys","valCorrPhys", ex.physCritGainPct);
    setBar("barCritMagic","valCritMagic", ex.magicCritGainPct);
    if ($("effectMeta")) $("effectMeta").textContent = `同ユニット数: ${eff.unitCount}体`;
    if ($("effectA")) $("effectA").textContent = `${r6(eff.a.ratePerSec)} 回/秒 / ${eff.a.ratePerSec > 0 ? r6(eff.a.secPerProc) : "-"} 秒/回 / ${v.aImpactF}F → ${r6(eff.a.rawFPerSec)}F/秒（単体 ${r6(eff.a.singleCoveragePct)}%, ${eff.unitCount}体 ${r6(eff.a.multiCoveragePct)}%）`;
    if ($("effectB")) $("effectB").textContent = `${r6(eff.b.ratePerSec)} 回/秒 / ${eff.b.ratePerSec > 0 ? r6(eff.b.secPerProc) : "-"} 秒/回 / ${v.bImpactF}F → ${r6(eff.b.rawFPerSec)}F/秒（単体 ${r6(eff.b.singleCoveragePct)}%, ${eff.unitCount}体 ${r6(eff.b.multiCoveragePct)}%）`;
    if ($("effectU")) $("effectU").textContent = `${r6(eff.u.ratePerSec)} 回/秒 / ${eff.u.ratePerSec > 0 ? r6(eff.u.secPerProc) : "-"} 秒/回 / ${v.ultImpactF}F → ${r6(eff.u.rawFPerSec)}F/秒（単体 ${r6(eff.u.singleCoveragePct)}%, ${eff.unitCount}体 ${r6(eff.u.multiCoveragePct)}%）`;
    if ($("effectTotal")) $("effectTotal").textContent = `${r6(eff.totalRawFPerSec)}F/秒（単体 ${r6(eff.totalSingleCoveragePct)}%, ${eff.unitCount}体 ${r6(eff.totalMultiCoveragePct)}%）`;
    lines.push("\n=== 属性内訳（物理/魔法） ===");
    lines.push(`物理DPS: ${r6(tb.phys)} / 物理割合(%): ${r6(tb.physPct)}`);
    lines.push(`魔法DPS: ${r6(tb.magic)} / 魔法割合(%): ${r6(tb.magicPct)}`);

    lines.push("\n=== 特性内訳（単体/複数） ===");
    lines.push(`単体DPS: ${r6(tb.single)} / 単体割合(%): ${r6(tb.singlePct)}`);
    lines.push(`複数DPS: ${r6(tb.multi)} / 複数割合(%): ${r6(tb.multiPct)}`);

    const br = calcBoundaryRange(v, res);
    if (br) {
      lines.push("\n=== 境界(40F)による厳密レンジ（開始位相で±1tickの差） ===");
      lines.push(`究極中のtick数: ${br.minTick}〜${br.maxTick} （1tickあたり+${br.perTick} ${v.ultType === "mana" ? "マナ" : "クールタイム"}）`);
      lines.push(`DPSレンジ: ${r6(br.lo)} 〜 ${r6(br.hi)}`);
    }

    lines.push("\n--- 検算（丸めで微差が出る場合あり） ---");
    lines.push(`内訳合計DPS（基本+スキルA+スキルB+究極）: ${r6(ex.checkTotalDPS)}`);
    lines.push(`表示DPS（周期合成）: ${r6(res.dps)}`);

    $("detailOut").innerHTML = buildDetailHtml(v, res, ex, tb, br);
    $("detailLegend").innerHTML = buildLegendHtml();
    $("formulaOut").innerHTML = buildFormulaHtml(v, res, ex, tb, br);
    $("formulaLegend").innerHTML = buildLegendHtml();
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
      if ($("detailLegend")) $("detailLegend").innerHTML = "";
      if ($("formulaLegend")) $("formulaLegend").innerHTML = "";
      setBar("barBasic","valBasic",0);
      setBar("barA","valA",0);
      setBar("barB","valB",0);
      $("boundaryOut").textContent = "究極中tick数: - / DPSレンジ: -";
      $("formulaOut").innerHTML = "-";
      if ($("formulaLegend")) $("formulaLegend").innerHTML = "";
      setBar("barU","valU",0);
      setBar("barPhys","valPhys",0);
      setBar("barMagic","valMagic",0);
      setBar("barSingle","valSingle",0);
      setBar("barMulti","valMulti",0);
      setBar("barCorrPhys","valCorrPhys",0);
      setBar("barCritMagic","valCritMagic",0);
      if ($("effectMeta")) $("effectMeta").textContent = "同ユニット数: -";
      if ($("effectA")) $("effectA").textContent = "-";
      if ($("effectB")) $("effectB").textContent = "-";
      if ($("effectU")) $("effectU").textContent = "-";
      if ($("effectTotal")) $("effectTotal").textContent = "-";
      save(true);
      return;
    }
    render();
    save(true);
  }

  function collectFormState() {
    const v = {};
    document.querySelectorAll("input,select").forEach(el => {
      if (!el.id) return;
      if (el.type === "checkbox") v[el.id] = el.checked;
      else v[el.id] = el.value;
    });
    return v;
  }

  function save(silent = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormState()));
      if (!silent) alert("保存しました");
      return true;
    } catch (_) {
      if (!silent) alert("保存に失敗しました");
      return false;
    }
  }

  function load(silent = false) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        if (!silent) alert("保存データがありません");
        return false;
      }
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
      syncEnvDerivedUI();
      syncNoteVisibility();
      validateAndRender();
      if (!silent) alert("読み込みました");
      return true;
    } catch (_) {
      if (!silent) alert("読み込みに失敗しました");
      return false;
    }
  }

  function resetAll() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    seedDefaults();
    normalizeAll();
    syncUltType();
    syncSkillBMode();
    syncSegmentsFromHidden();
    syncEnvDerivedUI();
    syncNoteVisibility();
    validateAndRender();
  }

  function seedDefaults() {
    $("atk").value = "1500";
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
    $("showNotes").checked = false;
  }

  syncUltType();
  syncSkillBMode();
  seedDefaults();
  normalizeAll();
  syncNoteVisibility();
  initBindings();
  setupSegments();
  setupAccordions();
  if (!load(true)) {
    validateAndRender();
  }
  pvCountOnce();
})();