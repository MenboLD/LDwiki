// ダメージ検証ツール（UI試作）
// 目的: 入力定義 + 表示条件式に基づき、入力フォームを自動生成し、条件で出たり消えたりすることを確認する。
// 接続テストUIは省略。ロード失敗時はログに出す。

'use strict';

const DEF = {"categories": ["ユニット", "総合", "環境", "攻撃力強化", "攻撃力増加", "特定", "遺物", "ペット", "人形", "財宝", "ギルド"], "inputs": [{"category": "ユニット", "id": "unit_name_parts", "label": "選択ユニット", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "山賊", "depends": null, "master": "ld_DMG_unit_atk[UnitName]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_unit_atk[UnitName] を元に生成"}, {"category": "ユニット", "id": "unit_level_parts", "label": "レベル", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..15 / step 1", "constraint": {"min": 1, "max": 15, "step": 1}, "default": 15, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 1..15 / step 1"}, {"category": "ユニット", "id": "unit_skills_parts", "label": "スキル", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "基本攻撃", "depends": "unit_name_parts", "master": "ld_DMG_unit_abilties[name_skill]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_unit_abilties[name_skill] を元に生成 / 依存: unit_name_parts"}, {"category": "総合", "id": "total_lv_unit", "label": "ユニット総合Lv", "ui": "slider", "dtype": "int", "constraint_raw": "range 10..500 / step 10", "constraint": {"min": 10, "max": 500, "step": 10}, "default": 500, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 10..500 / step 10"}, {"category": "総合", "id": "total_lv_pet", "label": "ペット総合Lv", "ui": "slider", "dtype": "int", "constraint_raw": "range 20..500 / step 20", "constraint": {"min": 20, "max": 500, "step": 20}, "default": 500, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 20..500 / step 20"}, {"category": "環境", "id": "stun_parts", "label": "気絶状態", "ui": "toggle", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "通常", "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "固定2択（トグル）"}, {"category": "環境", "id": "enemy_parts", "label": "敵の種類", "ui": "toggle", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "雑魚", "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "固定2択（トグル）"}, {"category": "環境", "id": "critical_parts", "label": "クリティカル", "ui": "toggle", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "なし", "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "固定2択（トグル）"}, {"category": "環境", "id": "element_parts", "label": "属性", "ui": "toggle", "dtype": "enum", "constraint_raw": "options sync", "constraint": {}, "default": "物理", "depends": "unit_skills_parts", "master": "ld_DMG_unit_abilties[name_skill]", "expr": "TRUE", "rule": "常に表示", "summary": "固定2択（トグル） / 依存: unit_skills_parts"}, {"category": "環境", "id": "range_parts", "label": "対象", "ui": "toggle", "dtype": "enum", "constraint_raw": "options sync", "constraint": {}, "default": "単体", "depends": "unit_skills_parts", "master": "ld_DMG_unit_abilties[name_skill]", "expr": "TRUE", "rule": "常に表示", "summary": "固定2択（トグル） / 依存: unit_skills_parts"}, {"category": "環境", "id": "mode_parts", "label": "難易度", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "ノーマル", "depends": "element_parts", "master": null, "expr": "EQ(element_parts,\"物理\")", "rule": "\"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示", "summary": "依存: element_parts / 表示条件: \"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示"}, {"category": "環境", "id": "wave_parts", "label": "Wave数", "ui": "slider", "dtype": "int", "constraint_raw": null, "constraint": {}, "default": 1, "depends": "mode_parts", "master": "ld_DMG_dff[WaveNum]", "expr": "EQ(element_parts,\"物理\")", "rule": "\"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示", "summary": "依存: mode_parts / 表示条件: \"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示"}, {"category": "環境", "id": "dff_parts", "label": "防御力減少", "ui": "slider", "dtype": "float", "constraint_raw": "range 0..500 / step 0", "constraint": {"min": 0, "max": 500, "step": 0}, "default": 30, "depends": "element_parts", "master": null, "expr": "EQ(element_parts,\"物理\")", "rule": "\"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示", "summary": "入力制約: range 0..500 / step 0 / 依存: element_parts / 表示条件: \"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示"}, {"category": "特定", "id": "sp_bounus_blob", "label": "摂取数", "ui": "text", "dtype": "int", "constraint_raw": "range 0..100000", "constraint": {"min": 0, "max": 100000}, "default": 0, "depends": "unit_name_parts", "master": null, "expr": "EQ(unit_name_parts,\"ブロッブ\")", "rule": "\"unit_name_parts\"(セレクトボックスで決定されたtext値)が\"ブロッブ\"であるとき表示", "summary": "入力制約: range 0..100000 / 依存: unit_name_parts / 表示条件: \"unit_name_parts\"(セレクトボックスで決定されたtext値)が\"ブロッブ\"であるとき表示"}, {"category": "特定", "id": "sp_bounus_tal", "label": "共食い数", "ui": "slider", "dtype": "int", "constraint_raw": "range 0..99 / step 1", "constraint": {"min": 0, "max": 99, "step": 1}, "default": 0, "depends": "unit_name_parts", "master": null, "expr": "CONTAINS(unit_name_parts,\"タール\")", "rule": "\"unit_name_parts\"(セレクトボックスで決定されたtext値)に文字列「タール」を部分一致（contains）で含む場合のみ表示", "summary": "入力制約: range 0..99 / step 1 / 依存: unit_name_parts / 表示条件: \"unit_name_parts\"(セレクトボックスで決定されたtext値)に文字列「タール」を部分一致（contains）で含む場合のみ表示"}, {"category": "特定", "id": "sp_bounus_bomba", "label": "鍛錬数値", "ui": "slider", "dtype": "int", "constraint_raw": "range 0..30 / step 1", "constraint": {"min": 0, "max": 30, "step": 1}, "default": 0, "depends": "unit_name_parts", "master": null, "expr": "EQ(unit_name_parts,\"バンバ\")", "rule": "\"unit_name_parts\"(セレクトボックスで決定されたtext値)が\"バンバ\"であるとき表示", "summary": "入力制約: range 0..30 / step 1 / 依存: unit_name_parts / 表示条件: \"unit_name_parts\"(セレクトボックスで決定されたtext値)が\"バンバ\"であるとき表示"}, {"category": "遺物", "id": "relic_a", "label": "力のポーション", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 1..11 / step 1"}, {"category": "遺物", "id": "relic_b", "label": "マネーガン", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 1..11 / step 1"}, {"category": "遺物", "id": "relic_d", "label": "バット", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": "element_parts", "master": null, "expr": "EQ(element_parts,\"物理\")", "rule": "\"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示", "summary": "入力制約: range 1..11 / step 1 / 依存: element_parts / 表示条件: \"element_parts\"(トグルで決定されたtext値)が\"物理\"であるとき表示"}, {"category": "遺物", "id": "relic_c", "label": "魔法使いの帽子", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": "element_parts", "master": null, "expr": "EQ(element_parts,\"魔法\")", "rule": "\"element_parts\"(トグルで決定されたtext値)が\"魔法\"であるとき表示", "summary": "入力制約: range 1..11 / step 1 / 依存: element_parts / 表示条件: \"element_parts\"(トグルで決定されたtext値)が\"魔法\"であるとき表示"}, {"category": "遺物", "id": "relic_e", "label": "大剣", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": "enemy_parts", "master": null, "expr": "EQ(enemy_parts,\"ボス\")", "rule": "\"enemy_parts\"(トグルで決定されたtext値)が\"ボス\"であるとき表示", "summary": "入力制約: range 1..11 / step 1 / 依存: enemy_parts / 表示条件: \"enemy_parts\"(トグルで決定されたtext値)が\"ボス\"であるとき表示"}, {"category": "遺物", "id": "relic_f", "label": "秘伝書", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": "unit_skills_parts", "master": null, "expr": "NE(unit_skills_parts,\"基本攻撃\")", "rule": "\"unit_skills_parts\"(トグルで決定されたtext値)が\"基本攻撃\"以外であるとき表示", "summary": "入力制約: range 1..11 / step 1 / 依存: unit_skills_parts / 表示条件: \"unit_skills_parts\"(トグルで決定されたtext値)が\"基本攻撃\"以外であるとき表示"}, {"category": "遺物", "id": "relic_g", "label": "爆弾", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": "stun_parts", "master": null, "expr": "EQ(stun_parts,\"気絶\")", "rule": "\"stun_parts\"(トグルで決定されたtext値)が\"気絶\"であるとき表示", "summary": "入力制約: range 1..11 / step 1 / 依存: stun_parts / 表示条件: \"stun_parts\"(トグルで決定されたtext値)が\"気絶\"であるとき表示"}, {"category": "遺物", "id": "relic_h", "label": "マジック籠手", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 11, "depends": "element_parts , critical_parts", "master": null, "expr": "AND(EQ(element_parts,\"魔法\"),EQ(critical_parts,\"あり\"))", "rule": "\"element_parts\"(トグルで決定されたtext値)が\"魔法\"であり、かつ\"critical_parts\"(トグルで決定されたtext値)が\"あり\"であるとき表示", "summary": "入力制約: range 1..11 / step 1 / 依存: element_parts , critical_parts / 表示条件: \"element_parts\"(トグルで決定されたtext値)が\"魔法\"であり、かつ\"critical_parts\"(トグルで決定されたtext値)が\"あり\"であるとき表示"}, {"category": "ペット", "id": "pet_name_a", "label": "aペット名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "pet_name_b , pet_name_c", "master": "ld_DMG_pet_1[PetName]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_pet_1[PetName] を元に生成 / 依存: pet_name_b , pet_name_c"}, {"category": "ペット", "id": "pet_level_a", "label": "aレベル", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..50 / step 1", "constraint": {"min": 1, "max": 50, "step": 1}, "default": 1, "depends": "pet_name_a", "master": null, "expr": "NE(pet_name_a,\"None\")", "rule": "\"pet_name_a\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: range 1..50 / step 1 / 依存: pet_name_a / 表示条件: \"pet_name_a\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "ペット", "id": "pet_name_b", "label": "bペット名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "pet_name_a , pet_name_c", "master": "ld_DMG_pet_1[PetName]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_pet_1[PetName] を元に生成 / 依存: pet_name_a , pet_name_c"}, {"category": "ペット", "id": "pet_level_b", "label": "bレベル", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..50 / step 1", "constraint": {"min": 1, "max": 50, "step": 1}, "default": 1, "depends": "pet_name_b", "master": null, "expr": "NE(pet_name_b,\"None\")", "rule": "\"pet_name_b\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: range 1..50 / step 1 / 依存: pet_name_b / 表示条件: \"pet_name_b\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "ペット", "id": "pet_name_c", "label": "cペット名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "pet_name_a , pet_name_b", "master": "ld_DMG_pet_1[PetName]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_pet_1[PetName] を元に生成 / 依存: pet_name_b , pet_name_c"}, {"category": "ペット", "id": "pet_level_c", "label": "cレベル", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..50 / step 1", "constraint": {"min": 1, "max": 50, "step": 1}, "default": 1, "depends": "pet_name_c", "master": null, "expr": "NE(pet_name_c,\"None\")", "rule": "\"pet_name_c\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: range 1..50 / step 1 / 依存: pet_name_c / 表示条件: \"pet_name_c\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "環境", "id": "coin", "label": "コイン枚数", "ui": "text", "dtype": "int", "constraint_raw": "range 0..9999999 / step 1", "constraint": {"min": 0, "max": 9999999, "step": 1}, "default": 0, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 0..9999999 / step 1"}, {"category": "攻撃力増加", "id": "atk_add_parts", "label": "攻撃力増加", "ui": "text", "dtype": "percent", "constraint_raw": "range 0..999999", "constraint": {"min": 0, "max": 999999}, "default": 0, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 0..999999"}, {"category": "攻撃力強化", "id": "upgrade_level", "label": "強化Lv", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..31 / step 1", "constraint": {"min": 1, "max": 31, "step": 1}, "default": 1, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 1..31 / step 1"}, {"category": "ギルド", "id": "guild_boss_parts", "label": "ボス", "ui": "チェックボックス", "dtype": null, "constraint_raw": null, "constraint": {}, "default": false, "depends": "enemy_parts", "master": null, "expr": "EQ(enemy_parts,\"ボス\")", "rule": "\"enemy_parts\"(トグルで決定されたtext値)が\"ボス\"であるとき表示", "summary": "依存: enemy_parts / 表示条件: \"enemy_parts\"(トグルで決定されたtext値)が\"ボス\"であるとき表示"}, {"category": "ギルド", "id": "guild_raid_parts", "label": "レイドダメージ", "ui": "チェックボックス", "dtype": null, "constraint_raw": null, "constraint": {}, "default": false, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": null}, {"category": "ギルド", "id": "guild_damage_parts", "label": "ユニットダメージ", "ui": "チェックボックス", "dtype": null, "constraint_raw": null, "constraint": {}, "default": false, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": null}, {"category": "人形", "id": "piece_name_a", "label": "a人形名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "piece_name_b , piece_name_c , piece_name_d , piece_name_e", "master": "ld_DMG_piece[Piecename]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_piece[Piecename] を元に生成 / 依存: piece_name_b , piece_name_c , piece_name_d , piece_name_e"}, {"category": "人形", "id": "piece_grow_a", "label": "a人形強さ", "ui": "slider", "dtype": "int", "constraint_raw": "step 1", "constraint": {"step": 1}, "default": 1, "depends": "piece_name_a", "master": "ld_DMG_piece[parame1_max]", "expr": "NE(piece_name_a,\"None\")", "rule": "\"piece_name_a\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: step 1 / 依存: piece_name_a / 表示条件: \"piece_name_a\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "人形", "id": "piece_unit_a", "label": "a人形のユニット数", "ui": "slider", "dtype": "int", "constraint_raw": "range 0..35 / step 1", "constraint": {"min": 0, "max": 35, "step": 1}, "default": 0, "depends": "piece_name_a", "master": null, "expr": "IN(piece_name_a,[\"バット(神話数)\",\"片目(ユニ数)\"])", "rule": "\"piece_name_a\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示", "summary": "入力制約: range 0..35 / step 1 / 依存: piece_name_a / 表示条件: \"piece_name_a\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示"}, {"category": "人形", "id": "piece_name_b", "label": "b人形名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "piece_name_a , piece_name_c , piece_name_d , piece_name_e", "master": "ld_DMG_piece[Piecename]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_piece[Piecename] を元に生成 / 依存: piece_name_a , piece_name_c , piece_name_d , piece_name_e"}, {"category": "人形", "id": "piece_grow_b", "label": "b人形強さ", "ui": "slider", "dtype": "int", "constraint_raw": "step 1", "constraint": {"step": 1}, "default": 1, "depends": "piece_name_b", "master": "ld_DMG_piece[parame1_max]", "expr": "NE(piece_name_b,\"None\")", "rule": "\"piece_name_b\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: step 1 / 依存: piece_name_b / 表示条件: \"piece_name_b\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "人形", "id": "piece_unit_b", "label": "b人形のユニット数", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..50 / step 1", "constraint": {"min": 1, "max": 50, "step": 1}, "default": 1, "depends": "piece_name_b", "master": null, "expr": "IN(piece_name_b,[\"バット(神話数)\",\"片目(ユニ数)\"])", "rule": "\"piece_name_b\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示", "summary": "入力制約: range 1..50 / step 1 / 依存: piece_name_b / 表示条件: \"piece_name_b\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示"}, {"category": "人形", "id": "piece_name_c", "label": "c人形名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "piece_name_a , piece_name_b , piece_name_d , piece_name_e", "master": "ld_DMG_piece[Piecename]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_piece[Piecename] を元に生成 / 依存: piece_name_a , piece_name_b , piece_name_d , piece_name_e"}, {"category": "人形", "id": "piece_grow_c", "label": "c人形強さ", "ui": "slider", "dtype": "int", "constraint_raw": "step 1", "constraint": {"step": 1}, "default": 1, "depends": "piece_name_c", "master": "ld_DMG_piece[parame1_max]", "expr": "NE(piece_name_c,\"None\")", "rule": "\"piece_name_c\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: step 1 / 依存: piece_name_c / 表示条件: \"piece_name_c\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "人形", "id": "piece_unit_c", "label": "c人形のユニット数", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..35 / step 1", "constraint": {"min": 1, "max": 35, "step": 1}, "default": 1, "depends": "piece_name_c", "master": null, "expr": "IN(piece_name_c,[\"バット(神話数)\",\"片目(ユニ数)\"])", "rule": "\"piece_name_c\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示", "summary": "入力制約: range 1..35 / step 1 / 依存: piece_name_c / 表示条件: \"piece_name_c\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示"}, {"category": "人形", "id": "piece_name_d", "label": "d人形名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "piece_name_a , piece_name_b , piece_name_c , piece_name_e", "master": "ld_DMG_piece[Piecename]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_piece[Piecename] を元に生成 / 依存: piece_name_a , piece_name_b , piece_name_c , piece_name_e"}, {"category": "人形", "id": "piece_grow_d", "label": "d人形強さ", "ui": "slider", "dtype": "int", "constraint_raw": "step 1", "constraint": {"step": 1}, "default": 1, "depends": "piece_name_d", "master": "ld_DMG_piece[parame1_max]", "expr": "NE(piece_name_d,\"None\")", "rule": "\"piece_name_d\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: step 1 / 依存: piece_name_d / 表示条件: \"piece_name_d\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "人形", "id": "piece_unit_d", "label": "d人形のユニット数", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..50 / step 1", "constraint": {"min": 1, "max": 50, "step": 1}, "default": 1, "depends": "piece_name_d", "master": null, "expr": "IN(piece_name_d,[\"バット(神話数)\",\"片目(ユニ数)\"])", "rule": "\"piece_name_d\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示", "summary": "入力制約: range 1..50 / step 1 / 依存: piece_name_d / 表示条件: \"piece_name_d\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示"}, {"category": "人形", "id": "piece_name_e", "label": "e人形名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "piece_name_a , piece_name_b , piece_name_c , piece_name_d", "master": "ld_DMG_piece[Piecename]", "expr": "TRUE", "rule": "常に表示", "summary": "選択肢は ld_DMG_piece[Piecename] を元に生成 / 依存: piece_name_a , piece_name_b , piece_name_c , piece_name_d"}, {"category": "人形", "id": "piece_grow_e", "label": "e人形強さ", "ui": "slider", "dtype": "int", "constraint_raw": "step 1", "constraint": {"step": 1}, "default": 1, "depends": "piece_name_e", "master": "ld_DMG_piece[parame1_max]", "expr": "NE(piece_name_e,\"None\")", "rule": "\"piece_name_e\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: step 1 / 依存: piece_name_e / 表示条件: \"piece_name_e\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "人形", "id": "piece_unit_e", "label": "e人形のユニット数", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..35 / step 1", "constraint": {"min": 1, "max": 35, "step": 1}, "default": 1, "depends": "piece_name_e", "master": null, "expr": "IN(piece_name_e,[\"バット(神話数)\",\"片目(ユニ数)\"])", "rule": "\"piece_name_e\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示", "summary": "入力制約: range 1..35 / step 1 / 依存: piece_name_e / 表示条件: \"piece_name_e\"(セレクトボックスで決定されたtext値)が\"バット(神話数)\"もしくは\"片目(ユニ数)\"であるとき表示"}, {"category": "財宝", "id": "treasure_name", "label": "財宝名", "ui": "select", "dtype": "enum", "constraint_raw": null, "constraint": {}, "default": "None", "depends": "unit_name_parts", "master": "ld_DMG_treasure[treasurename]", "expr": "EXISTS(\"ld_DMG_treasure\",\"treasurename\",unit_name_parts)", "rule": "\"unit_name_parts\"(セレクトボックスで決定されたtext値)をキーとして、\nテーブル\"ld_DMG_treasure\"のカラム\"treasurename\"に同一の値が存在する場合にのみ表示。", "summary": "選択肢は ld_DMG_treasure[treasurename] を元に生成 / 依存: unit_name_parts / 表示条件: \"unit_name_parts\"(セレクトボックスで決定されたtext値)をキーとして、\nテーブル\"ld_DMG_treasure\"のカラム\"treasurename\"に同一の値が存在する場合にのみ表示。"}, {"category": "財宝", "id": "treasure_level", "label": "祭壇レベル", "ui": "slider", "dtype": "int", "constraint_raw": "range 1..11 / step 1", "constraint": {"min": 1, "max": 11, "step": 1}, "default": 1, "depends": "treasure_name", "master": null, "expr": "NE(treasure_name,\"None\")", "rule": "\"treasure_name\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示", "summary": "入力制約: range 1..11 / step 1 / 依存: treasure_name / 表示条件: \"treasure_name\"(セレクトボックスで決定されたtext値)が\"None\"でないとき表示"}, {"category": "攻撃力増加", "id": "damage_a_parts", "label": "自由枠の係数a", "ui": "text", "dtype": "percent", "constraint_raw": "range 0..999999", "constraint": {"min": 0, "max": 999999}, "default": 0, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 0..999999"}, {"category": "攻撃力増加", "id": "damage_b_parts", "label": "自由枠の係数b", "ui": "text", "dtype": "percent", "constraint_raw": "range 0..999999", "constraint": {"min": 0, "max": 999999}, "default": 0, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 0..999999"}, {"category": "攻撃力増加", "id": "damage_c_parts", "label": "自由枠の係数c", "ui": "text", "dtype": "percent", "constraint_raw": "range 0..999999", "constraint": {"min": 0, "max": 999999}, "default": 0, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 0..999999"}, {"category": "攻撃力増加", "id": "damage_d_parts", "label": "自由枠の係数d", "ui": "text", "dtype": "percent", "constraint_raw": "range 0..999999", "constraint": {"min": 0, "max": 999999}, "default": 0, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 0..999999"}, {"category": "攻撃力増加", "id": "damage_e_parts", "label": "自由枠の係数e", "ui": "text", "dtype": "percent", "constraint_raw": "range 0..999999", "constraint": {"min": 0, "max": 999999}, "default": 0, "depends": null, "master": null, "expr": "TRUE", "rule": "常に表示", "summary": "入力制約: range 0..999999"}], "toggle_options": {"stun_parts": ["通常", "気絶"], "enemy_parts": ["雑魚", "ボス"], "critical_parts": ["なし", "あり"], "element_parts": ["物理", "魔法"], "range_parts": ["単体", "範囲"]}};

const UI = {
  status: document.getElementById('status'),
  err: document.getElementById('err'),
  form: document.getElementById('form'),
  out: document.getElementById('out'),
  log: document.getElementById('log'),
  btnReload: document.getElementById('btnReload'),
  btnReset: document.getElementById('btnReset'),
  btnCopy: document.getElementById('btnCopy'),
  btnClearLog: document.getElementById('btnClearLog'),
  dbgToggle: document.getElementById('dbgToggle'),
};

const STATE = {
  sb: null,
  masters: {
    unit_atk: [],
    unit_abilities: [],
    pet1: [],
    pet2: [],
    pet3: [],
    relic: [],
    piece: [],
    treasure: [],
    dff: [],
    indexes: {},
  },
  values: {},     // inputId -> value
  visible: {},    // inputId -> bool
  controls: {},   // inputId -> { root, setValue(), getValue(), setDisabled(bool), setOptions(list) }
  debug: false,
};

function log(msg, obj){
  const t = new Date().toISOString().slice(11,19);
  UI.log.textContent += `[${t}] ${msg}` + (obj ? `\n${JSON.stringify(obj, null, 2)}\n` : `\n`);
  UI.log.scrollTop = UI.log.scrollHeight;
}

function setStatus(text){
  UI.status.textContent = text;
}

function showError(text){
  UI.err.classList.remove('hidden');
  UI.err.textContent = text;
}

function clearError(){
  UI.err.classList.add('hidden');
  UI.err.textContent = '';
}

function ensureSupabase(){
  if (STATE.sb) return STATE.sb;

  const url = window.LD_SUPABASE_URL;
  const key = window.LD_SUPABASE_ANON_KEY;
  if(!url || !key) throw new Error('supabase_config.js に LD_SUPABASE_URL / LD_SUPABASE_ANON_KEY がありません');
  if(!window.supabase) throw new Error('supabase-js CDN が読み込めませんでした');

  // 認証は使わないため、セッション永続化を切って警告/副作用を避ける
  const sb = window.supabase.createClient(url, key, {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  STATE.sb = sb;
  return sb;
}

async function fetchAll(viewName, orderCol){
  const sb = ensureSupabase();
  let q = sb.from(viewName).select('*').range(0, 9999);
  if(orderCol) q = q.order(orderCol, { ascending: true, nullsFirst: true });
  const { data, error } = await q;
  if(error) throw error;
  return data || [];
}

function uniq(arr){
  return [...new Set(arr)];
}

function buildIndexes(){
  // Exists(table,col,value) の高速化用 index
  const idx = {};

  // treasure treasurename set
  idx.treasure_treasurename = new Set(STATE.masters.treasure.map(r => (r.treasure_name ?? r.treasurename ?? r.treasureName ?? r.treasure).toString()));

  // piece: by name
  idx.piece_by_name = new Map();
  for(const r of STATE.masters.piece){
    const name = (r.piece_name ?? r.piecename ?? r.Piecename ?? r.PIECENAME ?? r.name).toString();
    idx.piece_by_name.set(name, r);
  }

  // abilities: unit -> skills
  idx.skills_by_unit = new Map();
  for(const r of STATE.masters.unit_abilities){
    const u = (r.unit_name ?? r.id_name_unit ?? r.unit ?? '').toString();
    const s = (r.skill_name ?? r.name_skill ?? r.skill ?? '').toString();
    if(!u || !s) continue;
    if(!idx.skills_by_unit.has(u)) idx.skills_by_unit.set(u, new Set());
    idx.skills_by_unit.get(u).add(s);
  }

  // dff: mode -> waves
  idx.waves_by_mode = new Map();
  for(const r of STATE.masters.dff){
    const mode = (r.mode ?? r.Mode ?? '').toString();
    const wave = Number(r.wave_num ?? r.WaveNum ?? r.wave ?? r.waveNum);
    if(!mode || !Number.isFinite(wave)) continue;
    if(!idx.waves_by_mode.has(mode)) idx.waves_by_mode.set(mode, new Set());
    idx.waves_by_mode.get(mode).add(wave);
  }

  STATE.masters.indexes = idx;
}

async function loadMasters(){
  clearError();
  setStatus('マスタ読み込み中...');
  log('マスタ読み込み開始');

  try{
    const [unit_atk, unit_abilities, pet1, pet2, pet3, relic, piece, treasure, dff] = await Promise.all([
      fetchAll('ld_dmg_unit_atk', 'unit_name'),
      fetchAll('ld_dmg_unit_abilities', 'unit_name'),
      fetchAll('ld_dmg_pet_1', 'pet_name'),
      fetchAll('ld_dmg_pet_2', 'pet_name'),
      fetchAll('ld_dmg_pet_3', 'pet_name'),
      fetchAll('ld_dmg_relic', 'relic_name'),
      fetchAll('ld_dmg_piece', 'piece_name'),
      fetchAll('ld_dmg_treasure', 'treasure_name'),
      fetchAll('ld_dmg_dff', 'mode'),
    ]);

    STATE.masters.unit_atk = unit_atk;
    STATE.masters.unit_abilities = unit_abilities;
    STATE.masters.pet1 = pet1;
    STATE.masters.pet2 = pet2;
    STATE.masters.pet3 = pet3;
    STATE.masters.relic = relic;
    STATE.masters.piece = piece;
    STATE.masters.treasure = treasure;
    STATE.masters.dff = dff;

    buildIndexes();

    setStatus(`マスタ読み込み完了（unit:${unit_atk.length} / abil:${unit_abilities.length} / piece:${piece.length} / dff:${dff.length}）`);
    log('マスタ読み込み完了', {
      unit_atk: unit_atk.length,
      unit_abilities: unit_abilities.length,
      piece: piece.length,
      dff: dff.length,
      treasure: treasure.length
    });

    // refresh option lists that depend on masters
    refreshAllOptions();
    applyAllVisibility();
    renderOutput();
  }catch(e){
    setStatus('マスタ読み込み失敗');
    showError(String(e.message || e));
    log('マスタ読み込み失敗', { message: e.message, details: e.details, hint: e.hint });
  }
}

// --- Expression evaluator ---
function getVal(id){
  return STATE.values[id];
}

function asStr(v){
  if(v == null) return '';
  return String(v);
}

function tokenizeList(listStr){
  // ["a","b"] -> ["a","b"]
  const m = listStr.match(/^\[(.*)\]$/);
  if(!m) return [];
  const inner = m[1].trim();
  if(!inner) return [];
  // Split by comma not inside quotes (simple)
  const parts = inner.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.trim()).filter(Boolean);
  return parts.map(p => p.replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1'));
}

function evalExpr(expr){
  if(expr == null) return true;
  const s = String(expr).trim();
  if(!s) return true;
  if(s.toUpperCase() === 'TRUE') return true;
  if(s.toUpperCase() === 'FALSE') return false;

  // AND/OR/NOT nesting
  const head = s.match(/^([A-Z_]+)\((.*)\)$/);
  if(!head) {
    // fallback: treat as boolean by presence
    return !!s;
  }
  const fn = head[1];
  const argsRaw = head[2];

  // Split top-level args by comma (respect parentheses/brackets/quotes)
  const args = [];
  let buf = '';
  let depth = 0;
  let inQuote = false;
  for(let i=0;i<argsRaw.length;i++) {
    const ch = argsRaw[i];
    if(ch === '"' && argsRaw[i-1] !== '\\') inQuote = !inQuote;
    if(!inQuote) {
      if(ch === '(' || ch === '[') depth++;
      if(ch === ')' || ch === ']') depth--;
      if(ch === ',' && depth === 0) {
        args.push(buf.trim()); buf=''; continue;
      }
    }
    buf += ch;
  }
  if(buf.trim()) args.push(buf.trim());

  const unq = (x) => String(x).trim().replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1');

  switch(fn){
    case 'EQ': {
      const a = unq(args[0]);
      const b = unq(args[1]);
      return asStr(getVal(a)) === b;
    }
    case 'NE': {
      const a = unq(args[0]);
      const b = unq(args[1]);
      return asStr(getVal(a)) !== b;
    }
    case 'IN': {
      const a = unq(args[0]);
      const list = tokenizeList(args[1]);
      return list.includes(asStr(getVal(a)));
    }
    case 'CONTAINS': {
      const a = unq(args[0]);
      const sub = unq(args[1]);
      return asStr(getVal(a)).includes(sub);
    }
    case 'EXISTS': {
      // EXISTS("table","col",inputId)
      const table = unq(args[0]);
      const col = unq(args[1]);
      const a = unq(args[2]);
      const v = asStr(getVal(a));
      // Only used for treasure existence in current spec
      if(table === 'ld_DMG_treasure' && col.toLowerCase() === 'treasurename'){
        return STATE.masters.indexes.treasure_treasurename?.has(v) || false;
      }
      return false;
    }
    case 'AND': {
      return args.every(a => evalExpr(a));
    }
    case 'OR': {
      return args.some(a => evalExpr(a));
    }
    case 'NOT': {
      return !evalExpr(args[0]);
    }
    default:
      return true;
  }
}

// --- UI builders ---
function clamp(n, min, max){
  if(!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function parseRangeConstraint(item){
  const c = item.constraint || {};
  return {
    min: (c.min != null ? Number(c.min) : 0),
    max: (c.max != null ? Number(c.max) : 100),
    step: (c.step != null ? Number(c.step) : 1),
  };
}

function createFieldRoot(item){
  const root = document.createElement('div');
  root.className = 'field';
  root.dataset.inputId = item.id;

  const head = document.createElement('div');
  head.className = 'fieldHeader';

  const label = document.createElement('div');
  label.className = 'fieldLabel';
  label.textContent = item.label;

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = item.id;

  head.appendChild(label);
  head.appendChild(badge);

  const dev = document.createElement('div');
  dev.className = 'dev devInfo';
  dev.textContent = `ui=${item.ui}\nexpr=${item.expr}\ndefault=${item.default}\nmaster=${item.master || '-'}\ndepends=${item.depends || '-'}`;

  root.appendChild(head);
  root.appendChild(dev);

  return root;
}

function addChangeHandler(inputId){
  // Re-evaluate on any change
  applyAllVisibility();
  refreshAllOptions(); // options dependent fields
  renderOutput();
}

function makeSelect(item){
  const root = createFieldRoot(item);

  const sel = document.createElement('select');
  sel.addEventListener('change', () => {
    STATE.values[item.id] = sel.value;
    addChangeHandler(item.id);
  });

  root.appendChild(sel);

  function setOptions(opts){
    const cur = sel.value;
    sel.innerHTML = '';
    for(const o of opts){
      const op = document.createElement('option');
      op.value = o;
      op.textContent = o;
      sel.appendChild(op);
    }
    // keep current if possible
    if(opts.includes(cur)) sel.value = cur;
    else {
      const dv = (STATE.values[item.id] ?? item.default ?? (opts[0] ?? ''));
      sel.value = opts.includes(dv) ? dv : (opts[0] ?? '');
      STATE.values[item.id] = sel.value;
    }
  }

  return {
    root,
    setValue(v){ sel.value = (v ?? ''); STATE.values[item.id] = sel.value; },
    getValue(){ return sel.value; },
    setDisabled(b){ sel.disabled = b; },
    setOptions,
  };
}

function makeText(item){
  const root = createFieldRoot(item);
  const inp = document.createElement('input');
  inp.type = 'text';

  inp.addEventListener('input', () => {
    const v = inp.value;
    // numeric-like constraints should be enforced in calc stage; keep string now
    STATE.values[item.id] = v;
    addChangeHandler(item.id);
  });

  root.appendChild(inp);

  return {
    root,
    setValue(v){ inp.value = (v ?? ''); STATE.values[item.id] = inp.value; },
    getValue(){ return inp.value; },
    setDisabled(b){ inp.disabled = b; },
    setOptions(){},
  };
}

function makeCheckbox(item){
  const root = createFieldRoot(item);
  const wrap = document.createElement('label');
  wrap.className = 'chk';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  const span = document.createElement('span');
  span.textContent = 'ON';

  inp.addEventListener('change', () => {
    STATE.values[item.id] = !!inp.checked;
    addChangeHandler(item.id);
  });

  wrap.appendChild(inp);
  wrap.appendChild(span);
  root.appendChild(wrap);

  return {
    root,
    setValue(v){ inp.checked = !!v; STATE.values[item.id] = !!inp.checked; },
    getValue(){ return !!inp.checked; },
    setDisabled(b){ inp.disabled = b; },
    setOptions(){},
  };
}

function makeSlider(item){
  const root = createFieldRoot(item);

  const r = document.createElement('input');
  r.type = 'range';

  const n = document.createElement('input');
  n.type = 'number';

  const val = document.createElement('div');
  val.className = 'rangeVal';

  const row = document.createElement('div');
  row.className = 'rangeRow';
  row.appendChild(r);
  row.appendChild(val);

  root.appendChild(row);
  root.appendChild(n);

  function setRange(min,max,step){
    r.min = String(min);
    r.max = String(max);
    r.step = String(step);
    n.min = String(min);
    n.max = String(max);
    n.step = String(step);
  }

  function setValue(v){
    const min = Number(r.min || 0);
    const max = Number(r.max || 100);
    const num = clamp(Number(v), min, max);
    r.value = String(num);
    n.value = String(num);
    val.textContent = String(num);
    STATE.values[item.id] = num;
  }

  const base = parseRangeConstraint(item);
  setRange(base.min, base.max, base.step);

  r.addEventListener('input', () => {
    setValue(r.value);
    addChangeHandler(item.id);
  });
  n.addEventListener('input', () => {
    setValue(n.value);
    addChangeHandler(item.id);
  });

  return {
    root,
    setValue,
    getValue(){ return Number(r.value); },
    setDisabled(b){ r.disabled = b; n.disabled = b; },
    setOptions(opts){ /* used as dynamic range config sometimes */ 
      if(opts && opts.range){
        setRange(opts.range.min, opts.range.max, opts.range.step ?? base.step);
        // clamp current
        setValue(STATE.values[item.id]);
      }
    },
  };
}

function makeToggle(item){
  const root = createFieldRoot(item);

  const row = document.createElement('div');
  row.className = 'toggleRow';

  const opts = DEF.toggle_options[item.id] || [String(item.default ?? 'A'), 'B'];
  const buttons = [];

  function applyActive(){
    const cur = STATE.values[item.id];
    for(const b of buttons){
      b.classList.toggle('active', b.dataset.val === cur);
    }
  }

  for(const o of opts){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toggleBtn';
    b.textContent = o;
    b.dataset.val = o;
    b.addEventListener('click', () => {
      STATE.values[item.id] = o;
      applyActive();
      addChangeHandler(item.id);
    });
    buttons.push(b);
    row.appendChild(b);
  }

  root.appendChild(row);

  return {
    root,
    setValue(v){ STATE.values[item.id] = String(v ?? opts[0]); applyActive(); },
    getValue(){ return STATE.values[item.id]; },
    setDisabled(b){ for(const btn of buttons) btn.disabled = b; },
    setOptions(){},
  };
}

function makeControl(item){
  switch(item.ui){
    case 'select': return makeSelect(item);
    case 'slider': return makeSlider(item);
    case 'text': return makeText(item);
    case 'toggle': return makeToggle(item);
    case 'チェックボックス': return makeCheckbox(item);
    default: return makeText(item);
  }
}

function buildForm(){
  UI.form.innerHTML = '';

  const byCat = new Map();
  for(const c of DEF.categories) byCat.set(c, []);
  for(const it of DEF.inputs){
    const c = it.category;
    if(!byCat.has(c)) byCat.set(c, []);
    byCat.get(c).push(it);
  }

  for(const c of DEF.categories){
    const items = byCat.get(c) || [];
    if(!items.length) continue;

    const details = document.createElement('details');
    details.className = 'section';
    // open the top few sections by default
    if(['ユニット','総合','環境','遺物','ペット'].includes(c)) details.open = true;

    const summary = document.createElement('summary');
    const t = document.createElement('div');
    t.className = 'sectionTitle';
    t.textContent = c;
    const meta = document.createElement('div');
    meta.className = 'sectionMeta';
    meta.textContent = `${items.length}項目`;
    summary.appendChild(t);
    summary.appendChild(meta);
    details.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'grid';

    for(const item of items){
      const ctrl = makeControl(item);
      STATE.controls[item.id] = ctrl;
      grid.appendChild(ctrl.root);
    }

    details.appendChild(grid);
    UI.form.appendChild(details);
  }
}

function setDefaults(){
  for(const item of DEF.inputs){
    const ctrl = STATE.controls[item.id];
    if(!ctrl) continue;
    const dv = item.default;
    // slider / checkbox / others handled
    ctrl.setValue(dv);
  }
}

// --- Options refresh (masters & mutual exclusions) ---
function optionListFor(item){
  // Returns array of string options for select fields
  if(item.ui !== 'select') return null;

  const id = item.id;

  if(id === 'unit_name_parts'){
    const names = uniq(STATE.masters.unit_atk.map(r => r.unit_name ?? r.UnitName ?? r.UnitName ?? r.name).filter(Boolean).map(String));
    return names.length ? names : [String(item.default || '')];
  }

  if(id === 'unit_skills_parts'){
    const u = asStr(getVal('unit_name_parts'));
    const set = STATE.masters.indexes.skills_by_unit?.get(u);
    const skills = set ? [...set] : [];
    // Always include 基本攻撃 if missing (safety)
    if(!skills.includes('基本攻撃')) skills.unshift('基本攻撃');
    return skills.length ? skills : ['基本攻撃'];
  }

  if(id === 'mode_parts'){
    const modes = uniq(STATE.masters.dff.map(r => r.mode ?? r.Mode).filter(Boolean).map(String)).sort();
    return modes.length ? modes : [String(item.default || 'ノーマル')];
  }

  if(id.startsWith('pet_name_')){
    const names = uniq(STATE.masters.pet1.map(r => r.pet_name ?? r.PetName ?? r.name).filter(Boolean).map(String)).sort();
    const base = ['None', ...names.filter(n => n !== 'None')];
    // mutual exclusion with other pet selects
    const others = ['pet_name_a','pet_name_b','pet_name_c'].filter(x => x !== id);
    const chosen = new Set(others.map(o => asStr(getVal(o))).filter(v => v && v !== 'None'));
    return base.filter(o => o === 'None' || !chosen.has(o));
  }

  if(id.startsWith('piece_name_')){
    const names = uniq(STATE.masters.piece.map(r => r.piece_name ?? r.Piecename ?? r.name).filter(Boolean).map(String)).sort();
    const base = ['None', ...names.filter(n => n !== 'None')];
    const others = ['piece_name_a','piece_name_b','piece_name_c','piece_name_d','piece_name_e'].filter(x => x !== id);
    const chosen = new Set(others.map(o => asStr(getVal(o))).filter(v => v && v !== 'None'));
    return base.filter(o => o === 'None' || !chosen.has(o));
  }

  if(id === 'treasure_name'){
    // Spec: show only when selected unit exists in treasure table. Options: None or that unit
    const u = asStr(getVal('unit_name_parts'));
    const exists = STATE.masters.indexes.treasure_treasurename?.has(u);
    return exists ? ['None', u] : ['None'];
  }

  // Default: if master given, try to build from that column name
  if(item.master){
    // ex: ld_DMG_piece[Piecename]
    const m = String(item.master).match(/^(\w+)\[(.+)\]$/);
    if(m){
      const tbl = m[1];
      const col = m[2];
      let arr = [];
      if(tbl === 'ld_DMG_piece') arr = STATE.masters.piece;
      if(tbl === 'ld_DMG_pet_1') arr = STATE.masters.pet1;
      if(tbl === 'ld_DMG_unit_atk') arr = STATE.masters.unit_atk;
      if(tbl === 'ld_DMG_unit_abilties') arr = STATE.masters.unit_abilities;
      if(tbl === 'ld_DMG_treasure') arr = STATE.masters.treasure;
      // attempt both exact and lower-case keys
      const colLower = col.toLowerCase();
      const opts = uniq(arr.map(r => r[col] ?? r[colLower] ?? r[colLower.replace(/_/g,'')] ).filter(Boolean).map(String)).sort();
      return opts.length ? opts : [String(item.default || '')];
    }
  }

  return [String(item.default || '')];
}

function refreshAllOptions(){
  for(const item of DEF.inputs){
    if(item.ui !== 'select') continue;
    const ctrl = STATE.controls[item.id];
    if(!ctrl) continue;
    const opts = optionListFor(item);
    ctrl.setOptions(opts);
  }

  // dynamic slider ranges derived from masters
  refreshDynamicSliderRanges();
}

function refreshDynamicSliderRanges(){
  // wave_parts range based on selected mode (from dff waves)
  const waveCtrl = STATE.controls['wave_parts'];
  const mode = asStr(getVal('mode_parts'));
  const set = STATE.masters.indexes.waves_by_mode?.get(mode);
  if(waveCtrl && set && set.size){
    const waves = [...set].sort((a,b)=>a-b);
    waveCtrl.setOptions({ range: { min: waves[0], max: waves[waves.length-1], step: 1 } });
    // if current isn't in list, clamp already done
  }

  // piece_grow_* slider max from piece table (parame1_max)
  const growIds = ['piece_grow_a','piece_grow_b','piece_grow_c','piece_grow_d','piece_grow_e'];
  const nameMap = {
    piece_grow_a: 'piece_name_a',
    piece_grow_b: 'piece_name_b',
    piece_grow_c: 'piece_name_c',
    piece_grow_d: 'piece_name_d',
    piece_grow_e: 'piece_name_e',
  };
  for(const gid of growIds){
    const ctrl = STATE.controls[gid];
    if(!ctrl) continue;
    const pid = nameMap[gid];
    const pname = asStr(getVal(pid));
    if(!pname || pname === 'None') continue;
    const row = STATE.masters.indexes.piece_by_name?.get(pname);
    if(!row) continue;
    const max = Number(row.parame1_max ?? row.Parame1_max ?? row.param1_max ?? row.max ?? 1);
    if(Number.isFinite(max) && max > 0){
      ctrl.setOptions({ range: { min: 1, max: max, step: 1 } });
    }
  }
}

// --- Visibility application ---
function applyAllVisibility(){
  for(const item of DEF.inputs){
    const vis = evalExpr(item.expr);
    STATE.visible[item.id] = !!vis;
    const ctrl = STATE.controls[item.id];
    if(!ctrl) continue;
    ctrl.root.classList.toggle('hidden', !vis);
    ctrl.setDisabled(!vis);
  }
}

function renderOutput(){
  const out = {
    values: {},
  };
  for(const item of DEF.inputs){
    const id = item.id;
    out.values[id] = {
      value: STATE.values[id],
      visible: !!STATE.visible[id],
    };
  }
  UI.out.textContent = JSON.stringify(out, null, 2);
}

async function copyOutput(){
  try{
    await navigator.clipboard.writeText(UI.out.textContent || '');
    log('コピーしました');
  }catch(e){
    log('コピー失敗', { message: e.message });
  }
}

function resetToDefaults(){
  setDefaults();
  refreshAllOptions();
  applyAllVisibility();
  renderOutput();
  log('デフォルトへ戻しました');
}

function setDebug(on){
  STATE.debug = !!on;
  document.body.classList.toggle('debug', STATE.debug);
}

// --- Boot ---
function boot(){
  buildForm();
  setDefaults();
  refreshAllOptions();
  applyAllVisibility();
  renderOutput();

  UI.btnReload.addEventListener('click', loadMasters);
  UI.btnReset.addEventListener('click', resetToDefaults);
  UI.btnCopy.addEventListener('click', copyOutput);
  UI.btnClearLog.addEventListener('click', () => UI.log.textContent = '');
  UI.dbgToggle.addEventListener('change', () => setDebug(UI.dbgToggle.checked));

  // Auto load masters
  loadMasters().catch(e => {
    setStatus('初期化失敗');
    showError(String(e.message || e));
  });
}

document.addEventListener('DOMContentLoaded', boot);
