/* atwiki_unit_info_layout_rev7.js */
(function () {
  'use strict';

  var APP_ID = 'ld-unit-info-app';
  var UNIT_TABLE_NAME = window.LD_UNIT_TABLE_NAME || 'atwiki_unit';
  var SKILL_TABLE_NAME = window.LD_SKILL_TABLE_NAME || 'atwiki_skill';

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

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

  function buildUnitTableHtml(unit, unitMap) {
    var materialsHtml = buildMaterialHtml(materialIdsFromUnit(unit), unitMap);
    return [
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
  }

  function formatBoolCircle(value) {
    if (value === true) return '〇';
    if (value === false) return '×';
    if (value === 'true') return '〇';
    if (value === 'false') return '×';
    return '-';
  }

  function formatLineBreakText(value) {
    var text = String(value == null || value === '' ? '-' : value);
    return escapeHtml(text).replace(/\r\n|\n|\r/g, '<br>');
  }

  function highlightSkillDescription(value) {
    var html = formatLineBreakText(value);
    return html.replace(/(\d+(?:\.\d+)?(?:%|％|秒))/g, '<span class="ld-skill-info__hl">$1</span>');
  }

  function prefixedValue(prefix, value, formatter) {
    var rendered = formatter ? formatter(value) : formatLineBreakText(value);
    return '<span class="ld-skill-info__prefix">' + escapeHtml(prefix) + '</span>' + rendered;
  }

  function buildSkillTableHtml(skill) {
    return [
      '<table class="ld-skill-info__table" aria-label="スキル情報">',
      '  <tbody>',
      '    <tr>',
      '      <td class="ld-skill-info__cell ld-skill-info__cell--name" colspan="4">', prefixedValue('スキル名：', skill.skill_name), '</td>',
      '    </tr>',
      '    <tr>',
      '      <td class="ld-skill-info__cell ld-skill-info__cell--desc" colspan="3">', highlightSkillDescription(skill.skill_description), '</td>',
      '      <td class="ld-skill-info__cell ld-skill-info__cell--meta">', prefixedValue('クールタイム：', skill.cooldown_time), '</td>',
      '    </tr>',
      '    <tr>',
      '      <td class="ld-skill-info__cell">', prefixedValue('属性型：', skill.attribute), '</td>',
      '      <td class="ld-skill-info__cell">', prefixedValue('範囲型：', skill.range_type), '</td>',
      '      <td class="ld-skill-info__cell">', prefixedValue('スキル判定：', skill.is_skill, formatBoolCircle), '</td>',
      '      <td class="ld-skill-info__cell">', prefixedValue('スキル型：', skill.skill_type), '</td>',
      '    </tr>',
      '    <tr>',
      '      <td class="ld-skill-info__cell">', prefixedValue('起点型：', skill.origin), '</td>',
      '      <td class="ld-skill-info__cell">', prefixedValue('対象型：', skill.target_type), '</td>',
      '      <td class="ld-skill-info__cell">', prefixedValue('究極判定：', skill.is_ultimate, formatBoolCircle), '</td>',
      '      <td class="ld-skill-info__cell">', prefixedValue('特性型：', skill.skill_trait_note), '</td>',
      '    </tr>',
      '    <tr>',
      '      <td class="ld-skill-info__cell ld-skill-info__cell--params" colspan="4">', prefixedValue('未記載パラメータ：', skill.undocumented_parameters), '</td>',
      '    </tr>',
      '  </tbody>',
      '</table>'
    ].join('');
  }

  function buildSkillsHtml(skillsForUnit, hasAnySkillData) {
    if (!skillsForUnit || !skillsForUnit.length) {
      var emptyMessage = hasAnySkillData
        ? 'スキル情報がありません。unit_id / unit_name の対応を確認してください。'
        : 'スキル情報がありません。atwiki_skill の anon SELECT 許可を確認してください。';
      return '<div class="ld-skill-info__empty">' + escapeHtml(emptyMessage) + '</div>';
    }

    return [
      '<div class="ld-skill-info">',
      skillsForUnit.map(function (skill) {
        return buildSkillTableHtml(skill);
      }).join(''),
      '</div>'
    ].join('');
  }

  function renderUnit(root, unit, unitMap, skillMaps, hasAnySkillData) {
    var panel = root.querySelector('.ld-unit-info__panel');
    if (!panel) return;

    var unitId = toNullableNumber(unit.unit_id);
    var unitNameKey = normalizeText(unit.unit_name);
    var skillsForUnit = [];

    if (unitId !== null && skillMaps.byUnitId.has(unitId)) {
      skillsForUnit = skillMaps.byUnitId.get(unitId) || [];
    } else if (unitNameKey && skillMaps.byUnitName.has(unitNameKey)) {
      skillsForUnit = skillMaps.byUnitName.get(unitNameKey) || [];
    }

    panel.innerHTML = [
      buildUnitTableHtml(unit, unitMap),
      buildSkillsHtml(skillsForUnit, hasAnySkillData)
    ].join('');

    panel.hidden = false;
  }

  function sortUnits(units) {
    return units.slice().sort(function (a, b) {
      return (toNullableNumber(a.id) || 0) - (toNullableNumber(b.id) || 0);
    });
  }

  function sortSkills(skills) {
    return skills.slice().sort(function (a, b) {
      return (toNullableNumber(a.skill_id) || 0) - (toNullableNumber(b.skill_id) || 0);
    });
  }

  async function fetchUnits(client) {
    var columns = [
      'id',
      'unit_id',
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
      .from(UNIT_TABLE_NAME)
      .select(columns)
      .order('id', { ascending: true });

    if (response.error) throw response.error;
    return Array.isArray(response.data) ? response.data : [];
  }

  async function fetchSkills(client) {
    var columns = [
      'unit_name',
      'skill_id',
      'skill_name',
      'skill_description',
      'cooldown_time',
      'attribute',
      'range_type',
      'is_skill',
      'skill_type',
      'origin',
      'target_type',
      'is_ultimate',
      'skill_trait_note',
      'undocumented_parameters'
    ].join(',');

    var response = await client
      .from(SKILL_TABLE_NAME)
      .select(columns)
      .order('skill_id', { ascending: true });

    if (response.error) throw response.error;
    return Array.isArray(response.data) ? response.data : [];
  }

  function buildSkillMaps(skills) {
    var byUnitId = new Map();
    var byUnitName = new Map();

    sortSkills(skills).forEach(function (skill) {
      var unitId = toNullableNumber(skill.unit_id);
      var unitNameKey = normalizeText(skill.unit_name);

      if (unitId !== null) {
        if (!byUnitId.has(unitId)) byUnitId.set(unitId, []);
        byUnitId.get(unitId).push(skill);
      }

      if (unitNameKey) {
        if (!byUnitName.has(unitNameKey)) byUnitName.set(unitNameKey, []);
        byUnitName.get(unitNameKey).push(skill);
      }
    });

    return {
      byUnitId: byUnitId,
      byUnitName: byUnitName
    };
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
      var results = await Promise.all([fetchUnits(client), fetchSkills(client)]);
      var units = sortUnits(results[0]);
      var skills = results[1];

      if (!units.length) {
        setStatus(root, '表示できるユニットがありません。', true);
        return;
      }

      var unitMap = new Map(
        units.map(function (unit) {
          return [toNullableNumber(unit.unit_id), unit];
        })
      );
      var skillMaps = buildSkillMaps(skills);
      var hasAnySkillData = Array.isArray(skills) && skills.length > 0;

      var currentUnit = getDefaultUnit(units, root);
      fillSelect(root, units, currentUnit);
      renderUnit(root, currentUnit, unitMap, skillMaps, hasAnySkillData);
      setStatus(root, '', false);

      var select = root.querySelector('.ld-unit-info__select');
      if (select) {
        select.addEventListener('change', function () {
          var selectedId = toNullableNumber(select.value);
          var nextUnit = unitMap.get(selectedId);
          if (!nextUnit) return;
          renderUnit(root, nextUnit, unitMap, skillMaps, hasAnySkillData);
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
