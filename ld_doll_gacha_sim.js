/* ld_doll_gacha_sim.js (UI確認：ステップ①)
   - データは仕様書Excel(テーブル_ld_piece_gacha)を埋め込み
   - ステップ②以降は未実装（UIのみ）
*/
const LD_DATA = {"byNumber":{"1":{"number":1,"name":"仮面","basetxt":"単体dmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/1.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％"}}},"2":{"number":2,"name":"ぺたんこ","basetxt":"範囲dmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/2.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％"}}},"3":{"number":3,"name":"片目","basetxt":"現在ユニ数分：0.01～0.5％分dmg","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/3.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":10.0,"paramemin":0.01,"paramemax":0.1,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg"},"R":{"grade":"レア","stepmin":0.01,"stepmax":11.0,"paramemin":0.1,"paramemax":0.2,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg"},"E":{"grade":"エピック","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.2,"paramemax":0.3,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg"},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":11.000000000000004,"paramemin":0.3,"paramemax":0.4,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg"},"M":{"grade":"神話","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.4,"paramemax":0.5,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg"}}},"4":{"number":4,"name":"バンバ","basetxt":"気絶時のdmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/4.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％"}}},"5":{"number":5,"name":"ウォーター","basetxt":"ボスdmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/5.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％"}}},"6":{"number":6,"name":"ドラゴン","basetxt":"クリティカル率：0.1～5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/6.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％"}}},"7":{"number":7,"name":"溶岩","basetxt":"スキルdmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/7.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％"}}},"8":{"number":8,"name":"サイボーグ","basetxt":"物理dmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/8.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％"}}},"9":{"number":9,"name":"スカル","basetxt":"魔法dmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/9.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％"}}},"10":{"number":10,"name":"ダイヤ","basetxt":"攻撃力：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/10.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％"}}},"11":{"number":11,"name":"魔法使い","basetxt":"クリティカルdmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/11.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％"}}},"12":{"number":12,"name":"バット","basetxt":"神話1種分：0.01～1％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/12.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":20.0,"paramemin":0.01,"paramemax":0.2,"fp":2,"ability1":"神話1種分：","ability2":"～1％"},"R":{"grade":"レア","stepmin":0.01,"stepmax":21.0,"paramemin":0.2,"paramemax":0.4,"fp":2,"ability1":"神話1種分：","ability2":"～1％"},"E":{"grade":"エピック","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.4,"paramemax":0.6,"fp":2,"ability1":"神話1種分：","ability2":"～1％"},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":21.000000000000007,"paramemin":0.6,"paramemax":0.8,"fp":2,"ability1":"神話1種分：","ability2":"～1％"},"M":{"grade":"神話","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.8,"paramemax":1.0,"fp":2,"ability1":"神話1種分：","ability2":"～1％"}}},"13":{"number":13,"name":"ファイヤー","basetxt":"基本攻撃dmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/13.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％"}}},"14":{"number":14,"name":"サンタ","basetxt":"ゴレキル時コイン：5～200枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/14.png","grades":{"N":{"grade":"ノーマル","stepmin":0.5,"stepmax":71.0,"paramemin":5.0,"paramemax":40.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚"},"R":{"grade":"レア","stepmin":0.5,"stepmax":81.0,"paramemin":40.0,"paramemax":80.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚"},"E":{"grade":"エピック","stepmin":0.5,"stepmax":81.0,"paramemin":80.0,"paramemax":120.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚"},"L":{"grade":"レジェンド","stepmin":0.5,"stepmax":81.0,"paramemin":120.0,"paramemax":160.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚"},"M":{"grade":"神話","stepmin":0.5,"stepmax":81.0,"paramemin":160.0,"paramemax":200.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚"}}},"15":{"number":15,"name":"パン","basetxt":"スキル率：0.01～2％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/15.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":40.0,"paramemin":0.01,"paramemax":0.4,"fp":2,"ability1":"スキル率：","ability2":"～2％"},"R":{"grade":"レア","stepmin":0.01,"stepmax":41.0,"paramemin":0.4,"paramemax":0.8,"fp":2,"ability1":"スキル率：","ability2":"～2％"},"E":{"grade":"エピック","stepmin":0.01,"stepmax":40.99999999999999,"paramemin":0.8,"paramemax":1.2,"fp":2,"ability1":"スキル率：","ability2":"～2％"},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":41.000000000000014,"paramemin":1.2,"paramemax":1.6,"fp":2,"ability1":"スキル率：","ability2":"～2％"},"M":{"grade":"神話","stepmin":0.01,"stepmax":40.99999999999999,"paramemin":1.6,"paramemax":2.0,"fp":2,"ability1":"スキル率：","ability2":"～2％"}}},"16":{"number":16,"name":"超サイヤ人","basetxt":"開始コイン：1～100枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/16.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":191.0,"paramemin":1.0,"paramemax":20.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚"},"R":{"grade":"レア","stepmin":0.1,"stepmax":101.0,"paramemin":20.0,"paramemax":30.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":201.0,"paramemin":40.0,"paramemax":60.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":201.0,"paramemin":60.0,"paramemax":80.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚"},"M":{"grade":"神話","stepmin":0.1,"stepmax":201.0,"paramemin":80.0,"paramemax":100.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚"}}},"17":{"number":17,"name":"コーラ","basetxt":"毎waveコイン：1～25枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/17.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":41.0,"paramemin":1.0,"paramemax":5.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚"},"R":{"grade":"レア","stepmin":0.1,"stepmax":51.0,"paramemin":5.0,"paramemax":10.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":51.0,"paramemin":10.0,"paramemax":15.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":51.0,"paramemin":15.0,"paramemax":20.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚"},"M":{"grade":"神話","stepmin":0.1,"stepmax":51.0,"paramemin":20.0,"paramemax":25.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚"}}},"18":{"number":18,"name":"メロンソーダ","basetxt":"エピルレ率：0.1～2.5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/18.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":41.0,"paramemin":0.1,"paramemax":0.5,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％"},"R":{"grade":"レア","stepmin":0.01,"stepmax":51.0,"paramemin":0.5,"paramemax":1.0,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％"},"E":{"grade":"エピック","stepmin":0.01,"stepmax":51.0,"paramemin":1.0,"paramemax":1.5,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％"},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":51.0,"paramemin":1.5,"paramemax":2.0,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％"},"M":{"grade":"神話","stepmin":0.01,"stepmax":51.0,"paramemin":2.0,"paramemax":2.5,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％"}}},"19":{"number":19,"name":"アイス","basetxt":"レジェルレ率：0.1～1.5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/19.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":21.0,"paramemin":0.1,"paramemax":0.3,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％"},"R":{"grade":"レア","stepmin":0.01,"stepmax":31.0,"paramemin":0.3,"paramemax":0.6,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％"},"E":{"grade":"エピック","stepmin":0.01,"stepmax":31.0,"paramemin":0.6,"paramemax":0.9,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％"},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":31.0,"paramemin":0.9,"paramemax":1.2,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％"},"M":{"grade":"神話","stepmin":0.01,"stepmax":31.0,"paramemin":1.2,"paramemax":1.5,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％"}}},"20":{"number":20,"name":"コーヒー","basetxt":"レアルレ率：0.1～5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/20.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％"}}},"21":{"number":21,"name":"V3","basetxt":"最大ユニ：0.1～5体","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/21.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体"},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体"},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体"}}},"22":{"number":22,"name":"バーガー","basetxt":"キル時：0.01～0.5％でコイン2～30枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/22.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":10.0,"paramemin":0.01,"paramemax":0.1,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン2～6枚"},"R":{"grade":"レア","stepmin":0.01,"stepmax":11.0,"paramemin":0.1,"paramemax":0.2,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン6～12枚"},"E":{"grade":"エピック","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.2,"paramemax":0.3,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン12～18枚"},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":11.000000000000004,"paramemin":0.3,"paramemax":0.4,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン18～24枚"},"M":{"grade":"神話","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.4,"paramemax":0.5,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン24～30枚"}}},"23":{"number":23,"name":"軍人","basetxt":"防御力減少：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/23.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％"}}},"24":{"number":24,"name":"ハロウィン","basetxt":"マナ回復速度：0.1～20％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/24.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":40.0,"paramemin":0.1,"paramemax":4.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":41.0,"paramemin":4.0,"paramemax":8.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":41.0,"paramemin":8.0,"paramemax":12.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":41.0,"paramemin":12.0,"paramemax":16.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":41.0,"paramemin":16.0,"paramemax":20.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％"}}},"25":{"number":25,"name":"ゴールド","basetxt":"攻撃速度：0.1～5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/25.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％"}}},"26":{"number":26,"name":"肉","basetxt":"クールタイム減：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/26.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％"}}},"27":{"number":27,"name":"サイダー","basetxt":"毎wave：1～10％で石1個","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/27.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個"},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個"},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個"}}},"28":{"number":28,"name":"小太り","basetxt":"合成時ランク上昇：0.01～1％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/28.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":20.0,"paramemin":0.01,"paramemax":0.2,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％"},"R":{"grade":"レア","stepmin":0.01,"stepmax":21.0,"paramemin":0.2,"paramemax":0.4,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％"},"E":{"grade":"エピック","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.4,"paramemax":0.6,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％"},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":21.000000000000007,"paramemin":0.6,"paramemax":0.8,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％"},"M":{"grade":"神話","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.8,"paramemax":1.0,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％"}}},"29":{"number":29,"name":"ピンク","basetxt":"移動速度：1～25％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/29.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":41.0,"paramemin":1.0,"paramemax":5.0,"fp":1,"ability1":"移動速度：","ability2":"～25％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":51.0,"paramemin":5.0,"paramemax":10.0,"fp":1,"ability1":"移動速度：","ability2":"～25％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":51.0,"paramemin":10.0,"paramemax":15.0,"fp":1,"ability1":"移動速度：","ability2":"～25％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":51.0,"paramemin":15.0,"paramemax":20.0,"fp":1,"ability1":"移動速度：","ability2":"～25％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":51.0,"paramemin":20.0,"paramemax":25.0,"fp":1,"ability1":"移動速度：","ability2":"～25％"}}},"30":{"number":30,"name":"教官","basetxt":"鈍化効果：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/30.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％"},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％"},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％"},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％"},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％"}}}}};

