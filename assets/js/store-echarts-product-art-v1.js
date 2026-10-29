/* Store product-facing vector artwork generated with first-party local Apache
 * ECharts. Illustrative category motifs only: no invented market prices,
 * future candles, trading results, or product entitlement claims.
 * Existing verified book covers are always retained.
 */
(()=>{'use strict';
 const graphics=new Map(),seen=new WeakSet(),waiting=new Set();
 const palette={
  founder:['#64b5ff','#bde5ff'],extended:['#c4a0ff','#e7dbff'],
  lumens:['#f3c970','#ffe7b2'],tool:['#45c8b8','#b2fbef'],
  research:['#6fc7ee','#c3e9fc'],learning:['#8d9cf6','#dee0ff']
 };
 const make=(type,shape,style,extra={})=>({type,shape,style,silent:true,...extra});
 const rect=(x,y,w,h,fill,r=0,extra={})=>make('rect',{x,y,width:w,height:h,r}, {fill,...extra});
 const line=(x1,y1,x2,y2,stroke,width=2,extra={})=>make('line',{x1,y1,x2,y2},{stroke,lineWidth:width,...extra});
 const circle=(cx,cy,r,fill,extra={})=>make('circle',{cx,cy,r},{fill,...extra});
 const poly=(points,fill,stroke,extra={})=>make('polygon',{points},{fill,stroke,lineWidth:2,...extra});
 const path=(points,color,width=3)=>make('polyline',{points},{stroke:color,lineWidth:width,fill:'none',lineJoin:'round',lineCap:'round'});
 const label=(x,y,text,color,size=12,weight=600)=>make('text',null,{text,x,y,fill:color,fontSize:size,fontWeight:weight,fontFamily:'system-ui, sans-serif'});
 const classification=card=>{
  if(card.classList.contains('catalog-founder-card')){
   const extended=card.classList.contains('is-extended');
   const name=card.querySelector('h3')?.textContent||'Founding Membership';
   const match=name.match(/\b(14|30|60)[\s-]*day\b/i);
   return {kind:extended?'extended':'founder',name,category:'Founding membership',metric:match?match[1]+' DAYS':''};
  }
  if(card.classList.contains('store-crownlight-package')){
   const name=card.querySelector('h3')?.textContent||'Lumen bundle';
   const quantity=card.querySelector('.quantity')?.textContent||'';
   const match=quantity.match(/\b([1-9][0-9]{0,5})\s+Crownlight\s+Lumens\b/i);
   return {kind:'lumens',name,category:'Crownlight Lumens',metric:match?match[1]+' LUMENS':''};
  }
  if(card.closest('#store-tools'))return {kind:'tool',name:card.querySelector('h3')?.textContent||'Learning tool',category:'Learning tool'};
  const type=card.closest('.gu-store-type-section')?.querySelector('h3')?.textContent||'';
  if(/book/i.test(type)||card.closest('#store-panel-books'))return null;
  const name=card.querySelector('h4,h3')?.textContent||'Learning product';
  const kind=/research|scanner|data|chart|stock|market/i.test(type+' '+name)?'research':'learning';
  return {kind,name,category:type||'Learning product'};
 };
 function elements(type,w,h,metric='',productName=''){
  const [accent,light]=palette[type]||palette.learning;
  const cy=h*.53,ax=Math.max(58,w*.26),radius=Math.min(39,h*.35),right=w-18;
  const a=[
   circle(w*.13,h*.25,56,'rgba(107,189,243,.06)'),
   circle(w*.83,h*.76,59,'rgba(202,167,244,.055)'),
   rect(12,h-22,w-24,1,'rgba(209,231,249,.18)'),
   label(19,19,type==='founder'||type==='extended'?'FOUNDING MEMBERS':type==='lumens'?'CROWNLIGHT LUMENS':type==='tool'?'LEARNING TOOLS':type==='research'?'RESEARCH & ANALYSIS':'LEARNING PLATFORM','rgba(236,245,255,.7)',10,700),
   line(w*.53,h*.28,w*.91,h*.28,'rgba(173,210,232,.16)',1),
   line(w*.53,h*.53,w*.88,h*.53,'rgba(173,210,232,.12)',1),
   line(w*.53,h*.78,w*.94,h*.78,'rgba(173,210,232,.09)',1)
  ];
  if(type==='founder'||type==='extended'){
   const dx=Math.min(53,w*.145),base=cy+23,top=cy-35;
   a.push(poly([[ax-dx,base-8],[ax-dx*.72,top+10],[ax-dx*.28,cy-4],[ax,top-12],[ax+dx*.30,cy-4],[ax+dx*.74,top+10],[ax+dx,base-8],[ax+dx*.86,base+11],[ax-dx*.88,base+11]],'rgba(17,40,64,.7)',accent,{shadowColor:accent,shadowBlur:11}));
   a.push(line(ax-dx*.73,base,ax+dx*.73,base,light,2));
   for(const x of [ax-dx*.57,ax,ax+dx*.57])a.push(circle(x,cy+5,3,light));
   a.push(label(w*.55,cy-11,metric||'MEMBER ACCESS',light,metric?20:16,800),label(w*.55,cy+14,metric?'RECURRING MEMBERSHIP':'TOOLS · LABS · COMMUNITY','rgba(213,233,255,.67)',10,650));
  }else if(type==='lumens'){
   a.push(circle(ax,cy,radius+9,'rgba(249,202,98,.05)',{stroke:'rgba(255,220,148,.35)',lineWidth:2}));
   a.push(circle(ax,cy,radius,'rgba(247,184,67,.10)',{stroke:accent,lineWidth:3,shadowColor:accent,shadowBlur:15}));
   a.push(poly([[ax,cy-24],[ax+8,cy-8],[ax+24,cy],[ax+8,cy+8],[ax,cy+24],[ax-8,cy+8],[ax-24,cy],[ax-8,cy-8]],accent,light));
   a.push(label(w*.55,cy-9,metric||'LUMEN PACKAGE',light,metric?20:16,800),label(w*.55,cy+16,'NON-CASH PLATFORM CREDITS','rgba(243,232,199,.78)',10,600));
  }else{
   const origin=ax-41;
   if(type==='tool'||type==='research'){
    const prices=[[20,50,17,35],[40,39,18,28],[61,58,15,42],[81,30,18,23]];
    for(const [x,y,ww,hh] of prices){
     a.push(line(origin+x,cy-34+y-19,origin+x,cy-34+y+hh+4,light,1.7));
     a.push(rect(origin+x-ww*.27,cy-34+y,ww*.55,hh,'rgba(78,206,178,.28)',2,{stroke:accent,lineWidth:1.5}));
    }
    a.push(path([[w*.55,cy+24],[w*.64,cy+4],[w*.72,cy+9],[w*.81,cy-16],[w*.91,cy-26]],light,2.8));
    const subject=productName.toUpperCase().replace(/\s+/g,' ').trim();
    a.push(label(w*.55,cy-20,type==='tool'?'PRACTICE & ANALYZE':'INVESTIGATE',light,15,800));
    if(subject)a.push(label(w*.55,cy+41,subject.length>29?subject.slice(0,28)+'…':subject,'rgba(220,242,255,.8)',9,600));
   }else{
    const xpos=ax-32;
    a.push(rect(xpos,cy-25,65,54,'rgba(120,140,242,.11)',8,{stroke:accent,lineWidth:2}));
    a.push(path([[xpos+13,cy+10],[xpos+26,cy-1],[xpos+40,cy+4],[xpos+54,cy-15]],light,3));
    a.push(label(w*.55,cy-10,'LEARN · PRACTICE',light,15,800),label(w*.55,cy+15,'BUILD YOUR SKILLS','rgba(213,233,255,.7)',10,600));
   }
  }
  return a;
 }
 function mount(card){
  const info=classification(card);
  if(!info)return;
  const box=document.createElement('div');
  box.className='gu-echarts-product-art';
  box.setAttribute('role','img');
  box.setAttribute('aria-label','Decorative, illustrative vector artwork for '+info.name+'; not actual market data or a performance claim');
  box.dataset.artKind=info.kind;
  if(info.metric)box.dataset.artMetric=info.metric;
  box.dataset.artTitle=info.name;
  const anchor=card.querySelector('.catalog-founder-top');
  if(anchor?.nextSibling)card.insertBefore(box,anchor.nextSibling);
  else card.insertBefore(box,card.firstChild);
  waiting.add(box);seen.add(card);
  if(observer)observer.observe(box);else void render(box);
 }
 async function render(box){
  if(!box.isConnected||!waiting.has(box))return;
  waiting.delete(box);
  try{
   const echarts=await window.CrownlightECharts.load();
   if(!box.isConnected)return;
   const chart=echarts.init(box,null,{renderer:'svg'});
   graphics.set(box,chart);
   const kind=box.dataset.artKind||'learning';
   const w=Math.max(box.clientWidth,230),h=Math.max(box.clientHeight,125);
   chart.setOption({animation:false,aria:{enabled:false},tooltip:{show:false},graphic:elements(kind,w,h,box.dataset.artMetric||'',box.dataset.artTitle||'')},true);
   box.closest('article')?.classList.add('gu-echart-ready');
  }catch{
   box.classList.add('gu-echart-unavailable');
   // The card's standard illustration or its CSS fallback remains visible.
  }
 }
 const observer='IntersectionObserver' in window?
  new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){
   observer.unobserve(e.target);void render(e.target);
  }},{rootMargin:'180px'}):null;
 const selectors=['#store-founder-plans .catalog-founder-card',
  '#store-panel-sparks .store-crownlight-package',
  '#store-tools .v11-tool-card',
  '#store-panel-current .gu-store-type-card',
  '#store-panel-upcoming .gu-store-type-card'];
 let raf=0;
 function sweep(){
  raf=0;
  for(const [el,chart] of graphics)if(!el.isConnected){chart.dispose();graphics.delete(el)}
  for(const el of document.querySelectorAll(selectors.join(',')))if(!seen.has(el))mount(el);
 }
 function schedule(){if(raf)return;raf=requestAnimationFrame(sweep)}
 const changes=new MutationObserver(schedule);
 function init(){
  const host=document.querySelector('.gu-redesign-store');
  if(!host)return;
  changes.observe(host,{childList:true,subtree:true});
  schedule();
  window.addEventListener('resize',()=>{
   for(const [el,chart] of graphics)if(el.isConnected)chart.resize();
  },{passive:true});
  window.addEventListener('pagehide',()=>{
   changes.disconnect();observer?.disconnect();
   for(const chart of graphics.values())chart.dispose();
   graphics.clear();
  },{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
