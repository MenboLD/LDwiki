(function(){
  const $ = (id) => document.getElementById(id);

  function showErr(e){
    $("errBox").style.display = "block";
    $("errText").textContent = (e && e.stack) ? e.stack : String(e);
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>\"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[c]));
  }

  function kv(k,v){
    return `<div class="kv"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;
  }

  // URL例:
  //  /units/unit.html?u=m515
  //  /units/unit.html?u=716   （数値なら base_id として解決）
  async function resolveUnitCode(sb, u){
    const s = (u || "").trim();
    if(!s) return "101"; // 仮デフォルト（必要なら変えてOK）
    if(/^\d+$/.test(s)){
      const { data, error } = await sb
        .from("ld_units_master")
        .select("unit_code, base_id, name_jp, name_en")
        .eq("base_id", Number(s))
        .maybeSingle();
      if(error) throw error;
      if(!data) throw new Error(`base_id=${s} が ld_units_master に見つからない`);
      return data.unit_code;
    }
    return s;
  }

  function renderIcon(urlOrEmpty, fallbackText){
    const el = $("unitIcon");
    el.innerHTML = "";
    if(urlOrEmpty){
      const img = document.createElement("img");
      img.src = urlOrEmpty;
      img.alt = "";
      el.appendChild(img);
    }else{
      el.textContent = fallbackText || "No Image";
    }
  }

  async function main(){
    // supabase_config.js が window.supabaseClient を用意している想定
    const sb = window.supabaseClient || window.supabase || window._supabase;
    if(!sb) throw new Error("Supabase client が見つからない（supabase_config.js の公開名を確認）");

    const params = new URLSearchParams(location.search);
    const u = params.get("u") || params.get("unit") || params.get("unit_code") || "";
    const unit_code = await resolveUnitCode(sb, u);

    $("unitCodeLine").textContent = `unit_code: ${unit_code}`;

    // master（常に存在）
    const masterRes = await sb.from("ld_units_master")
      .select("unit_code, base_id, rarity, name_jp, name_en, icon_filename, icon_big_filename")
      .eq("unit_code", unit_code)
      .maybeSingle();
    if(masterRes.error) throw masterRes.error;
    const master = masterRes.data;

    // pages（wiki拡張）
    const pagesRes = await sb.from("ld_unit_pages")
      .select("*")
      .eq("unit_code", unit_code)
      .maybeSingle();
    if(pagesRes.error) throw pagesRes.error;
    const page = pagesRes.data || {};

    // articles
    const artRes = await sb.from("ld_unit_articles")
      .select("overview_md, role_md, rating_md")
      .eq("unit_code", unit_code)
      .maybeSingle();
    if(artRes.error) throw artRes.error;
    const art = artRes.data || {};

    // abilities + details
    const abilRes = await sb.from("ld_unit_abilities")
      .select("ability_no, name, category, effect_short, nomf, updated_at")
      .eq("unit_code", unit_code)
      .order("ability_no", { ascending: true });
    if(abilRes.error) throw abilRes.error;

    const detRes = await sb.from("ld_unit_ability_details")
      .select("ability_no, detail_md")
      .eq("unit_code", unit_code)
      .order("ability_no", { ascending: true });
    if(detRes.error) throw detRes.error;
    const detailMap = new Map((detRes.data||[]).map(x => [x.ability_no, x.detail_md]));

    // level mods
    const lvRes = await sb.from("ld_unit_level_mods")
      .select("lv, effect_text")
      .eq("unit_code", unit_code)
      .order("lv", { ascending: true });
    if(lvRes.error) throw lvRes.error;

    // materials
    const matRes = await sb.from("ld_unit_materials")
      .select("sort_no, material_unit_code, qty")
      .eq("unit_code", unit_code)
      .order("sort_no", { ascending: true });
    if(matRes.error) throw matRes.error;

    // forms
    const formRes = await sb.from("ld_unit_forms")
      .select("relation_type, related_unit_code, sort_no")
      .eq("unit_code", unit_code)
      .order("relation_type", { ascending: true })
      .order("sort_no", { ascending: true });
    if(formRes.error) throw formRes.error;

    // treasures
    const trRes = await sb.from("ld_unit_treasures")
      .select("treasure_name, treasure_icon_url")
      .eq("unit_code", unit_code)
      .maybeSingle();
    if(trRes.error) throw trRes.error;
    const treasure = trRes.data;

    const trLvRes = await sb.from("ld_unit_treasure_levels")
      .select("lv, effect_text")
      .eq("unit_code", unit_code)
      .order("lv", { ascending: true });
    if(trLvRes.error) throw trLvRes.error;

    // comments（表示のみ）
    const cRes = await sb.from("ld_unit_comments")
      .select("created_at, body_text")
      .eq("unit_code", unit_code)
      .order("created_at", { ascending: false })
      .limit(20);
    if(cRes.error) throw cRes.error;

    // ====== render ======
    const nameJP = (page.name_jp && String(page.name_jp).trim()) ? page.name_jp : (master?.name_jp || "");
    const nameEN = (page.name_en && String(page.name_en).trim()) ? page.name_en : (master?.name_en || "");

    $("unitName").textContent = nameJP ? `${nameJP}${nameEN ? ` / ${nameEN}` : ""}` : (nameEN || unit_code);
    $("unitMeta").textContent = [
      page.rank || master?.rarity || "",
      page.race || ""
    ].filter(Boolean).join(" / ");

    renderIcon(page.icon_url || "", master?.icon_filename || unit_code);

    // stats
    $("unitStats").innerHTML = [
      kv("ATK(Lv1)", page.atk_lv1 ?? ""),
      kv("ASPD(Lv1)", page.aspd_lv1 ?? ""),
      kv("Range(min)", page.range_min ?? "0.0"),
      kv("Range(max)", page.range_max ?? ""),
      kv("覚醒条件", page.awakening_text ?? ""),
    ].join("");

    // materials
    if((matRes.data||[]).length){
      $("materialsCard").style.display = "block";
      $("materials").innerHTML = (matRes.data||[])
        .map(x => `<span class="chip">${esc(x.material_unit_code)} ×${esc(x.qty)}</span>`)
        .join("");
    }

    // forms
    if((formRes.data||[]).length){
      $("formsCard").style.display = "block";
      $("forms").innerHTML = (formRes.data||[]).map(x => {
        return `<div class="item">
          <div class="sub">${esc(x.relation_type)}</div>
          <div>${esc(x.related_unit_code)}</div>
        </div>`;
      }).join("");
    }

    // abilities accordion
    const abilitiesEl = $("abilities");
    const abilities = abilRes.data || [];
    if(!abilities.length){
      abilitiesEl.innerHTML = `<div class="sub">（データなし）</div>`;
    }else{
      abilitiesEl.innerHTML = abilities.map(a => {
        const d = detailMap.get(a.ability_no) || "";
        const hasDetail = !!String(d).trim();
        return `
          <div class="rowHead" data-ability="${a.ability_no}">
            <div class="left">
              <span class="badge">#${esc(a.ability_no)}</span>
              <span>${esc(a.name)}</span>
              ${a.category ? `<span class="badge">${esc(a.category)}</span>` : ""}
              ${a.nomf != null ? `<span class="badge">NoMF:${esc(a.nomf)}</span>` : ""}
            </div>
            <div class="sub">${esc(a.effect_short || "")}</div>
          </div>
          <div class="rowBody" id="ab_body_${a.ability_no}">
            ${hasDetail ? `<div class="md">${esc(d)}</div>` : `<div class="sub">（詳細なし）</div>`}
          </div>
        `;
      }).join("");

      abilitiesEl.querySelectorAll(".rowHead").forEach(head => {
        head.addEventListener("click", () => {
          const n = head.getAttribute("data-ability");
          const body = document.getElementById(`ab_body_${n}`);
          body.classList.toggle("open");
        });
      });
    }

    // level mods
    const lvs = lvRes.data || [];
    $("levelMods").innerHTML = lvs.length
      ? lvs.map(x => `<div class="item"><b>Lv${esc(x.lv)}</b><div class="sub">${esc(x.effect_text)}</div></div>`).join("")
      : `<div class="sub">（データなし）</div>`;

    // treasure
    if(treasure){
      $("treasureCard").style.display = "block";
      $("treasureName").textContent = treasure.treasure_name || "";
      const trs = trLvRes.data || [];
      $("treasureLevels").innerHTML = trs.length
        ? trs.map(x => `<div class="item"><b>Lv${esc(x.lv)}</b><div class="sub">${esc(x.effect_text)}</div></div>`).join("")
        : `<div class="sub">（データなし）</div>`;
    }

    // articles（最小：そのままテキスト表示）
    $("articleOverview").textContent = art.overview_md || "（概要なし）";
    $("articleRole").textContent = art.role_md || "（役割なし）";
    $("articleRating").textContent = art.rating_md || "（評価なし）";

    // comments
    const cs = cRes.data || [];
    $("comments").innerHTML = cs.length
      ? cs.map(x => `<div class="item"><div class="sub">${esc(x.created_at)}</div><div>${esc(x.body_text)}</div></div>`).join("")
      : `<div class="sub">（コメントなし）</div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    main().catch(showErr);
  });
})();