const PLACEHOLDER_PIC = "https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/0.png";

const GRADE_LETTER_TO_JA = {
  N:"ノーマル",
  R:"レア",
  E:"エピック",
  L:"レジェンド",
  M:"神話",
};

const UI = {
  dollGrid: document.getElementById("dollGrid"),
  slotList: document.getElementById("slotList"),
  subtabs: Array.from(document.querySelectorAll(".subtabs__tab")),
  btnDown: document.getElementById("btnTransferDown"),
  btnUp: document.getElementById("btnTransferUp"),
  btnConfirm: document.getElementById("btnConfirmStep1"),
  toastHost: document.getElementById("toastHost"),

  modalBackdrop: document.getElementById("modalBackdrop"),
  modalName: document.getElementById("modalDollName"),
  slider: document.getElementById("abilitySlider"),
  valLabel: document.getElementById("abilityValue"),
  btnM5: document.getElementById("btnMinus5"),
  btnM1: document.getElementById("btnMinus1"),
  btnP1: document.getElementById("btnPlus1"),
  btnP5: document.getElementById("btnPlus5"),
  btnModalCancel: document.getElementById("btnModalCancel"),
  btnModalOk: document.getElementById("btnModalOk"),
};

const state = {
  listPage: 1, // 1..3
  selectedNumber: null, // 人形リストで「カードを選択した状態」になっている番号
  // 1..30 のカードごとの状態
  cards: new Map(), // number -> { rarity: 'N'|'R'|'E'|'L'|'M'|null, overrides: {[rarity]: number} }
  // ユーザースロット 5枠
  slots: Array.from({length:5}, (_,i)=>({
    idx:i,
    number: null,
    name: null,
    rarity: null, // letter
    desc: null,
    picurl: PLACEHOLDER_PIC,
    fp: 0,
    lock: false, // only idx 0..2 used
  })),
  modal: {
    open: false,
    number: null,
    rarity: null,
  }
};

