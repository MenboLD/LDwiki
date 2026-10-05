/* @wiki-safe test version of kago_filter.js */
(function () {
  var data = null;

  try {
    if (typeof KAGO_DATA !== "undefined") {
      data = KAGO_DATA;
    }
  } catch (e) {
    data = null;
  }

  if (!data) {
    return;
  }

  var columns = data.columns || [];
  var rows = data.rows || [];
  var defaultVisible = data.defaultVisible || [];

  function init() {
    var area = document.getElementById("ld-kago-columns");
    var filters = document.getElementById("ld-kago-filters");
    var thead = document.getElementById("ld-kago-thead");
    var tbody = document.getElementById("ld-kago-tbody");
    var search = document.getElementById("ld-kago-search");
    var count = document.getElementById("ld-kago-count");
    var total = document.getElementById("ld-kago-total");
    var reset = document.getElementById("ld-kago-reset");

    if (!area || !filters || !thead || !tbody) {
      return;
    }

    var visible = {};
    var i;
    var j;

    for (i = 0; i < defaultVisible.length; i++) {
      visible[defaultVisible[i]] = true;
    }

    function render() {
      var header = "";
      var body = "";
      var q = "";

      if (search) {
        q = String(search.value || "").toLowerCase();
      }

      for (i = 0; i < columns.length; i++) {
        var col = columns[i];

        if (visible[col.key]) {
          header += "<th>" +
            String(col.label || col.key) +
            "</th>";
        }
      }

      for (i = 0; i < rows.length; i++) {
        var row = rows[i];
        var text = "";
        var match = true;

        if (q) {
          for (j = 0; j < columns.length; j++) {
            var c = columns[j];

            if (c.key === "name" || c.key === "effect") {
              text += " " + String(row[c.key] || "");
            }
          }

          if (text.toLowerCase().indexOf(q) < 0) {
            match = false;
          }
        }

        if (!match) {
          continue;
        }

        body += "<tr>";

        for (j = 0; j < columns.length; j++) {
          var dc = columns[j];

          if (visible[dc.key]) {
            body += "<td>" +
              String(
                dc.key in row && row[dc.key] != null
                  ? row[dc.key]
                  : ""
              ) +
              "</td>";
          }
        }

        body += "</tr>";
      }

      thead.innerHTML = "<tr>" + header + "</tr>";
      tbody.innerHTML = body;

      if (count) {
        count.innerHTML =
          String(tbody.getElementsByTagName("tr").length);
      }

      if (total) {
        total.innerHTML = String(rows.length);
      }
    }

    for (i = 0; i < columns.length; i++) {
      (function (col) {
        var label = document.createElement("label");
        var input = document.createElement("input");

        input.type = "checkbox";
        input.checked = !!visible[col.key];

        input.onclick = function () {
          if (input.checked) {
            visible[col.key] = true;
          } else {
            delete visible[col.key];
          }

          render();
        };

        label.appendChild(input);
        label.appendChild(
          document.createTextNode(
            " " + String(col.label || col.key)
          )
        );

        area.appendChild(label);
      })(columns[i]);
    }

    if (search) {
      search.onkeyup = render;
    }

    if (reset) {
      reset.onclick = function () {
        visible = {};

        for (i = 0; i < defaultVisible.length; i++) {
          visible[defaultVisible[i]] = true;
        }

        var inputs =
          area.getElementsByTagName("input");

        for (j = 0; j < inputs.length; j++) {
          var key =
            columns[j] ? columns[j].key : "";

          inputs[j].checked = !!visible[key];
        }

        if (search) {
          search.value = "";
        }

        render();
      };
    }

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();