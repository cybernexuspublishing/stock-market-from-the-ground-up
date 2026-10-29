/* Trading Journal Free research summary: derived only from member-authorized
 * rows already loaded into the existing Journal. No new network/entitlement,
 * no analysis of P&L and no grading or predictions.
 */
(()=>{'use strict';
 const root=document.getElementById('journal-content');if(!root)return;
 const quota=document.getElementById('journal-free-usage');
 const panel=document.createElement('section');panel.className='journal-card journal-section';
 panel.id='journal-research-free';panel.setAttribute('aria-label','Research process overview');
 const head=document.createElement('h2');head.textContent='Research & No-Trade Review';
 const summary=document.createElement('p');summary.className='journal-small';
 summary.textContent='Your basic research summary appears after your private Journal records load.';
 const metrics=document.createElement('div');metrics.className='journal-kpis';
 const note=document.createElement('p');note.className='journal-small';
 const chartRegion=document.createElement('div');chartRegion.style.height='260px';chartRegion.hidden=true;
 const chartButton=document.createElement('button');chartButton.type='button';chartButton.className='btn secondary';
 chartButton.textContent='Visualize recorded decisions with ECharts';
 const paid=document.createElement('p');paid.className='journal-small';
 const link=document.createElement('a');link.href='journal-analytics.html';
 link.textContent='Paid Journal Analytics — deeper performance, plan adherence and research reporting';
 paid.append(link);
 panel.append(head,summary,metrics,note,chartButton,chartRegion,paid);
 (quota?.parentNode||root).insertBefore(panel,quota?quota.nextSibling:root.firstChild);
 let rows=[],partial=false,chart=null,epoch=0;
 const statuses=()=>[
  ['No trade / observation',rows.filter(x=>x.status==='no_trade'||x.decision==='NO TRADE').length],
  ['Draft / planned',rows.filter(x=>['draft','planned'].includes(x.status)).length],
  ['Closed / reviewed',rows.filter(x=>['closed','reviewed'].includes(x.status)&&x.decision!=='NO TRADE').length]
 ];
 const count=(predicate)=>rows.filter(predicate).length;
 function render(){
  metrics.replaceChildren();
  if(!rows.length){summary.textContent='No recorded research yet. You can log a decision to WATCH or NO TRADE without inventing an executed order.';note.textContent='';chartButton.disabled=true;chart?.clear();return}
  const entries=[
   ['Recorded candidates / decisions',rows.length],
   ['NO TRADE observations',count(r=>r.status==='no_trade'||r.decision==='NO TRADE')],
   ['Evidence notes entered',count(r=>typeof r.evidence==='string'&&r.evidence.trim().length>0)],
   ['Written invalidation',count(r=>typeof r.invalidation==='string'&&r.invalidation.trim().length>0)],
   ['Original plans locked',count(r=>!!r.plan_locked_at)]
  ];
  for(const [label,value] of entries){
   const box=document.createElement('div');box.className='journal-kpi';
   const strong=document.createElement('strong');strong.textContent=String(value);
   const title=document.createElement('span');title.textContent=label;
   box.append(strong,title);metrics.append(box);
  }
  summary.textContent='Free research overview from '+rows.length+' loaded personal records'+(partial?' (partial history)':'')+'. Available to Free and Paid Journal members.';
  note.textContent='Evidence and invalidation counts measure whether notes exist—not their truth, completeness or trading quality. These are not independently verified records, financial results or skill scores.'+
   (partial?' Journal history may exceed the current page limit; do not treat these totals as complete.':'');
  chartButton.disabled=false;
  if(chart)draw();
 }
 function draw(){
  if(!chart)return;const data=statuses();
  chart.setOption({animation:false,grid:{top:24,left:175,right:25,bottom:22},
   tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
   xAxis:{type:'value',min:0,axisLabel:{color:'#d6e0e7'}},
   yAxis:{type:'category',data:data.map(x=>x[0]),axisLabel:{color:'#d6e0e7'}},
   series:[{type:'bar',data:data.map(x=>x[1])}]});
  chart.resize();
 }
 chartButton.addEventListener('click',async()=>{
  const sequence=epoch;chartButton.disabled=true;
  try{
   const lib=await window.CrownlightECharts?.load?.();
   if(sequence!==epoch||!lib||!root.hidden===false)return;
   chartRegion.hidden=false;
   chart=chart||lib.init(chartRegion,'dark');
   draw();
  }catch{note.textContent+=' Optional chart unavailable; numeric counts above remain accurate.'}
  finally{chartButton.disabled=!rows.length}
 });
 window.addEventListener('gu-journal-rows-loaded',event=>{
  epoch++;chart?.dispose();chart=null;chartRegion.hidden=true;
  const data=event.detail||{};
  rows=Array.isArray(data.rows)?data.rows.filter(r=>r&&typeof r==='object'):[];
  partial=data.truncated===true;
  render();
 });
 window.addEventListener('pagehide',()=>{epoch++;chart?.dispose();chart=null});
})();