function initCards(){
  for(let n=1;n<=30;n++) {
    state.cards.set(n, {
      rarity: null,
      overrides: {},
    });
  }
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function formatFp(v, fp) {
  const p = Number.isFinite(fp) ? fp : 0;
  return Number(v).toFixed(p);
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  UI.toastHost.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(6px)"; el.style.transition="opacity .2s ease, transform .2s ease"; }, 1400);
  setTimeout(()=>{ el.remove(); }, 1700);
}

function getVisibleNumbers() {
  const start = (state.listPage-1)*10 + 1;
  const end = start + 9;
  const nums = [];
  for(let n=start;n<=end;n++) nums.push(n);
  return nums;
}

function computeDesc(number) {
  const doll = LD_DATA.byNumber[String(number)];
  const cs = state.cards.get(number);
  if (!doll || !cs) return "";
  if (!cs.rarity) return doll.basetxt ?? "";
  const g = doll.grades[cs.rarity];
  if (!g) return doll.basetxt ?? "";
  const fp = g.fp ?? 0;
  const base = g.paramemin ?? 0;
  const val = (cs.overrides && (cs.rarity in cs.overrides)) ? cs.overrides[cs.rarity] : base;
  return `${g.ability1 ?? ""}${formatFp(val, fp)}${g.ability2 ?? ""}`;
}

function renderDollGrid() {
  UI.dollGrid.innerHTML = "";
  const nums = getVisibleNumbers();
  for (const n of nums) {
    const doll = LD_DATA.byNumber[String(n)];
    const cs = state.cards.get(n);
    const selected = state.selectedNumber === n;
    const rarity = cs?.rarity ?? null;

    const card = document.createElement("div");
    card.className = "doll-card" + (selected ? " is-selected" : "");
    card.dataset.number = String(n);

    const pic = document.createElement("button");
    pic.type = "button";
    pic.className = "doll-pic";
    pic.setAttribute("aria-label", `人形カード選択: ${doll?.name ?? n}`);
    pic.innerHTML = `<img alt="" loading="lazy" src="${doll?.picurl ?? PLACEHOLDER_PIC}">`;

        const name = document.createElement("div");
    name.className = "doll-name";
    name.textContent = doll?.name ?? `#${n}`;

    const rar = document.createElement("div");
    rar.className = "rarities";
    for (const letter of ["N","R","E","L","M"]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rbtn" + (rarity === letter ? " is-on" : "");
      b.textContent = letter;
      b.dataset.rarity = letter;
      b.setAttribute("aria-pressed", rarity === letter ? "true" : "false");
      rar.appendChild(b);
    }

    const meta = document.createElement("div");
    meta.className = "doll-meta";
    meta.appendChild(name);
    meta.appendChild(rar);

    const desc = document.createElement("button");
    desc.type = "button";
    desc.className = "doll-desc" + (rarity ? " is-clickable" : "");
    desc.dataset.desc = "1";
    desc.textContent = computeDesc(n) || "";

    card.appendChild(pic);
    card.appendChild(meta);
    card.appendChild(desc);
    UI.dollGrid.appendChild(card);
  }
}

function renderSlots() {
  UI.slotList.innerHTML = "";
  state.slots.forEach((s, idx) => {
    const card = document.createElement("div");
    card.className = "slot-card";
    card.dataset.idx = String(idx);

    if (idx <= 2) {
      const lockWrap = document.createElement("div");
      lockWrap.className = "lock-wrap";
      const sw = document.createElement("label");
      sw.className = "switch";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!s.lock;
      input.disabled = (s.number == null);
      input.addEventListener("change", ()=> {
        s.lock = input.checked;
      });
      const knob = document.createElement("span");
      knob.className = "knob";
      sw.appendChild(input);
      sw.appendChild(knob);
      lockWrap.appendChild(sw);
      card.appendChild(lockWrap);
    } else {
      const spacer = document.createElement("div");
      spacer.className = "lock-wrap";
      card.appendChild(spacer);
    }

    const pic = document.createElement("div");
    pic.className = "slot-pic";
    pic.innerHTML = `<img alt="" loading="lazy" src="${s.picurl || PLACEHOLDER_PIC}">`;

    const body = document.createElement("div");
    body.className = "slot-body";

    const title = document.createElement("div");
    title.className = "slot-title";

    const nm = document.createElement("div");
    nm.className = "slot-name";
    nm.textContent = s.name ?? "空きスロット";

    const ra = document.createElement("div");
    ra.className = "slot-rarity";
    ra.textContent = s.rarity ? `レアリティ：${s.rarity}` : "レアリティ：-";

    title.appendChild(nm);
    title.appendChild(ra);

    const ds = document.createElement("div");
    ds.className = "slot-desc";
    ds.textContent = s.desc ?? "—";

    body.appendChild(title);
    body.appendChild(ds);

    card.appendChild(pic);
    card.appendChild(body);
    UI.slotList.appendChild(card);
  });
}

function setListPage(p) {
  state.listPage = clamp(p, 1, 3);
  // ページ切替時は、見えないカードの選択状態を解除
  state.selectedNumber = null;

  UI.subtabs.forEach((b)=> {
    const pp = Number(b.dataset.listpage || "1");
    const on = pp === state.listPage;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  renderDollGrid();
}

function setSelectedNumber(n) {
  if (state.selectedNumber === n) {
    state.selectedNumber = null;
  } else {
    state.selectedNumber = n;
  }
  renderDollGrid();
}

function setRarity(number, letter) {
  const cs = state.cards.get(number);
  if (!cs) return;
  if (cs.rarity === letter) {
    // 同じボタンを再度押した場合：レアリティ解除・説明文を戻す・カード選択解除
    cs.rarity = null;
    if (state.selectedNumber === number) state.selectedNumber = null;
  } else {
    cs.rarity = letter;
    state.selectedNumber = number;
  }
  renderDollGrid();
}

function tryTransferSelected() {
  const n = state.selectedNumber;
  if (!n) {
    toast("転写する人形を選択してください");
    return;
  }
  const cs = state.cards.get(n);
  const doll = LD_DATA.byNumber[String(n)];
  if (!cs || !doll) return;

  if (!cs.rarity) {
    toast("レアリティ（N/R/E/L/M）を選択してください");
    return;
  }

  const g = doll.grades[cs.rarity];
  if (!g) {
    toast("データ取得に失敗しました");
    return;
  }

  const fp = g.fp ?? 0;
  const base = g.paramemin ?? 0;
  const val = (cs.overrides && (cs.rarity in cs.overrides)) ? cs.overrides[cs.rarity] : base;
  const desc = `${g.ability1 ?? ""}${formatFp(val, fp)}${g.ability2 ?? ""}`;

  // すでに同種があるなら上書き
  let idx = state.slots.findIndex(s => s.number === n);
  if (idx === -1) {
    idx = state.slots.findIndex(s => s.number == null);
  }
  if (idx === -1) {
    toast("空きスロットがありません");
    return;
  }

  const keepLock = state.slots[idx].lock;

  state.slots[idx] = {
    ...state.slots[idx],
    number: n,
    name: doll.name ?? `#${n}`,
    rarity: cs.rarity,
    desc,
    picurl: doll.picurl ?? PLACEHOLDER_PIC,
    fp,
    lock: (idx<=2) ? keepLock : false,
  };

  renderSlots();
  toast("転写しました");
}

function clearRightMostSlot() {
  let idx = -1;
  for (let i=state.slots.length-1; i>=0; i--) {
    if (state.slots[i].number != null) {
      idx = i;
      break;
    }
  }
  if (idx === -1) {
    toast("クリア対象がありません");
    return;
  }
  state.slots[idx] = {
    ...state.slots[idx],
    number:null,
    name:null,
    rarity:null,
    desc:null,
    picurl:PLACEHOLDER_PIC,
    fp:0,
    lock:false,
  };
  renderSlots();
  toast("クリアしました");
}

function openModal(number) {
  const cs = state.cards.get(number);
  const doll = LD_DATA.byNumber[String(number)];
  if (!cs || !doll) return;
  if (!cs.rarity) return;

  const g = doll.grades[cs.rarity];
  if (!g) return;

  state.modal.open = true;
  state.modal.number = number;
  state.modal.rarity = cs.rarity;

  UI.modalName.textContent = doll.name ?? `#${number}`;

  const min = Number(g.paramemin ?? 0);
  const max = Number(g.paramemax ?? min);
  const step = Number(g.stepmin ?? 0.1);
  const fp = Number(g.fp ?? 0);

  const cur = (cs.overrides && (cs.rarity in cs.overrides)) ? Number(cs.overrides[cs.rarity]) : min;

  UI.slider.min = String(min);
  UI.slider.max = String(max);
  UI.slider.step = String(step);
  UI.slider.value = String(clamp(cur, min, max));
  UI.valLabel.textContent = formatFp(UI.slider.value, fp);

  UI.modalBackdrop.classList.remove("is-hidden");
  UI.modalBackdrop.setAttribute("aria-hidden","false");

  const updateLabel = () => {
    const v = Number(UI.slider.value);
    UI.valLabel.textContent = formatFp(v, fp);
  };

  UI.slider.oninput = updateLabel;

  const nudge = (mul) => {
    const v = Number(UI.slider.value);
    const next = clamp(v + step * mul, min, max);
    UI.slider.value = String(next);
    updateLabel();
  };
  UI.btnM5.onclick = ()=> nudge(-5);
  UI.btnM1.onclick = ()=> nudge(-1);
  UI.btnP1.onclick = ()=> nudge(1);
  UI.btnP5.onclick = ()=> nudge(5);

  UI.btnModalCancel.onclick = closeModal;
  UI.btnModalOk.onclick = () => {
    const v = Number(UI.slider.value);
    cs.overrides[cs.rarity] = v;
    closeModal();
    renderDollGrid();
  };
}

function closeModal() {
  state.modal.open = false;
  state.modal.number = null;
  state.modal.rarity = null;
  UI.modalBackdrop.classList.add("is-hidden");
  UI.modalBackdrop.setAttribute("aria-hidden","true");
}

function wireEvents() {
  // 人形一覧ページタブ
  UI.subtabs.forEach((b)=>{
    b.addEventListener("click", ()=> {
      const p = Number(b.dataset.listpage || "1");
      setListPage(p);
    });
  });

  // 人形カードの操作（簡易：再描画毎に委譲で拾う）
  UI.dollGrid.addEventListener("click", (e)=> {
    const t = e.target;
    const card = t.closest(".doll-card");
    if (!card) return;
    const number = Number(card.dataset.number || "0");
    if (!number) return;

    // rarity button
    const rbtn = t.closest(".rbtn");
    if (rbtn) {
      const r = rbtn.dataset.rarity;
      if (r) setRarity(number, r);
      return;
    }

    // desc
    const desc = t.closest(".doll-desc");
    if (desc) {
      const cs = state.cards.get(number);
      if (cs?.rarity) {
        state.selectedNumber = number;
        renderDollGrid();
        openModal(number);
      }
      return;
    }

    // image area (doll-pic)
    const pic = t.closest(".doll-pic");
    if (pic) {
      setSelectedNumber(number);
      return;
    }
  });

  // 転写・クリア
  UI.btnDown.addEventListener("click", ()=> tryTransferSelected());
  UI.btnUp.addEventListener("click", ()=> clearRightMostSlot());

  // 確定ボタン（ステップ②以降は未実装）
  UI.btnConfirm.addEventListener("click", ()=> {
    toast("ステップ②以降は未実装です（UI確認用）");
  });

  // モーダル背景クリックで閉じる
  UI.modalBackdrop.addEventListener("click", (e)=> {
    if (e.target === UI.modalBackdrop) closeModal();
  });

  // “他領域タップで選択解除”（ただし転写/クリア等は除外）
  document.addEventListener("click", (e)=> {
    if (state.modal.open) return;
    const t = e.target;
    if (t.closest(".doll-card")) return;
    if (t.closest("[data-keep-selection=\"true\"]")) return;
    if (t.closest(".subtabs")) return;

    if (state.selectedNumber != null) {
      state.selectedNumber = null;
      renderDollGrid();
    }
  });
}

function main() {
  initCards();
  setListPage(1);
  renderSlots();
  wireEvents();
}

main();
