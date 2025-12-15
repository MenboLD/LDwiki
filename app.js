(() => {
  const F = 40;
  const $ = (id) => document.getElementById(id);
  const r6 = (x) => (isFinite(x) ? Math.round(x * 1e6) / 1e6 : NaN);

  const addComma = (nStr) => String(nStr).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  function setErr(el, on) { if (el) el.classList.toggle("errField", !!on); }
  function setLblErr(el, on) { if (el) el.classList.toggle("errLbl", !!on); }
  function setLblDim(el, on) { if (el) el.classList.toggle("dimLbl", !!on); }

  function sanitizeNumDot(raw) {
    let s = String(raw ?? "");
    s = s.replace(/,/g, "");
    s = s.replace(/%/g, "");
    s = s.replace(/[^\d.]/g, "");
    const d = s.indexOf(".");
    if (d >= 0) s = s.slice(0, d + 1) + s.slice(d + 1).replace(/\./g, "");
    return s;
  }

  function trimDecimals(raw, maxDec) {
    const s = sanitizeNumDot(raw);
    if (maxDec <= 0) return (s.split(".")[0] || "0");
    const [a, b = ""] = s.split(".");
    if (!b) return (a || "0");
    return `${a || "0"}.${b.slice(0, maxDec)}`;
  }

  function trimIntDigits(raw, maxDigits) {
    let s = String(raw ?? "").replace(/,/g, "").replace(/%/g, "");
    s = s.replace(/[^\d]/g, "");
    if (!s) s = "0";
    s = s.slice(0, maxDigits);
    return s;
  }

  function toPctDisplay(raw, maxDec, maxIntDigits) {
    let t = trimDecimals(raw, maxDec);
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
    const x = parseFloat(t);
    const v = isFinite(x) ? x : 0;
    return `${v.toFixed(1)}%`;
  }

  function toAspdDisplay(raw) {
    const t = trimDecimals(raw, 2);
    const x = parseFloat(t);
    const v = isFinite(x) ? x : 0;
    return v.toFixed(2);
  }

  function toAtkDisplay(raw) {
    const s = trimIntDigits(raw, 6);
    const n = parseInt(s, 10) || 0;
    return addComma(n);
  }

  function toIntDisplay(raw, maxDigits) {
    const s = trimIntDigits(raw, maxDigits);
    return String(parseInt(s, 10) || 0);
  }

  function readNumber(raw) {
    const t = String(raw ?? "").replace(/,/g, "").replace(/%/g, "");
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
      if (!third.value) third.value = "0.0%";
    } else {
      lbl.textContent = "規定回数";
      third.disabled = false;
      thirdWrap.classList.remove("disabledGroup");
      third.setAttribute("inputmode", "numeric");
      third.value = String(readInt(third.value));
    }
  }

  function bindField(el, onInputSanitize, onCommitFormat) {
    el.addEventListener("input", () => { el.value = onInputSanitize(el.value); });
    const commit = () => { el.value = onCommitFormat(el.value); validateAndRender(); };
    el.addEventListener("blur", commit);
    el.addEventListener("change", commit);
  }

  function initBindings() {
    bindField($("atk"), (v)=>trimIntDigits(v,6), (v)=>toAtkDisplay(v));
    bindField($("aspd"), (v)=>trimDecimals(v,2), (v)=>toAspdDisplay(v));
    bindField($("gaugeMax"), (v)=>trimIntDigits(v,3), (v)=>toIntDisplay(v,3));

    bindField($("manaRegenPct"), (v)=>trimDecimals(v,1), (v)=>toPctDisplay(v,1,4));

    bindField($("ultMulPct"), (v)=>trimDecimals(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("ultF"), (v)=>trimIntDigits(v,4), (v)=>toIntDisplay(v,4));

    bindField($("aMulPct"), (v)=>trimDecimals(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("aPPct"), (v)=>trimDecimals(v,1), (v)=>toProbPctDisplay(v));
    bindField($("aF"), (v)=>trimIntDigits(v,4), (v)=>toIntDisplay(v,4));

    bindField($("bMulPct"), (v)=>trimDecimals(v,1), (v)=>toPctDisplay(v,1,6));
    bindField($("bF"), (v)=>trimIntDigits(v,4), (v)=>toIntDisplay(v,4));

    $("bThird").addEventListener("input", () => {
      const bType = $("bType").value;
      if (bType === "prob") $("bThird").value = trimDecimals($("bThird").value, 1);
      else if (bType === "count") $("bThird").value = trimIntDigits($("bThird").value, 2);
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
    $("ultReset").addEventListener("change", validateAndRender);
    $("ultStopsGauge").addEventListener("change", validateAndRender);
    $("bType").addEventListener("change", () => { syncSkillBMode(); validateAndRender(); });

    $("calcBtn").addEventListener("click", () => { normalizeAll(); validateAndRender(); });
    $("saveBtn").addEventListener("click", save);
    $("loadBtn").addEventListener("click", load);
    $("resetBtn").addEventListener("click", resetAll);
  }

  function normalizeAll() {
    $("atk").value = toAtkDisplay($("atk").value);
    $("aspd").value = toAspdDisplay($("aspd").value);
    $("gaugeMax").value = toIntDisplay($("gaugeMax").value, 3);
    $("manaRegenPct").value = toPctDisplay($("manaRegenPct").value, 1, 4);

    $("ultMulPct").value = toPctDisplay($("ultMulPct").value, 1, 6);
    $("ultF").value = toIntDisplay($("ultF").value, 4);

    $("aMulPct").value = toPctDisplay($("aMulPct").value, 1, 6);
    $("aPPct").value = toProbPctDisplay($("aPPct").value);
    $("aF").value = toIntDisplay($("aF").value, 4);

    $("bMulPct").value = toPctDisplay($("bMulPct").value, 1, 6);
    $("bF").value = toIntDisplay($("bF").value, 4);

    syncSkillBMode();
    if ($("bType").value === "prob") $("bThird").value = toProbPctDisplay($("bThird").value);
    if ($("bType").value === "count") $("bThird").value = String(readInt($("bThird").value));
  }

  function getValInternal() {
    const atk = readInt($("atk").value);
    const aspd = readNumber($("aspd").value);
    const gaugeMax = readInt($("gaugeMax").value);

    const regenPct = readNumber($("manaRegenPct").value);
    const manaPerSec = regenPct / 100;

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

    return { atk, aspd, gaugeMax, manaPerSec, ultType, ultReset, ultMul, ultF, ultStopsGauge, aMul, aP, aF, bType, bMul, bF, bP, bN };
  }

  function clearErrAll() {
    const ids = ["atk","aspd","gaugeMax","manaRegenPct","ultMulPct","ultF","aMulPct","aPPct","aF","bMulPct","bThird","bF"];
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
      if (regen < 0) { setErr($("manaRegenPct"), true); setLblErr($("regenLbl"), true); errors.push("Regeマナ/1sは0%以上"); }
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
      return { dps: nu.nonUltDPS, detail: { ...nu, cycleFrames: NaN, cycleDamage: NaN, framesNonUltToReady: NaN } };
    }

    const ultDamage = v.atk * v.ultMul;

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
        cycleDamage = nu.nonUltDPS * (framesNonUltToReady / F) + ultDamage;
      } else {
        const timeManaPerFrame_ult = (v.ultStopsGauge ? 0 : (v.manaPerSec / F));
        const manaGainDuringUlt = timeManaPerFrame_ult * v.ultF;

        const remain = Math.max(0, v.gaugeMax - manaGainDuringUlt);
        framesNonUltToReady = remain / manaPerFrame_nonUlt;

        cycleFrames = v.ultF + framesNonUltToReady;
        cycleDamage = ultDamage + nu.nonUltDPS * (framesNonUltToReady / F);
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
        cycleDamage = nu.nonUltDPS * (framesNonUltToReady / F) + ultDamage;
      } else {
        const coolPerFrame_ult = (v.ultStopsGauge ? 0 : (1 / F));
        const coolGainDuringUlt = coolPerFrame_ult * v.ultF;

        const remain = Math.max(0, v.gaugeMax - coolGainDuringUlt);
        framesNonUltToReady = remain / coolPerFrame_nonUlt;

        cycleFrames = v.ultF + framesNonUltToReady;
        cycleDamage = ultDamage + nu.nonUltDPS * (framesNonUltToReady / F);
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

    const basicDPS = basicPerSec * v.atk * 1;
    const aDPS = aPerSec * v.atk * mA;
    const bDPS = bPerSec * v.atk * mB;
    const ultDPS = ultPerSec * v.atk * (hasUlt ? v.ultMul : 0);

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

  function calcBoundaryRange(v, res) {
    if (v.ultType === "none") return null;
    if (v.ultReset !== "start") return null;
    if (v.ultStopsGauge) return null;

    const d = res.detail;
    const minTick = Math.floor(v.ultF / 40);
    const maxTick = Math.ceil(v.ultF / 40);
    if (minTick === maxTick) return null;

    const perTick = (v.ultType === "mana") ? v.manaPerSec : 1;
    const ultDamage = v.atk * v.ultMul;

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
      const cycleDamage = ultDamage + d.nonUltDPS * (framesNonUltToReady / 40);
      return cycleDamage / (cycleFrames / 40);
    }

    const dps1 = dpsFromTick(minTick);
    const dps2 = dpsFromTick(maxTick);
    if (!isFinite(dps1) || !isFinite(dps2)) return null;

    return { minTick, maxTick, lo: Math.min(dps1, dps2), hi: Math.max(dps1, dps2), perTick };
  }

  function setBar(fillId, valId, pct) {
    const p = Math.max(0, Math.min(100, pct));
    $(fillId).style.width = `${p}%`;
    $(valId).textContent = `${r6(p)}%`;
  }

  function render() {
    syncUltType();
    syncSkillBMode();

    const v = getValInternal();
    const res = calcTotal(v);

    if (res.err) {
      $("dpsOut").textContent = "計算エラー";
      $("dpsSub").textContent = res.err;
      $("detailOut").textContent = "";

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
      setBar("barU","valU",0);
      return;
    }

    $("dpsOut").textContent = `${r6(res.dps)}`;
    $("dpsSub").textContent = "（小数第6位まで = 第7位四捨五入）";

    const ex = calcRatesAndShares(v, res);

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

    lines.push("\n=== ダメージ内訳（DPS成分）と割合（合計=100%） ===");
    lines.push(`基本DPS成分: ${r6(ex.basicDPS)} / 基本割合(%): ${r6(ex.basicPct)}`);
    lines.push(`スキルA DPS成分: ${r6(ex.aDPS)} / スキルA割合(%): ${r6(ex.aPct)}`);
    lines.push(`スキルB DPS成分: ${r6(ex.bDPS)} / スキルB割合(%): ${r6(ex.bPct)}`);
    lines.push(`究極DPS成分: ${r6(ex.ultDPS)} / 究極割合(%): ${r6(ex.ultPct)}`);

    const br = calcBoundaryRange(v, res);
    if (br) {
      lines.push("\n=== 境界(40F)による厳密レンジ（開始位相で±1tickの差） ===");
      lines.push(`究極中のtick数: ${br.minTick}〜${br.maxTick} （1tickあたり+${br.perTick} ${v.ultType === "mana" ? "マナ" : "秒"}）`);
      lines.push(`DPSレンジ: ${r6(br.lo)} 〜 ${r6(br.hi)}`);
    }

    lines.push("\n--- 検算（丸めで微差が出る場合あり） ---");
    lines.push(`内訳合計DPS（基本+スキルA+スキルB+究極）: ${r6(ex.checkTotalDPS)}`);
    lines.push(`表示DPS（周期合成）: ${r6(res.dps)}`);

    $("detailOut").textContent = lines.join("\n");
  }

  function validateAndRender() {
    syncUltType();
    syncSkillBMode();

    const errs = validateInputs();
    if (errs.length) {
      $("dpsOut").textContent = "入力エラー";
      $("dpsSub").textContent = errs.join(" / ");
      $("detailOut").textContent = "";
      setBar("barBasic","valBasic",0);
      setBar("barA","valA",0);
      setBar("barB","valB",0);
      setBar("barU","valU",0);
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
  validateAndRender();
})();