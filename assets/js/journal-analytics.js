let ASTATE={sb:null,user:null,rows:[]};
function avg(vals){const a=vals.filter(v=>Number.isFinite(Number(v))).map(Number);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null}
function grouped(rows,key){const m={};rows.forEach(r=>{const k=(r[key]||'Unspecified').trim?.()||r[key]||'Unspecified';m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])}
function renderList(id,pairs,total){document.getElementById(id).innerHTML=pairs.slice(0,10).map(([k,n])=>`<li><span>${window.JournalTools.esc(k)}</span><strong>${n}${total?` · ${Math.round(n/total*100)}%`:''}</strong></li>`).join('')||'<li><span>No data yet</span><strong>—</strong></li>'}
function filtered(){const type=document.getElementById('analytics-type').value,days=document.getElementById('analytics-window').value;const now=Date.now();return ASTATE.rows.filter(r=>r.status==='closed'&&(type==='all'||r.journal_type===type)&&(days==='all'||(r.trade_date&&now-Date.parse(`${r.trade_date}T12:00:00Z`)<=Number(days)*86400000)))}
function summary(rows){const wins=rows.filter(r=>Number(r.net_pnl)>0),follow=rows.filter(r=>r.plan_followed==='YES').length,badWins=rows.filter(r=>r.process_grade==='BAD'&&Number(r.net_pnl)>0).length;return{n:rows.length,winRate:rows.length?wins.length/rows.length*100:null,avgR:avg(rows.map(r=>r.r_multiple)),planPct:rows.length?follow/rows.length*100:null,badWins,avgMFE:avg(rows.map(r=>r.mfe_r)),avgMAE:avg(rows.map(r=>r.mae_r))}}
function gapCell(label,live,paper,fmt){const JT=window.JournalTools,lv=fmt(live),pv=fmt(paper);return `<tr><th>${JT.esc(label)}</th><td>${JT.esc(lv)}</td><td>${JT.esc(pv)}</td></tr>`}
function renderLivePaperGap(rows){
  const JT=window.JournalTools,live=summary(rows.filter(r=>r.journal_type==='live')),paper=summary(rows.filter(r=>r.journal_type==='paper'));
  const pct=v=>v==null?'—':JT.pct(v),rr=v=>v==null?'—':`${JT.dec(v,2)}R`,n=v=>String(v??0);
  document.getElementById('live-paper-gap').innerHTML=`<div class="journal-table-wrap"><table class="journal-table"><thead><tr><th>Metric</th><th>Live</th><th>Paper / Simulator</th></tr></thead><tbody>${gapCell('Closed trades',live.n,paper.n,n)}${gapCell('Win rate',live.winRate,paper.winRate,pct)}${gapCell('Average R',live.avgR,paper.avgR,rr)}${gapCell('Plan followed',live.planPct,paper.planPct,pct)}${gapCell('Bad-process wins',live.badWins,paper.badWins,n)}${gapCell('Average MFE',live.avgMFE,paper.avgMFE,rr)}${gapCell('Average MAE',live.avgMAE,paper.avgMAE,rr)}</tbody></table></div><p class="journal-small">Do not treat paper performance as a promise of live performance. The purpose of this comparison is to locate a transfer gap that deserves review.</p>`
}
function renderExitMatch(rows){
  const JT=window.JournalTools,eligible=rows.filter(r=>r.planned_exit_reason_category&&r.actual_exit_reason_category),matches=eligible.filter(r=>r.planned_exit_reason_category===r.actual_exit_reason_category),mismatches=eligible.length-matches.length;
  const top={};eligible.filter(r=>r.planned_exit_reason_category!==r.actual_exit_reason_category).forEach(r=>{const k=`${r.planned_exit_reason_category} → ${r.actual_exit_reason_category}`;top[k]=(top[k]||0)+1});
  const common=Object.entries(top).sort((a,b)=>b[1]-a[1])[0];
  const vals=[['Comparable exits',eligible.length],['Exact category match',eligible.length?`${Math.round(matches.length/eligible.length*100)}%`:'—'],['Mismatches',mismatches],['Most common mismatch',common?`${common[0]} (${common[1]})`:'—']];
  document.getElementById('exit-plan-match').innerHTML=vals.map(([a,b])=>`<div class="metric-box"><span>${JT.esc(a)}</span><strong>${JT.esc(b)}</strong></div>`).join('')
}
function render(){
  const JT=window.JournalTools,rows=filtered(),wins=rows.filter(r=>Number(r.net_pnl)>0),net=rows.reduce((s,r)=>s+Number(r.net_pnl||0),0),avgR=avg(rows.map(r=>r.r_multiple)),follow=rows.filter(r=>r.plan_followed==='YES').length,badWins=rows.filter(r=>r.process_grade==='BAD'&&Number(r.net_pnl)>0).length;
  const k=[['Closed trades',rows.length],['Win rate',rows.length?`${Math.round(wins.length/rows.length*100)}%`:'—'],['Net P&L',JT.money(net)],['Average R',avgR==null?'—':`${JT.dec(avgR,2)}R`],['Plan followed',rows.length?`${Math.round(follow/rows.length*100)}%`:'—'],['Bad-process wins',badWins],['Average MFE',avg(rows.map(r=>r.mfe_r))==null?'—':`${JT.dec(avg(rows.map(r=>r.mfe_r)),2)}R`],['Average MAE',avg(rows.map(r=>r.mae_r))==null?'—':`${JT.dec(avg(rows.map(r=>r.mae_r)),2)}R`]];
  document.getElementById('analytics-kpis').innerHTML=k.map(([a,b])=>`<div class="journal-kpi"><strong>${JT.esc(b)}</strong><span>${JT.esc(a)}</span></div>`).join('');
  const cells=[['GOOD','WIN','good-win'],['GOOD','LOSS','good-loss'],['BAD','WIN','bad-win'],['BAD','LOSS','']];
  document.getElementById('process-matrix').innerHTML=cells.map(([p,o,c])=>{const n=rows.filter(r=>r.process_grade===p&&JT.outcome(r)===o).length;const label=p==='BAD'&&o==='WIN'?'Bad Process / Favorable Outcome':`${p[0]+p.slice(1).toLowerCase()} Process / ${o[0]+o.slice(1).toLowerCase()} Outcome`;return `<div class="matrix-cell ${c}"><strong>${n}</strong><div>${JT.esc(label)}</div></div>`}).join('');
  renderList('setup-stats',grouped(rows,'setup'),rows.length);renderList('entry-reason-stats',grouped(rows,'entry_reason_category'),rows.length);renderList('exit-reason-stats',grouped(rows,'actual_exit_reason_category'),rows.length);renderList('session-stats',grouped(rows,'session_label'),rows.length);
  const mistakes={};rows.flatMap(r=>r.mistakes||[]).forEach(x=>mistakes[x]=(mistakes[x]||0)+1);renderList('mistake-stats',Object.entries(mistakes).sort((a,b)=>b[1]-a[1]),rows.length);renderList('plan-stats',grouped(rows,'plan_followed'),rows.length);
  renderLivePaperGap(rows);renderExitMatch(rows);
  const ex=[['Avg MFE in R',avg(rows.map(r=>r.mfe_r))],['Avg MAE in R',avg(rows.map(r=>r.mae_r))],['Avg gross MFE captured %',avg(rows.map(r=>r.mfe_capture_pct))],['Distribution review','Use the raw trade list alongside these averages']];
  document.getElementById('excursion-summary').innerHTML=ex.map(([a,b],i)=>`<div class="metric-box"><span>${JT.esc(a)}</span><strong>${i===0||i===1?(b==null?'—':`${JT.dec(b,2)}R`):i===2?(b==null?'—':JT.pct(b)):JT.esc(b)}</strong></div>`).join('')
}
async function initAnalytics(){
  const gate=document.getElementById('analytics-gate');
  try{
    ASTATE.sb=await window.getSupabaseClient();const {data:{user}}=await ASTATE.sb.auth.getUser();
    if(!user){gate.innerHTML='<div class="notice">Sign in to view journal analytics.</div>';return}
    ASTATE.user=user;const access=window.SiteAccess?await window.SiteAccess.get():{isMember:false};
    if(!access.isMember){gate.innerHTML='<div class="notice"><strong>Full Learning Access feature:</strong> Live/paper analytics are preserved with your journal data but require an active trial or membership to view. <a href="membership.html">View access options</a>.</div>';return}
    const {data,error}=await ASTATE.sb.from('decision_journal').select('*').eq('user_id',user.id).in('journal_type',['live','paper']).order('trade_date',{ascending:false});if(error)throw error;ASTATE.rows=data||[];
    gate.innerHTML='';document.getElementById('analytics-content').hidden=false;['analytics-type','analytics-window'].forEach(id=>document.getElementById(id).addEventListener('change',render));render()
  }catch(err){gate.innerHTML=`<div class="notice">${window.JournalTools.esc(err.message)}</div>`}
}
document.addEventListener('DOMContentLoaded',initAnalytics);
