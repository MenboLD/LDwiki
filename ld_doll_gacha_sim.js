/* ld_doll_gacha_sim.js (UI確認：ステップ①)
   - データは仕様書Excel(テーブル_ld_piece_gacha)を埋め込み
   - ステップ②以降は未実装（UIのみ）
*/
const LD_DATA = {"byNumber":{"1":{"number":1,"name":"仮面","basetxt":"単体dmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/1.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"単体dmg：","ability2":"～15％","paramebase":0.1}}},"2":{"number":2,"name":"ぺたんこ","basetxt":"範囲dmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/2.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"範囲dmg：","ability2":"～15％","paramebase":0.1}}},"3":{"number":3,"name":"片目","basetxt":"現在ユニ数分：0.01～0.5％分dmg","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/3.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":10.0,"paramemin":0.01,"paramemax":0.1,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg","paramebase":0.01},"R":{"grade":"レア","stepmin":0.01,"stepmax":11.0,"paramemin":0.1,"paramemax":0.2,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg","paramebase":0.01},"E":{"grade":"エピック","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.2,"paramemax":0.3,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg","paramebase":0.01},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":11.000000000000004,"paramemin":0.3,"paramemax":0.4,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg","paramebase":0.01},"M":{"grade":"神話","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.4,"paramemax":0.5,"fp":2,"ability1":"現在ユニ数分：","ability2":"～0.5％分dmg","paramebase":0.01}}},"4":{"number":4,"name":"バンバ","basetxt":"気絶時のdmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/4.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"気絶時のdmg：","ability2":"～10％","paramebase":0.1}}},"5":{"number":5,"name":"ウォーター","basetxt":"ボスdmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/5.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"ボスdmg：","ability2":"～15％","paramebase":0.1}}},"6":{"number":6,"name":"ドラゴン","basetxt":"クリティカル率：0.1～5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/6.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"クリティカル率：","ability2":"～5％","paramebase":0.1}}},"7":{"number":7,"name":"溶岩","basetxt":"スキルdmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/7.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"スキルdmg：","ability2":"～10％","paramebase":0.1}}},"8":{"number":8,"name":"サイボーグ","basetxt":"物理dmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/8.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"物理dmg：","ability2":"～10％","paramebase":0.1}}},"9":{"number":9,"name":"スカル","basetxt":"魔法dmg：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/9.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"魔法dmg：","ability2":"～10％","paramebase":0.1}}},"10":{"number":10,"name":"ダイヤ","basetxt":"攻撃力：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/10.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"攻撃力：","ability2":"～10％","paramebase":0.1}}},"11":{"number":11,"name":"魔法使い","basetxt":"クリティカルdmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/11.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"クリティカルdmg：","ability2":"～15％","paramebase":0.1}}},"12":{"number":12,"name":"バット","basetxt":"神話1種分：0.01～1％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/12.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":20.0,"paramemin":0.01,"paramemax":0.2,"fp":2,"ability1":"神話1種分：","ability2":"～1％","paramebase":0.01},"R":{"grade":"レア","stepmin":0.01,"stepmax":21.0,"paramemin":0.2,"paramemax":0.4,"fp":2,"ability1":"神話1種分：","ability2":"～1％","paramebase":0.01},"E":{"grade":"エピック","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.4,"paramemax":0.6,"fp":2,"ability1":"神話1種分：","ability2":"～1％","paramebase":0.01},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":21.000000000000007,"paramemin":0.6,"paramemax":0.8,"fp":2,"ability1":"神話1種分：","ability2":"～1％","paramebase":0.01},"M":{"grade":"神話","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.8,"paramemax":1.0,"fp":2,"ability1":"神話1種分：","ability2":"～1％","paramebase":0.01}}},"13":{"number":13,"name":"ファイヤー","basetxt":"基本攻撃dmg：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/13.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"基本攻撃dmg：","ability2":"～15％","paramebase":0.1}}},"14":{"number":14,"name":"サンタ","basetxt":"ゴレキル時コイン：5～200枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/14.png","grades":{"N":{"grade":"ノーマル","stepmin":0.5,"stepmax":71.0,"paramemin":5.0,"paramemax":40.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚","paramebase":5.0},"R":{"grade":"レア","stepmin":0.5,"stepmax":81.0,"paramemin":40.0,"paramemax":80.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚","paramebase":5.0},"E":{"grade":"エピック","stepmin":0.5,"stepmax":81.0,"paramemin":80.0,"paramemax":120.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚","paramebase":5.0},"L":{"grade":"レジェンド","stepmin":0.5,"stepmax":81.0,"paramemin":120.0,"paramemax":160.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚","paramebase":5.0},"M":{"grade":"神話","stepmin":0.5,"stepmax":81.0,"paramemin":160.0,"paramemax":200.0,"fp":1,"ability1":"ゴレキル時コイン：","ability2":"～200枚","paramebase":5.0}}},"15":{"number":15,"name":"パン","basetxt":"スキル率：0.01～2％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/15.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":40.0,"paramemin":0.01,"paramemax":0.4,"fp":2,"ability1":"スキル率：","ability2":"～2％","paramebase":0.01},"R":{"grade":"レア","stepmin":0.01,"stepmax":41.0,"paramemin":0.4,"paramemax":0.8,"fp":2,"ability1":"スキル率：","ability2":"～2％","paramebase":0.01},"E":{"grade":"エピック","stepmin":0.01,"stepmax":40.99999999999999,"paramemin":0.8,"paramemax":1.2,"fp":2,"ability1":"スキル率：","ability2":"～2％","paramebase":0.01},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":41.000000000000014,"paramemin":1.2,"paramemax":1.6,"fp":2,"ability1":"スキル率：","ability2":"～2％","paramebase":0.01},"M":{"grade":"神話","stepmin":0.01,"stepmax":40.99999999999999,"paramemin":1.6,"paramemax":2.0,"fp":2,"ability1":"スキル率：","ability2":"～2％","paramebase":0.01}}},"16":{"number":16,"name":"超サイヤ人","basetxt":"開始コイン：1～100枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/16.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":191.0,"paramemin":1.0,"paramemax":20.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚","paramebase":1.0},"R":{"grade":"レア","stepmin":0.1,"stepmax":101.0,"paramemin":20.0,"paramemax":30.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚","paramebase":1.0},"E":{"grade":"エピック","stepmin":0.1,"stepmax":201.0,"paramemin":40.0,"paramemax":60.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚","paramebase":1.0},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":201.0,"paramemin":60.0,"paramemax":80.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚","paramebase":1.0},"M":{"grade":"神話","stepmin":0.1,"stepmax":201.0,"paramemin":80.0,"paramemax":100.0,"fp":1,"ability1":"開始コイン：","ability2":"～100枚","paramebase":1.0}}},"17":{"number":17,"name":"コーラ","basetxt":"毎waveコイン：1～25枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/17.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":41.0,"paramemin":1.0,"paramemax":5.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚","paramebase":1.0},"R":{"grade":"レア","stepmin":0.1,"stepmax":51.0,"paramemin":5.0,"paramemax":10.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚","paramebase":1.0},"E":{"grade":"エピック","stepmin":0.1,"stepmax":51.0,"paramemin":10.0,"paramemax":15.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚","paramebase":1.0},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":51.0,"paramemin":15.0,"paramemax":20.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚","paramebase":1.0},"M":{"grade":"神話","stepmin":0.1,"stepmax":51.0,"paramemin":20.0,"paramemax":25.0,"fp":1,"ability1":"毎waveコイン：","ability2":"～25枚","paramebase":1.0}}},"18":{"number":18,"name":"メロンソーダ","basetxt":"エピルレ率：0.1～2.5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/18.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":41.0,"paramemin":0.1,"paramemax":0.5,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.01,"stepmax":51.0,"paramemin":0.5,"paramemax":1.0,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.01,"stepmax":51.0,"paramemin":1.0,"paramemax":1.5,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":51.0,"paramemin":1.5,"paramemax":2.0,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.01,"stepmax":51.0,"paramemin":2.0,"paramemax":2.5,"fp":2,"ability1":"エピルレ率：","ability2":"～2.5％","paramebase":0.1}}},"19":{"number":19,"name":"アイス","basetxt":"レジェルレ率：0.1～1.5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/19.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":21.0,"paramemin":0.1,"paramemax":0.3,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.01,"stepmax":31.0,"paramemin":0.3,"paramemax":0.6,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.01,"stepmax":31.0,"paramemin":0.6,"paramemax":0.9,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":31.0,"paramemin":0.9,"paramemax":1.2,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.01,"stepmax":31.0,"paramemin":1.2,"paramemax":1.5,"fp":2,"ability1":"レジェルレ率：","ability2":"～1.5％","paramebase":0.1}}},"20":{"number":20,"name":"コーヒー","basetxt":"レアルレ率：0.1～5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/20.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"レアルレ率：","ability2":"～5％","paramebase":0.1}}},"21":{"number":21,"name":"V3","basetxt":"最大ユニ：0.1～5体","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/21.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"最大ユニ：","ability2":"～5体","paramebase":0.1}}},"22":{"number":22,"name":"バーガー","basetxt":"キル時：0.01～0.5％でコイン2～30枚","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/22.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":10.0,"paramemin":0.01,"paramemax":0.1,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン2～6枚","paramebase":0.01},"R":{"grade":"レア","stepmin":0.01,"stepmax":11.0,"paramemin":0.1,"paramemax":0.2,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン6～12枚","paramebase":0.01},"E":{"grade":"エピック","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.2,"paramemax":0.3,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン12～18枚","paramebase":0.01},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":11.000000000000004,"paramemin":0.3,"paramemax":0.4,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン18～24枚","paramebase":0.01},"M":{"grade":"神話","stepmin":0.01,"stepmax":10.999999999999998,"paramemin":0.4,"paramemax":0.5,"fp":2,"ability1":"キル時：","ability2":"～0.5％でコイン24～30枚","paramebase":0.01}}},"23":{"number":23,"name":"軍人","basetxt":"防御力減少：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/23.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"防御力減少：","ability2":"～15％","paramebase":0.1}}},"24":{"number":24,"name":"ハロウィン","basetxt":"マナ回復速度：0.1～20％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/24.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":40.0,"paramemin":0.1,"paramemax":4.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":41.0,"paramemin":4.0,"paramemax":8.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":41.0,"paramemin":8.0,"paramemax":12.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":41.0,"paramemin":12.0,"paramemax":16.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":41.0,"paramemin":16.0,"paramemax":20.0,"fp":1,"ability1":"マナ回復速度：","ability2":"～20％","paramebase":0.1}}},"25":{"number":25,"name":"ゴールド","basetxt":"攻撃速度：0.1～5％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/25.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":10.0,"paramemin":0.1,"paramemax":1.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":11.0,"paramemin":2.0,"paramemax":3.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":11.0,"paramemin":3.0,"paramemax":4.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":11.0,"paramemin":4.0,"paramemax":5.0,"fp":1,"ability1":"攻撃速度：","ability2":"～5％","paramebase":0.1}}},"26":{"number":26,"name":"肉","basetxt":"クールタイム減：0.1～10％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/26.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":20.0,"paramemin":0.1,"paramemax":2.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"クールタイム減：","ability2":"～10％","paramebase":0.1}}},"27":{"number":27,"name":"サイダー","basetxt":"毎wave：1～10％で石1個","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/27.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":11.0,"paramemin":1.0,"paramemax":2.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個","paramebase":1.0},"R":{"grade":"レア","stepmin":0.1,"stepmax":21.0,"paramemin":2.0,"paramemax":4.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個","paramebase":1.0},"E":{"grade":"エピック","stepmin":0.1,"stepmax":21.0,"paramemin":4.0,"paramemax":6.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個","paramebase":1.0},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":21.0,"paramemin":6.0,"paramemax":8.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個","paramebase":1.0},"M":{"grade":"神話","stepmin":0.1,"stepmax":21.0,"paramemin":8.0,"paramemax":10.0,"fp":1,"ability1":"毎wave：","ability2":"～10％で石1個","paramebase":1.0}}},"28":{"number":28,"name":"小太り","basetxt":"合成時ランク上昇：0.01～1％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/28.png","grades":{"N":{"grade":"ノーマル","stepmin":0.01,"stepmax":20.0,"paramemin":0.01,"paramemax":0.2,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％","paramebase":0.01},"R":{"grade":"レア","stepmin":0.01,"stepmax":21.0,"paramemin":0.2,"paramemax":0.4,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％","paramebase":0.01},"E":{"grade":"エピック","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.4,"paramemax":0.6,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％","paramebase":0.01},"L":{"grade":"レジェンド","stepmin":0.01,"stepmax":21.000000000000007,"paramemin":0.6,"paramemax":0.8,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％","paramebase":0.01},"M":{"grade":"神話","stepmin":0.01,"stepmax":20.999999999999996,"paramemin":0.8,"paramemax":1.0,"fp":2,"ability1":"合成時ランク上昇：","ability2":"～1％","paramebase":0.01}}},"29":{"number":29,"name":"ピンク","basetxt":"移動速度：1～25％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/29.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":41.0,"paramemin":1.0,"paramemax":5.0,"fp":1,"ability1":"移動速度：","ability2":"～25％","paramebase":1.0},"R":{"grade":"レア","stepmin":0.1,"stepmax":51.0,"paramemin":5.0,"paramemax":10.0,"fp":1,"ability1":"移動速度：","ability2":"～25％","paramebase":1.0},"E":{"grade":"エピック","stepmin":0.1,"stepmax":51.0,"paramemin":10.0,"paramemax":15.0,"fp":1,"ability1":"移動速度：","ability2":"～25％","paramebase":1.0},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":51.0,"paramemin":15.0,"paramemax":20.0,"fp":1,"ability1":"移動速度：","ability2":"～25％","paramebase":1.0},"M":{"grade":"神話","stepmin":0.1,"stepmax":51.0,"paramemin":20.0,"paramemax":25.0,"fp":1,"ability1":"移動速度：","ability2":"～25％","paramebase":1.0}}},"30":{"number":30,"name":"教官","basetxt":"鈍化効果：0.1～15％","picurl":"https://teggcuiyqkbcvbhdntni.supabase.co/storage/v1/object/public/ld_masterpiece/30.png","grades":{"N":{"grade":"ノーマル","stepmin":0.1,"stepmax":30.0,"paramemin":0.1,"paramemax":3.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％","paramebase":0.1},"R":{"grade":"レア","stepmin":0.1,"stepmax":31.0,"paramemin":3.0,"paramemax":6.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％","paramebase":0.1},"E":{"grade":"エピック","stepmin":0.1,"stepmax":31.0,"paramemin":6.0,"paramemax":9.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％","paramebase":0.1},"L":{"grade":"レジェンド","stepmin":0.1,"stepmax":31.0,"paramemin":9.0,"paramemax":12.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％","paramebase":0.1},"M":{"grade":"神話","stepmin":0.1,"stepmax":31.0,"paramemin":12.0,"paramemax":15.0,"fp":1,"ability1":"鈍化効果：","ability2":"～15％","paramebase":0.1}}}}};

