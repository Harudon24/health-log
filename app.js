'use strict';
const M=HealthModel,$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1}).format(v);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

// 減量中の「少ないほど良い / 多いほど良い」を混同しないため、栄養素ごとに目安の種類を分ける。
const GUIDE={
  calories:{type:'range',min:1800,target:1900,max:2000,role:'range',roleLabel:'範囲で調整',guideLabel:'減量目安 1,800〜2,000 kcal'},
  protein:{type:'minimum',min:65,target:75,role:'want',roleLabel:'しっかり取りたい',guideLabel:'最低 65g / できれば 75g'},
  fat:{type:'range',min:45,target:55,max:60,role:'range',roleLabel:'範囲で調整',guideLabel:'目安 45〜60g'},
  carbs:{type:'range',min:230,target:250,max:280,role:'range',roleLabel:'範囲で調整',guideLabel:'目安 230〜280g'},
  salt:{type:'maximum',max:6,target:6,role:'limit',roleLabel:'上限を意識',guideLabel:'上限 6g未満'},
  fiber:{type:'minimum',min:22,target:22,role:'want',roleLabel:'しっかり取りたい',guideLabel:'最低 22g'}
};

// 100点の内訳。減量・血圧対策で重要な項目を重めにする。
const SCORE_WEIGHTS={calories:20,protein:20,fiber:20,salt:20,fat:15,carbs:5};
const SCORE_NAMES={calories:'カロリー',protein:'P',fiber:'食物繊維',salt:'塩分',fat:'脂質',carbs:'炭水化物'};

let state={version:1,targets:{calories:1900,protein:75,fat:55,carbs:250,salt:6,fiber:22},meals:[],weights:[]};
let selected=today(),month=selected.slice(0,7),updatedAt=null,loading=false;

function notice(message){const n=$('notice');n.textContent=message;n.hidden=!message;}
const forDay=date=>state.meals.filter(m=>m.date===date).sort((a,b)=>M.categories.indexOf(a.category)-M.categories.indexOf(b.category));
function amount(t,n){if(!t.known)return '未確認';return `${t.estimated?'約':''}${fmt(t.value)} ${n.unit}${t.missing?'（判明分）':''}`;}
function chooseInitialDate(){const dates=[...new Set([...state.meals,...state.weights].map(m=>m.date))].sort(),t=today();if(dates.includes(t))return t;const past=dates.filter(d=>d<=t);return past.at(-1)||dates.at(-1)||t;}
function select(date){if(!M.validDate(date))return;selected=date;month=date.slice(0,7);render();}

function totalValue(meals,key){const t=M.total(meals,key);return t.known&&!t.missing?t.value:null;}
function goalStatus(key,value){
  const g=GUIDE[key];
  if(value===null||!g)return {className:'unknown',text:'未確認'};
  if(g.type==='minimum'){
    if(value>=g.min)return {className:'good',text:value>=g.target?'目標ライン達成':'最低ライン達成'};
    return {className:'low',text:`あと ${fmt(g.min-value)}${M.nutrients.find(n=>n.key===key).unit} で最低ライン`};
  }
  if(g.type==='maximum'){
    if(value<g.max)return {className:value>=g.max*.85?'near':'good',text:`上限まで約 ${fmt(g.max-value)}${M.nutrients.find(n=>n.key===key).unit}`};
    return {className:'high',text:`上限を ${fmt(value-g.max)}${M.nutrients.find(n=>n.key===key).unit} 超過`};
  }
  if(value<g.min)return {className:'low',text:`あと ${fmt(g.min-value)}${M.nutrients.find(n=>n.key===key).unit} で目安範囲`};
  if(value>g.max)return {className:'high',text:`目安より ${fmt(value-g.max)}${M.nutrients.find(n=>n.key===key).unit} 多め`};
  return {className:'good',text:'目安範囲内'};
}
const clamp01=v=>Math.max(0,Math.min(1,v));

