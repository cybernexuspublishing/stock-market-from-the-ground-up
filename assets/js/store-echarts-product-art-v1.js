/* Store product-facing SVG previews generated with first-party local Apache
 * ECharts. Product-specific scenes; no invented market prices,
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
   const duration=card.querySelector('.catalog-founder-duration')?.textContent||'';
   const match=duration.match(/\b(14|30|60)\s*days?\b/i)||name.match(/\b(14|30|60)[\s-]*day\b/i);
   const days=match?.[1]||(extended?'60':/standard/i.test(name)?'30':'14');
   return {kind:days==='60'?'extended':'founder',name,category:'Founding membership',metric:days+' DAYS',studio:days==='60'?'PROFESSIONAL':days==='30'?'ADVANCED':'STANDARD'};
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


 // These are real Apache ECharts candlesticks, averages and volume bars, not
 // a generic membership graphic. All values are deliberately fictional.
 const sampleA=[
  [48,51,46,53],[51,49,47,54],[49,54,48,55],[54,57,51,59],
  [57,55,53,58],[55,58,54,60],[58,61,57,63],[61,59,56,62],
  [59,64,58,65],[64,67,62,69],[67,65,64,69],[65,68,64,71],
  [68,72,66,74],[72,69,68,73],[69,74,68,76],[74,77,73,79]
 ];
 const sampleB=[
  [72,70,69,74],[70,72,67,74],[72,75,71,77],[75,73,70,77],
  [73,77,72,80],[77,79,75,81],[79,78,76,81],[78,82,77,85],
  [82,80,79,85],[80,84,79,87],[84,83,81,87],[83,85,82,88],
  [85,88,84,90],[88,86,84,90],[86,89,85,91],[89,92,88,94]
 ];
 const studioAvg=(candles,period)=>candles.map((row,i)=>{
  const start=Math.max(0,i-period+1);let sum=0;
  for(let j=start;j<=i;j++)sum+=candles[j][1];
  return +(sum/(i-start+1)).toFixed(2);
 });
 const studioAxis=(index=0)=>({type:'category',gridIndex:index,
  data:sampleA.map((_,i)=>String(i+1)),boundaryGap:true,
  axisTick:{show:false},axisLine:{show:false},axisLabel:{show:false},splitLine:{show:false}});
 const studioValue=(index=0)=>({type:'value',gridIndex:index,scale:true,
  axisLabel:{show:false},axisLine:{show:false},axisTick:{show:false},splitLine:{show:false}});
 const studioCandles=(data,xAxisIndex,yAxisIndex)=>({
  type:'candlestick',name:'Fictional price example',data,xAxisIndex,yAxisIndex,barWidth:'54%',
  itemStyle:{color:'#59d4b2',color0:'#f28d94',borderColor:'#59d4b2',borderColor0:'#f28d94'},
  silent:true,animation:false,emphasis:{disabled:true},z:3
 });
 const studioLine=(data,stroke,xAxisIndex=0,yAxisIndex=0)=>({
  type:'line',name:'Illustrative overlay',data,xAxisIndex,yAxisIndex,
  showSymbol:false,silent:true,animation:false,emphasis:{disabled:true},
  lineStyle:{color:stroke,width:1.6,opacity:.92},z:4
 });
 function foundingStudioOption(metric,w,h){
  const days=String(metric).match(/^(14|30|60) DAYS$/)?.[1]||'14';
  const professional=days==='60',advanced=days==='30';
  const color=professional?'#cfacff':advanced?'#ebc284':'#79dcd5';
  const headline=professional?'PROFESSIONAL':advanced?'ADVANCED':'STANDARD';
  const name=professional?'SYNCHRONIZED WORKSPACE':advanced?'TECHNICAL ANALYSIS':'FOUNDATIONAL TRADING CHARTS';
  const footer=professional?'SYNCED MULTI-CHARTS  •  REPLAY ANALYTICS':
   advanced?'INDICATORS  •  DRAWING TOOLS  •  FIBONACCI':
   'CANDLESTICKS  •  VOLUME  •  EMA / VWAP';
  const tx=(str,left,top,size=11,fill='#d9e9f7',weight=700)=>({
   type:'text',left,top,z:20,silent:true,style:{
    text:str,fill,font:weight+' '+size+'px Arial, sans-serif',
    textAlign:'left',textVerticalAlign:'top'
   }
  });
  const decoration=[
   {type:'rect',shape:{x:0,y:0,width:w,height:h},
    silent:true,z:-1,style:{fill:'#0b1c2d'}},
   {type:'rect',shape:{x:0,y:0,width:5,height:h},
    silent:true,z:10,style:{fill:color}},
   {type:'rect',shape:{x:8,y:52,width:w-16,height:1},
    silent:true,z:10,style:{fill:'rgba(173,205,229,.17)'}},
   {type:'rect',shape:{x:8,y:h-33,width:w-16,height:1},
    silent:true,z:10,style:{fill:'rgba(173,205,229,.17)'}},
   tx('CROWNLIGHT  /  CHART STUDIO',17,12,10,'#a6bdcf',700),
   tx(headline,17,30,17,color,800),
   tx(days+'-DAY ACCESS',Math.max(155,w-120),17,11,'#f0f4fa',750),
   tx(name,17,58,10,'#c0d9e8',650),
   tx(footer,17,h-25,Math.min(9,w/47),'#b9cddd',700),
   tx('ILLUSTRATIVE • NOT MARKET DATA',17,h-10,8,'#7793a8',500)
  ];
  const common={animation:false,backgroundColor:'#0b1c2d',tooltip:{show:false},
   legend:{show:false},aria:{enabled:false},graphic:decoration};
  if(professional){
   const mainH=Math.max(64,h-127);
   common.grid=[
    {left:20,width:'43%',top:91,height:mainH,containLabel:false},
    {right:17,width:'43%',top:91,height:mainH,containLabel:false}
   ];
   common.xAxis=[studioAxis(0),studioAxis(1)];
   common.yAxis=[studioValue(0),studioValue(1)];
   common.series=[
    studioCandles(sampleA,0,0),studioLine(studioAvg(sampleA,5),'#f0cb85',0,0),
    studioCandles(sampleB,1,1),studioLine(studioAvg(sampleB,4),'#cba9ff',1,1)
   ];
   common.graphic.push(tx('01  /  PRICE',20,77,9,'#8fddc6',750),
    tx('02  /  REPLAY',Math.floor(w*.53),77,9,'#d2b8ff',750),
    {type:'line',shape:{x1:w*.505,y1:85,x2:w*.505,y2:h-46},
     silent:true,z:5,style:{stroke:'rgba(173,205,229,.15)',lineWidth:1}});
  }else{
   const priceHeight=Math.max(68,h-143);
   common.grid=[
    {left:19,right:17,top:78,height:priceHeight,containLabel:false},
    {left:19,right:17,top:h-58,height:15,containLabel:false}
   ];
   common.xAxis=[studioAxis(0),studioAxis(1)];
   common.yAxis=[studioValue(0),{type:'value',gridIndex:1,min:0,max:100,show:false}];
   common.series=[
    studioCandles(sampleA,0,0),
    studioLine(studioAvg(sampleA,advanced?4:6),advanced?'#e7c385':'#8bcaec'),
    ...(advanced?[studioLine(studioAvg(sampleA,9),'#b9a4ff')]:[]),
    {type:'bar',name:'Fictional volume',xAxisIndex:1,yAxisIndex:1,silent:true,
     data:[22,36,28,61,42,47,57,32,51,80,58,66,83,57,72,89],
     itemStyle:{color:advanced?'#9d83bf':'#477c91',opacity:.85},barWidth:'58%',animation:false}
   ];
   common.graphic.push(tx(advanced?'EMA  /  VWAP  /  FIB':'EMA 9 / EMA 20 / VWAP',Math.max(155,w-168),58,9,'#b6c9dd',650));
   if(advanced){
    common.graphic.push({type:'line',shape:{x1:28,y1:125,x2:w-22,y2:125},
     silent:true,z:2,style:{stroke:'#d6b87b',lineWidth:1,opacity:.54,lineDash:[5,5]}});
    common.graphic.push(tx('FIB',Math.max(25,w-43),112,8,'#e7c385',650));
   }
  }
  return common;
 }
 function lumenScene(w,h,metric=''){
  const amount=String(metric).match(/^(\d+) LUMENS$/)?.[1]||'';
  const sx=w/360,sy=h/168,a=[];
  const R=(x,y,ww,hh,fill,r=0,extra={})=>a.push(rect(x*sx,y*sy,ww*sx,hh*sy,fill,r*sx,extra));
  const L=(x,y,xx,yy,stroke='#dcbf83',th=1)=>a.push(line(x*sx,y*sy,xx*sx,yy*sy,stroke,th*Math.min(sx,sy)));
  const T=(x,y,value,color='#f8e7be',sz=10,weight=700)=>a.push(label(x*sx,y*sy,value,color,sz*Math.min(sx,sy),weight));
  R(0,0,360,168,'#152332',12);
  R(0,0,360,168,'rgba(116,91,48,.10)',12,{stroke:'rgba(227,192,130,.43)',lineWidth:1});
  R(15,16,38,38,'rgba(227,192,130,.12)',10,{stroke:'#e3c184',lineWidth:1.3});
  T(22,20,'CL','#f6ddb0',17,850);
  T(66,19,'CROWNLIGHT', '#f6e4c0',11,790);
  T(66,35,'LUMEN CREDIT PACKAGE','#c3a977',9,650);
  L(17,64,343,64,'rgba(227,194,136,.3)',1);
  T(18,74,amount||'—','#fff3d4',48,800);
  T(amount.length>2?142:121,100,'LUMENS','#e4bf7e',13,800);
  R(235,79,100,42,'rgba(225,186,120,.055)',8,{stroke:'rgba(225,186,120,.26)',lineWidth:1});
  T(248,88,'DIGITAL','#cfb98e',10,650);
  T(248,103,'CREDITS','#fff2d2',13,800);
  L(17,131,343,131,'rgba(227,194,136,.25)',1);
  T(18,141,'NON-CASH PLATFORM CREDITS','#d8c29e',9,650);
  return a;
 }
 function elements(type,w,h,metric='',productName=''){
  if(type==='founder'||type==='extended')return []; // Dedicated ECharts OHLC/volume rendering.
  if(type==='lumens')return lumenScene(w,h,metric);
  return productScene(sceneFor(productName,type),w,h,productName);
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
  // Put the price and product title ahead of the visual for purchasing clarity.
  // Other tools retain their leading product-scene preview.
  const price=card.classList.contains('catalog-founder-card')?card.querySelector('.catalog-founder-price'):null;
  if(price)price.insertAdjacentElement('afterend',box);
  else{
   const anchor=card.querySelector('.catalog-founder-top');
   if(anchor?.nextSibling)card.insertBefore(box,anchor.nextSibling);
   else card.insertBefore(box,card.firstChild);
  }
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
   const metric=box.dataset.artMetric||'';
   const option=kind==='founder'||kind==='extended'?foundingStudioOption(metric,w,h):
    {animation:false,aria:{enabled:false},tooltip:{show:false},graphic:elements(kind,w,h,metric,box.dataset.artTitle||'')};
   chart.setOption(option,true);
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
 const selectors=[
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
