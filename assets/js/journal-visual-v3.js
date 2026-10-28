/* SMFGU Trading Journal V3 — private, professional decision dashboard.
 * Uses already-authorized Journal records; no fictitious chart data,
 * financial-performance aggregation or new free/premium entitlements.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const dayKey=d=>[d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,'0'),String(d.getUTCDate()).padStart(2,'0')].join('-');
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&dayKey(d)===value;
}
const toMonth=d=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));
const monthText=d=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(d);
function counts(rows,asOf){
 const today=dayKey(asOf);const cutoff=new Date(Date.UTC(asOf.getUTCFullYear(),asOf.getUTCMonth(),asOf.getUTCDate()-13));
 const counted=rows.filter(r=>validDate(r.trade_date)&&r.trade_date<=today);
 const recent=counted.filter(r=>new Date(r.trade_date+'T00:00:00Z')>=new Date(Date.UTC(cutoff.getUTCFullYear(),cutoff.getUTCMonth(),cutoff.getUTCDate())));
 return {total:counted.length,completed:counted.filter(r=>['closed','no_trade','reviewed'].includes(r.status)).length,
  passes:counted.filter(r=>r.status==='no_trade'||(['closed','reviewed'].includes(r.status)&&r.decision==='NO TRADE')).length,
  awaiting:counted.filter(r=>!['closed','no_trade','reviewed'].includes(r.status)).length,
  bars:Array.from({length:14},(_,i)=>{
   const d=new Date(Date.UTC(asOf.getUTCFullYear(),asOf.getUTCMonth(),asOf.getUTCDate()-(13-i)));
   return {date:dayKey(d),count:recent.filter(r=>r.trade_date===dayKey(d)).length};
  })};
}
let userId=null,pending=[],rows=[],partial=false,month=toMonth(new Date()),selected=null;
function build(){
 const content=$('journal-content'),anchor=$('journal-free-usage');
 if(!content||!anchor||$('gu-j3-dashboard'))return false;
 const main=$('journal-gate')?.closest('main')?.querySelector('.wrap');
 if(main&&!main.querySelector('.gu-j3-hero')){
  const h=el('div',undefined,'gu-j3-hero');
  const eyebrow=el('div','Crown & Lantern • Professional Journal','gu-j3-eyebrow');
  const title=el('h1','Trading Journal 3.0');
  const desc=el('p','Plan with precision. Document execution. Understand your decisions. Your private trading record, presented clearly from first decision through final review.');
  const chips=el('div',undefined,'gu-j3-chiprow');
  for(const name of ['Original plan preserved','Live / paper / observation','Private evidence','Process-first review']){
   chips.append(el('span',name,'gu-j3-chip'));
  }
  h.append(eyebrow,title,desc,chips);
  const eyebrowOriginal=main.querySelector('.eyebrow'),heading=main.querySelector('h1'),subtitle=main.querySelector('.journal-subtitle');
  eyebrowOriginal?.remove();heading?.remove();subtitle?.remove();
  main.insertBefore(h,$('journal-gate'));
 }
 const dashboard=el('section',undefined,'gu-j3-shell');
 dashboard.id='gu-j3-dashboard';dashboard.setAttribute('aria-label','Personal Journal visual overview');
 const overview=el('div',undefined,'gu-j3-panel');
 const heading=el('div',undefined,'gu-j3-panel-heading');
 heading.append(el('h2','Your Decision Overview'),el('span','Member-recorded data','gu-j3-hint'));
 const kpis=el('div',undefined,'gu-j3-kpis');kpis.id='gu-j3-kpis';
 const barTitle=el('div','RECORDS BY DAY · LAST 14 DAYS','gu-j3-stat-title');
 barTitle.style.marginTop='22px';
 const bars=el('div',undefined,'gu-j3-bars');bars.id='gu-j3-bars';
 bars.setAttribute('role','img');bars.setAttribute('aria-label','Member Journal records per day over the last fourteen days');
 const foot=el('div',undefined,'gu-j3-bar-foot');foot.append(el('span','13 days ago'),el('span','Today'));
 const note=el('p','Activity counts reflect your own recorded decisions, not broker-verified trades or premium P&L analytics. No-trade decisions count as documented process.','gu-j3-note');
 overview.append(heading,kpis,barTitle,bars,foot,note);
 const calendar=el('div',undefined,'gu-j3-panel');
 const header=el('div',undefined,'gu-j3-panel-heading');
 header.append(el('h2','Trading Calendar'),el('span','Select a date','gu-j3-hint'));
 const ctrl=el('div',undefined,'gu-j3-calendar-controls');
 const prev=el('button','‹');prev.type='button';prev.id='gu-j3-prev';prev.setAttribute('aria-label','Previous calendar month');
 const label=el('strong');label.id='gu-j3-month';
 const next=el('button','›');next.type='button';next.id='gu-j3-next';next.setAttribute('aria-label','Next calendar month');
 ctrl.append(prev,label,next);
 const dates=el('div',undefined,'gu-j3-calendar');dates.id='gu-j3-calendar';
 const detail=el('div',undefined,'gu-j3-date-detail');detail.id='gu-j3-date-detail';detail.setAttribute('aria-live','polite');
 const legend=el('div',undefined,'gu-j3-legend');
 for(const title of ['Recorded decisions','No-trade only','Mixed activities'])legend.append(el('span',title));
 const caption=el('p','Calendar shading describes activity type, never profitability. A blank day does not imply a loss.','gu-j3-note');
 calendar.append(header,ctrl,dates,detail,legend,caption);
 dashboard.append(overview,calendar);
 anchor.after(dashboard);
 const sections=content.querySelector('.journal-section');
 if(sections)sections.classList.add('gu-j3-records');
 prev.addEventListener('click',()=>{month=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1));selected=null;render()});
 next.addEventListener('click',()=>{month=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1));selected=null;render()});
 return true;
}
function render(){
 if(!$('gu-j3-dashboard'))return;
 const panel=$('gu-j3-dashboard');
 if(!userId){panel.hidden=true;return}
 panel.hidden=false;
 const now=new Date(),stats=counts(rows,now),kpis=$('gu-j3-kpis');
 kpis.replaceChildren();
 for(const [title,value] of [['Total records',stats.total],['Completed',stats.completed],['No-trade decisions',stats.passes],['Awaiting review',stats.awaiting]]){
  const card=el('div',undefined,'gu-j3-kpi');
  card.append(el('strong',String(value)),el('span',title));kpis.append(card);
 }
 const graph=$('gu-j3-bars');graph.replaceChildren();
 const highest=Math.max(1,...stats.bars.map(r=>r.count));
 for(const item of stats.bars){
  const bar=el('div',undefined,'gu-j3-bar'+(!item.count?' gu-j3-bar-zero':''));
  bar.style.height=item.count?(6+item.count/highest*77)+'px':'2px';
  bar.title=item.date+': '+item.count+' Journal record'+(item.count===1?'':'s');
  graph.append(bar);
 }
 graph.setAttribute('aria-label','Last 14 days: '+stats.bars.map(item=>item.date+' '+item.count).join('; '));
 $('gu-j3-month').textContent=monthText(month);
 const first=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1));
 const offset=(first.getUTCDay()+6)%7;
 const last=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
 const dates=$('gu-j3-calendar');dates.replaceChildren();
 for(const s of ['M','T','W','T','F','S','S'])dates.append(el('div',s,'gu-j3-cal-week'));
 for(let ix=0;ix<Math.ceil((last+offset)/7)*7;ix++){
  const day=ix-offset+1;
  if(day<1||day>last){const blank=el('div');blank.setAttribute('aria-hidden','true');dates.append(blank);continue}
  const date=dayKey(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),day)));
  const included=rows.filter(r=>validDate(r.trade_date)&&r.trade_date===date);
  const btn=el('button',undefined,'gu-j3-day');btn.type='button';
  btn.append(el('span',String(day)));btn.dataset.count=String(included.length);
  const pass=included.filter(r=>r.status==='no_trade'||(['closed','reviewed'].includes(r.status)&&r.decision==='NO TRADE')).length;
  if(included.length)btn.dataset.kind=pass===included.length?'no_trade':pass?'mixed':'recorded';
  if(included.length)btn.append(el('strong',String(included.length)));
  btn.setAttribute('aria-pressed',selected===date?'true':'false');
  btn.setAttribute('aria-label',date+', '+included.length+' Journal record'+(included.length===1?'':'s'));
  btn.addEventListener('click',()=>{selected=date;renderDetail();dates.querySelectorAll('[aria-pressed]').forEach(n=>n.setAttribute('aria-pressed',String(n===btn)))});
  dates.append(btn);
 }
 const futureMax=toMonth(new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+2,1)));
 $('gu-j3-next').disabled=month>=futureMax;
 renderDetail();
 const note=$('gu-j3-coverage');
 if(note)note.textContent=partial?'History may be incomplete: the current list reached its 3,000-record safety limit.':'';
}
function renderDetail(){
 const dest=$('gu-j3-date-detail');if(!dest)return;
 dest.replaceChildren();
 if(!selected){dest.append(el('p','Select a calendar day to open the records saved for that date.'));return}
 const found=rows.filter(r=>r.trade_date===selected);
 dest.append(el('strong',selected+' · '+found.length+' record'+(found.length===1?'':'s')));
 if(!found.length){dest.append(el('p','No Journal records dated this day.'));return}
 const list=el('ul');list.style.paddingLeft='18px';list.style.margin='6px 0';
 for(const r of found.slice(0,9)){
  const item=el('li');
  const a=el('a',(r.ticker||'Untitled')+' · '+(r.setup||r.status||'Record'));
  a.href='journal-entry.html?id='+encodeURIComponent(String(r.id));
  item.append(a);list.append(item);
 }
 dest.append(list);
 if(found.length>9)dest.append(el('p','Showing 9 of '+found.length+' records. Open the Journal list below for the full selection.','gu-j3-note'));
}
function boot(){
 if(!build())return;
 const coverage=el('p','','gu-j3-note');coverage.id='gu-j3-coverage';
 $('gu-j3-dashboard').firstChild.append(coverage);
 window.addEventListener('gu-journal-rows-loaded',event=>{
  pending=Array.isArray(event.detail?.rows)?event.detail.rows:[];
  partial=event.detail?.truncated===true;
  rows=userId?pending.filter(r=>r.user_id===userId):[];
  render();
 });
 window.getSupabaseClient().then(async sb=>{
  const result=await sb.auth.getUser();
  userId=result.data?.user?.id||null;
  rows=userId?pending.filter(r=>r.user_id===userId):[];
  render();
  sb.auth.onAuthStateChange((_event,session)=>{
   if(session?.user?.id!==userId){
    userId=null;rows=[];pending=[];partial=false;selected=null;
    $('gu-j3-kpis')?.replaceChildren();$('gu-j3-calendar')?.replaceChildren();
    render();
   }
  });
 }).catch(()=>{userId=null;rows=[];render()});
}
window.JournalV3Visual=Object.freeze({validDate,counts,dayKey,toMonth});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
