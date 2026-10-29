/* Premium Journal research quality reporting with explicit denominators.
 * Live member ownership and entitlement checked by /api/journal-research-quality-v1.
 * Does not expose raw private notes or claim source verification.
 */
(()=>{'use strict';
 const root=document.getElementById('journal-research-premium');
 if(!root)return;
 const by=id=>document.getElementById(id);
 const status=by('journal-research-premium-status');
 const metrics=by('journal-research-premium-metrics');
 const source=by('journal-research-premium-source');
 const strategies=by('journal-research-premium-strategies');
 const chartNode=by('journal-research-premium-chart');
 let sb=null,epoch=0,currentId=null,chart=null;
 const clear=()=>{
  epoch++;currentId=null;metrics.replaceChildren();source.replaceChildren();
  strategies.replaceChildren();chart?.dispose();chart=null;chartNode.replaceChildren();
  status.textContent='Research analysis hidden until your member session is verified.';
 };
 const metric=(label,value,host=metrics)=>{
  const box=document.createElement('div');box.className='journal-kpi';
  const strong=document.createElement('strong');strong.textContent=String(value);
  const desc=document.createElement('span');desc.textContent=label;box.append(strong,desc);host.append(box);
 };
 async function load(){
  const seq=++epoch;
  status.textContent='Checking current paid Journal research entitlement…';
  try{
   sb=sb||await window.getSupabaseClient();
   const ses=(await sb.auth.getSession()).data?.session;
   if(!ses?.user?.id||!ses.access_token)throw Error('Sign in to view paid research analysis.');
   const type=by('analytics-type').value,days=by('analytics-window').value;
   const r=await fetch('/api/journal-research-quality-v1?type='+encodeURIComponent(type)+
    '&days='+encodeURIComponent(days),{headers:{authorization:'Bearer '+ses.access_token},cache:'no-store'});
   const data=await r.json().catch(()=>null);
   const now=(await sb.auth.getSession()).data?.session;
   if(seq!==epoch)return;
   if(now?.user?.id!==ses.user.id)throw Error('Member identity changed during analysis.');
   if(!r.ok||data?.ok!==true)throw Error(data?.error||'Private paid research report unavailable.');
   currentId=ses.user.id;
   metrics.replaceChildren();source.replaceChildren();strategies.replaceChildren();
   metric('Journal records examined',data.denominator);
   metric('NO TRADE decisions',data.noTrade);
   metric('NO TRADE share',data.noTradeRate===null?'Not measured':data.noTradeRate+'%');
   metric('Plans locked',data.plansLocked);
   metric('Documented adherence',data.planAdherence.documented+'/'+data.denominator);
   metric('Plan adherence (documented only)',data.planAdherence.rate===null?'Not measured':data.planAdherence.rate+'%');
   for(const [name,value] of Object.entries(data.sourceCoverage)){
    metric(name.replaceAll('_',' ')+' notes present',value.present+' / '+value.denominator,source);
   }
   for(const item of data.byStrategy){
    const el=document.createElement('li');el.textContent=item.name+': '+item.count+' record(s)';
    strategies.append(el);
   }
   if(!data.byStrategy.length){const li=document.createElement('li');li.textContent='No recorded strategies in the selected period.';strategies.append(li)}
   status.textContent=data.denominator+' private member-reported records included. Missing source notes are not evidence of bad process; written notes are not proof of source reliability. No win probability is inferred.';
   chart?.dispose();chart=null;chartNode.replaceChildren();
   try{
    const engine=await window.CrownlightECharts?.load?.();
    if(seq!==epoch||currentId!==ses.user.id||!engine)return;
    chart=engine.init(chartNode,'dark');
    chart.setOption({animation:false,grid:{left:160,right:30,top:14,bottom:28},
     xAxis:{type:'value',min:0,axisLabel:{color:'#d6e0e7'}},
     yAxis:{type:'category',data:data.byType.map(x=>x.name),axisLabel:{color:'#d6e0e7'}},
     tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
     series:[{type:'bar',data:data.byType.map(x=>x.count)}]});
   }catch{/* Numerical representation is primary and sufficient. */}
  }catch(e){
   if(seq!==epoch)return;
   clear();status.textContent=e.message||'Paid research quality analysis unavailable.';
  }
 }
 document.addEventListener('DOMContentLoaded',()=>{
  for(const id of ['analytics-type','analytics-window'])by(id)?.addEventListener('change',()=>void load());
  void (async()=>{
   try{
    sb=await window.getSupabaseClient();
    sb.auth.onAuthStateChange((event,session)=>{
     if(event==='SIGNED_OUT'||(currentId&&session?.user?.id!==currentId))clear();
    });
    await load();
   }catch{clear()}
  })();
 });
 window.addEventListener('pagehide',clear);
})();
