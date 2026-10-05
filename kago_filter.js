
(function () {
  "use strict";

  var DATA = window.KAGO_DATA || { columns: [], rows: [], defaultVisible: [] };
  var columns = DATA.columns;
  var rows = DATA.rows;
  var defaultVisible = new Set(DATA.defaultVisible || []);

  var colByKey = {};
  columns.forEach(function (c) { colByKey[c.key] = c; });

  var visible = {};
  columns.forEach(function (c) { visible[c.key] = defaultVisible.has(c.key); });

  var filters = {};
  columns.forEach(function (c) { filters[c.key] = "__ANY__"; });

  var els = {
    columns: document.getElementById("ld-kago-columns"),
    filters: document.getElementById("ld-kago-filters"),
    thead: document.getElementById("ld-kago-thead"),
    tbody: document.getElementById("ld-kago-tbody"),
    search: document.getElementById("ld-kago-search"),
    count: document.getElementById("ld-kago-count"),
    total: document.getElementById("ld-kago-total"),
    reset: document.getElementById("ld-kago-reset")
  };

  function isBlank(v) {
    return v === null || v === undefined || v === "";
  }

  function rawKey(v) {
    if (isBlank(v)) return "";
    if (typeof v === "boolean") return v ? "True" : "False";
    return String(v);
  }

  function displayValue(v, col) {
    if (isBlank(v)) return "";
    if (typeof v === "boolean") return v ? "True" : "False";
    if (col && col.percent && typeof v === "number") {
      var pct = v * 100;
      return (Math.round(pct * 100) / 100).toString().replace(/\.0+$/, "") + "%";
    }
    return String(v);
  }

  function uniqueValues(colIndex) {
    var map = new Map();
    rows.forEach(function (row) {
      var v = row[colIndex];
      if (!isBlank(v)) {
        var key = rawKey(v);
        if (!map.has(key)) map.set(key, v);
      }
    });
    var values = Array.from(map.values());
    var booleanColumn = values.length > 0 && values.every(function (v) {
      return typeof v === "boolean";
    });
    if (booleanColumn) {
      values = [true, false].filter(function (v) {
        return values.some(function (x) { return x === v; });
      });
      // True/False列は、現在データに存在しない側も選択可能にする。
      values = [true, false];
    } else {
      values.sort(function (a, b) {
        var aa = displayValue(a, colByKey[colIndex]);
        var bb = displayValue(b, colByKey[colIndex]);
        return aa.localeCompare(bb, "ja", { numeric: true });
      });
    }
    return values;
  }

  function buildColumnControls() {
    els.columns.innerHTML = "";
    columns.forEach(function (col) {
      var label = document.createElement("label");
      label.className = "ld-kago-check";

      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!visible[col.key];
      input.dataset.key = col.key;
      input.addEventListener("change", function () {
        visible[col.key] = input.checked;
        render();
      });

      var span = document.createElement("span");
      span.textContent = col.label;

      label.appendChild(input);
      label.appendChild(span);
      els.columns.appendChild(label);
    });
  }

  function buildFilterControls() {
    els.filters.innerHTML = "";

    columns.forEach(function (col, index) {
      var wrap = document.createElement("div");
      wrap.className = "ld-kago-filter";

      var label = document.createElement("label");
      label.textContent = col.label;
      label.htmlFor = "ld-kago-filter-" + col.key;

      var select = document.createElement("select");
      select.id = "ld-kago-filter-" + col.key;
      select.dataset.key = col.key;

      addOption(select, "__ANY__", "指定なし");
      addOption(select, "__NONEMPTY__", "全指定");

      var values = uniqueValues(index);
      values.forEach(function (v) {
        addOption(select, rawKey(v), displayValue(v, col));
      });

      select.value = filters[col.key];
      select.addEventListener("change", function () {
        filters[col.key] = select.value;
        render();
      });

      wrap.appendChild(label);
      wrap.appendChild(select);
      els.filters.appendChild(wrap);
    });
  }

  function addOption(select, value, label) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  }

  function matchesFilter(row, index, col) {
    var selected = filters[col.key];
    if (selected === "__ANY__") return true;

    var value = row[index];
    if (selected === "__NONEMPTY__") return !isBlank(value);

    return rawKey(value) === selected;
  }

  function matchesSearch(row, query) {
    if (!query) return true;
    var q = query.toLocaleLowerCase("ja");
    return row.some(function (v, i) {
      if (isBlank(v)) return false;
      return displayValue(v, columns[i]).toLocaleLowerCase("ja").indexOf(q) !== -1;
    });
  }

  function getFilteredRows() {
    var query = (els.search.value || "").trim();
    return rows.filter(function (row) {
      if (!matchesSearch(row, query)) return false;
      return columns.every(function (col, index) {
        return matchesFilter(row, index, col);
      });
    });
  }

  function renderHeader() {
    els.thead.innerHTML = "";
    columns.forEach(function (col) {
      if (!visible[col.key]) return;
      var th = document.createElement("th");
      th.textContent = col.label;
      if (col.percent) th.className = "ld-kago-percent";
      els.thead.appendChild(th);
    });
  }

  function renderBody(filtered) {
    els.tbody.innerHTML = "";

    if (filtered.length === 0) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = Math.max(1, columns.filter(function (c) { return visible[c.key]; }).length);
      td.className = "ld-kago-no-result";
      td.textContent = "条件に一致する加護がありません。";
      tr.appendChild(td);
      els.tbody.appendChild(tr);
      return;
    }

    filtered.forEach(function (row) {
      var tr = document.createElement("tr");
      columns.forEach(function (col, index) {
        if (!visible[col.key]) return;
        var td = document.createElement("td");
        var value = row[index];

        if (isBlank(value)) {
          td.textContent = "—";
          td.className = "ld-kago-empty";
        } else {
          td.textContent = displayValue(value, col);
          if (col.percent) td.className = "ld-kago-percent";
        }
        tr.appendChild(td);
      });
      els.tbody.appendChild(tr);
    });
  }

  function render() {
    var filtered = getFilteredRows();
    renderHeader();
    renderBody(filtered);
    els.count.textContent = filtered.length.toLocaleString("ja-JP");
    els.total.textContent = rows.length.toLocaleString("ja-JP");
  }

  function resetAll() {
    columns.forEach(function (col) {
      filters[col.key] = "__ANY__";
      visible[col.key] = defaultVisible.has(col.key);
    });
    els.search.value = "";
    buildColumnControls();
    buildFilterControls();
    render();
  }

  els.search.addEventListener("input", render);
  els.reset.addEventListener("click", resetAll);

  buildColumnControls();
  buildFilterControls();
  render();
})();
