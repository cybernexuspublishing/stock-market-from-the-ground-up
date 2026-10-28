/* SMFGU Trading Journal V3 — interactive Before / During / After Trade Story.
 * Chart is a PRICE-LEVEL DIAGRAM, NOT historical candles or a time-series plot.
 * Data is from the current authenticated Journal record's original form fields.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id), N='http://www.w3.org/2000/svg';
const el=(tag,txt,klass)=>{const node=document.createElement(tag);if(txt!==undefined)node.textContent=txt;if(klass)node.className=klass;return node};
const ns=(tag,attrs={},text)=>{const n=document.createElementNS(N,tag);for(const [key,v] of Object.entries(attrs))n.setAttribute(key,String(v));if(text!==undefined)n.textContent=text;return n};
const val=id=>$(id)?.value?.trim()||'';
const number=id=>{const s=val(id);if(!s)return null;const n=Number(s);return Number.isFinite(n)&&n>0?n:null};
const currency=n=>n===null?'Not recorded':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(n);
const text=id=>val(id)||'Not recorded';
let stage='before',hasRecord=false;
function build(){
 const content=$('entry-content'),form=$('entry-form');
 if(!content||!form||$('gu-j3-story'))return false;
 const host=el('section',undefined,'gu-j3-panel gu-j3-story');host.id='gu-j3-story';host.setAttribute('aria-label','Visual Trade Story');
 const titleBar=el('div',undefined,'gu-j3-story-head');
 const lhs=el('div'),eyebrow=el('div','Your trade, in three stages','gu-j3-eyebrow');
 const title=el('h2','Visual Trade Story');
 lhs.append(eyebrow,title);
 const tag=el('span','Private member record · Interactive price-level diagram','gu-j3-hint');
 titleBar.append(lhs,tag);
 const grid=el('div',undefined,'gu-j3-story-grid');
 const chart=el('div',undefined,'gu-j3-price-plot');
 const plot=el('div');plot.id='gu-j3-price-content';plot.setAttribute('aria-live','polite');
 const details=el('div',undefined,'gu-j3-story-detail');details.id='gu-j3-story-values';
 const legend=el('p','Shows recorded price levels only, NOT a chronological stock chart, verified fills, or a complete price path.','gu-j3-story-privacy');
 chart.append(plot,details,legend);
 const rail=el('div',undefined,'gu-j3-story-rail');
 const stages=[
  ['before','01','Before the trade','Original plan, decision evidence, invalidation and risk'],
  ['during','02','During the trade','Recorded entry, exit details and execution notes'],
  ['after','03','After the trade','Review, correction and lesson learned']
 ];
 for(const [key,number,title,desc] of stages){
  const card=el('button',undefined,'gu-j3-story-card');card.type='button';card.dataset.stage=key;
  const num=el('span',number,'gu-j3-story-num');
  const label=el('div');label.append(el('strong',title),el('span',desc));card.append(num,label);
  card.addEventListener('click',()=>{stage=key;render()});rail.append(card);
 }
 const link=el('a','Edit and review the full Journal record ↓','gu-j3-story-goto');link.href='#entry-form';rail.append(link);
 grid.append(chart,rail);host.append(titleBar,grid);
 const original=$('plan-lock-state')||form;
 original.before(host);
 return true;
}
function item(title,value){
 const wrap=el('div',undefined,'gu-j3-detail-item');wrap.append(el('span',title),el('strong',String(value)));return wrap;
}
function render(){
 const host=$('gu-j3-story'),chart=$('gu-j3-price-content'),detail=$('gu-j3-story-values');
 if(!host||!chart||!detail)return;
 host.hidden=!hasRecord||$('entry-content')?.hidden===true;
 if(host.hidden)return;
 const type=val('j-decision'),dir=val('j-direction'),p=number('j-planned-entry'),stop=number('j-planned-stop'),
  target=number('j-planned-target'),actualEntry=number('j-actual-entry'),actualExit=number('j-actual-exit'),
  qty=number('j-shares'),closed=['closed','reviewed','no_trade'].includes(
   ($('entry-status-line')?.textContent||'').replace('Status: ','').split(' · ')[0].trim().replace(/ /g,'_').toLowerCase()
  ),locked=!!$('j-planned-entry')?.disabled;
 for(const btn of host.querySelectorAll('.gu-j3-story-card')){
  btn.dataset.active=String(btn.dataset.stage===stage);
  btn.setAttribute('aria-pressed',String(btn.dataset.stage===stage));
 }
 detail.replaceChildren();
 const noTrade=type==='NO TRADE'||type==='OBSERVATION ONLY'||type==='WATCH';
 if(stage==='before'){
  detail.append(item('Recorded decision',type||'Not recorded'),item('Trade direction',dir||'Not recorded'),
   item('Planned size',qty===null?'Not recorded':String(qty)+' shares'),item('Plan status',locked?'Locked original plan':'Draft; not locked'));
 }else if(stage==='during'){
  detail.append(item('Recorded entry',currency(actualEntry)),item('Recorded exit',currency(actualExit)),
   item('Entry time (ET)',text('j-entry-time')),item('Exit time (ET)',text('j-exit-time')));
 }else{
  detail.append(item('Plan followed',text('j-plan-followed')),item('Self-rated process',text('j-process-grade')),
   item('Recorded decision',type||'Not recorded'),item('Status',closed?'Completed or under review':'Not yet completed'));
 }
 const note=stage==='before'?text('j-trigger'):
  stage==='during'?text('j-exit-reason'):
  text('j-lesson');
 const extra=el('div',undefined,'gu-j3-story-privacy');
 extra.append(el('strong',stage==='before'?'Entry trigger: ':stage==='during'?'Exit reasoning: ':'Lesson learned: '),
  document.createTextNode(note.length>240?note.slice(0,237)+'…':note));
 detail.append(extra);
 if(noTrade){
  chart.replaceChildren(el('div',stage==='before'?
   'No-trade or observation record: the decision and supporting evidence are the primary Journal entries. No price chart is inferred.':
   'No executed trade is inferred from an observation. Record why the setup was passed or watched.','gu-j3-no-plot'));
  return;
 }
 if(!['LONG','SHORT'].includes(dir)||p===null||stop===null||
    !(dir==='LONG'?stop<p:stop>p)){
  chart.replaceChildren(el('div','Enter a valid direction, planned entry and stop to display the price-level diagram. Missing information remains unmeasured.','gu-j3-no-plot'));
  return;
 }
 const levels=[
  {value:p,label:'Planned entry',color:'#9CB6F8',dash:'7 4'},
  {value:stop,label:'Planned stop',color:'#F58D9A',dash:'7 4'}
 ];
 if(target!==null&&((dir==='LONG'&&target>p)||(dir==='SHORT'&&target<p)))
  levels.push({value:target,label:'Target',color:'#6CE6B3',dash:'7 4'});
 if(stage!=='before'&&actualEntry!==null)levels.push({value:actualEntry,label:'Actual entry',color:'#F4C77B',dash:'3 3'});
 if(stage==='after'&&actualExit!==null)levels.push({value:actualExit,label:'Recorded exit',color:'#E6B1E4',dash:'3 3'});
 const sorted=levels.map(r=>r.value);
 const lo=Math.min(...sorted),hi=Math.max(...sorted),span=Math.max(.001,hi-lo);
 const min=Math.max(0,lo-span*.23),max=hi+span*.23,range=max-min;
 const y=value=>204-(value-min)/range*159;
 const svg=ns('svg',{viewBox:'0 0 680 246',role:'img','aria-label':'Price-level diagram: '+levels.map(l=>l.label+' '+currency(l.value)).join('; ')});
 svg.append(ns('rect',{x:0,y:0,width:680,height:246,rx:10,fill:'#091725'}));
 for(let i=0;i<5;i++){const height=34+i*43;svg.append(ns('line',{x1:25,y1:height,x2:493,y2:height,stroke:'#274052','stroke-width':.8}))}
 if(stage!=='before'&&actualExit!==null&&actualEntry!==null&&actualExit!==actualEntry){
  const yy=Math.min(y(actualExit),y(actualEntry)),height=Math.abs(y(actualExit)-y(actualEntry));
  const gain=(dir==='LONG'?actualExit-actualEntry:actualEntry-actualExit)>0;
  svg.append(ns('rect',{x:42,y:yy,width:449,height:Math.max(2,height),fill:gain?'#2B8F78':'#B75C72',opacity:.13}));
 }
 for(const level of levels){
  const yy=y(level.value);
  svg.append(ns('line',{x1:30,y1:yy,x2:490,y2:yy,stroke:level.color,'stroke-width':level.label==='Planned entry'?2.5:1.7,'stroke-dasharray':level.dash}));
  svg.append(ns('circle',{cx:490,cy:yy,r:3.8,fill:level.color}));
 }
 // Listing labels separately avoids incorrectly implying chronological movement.
 levels.slice().sort((a,b)=>b.value-a.value).forEach((level,i)=>{
  const x=i>=3?351:25,row=i>=3?i-3:i,ylabel=13+row*13;
  svg.append(ns('circle',{cx:x+3,cy:ylabel,r:3,fill:level.color}));
  svg.append(ns('text',{x:x+12,y:ylabel+3.5,fill:'#c4d6e3','font-size':9.5},level.label+'  '+currency(level.value)));
 });
 svg.append(ns('text',{x:23,y:235,fill:'#90aabf','font-size':11},'PRICE LEVELS ONLY  ·  NO HISTORICAL CANDLES OR TIME AXIS'));
 svg.append(ns('text',{x:531,y:36,fill:'#c9d8e5','font-size':12,'font-weight':700},'LEVEL'));
 svg.append(ns('text',{x:531,y:53,fill:'#86a4b9','font-size':11},'COMPARISON'));
 svg.append(ns('text',{x:531,y:83,fill:'#c9d8e5','font-size':11},dir==='LONG'?'LONG':'SHORT'));
 if(qty!==null)svg.append(ns('text',{x:531,y:103,fill:'#c9d8e5','font-size':11},qty+' shares'));
 if(stage==='before')svg.append(ns('text',{x:531,y:125,fill:'#E9C780','font-size':11},locked?'LOCKED':'DRAFT'));
 chart.replaceChildren(svg);
}
function boot(){
 if(!build())return;
 const root=$('entry-content');
 root.addEventListener('input',render);root.addEventListener('change',render);
 window.addEventListener('gu-journal-record-loaded',()=>{hasRecord=true;render()});
 const ob=new MutationObserver(()=>{
  if(root.hidden){hasRecord=false;$('gu-j3-price-content')?.replaceChildren();$('gu-j3-story-values')?.replaceChildren()}
  render();
 });
 ob.observe(root,{attributes:true,attributeFilter:['hidden']});
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
