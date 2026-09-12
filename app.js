'use strict';
const M=HealthModel,$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>new Intl.NumberFormat('ja-JP',{maximumFractionDigits:2}).format(v);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
let state={version:1,targets:{calories:2100,protein:70,fat:55,carbs:275,salt:6,fiber:null},meals:[]};
let selected=today(),month=selected.slice(0,7),updatedAt=null,loading=false;

function notice(message){const n=$('notice');n.textContent=message;n.hidden=!message;}
const forDay=date=>state.meals.filter(m=>m.date===date).sort((a,b)=>M.categories.indexOf(a.category)-M.categories.indexOf(b.category));
function amount(t,n){if(!t.known)return '未確認';return `${t.estimated?'約':''}${fmt(t.value)} ${n.unit}${t.missing?'（判明分）':''}`;}
function chooseInitialDate(){const dates=[...new Set(state.meals.map(m=>m.date))].sort(),t=today();if(dates.includes(t))return t;const past=dates.filter(d=>d<=t);return past.at(-1)||dates.at(-1)||t;}
function select(date){if(!M.validDate(date))return;selected=date;month=date.slice(0,7);render();}

function mealNutrientLevel(key,value){
  if(value===null||value===undefined||typeof value!=='number')return '';
  const target=state.targets[key];
  if(!target)return '';
  const ratio=value/target;
  if(key==='salt')return ratio>=1?'danger':ratio>=0.4?'warning':'';
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
  const start=new Date(year,mo-1,1),offset=(start.getDay()+6)%7,days=new Date(year,mo,0).getDate(),recorded=new Set(state.meals.map(m=>m.date));
  $('calendar').innerHTML=Array.from({length:offset},()=>'<span></span>').join('')+Array.from({length:days},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,'0')}`,has=recorded.has(date);return `<button data-date="${date}" class="day ${date===selected?'selected':''} ${date===today()?'today':''} ${has?'recorded':''}" aria-pressed="${date===selected}" aria-label="${date}${has?' 記録あり':''}">${i+1}<span aria-hidden="true">${has?'•':'&nbsp;'}</span></button>`;}).join('');
}

function render(){
  renderCalendar();const meals=forDay(selected),previous=M.shiftDate(selected,-1),prev=forDay(previous);
  $('day-title').textContent=new Date(selected+'T12:00:00').toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  $('day-status').textContent=meals.length?`${meals.length}件の食事を記録${meals.some(m=>m.estimated)?' · 概算・推定値を含みます':''}`:'この日の記録はありません。';
  $('source-status').textContent=updatedAt?`GitHub記録の更新日: ${updatedAt}`:'GitHubの data/health-log.json を表示中';
  $('nutrient-cards').innerHTML=M.nutrients.map(n=>{
    const t=M.total(meals,n.key),target=state.targets[n.key],ratio=target&&t.known?t.value/target*100:null,scale=ratio===null?150:Math.max(150,Math.ceil(ratio/50)*50),over=ratio!==null&&(n.key==='salt'?ratio>=100:ratio>100);
    return `<article class="nutrient ${over?'over':''}" style="--nutrient:${n.color}"><div class="nutrient-label">${n.label}${t.missing?'<span class="badge">一部未確認</span>':''}</div><div class="amount">${!meals.length?'—':t.known?`${t.estimated?'約':''}${fmt(t.value)}<small>${n.unit}${t.missing?' 判明分':''}</small>`:'未確認'}</div><div class="meter-label"><span>${target?`${n.key==='salt'?'上限':'目標'} ${fmt(target)}${n.unit}${n.key==='salt'?'未満':''}`:'目標未設定'}</span><strong>${ratio===null?'—':`${Math.round(ratio)}%${t.missing?' ※':''}`}</strong></div><div class="meter" ${ratio===null?'':`role="progressbar" aria-label="${n.label}${t.missing?' 判明分のみ':''}" aria-valuemin="0" aria-valuemax="${scale}" aria-valuenow="${ratio.toFixed(2)}" aria-valuetext="目安に対し${Math.round(ratio)}パーセント${t.missing?'、未確認分あり':''}"`}><span style="width:${ratio===null?0:ratio/scale*100}%"></span><i style="left:${100/scale*100}%"></i></div><p class="meter-note">${!meals.length?'記録待ち':!t.known?'値を確認できると集計できます':t.missing?'未確認分は含みません':over?(n.key==='salt'?'上限の目安に到達・超過':`目標より ${fmt(t.value-target)}${n.unit} 多め`):'記録済みの摂取量'}</p></article>`;
  }).join('');
  $('comparison-date').textContent=`${previous.replaceAll('-','/')} → ${selected.replaceAll('-','/')}`;
  $('comparison').innerHTML=!meals.length||!prev.length?`<div class="empty compact">${!prev.length?'前日の記録はまだありません。':'選択日の記録はまだありません。'}<br><small>両日の記録がそろうと、栄養素ごとの差が表示されます。</small></div>`:`<div class="table-scroll"><table><thead><tr><th>栄養素</th><th>前日</th><th>選択日</th><th>前日との差</th></tr></thead><tbody>${M.nutrients.map(n=>{const a=M.total(prev,n.key),b=M.total(meals,n.key),valid=a.known&&b.known&&!a.missing&&!b.missing,diff=Math.round((b.value-a.value)*100)/100;return `<tr><th>${n.label}</th><td>${amount(a,n)}</td><td>${amount(b,n)}</td><td>${valid?`${a.estimated||b.estimated?'約 ':''}${diff>0?'+':''}${fmt(diff)} ${n.unit}`:'比較不可（未確認）'}</td></tr>`;}).join('')}</tbody></table></div>`;
  $('meal-count').textContent=`${meals.length}件`;
  const guide='<p class="meal-alert-guide"><span class="guide-warning">高め</span> 1食で1日目安の40%以上　<span class="guide-danger">かなり高い</span> 70%以上（食塩は1日の上限以上で赤）</p>';
  $('meals').innerHTML=meals.length?guide+meals.map(m=>`<article class="panel meal"><div class="meal-top"><span class="meal-category">${esc(m.category)}</span>${m.estimated?'<span class="badge">概算・推定</span>':''}</div><h3>${esc(m.name)}</h3><div class="meal-values">${M.nutrients.map(n=>mealNutrientHtml(m,n)).join('')}</div>${m.note?`<p class="meal-note">${esc(m.note)}</p>`:''}</article>`).join(''):'<div class="panel empty">この日の食事記録はまだありません。</div>';
}

function changeMonth(n){const d=new Date(month+'-15T12:00:00');d.setMonth(d.getMonth()+n);const y=d.getFullYear();if(y<1900||y>9999)return;month=`${y}-${String(d.getMonth()+1).padStart(2,'0')}`;renderCalendar();}
$('calendar').onclick=e=>{const b=e.target.closest('[data-date]');if(b)select(b.dataset.date);};
$('prev-month').onclick=()=>changeMonth(-1);$('next-month').onclick=()=>changeMonth(1);$('prev-day').onclick=()=>select(M.shiftDate(selected,-1));$('next-day').onclick=()=>select(M.shiftDate(selected,1));$('today-button').onclick=()=>select(today());$('refresh-button').onclick=()=>loadData(true);
loadData();
