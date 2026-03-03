(() => {
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

  // 端まで行けないように「中央で巻き戻し」するため、繰り返し数を多めに
  const REPEAT = 11; // 5だと端に到達しやすいので増やす
  const CENTER_GROUP = Math.floor(REPEAT / 2);
  const MID_START = N * CENTER_GROUP;
  const MID_END_EXCLUSIVE = MID_START + N;

  // 中央グループの端に寄る前に巻き戻す（これで物理端が見えない）
  const SAFE = 3;

  const DRAG_SCALE = 0.9;
  const SNAP_MS = 170;
  const MAX_TICKS_PER_FRAME = 6;

  const track = document.getElementById("iconTrack");
  const label = document.getElementById("label");
  const drum  = document.getElementById("drum");
  const vp    = document.getElementById("iconViewport");

  // render repeated list
  const items = [];
  for (let r = 0; r < REPEAT; r++) {
    for (let i = 0; i < N; i++) {
      const b = BASE[i];
      items.push({ abs: r * N + i, base: i, name: b.name, emoji: b.emoji });
    }
  }
  track.innerHTML = "";
  for (const it of items) {
    const el = document.createElement("div");
    el.className = "icon";
    el.dataset.abs = String(it.abs);
    el.dataset.base = String(it.base);
    el.title = it.name;
    el.innerHTML = `<div class="emoji" aria-hidden="true">${it.emoji}</div>`;
    track.appendChild(el);
  }
  const iconEls = [...track.querySelectorAll(".icon")];

  // tick (haptics-like)
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
    if (navigator.vibrate) navigator.vibrate(8); // iOSは基本非対応
  }
  function tick() { playTick(); vibrateTick(); }

  // geometry (pure math)
  let x = 0;
  let vpCenter = 0;
  let pad = 0;
  let iconW = 60;
  let gap = 10;
  let STEP = 70;
  let total = STEP * N;

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function mod(n, m){ return ((n % m) + m) % m; }

  function measure() {
    const vpr = vp.getBoundingClientRect();
    vpCenter = vpr.width / 2;

    pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;

    const r0 = iconEls[0].getBoundingClientRect();
    iconW = r0.width || 60;

    const cs = getComputedStyle(track);
    gap = parseFloat(cs.columnGap || cs.gap) || 10;

    STEP = iconW + gap;
    total = STEP * N;
  }

  function xForAbs(abs) {
    // center abs at viewport center
    return vpCenter - (pad + abs * STEP + iconW / 2);
  }

  function nearestAbs() {
    const kFloat = (vpCenter - pad - (iconW / 2) - x) / STEP;
    return Math.round(kFloat);
  }

  function recenterAbs(abs) {
    // keep abs within safe window of middle group
    while (abs < MID_START + SAFE) { abs += N; x -= total; }
    while (abs > (MID_END_EXCLUSIVE - 1 - SAFE)) { abs -= N; x += total; }
    return abs;
  }

  // selection
  let selectedAbs = MID_START;
  let lastTickAbs = selectedAbs;

  function renderSelection(abs) {
    abs = clamp(abs, 0, items.length - 1);
    selectedAbs = abs;
    const base = mod(abs, N);

    iconEls.forEach((el, i) => el.classList.toggle("selected", i === selectedAbs));
    label.textContent = `選択: ${BASE[base].name}（#${base}）`;
    drum.setAttribute("aria-valuenow", String(base));
  }

  function applyTransform({tickAllowed} = {tickAllowed:true}) {
    let abs = nearestAbs();
    abs = recenterAbs(abs);

    track.style.transform = `translate3d(${x}px,0,0)`;

    if (!tickAllowed) return;

    if (abs !== lastTickAbs) {
      const diff = Math.abs(abs - lastTickAbs);
      for (let k = 0; k < Math.min(diff, MAX_TICKS_PER_FRAME); k++) tick();
      lastTickAbs = abs;
      renderSelection(abs);
    }
  }

  // snapping
  let raf = 0;
  let snapping = false;

  function snap() {
    snapping = true;

    let abs = nearestAbs();
    abs = recenterAbs(abs);

    const targetX = xForAbs(abs);
    const startX = x;
    const delta = targetX - startX;

    const t0 = performance.now();
    cancelAnimationFrame(raf);

    const anim = (t) => {
      const p = clamp((t - t0) / SNAP_MS, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);

      x = startX + delta * e;
      track.style.transform = `translate3d(${x}px,0,0)`;

      if (p < 1) {
        raf = requestAnimationFrame(anim);
      } else {
        x = targetX;

        abs = recenterAbs(abs);
        track.style.transform = `translate3d(${x}px,0,0)`;

        lastTickAbs = abs;
        renderSelection(abs);
        snapping = false;
      }
    };

    raf = requestAnimationFrame(anim);
  }

  // pointer
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

  // keyboard
  drum.addEventListener("keydown", (e) => {
    ensureAudio();
    if (snapping) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      let abs = selectedAbs + (e.key === "ArrowRight" ? 1 : -1);
      abs = recenterAbs(abs);

      tick();
      lastTickAbs = abs;

      x = xForAbs(abs);
      track.style.transform = `translate3d(${x}px,0,0)`;
      renderSelection(abs);

      e.preventDefault();
    }
  });

  // init / resize
  function init() {
    measure();

    selectedAbs = MID_START; // middle group start
    x = xForAbs(selectedAbs);

    lastTickAbs = selectedAbs;
    track.style.transform = `translate3d(${x}px,0,0)`;
    renderSelection(selectedAbs);
  }

  window.addEventListener("load", init);
  window.addEventListener("resize", () => {
    measure();
    const abs = recenterAbs(selectedAbs);
    x = xForAbs(abs);

    lastTickAbs = abs;
    track.style.transform = `translate3d(${x}px,0,0)`;
    renderSelection(abs);
  });
})();