(function(root){
  'use strict';
  function periodData(weights,year,month,mode){
    const prefix=String(year)+(mode==='month'?'-'+String(month).padStart(2,'0'):'');
    const records=weights.filter(w=>w.date.startsWith(prefix+'-')).sort((a,b)=>a.date.localeCompare(b.date));
    const points=mode==='month'?records.map(w=>({x:Number(w.date.slice(8)),kg:w.kg,label:w.date})):
      Array.from({length:12},(_,i)=>{const rows=records.filter(w=>Number(w.date.slice(5,7))===i+1);return rows.length?{x:i+1,kg:rows.reduce((s,w)=>s+w.kg,0)/rows.length,label:`${year}年${i+1}月`,count:rows.length}:null;}).filter(Boolean);
    return {records,points,average:records.length?records.reduce((s,w)=>s+w.kg,0)/records.length:null,change:records.length>1?records.at(-1).kg-records[0].kg:null};
  }
  if(typeof module!=='undefined')module.exports={periodData};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id),M=root.HealthModel;
  const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
  let year=Number(now.slice(0,4)),month=Number(now.slice(5,7)),mode='month',weights=[],loaded=false;
  const kg=v=>v===null?'—':v.toFixed(1)+' kg';
  const delta=v=>v===null?'—':(v>0?'+':'')+(Math.round(v*10)/10).toFixed(1)+' kg';
  function fillYears(){
    const years=[...new Set([Number(now.slice(0,4)),year,...weights.map(w=>Number(w.date.slice(0,4)))])].sort((a,b)=>b-a);
    $('year').innerHTML=years.map(y=>`<option value="${y}">${y}年</option>`).join('');$('year').value=String(year);
  }
  $('month').innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}月</option>`).join('');
  function chart(points){
    if(!points.length)return '<p class="empty">この期間の体重記録はありません。</p>';
    const count=mode==='month'?new Date(year,month,0).getDate():12;
    const max=Math.max(...points.map(p=>p.kg));
    const low=90,high=Math.max(100,Math.ceil((max+.5)/5)*5);
    const width=root.innerWidth<=600?360:760;
    const x=n=>60+(n-1)/(count-1)*(width-90),y=n=>250-(n-low)/(high-low)*220;
    let svg='<svg class="trend-chart" viewBox="0 0 '+width+' 300" role="img" aria-labelledby="graph-title graph-desc"><title id="graph-title">'+$('period-title').textContent+'の体重推移</title><desc id="graph-desc">'+(mode==='month'?'日ごとの実測体重':'記録日の体重から計算した月平均')+'。詳しい数値は下の表で確認できます。</desc>';
    for(let value=low;value<=high;value+=5){svg+=`<line class="grid" x1="60" x2="${width-30}" y1="${y(value)}" y2="${y(value)}"/><text x="50" y="${y(value)+4}" text-anchor="end">${value.toFixed(1)}</text>`;}
    svg+=`<line class="target-line" x1="60" x2="${width-30}" y1="${y(95)}" y2="${y(95)}" stroke="#b48231" stroke-width="2" stroke-dasharray="7 5"/><text x="${width-30}" y="${y(95)-10}" text-anchor="end" style="fill:#8a641d;font-weight:700">目標 95kg</text>`;
    svg+='<text x="12" y="17">kg</text>';
    const ticks=mode==='month'?(width<600?[1,10,20,count]:[1,5,10,15,20,25,count]):[1,3,6,9,12];
    for(const tick of [...new Set(ticks)])svg+=`<text x="${x(tick)}" y="280" text-anchor="middle">${tick}${mode==='month'?'日':'月'}</text>`;
    // Connect only adjacent recorded days/months; missing periods stay visibly empty.
    for(let i=1;i<points.length;i++)if(points[i].x===points[i-1].x+1)svg+=`<path class="line" d="M ${x(points[i-1].x)} ${y(points[i-1].kg)} L ${x(points[i].x)} ${y(points[i].kg)}"/>`;
    for(const p of points)svg+=`<circle cx="${x(p.x)}" cy="${y(p.kg)}" r="5"><title>${p.label}: ${kg(p.kg)}${p.count?'（'+p.count+'日）':''}</title></circle>`;
    return svg+'</svg>';
  }
  function render(){
    fillYears();$('month').value=String(month);$('month-control').hidden=mode==='year';
    $('monthly').setAttribute('aria-pressed',String(mode==='month'));$('yearly').setAttribute('aria-pressed',String(mode==='year'));
    $('period-title').textContent=`${year}年${mode==='month'?month+'月':''}`;
    const p=periodData(weights,year,month,mode),last=p.records.at(-1);
    const stats=[['期間内の最新',last?kg(last.kg):'—',last?.date||'記録なし'],['期間内の変化',delta(p.change),p.records.length>1?p.records[0].date+' → '+last.date:'2日以上の記録で比較'],['平均体重',kg(p.average),'記録した日の平均'],['記録日数',p.records.length+'日','未記録の日は集計対象外']];
    $('trend-summary').innerHTML=stats.map(s=>`<div class="trend-stat"><p class="muted">${s[0]}</p><strong>${s[1]}</strong><small>${s[2]}</small></div>`).join('');
    $('chart').innerHTML=chart(p.points);
    $('chart-note').textContent=mode==='month'?'各点はその日の記録です。連続して記録した日のみ線で結んでいます。':'各点は月平均です。記録のある日のみで計算し、連続して記録のある月を線で結んでいます。';
    const monthly=mode==='year'&&p.points.length?`<table class="trend-table"><caption>月別の平均</caption><thead><tr><th scope="col">月</th><th scope="col">平均体重</th><th scope="col">記録日数</th></tr></thead><tbody>${p.points.map(w=>`<tr><th scope="row">${w.x}月</th><td>${kg(w.kg)}</td><td>${w.count}日</td></tr>`).join('')}</tbody></table>`:'';
    const history=M.weightHistory(weights).filter(w=>p.records.some(r=>r.date===w.date));
    $('history').innerHTML=monthly+(history.length?`<table class="trend-table"><caption>日付別の履歴（前回比は期間外も含む直前の記録との比較）</caption><thead><tr><th scope="col">記録日</th><th scope="col">体重</th><th scope="col">前回比</th></tr></thead><tbody>${history.map(w=>`<tr><th scope="row">${w.date}</th><td>${kg(w.kg)}</td><td>${delta(w.difference)}${w.previousDate?`<small class="weight-previous">${w.previousDate} 比</small>`:''}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">この期間の体重記録はありません。</p>');
    $('previous').disabled=year===1900&&(mode==='year'||month===1);$('next').disabled=year===9999&&(mode==='year'||month===12);
  }
  function move(n){if(mode==='year')year+=n;else{month+=n;if(month===0){month=12;year--;}if(month===13){month=1;year++;}}render();}
  async function load(){
    $('refresh-button').disabled=true;$('notice').hidden=false;$('notice').textContent='体重の記録を読み込んでいます…';
    try{const r=await fetch('./data/health-log.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);weights=M.validate(await r.json()).weights;
      if(!loaded&&weights.length){const latest=weights.at(-1).date;year=Number(latest.slice(0,4));month=Number(latest.slice(5,7));}loaded=true;render();$('notice').hidden=true;
    }catch(e){$('notice').textContent='記録を読み込めませんでした。「最新データを再読み込み」で再試行してください。'+(loaded?' 前回読み込んだ記録を表示しています。':'');}
    finally{$('refresh-button').disabled=false;}
  }
  $('monthly').onclick=()=>{mode='month';render();};$('yearly').onclick=()=>{mode='year';render();};
  $('year').onchange=()=>{year=Number($('year').value);render();};$('month').onchange=()=>{month=Number($('month').value);render();};
  $('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);$('refresh-button').onclick=load;
  root.addEventListener('resize',()=>{$('chart').innerHTML=chart(periodData(weights,year,month,mode).points);});
  render();load();
})(globalThis);
