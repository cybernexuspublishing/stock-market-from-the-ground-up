/* Crownlight V3: private, read-only research context for Chart Studio.
 * Does not load candles, subscribe to market data, overlay levels on unrelated
 * datasets or mutate simulator/Chart Studio state.
 */
(()=>{'use strict';
 const params=new URL(location.href).searchParams;
 const candidateId=params.get('watchlist_candidate');
 if(!/^[1-9][0-9]{0,15}$/.test(candidateId||'')||
    !Number.isSafeInteger(Number(candidateId)))return;
 const panel=document.createElement('section');
 panel.id='cl-watchlist-chart-handoff-v3';
 panel.className='journal-card journal-section';
 panel.setAttribute('aria-label','Private Watchlist research transferred to Chart Studio');
 const heading=document.createElement('h2');heading.textContent='Watchlist research context';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Verifying your private saved candidate…';
 const detail=document.createElement('div'),list=document.createElement('ul');
 const chart=document.createElement('div');chart.hidden=true;chart.style.cssText='height:230px;min-height:230px;width:100%';
 panel.append(heading,status,detail,list,chart);
 const root=document.getElementById('sim-gate')||document.getElementById('sim-content');
 root?.parentNode?.insertBefore(panel,root);
 if(!root)return;
 let alive=true,uid=null,graph=null;
 function clear(){
  alive=false;
  try{graph?.dispose?.()}catch{}
  graph=null;detail.replaceChildren();list.replaceChildren();chart.replaceChildren();panel.hidden=true;
 }
 function line(label,value){
  const p=document.createElement('p');
  const name=document.createElement('strong');name.textContent=label+': ';
  p.append(name,document.createTextNode(String(value||'Not recorded')));
  detail.append(p);
 }
 async function load(){
  try{
   const sb=await window.getSupabaseClient();
   const session=(await sb.auth.getSession()).data?.session;
   if(!session?.user?.id||!session.access_token)throw Error('Sign in to view your private Watchlist research.');
   uid=session.user.id;
   sb.auth.onAuthStateChange?.((event,s)=>{if(event==='SIGNED_OUT'||s?.user?.id!==uid)clear()});
   const r=await fetch('/api/watchlist-chart-context-v3?candidateId='+encodeURIComponent(candidateId),{
    method:'GET',headers:{authorization:'Bearer '+session.access_token},cache:'no-store',credentials:'same-origin'});
   const data=await r.json().catch(()=>null),now=(await sb.auth.getSession()).data?.session;
   if(!alive||now?.user?.id!==uid)return clear();
   if(!r.ok||data?.ok!==true||data.candidateId!==Number(candidateId))
    throw Error(data?.error||'Saved Watchlist candidate not available.');
   line('Ticker',data.symbol);
   line('Research stage',data.stage);
   line('Source observation',data.asOf);
   line('Research source',data.sourceNote);
   line('Invalidation',data.invalidation);
   line('Archive state',data.archived?'Archived — historical reference only':'Active research');
   status.textContent='Private saved research only. No candle data, verified quotes, orders, or source redistribution rights were transferred. Load an independently permitted dataset to use the chart.';
   for(const ref of data.annotations||[]){
    const item=document.createElement('li');
    item.textContent=ref.kind+' · $'+ref.price+' · '+ref.timeframe+' · '+ref.at+' — '+ref.note;
    list.append(item);
   }
   if(!list.children.length){const li=document.createElement('li');li.textContent='No member-entered annotations saved.';list.append(li)}
   if(data.annotations?.length){
    const E=await window.CrownlightECharts?.load?.();
    if(!alive||!E)return;
    chart.hidden=false;
    graph=E.init(chart,'dark');
    graph.setOption({animation:false,grid:{left:70,right:20,top:22,bottom:65},
     xAxis:{type:'category',data:data.annotations.map(x=>x.at.slice(0,16)),axisLabel:{rotate:30}},
     yAxis:{type:'value',name:'Manual reference (USD)',scale:true},
     series:[{type:'scatter',data:data.annotations.map(x=>x.price),symbolSize:12}],
     tooltip:{trigger:'item'}});
    graph.resize();
   }
  }catch(e){
   if(alive)status.textContent=e?.message||'Private chart research context unavailable.';
  }
 }
 window.addEventListener('pagehide',clear,{once:true});
 void load();
})();