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
 let snapshot=null,echart=null,loading=null,resize=null;
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
    loading=root.CrownlightECharts.load().then(e=>{
     region.hidden=false;
     echart=e.init(region,null,{renderer:'canvas'});
     resize=new ResizeObserver(()=>echart?.resize());resize.observe(region);
     display();
    }).catch(error=>{status.textContent='Visualization unavailable: '+error.message}).finally(()=>loading=null);
   }
   return;
  }
  display();
 }
 view.addEventListener('change',display);
 root.addEventListener('groundup:admin-summary',onSummary);
 if(root.GroundUpAdminSummarySnapshot)void onSummary({detail:root.GroundUpAdminSummarySnapshot});
 root.CrownlightAdminAnalytics={isReady:()=>!!echart,refresh:()=>void onSummary()};
})(window);
