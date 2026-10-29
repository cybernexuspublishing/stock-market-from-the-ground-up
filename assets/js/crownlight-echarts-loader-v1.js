/* Apache ECharts 6.1.0 loader. Visualization only; lazy loaded and never
 * granted broker, data-provider or educational permissions by this module.
 * Apache ECharts: https://echarts.apache.org/ | Apache License 2.0.
 */
(function(root){
 'use strict';
 const URL='/assets/vendor/echarts/6.1.0/echarts.min.js';
 let pending=null;
 function load(){
  if(root.echarts?.init)return Promise.resolve(root.echarts);
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=URL;script.async=true;
   script.dataset.crownlightEcharts='6.1.0';
   script.onload=()=>root.echarts?.init?resolve(root.echarts):reject(new Error('Local ECharts initialization unavailable'));
   script.onerror=()=>{script.remove();reject(new Error('Local Apache ECharts bundle unavailable. Existing Chart Studio remains available.'))};
   document.head.append(script);
  }).catch(e=>{pending=null;throw e});
  return pending;
 }
 root.CrownlightECharts={load,version:'6.1.0',assetUrl:URL,isLoaded:()=>!!root.echarts?.init};
})(window);