/* =========================
   Phase A: Step1-4 入力UI
   ========================= */

const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));

/** iOS Safari: double-tap zoom抑止（保険） */
(function preventDoubleTapZoom(){
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e)=>{
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, {passive:false});
})();

function toast(msg){
  const host = $('#toastHost');
  if(!host) return;
  const el=document.createElement('div');
  el.className='toast';
  el.textContent=msg;
  host.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('is-show'));
  setTimeout(()=>{ el.classList.remove('is-show'); setTimeout(()=>el.remove(), 250); }, 2400);
}

const state = {
  activeStep: 1,
  listPage: 1,
  // Step1
  step1: {
    slots: Array(5).fill(null), // {number,name,gradeKey,value}
    locked: [false,false,false,false,false],
    selectedSlotIndex: null,
    selectedListNumber: null,
    selectedListGradeKey: null, // step1 list
    selectedListValue: null
  },
  // Step2-4
  step2: { selected: new Set(), gradeKey: new Map(), minValue: new Map(), confirmed:false },
  step3: { selected: new Set(), gradeKey: new Map(), minValue: new Map(), confirmed:false },
  step4: { selected: new Set(), gradeKey: new Map(), minValue: new Map(), confirmed:false },
  // modal context
  modal: { open:false, step:1, number:null, name:null, gradeKey:null }
};