// 点数は意図的に厳しめ。最低ラインでは満点にせず、「目標に近いほど高得点」にする。
function scoreFactor(key,value){
  if(value===null)return null;
  if(key==='calories'){
    if(value>=1800&&value<=2000)return 1;
    if(value<1800)return clamp01((value-1400)/400); // 1400以下は0点、1800で満点
    return clamp01(1-(value-2000)/500);             // 2500以上は0点
  }
  if(key==='protein'){
    if(value>=75)return 1;
    if(value>=65)return .75+.25*(value-65)/10;      // 65gは75点相当、75gで満点
    if(value>=50)return .35+.40*(value-50)/15;
    return clamp01(.35*value/50);
  }
  if(key==='fiber')return clamp01(Math.pow(value/22,1.5)); // 不足時の減点をやや強める
  if(key==='salt'){
    if(value<=5)return 1;
    if(value<=6)return 1-.30*(value-5);              // 6gで70点相当
    if(value<=8)return .70-.30*(value-6);            // 8gで10点相当
    if(value<=9)return .10-.10*(value-8);
    return 0;
  }
  if(key==='fat'){
    if(value>=45&&value<=60)return 1;
    if(value<45){
      if(value>=35)return .70+.30*(value-35)/10;
      if(value>=25)return .40+.30*(value-25)/10;
      return clamp01(.40*value/25);
    }
    if(value<=70)return 1-.50*(value-60)/10;         // 70gで50点相当
    if(value<=80)return .50-.40*(value-70)/10;       // 80gで10点相当
    if(value<=85)return .10-.10*(value-80)/5;
    return 0;
  }
  if(key==='carbs'){
    if(value>=230&&value<=280)return 1;
    if(value<230){
      if(value>=200)return .85+.15*(value-200)/30;
      if(value>=150)return .65+.20*(value-150)/50;
      return clamp01(.65*value/150);
    }
    if(value<=320)return 1-.20*(value-280)/40;
    if(value<=380)return .80-.30*(value-320)/60;
    return clamp01(.50-(value-380)/240);
  }
  return 0;
}

// 1日合計が整っていても、1食だけ極端に偏った場合は追加減点する。
function mealSpikePenalty(meals){
  if(!meals.length)return {points:0,reasons:[]};
  const max=key=>Math.max(...meals.map(m=>typeof m.nutrients[key]==='number'?m.nutrients[key]:0));
  let points=0;const reasons=[];
  const salt=max('salt'),cal=max('calories'),fat=max('fat'),carbs=max('carbs');
  if(salt>=6){points+=5;reasons.push('1食の塩分6g以上 -5');}
  else if(salt>=4.5){points+=2;reasons.push('1食の塩分4.5g以上 -2');}
  if(cal>=800){points+=3;reasons.push('1食800kcal以上 -3');}
  if(fat>=30){points+=3;reasons.push('1食の脂質30g以上 -3');}
  if(carbs>=130){points+=2;reasons.push('1食の炭水化物130g以上 -2');}
  return {points:Math.min(10,points),reasons};
}

function dailyScore(meals){
  if(!meals.length)return null;
  let earned=0,missing=false;const parts=[];
  for(const [key,weight] of Object.entries(SCORE_WEIGHTS)){
    const value=totalValue(meals,key),factor=scoreFactor(key,value);
    if(factor===null){
      // 未確認項目を除外すると点数が不自然に上がるため、厳しめに0点扱いして暫定表示。
      missing=true;parts.push({key,label:SCORE_NAMES[key],points:0,max:weight});continue;
    }
    const points=weight*factor;earned+=points;
    parts.push({key,label:SCORE_NAMES[key],points:Math.round(points),max:weight});
  }
  const spike=mealSpikePenalty(meals);
  return {value:Math.max(0,Math.round(earned-spike.points)),provisional:missing,parts,penalty:spike.points,penaltyReasons:spike.reasons};
}
function scoreLabel(score){
  if(score>=90)return 'かなり良い';
  if(score>=80)return '良い';
  if(score>=70)return 'まずまず';
  if(score>=60)return '要改善';
  if(score>=50)return '改善点多め';
  return 'かなり見直したい';
}

