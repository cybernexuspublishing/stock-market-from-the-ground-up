/* Approved Lab Engine v3.2 learning reference; not an assessment or replay authority.
 * Never ships answers, unrevealed market bars, member grants, or credit balances.
 */
(function(root){
'use strict';
const TYPES=Object.freeze({'F2-C07-L01':'candle','F2-C07-L02':'candle','F3-C06-L01':'vwap'});
const lessons={
 candle:{
  name:'Candlestick construction',definition:'A candlestick records Open (O), High (H), Low (L), and Close (C) for a defined time interval.',
  why:'The real body is the open-to-close distance. Wicks extend to the highest and lowest prices observed in that interval.',
  symbols:'Body = |C − O|; Range = H − L; Body percentage = Body ÷ Range × 100 when Range > 0.',
  steps:['Identify Open, High, Low and Close for the same interval.','Take the absolute difference between Close and Open.','Subtract Low from High to find the full range.','Divide body by the full range and multiply by 100.','Interpret the completed candle with volume, trend, and risk context.'],
  error:'Mistake: subtracting low from high when asked for body; that calculates range instead.',
  limit:'A candle cannot establish buyer identity, intrabar sequence, or what the next candle will do.',
  transfer:'Alternative: Open $12.20, Close $11.70. The body is $0.50 even though the candle closes lower.'
 },
 vwap:{
  name:'Volume-Weighted Average Price',definition:'VWAP is average traded price weighted by the number of shares associated with each price.',
  why:'Prices where more shares trade contribute more strongly than prices with fewer shares.',
  symbols:'VWAP = Σ(price × shares) ÷ Σ(shares); Σ means add all amounts.',
  steps:['Identify each price and its traded share quantity.','Multiply each price by its shares to obtain traded dollars.','Add every traded dollar amount.','Add every traded share count and divide dollars by shares.','Distinguish trade-level VWAP from bar-close-times-volume approximations.'],
  error:'Mistake: using the simple mean of two prices when volumes differ.',
  limit:'VWAP does not signal a guaranteed long entry. Verified no-hindsight replay must disclose observations chronologically from the server.',
  transfer:'Alternative: 150 shares at $12 and 50 at $16 give ($1,800 + $800) ÷ 200 = $13.'
 }
};
function candleMetrics(o,h,l,c){
 if(![o,h,l,c].every(Number.isFinite)||o<=0||h<=0||l<=0||c<=0||h<Math.max(o,c)||l>Math.min(o,c))throw Error('Invalid OHLC');
 const body=Math.abs(c-o),range=h-l;return {body,range,pct:range>0?100*body/range:null};
}
function weightedAverage(groups){
 if(!Array.isArray(groups)||!groups.length||groups.some(g=>!Number.isFinite(g.price)||!Number.isFinite(g.volume)||g.price<=0||g.volume<=0))throw Error('Invalid price and shares');
 const dollars=groups.reduce((a,g)=>a+g.price*g.volume,0),shares=groups.reduce((a,g)=>a+g.volume,0);
 return {dollars,shares,price:dollars/shares};
}
function mount({labId,mode,target}){
 if(!target||typeof target.replaceChildren!=='function')return false;
 const kind=TYPES[labId];if(!kind||!['guided','practice'].includes(mode)){target.replaceChildren();return false}
 const m=lessons[kind],box=document.createElement('section');box.className='card gu-v32';box.setAttribute('aria-label','Lab Engine v3.2 reference teaching');
 const title=document.createElement('h2');title.textContent='Lab Engine v3.2 · '+m.name;box.append(title);
 const scope=document.createElement('p');scope.textContent='Fictional, ungraded teaching example. Official assessment, member access, real chart provenance and replay remain server controlled.';box.append(scope);
 const stages=['Learn','Experiment','Predict','Practice','Transfer'];
 const progress=document.createElement('p'),body=document.createElement('div'),nav=document.createElement('div'),feedback=document.createElement('p');
 progress.className='gu-v32-progress';body.className='gu-v32-body';nav.className='actions';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.className='btn secondary';next.className='btn';prev.textContent='Previous';next.textContent='Next teaching step';
 nav.append(prev,next);box.append(progress,body,feedback,nav);target.replaceChildren(box);
 let stage=0,close=32,volume=100,prediction='',exposed=false;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
 function action(label,fn){const b=el('button',label);b.type='button';b.className='btn secondary';b.addEventListener('click',fn);return b}
 function show(){
  body.replaceChildren();feedback.textContent='';box.dataset.v32Progress=String(stage/5);progress.textContent='Reference teaching '+(stage+1)+' of '+stages.length+' — '+stages[stage];
  body.append(el('h3',stages[stage]));
  if(stage===0){
   body.append(el('p',m.definition),el('p',m.why));
   const details=el('details'),summary=el('summary','Teach this in more depth (free)');
   details.append(summary,el('p',m.symbols));
   const list=el('ol');for(const s of m.steps)list.append(el('li',s));
   details.append(list,el('p',m.error),el('p',m.limit));body.append(details);
  }else if(stage===1){
   body.append(el('p',kind==='candle'?'Move the fictional Close. Open $31.00; High $32.50; Low $30.50.':'Move the second fictional group volume. First group: 200 shares at $8; second group at $10.'));
   const label=el('label',kind==='candle'?'Close price, USD':'Second group shares');
   const slider=el('input');slider.type='range';slider.min=kind==='candle'?'30.5':'50';slider.max=kind==='candle'?'32.5':'500';slider.step=kind==='candle'?'0.05':'50';slider.value=String(kind==='candle'?close:volume);
   label.append(slider);const output=el('output');output.className='gu-v32-output';body.append(label,output);
   const paint=()=>{
    if(kind==='candle'){close=Number(slider.value);const c=candleMetrics(31,32.5,30.5,close);output.textContent='Body $'+c.body.toFixed(2)+' · Range $'+c.range.toFixed(2)+' · Body percentage '+c.pct.toFixed(1)+'%';}
    else{volume=Number(slider.value);const v=weightedAverage([{price:8,volume:200},{price:10,volume}]);output.textContent='Traded dollars $'+v.dollars.toFixed(2)+' · Total shares '+v.shares+' · VWAP $'+v.price.toFixed(2);}
   };slider.addEventListener('input',paint);paint();
  }else if(stage===2){
   body.append(el('p','Before seeing the next example, explain how changing the input affects the result. This reflection stays in the browser and cannot create a grade.'));
   const label=el('label','My prediction and explanation'),entry=el('textarea');entry.rows=3;entry.maxLength=1000;entry.value=prediction;label.append(entry);body.append(label);
   body.append(action('Lock my ungraded prediction',()=>{if(entry.value.trim().length<10){feedback.textContent='Write at least 10 characters of reasoning.';return}prediction=entry.value.trim();entry.disabled=true;feedback.textContent='Prediction saved in this page view only; no assessed credit issued.'}));
  }else if(stage===3){
   body.append(el('p','Explain the formula, calculate the result, and identify what it cannot establish.'));
   body.append(action('Explain the concept (free)',()=>{feedback.textContent=m.steps.join(' ')}));
   body.append(action('Show a worked teaching example',()=>{exposed=true;feedback.textContent='Study Only — ';feedback.textContent+=kind==='candle'?'Fictional $31 open and $32 close: $1 body. $32.50 high and $30.50 low: $2 range, so 50%.':'Fictional 200 shares at $8 and 100 at $10: $2,600 in traded dollars ÷ 300 shares = $8.67.'}));
   if(exposed)feedback.textContent='This worked example is Study Only. It does not reveal a private assessment answer.';
  }else{
   body.append(el('p',m.transfer),el('p','Apply this idea only to observations available at the historical Lab pause. Continue to the existing evidence and authenticated assessment controls.'));
   body.append(action('Focus my Lab decision',()=>document.getElementById('ev-decision')?.focus()));
  }
  prev.disabled=stage===0;next.disabled=stage===stages.length-1;
 }
 prev.addEventListener('click',()=>{if(stage>0){stage--;show()}});
 next.addEventListener('click',()=>{if(stage===2&&!prediction){feedback.textContent='Lock your prediction before continuing.';return}if(stage<stages.length-1){stage++;show()}});
 show();return true;
}
root.GroundUpLabEngineV32=Object.freeze({mount,version:'3.2.0',referenceLabIds:Object.freeze(Object.keys(TYPES)),kindFor:id=>TYPES[id]||null,lessons:Object.freeze(lessons),candleMetrics,weightedAverage});
})(globalThis);
