/* LAB-UX-STD-001 owner-approved shared visual interactions.
 * Enhances the existing v3.3 visual renderer in place.
 * Reads ONLY the already rendered fictional OHLCV table. No API,
 * hidden future bars, grades or member entitlements are accessed. */
(function(root){
'use strict';
const source=root.GroundUpLabV33Contextual;
if(!source||typeof source.create!=='function'||typeof source.select!=='function')return;
const $=(tag,text,cls)=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=text;
 if(cls)e.className=cls;
 return e;
};
function enhance(view,options){
 const type=options.type;
 if(!view||!['candle','structure','vwap','ema','volume'].includes(type))return view;
 const svg=view.querySelector('svg');
 if(!svg)return view;
 const tools=$('div',undefined,'gu-l33-interactive-tools');
 tools.setAttribute('role','group');
 tools.setAttribute('aria-label','Interactive visual study controls');
 const state=$('p','', 'gu-l33-interactive-state');
 state.setAttribute('role','status');
 const switches=[];
 const button=(name,fn)=>{
  const b=$('button',name,'gu-l33-view-btn');
  b.type='button';b.setAttribute('aria-pressed','false');
  b.addEventListener('click',()=>fn(b));
  tools.append(b);switches.push(b);return b;
 };
 if(type==='candle'){
  // The existing educational figure has one real-body rectangle,
  // one range bracket and wicks. Emphasis never changes numeric values.
  const body=svg.querySelector('rect[x="177"]');
  const range=svg.querySelector('line[x1="115"]');
  const set=mode=>{
   for(const b of switches)b.setAttribute('aria-pressed',String(b.dataset.view===mode));
   if(body)body.style.opacity=mode==='range'?'0.27':'1';
   if(range)range.style.opacity=mode==='body'?'0.27':'1';
   state.textContent=mode==='body'?'Real body: distance between the opening and closing prices.'
    :mode==='range'?'Full range: distance between the highest and lowest prices.'
    :'Full candle: inspect the body, wicks, high, low, open and close.';
  };
  for(const [name,key] of [['Full candle','all'],['Real body','body'],['Full range','range']]){
   const b=button(name,()=>set(key));b.dataset.view=key;
  }
  set('all');
 }else{
  const overlays=Array.from(svg.querySelectorAll('path'));
  const volume=Array.from(svg.querySelectorAll('rect')).filter(x=>x.getAttribute('fill')==='#527dad');
  function set(mode){
   for(const b of switches)b.setAttribute('aria-pressed',String(b.dataset.view===mode));
   overlays.forEach(p=>p.style.display=mode==='volume'?'none':'');
   volume.forEach(p=>p.style.display=mode==='price'?'none':'');
   state.textContent=mode==='price'?'Price and applicable indicator overlays; volume bars hidden.'
    :mode==='volume'?'Volume bars and candles; indicator overlays hidden.'
    :'Price, available indicator overlays, and aligned volume bars.';
  }
  for(const [label,key] of [['Price + indicators','price'],['Price + volume','volume'],['Both','both']]){
   const b=button(label,()=>set(key));b.dataset.view=key;
  }
  set('both');
  const rows=Array.from(view.querySelectorAll('details table tbody tr'));
  if(rows.length){
   const label=$('label','Inspect completed candle ','gu-l33-candle-picker');
   const chooser=$('select');chooser.setAttribute('aria-label','Inspect a completed fictional candle');
   rows.forEach((tr,i)=>{const o=$('option','Candle '+(i+1)+' · '+(tr.cells[0]?.textContent||''));o.value=String(i);chooser.append(o)});
   const detail=$('p','','gu-l33-candle-readout');detail.setAttribute('role','status');
   chooser.addEventListener('change',()=>{
    const row=rows[Number(chooser.value)],cells=Array.from(row?.cells||[]).map(x=>x.textContent);
    detail.textContent=cells.length>=6
     ?'Fictional completed interval '+cells[0]+' — Open '+cells[1]+', High '+cells[2]+
      ', Low '+cells[3]+', Close '+cells[4]+', Volume '+cells[5]+' shares.':'';
   });
   label.append(chooser);tools.append(label,detail);chooser.dispatchEvent(new Event('change'));
  }
 }
 const header=view.querySelector('.gu-l33-head');
 if(header)header.insertAdjacentElement('afterend',tools);
 else view.prepend(tools);
 tools.append(state);
 return view;
}
const upgraded={
 select:source.select,
 create(options={}){
  // Underlying renderer exposes only data already authorized for the
  // current teaching stage. A frozen assessment mode does not call it.
  const view=source.create(options);
  return enhance(view,options);
 },
 version:'LAB-UX-STD-001-v1.1-interactive'
};
root.GroundUpLabV33Contextual=Object.freeze(upgraded);
})(globalThis);
