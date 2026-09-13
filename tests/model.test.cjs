const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../model.js');
const seed=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','health-log.json'),'utf8'));
test('固定した食事の合算で未確認値と推定値を区別する',()=>{
  const meals=[{nutrients:{calories:90,salt:0},estimated:true},{nutrients:{calories:92,salt:null},estimated:false}];
  assert.deepEqual(M.total(meals,'calories'),{value:182,known:2,missing:0,estimated:true});
  assert.deepEqual(M.total(meals,'salt'),{value:0,known:1,missing:1,estimated:true});
});
test('未確認・0・空の1日を区別する',()=>{const d=seed();d.meals[0].nutrients.salt=0;d.meals[3].nutrients.salt=null;assert.equal(M.total([d.meals[0]],'salt').known,1);assert.equal(M.total([],'salt').known,0);assert.equal(M.total([d.meals[3]],'salt').missing,1);});
test('月末・年末・うるう年の前日を正しく計算する',()=>{assert.equal(M.shiftDate('2026-01-01',-1),'2025-12-31');assert.equal(M.shiftDate('2024-03-01',-1),'2024-02-29');assert.equal(M.shiftDate('2026-03-01',-1),'2026-02-28');assert.equal(M.validDate('2026-02-30'),false);assert.equal(M.validDate('2026-09-12'),true);});
test('GitHubデータの往復で記録と目標が失われない',()=>{const original=seed(),validated=M.validate(JSON.parse(JSON.stringify(original)));assert.deepEqual(validated,{version:1,targets:original.targets,meals:original.meals,weights:original.weights});});
test('不正な記録や目標を拒否する',()=>{for(const change of [d=>d.targets.salt=0,d=>d.targets.calories=null,d=>d.meals[0].nutrients.fat=-1,d=>d.meals[0].date='2026-02-30',d=>d.meals[1].id=d.meals[0].id,d=>d.meals[0].name=' ',d=>d.meals[0].estimated='yes']){const d=seed();change(d);assert.throws(()=>M.validate(d));}});

test('既存形式・体重0件・1件は食事集計を変えない',()=>{
 const data=seed();delete data.weights;const legacy=M.validate(data);
 assert.deepEqual(legacy.weights,[]);assert.deepEqual(M.weightHistory([]),[]);
 data.weights=[{date:'2026-09-13',kg:102.1}];
 const next=M.validate(data);assert.deepEqual(next.meals,legacy.meals);assert.deepEqual(next.targets,legacy.targets);
 assert.deepEqual(M.weightHistory(next.weights),[{date:'2026-09-13',kg:102.1,previousDate:null,difference:null}]);
});
test('未整列の測定日を並べ、前日ではなく前回測定との差を求める',()=>{
 const weights=[{date:'2026-09-13',kg:102.1},{date:'2026-09-11',kg:102.8},{date:'2026-09-16',kg:102.2},{date:'2026-09-17',kg:102.2}];
 const before=JSON.stringify(weights),history=M.weightHistory(weights);
 assert.deepEqual(history.map(w=>w.difference),[0,0.1,-0.7,null]);
 assert.equal(history[2].previousDate,'2026-09-11');assert.equal(JSON.stringify(weights),before);
});
test('不正な体重・日付・重複日を拒否する',()=>{
 for(const weights of [null,{},[{date:'2026-02-30',kg:102}],[{date:'2026-09-13',kg:0}],[{date:'2026-09-13',kg:-1}],[{date:'2026-09-13',kg:'102.1'}],[{date:'2026-09-13',kg:NaN}],[{date:'2026-09-13',kg:Infinity}],[{date:'2026-09-13',kg:1001}],[{date:'2026-09-13',kg:102},{date:'2026-09-13',kg:101}]]){
  assert.throws(()=>M.validate({...seed(),weights}));
 }
});
test('9月13日の申告と前回比を保持する',()=>{
 const history=M.weightHistory(M.validate(seed()).weights);
 assert.deepEqual(history[0],{date:'2026-09-13',kg:102.1,previousDate:'2026-09-11',difference:-0.7});
});
