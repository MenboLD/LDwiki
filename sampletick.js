(() => {
  // ============ config ============
  const BASE = [
    { id: 0,  name: "剣",   emoji: "⚔️" },
    { id: 1,  name: "盾",   emoji: "🛡️" },
    { id: 2,  name: "弓",   emoji: "🏹" },
    { id: 3,  name: "杖",   emoji: "🪄" },
    { id: 4,  name: "炎",   emoji: "🔥" },
    { id: 5,  name: "氷",   emoji: "🧊" },
    { id: 6,  name: "雷",   emoji: "⚡" },
    { id: 7,  name: "毒",   emoji: "☠️" },
    { id: 8,  name: "回復", emoji: "💚" },
    { id: 9,  name: "金",   emoji: "🪙" },
    { id: 10, name: "星",   emoji: "⭐" },
    { id: 11, name: "鍵",   emoji: "🗝️" },
    { id: 12, name: "爆弾", emoji: "💣" },
    { id: 13, name: "羽",   emoji: "🪽" },
    { id: 14, name: "王冠", emoji: "👑" },
  ];
  const N = BASE.length;

  // ループ感を安定させるために複数回並べる（奇数推奨）
  const REPEAT = 5; // 3でもOK。大きいほど巻き戻し頻度が減る
  const CENTER_GROUP = Math.floor(REPEAT / 2); // 例: REPEAT=5 -> 2
  const MID_START = N * CENTER_GROUP;          // 例: 30
  const MID_END_EXCLUSIVE = MID_START + N;     // 例: 45

  // ドラムを回したときの「重さ」
  const DRAG_SCALE = 0.9;

  // 自動スナップの速度
  const SNAP_MS = 170;

  // 高速ドラッグ時のティック過多を抑える
  const MAX_TICKS_PER_FRAME = 6;

  // ============ elements ============
  const track = document.getElementById("iconTrack");
  const label = document.getElementById("label");
  const drum  = document.getElementById("drum");
  const vp    = document.getElementById("iconViewport");

  // ============ render ============
  const items = [];
  for (let r = 0; r < REPEAT; r++) {
    for (let i = 0; i < N; i++) {
      const base = BASE[i];
      const abs = r * N + i;
      items.push({ abs, baseId: base.id, name: base.name, emoji: base.emoji });
    }
  }

  for (const it of items) {
    const el = document.createElement("div");
    el.className = "icon";
    el.dataset.abs = String(it.abs);
    el.dataset.base = String(it.baseId);
    el.title = it.name;
    el.innerHTML = `<div class="emoji" aria-hidden="true">${it.emoji}</div>`;
    track.appendChild(el);
  }
  const iconEls = [...track.querySelectorAll(".icon")];

  // ============ tick (haptics-like) ============
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(()=>{});
  }
  function playTick() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(180, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.035);
  }
  function vibrateTick() {
    // iOS Safariは基本非対応。対応端末だけ短く振動。
    if (navigator.vibrate) navigator.vibrate(8);
  }
  function tick() {
    playTick();
    vibrateTick();
  }

  // ============ math / measurements ============
  let x = 0;                // translateX(px)
  let vpCenter = 0;         // viewport center X (relative to vp left)
  let base0NoX = 0;         // item[0] center when x=0 (relative to vp left)
  let step = 70;            // measured distance between item centers
  let total = step * N;     // one full cycle width

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function mod(n, m){ return ((n % m) + m) % m; }

  function measure() {
    const vpr = vp.getBoundingClientRect();
    vpCenter = vpr.width / 2;

    const r0 = iconEls[0].getBoundingClientRect();
    const r1 = iconEls[1].getBoundingClientRect();

    const c0 = (r0.left - vpr.left) + (r0.width / 2);
    const c1 = (r1.left - vpr.left) + (r1.width / 2);

    step = Math.max(1, c1 - c0);
    total = step * N;

    // 現在のxが効いてる分を除去して「x=0の時の基準」を作る
    base0NoX = c0 - x;
  }

  // item abs index k center (relative to vp left)
  function centerOfAbs(k) {
    return base0NoX + (k * step) + x;
  }

  // 現在のxから「中央に最も近い abs index」を推定
  function nearestAbs() {
    const kFloat = (vpCenter - x - base0NoX) / step;
    return Math.round(kFloat);
  }

  // xを巻き戻して、absが常に中央グループに落ちるようにする
  function wrapToMiddle(abs) {
    // absを [MID_START, MID_END_EXCLUSIVE) に寄せる
    while (abs < MID_START) {
      x -= total; // content left, abs + N
      abs += N;
    }
    while (abs >= MID_END_EXCLUSIVE) {
      x += total; // content right, abs - N
      abs -= N;
    }
    return abs;
  }

  function xForAbs(abs) {
    // absの中心がvpCenterに来るx
    return vpCenter - base0NoX - (abs * step);
  }

  // ============ selection / UI ============
  let selectedBase = 0;
  let selectedAbs = MID_START; // 中央グループから始める
  let lastTickAbs = selectedAbs;

  function renderSelection(abs) {
    abs = clamp(abs, 0, iconEls.length - 1);
    selectedAbs = abs;

    // base indexはループ（0..N-1）
    selectedBase = mod(abs, N);

    iconEls.forEach((el, i) => el.classList.toggle("selected", i === selectedAbs));
    label.textContent = `選択: ${BASE[selectedBase].name}（#${selectedBase}）`;
    drum.setAttribute("aria-valuenow", String(selectedBase));
  }

  function applyTransform({tickAllowed} = {tickAllowed:true}) {
    track.style.transform = `translate3d(${x}px,0,0)`;

    if (!tickAllowed) return;

    const abs = wrapToMiddle(nearestAbs());
    if (abs !== lastTickAbs) {
      const diff = Math.abs(abs - lastTickAbs);
      for (let k = 0; k < Math.min(diff, MAX_TICKS_PER_FRAME); k++) tick();
      lastTickAbs = abs;
      renderSelection(abs);
    }
  }

  // ============ snapping ============
  let raf = 0;
  let snapping = false;

  function snap() {
    snapping = true;

    let abs = wrapToMiddle(nearestAbs());
    const targetX = xForAbs(abs);
    const startX = x;
    const delta = targetX - startX;

    const t0 = performance.now();
    cancelAnimationFrame(raf);

    const anim = (t) => {
      const p = clamp((t - t0) / SNAP_MS, 0, 1);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      x = startX + delta * e;

      // スナップ中はティック抑制（音が連打になりやすい）
      track.style.transform = `translate3d(${x}px,0,0)`;

      if (p < 1) {
        raf = requestAnimationFrame(anim);
      } else {
        x = targetX;

        // 巻き戻し位置を安定化
        abs = wrapToMiddle(abs);
        track.style.transform = `translate3d(${x}px,0,0)`;

        lastTickAbs = abs;
        renderSelection(abs);
        snapping = false;
      }
    };
    raf = requestAnimationFrame(anim);
  }

  // ============ pointer (drum) ============
  let dragging = false;
  let lastClientX = 0;
  let lastTime = 0;
  let velocity = 0;

  function onStart(clientX) {
    dragging = true;
    lastClientX = clientX;
    lastTime = performance.now();
    velocity = 0;

    ensureAudio();
    cancelAnimationFrame(raf);
    snapping = false;
  }

  function onMove(clientX) {
    if (!dragging) return;

    const now = performance.now();
    const dx = (clientX - lastClientX) * DRAG_SCALE;
    const dt = Math.max(1, now - lastTime);

    x += dx;
    velocity = dx / dt;

    lastClientX = clientX;
    lastTime = now;

    applyTransform({tickAllowed:true});
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;

    // 軽い慣性
    const inertia = clamp(velocity, -1.2, 1.2);
    x += inertia * 120;

    applyTransform({tickAllowed:true});
    snap();
  }

  drum.addEventListener("pointerdown", (e) => {
    drum.setPointerCapture(e.pointerId);
    onStart(e.clientX);
  });
  drum.addEventListener("pointermove", (e) => onMove(e.clientX));
  drum.addEventListener("pointerup", onEnd);
  drum.addEventListener("pointercancel", onEnd);

  // ============ keyboard ============
  drum.addEventListener("keydown", (e) => {
    ensureAudio();
    if (snapping) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      let abs = wrapToMiddle(selectedAbs);
      abs += (e.key === "ArrowRight") ? 1 : -1;

      // absが中央グループから外れたら巻き戻ししつつ維持
      abs = wrapToMiddle(abs);

      // 1ステップ分はティック（操作のフィードバック）
      tick();
      lastTickAbs = abs;

      x = xForAbs(abs);
      track.style.transform = `translate3d(${x}px,0,0)`;
      renderSelection(abs);

      e.preventDefault();
    }
  });

  // ============ init / resize ============
  function init() {
    // まず計測
    measure();

    // 中央グループの先頭を選択して開始（見た目が安定）
    selectedAbs = MID_START;
    x = xForAbs(selectedAbs);

    // xが変わったので、基準再計測（xを引いてbase0NoXを保つ）
    measure();

    lastTickAbs = selectedAbs;
    track.style.transform = `translate3d(${x}px,0,0)`;
    renderSelection(selectedAbs);
  }

  window.addEventListener("load", init);
  window.addEventListener("resize", () => {
    // レイアウトが変わると基準も変わるので再計測
    measure();

    // 現在選択を維持したまま中央へ
    const abs = wrapToMiddle(selectedAbs);
    x = xForAbs(abs);

    measure();
    lastTickAbs = abs;
    track.style.transform = `translate3d(${x}px,0,0)`;
    renderSelection(abs);
  });
})();