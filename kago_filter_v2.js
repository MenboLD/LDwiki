/* @wiki-safe KAGO filter v2
   DOM / KAGO_DATA の読み込み順が前後しても初期化できるよう待機方式にしています。 */
var LD_KAGO_V2_STARTED = false;
var LD_KAGO_V2_TRIES = 0;

function ldKagoV2Text(v) {
  if (v === null || typeof v === "undefined") return "";
  return String(v);
}

function ldKagoV2Escape(v) {
  var s = ldKagoV2Text(v);
  s = s.replace(/&/g, "&amp;");
  s = s.replace(/</g, "&lt;");
  s = s.replace(/>/g, "&gt;");
  s = s.replace(/"/g, "&quot;");
  return s;
}

function ldKagoV2Start() {
  if (LD_KAGO_V2_STARTED) return;

  if (typeof KAGO_DATA === "undefined" || !KAGO_DATA ||
      !KAGO_DATA.rows || !KAGO_DATA.columns) {
    ldKagoV2Wait();
    return;
  }

  var area = document.getElementById("ld-kago-columns");
  var filters = document.getElementById("ld-kago-filters");
  var thead = document.getElementById("ld-kago-thead");
  var tbody = document.getElementById("ld-kago-tbody");

  if (!area || !filters || !thead || !tbody) {
    ldKagoV2Wait();
    return;
  }

  LD_KAGO_V2_STARTED = true;

  var C = KAGO_DATA.columns;
  var R = KAGO_DATA.rows;
  var visible = {};
  var selected = {};
  var sortKey = "ID";
  var sortDir = 1;

  visible["加護の名称"] = true;
  visible["加護の効果"] = true;

  var categories = {
    "ダメージ": [
      "指輪ダメージ","武器ダメージ","武器ダメージ(固定値)",
      "(武器)最終ダメージ","(指輪)最終ダメージ"
    ],
    "条件": [
      "永続加算有無","誘発型条件","常在型条件","限定ターン数と条件"
    ],
    "ステータス": [
      "追加HP","追加MP","追加STR","追加DEX","追加EVA","追加SPD",
      "追加クリティカル率","追加クリティカルダメージ"
    ],
    "支援": [
      "タイプ1","タイプ2","タイプ3","HP回復有無","MP回復有無","軽減有無",
      "EXP関連有無","GOLD関連有無","ポーション関連有無","シールド関連有無"
    ]
  };

  var search = document.getElementById("ld-kago-search");
  var count = document.getElementById("ld-kago-count");
  var total = document.getElementById("ld-kago-total");
  var reset = document.getElementById("ld-kago-reset");

  function has(v) {
    return ldKagoV2Text(v) !== "";
  }

  function rowMatch(row) {
    var q = search ? ldKagoV2Text(search.value).toLowerCase() : "";
    var key, i;

    if (q) {
      var t = (ldKagoV2Text(row["加護の名称"]) + " " +
               ldKagoV2Text(row["加護の効果"])).toLowerCase();
      if (t.indexOf(q) < 0) return false;
    }

    var any = false;
    for (key in selected) {
      if (selected.hasOwnProperty(key)) {
        any = true;
        break;
      }
    }

    if (!any) return true;

    for (i = 0; i < C.length; i++) {
      key = C[i];
      if (selected[key] && has(row[key])) return true;
    }
    return false;
  }

  function compare(a, b) {
    var av = ldKagoV2Text(a[sortKey]);
    var bv = ldKagoV2Text(b[sortKey]);

    if (sortKey === "ID") {
      var an = parseInt(av, 10);
      var bn = parseInt(bv, 10);
      if (!isNaN(an) && !isNaN(bn)) {
        if (an < bn) return -1 * sortDir;
        if (an > bn) return 1 * sortDir;
        return 0;
      }
    }

    av = av.toLowerCase();
    bv = bv.toLowerCase();
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  }

  function renderTable() {
    var list = [];
    var i, j, key, h = "", b = "";
    var lastRarity = "";
    var shade = 0;

    for (i = 0; i < R.length; i++) {
      if (rowMatch(R[i])) list.push(R[i]);
    }
    list.sort(compare);

    for (i = 0; i < C.length; i++) {
      key = C[i];
      if (visible[key]) {
        h += '<th data-kago-sort="' + ldKagoV2Escape(key) + '">' +
             ldKagoV2Escape(key) + '</th>';
      }
    }

    for (i = 0; i < list.length; i++) {
      var rarity = ldKagoV2Text(list[i]["レアリティ"]);
      if (rarity !== lastRarity) {
        shade = 0;
        lastRarity = rarity;
      } else {
        shade = 1 - shade;
      }

      b += '<tr class="ld-kago-r-' + ldKagoV2Escape(rarity) +
           '-' + (shade ? "b" : "a") + '">';

      for (j = 0; j < C.length; j++) {
        key = C[j];
        if (visible[key]) {
          b += "<td>" +
            (has(list[i][key]) ? ldKagoV2Escape(list[i][key]) : "—") +
            "</td>";
        }
      }
      b += "</tr>";
    }

    thead.innerHTML = "<tr>" + h + "</tr>";
    tbody.innerHTML = b;

    if (count) count.innerHTML = String(list.length);
    if (total) total.innerHTML = String(R.length);

    var ths = thead.getElementsByTagName("th");
    for (i = 0; i < ths.length; i++) {
      ths[i].onclick = (function(th) {
        return function() {
          var k = th.getAttribute("data-kago-sort");
          if (sortKey === k) sortDir = sortDir * -1;
          else {
            sortKey = k;
            sortDir = 1;
          }
          renderTable();
        };
      })(ths[i]);
    }
  }

  function renderControls() {
    var s = "";
    var f = "";
    var i, j, name, any;

    for (i = 0; i < C.length; i++) {
      if (visible[C[i]]) {
        s += '<button type="button" data-kago-col="' +
             ldKagoV2Escape(C[i]) + '">' + ldKagoV2Escape(C[i]) + '</button>';
      }
    }

    for (name in categories) {
      if (categories.hasOwnProperty(name)) {
        any = false;
        for (j = 0; j < categories[name].length; j++) {
          if (selected[categories[name][j]]) {
            any = true;
            break;
          }
        }
        f += '<button type="button" data-kago-cat="' + ldKagoV2Escape(name) +
             '"' + (any ? ' class="ld-kago-on"' : '') + '>' +
             ldKagoV2Escape(name) + '</button>';
      }
    }

    area.innerHTML =
      '<div style="margin-bottom:6px;">表示中：' +
      (s || "加護の名称 / 加護の効果") + "</div>" + s;

    filters.innerHTML =
      '<div style="margin-bottom:6px;">カテゴリを選ぶと、列を表示して「値あり」で絞り込みます。</div>' +
      f;

    var bs = filters.getElementsByTagName("button");
    for (i = 0; i < bs.length; i++) {
      bs[i].onclick = (function(btn) {
        return function() {
          openModal(btn.getAttribute("data-kago-cat"));
        };
      })(bs[i]);
    }

    var cs = area.getElementsByTagName("button");
    for (i = 0; i < cs.length; i++) {
      cs[i].onclick = (function(btn) {
        return function() {
          var k = btn.getAttribute("data-kago-col");
          if (k !== "加護の名称" && k !== "加護の効果") {
            delete visible[k];
            delete selected[k];
            renderControls();
            renderTable();
          }
        };
      })(cs[i]);
    }
  }

  function openModal(name) {
    var old = document.getElementById("ld-kago-v2-modal");
    if (old) document.body.removeChild(old);

    var modal = document.createElement("div");
    modal.id = "ld-kago-v2-modal";
    modal.style.cssText =
      "position:fixed;left:0;top:0;width:100%;height:100%;z-index:99999;" +
      "background:rgba(0,0,0,.55);";

    var box = document.createElement("div");
    box.style.cssText =
      "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
      "width:calc(100% - 24px);max-width:560px;max-height:80%;overflow:auto;" +
      "background:#fff;color:#222;border-radius:8px;padding:14px;box-sizing:border-box;";

    var title = document.createElement("div");
    title.innerHTML = "<strong>" + ldKagoV2Escape(name) + "</strong>";
    title.style.cssText = "font-size:18px;margin-bottom:10px;";
    box.appendChild(title);

    var list = document.createElement("div");
    var cols = categories[name] || [];
    var i;

    for (i = 0; i < cols.length; i++) {
      var label = document.createElement("label");
      label.style.cssText = "display:block;padding:8px 4px;border-bottom:1px solid #eee;";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!selected[cols[i]];
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + cols[i]));

      input.onclick = (function(k, inp) {
        return function() {
          if (inp.checked) {
            selected[k] = true;
            visible[k] = true;
          } else {
            delete selected[k];
            delete visible[k];
          }
          renderControls();
          renderTable();
        };
      })(cols[i], input);

      list.appendChild(label);
    }
    box.appendChild(list);

    var actions = document.createElement("div");
    actions.style.cssText = "margin-top:12px;text-align:right;";

    var clear = document.createElement("button");
    clear.type = "button";
    clear.innerHTML = "このカテゴリをクリア";
    clear.onclick = function() {
      var a = categories[name] || [];
      var n;
      for (n = 0; n < a.length; n++) {
        delete selected[a[n]];
        delete visible[a[n]];
      }
      document.body.removeChild(modal);
      renderControls();
      renderTable();
    };
    actions.appendChild(clear);

    var close = document.createElement("button");
    close.type = "button";
    close.innerHTML = "閉じる";
    close.style.marginLeft = "8px";
    close.onclick = function() {
      document.body.removeChild(modal);
    };
    actions.appendChild(close);

    box.appendChild(actions);
    modal.appendChild(box);
    document.body.appendChild(modal);
  }

  if (search) {
    search.oninput = renderTable;
    search.onkeyup = renderTable;
  }

  if (reset) {
    reset.onclick = function() {
      var k;
      visible = {};
      selected = {};
      visible["加護の名称"] = true;
      visible["加護の効果"] = true;
      sortKey = "ID";
      sortDir = 1;
      if (search) search.value = "";
      renderControls();
      renderTable();
    };
  }

  renderControls();
  renderTable();
}

function ldKagoV2Wait() {
  LD_KAGO_V2_TRIES = LD_KAGO_V2_TRIES + 1;
  if (LD_KAGO_V2_TRIES > 60) return;
  setTimeout(ldKagoV2Start, 250);
}

ldKagoV2Start();
