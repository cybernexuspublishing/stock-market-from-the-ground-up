/* v0.13.5.7.3: resilient single-owner member statistics.
 * The existing v0.13.2 homepage replaces <main> asynchronously. Preserve a
 * successful API result across that replacement rather than leaving placeholders.
 * Never invent counts or send authentication information from this public panel. */
(()=>{'use strict';
 if(!['/','/index.html'].includes(location.pathname.toLowerCase()))return;
 if(window.__SMFGUHomeStatsMounted)return;window.__SMFGUHomeStatsMounted=true;
 const $=s=>document.querySelector(s);let inflight=false,snapshot=null,failed=false;
 let observer=null,refreshTimer=null,visual=null,visualNode=null,resizeObserver=null,paintNumber=0;
 function drawActivity(panel,d){
  const host=panel.querySelector('[data-stats-chart]');if(!host||!d||d.show===false)return;
  const total=Number(d.registered),active=Number(d.online),seq=++paintNumber;
  if(!Number.isSafeInteger(total)||!Number.isSafeInteger(active)||total<0||active<0||active>total){
   host.textContent='Member chart unavailable.';return;
  }
  const demo=['custom','range'].includes(d.mode);
  host.setAttribute('aria-label',(demo?'Demo figures: ':'Aggregate member snapshot: ')+active+
    ' active in the preceding 60 minutes of '+total+' registered accounts.');
  const share=total?Math.round(active/total*100):0;
  const percent=panel.querySelector('[data-percent]');if(percent)percent.textContent=total?share+'%':'—';
  const activeBar=panel.querySelector('[data-active-bar]');if(activeBar)activeBar.style.width=share+'%';
  if(!total){
   if(visual&&visualNode===host){visual.dispose();visual=null;visualNode=null}
   host.textContent='No activity to chart yet.';return;
  }
  if(!window.CrownlightECharts?.load){host.textContent='Chart temporarily unavailable';return}
  window.CrownlightECharts.load().then(e=>{
   if(seq!==paintNumber||!host.isConnected)return;
   if(visual&&visualNode!==host){visual.dispose();visual=null;resizeObserver?.disconnect();resizeObserver=null}
   if(!visual){host.replaceChildren();visual=e.init(host,null,{renderer:'svg'});visualNode=host}
   const quiet=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
   const mint=new e.graphic.LinearGradient(0,0,1,1,[{offset:0,color:'#a3f8d7'},{offset:.47,color:'#41cfbb'},{offset:1,color:'#248ac8'}]);
   visual.setOption({
    animation:!quiet,animationDuration:650,backgroundColor:'transparent',
    aria:{enabled:true,description:host.getAttribute('aria-label')},
    tooltip:{show:false},
    title:{text:share+'%',subtext:'LAST 60 MIN',left:'center',top:'34%',
     textStyle:{fontSize:36,fontWeight:800,color:'#f6fbff',textShadowBlur:17,textShadowColor:'#4cd9c866'},
     subtextStyle:{fontSize:11,fontWeight:700,color:'#9ec7da'}},
    series:[
     {type:'pie',silent:true,z:1,radius:['74%','89%'],center:['50%','51%'],
      label:{show:false},itemStyle:{borderWidth:0},data:[{value:1,itemStyle:{color:'#40617a55'}}]},
     {type:'pie',silent:true,z:3,startAngle:90,clockwise:true,
      radius:['65%','78%'],center:['50%','51%'],minAngle:0,
      label:{show:false},labelLine:{show:false},
      data:[{name:'Active in last 60 minutes',value:active,itemStyle:{color:mint,shadowBlur:16,shadowColor:'#55e6c766',borderRadius:6}},
       {name:'Not active in last 60 minutes',value:total-active,itemStyle:{color:'#26465e',borderRadius:6}}]},
     {type:'pie',silent:true,z:2,radius:['93%','94%'],center:['50%','51%'],
      label:{show:false},data:[{value:1,itemStyle:{color:'#426b7f69'}}]}
    ]
   },true);
   visual.resize();
   if(!resizeObserver&&typeof ResizeObserver==='function'){
    resizeObserver=new ResizeObserver(()=>{if(visual&&visualNode?.isConnected)visual.resize()});
    resizeObserver.observe(host);
   }
  }).catch(()=>{if(seq===paintNumber)host.textContent='Chart unavailable; totals remain visible.'});
 }
 function renderFuture(panel,extras){
  const group=panel.querySelector('[data-future-modules]');if(!group)return;
  group.replaceChildren();
  const planned=[
   ['registrationTrends','Registration Trends','Daily registration history','trending-up'],
   ['membershipBreakdown','Membership Breakdown','Verified plan-level aggregates','layers'],
   ['learningEngagement','Learning Engagement','Aggregated instructional activity','graduation-cap']
  ];
  for(const [key,title,source] of planned){
   if(extras?.[key]!==true)continue;
   const article=document.createElement('article');article.className='gu-home-future-card';
   const h=document.createElement('h3');h.textContent=title;
   const detail=document.createElement('p');detail.textContent=source;
   const status=document.createElement('span');status.className='gu-home-future-status';
   status.textContent='Awaiting verified data';
   article.append(h,detail,status);group.append(article);
  }
  group.hidden=!group.childElementCount;
 }
 function mount(){
  const modern=$('#v132-home .v132-home-hero-grid'),premium=$('.gu-premium-home .gu-home-stage-grid'),legacy=$('main .hero > .wrap');
  const hero=premium||modern||legacy;if(!hero)return null;
  const existing=$('#v1353-member-stats');if(existing&&existing.parentElement===hero)return existing;
  if(existing)existing.remove();
  const panel=document.createElement('aside');panel.id='v1353-member-stats';
  panel.className='v1353-member-stats';panel.setAttribute('aria-label','Member statistics');
  panel.setAttribute('role','region');
  panel.innerHTML='<div class="gu-stats-head"><div><span class="eyebrow">OUR LEARNING COMMUNITY</span><h2>Member Statistics</h2></div><span class="gu-stat-mode" data-mode>—</span></div>'+
   '<div class="gu-home-stats-layout"><div class="gu-stats-hero"><div class="v1353-stats-graph" data-stats-chart role="img" aria-label="Member activity"></div>'+
   '<div class="gu-stats-track"><div class="gu-stats-track-head"><span>Activity share</span><strong data-percent>—</strong></div><div class="gu-stats-track-rail"><span data-active-bar></span></div></div></div>'+
   '<div class="gu-stats-metrics"><div class="v1353-stat-row"><span class="gu-stat-label" data-online-label>Active in last hour</span><strong data-online>—</strong><small>Activity in the last 60 minutes</small></div>'+
   '<div class="v1353-stat-row"><span class="gu-stat-label" data-registered-label>Registered members</span><strong data-registered>—</strong><small>Member accounts</small></div>'+
   '<p class="gu-stats-note" data-short-note></p></div></div>'+
   '<div class="gu-home-future-modules" data-future-modules hidden></div>'+
   '<p data-caption class="small" hidden></p>';
  if(premium){hero.append(panel);hero.classList.add('gu-home-member-stats-visible')}
  else if(modern){hero.insertBefore(panel,hero.firstElementChild);hero.classList.add('v1358-stats-grid')}
  else {const content=document.createElement('div');content.className='v1353-hero-body';
   while(hero.firstChild)content.append(hero.firstChild);hero.classList.add('v1353-hero-columns');hero.append(panel,content)}
  paint(panel);return panel;
 }
 function paint(panel){
  if(!panel)return;
  const hero=panel.parentElement;
  if(snapshot){
   const d=snapshot;
   if(d.show===false){panel.hidden=true;hero?.classList.remove('v1358-stat-visible');return}
   panel.hidden=false;hero?.classList.add('v1358-stat-visible');
   const demo=['custom','range'].includes(d.mode);
   panel.querySelector('[data-mode]').textContent=demo?'DEMO DATA':'LIVE DATA';
   panel.querySelector('[data-mode]').dataset.sample=String(demo);
   panel.querySelector('[data-online]').textContent=Number(d.online||0).toLocaleString();
   panel.querySelector('[data-registered]').textContent=Number(d.registered||0).toLocaleString();
   panel.querySelector('[data-online-label]').textContent=demo?'Example activity':'Active in last hour';
   panel.querySelector('[data-registered-label]').textContent=demo?'Example members':'Registered members';
   panel.querySelector('[data-short-note]').textContent=demo?'Sample statistics':'Member activity · past 60 minutes';
   const caption=panel.querySelector('[data-caption]');
   caption.textContent=(typeof d.label==='string'?d.label:'').trim();
   caption.hidden=!caption.textContent;
   caption.classList.toggle('v01414-owner-caption',demo);
   renderFuture(panel,d.extras);
   drawActivity(panel,d);
  }else if(failed){
   panel.querySelector('[data-mode]').textContent='UNAVAILABLE';
   panel.querySelector('[data-short-note]').textContent='Member statistics temporarily unavailable.';
  }
 }

 async function update(){if(inflight)return;const panel=mount();if(!panel)return;inflight=true;
  try{
   const r=await fetch('/api/home-member-stats-v01353?action=public',{cache:'no-store'});
   const d=await r.json();if(!r.ok||!d.ok)throw Error('Member statistics unavailable');
   snapshot=d;failed=false;
  }catch{failed=true}
  finally{inflight=false;paint(mount());if(refreshTimer)clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!document.hidden)update();else{refreshTimer=setTimeout(update,60000)}},Math.max(30000,Math.min(1800000,Number(snapshot?.nextRefreshSeconds||60)*1000)));}
 }
 function sync(){const panel=mount();if(panel&&!snapshot&&!inflight)update()}
 function init(){
  // This observer only re-mounts after a real homepage change; changing counters
  // alone does not trigger it, and the API is never polled by DOM mutations.
  const main=$('main');if(main){observer=new MutationObserver(()=>{
    const modern=$('#v132-home .v132-home-hero-grid'),premium=$('.gu-premium-home .gu-home-stage-grid'),legacy=$('main .hero > .wrap');
    const target=premium||modern||legacy;const panel=$('#v1353-member-stats');
    if(target&&(!panel||panel.parentElement!==target))sync();
  });observer.observe(main,{childList:true,subtree:true})}
  sync();
  let attempts=0;const bootstrap=setInterval(()=>{if(mount()||++attempts>=50){clearInterval(bootstrap);if(!snapshot&&!inflight)update()}},200);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