const GRADE_KEYS = ['N','R','E','L','M'];
const GRADE_LABEL = {N:'N',R:'R',E:'E',L:'L',M:'M'};

function getDollByNumber(num){
  return LD_DATA.byNumber[String(num)];
}
function fmt(v, fp){
  return Number(v).toFixed(fp);
}
function descFor(num, gradeKey, value){
  const d=getDollByNumber(num);
  const g=d.grades[gradeKey];
  const val = (value==null)? g.paramemin : value;
  return `${g.ability1}${fmt(val,g.fp)}${g.ability2}`;
}
function defaultMin(num, gradeKey){
  return getDollByNumber(num).grades[gradeKey].paramemin;
}

function lockedSlotNamesSet(){
  const s=new Set();
  for(let i=0;i<3;i++){
    if(state.step1.locked[i] && state.step1.slots[i]) s.add(state.step1.slots[i].name);
  }
  return s;
}

function stepObj(step){
  return step===2?state.step2:step===3?state.step3:state.step4;
}

function canSelectInStep(step, num){
  const name=getDollByNumber(num).name;
  const lockedNames = lockedSlotNamesSet();
  if(lockedNames.has(name)) return false;
  if(step>=3 && state.step2.confirmed && state.step2.selected.has(num)) return false;
  if(step>=4 && state.step3.confirmed && state.step3.selected.has(num)) return false;
  return true;
}

