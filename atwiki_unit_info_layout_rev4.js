/* atwiki_unit_info_layout_rev3.js */
(function () {
  'use strict';

  var APP_ID = 'ld-unit-info-app';
  var TABLE_NAME = window.LD_UNIT_TABLE_NAME || 'atwiki_unit';

  function byId(id) {
    return document.getElementById(id);
  }

  function toNullableNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatInteger(value) {
    var num = toNullableNumber(value);
    if (num === null) return '-';
    return Math.round(num).toLocaleString('ja-JP');
  }

  function formatDecimal2(value) {
    var num = toNullableNumber(value);
    if (num === null) return '-';
    return num.toLocaleString('ja-JP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function materialIdsFromUnit(unit) {
    return ['material_1', 'material_2', 'material_3', 'material_4']
      .map(function (key) { return toNullableNumber(unit[key]); })
      .filter(function (value) { return value !== null; });
  }

  function createClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('supabase-js が読み込まれていません。');
    }
    if (!window.LD_SUPABASE_URL || !window.LD_SUPABASE_ANON_KEY) {
      throw new Error('supabase_config.js の URL / anon key が見つかりません。');
    }

    return window.supabase.createClient(
      window.LD_SUPABASE_URL,
      window.LD_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }

  function setStatus(root, message, isError) {
    var status = root.querySelector('.ld-unit-info__status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
    status.hidden = !message;
  }

  function buildMaterialHtml(materialIds, unitMap) {
    if (!materialIds.length) {
      return '<div class="ld-unit-info__materials"><span class="ld-unit-info__material-empty">-</span></div>';
    }

    var items = materialIds.map(function (unitId) {
      var materialUnit = unitMap.get(unitId);
      if (!materialUnit || !materialUnit.unit_image_url) return '';
      return [
        '<span class="ld-unit-info__material" title="', escapeHtml(materialUnit.unit_name || String(unitId)), '">',
        '<img class="ld-unit-info__material-image" src="', escapeHtml(materialUnit.unit_image_url), '" alt="', escapeHtml(materialUnit.unit_name || String(unitId)), '" loading="lazy">',
        '</span>'
      ].join('');
    }).filter(Boolean);

    if (!items.length) {
      return '<div class="ld-unit-info__materials"><span class="ld-unit-info__material-empty">-</span></div>';
    }

    var countClass = 'ld-unit-info__materials--count-' + items.length;
    return '<div class="ld-unit-info__materials ' + countClass + '">' + items.join('') + '</div>';
  }

  function buildImageHtml(unit) {
    if (unit.unit_image_url) {
      return [
        '<div class="ld-unit-info__image-box">',
        '<img class="ld-unit-info__image" src="', escapeHtml(unit.unit_image_url), '" alt="', escapeHtml(unit.unit_name || ''), '" loading="eager">',
        '</div>'
      ].join('');
    }

    return '<div class="ld-unit-info__image-box"><div class="ld-unit-info__image--placeholder">NO IMAGE</div></div>';
  }

  function renderUnit(root, unit, unitMap) {
    var panel = root.querySelector('.ld-unit-info__panel');
    if (!panel) return;

    var materialsHtml = buildMaterialHtml(materialIdsFromUnit(unit), unitMap);
    panel.innerHTML = [
      '<table class="ld-unit-info__table" aria-label="ユニット情報">',
      '  <tbody>',
      '    <tr class="ld-unit-info__row ld-unit-info__row--materials">',
      '      <td class="ld-unit-info__image-cell" rowspan="5">', buildImageHtml(unit), '</td>',
      '      <th scope="row" class="ld-unit-info__label ld-unit-info__label--wide">素材</th>',
      '      <td class="ld-unit-info__materials-cell" colspan="3">', materialsHtml, '</td>',
      '    </tr>',
      '    <tr class="ld-unit-info__row ld-unit-info__row--attack">',
      '      <th scope="row" class="ld-unit-info__label ld-unit-info__label--wide">攻撃力</th>',
      '      <td class="ld-unit-info__value ld-unit-info__value--emphasis" colspan="3">', formatInteger(unit.attack_damage), '</td>',
      '    </tr>',
      '    <tr class="ld-unit-info__row ld-unit-info__row--stat">',
      '      <th scope="row" class="ld-unit-info__label">種族</th>',
      '      <td class="ld-unit-info__value">', escapeHtml(unit.role_type || '-'), '</td>',
      '      <th scope="row" class="ld-unit-info__label">攻撃速度</th>',
      '      <td class="ld-unit-info__value">', formatDecimal2(unit.attack_speed), '</td>',
      '    </tr>',
      '    <tr class="ld-unit-info__row ld-unit-info__row--stat">',
      '      <th scope="row" class="ld-unit-info__label">役割</th>',
      '      <td class="ld-unit-info__value">', escapeHtml(unit.race_type || '-'), '</td>',
      '      <th scope="row" class="ld-unit-info__label">射程距離</th>',
      '      <td class="ld-unit-info__value">', formatDecimal2(unit.attack_range), '</td>',
      '    </tr>',
      '    <tr class="ld-unit-info__row ld-unit-info__row--stat">',
      '      <th scope="row" class="ld-unit-info__label">必要マナ</th>',
      '      <td class="ld-unit-info__value">', formatInteger(unit.sp), '</td>',
      '      <th scope="row" class="ld-unit-info__label">移動速度</th>',
      '      <td class="ld-unit-info__value">', formatDecimal2(unit.move_speed), '</td>',
      '    </tr>',
      '  </tbody>',
      '</table>'
    ].join('');
    panel.hidden = false;
  }

  function sortUnits(units) {
    return units.slice().sort(function (a, b) {
      return (toNullableNumber(a.id) || 0) - (toNullableNumber(b.id) || 0);
    });
  }

  async function fetchUnits(client) {
    var columns = [
      'id',
      'unit_id',
      'unit_name',
      'unit_image_url',
      'rarity_name',
      'race_type',
      'role_type',
      'attack_range',
      'move_speed',
      'sp',
      'attack_damage',
      'attack_speed',
      'material_1',
      'material_2',
      'material_3',
      'material_4'
    ].join(',');

    var response = await client
      .from(TABLE_NAME)
      .select(columns)
      .order('id', { ascending: true });

    if (response.error) throw response.error;
    return Array.isArray(response.data) ? response.data : [];
  }

  function getDefaultUnit(units, root) {
    var defaultUnitName = (root.getAttribute('data-default-unit-name') || '').trim();
    if (defaultUnitName) {
      var matchedByName = units.find(function (unit) {
        return String(unit.unit_name || '') === defaultUnitName;
      });
      if (matchedByName) return matchedByName;
    }

    var defaultUnitId = toNullableNumber(root.getAttribute('data-default-unit-id'));
    if (defaultUnitId !== null) {
      var matchedById = units.find(function (unit) {
        return toNullableNumber(unit.unit_id) === defaultUnitId;
      });
      if (matchedById) return matchedById;
    }

    return units[0] || null;
  }

  function fillSelect(root, units, selectedUnit) {
    var select = root.querySelector('.ld-unit-info__select');
    if (!select) return;

    select.innerHTML = units.map(function (unit) {
      var unitId = String(unit.unit_id == null ? '' : unit.unit_id);
      var isSelected = selectedUnit && String(selectedUnit.unit_id) === unitId;
      return [
        '<option value="', escapeHtml(unitId), '"', isSelected ? ' selected' : '', '>',
        escapeHtml(unit.unit_name || unitId),
        '</option>'
      ].join('');
    }).join('');
  }

  async function init() {
    var root = byId(APP_ID);
    if (!root) return;

    var panel = root.querySelector('.ld-unit-info__panel');
    if (panel) panel.hidden = true;

    try {
      setStatus(root, '読み込み中...', false);

      var client = createClient();
      var units = sortUnits(await fetchUnits(client));

      if (!units.length) {
        setStatus(root, '表示できるユニットがありません。', true);
        return;
      }

      var unitMap = new Map(
        units.map(function (unit) {
          return [toNullableNumber(unit.unit_id), unit];
        })
      );

      var currentUnit = getDefaultUnit(units, root);
      fillSelect(root, units, currentUnit);
      renderUnit(root, currentUnit, unitMap);
      setStatus(root, '', false);

      var select = root.querySelector('.ld-unit-info__select');
      if (select) {
        select.addEventListener('change', function () {
          var selectedId = toNullableNumber(select.value);
          var nextUnit = unitMap.get(selectedId);
          if (!nextUnit) return;
          renderUnit(root, nextUnit, unitMap);
        });
      }
    } catch (error) {
      console.error(error);
      setStatus(root, '読込に失敗しました。RLS の SELECT 許可、テーブル名、supabase_config.js の読み込み順を確認してください。', true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
