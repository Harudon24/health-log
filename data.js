/* 食品ごとの値が分かる場合は、1食品を1件としても記録できます。nullは未確認。 */
globalThis.HealthSeed = {
  version: 1,
  targets: {calories:2100, protein:70, fat:55, carbs:275, salt:6, fiber:null},
  meals: [
    {id:'seed-breakfast',date:'2026-09-12',category:'朝食',name:'バナナ1本 ＋ カロリーメイト4本',nutrients:{calories:490,protein:10,fat:23,carbs:65,salt:0.7,fiber:null},estimated:true,note:'カロリー・PFCは本人の概算。塩分は味が不明のため約0.7g（参考範囲0.44〜0.94g）。バナナは塩分0gと仮定。大塚製薬公式値を参考。'},
    {id:'seed-lunch',date:'2026-09-12',category:'昼食',name:'ロメインレタスのシーザーサラダ',nutrients:{calories:90,protein:3,fat:7,carbs:4,salt:0.7,fiber:null},estimated:true,note:'ドレッシング半分。カロリー・PFCは本人の概算。塩分は公式全量0.98gから約0.7gと仮置き（0.49〜0.98g）。ドレッシング単体値は不明。'},
    {id:'seed-snack',date:'2026-09-12',category:'間食',name:'バナナ1本 ＋ セブン ひじきと枝豆の豆腐バー1本',nutrients:{calories:255,protein:12,fat:11,carbs:30,salt:1,fiber:null},estimated:true,note:'カロリー・PFCは本人の概算。塩分は「7P味しみひじきと枝豆の豆腐バー」公式1g（同一商品と仮定）。バナナは塩分0gと仮定。'},
    {id:'seed-dinner',date:'2026-09-12',category:'夕食',name:'セブン 1/3日分の野菜が摂れるサラダ ＋ 焙煎ごまドレッシング半分 ＋ かき揚げそば ＋ 乾燥わかめ1g',nutrients:{calories:556,protein:20,fat:23,carbs:71,salt:null,fiber:null},estimated:true,note:'そば汁は飲み干していない。カロリー・PFCは本人の概算。そばの商品・ドレッシング容量・汁の残量を特定できないため、食塩は未確認。包装の値が分かれば追記してください。'}
  ]
};