function buildAdvice(meals){
  if(!meals.length)return '<p class="muted">食事が記録されると、その日の不足・取りすぎをここにまとめます。</p>';
  const v=Object.fromEntries(M.nutrients.map(n=>[n.key,totalValue(meals,n.key)]));
  const tips=[];
  if(v.calories!==null){
    if(v.calories<GUIDE.calories.min){
      const gap=Math.round(GUIDE.calories.min-v.calories);
      const focus=[];
      if(v.protein!==null&&v.protein<GUIDE.protein.min)focus.push(`たんぱく質をあと約${Math.ceil(GUIDE.protein.min-v.protein)}g`);
      if(v.fat!==null&&v.fat<GUIDE.fat.min)focus.push(`脂質をあと約${Math.ceil(GUIDE.fat.min-v.fat)}g`);
      if(v.carbs!==null&&v.carbs<GUIDE.carbs.min)focus.push(`炭水化物をあと約${Math.ceil(GUIDE.carbs.min-v.carbs)}g`);
      tips.push(`<strong>あと約${gap}kcal</strong>は減量目安の範囲内。${focus.length?focus.join('、')+'を目安に足すとバランスを整えやすい。':'無理に埋めなくてもよいけど、空腹があれば栄養の不足を優先して追加。'}`);
    }else if(v.calories>GUIDE.calories.max){tips.push(`カロリーは目安より約<strong>${Math.round(v.calories-GUIDE.calories.max)}kcal多め</strong>。翌日に極端に減らさず、次の食事で少し調整すればOK。`);}
    else tips.push('カロリーは<strong>減量目安の範囲内</strong>。このくらいを続けられれば十分。');
  }
  if(v.protein!==null&&v.protein<GUIDE.protein.min)tips.push(`たんぱく質は最低ラインまで<strong>あと約${Math.ceil(GUIDE.protein.min-v.protein)}g</strong>。オイコス、豆腐、卵など低脂質・低塩分寄りで補うと合わせやすい。`);
  if(v.fiber!==null&&v.fiber<GUIDE.fiber.min)tips.push(`食物繊維は<strong>あと約${fmt(GUIDE.fiber.min-v.fiber)}g</strong>。野菜、海藻、豆類などを足したい。`);
  if(v.salt!==null){if(v.salt>=GUIDE.salt.max)tips.push(`食塩は<strong>${fmt(v.salt)}g</strong>で上限目安を超過。次の食事は汁物・つゆ・加工食品を控えめに。`);else if(v.salt>=5)tips.push(`食塩は<strong>${fmt(v.salt)}g</strong>で上限に近い。これ以上は薄味・汁を残す方向がよさそう。`);}
  if(v.fat!==null&&v.fat>GUIDE.fat.max)tips.push(`脂質は目安より<strong>${fmt(v.fat-GUIDE.fat.max)}g多め</strong>。追加するなら脂質の少ない食品を優先。`);
  if(v.carbs!==null&&v.carbs>GUIDE.carbs.max)tips.push(`炭水化物は目安より<strong>${fmt(v.carbs-GUIDE.carbs.max)}g多め</strong>。次の食事は主食量を少し控える程度でOK。`);
  if(!tips.length)tips.push('大きな偏りは見当たりません。この日のバランスはかなり良いです。');
  return `<ul class="advice-list">${tips.map(t=>`<li>${t}</li>`).join('')}</ul>`;
}