/* ---------- Step Tabs (①〜⑦) ---------- */
function ensureStepTabs(){
  if($('.stepbar')) return;
  const top = $('.top');
  const bar=document.createElement('div');
  bar.className='stepbar';
  bar.innerHTML = `
    <button class="stepbar__btn is-active" data-step="1" type="button">①</button>
    <button class="stepbar__btn is-locked" data-step="2" type="button">②</button>
    <button class="stepbar__btn is-locked" data-step="3" type="button">③</button>
    <button class="stepbar__btn is-locked" data-step="4" type="button">④</button>
    <button class="stepbar__btn is-disabled" type="button" disabled>⑤</button>
    <button class="stepbar__btn is-disabled" type="button" disabled>⑥</button>
    <button class="stepbar__btn is-disabled" type="button" disabled>⑦</button>
  `;
  top.appendChild(bar);

  bar.addEventListener('click',(e)=>{
    const b=e.target.closest('.stepbar__btn');
    if(!b || b.disabled) return;
    const step=Number(b.dataset.step||0);
    if(!step) return;
    // allow going back anytime
    if(step<=maxAccessibleStep()){
      state.activeStep=step;
      renderAll();
    }else{
      toast('先に前のステップを確定してください');
    }
  });
}
function maxAccessibleStep(){
  if(state.step4.confirmed) return 5;
  if(state.step3.confirmed) return 4;
  if(state.step2.confirmed) return 3;
  if(state.step1Confirmed) return 2;
  return 1;
}
state.step1Confirmed=false;

function updateStepBar(){
  const bar=$('.stepbar'); if(!bar) return;
  const max=maxAccessibleStep();
  $$('.stepbar__btn',bar).forEach(btn=>{
    const step=Number(btn.dataset.step||0);
    if(!step) return;
    btn.classList.toggle('is-active', step===state.activeStep);
    const locked = step>max;
    btn.classList.toggle('is-locked', locked);
    btn.disabled=false;
  });
}

