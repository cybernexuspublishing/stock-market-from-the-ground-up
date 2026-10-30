/* Crownlight Learning Journey compact progress, Apache ECharts 6.1 (local).
 * Presentation only: no trading data, grading, membership or server mutations.
 */
(function(root){
 'use strict';
 const STAGES=Object.freeze(['Start','Learn','Calculate','Experiment','Predict',
  'Replay / Practice','Assess','Review & Retry','Transfer Challenge','Results']);
 const entries=new Map();
 let latest={index:0,label:STAGES[0],percent:0};
 function write(entry){
  const {container,state}=entry;
  if(container.hidden)return;
  container.querySelector('.gu-learning-progress-stage').textContent=
   'Stage '+(state.index+1)+' of 10 · '+state.label;
  container.querySelector('.gu-learning-progress-percent').textContent=state.percent+'%';
  const fallback=container.querySelector('.gu-learning-progress-fallback');
  fallback.setAttribute('aria-valuenow',String(state.percent));
  fallback.setAttribute('aria-valuetext',state.label+' · stage '+(state.index+1)+' of 10');
  fallback.querySelector('span').style.width=state.percent+'%';
 }
 function draw(entry){
  if(!entry.chart||entry.container.hidden)return;
  const i=entry.state.index;
  entry.chart.setOption({
   animation:false,
   grid:{left:14,right:14,top:4,bottom:4},
   xAxis:{type:'category',boundaryGap:false,data:STAGES,show:false},
   yAxis:{type:'value',min:-1,max:1,show:false},
   tooltip:{show:false},
   series:[
    {type:'line',data:STAGES.map(()=>0),silent:true,symbol:'circle',symbolSize:5,
     lineStyle:{width:3,color:'#476476'},itemStyle:{color:'#547489'}},
    {type:'line',data:STAGES.map((_,idx)=>idx<=i?0:null),silent:true,symbol:'circle',
     symbolSize:7,lineStyle:{width:4,color:'#56d0b2'},itemStyle:{color:'#56d0b2'}},
    {type:'scatter',data:[[i,0]],silent:true,symbol:'circle',symbolSize:13,
     itemStyle:{color:'#f2cb85',borderWidth:2,borderColor:'#092132'}}
   ]
  },true);
  entry.chart.resize();
 }
 function update(detail){
  const index=Number(detail?.index),percentage=Number(detail?.percent);
  if(!Number.isInteger(index)||index<0||index>=STAGES.length)return;
  latest={index,label:STAGES[index],percent:Number.isFinite(percentage)?
   Math.max(0,Math.min(100,Math.round(percentage))):Math.round(index/9*100)};
  for(const entry of entries.values()){entry.state={...latest};write(entry);draw(entry);}
 }
 async function mount(id){
  const container=document.getElementById(id);
  if(!container)return;
  unmount(id);container.hidden=false;
  const entry={container,state:{index:0,label:STAGES[0],percent:0},chart:null,resize:null,active:true};
  latest={...entry.state};entries.set(id,entry);write(entry);
  if(!root.CrownlightECharts?.load)return;
  try{
   const echarts=await root.CrownlightECharts.load();
   if(!entry.active||entries.get(id)!==entry||container.hidden)return;
   const host=container.querySelector('.gu-learning-progress-chart');
   entry.chart=echarts.init(host,null,{renderer:'svg'});
   container.dataset.echarts='ready';draw(entry);
   if(typeof ResizeObserver==='function'){
    entry.resize=new ResizeObserver(()=>{if(entry.active&&entry.chart)entry.chart.resize()});
    entry.resize.observe(host);
   }
  }catch{container.dataset.echarts='unavailable';}
 }
 function reset(id){
  const entry=entries.get(id);if(!entry)return;
  latest={index:0,label:STAGES[0],percent:0};entry.state={...latest};
  write(entry);draw(entry);
 }
 function unmount(id){
  const entry=entries.get(id);if(!entry)return;
  entry.active=false;entry.resize?.disconnect?.();entry.chart?.dispose?.();
  entry.chart=null;entry.container.hidden=true;
  delete entry.container.dataset.echarts;entries.delete(id);
 }
 document.addEventListener('gu-learning-visible-progress',e=>update(e.detail));
 root.CrownlightLearningProgress={mount,reset,unmount,stages:STAGES};
})(window);
