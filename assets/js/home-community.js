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
   host.textContent='Member chart unavailable: invalid totals.';return;
  }
  const demo=['custom','range'].includes(d.mode);
  host.setAttribute('aria-label',(demo?'Illustrative membership example: ':'Aggregate member snapshot: ')+active+
    ' active within the last hour, out of '+total+' registered.');
  panel.querySelector('[data-chart-desc]').textContent=total?
   active.toLocaleString()+' of '+total.toLocaleString()+(demo?' illustrative members are active in the last hour.':
   ' registered members were active in the last hour. Not a simultaneous online count.'):
   'No registered members to chart yet.';
  if(!total){
   if(visual&&visualNode===host){visual.dispose();visual=null;visualNode=null}
   host.textContent='No member activity to visualize yet.';return;
  }
  if(!window.CrownlightECharts?.load){host.textContent='Chart unavailable; exact totals remain visible above.';return}
  window.CrownlightECharts.load().then(e=>{
   if(seq!==paintNumber||!host.isConnected)return;
   if(visual&&visualNode!==host){visual.dispose();visual=null;resizeObserver?.disconnect();resizeObserver=null}
   if(!visual){host.replaceChildren();visual=e.init(host,null,{renderer:'svg'});visualNode=host}
   visual.setOption({animation:false,backgroundColor:'transparent',
    aria:{enabled:true,description:host.getAttribute('aria-label')},tooltip:{show:false},
    title:{text:Math.round(active/total*100)+'%',subtext:'Active in past hour',left:'center',top:'34%',
     textStyle:{fontSize:27,fontWeight:750,color:'#f4f9fc'},subtextStyle:{fontSize:11,color:'#b5d0df'}},
    series:[{type:'pie',silent:true,radius:['66%','88%'],center:['50%','51%'],label:{show:false},
     data:[{name:'Active in past hour',value:active,itemStyle:{color:'#5bd4b1'}},
       {name:'Not active in past hour',value:total-active,itemStyle:{color:'#2b4961'}}]}]
   },true);
   visual.resize();
   if(!resizeObserver&&typeof ResizeObserver==='function'){
    resizeObserver=new ResizeObserver(()=>{if(visual&&visualNode?.isConnected)visual.resize()});
    resizeObserver.observe(host);
   }
  }).catch(()=>{if(seq===paintNumber)host.textContent='Chart unavailable; exact totals remain visible above.'});
 }
 function mount(){
  const modern=$('#v132-home .v132-home-hero-grid'),premium=$('.gu-premium-home .gu-home-message'),legacy=$('main .hero > .wrap');
  const hero=premium||modern||legacy;if(!hero)return null;
  const existing=$('#v1353-member-stats');if(existing&&existing.parentElement===hero)return existing;
  if(existing)existing.remove();
  const panel=document.createElement('aside');panel.id='v1353-member-stats';
  panel.className='v1353-member-stats';panel.setAttribute('aria-label','Member statistics');
  panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
  panel.innerHTML='<div class="eyebrow">Our Learning Community</div><h2>Members</h2>'+
    '<div class="v1353-stat-row"><strong data-online>—</strong><span data-online-label>Online members — active in the last 1 hour</span></div>'+
    '<div class="v1353-stat-row"><strong data-registered>—</strong><span data-registered-label>Registered members</span></div>'+
    '<div class="v1353-stats-graph" data-stats-chart role="img" aria-label="Member activity share"></div>'+ 
    '<p class="v1353-chart-description" data-chart-desc></p>'+ 
    '<p data-caption class="small" hidden></p>';
  if(premium){hero.append(panel);hero.classList.add('gu-home-member-stats-visible')}
  else if(modern){hero.insertBefore(panel,hero.firstElementChild);hero.classList.add('v1358-stats-grid')}
  else {const content=document.createElement('div');content.className='v1353-hero-body';
   while(hero.firstChild)content.append(hero.firstChild);hero.classList.add('v1353-hero-columns');hero.append(panel,content)}
  paint(panel);return panel;
 }
 function paint(panel){if(!panel)return;const hero=panel.parentElement;
  if(snapshot){
   const d=snapshot;if(d.show===false){panel.hidden=true;hero?.classList.remove('v1358-stat-visible');return}
   panel.hidden=false;hero?.classList.add('v1358-stat-visible');
   panel.querySelector('[data-online]').textContent=Number(d.online||0).toLocaleString();
   panel.querySelector('[data-registered]').textContent=Number(d.registered||0).toLocaleString();
   const demo=['custom','range'].includes(d.mode);
   panel.querySelector('[data-online-label]').textContent=demo?'Example active within the last hour':'Active within last hour';
   panel.querySelector('[data-registered-label]').textContent=demo?'Example registered members':'Registered members';
   const caption=panel.querySelector('[data-caption]');
   caption.textContent=(demo?'Illustrative figures only — not actual members. ':'')+
    (typeof d.label==='string'?d.label:'')+(failed?' Showing last successful snapshot.':'');
   caption.hidden=!caption.textContent;caption.classList.toggle('v01414-owner-caption',demo);
   drawActivity(panel,d);
  }else if(failed){panel.querySelector('[data-caption]').textContent='Member statistics temporarily unavailable.';panel.querySelector('[data-caption]').hidden=false}
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
    const modern=$('#v132-home .v132-home-hero-grid'),premium=$('.gu-premium-home .gu-home-message'),legacy=$('main .hero > .wrap');
    const target=premium||modern||legacy;const panel=$('#v1353-member-stats');
    if(target&&(!panel||panel.parentElement!==target))sync();
  });observer.observe(main,{childList:true,subtree:true})}
  sync();
  let attempts=0;const bootstrap=setInterval(()=>{if(mount()||++attempts>=50){clearInterval(bootstrap);if(!snapshot&&!inflight)update()}},200);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
