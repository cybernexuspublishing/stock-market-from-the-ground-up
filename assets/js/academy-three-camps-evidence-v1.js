/* Original subject-specific Boot Camp evidence: fictional only.
 * Content follows the instructor's current stage; never reveals later observations.
 */
(function(root){'use strict';
const category=v=>/tape|book|venues|timeline|order|depth/.test(v)?'microstructure':/vwap|ema|candle|indicator|volume|moving/.test(v)?'indicators':'filings';
const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
function mount(host,{day,stage}={}){
 const lesson=day?.lesson;
 if(!host||!lesson||lesson.evidenceType!=='FICTIONAL_EDUCATIONAL_DATA_NO_HISTORICAL_LICENSE')return null;
 host.replaceChildren();
 const kind=day.programCode==='filings7'?'filings':day.programCode==='tape10'?'microstructure':day.programCode==='indicators10'?'indicators':category(String(lesson.visual||''));
 const head=element('div',undefined,'academy-evidence-head');
 const label=kind==='microstructure'?'Quote, depth and execution evidence':
  kind==='indicators'?'Indicator calculation and chart evidence':'SEC filing and issuer-source evidence';
 head.append(element('strong',label),element('small','FICTIONAL TEACHING CASE · ONLY CURRENT STAGE'));
 const list=element('ol',undefined,'academy-evidence-sequence');
 const rows=[
  {from:0,title:'Source and definitions',value:lesson.terms},
  {from:2,title:'Worked observation',value:lesson.worked},
  {from:3,title:'Change one input',value:lesson.experiment},
  {from:4,title:'Decision before outcome',value:lesson.predict},
  {from:5,title:'Concealed-future replay instruction',value:lesson.replay},
  {from:7,title:'Reasoning review',value:lesson.review},
  {from:8,title:'Independent transfer challenge',value:lesson.transfer}
 ];
 for(const row of rows){
  if(stage<row.from)continue;
  const li=element('li',undefined,'academy-evidence-event');
  li.append(element('strong',row.title),element('p',row.value));list.append(li);
 }
 const note=element('p','Record only the evidence revealed through this stage. A fictional study example is not a market quote, execution, live feed, or verified historical replay.','academy-evidence-limit');
 host.append(head,list,note);
 if(kind==='microstructure'){
  const concepts=element('div',undefined,'academy-evidence-levels');
  if(/book|venues/.test(lesson.visual)){
   concepts.append(element('span','DISPLAYED BID ≠ EXECUTED BUY'),
    element('span','DISPLAYED OFFER ≠ GUARANTEED FILL'),
    element('span','VENUE / TIME / SIZE MUST MATCH'));
  }else{
   concepts.append(element('span','QUOTE = DISPLAYED INTEREST'),
    element('span','PRINT = REPORTED EXECUTION'),
    element('span','UNKNOWN ROUTING IS NOT PROVEN MOTIVE'));
  }
  host.append(concepts);
 }else if(kind==='indicators'){
  const callout=element('div',undefined,'academy-evidence-levels');
  callout.append(element('span','INPUTS → FORMULA → VALUE'),element('span','COMPLETED OBSERVATIONS ONLY'),element('span','INDICATOR ≠ PRICE FORECAST'));
  host.append(callout);
  if(stage>=2&&stage<=6&&root.CrownlightLearningEChartsV1?.mount){
   const chartHost=element('div',undefined,'academy-evidence-indicator-chart');
   chartHost.setAttribute('aria-label','Supplementary fictional ECharts visualization; mathematical proof remains in the written worked example');
   host.append(chartHost);
   const chart=root.CrownlightLearningEChartsV1.mount(chartHost,{
    kind:/vwap/.test(String(lesson.visual||''))?'vwap':'candle',interactive:true
   });
   return Object.freeze({dispose(){chart?.dispose?.();host.replaceChildren()}});
  }
 }else{
  const callout=element('div',undefined,'academy-evidence-levels');
  callout.append(element('span','FILER IDENTITY'),element('span','PUBLICATION TIME'),element('span','PERIOD & DENOMINATOR'),element('span','UNRESOLVED CONDITIONS'));
  host.append(callout);
 }
 return Object.freeze({dispose(){host.replaceChildren()}});
}
root.GroundUpAcademyEvidenceV1=Object.freeze({mount});
})(typeof window!=='undefined'?window:globalThis);