/* ---------- Extend HTML for step2-4 panels ---------- */
function ensureStepPanels(){
  const main=$('.main'); if(!main) return;
  if($('#sec-step2')) return;

  // clone doll panel header and grid container will be reused by JS (single grid)
  // We'll add selection panel + all buttons + confirm/reset row (step2-4)
  const step2=document.createElement('section');
  step2.className='panel is-hidden';
  step2.id='sec-step2';
  step2.setAttribute('aria-labelledby','sec-c2');
  step2.innerHTML=`
    <div class="panel__head">
      <h2 id="sec-c2" class="panel__title">ステップ②：第1候補</h2>
      <div class="hint">カード選択（最大10）＋能力値下限 → 確定</div>
    </div>
    <div class="allrow" aria-label="一括変更">
      <div class="allrow__label">All</div>
      <div class="allrow__btns">
        <button class="mini allbtn" data-grade="N" type="button">N</button>
        <button class="mini allbtn" data-grade="R" type="button">R</button>
        <button class="mini allbtn" data-grade="E" type="button">E</button>
        <button class="mini allbtn" data-grade="L" type="button">L</button>
        <button class="mini allbtn" data-grade="M" type="button">M</button>
      </div>
    </div>
    <div class="selpanel">
      <div class="selpanel__head">このステップで選択中（<span id="selCount2">0</span>/10）</div>
      <div id="selList2" class="selpanel__list"></div>
    </div>
    <div class="confirm-row">
      <button id="btnReset2" class="btn" type="button">リセット</button>
      <button id="btnConfirm2" class="btn btn--confirm" type="button">確定（ステップ③へ）</button>
    </div>
  `;
  const step3=step2.cloneNode(true);
  step3.id='sec-step3';
  step3.querySelector('.panel__title').textContent='ステップ③：第2候補';
  step3.querySelector('.hint').textContent='候補1と重複不可。カード選択（最大10）＋能力値下限 → 確定';
  step3.querySelector('#selCount2').id='selCount3';
  step3.querySelector('#selList2').id='selList3';
  step3.querySelector('#btnReset2').id='btnReset3';
  step3.querySelector('#btnConfirm2').id='btnConfirm3';
  step3.querySelector('#btnConfirm3') if False else None

  const step4=step2.cloneNode(true);
  step4.id='sec-step4';
  step4.querySelector('.panel__title').textContent='ステップ④：第3候補';
  step4.querySelector('.hint').textContent='候補1/2と重複不可。カード選択（最大10）＋能力値下限 → 確定';
  step4.querySelector('#selCount2').id='selCount4';
  step4.querySelector('#selList2').id='selList4';
  step4.querySelector('#btnReset2').id='btnReset4';
  step4.querySelector('#btnConfirm2').id='btnConfirm4';
  step4.querySelector('#btnConfirm4') if False else None

  main.appendChild(step2);
  main.appendChild(step3);
  main.appendChild(step4);

  // wire all buttons handler
  main.addEventListener('click',(e)=>{
    const allbtn=e.target.closest('.allbtn');
    if(allbtn){
      const grade=allbtn.dataset.grade;
      const step=state.activeStep;
      if(step<2 || step>4) return;
      const sobj=stepObj(step);
      sobj.selected.forEach(num=>{
        sobj.gradeKey.set(num, grade);
        sobj.minValue.set(num, defaultMin(num, grade));
      });
      renderAll();
      return;
    }
    const xbtn=e.target.closest('.selitem__x');
    if(xbtn){
      const step=Number(xbtn.closest('.selpanel')?.dataset.step || state.activeStep);
    }
  });
}

/* ---------- Render Doll Grid ---------- */
const dollGrid = ()=>$('#dollGrid');

function dollsForPage(page){
  const start=(page-1)*10+1;
  const end=start+9;
  const nums=[];
  for(let n=start;n<=end;n++) nums.push(n);
  return nums;
}

function renderSubtabs(){
  const tabs=$$('.subtabs__tab');
  tabs.forEach(t=>{
    const p=Number(t.dataset.listpage);
    const active = p===state.listPage;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', active?'true':'false');
  });
}

function renderGrid(){
  const grid=dollGrid(); if(!grid) return;
  grid.innerHTML='';
  const nums=dollsForPage(state.listPage);
  const step=state.activeStep;

  const selectedSet = (step===1)? null : stepObj(step).selected;
  const lockedNames=lockedSlotNamesSet();
  const maxed = (step>=2 && step<=4) ? (selectedSet.size>=10) : false;

  nums.forEach(num=>{
    const d=getDollByNumber(num);
    const name=d.name;

    const card=document.createElement('div');
    card.className='doll-card';
    card.dataset.number=String(num);

    // determine selection and grade/value by step
    let isSelected=false, gradeKey='N', value=null;
    if(step===1){
      isSelected = (state.step1.selectedListNumber===num);
      gradeKey = state.step1.selectedListGradeKey || 'N';
      value = state.step1.selectedListValue;
    }else{
      isSelected = selectedSet.has(num);
      gradeKey = stepObj(step).gradeKey.get(num) || 'M'; // default for selection
      value = stepObj(step).minValue.get(num);
    }

    const selectable = (step===1) ? true : (canSelectInStep(step,num) && !(maxed && !isSelected));

    card.classList.toggle('is-selected', isSelected);
    card.classList.toggle('is-disabled', !selectable);
    if(!selectable) card.setAttribute('aria-disabled','true');

    const desc = descFor(num, gradeKey, value);

    card.innerHTML=`
      <div class="doll-card__pic"><img alt="" src="${d.picurl}"></div>
      <div class="doll-card__meta">
        <div class="doll-card__name">${name}</div>
        <div class="grade-row">
          ${GRADE_KEYS.map(k=>`<button class="grade ${k===gradeKey?'is-on':''}" data-grade="${k}" type="button">${GRADE_LABEL[k]}</button>`).join('')}
        </div>
        <div class="doll-card__desc" data-desc="1">${desc}</div>
      </div>
    `;

    // opacity tweak when maxed
    if(maxed && !isSelected) card.style.opacity='0.45';

    grid.appendChild(card);
  });
}

function updateHintsAndVisibility(){
  // show/hide panels for step1/2/3/4
  const pDolls = $('#sec-dolls')?.closest('.panel');
  const pSlots = $('#sec-slots')?.closest('.panel');
  const p2 = $('#sec-step2');
  const p3 = $('#sec-step3');
  const p4 = $('#sec-step4');

  if(state.activeStep===1){
    pDolls?.classList.remove('is-hidden');
    pSlots?.classList.remove('is-hidden');
    p2?.classList.add('is-hidden');
    p3?.classList.add('is-hidden');
    p4?.classList.add('is-hidden');
  }else{
    pDolls?.classList.remove('is-hidden'); // reuse same list
    pSlots?.classList.add('is-hidden');
    p2?.classList.toggle('is-hidden', state.activeStep!==2);
    p3?.classList.toggle('is-hidden', state.activeStep!==3);
    p4?.classList.toggle('is-hidden', state.activeStep!==4);
  }
}

