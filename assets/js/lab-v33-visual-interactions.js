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
  // All focus targets refer to the SAME fictional candle plotted by the
  // canonical renderer. The current Practice/Transfer answers remain hidden.
  const worked=options.variant==='worked'&&options.stage===1;
  const annotations=Array.from(svg.querySelectorAll('[data-candle-feature]'));
  const descriptions={
   all:'Here is the complete candle. Its body spans Open to Close, and its wicks extend toward High and Low.',
   open:'Open: the first recorded price in the interval. On this worked candle it is $20.00.',
   close:'Close: the last recorded price in the interval. Here it is $21.20, above the opening price.',
   high:'High: the highest recorded price during the interval. Here the high is $22.00.',
   low:'Low: the lowest recorded price during the interval. Here the low is $19.00.',
   body:'Real body = |Close − Open| = |$21.20 − $20.00| = $1.20. Watch the rectangle between the two prices.',
   range:'Full range = High − Low = $22.00 − $19.00 = $3.00. Watch the wick-to-wick bracket.',
   percent:'The real body occupies $1.20 ÷ $3.00 × 100 = 40% of this fictional candle’s full range.'
  };
  const keys=worked?['all','open','close','high','low','body','range','percent']:['all','body','range'];
  const mapping={all:['open','close','high','low','body','range'],body:['body','open','close'],range:['range','high','low'],percent:['body','range','open','close','high','low'],open:['open'],close:['close'],high:['high'],low:['low']};
  let selected='all';
  const set=mode=>{
   selected=mode;
   const selectedFeatures=mapping[mode]||mapping.all;
   for(const btn of switches)btn.setAttribute('aria-pressed',String(btn.dataset.studyFocus===mode));
   for(const item of annotations){
    const part=item.getAttribute('data-candle-feature');
    const matches=selectedFeatures.includes(part);
    item.style.opacity=matches?'1':'0.22';
    if(item.tagName.toLowerCase()==='text')item.style.fontWeight=matches?'800':'400';
   }
   state.textContent=worked?descriptions[mode]:mode==='body'
    ?'The real body connects the two prices Open and Close.'
    :mode==='range'?'Full range connects High and Low.'
    :'The full candle shows Open, High, Low, Close and wicks.';
  };
  const names={all:'Full candle',open:'Open',close:'Close',high:'High',low:'Low',body:'Real body',range:'Full range',percent:'Body percentage'};
  for(const key of keys){
   const b=button(names[key],()=>set(key));
   b.dataset.studyFocus=key;
   b.setAttribute('data-teaching-feature',key);
  }
  if(worked){
   const next=$('button','Next highlight →','gu-l33-view-btn gu-l33-next-teaching');
   next.type='button';next.addEventListener('click',()=>set(keys[(keys.indexOf(selected)+1)%keys.length]));
   tools.append(next);
  }
  set('all');
 }else{
  const overlays=Array.from(svg.querySelectorAll('path, line[stroke="#e0ba76"], text[fill="#eed5a1"]'));
  const volume=Array.from(svg.querySelectorAll('rect')).filter(x=>x.getAttribute('fill')==='#527dad');
  function set(mode){
   for(const b of switches)b.setAttribute('aria-pressed',String(b.dataset.view===mode));
   overlays.forEach(p=>p.style.display=mode==='volume'?'none':'');
   volume.forEach(p=>p.style.display=mode==='price'?'none':'');
   view.querySelectorAll('.gu-l33-legend span').forEach(span=>{
    const label=span.textContent||'';
    const isVolume=label.trim()==='Volume';
    span.style.display=isVolume?(mode==='price'?'none':'')
      :(mode==='volume'?'none':'');
   });
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
   // Use the same indexed completed observation in the chart and the
   // readout. A different candle must never be outlined after selection.
   const plotted=Array.from(svg.querySelectorAll('[data-candle-index]'));
   const applySelection=index=>{
    if(!Number.isInteger(index)||index<0||index>=rows.length||index>=plotted.length)return;
    for(const candle of plotted){
     const selected=Number(candle.getAttribute('data-candle-index'))===index;
     candle.setAttribute('data-selected',String(selected));
     candle.setAttribute('aria-current',String(selected));
     const outline=candle.querySelector('.gu-l33-selected-candle');
     if(outline)outline.setAttribute('visibility',selected?'visible':'hidden');
    }
    for(const volumeBar of svg.querySelectorAll('[data-volume-index]')){
     const selected=Number(volumeBar.getAttribute('data-volume-index'))===index;
     volumeBar.style.stroke=selected?'#f5d575':'';
     volumeBar.style.strokeWidth=selected?'3':'';
    }
    for(const timeLabel of svg.querySelectorAll('[data-time-index]')){
     const selected=Number(timeLabel.getAttribute('data-time-index'))===index;
     timeLabel.style.fill=selected?'#fff2b7':'#bed2e1';
     timeLabel.style.fontWeight=selected?'800':'400';
    }
    svg.setAttribute('data-selected-index',String(index));
    // The chart-side values always describe the SAME selected time/candle.
    const selectedCells=Array.from(rows[index]?.cells||[]).map(cell=>cell.textContent||'');
    const panel=view.querySelector('.gu-l33-chart-reference');
    if(panel&&selectedCells.length>=6){
     const stamp=panel.querySelector('[data-reference-time]');
     if(stamp)stamp.textContent=selectedCells[0]+' ET · Fictional exercise';
     const values={open:selectedCells[1],high:selectedCells[2],low:selectedCells[3],
      close:selectedCells[4],volume:selectedCells[5]+' shares'};
     const total=rows.slice(0,index+1).reduce((acc,row)=>{
      const close=Number(String(row.cells[4]?.textContent||'').replace(/[^0-9.\-]/g,''));
      const volume=Number(String(row.cells[5]?.textContent||'').replace(/[^0-9.\-]/g,''));
      if(Number.isFinite(close)&&Number.isFinite(volume)&&volume>0){
       acc.dollars+=close*volume;acc.shares+=volume;
      }
      return acc;
     },{dollars:0,shares:0});
     if(total.shares>0)values.vwap='
   chooser.addEventListener('change',()=>{
    const index=Number(chooser.value),row=rows[index],cells=Array.from(row?.cells||[]).map(x=>x.textContent);
    applySelection(index);
    detail.textContent=cells.length>=6
     ?'Selected on the chart: '+cells[0]+' ET · Open '+cells[1]+', High '+cells[2]+
      ', Low '+cells[3]+', Close '+cells[4]+', Volume '+cells[5]+' shares (fictional completed candle).':'';
   });
   for(const group of plotted){
    const choose=()=>{
     const index=Number(group.getAttribute('data-candle-index'));
     if(index>=0&&index<rows.length){chooser.value=String(index);chooser.dispatchEvent(new Event('change'));}
    };
    group.addEventListener('click',choose);
    group.addEventListener('keydown',event=>{
     if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}
    });
   }
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
+(total.dollars/total.shares).toFixed(2);
     for(const [name,value] of Object.entries(values)){
      const field=panel.querySelector('[data-reference-field="'+name+'"]');
      if(field)field.textContent=value;
     }
    }
   };
   chooser.addEventListener('change',()=>{
    const index=Number(chooser.value),row=rows[index],cells=Array.from(row?.cells||[]).map(x=>x.textContent);
    applySelection(index);
    detail.textContent=cells.length>=6
     ?'Selected on the chart: '+cells[0]+' ET · Open '+cells[1]+', High '+cells[2]+
      ', Low '+cells[3]+', Close '+cells[4]+', Volume '+cells[5]+' shares (fictional completed candle).':'';
   });
   for(const group of plotted){
    const choose=()=>{
     const index=Number(group.getAttribute('data-candle-index'));
     if(index>=0&&index<rows.length){chooser.value=String(index);chooser.dispatchEvent(new Event('change'));}
    };
    group.addEventListener('click',choose);
    group.addEventListener('keydown',event=>{
     if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}
    });
   }
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
