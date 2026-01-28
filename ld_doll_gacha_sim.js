/* ld_doll_gacha_sim.js
   Phase A: ステップ①〜④ 入力UI（仕様書 0128版）
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
  stepDots: Array.from(document.querySelectorAll(".step-tabs__dot")),
  subtabs: Array.from(document.querySelectorAll(".subtabs__tab")),
  dollGrid: document.getElementById("dollGrid"),
  dollsTitle: document.getElementById("sec-dollsTitle"),
  dollHint: document.getElementById("dollHint"),
  transferRow: document.querySelector(".transfer-row"),
  btnDown: document.getElementById("btnTransferDown"),
  btnUp: document.getElementById("btnTransferUp"),

  allBar: document.getElementById("allBar"),
  allBtns: Array.from(document.querySelectorAll(".allbtn")),

  slotList: document.getElementById("slotList"),

  // confirm/reset
  btnReset1: document.getElementById("btnResetStep1"),
  btnConfirm1: document.getElementById("btnConfirmStep1"),
  btnReset2: document.getElementById("btnResetStep2"),
  btnConfirm2: document.getElementById("btnConfirmStep2"),
  btnReset3: document.getElementById("btnResetStep3"),
  btnConfirm3: document.getElementById("btnConfirmStep3"),
  btnReset4: document.getElementById("btnResetStep4"),
  btnConfirm4: document.getElementById("btnConfirmStep4"),

  cand2: document.getElementById("candList2"),
  cand3: document.getElementById("candList3"),
  cand4: document.getElementById("candList4"),

  toastHost: document.getElementById("toastHost"),

  // modal
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalName: document.getElementById("modalDollName"),
  slider: document.getElementById("abilitySlider"),
  valLabel: document.getElementById("abilityValue"),
  btnM5: document.getElementById("btnMinus5"),
  btnM1: document.getElementById("btnMinus1"),
  btnP1: document.getElementById("btnPlus1"),
  btnP5: document.getElementById("btnPlus5"),
  presetBtns: Array.from(document.querySelectorAll(".preset")),
  btnModalCancel: document.getElementById("btnModalCancel"),
  btnModalOk: document.getElementById("btnModalOk"),
};

const state = {
  currentStep: 1, // 1..4 (⑤以降は未実装)
  listPage: 1, // 1..3

  steps: {
    1: { selected: new Set(), grade: new Map(), valueMin: new Map(), confirmed: false },
    2: { selected: new Set(), grade: new Map(), valueMin: new Map(), confirmed: false },
    3: { selected: new Set(), grade: new Map(), valueMin: new Map(), confirmed: false },
    4: { selected: new Set(), grade: new Map(), valueMin: new Map(), confirmed: false },
  },

  // スロット（所持）
  slots: Array.from({length:5}, (_,i)=>({
    idx:i,
    number:null,
    name:null,
    grade:null,   // 'N'|'R'|'E'|'L'|'M'
    value:null,   // number
    desc:null,
    picurl: PLACEHOLDER_PIC,
    score: null,  // int
    lock:false,   // idx0..2のみ有効（位置に紐づく）
  })),
  selectedSlotIndex: null,

  // 候補確定（global）
  candidate1: [],
  candidate2: [],
  candidate3: [],

  modal: { open:false, step:null, number:null, grade:null, fp:0, stepmin:0, min:0, max:0, paramebase:0 },
};

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

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

function getGradeData(number, grade) {
  const doll = LD_DATA.byNumber[String(number)];
  const g = doll?.grades?.[grade];
  return g ? { doll, g } : null;
}

function getVisibleNumbers() {
  const start = (state.listPage-1)*10 + 1;
  // 仕様：左列1〜5、右列6〜10（上→下）
  const nums = [];
  for (let i=0;i<5;i++){
    nums.push(start + i);
    nums.push(start + i + 5);
  }
  return nums;
}

function getLockedNames() {
  const names = new Set();
  for (let i=0;i<=2;i++){
    const s = state.slots[i];
    if (s?.name && s.lock) names.add(s.name);
  }
  return names;
}

function getBlockedNamesByCandidates(step) {
  const blocked = new Set();
  if (step >= 3) state.candidate1.forEach(x=> blocked.add(x.name));
  if (step >= 4) state.candidate2.forEach(x=> blocked.add(x.name));
  return blocked;
}

function stepTitle(step){
  if (step === 1) return "人形一覧（ステップ①）";
  if (step === 2) return "人形一覧（ステップ②：第1候補）";
  if (step === 3) return "人形一覧（ステップ③：第2候補）";
  if (step === 4) return "人形一覧（ステップ④：第3候補）";
  return "人形一覧";
}

function computeDesc(number, grade, valueMin) {
  const doll = LD_DATA.byNumber[String(number)];
  if (!doll) return "";
  if (!grade) return doll.basetxt ?? "";
  const g = doll.grades?.[grade];
  if (!g) return doll.basetxt ?? "";
  const fp = Number(g.fp ?? 0);
  const v = (valueMin == null) ? Number(g.paramemin ?? 0) : Number(valueMin);
  return `${g.ability1 ?? ""}${formatFp(v, fp)}${g.ability2 ?? ""}`;
}

function computeScore(number, grade, valueMin) {
  const got = getGradeData(number, grade);
  if (!got) return null;
  const { g } = got;
  const stepmin = Number(g.stepmin ?? 1);
  const paramebase = Number(g.paramebase ?? 0);
  const paramemax = Number(g.paramemax ?? paramebase);
  const paramemin = Number(g.paramemin ?? 0);
  const v = (valueMin == null) ? paramemin : Number(valueMin);

  const denom = ((paramemax - paramebase) / stepmin + 1);
  const numer = ((v - paramebase) / stepmin + 1);
  const raw = (numer / denom) * 10000;
  return Math.round(raw);
}

function showStepPanels(){
  const step = state.currentStep;
  // tabs
  UI.stepDots.forEach((b)=>{
    const s = Number(b.dataset.step || "0");
    if (!s) return;
    const canGo = (s <= step); // 過去のみ
    b.disabled = !canGo;
    b.classList.toggle("is-active", s === step);
    if (s === step) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current");
  });

  // All bar
  const showAll = (step >= 2 && step <= 4);
  UI.allBar.classList.toggle("is-hidden", !showAll);

  // transfer row only on step1
  UI.transferRow.style.display = (step === 1) ? "" : "none";

  // right panels
  document.querySelectorAll("[data-step-panel]").forEach((sec)=>{
    const s = Number(sec.getAttribute("data-step-panel") || "0");
    sec.classList.toggle("is-hidden", s !== step);
  });

  // title/hint
  UI.dollsTitle.textContent = stepTitle(step);
  if (step === 1) {
    UI.dollHint.textContent = "カードを選択 → ▼でスロットへ転写";
  } else {
    UI.dollHint.textContent = "カードを選択して候補を作成（最大10）";
  }
}

function setListPage(p){
  state.listPage = clamp(p, 1, 3);
  UI.subtabs.forEach((b)=>{
    const pp = Number(b.dataset.listpage || "1");
    const on = pp === state.listPage;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  renderDollGrid();
}

function clearCardState(step, number){
  const st = state.steps[step];
  st.selected.delete(number);
  st.grade.delete(number);
  st.valueMin.delete(number);
}

function selectCard(step, number, gradeDefault){
  const st = state.steps[step];
  const already = st.selected.has(number);

  if (already) {
    // toggle off
    clearCardState(step, number);
    return;
  }

  if (step === 1) {
    // ①は基本1枚運用：他を解除
    for (const n of Array.from(st.selected)) clearCardState(1, n);
  }

  st.selected.add(number);
  st.grade.set(number, gradeDefault);
  // valueMin=paramemin
  const got = getGradeData(number, gradeDefault);
  if (got) {
    st.valueMin.set(number, Number(got.g.paramemin ?? 0));
  }
}

function setGrade(step, number, grade){
  const st = state.steps[step];

  // step2-4：選択されていなければ選択ONにする
  if (!st.selected.has(number)) {
    selectCard(step, number, (step === 1) ? "N" : "M");
  }

  // ①のみ：同レア再タップで解除
  const cur = st.grade.get(number) ?? null;
  if (step === 1 && cur === grade) {
    clearCardState(step, number);
    return;
  }
  if (cur === grade) return;

  st.grade.set(number, grade);

  // valueMinをparameminへ初期化
  const got = getGradeData(number, grade);
  if (got) st.valueMin.set(number, Number(got.g.paramemin ?? 0));
}

function isBlocked(step, number){
  if (step === 1) return false;

  const doll = LD_DATA.byNumber[String(number)];
  const name = doll?.name;
  if (!name) return true;

  // ロック中スロット同名は禁止
  const locked = getLockedNames();
  if (locked.has(name)) return true;

  // 候補間重複禁止
  const blockedByPrev = getBlockedNamesByCandidates(step);
  if (blockedByPrev.has(name)) return true;

  return false;
}

function renderDollGrid(){
  const step = state.currentStep;
  const st = state.steps[step];

  UI.dollGrid.innerHTML = "";
  const nums = getVisibleNumbers();
  const selectedCount = st.selected.size;

  for (const n of nums) {
    const doll = LD_DATA.byNumber[String(n)];
    const name = doll?.name ?? `#${n}`;

    const selected = st.selected.has(n);
    const grade = st.grade.get(n) ?? null;
    const valueMin = st.valueMin.get(n) ?? null;

    const blocked = isBlocked(step, n) && !selected; // 解除のため選択済みは操作可能
    const dimByMax = (step !== 1 && selectedCount >= 10 && !selected);
    const disabled = blocked || dimByMax;

    const card = document.createElement("div");
    card.className = "doll-card"
      + (selected ? " is-selected" : "")
      + (blocked ? " is-blocked" : "")
      + (dimByMax ? " is-dim" : "")
      + (disabled ? " is-disabled" : "");
    card.dataset.number = String(n);

    const pic = document.createElement("button");
    pic.type = "button";
    pic.className = "doll-pic";
    pic.disabled = disabled;
    pic.setAttribute("aria-label", `人形カード選択: ${name}`);
    pic.innerHTML = `<img alt="" loading="lazy" src="${doll?.picurl ?? PLACEHOLDER_PIC}">`;

    const body = document.createElement("div");
    body.className = "doll-body";

    const top = document.createElement("div");
    top.className = "doll-top";

    const nm = document.createElement("div");
    nm.className = "doll-name";
    nm.textContent = name;

    const rar = document.createElement("div");
    rar.className = "rarities";
    for (const letter of ["N","R","E","L","M"]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rbtn" + (grade === letter ? " is-on" : "");
      b.textContent = letter;
      b.dataset.rarity = letter;
      b.disabled = disabled;
      b.setAttribute("aria-pressed", grade === letter ? "true" : "false");
      rar.appendChild(b);
    }

    top.appendChild(nm);
    top.appendChild(rar);

    const desc = document.createElement("button");
    desc.type = "button";
    desc.className = "doll-desc" + (grade ? " is-clickable" : "");
    desc.dataset.desc = "1";
    desc.disabled = disabled || !grade;
    desc.textContent = computeDesc(n, grade, valueMin);

    body.appendChild(top);
    body.appendChild(desc);

    card.appendChild(pic);
    card.appendChild(body);
    UI.dollGrid.appendChild(card);
  }

  // candidate panel updates
  renderCandidatePanels();
}

function renderSlots(){
  UI.slotList.innerHTML = "";
  state.slots.forEach((s, idx)=>{
    const card = document.createElement("div");
    card.className = "slot-card" + ((state.selectedSlotIndex === idx) ? " is-selected" : "");
    card.dataset.idx = String(idx);

    // lock toggle (1..3 only)
    const lockWrap = document.createElement("div");
    lockWrap.className = "lock-wrap";
    if (idx <= 2 && s.number != null) {
      const sw = document.createElement("label");
      sw.className = "switch";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!s.lock;
      input.addEventListener("change", ()=> {
        s.lock = input.checked;
        renderDollGrid(); // step2+の選択不可に影響
      });
      const knob = document.createElement("span");
      knob.className = "knob";
      sw.appendChild(input); sw.appendChild(knob);
      lockWrap.appendChild(sw);
    }
    card.appendChild(lockWrap);

    const pic = document.createElement("button");
    pic.type = "button";
    pic.className = "slot-pic";
    pic.disabled = (s.number == null);
    pic.setAttribute("aria-label", s.number == null ? "空きスロット" : `スロット選択: ${s.name}`);
    pic.innerHTML = `<img alt="" loading="lazy" src="${s.picurl || PLACEHOLDER_PIC}">`;

    const body = document.createElement("div");
    body.className = "slot-body";

    const title = document.createElement("div");
    title.className = "slot-title";

    const nm = document.createElement("div");
    nm.className = "slot-name";
    nm.textContent = s.name ?? "空きスロット";

    const score = document.createElement("div");
    score.className = "slot-score";
    score.textContent = (s.score != null) ? `評価点：${s.score}` : "";

    title.appendChild(nm);
    title.appendChild(score);

    const ra = document.createElement("div");
    ra.className = "slot-rarity";
    ra.textContent = s.grade ? `レアリティ：${s.grade}` : "レアリティ：-";

    const ds = document.createElement("div");
    ds.className = "slot-desc";
    ds.textContent = s.desc ?? "—";

    body.appendChild(title);
    body.appendChild(ra);
    body.appendChild(ds);

    const actions = document.createElement("div");
    actions.className = "slot-actions";
    if (s.number != null) {
      const up = document.createElement("button");
      up.type = "button";
      up.className = "mini";
      up.textContent = "▲";
      up.disabled = (idx === 0);
      up.dataset.move = "up";

      const down = document.createElement("button");
      down.type = "button";
      down.className = "mini";
      down.textContent = "▼";
      down.disabled = (idx === 4);
      down.dataset.move = "down";

      actions.appendChild(up);
      actions.appendChild(down);
    }
    body.appendChild(actions);

    card.appendChild(pic);
    card.appendChild(body);
    UI.slotList.appendChild(card);
  });
}

function tryTransferSelected(){
  const st = state.steps[1];
  const numbers = Array.from(st.selected);
  if (numbers.length !== 1) {
    toast("転写する人形を1つ選択してください");
    return;
  }
  const n = numbers[0];
  const grade = st.grade.get(n);
  if (!grade) {
    toast("レアリティ（N/R/E/L/M）を選択してください");
    return;
  }
  const got = getGradeData(n, grade);
  if (!got) { toast("データ取得に失敗しました"); return; }

  const { doll, g } = got;
  const fp = Number(g.fp ?? 0);
  const valueMin = st.valueMin.get(n);
  const value = (valueMin == null) ? Number(g.paramemin ?? 0) : Number(valueMin);
  const desc = `${g.ability1 ?? ""}${formatFp(value, fp)}${g.ability2 ?? ""}`;
  const score = computeScore(n, grade, value);

  // 同名があれば上書き
  const name = doll.name ?? `#${n}`;
  let idx = state.slots.findIndex(s => s.name === name);
  if (idx === -1) {
    // 最下のブランク
    for (let i=state.slots.length-1;i>=0;i--){
      if (state.slots[i].number == null){ idx = i; break; }
    }
  }
  if (idx === -1) {
    toast("空きスロットがありません");
    return;
  }

  const keepLock = state.slots[idx].lock;

  state.slots[idx] = {
    ...state.slots[idx],
    number: n,
    name,
    grade,
    value,
    desc,
    picurl: doll.picurl ?? PLACEHOLDER_PIC,
    score,
    lock: (idx<=2) ? keepLock : false,
  };

  renderSlots();
  renderDollGrid();
  toast("転写しました");
}

function deleteSelectedSlot(){
  const idx = state.selectedSlotIndex;
  if (idx == null) {
    toast("削除するスロットを選択してください");
    return;
  }
  if (state.slots[idx].number == null) {
    toast("空きスロットは削除できません");
    return;
  }

  // 削除→詰め（下の情報入りを上へ）
  for (let i=idx; i<state.slots.length-1; i++){
    state.slots[i] = { ...state.slots[i], ...state.slots[i+1], idx:i, lock: state.slots[i].lock };
    // ↑ lockは位置に紐づくので、位置側のlockを維持する
  }
  // 最下をブランクに
  const last = state.slots.length-1;
  state.slots[last] = {
    idx:last, number:null, name:null, grade:null, value:null, desc:null, picurl:PLACEHOLDER_PIC, score:null,
    lock:false
  };

  state.selectedSlotIndex = null;
  // ブランクになったスロット(詰め後の空き)はlocked=false（上でlastをfalse）
  renderSlots();
  renderDollGrid();
  toast("削除しました");
}

function moveSlot(idx, dir){
  const j = (dir === "up") ? idx-1 : idx+1;
  if (j < 0 || j >= state.slots.length) return;

  // lockは位置に紐づくので、内容のみswap
  const a = state.slots[idx];
  const b = state.slots[j];

  const aLock = a.lock;
  const bLock = b.lock;

  state.slots[idx] = { ...a, ...b, idx: idx, lock: aLock };
  state.slots[j] = { ...b, ...a, idx: j, lock: bLock };

  // 空きになった場合のlock解除
  if (state.slots[idx].number == null) state.slots[idx].lock = false;
  if (state.slots[j].number == null) state.slots[j].lock = false;

  renderSlots();
  renderDollGrid();
}

function openModal(step, number){
  const st = state.steps[step];
  const grade = st.grade.get(number);
  if (!grade) return;

  const got = getGradeData(number, grade);
  if (!got) return;

  const { doll, g } = got;

  state.modal.open = true;
  state.modal.step = step;
  state.modal.number = number;
  state.modal.grade = grade;

  const min = Number(g.paramemin ?? 0);
  const max = Number(g.paramemax ?? min);
  const stepmin = Number(g.stepmin ?? 0.1);
  const fp = Number(g.fp ?? 0);
  const paramebase = Number(g.paramebase ?? min);

  state.modal.fp = fp;
  state.modal.stepmin = stepmin;
  state.modal.min = min;
  state.modal.max = max;
  state.modal.paramebase = paramebase;

  UI.modalName.textContent = doll.name ?? `#${number}`;

  const cur = (st.valueMin.has(number)) ? Number(st.valueMin.get(number)) : min;

  UI.slider.min = String(min);
  UI.slider.max = String(max);
  UI.slider.step = String(stepmin);
  UI.slider.value = String(clamp(cur, min, max));
  UI.valLabel.textContent = formatFp(UI.slider.value, fp);

  UI.modalBackdrop.classList.remove("is-hidden");
  UI.modalBackdrop.setAttribute("aria-hidden","false");
}

function closeModal(){
  state.modal.open = false;
  state.modal.step = null;
  state.modal.number = null;
  state.modal.grade = null;
  UI.modalBackdrop.classList.add("is-hidden");
  UI.modalBackdrop.setAttribute("aria-hidden","true");
}

function applyModalValue(v){
  const step = state.modal.step;
  const number = state.modal.number;
  if (!step || !number) return;
  const st = state.steps[step];
  st.valueMin.set(number, Number(v));
  renderDollGrid();
}

function calcPresetValue(p){
  const min = state.modal.min;
  const max = state.modal.max;
  const stepmin = state.modal.stepmin;
  const base = state.modal.paramebase;

  const target = base + (max - base) * p;
  const k = Math.round((target - base) / stepmin);
  const value = clamp(base + k*stepmin, min, max);
  return value;
}

function confirmStep1(){
  const filled = state.slots.every(s => s.number != null);
  if (!filled){
    toast("ステップ①はスロット5枠すべて埋めてください");
    return;
  }
  state.steps[1].confirmed = true;
  state.currentStep = 2;
  showStepPanels();
  renderDollGrid();
  toast("ステップ②へ進みます");
}

function confirmCandidate(step){
  const st = state.steps[step];
  const count = st.selected.size;
  if (count < 1 || count > 10){
    toast("選択数は1〜10にしてください");
    return;
  }

  const arr = Array.from(st.selected).map((n)=>{
    const doll = LD_DATA.byNumber[String(n)];
    const name = doll?.name ?? `#${n}`;
    const grade = st.grade.get(n) ?? "M";
    const got = getGradeData(n, grade);
    const paramemin = got ? Number(got.g.paramemin ?? 0) : 0;
    const value = st.valueMin.has(n) ? Number(st.valueMin.get(n)) : paramemin;
    return { number:n, name, grade, value };
  }).sort((a,b)=>a.number-b.number);

  if (step === 2) state.candidate1 = arr;
  if (step === 3) state.candidate2 = arr;
  if (step === 4) state.candidate3 = arr;

  st.confirmed = true;

  if (step === 2) state.currentStep = 3;
  else if (step === 3) state.currentStep = 4;
  else {
    toast("ステップ⑤以降は未実装です（候補3は保存済み）");
  }

  showStepPanels();
  renderDollGrid();
}

function resetFromStep(step){
  // step以上を初期化
  for (let s=step; s<=4; s++){
    state.steps[s].selected.clear();
    state.steps[s].grade.clear();
    state.steps[s].valueMin.clear();
    state.steps[s].confirmed = false;
  }
  if (step <= 2) state.candidate1 = [];
  if (step <= 3) state.candidate2 = [];
  if (step <= 4) state.candidate3 = [];

  if (step === 1) {
    // slots reset too
    state.slots = Array.from({length:5}, (_,i)=>({
      idx:i, number:null, name:null, grade:null, value:null, desc:null, picurl:PLACEHOLDER_PIC, score:null, lock:false
    }));
    state.selectedSlotIndex = null;
    renderSlots();
  }
  state.currentStep = step;
  showStepPanels();
  renderDollGrid();
  toast("リセットしました");
}

function renderCandidatePanels(){
  const step = state.currentStep;
  if (step === 2) renderCandidatePanel(2);
  if (step === 3) renderCandidatePanel(3);
  if (step === 4) renderCandidatePanel(4);
}

function renderCandidatePanel(step){
  const st = state.steps[step];
  const host = (step === 2) ? UI.cand2 : (step === 3) ? UI.cand3 : UI.cand4;
  host.innerHTML = "";

  // hint update
  const panel = document.querySelector(`[data-step-panel="${step}"]`);
  const hint = panel?.querySelector(".hint");
  if (hint) hint.textContent = `このステップで選択中（${st.selected.size}/10）`;

  const prev = [];
  if (step === 3) prev.push(...state.candidate1.map(x=>({ ...x, prev:true })));
  if (step === 4) prev.push(...state.candidate1.map(x=>({ ...x, prev:true })), ...state.candidate2.map(x=>({ ...x, prev:true })));

  const cur = Array.from(st.selected).map((n)=>{
    const doll = LD_DATA.byNumber[String(n)];
    const name = doll?.name ?? `#${n}`;
    const grade = st.grade.get(n) ?? "M";
    const val = st.valueMin.get(n) ?? null;
    return { number:n, name, grade, value: val, prev:false };
  }).sort((a,b)=>a.number-b.number);

  const items = [...prev, ...cur];

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "未選択です";
    host.appendChild(empty);
    return;
  }

  for (const it of items){
    const wrap = document.createElement("div");
    wrap.className = "cand-item" + (it.prev ? " is-prev" : "");
    wrap.dataset.number = String(it.number);

    const left = document.createElement("div");
    left.className = "cand-item__left";

    const nm = document.createElement("div");
    nm.className = "cand-item__name";
    nm.textContent = it.prev ? `（参照）${it.name}` : it.name;

    const desc = document.createElement("div");
    desc.className = "cand-item__desc";
    desc.textContent = computeDesc(it.number, it.grade, it.value);

    left.appendChild(nm);
    left.appendChild(desc);

    wrap.appendChild(left);

    if (!it.prev){
      const x = document.createElement("button");
      x.type = "button";
      x.className = "cand-item__x";
      x.textContent = "×";
      x.dataset.remove = "1";
      wrap.appendChild(x);
    }

    host.appendChild(wrap);
  }
}

function setAllGrade(letter){
  const step = state.currentStep;
  if (step === 1) return;
  const st = state.steps[step];
  if (st.selected.size === 0){
    toast("対象がありません（カードを選択してください）");
    return;
  }
  for (const n of st.selected){
    st.grade.set(n, letter);
    const got = getGradeData(n, letter);
    if (got) st.valueMin.set(n, Number(got.g.paramemin ?? 0));
  }
  renderDollGrid();
}

function wireEvents(){
  // step tabs
  UI.stepDots.forEach((b)=>{
    b.addEventListener("click", ()=>{
      const s = Number(b.dataset.step || "0");
      if (!s) return;
      if (s > state.currentStep) return;
      state.currentStep = s;
      showStepPanels();
      renderDollGrid();
      if (s === 1) renderSlots();
    });
  });

  // subtabs
  UI.subtabs.forEach((b)=>{
    b.addEventListener("click", ()=> setListPage(Number(b.dataset.listpage || "1")));
  });

  // All buttons
  UI.allBtns.forEach((b)=>{
    b.addEventListener("click", ()=> setAllGrade(String(b.dataset.all || "")));
  });

  // dollGrid delegate
  UI.dollGrid.addEventListener("click", (e)=>{
    const t = e.target;
    const card = t.closest(".doll-card");
    if (!card) return;
    const number = Number(card.dataset.number || "0");
    if (!number) return;

    const step = state.currentStep;
    const st = state.steps[step];

    // remove from candidate list is elsewhere

    // rarity
    const rbtn = t.closest(".rbtn");
    if (rbtn) {
      const r = rbtn.dataset.rarity;
      if (!r) return;
      if (isBlocked(step, number) && !st.selected.has(number)) return;
      setGrade(step, number, r);
      renderDollGrid();
      return;
    }

    // desc -> modal
    const desc = t.closest(".doll-desc");
    if (desc) {
      if (!st.selected.has(number)) return;
      if (!st.grade.get(number)) return;
      openModal(step, number);
      return;
    }

    // pic -> select toggle
    const pic = t.closest(".doll-pic");
    if (pic) {
      if (isBlocked(step, number) && !st.selected.has(number)) return;
      const def = (step === 1) ? "N" : "M";
      selectCard(step, number, def);
      // max10 reached feedback
      if (step !== 1 && state.steps[step].selected.size > 10){
        // should never happen, but guard
        clearCardState(step, number);
        toast("最大10までです");
      }
      renderDollGrid();
      return;
    }
  });

  // transfer / delete
  UI.btnDown.addEventListener("click", ()=> {
    if (state.currentStep !== 1) return;
    tryTransferSelected();
  });
  UI.btnUp.addEventListener("click", ()=> {
    if (state.currentStep !== 1) return;
    deleteSelectedSlot();
  });

  // slot interactions
  UI.slotList.addEventListener("click", (e)=>{
    const t = e.target;
    const card = t.closest(".slot-card");
    if (!card) return;
    const idx = Number(card.dataset.idx || "0");

    const pic = t.closest(".slot-pic");
    if (pic){
      if (state.slots[idx].number == null) return;
      state.selectedSlotIndex = (state.selectedSlotIndex === idx) ? null : idx;
      renderSlots();
      return;
    }
    const mv = t.closest("[data-move]");
    if (mv){
      const dir = mv.dataset.move;
      moveSlot(idx, dir);
      return;
    }
  });

  // candidate list remove (×)
  const candHosts = [UI.cand2, UI.cand3, UI.cand4].filter(Boolean);
  candHosts.forEach((host)=>{
    host.addEventListener("click", (e)=>{
      const t = e.target;
      const x = t.closest("[data-remove]");
      if (!x) return;
      const item = t.closest(".cand-item");
      if (!item) return;
      const number = Number(item.dataset.number || "0");
      const step = state.currentStep;
      const st = state.steps[step];
      if (!st.selected.has(number)) return;
      clearCardState(step, number);
      renderDollGrid();
    });
  });

  // confirm/reset buttons
  UI.btnConfirm1.addEventListener("click", confirmStep1);
  UI.btnReset1.addEventListener("click", ()=> resetFromStep(1));

  UI.btnConfirm2.addEventListener("click", ()=> confirmCandidate(2));
  UI.btnReset2.addEventListener("click", ()=> resetFromStep(2));

  UI.btnConfirm3.addEventListener("click", ()=> confirmCandidate(3));
  UI.btnReset3.addEventListener("click", ()=> resetFromStep(3));

  UI.btnConfirm4.addEventListener("click", ()=> confirmCandidate(4));
  UI.btnReset4.addEventListener("click", ()=> resetFromStep(4));

  // modal
  UI.modalBackdrop.addEventListener("click", (e)=>{
    if (e.target === UI.modalBackdrop) closeModal();
  });

  const updateLabel = ()=>{
    const fp = state.modal.fp ?? 0;
    UI.valLabel.textContent = formatFp(Number(UI.slider.value), fp);
  };
  UI.slider.addEventListener("input", updateLabel);

  const nudge = (mul)=>{
    const v = Number(UI.slider.value);
    const next = clamp(v + state.modal.stepmin * mul, state.modal.min, state.modal.max);
    UI.slider.value = String(next);
    updateLabel();
  };
  UI.btnM5.onclick = ()=> nudge(-5);
  UI.btnM1.onclick = ()=> nudge(-1);
  UI.btnP1.onclick = ()=> nudge(1);
  UI.btnP5.onclick = ()=> nudge(5);

  UI.presetBtns.forEach((b)=>{
    b.addEventListener("click", ()=>{
      const p = Number(b.dataset.preset || "0") / 100;
      if (!p) return;
      const v = calcPresetValue(p);
      UI.slider.value = String(v);
      updateLabel();
    });
  });

  UI.btnModalCancel.onclick = closeModal;
  UI.btnModalOk.onclick = ()=>{
    const v = Number(UI.slider.value);
    applyModalValue(v);
    closeModal();
  };

  // click outside to clear selection? keep minimal and safe: no-op in phase A
}

function main(){
  // button label update
  UI.btnUp.textContent = "▲ 削除";
  showStepPanels();
  setListPage(1);
  renderSlots();
  renderDollGrid();
  wireEvents();
}

main();
