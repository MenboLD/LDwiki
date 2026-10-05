/* LuckyDefense KAGO filter - @wiki conservative build */
(function () {
  var DATA = null;

  try {
    if (typeof KAGO_DATA !== "undefined") {
      DATA = KAGO_DATA;
    }
  } catch (e) {
    DATA = null;
  }

  if (!DATA || !DATA.rows || !DATA.columns) {
    return;
  }

  var C = DATA.columns;
  var R = DATA.rows;
  var visible = {};
  var selected = {};
  var sortKey = "ID";
  var sortDir = 1;
  var initialized = false;

  var categories = {
    "ダメージ": [
      "指輪ダメージ",
      "武器ダメージ",
      "武器ダメージ(固定値)",
      "(武器)最終ダメージ",
      "(指輪)最終ダメージ"
    ],
    "条件": [
      "永続加算有無",
      "誘発型条件",
      "常在型条件",
      "限定ターン数と条件"
    ],
    "ステータス": [
      "追加HP",
      "追加MP",
      "追加STR",
      "追加DEX",
      "追加EVA",
      "追加SPD",
      "追加クリティカル率",
      "追加クリティカルダメージ"
    ],
    "支援": [
      "タイプ1",
      "タイプ2",
      "タイプ3",
      "HP回復有無",
      "MP回復有無",
      "軽減有無",
      "EXP関連有無",
      "GOLD関連有無",
      "ポーション関連有無",
      "シールド関連有無"
    ]
  };

  var rarityClass = {
    "N": "ld-kago-r-n",
    "R": "ld-kago-r-r",
    "E": "ld-kago-r-e",
    "L": "ld-kago-r-l",
    "M": "ld-kago-r-m"
  };

  var root = null;
  var columnArea = null;
  var filterArea = null;
  var thead = null;
  var tbody = null;
  var searchBox = null;
  var countBox = null;
  var totalBox = null;
  var resetButton = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function textValue(v) {
    if (v === null || typeof v === "undefined") {
      return "";
    }
    return String(v);
  }

  function hasText(v) {
    return textValue(v) !== "";
  }

  function escapeHtml(v) {
    var s = textValue(v);
    s = s.replace(/&/g, "&amp;");
    s = s.replace(/</g, "&lt;");
    s = s.replace(/>/g, "&gt;");
    s = s.replace(/"/g, "&quot;");
    return s;
  }

  function addStyle() {
    if (byId("ld-kago-style")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "ld-kago-style";
    style.type = "text/css";

    style.innerHTML =
      "#ld-kago-app{font-size:14px;line-height:1.5;color:#222;}" +
      "#ld-kago-toolbar{margin:8px 0;}" +
      "#ld-kago-columns button,#ld-kago-filters button{margin:3px;padding:7px 11px;border:1px solid #aaa;border-radius:5px;background:#fff;cursor:pointer;}" +
      "#ld-kago-columns button.ld-on,#ld-kago-filters button.ld-on{font-weight:bold;background:#eaf2ff;border-color:#5485c5;}" +
      "#ld-kago-modal{display:none;position:fixed;z-index:99999;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,.55);}" +
      "#ld-kago-modal-box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:calc(100% - 24px);max-width:560px;max-height:80%;overflow:auto;background:#fff;border-radius:8px;padding:14px;box-sizing:border-box;}" +
      "#ld-kago-modal-title{font-size:18px;font-weight:bold;margin-bottom:10px;}" +
      ".ld-kago-check{display:block;padding:7px 4px;border-bottom:1px solid #eee;}" +
      ".ld-kago-check input{margin-right:8px;}" +
      "#ld-kago-modal-actions{margin-top:12px;text-align:right;}" +
      "#ld-kago-modal-actions button{margin-left:6px;padding:7px 12px;}" +
      "#ld-kago-table-wrap{overflow:auto;max-width:100%;border:1px solid #ccc;}" +
      "#ld-kago-table{border-collapse:collapse;width:max-content;min-width:100%;}" +
      "#ld-kago-table th,#ld-kago-table td{border:1px solid #ccc;padding:6px 8px;vertical-align:top;text-align:left;white-space:nowrap;}" +
      "#ld-kago-table th{position:sticky;top:0;z-index:2;background:#eee;cursor:pointer;}" +
      "#ld-kago-table th.ld-sort{background:#dce8f8;}" +
      "#ld-kago-table .ld-name{font-weight:bold;white-space:normal;min-width:130px;}" +
      "#ld-kago-table .ld-effect{white-space:normal;min-width:240px;}" +
      "#ld-kago-table tr.ld-kago-r-n-a{background:#eeeeee;}" +
      "#ld-kago-table tr.ld-kago-r-n-b{background:#dddddd;}" +
      "#ld-kago-table tr.ld-kago-r-r-a{background:#e9f1ff;}" +
      "#ld-kago-table tr.ld-kago-r-r-b{background:#d6e5ff;}" +
      "#ld-kago-table tr.ld-kago-r-e-a{background:#f0e5ff;}" +
      "#ld-kago-table tr.ld-kago-r-e-b{background:#e1ceff;}" +
      "#ld-kago-table tr.ld-kago-r-l-a{background:#fff8d8;}" +
      "#ld-kago-table tr.ld-kago-r-l-b{background:#ffefad;}" +
      "#ld-kago-table tr.ld-kago-r-m-a{background:#e3f5e3;}" +
      "#ld-kago-table tr.ld-kago-r-m-b{background:#cdebcf;}" +
      "@media(max-width:600px){#ld-kago-modal-box{max-height:86%;}#ld-kago-table th,#ld-kago-table td{padding:5px 6px;font-size:13px;}}";

    document.getElementsByTagName("head")[0].appendChild(style);
  }

  function makeBase() {
    var h = byId("ld-kago-columns");
    var f = byId("ld-kago-filters");
    var t = byId("ld-kago-thead");
    var b = byId("ld-kago-tbody");

    if (h && f && t && b) {
      columnArea = h;
      filterArea = f;
      thead = t;
      tbody = b;
      return true;
    }

    return false;
  }

  function makeModal() {
    var old = byId("ld-kago-modal");
    if (old) {
      return;
    }

    var modal = document.createElement("div");
    modal.id = "ld-kago-modal";
    modal.innerHTML =
      '<div id="ld-kago-modal-box">' +
      '<div id="ld-kago-modal-title"></div>' +
      '<div id="ld-kago-modal-list"></div>' +
      '<div id="ld-kago-modal-actions">' +
      '<button type="button" id="ld-kago-modal-clear">このカテゴリをクリア</button>' +
      '<button type="button" id="ld-kago-modal-close">閉じる</button>' +
      '</div></div>';

    document.body.appendChild(modal);

    byId("ld-kago-modal-close").onclick = function () {
      modal.style.display = "none";
    };

    byId("ld-kago-modal-clear").onclick = function () {
      var title = byId("ld-kago-modal-title").innerHTML;
      var key;
      var i;
      var list = categories[title] || [];

      for (i = 0; i < list.length; i++) {
        key = list[i];
        delete selected[key];
        delete visible[key];
      }

      modal.style.display = "none";
      renderControls();
      renderTable();
    };

    modal.onclick = function (ev) {
      if (ev && ev.target === modal) {
        modal.style.display = "none";
      }
    };
  }

  function openCategory(name) {
    var modal = byId("ld-kago-modal");
    var list = byId("ld-kago-modal-list");
    var title = byId("ld-kago-modal-title");
    var cols = categories[name] || [];
    var s = "";
    var i;
    var key;

    title.innerHTML = escapeHtml(name);

    for (i = 0; i < cols.length; i++) {
      key = cols[i];
      s += '<label class="ld-kago-check">' +
        '<input type="checkbox" value="' + escapeHtml(key) + '"' +
        (selected[key] ? " checked" : "") +
        '>' + escapeHtml(key) + '</label>';
    }

    list.innerHTML = s;

    var inputs = list.getElementsByTagName("input");
    for (i = 0; i < inputs.length; i++) {
      inputs[i].onclick = (function (input, col) {
        return function () {
          if (input.checked) {
            selected[col] = true;
            visible[col] = true;
          } else {
            delete selected[col];
            delete visible[col];
          }
          renderControls();
          renderTable();
        };
      })(inputs[i], inputs[i].value);
    }

    modal.style.display = "block";
  }

  function renderControls() {
    var s = "";
    var f = "";
    var name;
    var i;
    var any = false;

    for (name in categories) {
      if (categories.hasOwnProperty(name)) {
        any = false;
        for (i = 0; i < categories[name].length; i++) {
          if (selected[categories[name][i]]) {
            any = true;
            break;
          }
        }

        f += '<button type="button" class="' + (any ? "ld-on" : "") +
          '" data-cat="' + escapeHtml(name) + '">' +
          escapeHtml(name) + '</button>';
      }
    }

    for (i = 0; i < C.length; i++) {
      if (visible[C[i]]) {
        s += '<button type="button" class="ld-on" data-col="' +
          escapeHtml(C[i]) + '">' + escapeHtml(C[i]) + '</button>';
      }
    }

    columnArea.innerHTML =
      '<div style="margin-bottom:5px;">表示中：' +
      (s || "加護の名称 / 加護の効果") + '</div>' + s;

    filterArea.innerHTML =
      '<div style="margin-bottom:5px;">カテゴリを選択すると、該当列を表示し、値が入っている加護だけに絞り込みます。</div>' +
      f;

    var bs = filterArea.getElementsByTagName("button");
    for (i = 0; i < bs.length; i++) {
      bs[i].onclick = (function (button) {
        return function () {
          openCategory(button.getAttribute("data-cat"));
        };
      })(bs[i]);
    }

    var cs = columnArea.getElementsByTagName("button");
    for (i = 0; i < cs.length; i++) {
      cs[i].onclick = (function (button) {
        return function () {
          var key = button.getAttribute("data-col");
          if (key !== "加護の名称" && key !== "加護の効果") {
            delete visible[key];
            delete selected[key];
          }
          renderControls();
          renderTable();
        };
      })(cs[i]);
    }
  }

  function rowMatches(row) {
    var q = searchBox ? textValue(searchBox.value).toLowerCase() : "";
    var i;
    var key;
    var anySelected = false;

    if (q) {
      var target = (
        textValue(row["加護の名称"]) + " " +
        textValue(row["加護の効果"])
      ).toLowerCase();

      if (target.indexOf(q) < 0) {
        return false;
      }
    }

    for (key in selected) {
      if (selected.hasOwnProperty(key)) {
        anySelected = true;
        break;
      }
    }

    if (!anySelected) {
      return true;
    }

    for (i = 0; i < C.length; i++) {
      key = C[i];
      if (selected[key] && hasText(row[key])) {
        return true;
      }
    }

    return false;
  }

  function compareRows(a, b) {
    var av = textValue(a[sortKey]);
    var bv = textValue(b[sortKey]);

    if (sortKey === "ID") {
      var an = parseInt(av, 10);
      var bn = parseInt(bv, 10);
      if (!isNaN(an) && !isNaN(bn)) {
        if (an < bn) { return -1 * sortDir; }
        if (an > bn) { return 1 * sortDir; }
        return 0;
      }
    }

    av = av.toLowerCase();
    bv = bv.toLowerCase();

    if (av < bv) { return -1 * sortDir; }
    if (av > bv) { return 1 * sortDir; }
    return 0;
  }

  function renderTable() {
    var list = [];
    var i;
    var j;
    var key;
    var h = "";
    var b = "";
    var lastRarity = "";
    var shade = 0;

    for (i = 0; i < R.length; i++) {
      if (rowMatches(R[i])) {
        list.push(R[i]);
      }
    }

    list.sort(compareRows);

    for (i = 0; i < C.length; i++) {
      key = C[i];
      if (visible[key]) {
        h += '<th data-sort="' + escapeHtml(key) + '"' +
          (sortKey === key ? ' class="ld-sort"' : '') + '>' +
          escapeHtml(key) +
          (sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : "") +
          '</th>';
      }
    }

    for (i = 0; i < list.length; i++) {
      var rarity = textValue(list[i]["レアリティ"]);
      if (rarity !== lastRarity) {
        shade = 0;
        lastRarity = rarity;
      } else {
        shade = 1 - shade;
      }

      var rc = rarityClass[rarity] || "";
      b += '<tr class="' + rc + "-" + (shade === 0 ? "a" : "b") + '">';

      for (j = 0; j < C.length; j++) {
        key = C[j];
        if (visible[key]) {
          var cls = "";
          if (key === "加護の名称") { cls = ' class="ld-name"'; }
          if (key === "加護の効果") { cls = ' class="ld-effect"'; }
          b += '<td' + cls + '>' +
            (hasText(list[i][key]) ? escapeHtml(list[i][key]) : "—") +
            '</td>';
        }
      }

      b += "</tr>";
    }

    thead.innerHTML = "<tr>" + h + "</tr>";
    tbody.innerHTML = b;

    if (countBox) {
      countBox.innerHTML = String(list.length);
    }
    if (totalBox) {
      totalBox.innerHTML = String(R.length);
    }

    var ths = thead.getElementsByTagName("th");
    for (i = 0; i < ths.length; i++) {
      ths[i].onclick = (function (th) {
        return function () {
          var k = th.getAttribute("data-sort");
          if (sortKey === k) {
            sortDir = sortDir * -1;
          } else {
            sortKey = k;
            sortDir = 1;
          }
          renderTable();
        };
      })(ths[i]);
    }
  }

  function resetAll() {
    var i;
    visible = {};
    selected = {};
    visible["加護の名称"] = true;
    visible["加護の効果"] = true;
    sortKey = "ID";
    sortDir = 1;

    if (searchBox) {
      searchBox.value = "";
    }

    renderControls();
    renderTable();
  }

  function init() {
    if (initialized) {
      return;
    }

    if (!makeBase()) {
      return;
    }

    initialized = true;

    addStyle();
    makeModal();

    searchBox = byId("ld-kago-search");
    countBox = byId("ld-kago-count");
    totalBox = byId("ld-kago-total");
    resetButton = byId("ld-kago-reset");

    visible["加護の名称"] = true;
    visible["加護の効果"] = true;

    if (searchBox) {
      searchBox.onkeyup = renderTable;
      searchBox.oninput = renderTable;
    }

    if (resetButton) {
      resetButton.onclick = resetAll;
    }

    renderControls();
    renderTable();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
