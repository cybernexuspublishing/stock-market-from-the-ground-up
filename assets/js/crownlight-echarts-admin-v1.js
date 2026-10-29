/* Evidence-based snapshot charts from existing authenticated RBAC dashboard.
 * No fabricated history, and never use numbers from an unverified response.
 */
(function(root){
 'use strict';
 const host=document.getElementById('crownlight-admin-echarts');if(!host)return;
 const status=host.querySelector('[data-admin-echarts-status]'),
  region=host.querySelector('[data-admin-echarts-chart]');
 const view=host.querySelector('[data-admin-echarts-view]');
 const categories=[
  ['users','Registered profiles'],
  ['activeEntitlements','Active access records'],
  ['library','Library records'],
  ['orders','Recorded orders'],
  ['subscriptions','Subscription records'],
  ['catalogProducts','Catalog products'],
  ['publishedContent','Published content']
 ];
 let snapshot=null,echart=null,loading=null,resize=null,epoch=0,memberId=null;
 function clearSnapshot(){
  epoch++;
  snapshot=null;loading=null;
  resize?.disconnect();resize=null;
  echart?.dispose();echart=null;
  region.hidden=true;
  status.textContent='Session changed. Return to Overview to load fresh authorized statistics.';
 }
 function display(){
  if(!echart||!snapshot)return;
  const values=categories.map(([key,label])=>({label,value:snapshot[key]}))
    .filter(x=>Number.isSafeInteger(x.value)&&x.value>=0);
  if(!values.length){echart.clear();status.textContent='No verified summary values available.';return}
  const bar=view.value==='bar';
  const option=bar?{
   grid:{left:165,right:35,top:25,bottom:45},
   tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
   xAxis:{type:'value',axisLabel:{color:'#bfd6e4'}},
   yAxis:{type:'category',data:values.map(x=>x.label),inverse:true,axisLabel:{color:'#bfd6e4'}},
   series:[{name:'Current recorded count',type:'bar',data:values.map(x=>x.value),barWidth:24,
    itemStyle:{color:'#4cb9d9'}}]
  }:{
   tooltip:{trigger:'item',formatter:'{b}: {c} ({d}%)'},
   legend:{type:'scroll',bottom:5,textStyle:{color:'#bcd8e6'}},
   series:[{name:'Current recorded counts',type:'pie',radius:['32%','66%'],center:['50%','45%'],
    label:{color:'#d1e6ee'},data:values.map(x=>({name:x.label,value:x.value}))}]
  };
  echart.setOption({animation:false,backgroundColor:'transparent',
   textStyle:{color:'#ccdfe9'},...option},{notMerge:true});
  const label=snapshot.showcase===true?'SYNTHETIC SHOWCASE — not operational data':'Verified Admin dashboard snapshot';
  status.textContent=label+'. These are counts of different record types, not a time series or revenue report.';
 }
 async function onSummary(event){
  const data=event?.detail||root.GroundUpAdminSummarySnapshot;
  if(!data||typeof data!=='object')return;
  snapshot=data;
  if(!host.closest('.admin-panel.active'))return;
  if(!echart){
   if(!loading){
    const serial=epoch;
    loading=root.CrownlightECharts.load().then(e=>{
     // Reject a pending load if the session changed or panel closed.
     if(serial!==epoch||!snapshot||!host.closest('.admin-panel.active'))return;
     region.hidden=false;
     echart=e.init(region,null,{renderer:'canvas'});
     resize=new ResizeObserver(()=>echart?.resize());resize.observe(region);
     display();
    }).catch(error=>{
     if(serial===epoch)status.textContent='Visualization unavailable: '+error.message
    }).finally(()=>{if(serial===epoch)loading=null});
   }
   return;
  }
  display();
 }
 view.addEventListener('change',display);
 root.addEventListener('groundup:admin-summary',onSummary);
 root.addEventListener('crownlight:member-changed',clearSnapshot);
 // The Admin shell does not load Chart Studio. Guard its own session changes.
 if(typeof root.getSupabaseClient==='function')void root.getSupabaseClient().then(sb=>{
  if(!sb?.auth)return;
  void sb.auth.getSession().then(({data})=>{memberId=data?.session?.user?.id||null}).catch(()=>{});
  sb.auth.onAuthStateChange((event,session)=>{
   const uid=session?.user?.id||null;
   if(event==='SIGNED_OUT'||(memberId&&uid&&uid!==memberId)){
    clearSnapshot();
   }
   if(event==='SIGNED_OUT')memberId=null;
   else if(uid)memberId=uid;
  });
 }).catch(()=>{});

 if(root.GroundUpAdminSummarySnapshot)void onSummary({detail:root.GroundUpAdminSummarySnapshot});
 root.CrownlightAdminAnalytics={isReady:()=>!!echart,refresh:()=>void onSummary(),
  getStatus:()=>({rendered:!!echart,hasSnapshot:!!snapshot})};
})(window);