/* ---------- Slot List (Step1) ---------- */
function renderSlots(){
  const host=$('#slotList'); if(!host) return;
  host.innerHTML='';
  state.step1.slots.forEach((it,i)=>{
    const row=document.createElement('div');
    row.className='slot-card';
    row.dataset.index=String(i);
    const selected = state.step1.selectedSlotIndex===i;
    row.classList.toggle('is-selected', selected);

    const lockable = i<3;
    const locked = state.step1.locked[i];

    const name = it? it.name : '空';
    const grade = it? getDollByNumber(it.number).grades[it.gradeKey].grade : '';
    const valtxt = it? descFor(it.number, it.gradeKey, it.value) : '';

    row.innerHTML=`
      <div class="slot-card__left">
        <div class="slot-card__pic">${it? `<img alt="" src="${getDollByNumber(it.number).picurl}">` : ''}</div>
      </div>
      <div class="slot-card__right">
        <div class="slot-card__top">
          <div class="slot-card__name">${name}</div>
          ${lockable? `<button class="mini lockbtn ${locked?'is-on':''}" data-lock="1" type="button">${locked?'🔒':'🔓'}</button>`:''}
        </div>
        <div class="slot-card__sub">
          <div class="slot-card__grade">${grade}</div>
        </div>
        <div class="slot-card__desc">${it? valtxt:''}</div>
        <div class="slot-card__swap">
          <button class="mini swap" data-dir="up" type="button">▲</button>
          <button class="mini swap" data-dir="down" type="button">▼</button>
        </div>
      </div>
    `;
    host.appendChild(row);
  });
}

/* ---------- Selection Panels (Step2-4) ---------- */
function renderSelPanel(step){
  const sobj=stepObj(step);
  const countEl=$(`#selCount${step}`); if(countEl) countEl.textContent=String(sobj.selected.size);
  const listEl=$(`#selList${step}`); if(!listEl) return;
  listEl.innerHTML='';
  // show previous confirmed selections (dim, no remove)
  const prevNums=[];
  if(step>=3 && state.step2.confirmed) prevNums.push(...Array.from(state.step2.selected));
  if(step>=4 && state.step3.confirmed) prevNums.push(...Array.from(state.step3.selected));

  const addedPrev=new Set();
  prevNums.forEach(num=>{
    if(addedPrev.has(num)) return;
    addedPrev.add(num);
    const gk=(step===3? state.step2.gradeKey.get(num): state.step3.gradeKey.get(num)) || 'M';
    const val=(step===3? state.step2.minValue.get(num): state.step3.minValue.get(num)) || defaultMin(num,gk);
    const d=getDollByNumber(num);
    const el=document.createElement('div');
    el.className='selitem is-prev';
    el.innerHTML=`<div class="selitem__name">${d.name}</div><div class="selitem__desc">${descFor(num,gk,val)}</div>`;
    listEl.appendChild(el);
  });

  Array.from(sobj.selected).forEach(num=>{
    const d=getDollByNumber(num);
    const gk=sobj.gradeKey.get(num) || 'M';
    const val=sobj.minValue.get(num) ?? defaultMin(num,gk);
    const el=document.createElement('div');
    el.className='selitem';
    el.dataset.number=String(num);
    el.innerHTML=`<div class="selitem__name">${d.name}</div><div class="selitem__desc">${descFor(num,gk,val)}</div><button class="selitem__x" type="button" aria-label="解除">×</button>`;
    listEl.appendChild(el);
  });
}

/* ---------- Ability Modal ---------- */
function openAbilityModal(step, num){
  const d=getDollByNumber(num);
  const sobj = (step===1)? null : stepObj(step);
  const gradeKey = (step===1) ? (state.step1.selectedListGradeKey||'N') : (sobj.gradeKey.get(num)||'M');
  const g=d.grades[gradeKey];

  const cur = (step===1) ? (state.step1.selectedListValue ?? g.paramemin) : (sobj.minValue.get(num) ?? g.paramemin);

  state.modal={open:true, step, number:num, name:d.name, gradeKey};

  $('#modalDollName').textContent = `${d.name}（${g.grade}）`;
  const slider=$('#abilitySlider');
  slider.min = g.paramemin;
  slider.max = g.paramemax;
  slider.step = g.paramebase || g.stepmin || 0.1;
  slider.value = cur;

  $('#abilityValue').textContent = fmt(cur,g.fp);

  $('#modalBackdrop').classList.remove('is-hidden');
  $('#modalBackdrop').setAttribute('aria-hidden','false');
}

function closeAbilityModal(save){
  if(!state.modal.open){ return; }
  const {step, number} = state.modal;
  const d=getDollByNumber(number);
  const gradeKey = state.modal.gradeKey;
  const g=d.grades[gradeKey];
  const val = Number($('#abilitySlider').value);

  if(save){
    if(step===1){
      state.step1.selectedListValue = val;
    }else{
      const sobj=stepObj(step);
      sobj.minValue.set(number, val);
    }
  }
  $('#modalBackdrop').classList.add('is-hidden');
  $('#modalBackdrop').setAttribute('aria-hidden','true');
  state.modal.open=false;
  renderAll();
}

