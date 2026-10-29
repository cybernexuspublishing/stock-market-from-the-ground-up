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

 // Product artwork is an ECharts SVG miniature of the particular product's
 // workflow, NOT a reusable category icon, a screenshot, or live-market data.
 const sceneFor=(name,kind)=>{
  const n=String(name||'').toLowerCase();
  if(/watch[\s-]*list/.test(n))return 'watchlist';
  if(/trade[\s-]*plan|risk[\s-]*(calculator|builder|management)|position[\s-]*siz/.test(n))return 'plan';
  if(/scanner|screener|stock[\s-]*screen|market[\s-]*scan/.test(n))return 'scanner';
  if(/chart|technical[\s-]*analysis|indicator|vwap|candlestick/.test(n))return 'chart';
  if(/journal|analytics|performance|dashboard|report/.test(n))return 'journal';
  if(/tutor|talia|mentor|coach/.test(n))return 'tutor';
  if(/simulator|replay|historical/.test(n))return 'replay';
  if(/boot[\s-]*camp|lab|academy|lesson|learning|assessment|competenc|skill|course/.test(n))return 'learning';
  if(/data[\s-]*connection|data[\s-]*feed|integration|provider/.test(n))return 'data';
  if(/community|commons|forum/.test(n))return 'community';
  return kind==='tool'?'chart':kind==='research'?'scanner':'learning';
 };
 const shortName=(value,max=30)=>{
  const s=String(value||'').replace(/\s+/g,' ').trim().toUpperCase();
  return s.length>max?s.slice(0,max-1)+'…':s;
 };
 // SVG artwork produced by ECharts graphic elements. Values are deliberately
 // illustrative geometry; no dates, quotes, returns or executable trade signals.
 function productScene(scene,w,h,name){
  const accents={
   watchlist:['#65d4ea','#b7f1fc'],plan:['#d7b275','#fff1bc'],
   scanner:['#73b7fb','#d0e8ff'],chart:['#53c7a9','#a4f9db'],
   journal:['#b3a2fa','#e2dcff'],tutor:['#8ce0b5','#dcffe8'],
   replay:['#f3ac82','#ffe2cd'],learning:['#9daeff','#e1e6ff'],
   data:['#83c9ef','#d6f2ff'],community:['#e8a7ca','#ffe0f0']
  };
  const [accent,light]=accents[scene]||accents.learning;
  const sx=w/340,sy=h/150,a=[];
  const R=(x,y,ww,hh,fill,r=0,extra={})=>a.push(rect(x*sx,y*sy,ww*sx,hh*sy,fill,r*sx,extra));
  const L=(x,y,xx,yy,c=accent,th=2)=>a.push(line(x*sx,y*sy,xx*sx,yy*sy,c,th*Math.min(sx,sy)));
  const C=(x,y,r,c=accent)=>a.push(circle(x*sx,y*sy,r*Math.min(sx,sy),c));
  const P=(p,c=accent,th=2.5)=>a.push(path(p.map(([x,y])=>[x*sx,y*sy]),c,th*Math.min(sx,sy)));
  const T=(x,y,txt,c=light,sz=11,bold=700)=>a.push(label(x*sx,y*sy,txt,c,sz*Math.min(sx,sy),bold));
  R(0,0,340,150,'rgba(9,25,43,.95)',12);
  R(0,0,340,28,'rgba(30,63,89,.72)',10);
  C(15,14,3.1,'#ec8f91');C(26,14,3.1,'#e7c277');C(37,14,3.1,'#80cba7');
  T(49,18,shortName(name,39),'#e6eef9',10,700);
  R(12,139,316,1,'rgba(185,214,239,.19)');
  R(318,10,5,5,accent,2);
  if(scene==='watchlist'){
   T(17,43,'WATCHLIST',accent,10,800);
   T(108,43,'RESEARCH CANDIDATES','#c1d6e5',8,650);
   const rows=['SYMBOL','CATALYST','DECISION'];
   rows.forEach((txt,i)=>T([18,101,238][i],61,txt,'#7f9bb1',8,650));
   const symbols=['AAA','BBB','CCC'],decisions=['WATCH','REVIEW','NO TRADE'];
   for(let i=0;i<3;i++){
    const y=69+i*20;
    R(14,y,312,18,i%2?'rgba(39,69,89,.24)':'rgba(36,76,102,.4)',4);
    C(24,y+8,3.4,[accent,'#f1c987','#d89b9b'][i]);
    T(32,y+12,symbols[i],'#d9eaf5',9,750);
    R(101,y+7,70-i*12,4,'rgba(118,192,208,.48)',3);
    R(238,y+4,80,11,i===2?'rgba(158,75,93,.28)':'rgba(73,145,159,.28)',5);
    T(244,y+12,decisions[i],'#effbff',7,650);
   }
  }else if(scene==='plan'){
   T(17,43,'TRADE PLAN',accent,10,800);
   T(176,43,'RISK FRAMEWORK','#c5d8e7',9,650);
   const terms=['ENTRY CONDITION','INVALIDATION','POSITION SIZE','CANCEL RULE'];
   for(let i=0;i<4;i++){
    const y=52+i*20;
    R(18,y,12,12,'rgba(37,65,83,.85)',3,{stroke:accent,lineWidth:1});
    if(i!==3){L(21,y+6,24,y+9,light,1.6);L(24,y+9,28,y+3,light,1.6)}
    T(38,y+10,terms[i],'#dbe7ef',8,650);
   }
   R(175,53,146,76,'rgba(23,50,67,.78)',8,{stroke:'rgba(210,177,111,.4)',lineWidth:1});
   T(184,65,'TARGET',light,8,700);
   L(185,72,306,72,'#75d3b6',2.5);
   T(184,83,'ENTRY','#dce6f0',8,700);
   L(185,90,306,90,'#84a5c6',2.5);
   T(184,101,'STOP','#f3ab9c',8,700);
   L(185,108,306,108,'#ee9d91',2.5);
   R(185,114,83,5,'rgba(97,203,162,.5)',3);
   R(268,114,38,5,'rgba(236,155,143,.5)',3);
  }else if(scene==='scanner'){
   T(16,43,'SCANNER FILTERS',accent,10,800);
   R(14,50,102,81,'rgba(22,47,68,.88)',7);
   ['VOLUME','PRICE','CATALYST','FLOAT'].forEach((tx,i)=>{
    const y=62+i*17;
    T(22,y,tx,'#b9cfdd',8,650);R(75,y-7,33,5,i===1?'rgba(218,183,117,.82)':accent,3);
   });
   T(132,43,'CANDIDATE RESULTS','#d9eafd',10,750);
   [0,1,2,3].forEach(i=>{
    const y=55+20*i;
    R(132,y,191,17,i%2?'rgba(30,65,86,.65)':'rgba(34,74,102,.53)',4);
    C(143,y+8,3,i===2?'#f2bd81':'#86dfca');
    T(153,y+12,['AAA','BBB','CCC','DDD'][i],'#dceef8',8,700);
    R(191,y+6,38+i*8,4,accent,2);
    R(286,y+6,25-i*4,4,'rgba(198,228,243,.72)',2);
   });
  }else if(scene==='chart'){
   T(16,43,'CHART STUDIO',accent,10,800);
   T(226,43,'PRICE · VOLUME','#a7c4d3',8,700);
   [0,1,2].forEach(i=>L(17,61+i*25,322,61+i*25,'rgba(116,162,185,.20)',1));
   const candles=[39,35,46,30,41,24,26,17,27,15,20,12,19];
   candles.forEach((value,i)=>{
    const x=25+i*21,y=54+value*1.18;
    const up=i%4!==1;
    L(x,y-10,x,y+13,up?'#6ed6ac':'#e6a4a9',1.5);
    R(x-4,y-3,8,10,up?'#6ed6ac':'#e6a4a9',1);
    R(x-5,130-(i%5)*4,10,5+(i%5)*4,'rgba(97,161,195,.5)',1);
   });
   P([[20,108],[65,103],[106,94],[149,88],[191,81],[233,73],[279,65],[319,60]],'#e9c677',2.5);
   T(17,131,'ILLUSTRATIVE CANDLES','#8eafc2',7,650);
  }else if(scene==='journal'){
   T(16,43,'PROCESS JOURNAL',accent,10,800);
   T(194,43,'PLAN VS. ACTUAL','#e0dafa',8,700);
   R(14,52,140,77,'rgba(42,41,82,.5)',7);
   ['PREP','ENTRY','RISK','REVIEW'].forEach((tx,i)=>{
    T(23,65+18*i,tx,'#c1bfd9',8,650);
    R(85,58+18*i,57,6,'rgba(115,112,160,.28)',3);
    R(85,58+18*i,20+i*11,6,i===3?'#d2a1d2':accent,3);
   });
   R(165,52,161,77,'rgba(39,44,85,.4)',7);
   [28,54,39,68,48,60].forEach((hh,i)=>{
    R(175+i*24,119-hh*.65,15,hh*.65,i%2?'#87a4e9':accent,3);
   });
   L(173,119,314,119,'#8ea5bc',1);
  }else if(scene==='tutor'){
   T(16,43,'GUIDED EXPLANATION',accent,10,800);
   R(17,51,208,35,'rgba(31,80,73,.72)',9);
   T(27,66,'WHY DID THIS BREAKOUT FAIL?','#d8fff0',9,700);
   T(27,79,'Review evidence before deciding.','#a8dac6',8,550);
   R(79,94,244,33,'rgba(33,66,83,.86)',9);
   C(92,109,6,accent);
   T(105,107,'OBSERVE · EXPLAIN · RETRY','#e8fff3',9,750);
   T(105,119,'Learn the reasoning, not a signal.','#a9d3bf',8,550);
  }else if(scene==='replay'){
   T(17,43,'HISTORICAL REPLAY',accent,10,800);
   T(206,43,'PRACTICE SCENARIO','#d8c2ad',8,650);
   [20,37,26,44,33,50,45].forEach((val,i)=>{
    const x=40+i*39,y=116-val;
    L(x,y-12,x,y+13,i%3===1?'#e4a39d':'#82dcc1',1.5);
    R(x-6,y-1,12,11,i%3===1?'#e4a39d':'#82dcc1',2);
   });
   L(22,124,317,124,'rgba(186,196,216,.5)',2);
   R(22,122,180,4,accent,3);C(203,124,5,light);
   T(16,136,'◀  ❚❚  ▶  REPLAY',light,9,700);
  }else if(scene==='learning'){
   T(17,43,'LEARNING PATH',accent,10,800);
   const boxes=[['LEARN',17],['PRACTICE',102],['REVIEW',187],['APPLY',272]];
   boxes.forEach(([tx,x],i)=>{
    C(x+17,74,14,i===0?'#7294d9':'rgba(79,91,157,.7)');
    T(x+11,79,String(i+1),'#f6f7ff',11,800);
    T(x,106,tx,'#e2e9ff',8,700);
    if(i<3)L(x+34,74,x+82,74,'rgba(174,190,234,.8)',2);
   });
   T(17,128,'GUIDED SKILLS · INDEPENDENT PRACTICE','#abb7e6',8,600);
  }else if(scene==='data'){
   T(16,43,'DATA CONNECTIONS',accent,10,800);
   const points=[[43,74],[108,58],[108,110],[200,74],[276,54],[276,105]];
   for(const [i,j] of [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]])L(...points[i],...points[j],'rgba(129,210,230,.65)',2);
   points.forEach(([x,y],i)=>{C(x,y,i===3?12:8,i===3?accent:'#638fae');C(x,y,3,light)});
   T(210,131,'AUTHORIZED SOURCES ONLY','#c9ebfa',8,650);
  }else if(scene==='community'){
   T(16,43,'MARKET DISCUSSION',accent,10,800);
   for(let i=0;i<3;i++){
    const y=53+i*25;
    R(18,y,304,21,'rgba(75,42,80,.50)',7);
    C(31,y+10,6,i===1?'#eac08d':accent);
    R(48,y+6,90+i*19,4,'rgba(248,210,238,.6)',2);
    R(48,y+13,182-i*21,3,'rgba(226,172,203,.3)',2);
   }
  }
  T(17,147,'ILLUSTRATIVE PRODUCT PREVIEW','#6688a1',7,600);
  return a;
 }
 function elements(type,w,h,metric='',productName=''){
  if(type!=='founder'&&type!=='extended'&&type!=='lumens')return productScene(sceneFor(productName,type),w,h,productName);
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
  if(!['founder','extended','lumens'].includes(info.kind))box.dataset.artScene=sceneFor(info.name,info.kind);
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