function mealNutrientLevel(key,value){
  if(value===null||value===undefined||typeof value!=='number')return '';
  const target=GUIDE[key]?.target||state.targets[key];
  if(!target)return '';
  const ratio=value/target;
  if(key==='salt')return value>=GUIDE.salt.max?'danger':value>=GUIDE.salt.max*.4?'warning':'';
  if(['calories','fat','carbs'].includes(key))return ratio>=0.7?'danger':ratio>=0.4?'warning':'';
  return '';
}
function mealNutrientHtml(m,n){
  const value=m.nutrients[n.key];
  if(value===null)return `<span class="meal-value-item">${n.label} <b>未確認</b></span>`;
  const level=mealNutrientLevel(n.key,value);
  const label=level==='danger'?'かなり高い':level==='warning'?'高め':'';
  return `<span class="meal-value-item ${level}">${n.label} <b>${fmt(value)}${n.unit}</b>${label?`<em>${label}</em>`:''}</span>`;
}

async function loadData(preserveSelection=false){
  if(loading)return;loading=true;notice('GitHubの最新記録を読み込んでいます…');$('refresh-button').disabled=true;
  try{
    const response=await fetch(`./data/health-log.json?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const raw=await response.json();
    state=M.validate(raw);updatedAt=raw.updatedAt||null;
    if(!preserveSelection||!M.validDate(selected))selected=chooseInitialDate();
    month=selected.slice(0,7);
    notice('');render();
  }catch(error){notice(`記録を読み込めませんでした。GitHub Pagesの反映待ち、または通信状態を確認してください。（${error.message}）`);render();}
  finally{loading=false;$('refresh-button').disabled=false;}
}

function renderCalendar(){
  const [year,mo]=month.split('-').map(Number);$('month-title').textContent=`${year}年 ${mo}月`;
  const start=new Date(year,mo-1,1),offset=(start.getDay()+6)%7,days=new Date(year,mo,0).getDate(),recorded=new Set([...state.meals,...state.weights].map(m=>m.date));
  $('calendar').innerHTML=Array.from({length:offset},()=>'<span></span>').join('')+Array.from({length:days},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,'0')}`,has=recorded.has(date);return `<button data-date="${date}" class="day ${date===selected?'selected':''} ${date===today()?'today':''} ${has?'recorded':''}" aria-pressed="${date===selected}" aria-label="${date}${has?' 記録あり':''}">${i+1}<span aria-hidden="true">${has?'•':'&nbsp;'}</span></button>`;}).join('');
}

