/* menbo_kusogame.js
   Uses window.LD_SUPABASE_URL and window.LD_SUPABASE_ANON_KEY (from supabase_config.js)
*/
(function(){
  const SUPABASE_URL = window.LD_SUPABASE_URL || "https://teggcuiyqkbcvbhdntni.supabase.co";
  const SUPABASE_ANON_KEY = window.LD_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2djdWl5cWtiY3ZiaGRudG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTIyNzUsImV4cCI6MjA4MDE2ODI3NX0.R1p_nZdmR9r4k0fNwgr9w4irkFwp-T8tGiEeJwJioKc";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    document.getElementById("sceneTitle").textContent = "設定不足";
    document.getElementById("sceneBody").textContent =
      "Supabase の URL / ANON KEY が見つかりません。supabase_config.js を確認してください。";
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const el = {
    sub: document.getElementById("sub"),
    day: document.getElementById("day"),
    cond: document.getElementById("cond"),
    sceneTitle: document.getElementById("sceneTitle"),
    sceneBody: document.getElementById("sceneBody"),
    choices: document.getElementById("choices"),
    btnRestart: document.getElementById("btnRestart"),
  };

  const LS_KEY = "rg_run_id_v1";

  function setScene(title, body) {
    el.sceneTitle.textContent = title ?? "";
    el.sceneBody.textContent = body ?? "";
  }

  function setChoices(options, onPick) {
    el.choices.innerHTML = "";
    for (const opt of options || []) {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = opt.text;
      b.addEventListener("click", () => onPick(opt.id));
      el.choices.appendChild(b);
    }
  }

  function showRestart(show) {
    el.btnRestart.style.display = show ? "" : "none";
  }

  async function ensureAnonAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return;

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setScene("接続エラー", "Supabase の匿名ログインに失敗しました。設定を確認してください。");
      throw error;
    }
  }

  async function startRun() {
    const { data, error } = await supabase.rpc("rg_start_run");
    if (error) throw error;
    localStorage.setItem(LS_KEY, data.id);
    return data.id;
  }

  async function getState(runId) {
    const { data, error } = await supabase.rpc("rg_get_state", { p_run_id: runId });
    if (error) throw error;
    return data;
  }

  async function nextEvent(runId) {
    const { data, error } = await supabase.rpc("rg_next_event", { p_run_id: runId });
    if (error) throw error;
    return data;
  }

  async function choose(runId, optionId) {
    const { data, error } = await supabase.rpc("rg_choose", { p_run_id: runId, p_option_id: optionId });
    if (error) throw error;
    return data;
  }

  function renderState(state) {
    el.day.textContent = `旅程: ${state.depth}`;
    el.cond.textContent = `状態: ${state.condition}`;
  }

  async function renderGameOver(runId) {
    try {
      const s = await getState(runId);
      renderState(s);
    } catch {}

    setScene(
      "旅はここで途切れた",
      "あなたの物語は静かに終わった。\n次の旅では、違う出来事が待っているかもしれない。"
    );
    setChoices([], () => {});
    showRestart(true);
  }

  async function gameLoop() {
    await ensureAnonAuth();

    let runId = localStorage.getItem(LS_KEY);
    if (!runId) runId = await startRun();

    let state = await getState(runId);
    renderState(state);

    if (state.is_dead) {
      await renderGameOver(runId);
      return;
    }

    const pack = await nextEvent(runId);

    if (pack.type === "gameover") {
      setScene(pack.title, pack.body);
      setChoices([], () => {});
      showRestart(true);
      return;
    }

    setScene(pack.event.title, pack.event.body);
    setChoices(pack.options, async (optId) => {
      setChoices([{ text: "……", id: -1 }], () => {});
      const applied = await choose(runId, optId);

      if (applied.type === "gameover") {
        await renderGameOver(runId);
        return;
      }

      const newState = applied.state;
      renderState(newState);

      setScene("…", applied.flavor);
      setChoices([{ text: "進む", id: -2 }], async () => {
        await gameLoop();
      });
    });

    showRestart(false);
  }

  el.btnRestart.addEventListener("click", async () => {
    try {
      localStorage.removeItem(LS_KEY);
      await gameLoop();
    } catch (e) {
      setScene("エラー", String(e?.message ?? e));
      el.sceneBody.classList.add("bad");
    }
  });

  gameLoop().catch((e) => {
    setScene("起動失敗", `設定を確認してください。\n\n${String(e?.message ?? e)}`);
    el.sceneBody.classList.add("bad");
    showRestart(false);
  });
})();
