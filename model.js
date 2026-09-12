(function(root){
  const nutrients=[{key:'calories',label:'カロリー',unit:'kcal',color:'#28755c'},{key:'protein',label:'たんぱく質',unit:'g',color:'#5082a2'},{key:'fat',label:'脂質',unit:'g',color:'#bd8045'},{key:'carbs',label:'炭水化物',unit:'g',color:'#8676a4'},{key:'salt',label:'食塩相当量',unit:'g',color:'#5d9394'},{key:'fiber',label:'食物繊維',unit:'g',color:'#7c9460'}];
  const categories=['朝食','昼食','間食','夕食','その他'];
  function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||s<'1900-01-01'||s>'9999-12-31')return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s;}
  function shiftDate(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function total(meals,key){const known=meals.filter(m=>m.nutrients[key]!==null&&m.nutrients[key]!==undefined);return {value:Math.round(known.reduce((s,m)=>s+m.nutrients[key],0)*100)/100,known:known.length,missing:meals.length-known.length,estimated:known.some(m=>m.estimated)};}
  function validate(data){
    if(!data||data.version!==1||!Array.isArray(data.meals)||data.meals.length>50000||!data.targets)throw Error('対応するバックアップ形式ではありません。');
    const targets={};for(const n of nutrients){const v=data.targets[n.key];if(n.key==='fiber'&&v===null){targets[n.key]=null;continue;}if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>100000)throw Error('目標値を確認してください。');targets[n.key]=v;}
    const ids=new Set();const meals=data.meals.map(m=>{if(!m||typeof m.id!=='string'||!m.id||m.id.length>100||ids.has(m.id)||!validDate(m.date)||!categories.includes(m.category)||typeof m.name!=='string'||!m.name.trim()||m.name.length>500||typeof m.note!=='string'||m.note.length>3000||typeof m.estimated!=='boolean'||!m.nutrients)throw Error('食事データの形式を確認してください。');ids.add(m.id);const values={};for(const n of nutrients){const v=m.nutrients[n.key]??null;if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000))throw Error('栄養値を確認してください。');values[n.key]=v;}return {id:m.id,date:m.date,category:m.category,name:m.name.trim(),note:m.note,estimated:m.estimated,nutrients:values};});
    return {version:1,targets,meals};
  }
  const api={nutrients,categories,validDate,shiftDate,total,validate};root.HealthModel=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