function render(){
  renderCalendar();const meals=forDay(selected),previous=M.shiftDate(selected,-1),prev=forDay(previous);
  $('day-title').textContent=new Date(selected+'T12:00:00').toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  $('day-status').textContent=meals.length?`${meals.length}件の食事を記録${meals.some(m=>m.estimated)?' · 概算・推定値を含みます':''}`:'この日の食事記録はありません。';
  $('source-status').textContent=updatedAt?`GitHub記録の更新日: ${updatedAt}`:'GitHubの data/health-log.json を表示中';
  $('nutrient-cards').innerHTML=M.nutrients.map(n=>{
    const t=M.total(meals,n.key),g=GUIDE[n.key],target=g.target,ratio=target&&t.known?t.value/target*100:null,scale=ratio===null?150:Math.max(150,Math.ceil(ratio/50)*50),status=t.known?goalStatus(n.key,t.value):{className:'unknown',text:'未確認'},over=status.className==='high',under=status.className==='low';
    return `<article class="nutrient ${over?'over':''} ${under?'under':''}" style="--nutrient:${n.color}"><div class="nutrient-label"><span>${n.label}</span><span class="goal-chip ${g.role}">${g.roleLabel}</span>${t.missing?'<span class="badge">一部未確認</span>':''}</div><div class="amount">${!meals.length?'—':t.known?`${t.estimated?'約':''}${fmt(t.value)}<small>${n.unit}${t.missing?' 判明分':''}</small>`:'未確認'}</div><div class="goal-guide">${g.guideLabel}</div><div class="meter-label"><span>基準 ${fmt(target)}${n.unit}</span><strong>${ratio===null?'—':`${Math.round(ratio)}%${t.missing?' ※':''}`}</strong></div><div class="meter" ${ratio===null?'':`role="progressbar" aria-label="${n.label}${t.missing?' 判明分のみ':''}" aria-valuemin="0" aria-valuemax="${scale}" aria-valuenow="${ratio.toFixed(2)}" aria-valuetext="基準に対し${Math.round(ratio)}パーセント${t.missing?'、未確認分あり':''}"`}><span style="width:${ratio===null?0:ratio/scale*100}%"></span><i style="left:${100/scale*100}%"></i></div><p class="meter-note ${status.className}">${!meals.length?'記録待ち':t.missing?'未確認分は含みません':status.text}</p></article>`;
  }).join('');

  const score=dailyScore(meals);
  $('day-score').innerHTML=score?`<div class="score-ring"><strong>${score.value}</strong><small>/ 100</small></div><div><b>${scoreLabel(score.value)}</b><p>${score.provisional?'未確認項目を0点扱いした暫定点です。':'厳しめの減量バランス点です。80点以上で良好、90点以上はかなり優秀。'}</p><p>内訳：${score.parts.map(p=>`${p.label} ${p.points}/${p.max}`).join(' ・ ')}</p>${score.penalty?`<p>追加減点：-${score.penalty}点（${score.penaltyReasons.join('、')}）</p>`:''}</div>`:'<div class="muted">記録が入ると100点満点で表示します。</div>';
  $('daily-advice').innerHTML=buildAdvice(meals);

  $('comparison-date').textContent=`${previous.replaceAll('-','/')} → ${selected.replaceAll('-','/')}`;
  $('comparison').innerHTML=!meals.length||!prev.length?`<div class="empty compact">${!prev.length?'前日の記録はまだありません。':'選択日の記録はまだありません。'}<br><small>両日の記録がそろうと、栄養素ごとの差が表示されます。</small></div>`:`<div class="table-scroll"><table><thead><tr><th>栄養素</th><th>前日</th><th>選択日</th><th>前日との差</th></tr></thead><tbody>${M.nutrients.map(n=>{const a=M.total(prev,n.key),b=M.total(meals,n.key),valid=a.known&&b.known&&!a.missing&&!b.missing,diff=Math.round((b.value-a.value)*100)/100;return `<tr><th>${n.label}</th><td>${amount(a,n)}</td><td>${amount(b,n)}</td><td>${valid?`${a.estimated||b.estimated?'約 ':''}${diff>0?'+':''}${fmt(diff)} ${n.unit}`:'比較不可（未確認）'}</td></tr>`;}).join('')}</tbody></table></div>`;
  $('meal-count').textContent=`${meals.length}件`;
  const guide='<p class="meal-alert-guide"><span class="guide-warning">高め</span> 1食で1日基準の40%以上　<span class="guide-danger">かなり高い</span> 70%以上（食塩は6g以上で赤）</p>';
  $('meals').innerHTML=meals.length?guide+meals.map(m=>`<article class="panel meal"><div class="meal-top"><span class="meal-category">${esc(m.category)}</span>${m.estimated?'<span class="badge">概算・推定</span>':''}</div><h3>${esc(m.name)}</h3><div class="meal-values">${M.nutrients.map(n=>mealNutrientHtml(m,n)).join('')}</div>${m.note?`<p class="meal-note">${esc(m.note)}</p>`:''}</article>`).join(''):'<div class="panel empty">この日の食事記録はまだありません。</div>';
}

function changeMonth(n){const d=new Date(month+'-15T12:00:00');d.setMonth(d.getMonth()+n);const y=d.getFullYear();if(y<1900||y>9999)return;month=`${y}-${String(d.getMonth()+1).padStart(2,'0')}`;renderCalendar();}
$('calendar').onclick=e=>{const b=e.target.closest('[data-date]');if(b)select(b.dataset.date);};
$('prev-month').onclick=()=>changeMonth(-1);$('next-month').onclick=()=>changeMonth(1);$('prev-day').onclick=()=>select(M.shiftDate(selected,-1));$('next-day').onclick=()=>select(M.shiftDate(selected,1));$('today-button').onclick=()=>select(today());$('refresh-button').onclick=()=>loadData(true);
loadData();
