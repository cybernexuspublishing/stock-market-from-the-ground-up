/* Owner-visible Apache ECharts installation smoke test.
 * Isolated, synthetic diagnostics only. No trading permissions, real member
 * data, provider credentials, or purchases are accessed by this module.
 */
(()=>{'use strict';
 const box=document.getElementById('admin-external-chart-engine-readiness');
 if(!box)return;
 const run=box.querySelector('[data-ce-engine-test]');
 const label=box.querySelector('[data-ce-engine-test-status]');
 const region=box.querySelector('[data-ce-engine-test-chart]');
 if(!run||!label||!region)return;
 let chart=null,resize=null,busy=false;
 function close(){
  if(resize){resize.disconnect();resize=null}
  if(chart){chart.dispose();chart=null}
  region.hidden=true;run.textContent='Test Apache ECharts renderer';
 }
 run.addEventListener('click',async()=>{
  if(busy)return;
  if(chart){close();label.textContent='Synthetic diagnostic closed. No settings changed.';return}
  busy=true;run.disabled=true;label.textContent='Checking Apache ECharts 6.1.0 renderer…';
  try{
   const lib=await window.CrownlightECharts.load();
   if(!lib||typeof lib.init!=='function')throw Error('Renderer not available');
   region.hidden=false;
   chart=lib.init(region,null,{renderer:'canvas'});
   chart.setOption({
    animation:false,backgroundColor:'transparent',
    textStyle:{color:'#cce4ef'},
    tooltip:{trigger:'axis'},
    grid:{left:40,right:15,top:25,bottom:35},
    xAxis:{type:'category',data:['Lesson 1','Lesson 2','Lesson 3','Lesson 4'],axisLabel:{color:'#bdd3e1'}},
    yAxis:{type:'value',min:0,max:4,interval:1,axisLabel:{color:'#bdd3e1'}},
    series:[{name:'Synthetic sample only',type:'bar',data:[1,3,2,4],itemStyle:{color:'#41bcd8'}}]
   },{notMerge:true});
   resize=new ResizeObserver(()=>chart?.resize());resize.observe(region);
   run.textContent='Close ECharts test';
   label.textContent='Apache ECharts rendered the synthetic diagnostic successfully. This does not verify licensed market data or TradingView.';
  }catch(e){
   close();
   label.textContent='ECharts test unavailable: '+String(e?.message||'Unknown error')+'. Existing chart engines remain unaffected.';
  }finally{busy=false;run.disabled=false}
 });
 window.addEventListener('pagehide',close,{once:true});
})();