function snapByPercent(num, gradeKey, pct){
  const g=getDollByNumber(num).grades[gradeKey];
  const base=g.paramebase || g.stepmin || 0.1;
  const raw = g.paramemin + (g.paramemax - g.paramemin) * pct;
  const k = Math.round((raw - g.paramemin)/base);
  const v = g.paramemin + k*base;
  return Math.min(g.paramemax, Math.max(g.paramemin, v));
}

/* ---------- Event Wiring ---------- */
function wireEvents(){
  // list page tabs
  $$('.subtabs__tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.listPage=Number(btn.dataset.listpage);
      renderAll();
    });
  });

  // doll grid interactions
  dollGrid().addEventListener('click',(e)=>{
    const card=e.target.closest('.doll-card'); if(!card) return;
    const num=Number(card.dataset.number);
    const step=state.activeStep;

    // grade button?
    const gradeBtn=e.target.closest('.grade');
    if(gradeBtn){
      e.stopPropagation();
      const gk=gradeBtn.dataset.grade;
      if(step===1){
        state.step1.selectedListGradeKey=gk;
        state.step1.selectedListValue = defaultMin(num,gk);
      }else{
        const sobj=stepObj(step);
        if(!sobj.selected.has(num)) return;
        sobj.gradeKey.set(num,gk);
        sobj.minValue.set(num, defaultMin(num,gk));
      }
      renderAll();
      return;
    }

    // desc tap opens modal (when selected)
    if(e.target.closest('.doll-card__desc')){
      if(step===1){
        if(state.step1.selectedListNumber!==num) return;
        openAbilityModal(1,num);
      }else{
        const sobj=stepObj(step);
        if(!sobj.selected.has(num)) return;
        openAbilityModal(step,num);
      }
      return;
    }

    // selection toggle
    if(card.classList.contains('is-disabled')) return;

    if(step===1){
      if(state.step1.selectedListNumber===num){
        state.step1.selectedListNumber=null;
      }else{
        state.step1.selectedListNumber=num;
        state.step1.selectedListGradeKey = state.step1.selectedListGradeKey || 'N';
        // initialize value
        const gk=state.step1.selectedListGradeKey;
        state.step1.selectedListValue = defaultMin(num,gk);
      }
      renderAll();
    }else{
      const sobj=stepObj(step);
      if(sobj.selected.has(num)){
        sobj.selected.delete(num);
        sobj.gradeKey.delete(num);
        sobj.minValue.delete(num);
      }else{
        if(sobj.selected.size>=10){ toast('最大10個までです'); return; }
        if(!canSelectInStep(step,num)){ toast('選択できません'); return; }
        sobj.selected.add(num);
        sobj.gradeKey.set(num,'M');
        sobj.minValue.set(num, defaultMin(num,'M'));
      }
      renderAll();
    }
  });

  // transfer buttons
  $('#btnTransferDown').addEventListener('click',()=>{
    if(state.activeStep!==1) return;
    const num=state.step1.selectedListNumber;
    if(!num){ toast('人形を選択してください'); return; }

    // transfer to first unlocked empty slot from top
    const idx = state.step1.slots.findIndex((v,i)=>!v && !state.step1.locked[i]);
    if(idx<0){ toast('空きスロットがありません（ロック解除が必要かも）'); return; }
    const d=getDollByNumber(num);
    const gradeKey=state.step1.selectedListGradeKey||'N';
    const value=state.step1.selectedListValue ?? defaultMin(num, gradeKey);
    state.step1.slots[idx]={ number:num, name:d.name, gradeKey, value };
    renderAll();
  });

  $('#btnTransferUp').addEventListener('click',()=>{
    if(state.activeStep!==1) return;
    const i=state.step1.selectedSlotIndex;
    if(i==null){ toast('スロットを選択してください'); return; }
    // clear slot and unlock if empty
    state.step1.slots[i]=null;
    state.step1.locked[i]=false;
    state.step1.selectedSlotIndex=null;
    // compact: pull up non-null to fill gaps (preserve order)
    const kept=state.step1.slots.filter(v=>v);
    while(kept.length<5) kept.push(null);
    // locked stays by position, but if slot empty forced unlock for that position
    const newLocked=state.step1.locked.slice();
    for(let j=0;j<5;j++){ if(!kept[j]) newLocked[j]=false; }
    state.step1.slots=kept;
    state.step1.locked=newLocked;
    renderAll();
  });

  // slot list interactions
  $('#slotList').addEventListener('click',(e)=>{
    const row=e.target.closest('.slot-card'); if(!row) return;
    const i=Number(row.dataset.index);
    const lockbtn=e.target.closest('.lockbtn');
    if(lockbtn){
      if(i>=3) return;
      state.step1.locked[i]=!state.step1.locked[i];
      // if lock turned on but empty, auto off
      if(state.step1.locked[i] && !state.step1.slots[i]) state.step1.locked[i]=false;
      renderAll();
      return;
    }
    const swap=e.target.closest('.swap');
    if(swap){
      const dir=swap.dataset.dir;
      const j = dir==='up'? i-1 : i+1;
      if(j<0||j>=5) return;
      // swap contents only if both positions not locked
      if(state.step1.locked[i] || state.step1.locked[j]){ toast('ロック中は入替できません'); return; }
      [state.step1.slots[i], state.step1.slots[j]]=[state.step1.slots[j], state.step1.slots[i]];
      // if slot becomes empty, unlock
      if(!state.step1.slots[i]) state.step1.locked[i]=false;
      if(!state.step1.slots[j]) state.step1.locked[j]=false;
      renderAll();
      return;
    }
    // select row
    state.step1.selectedSlotIndex = (state.step1.selectedSlotIndex===i)? null : i;
    renderAll();
  });

  $('#btnConfirmStep1').addEventListener('click',()=>{
    // step1 confirm: nothing required
    state.step1Confirmed=true;
    if(state.activeStep===1) state.activeStep=2;
    renderAll();
    toast('ステップ①を確定しました');
  });

  // modal controls
  $('#abilitySlider').addEventListener('input',()=>{
    if(!state.modal.open) return;
    const {number, gradeKey}=state.modal;
    const g=getDollByNumber(number).grades[gradeKey];
    $('#abilityValue').textContent = fmt($('#abilitySlider').value, g.fp);
  });
  $('#btnMinus1').addEventListener('click',()=>stepSlider(-1));
  $('#btnPlus1').addEventListener('click',()=>stepSlider(1));
  $('#btnMinus5').addEventListener('click',()=>stepSlider(-5));
  $('#btnPlus5').addEventListener('click',()=>stepSlider(5));

  function stepSlider(mult){
    if(!state.modal.open) return;
    const {number, gradeKey}=state.modal;
    const g=getDollByNumber(number).grades[gradeKey];
    const base=g.paramebase || g.stepmin || 0.1;
    const slider=$('#abilitySlider');
    let v=Number(slider.value) + mult*base;
    v=Math.min(Number(slider.max), Math.max(Number(slider.min), v));
    slider.value=v;
    $('#abilityValue').textContent = fmt(v,g.fp);
  }

  // add presets row dynamically (to avoid HTML edits)
  const steprow=$('.modal__steprow');
  if(steprow && !$('#preset25')){
    const preset=document.createElement('div');
    preset.className='modal__preset';
    preset.innerHTML=`
      <button id="preset25" class="mini" type="button">25%</button>
      <button id="preset33" class="mini" type="button">33%</button>
      <button id="preset50" class="mini" type="button">50%</button>
      <button id="preset66" class="mini" type="button">66%</button>
      <button id="preset75" class="mini" type="button">75%</button>
    `;
    steprow.parentElement.insertBefore(preset, steprow.nextSibling);
    const map={25:0.25,33:0.33,50:0.5,66:0.66,75:0.75};
    Object.keys(map).forEach(k=>{
      $(`#preset${k}`).addEventListener('click',()=>{
        if(!state.modal.open) return;
        const {number, gradeKey}=state.modal;
        const v=snapByPercent(number, gradeKey, map[k]);
        $('#abilitySlider').value=v;
        const g=getDollByNumber(number).grades[gradeKey];
        $('#abilityValue').textContent=fmt(v,g.fp);
      });
    });
  }

  // close modal by backdrop click = cancel
  $('#modalBackdrop').addEventListener('click',(e)=>{
    if(e.target.id==='modalBackdrop') closeAbilityModal(false);
  });

  // add footer buttons if not exist
  const modal=$('.modal');
  if(modal && !$('#btnModalCancel')){
    const row=document.createElement('div');
    row.className='modal__actions';
    row.innerHTML=`<button id="btnModalCancel" class="btn" type="button">キャンセル</button>
                   <button id="btnModalOk" class="btn btn--confirm" type="button">決定</button>`;
    modal.appendChild(row);
    $('#btnModalCancel').addEventListener('click',()=>closeAbilityModal(false));
    $('#btnModalOk').addEventListener('click',()=>closeAbilityModal(true));
  }

  // Step2-4 confirm/reset + sel remove
  document.addEventListener('click',(e)=>{
    const x=e.target.closest('.selitem__x');
    if(x){
      const step=state.activeStep;
      if(step<2||step>4) return;
      const num=Number(x.parentElement.dataset.number);
      const sobj=stepObj(step);
      sobj.selected.delete(num);
      sobj.gradeKey.delete(num);
      sobj.minValue.delete(num);
      renderAll();
      return;
    }
    const reset=e.target.closest('#btnReset2,#btnReset3,#btnReset4');
    if(reset){
      const step=state.activeStep;
      if(step<2||step>4) return;
      const sobj=stepObj(step);
      sobj.selected.clear(); sobj.gradeKey.clear(); sobj.minValue.clear(); sobj.confirmed=false;
      renderAll();
      toast('リセットしました');
      return;
    }
    const confirm=e.target.closest('#btnConfirm2,#btnConfirm3,#btnConfirm4');
    if(confirm){
      const step=state.activeStep;
      if(step<2||step>4) return;
      const sobj=stepObj(step);
      const n=sobj.selected.size;
      if(n<1 || n>10){ toast('1〜10個選択してください'); return; }
      sobj.confirmed=true;
      // advance
      state.activeStep = step+1;
      renderAll();
      toast(`ステップ${step}を確定しました`);
      return;
    }
  });
}

/* ---------- Render All ---------- */
function renderAll(){
  ensureStepTabs();
  ensureStepPanels();
  updateStepBar();
  updateHintsAndVisibility();
  renderSubtabs();
  renderGrid();
  renderSlots();
  if(state.activeStep>=2 && state.activeStep<=4) renderSelPanel(state.activeStep);
}

function init(){
  ensureStepTabs();
  ensureStepPanels();
  wireEvents();
  renderAll();
}

init();
