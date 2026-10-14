/* v0.13.5.7.3: resilient single-owner member statistics.
 * The existing v0.13.2 homepage replaces <main> asynchronously. Preserve a
 * successful API result across that replacement rather than leaving placeholders.
 * Never invent counts or send authentication information from this public panel. */
(()=>{'use strict';
 if(!['/','/index.html'].includes(location.pathname.toLowerCase()))return;
 const $=s=>document.querySelector(s);let inflight=false,snapshot=null,failed=false;
 let observer=null,refreshTimer=null;
 function mount(){
  const modern=$('#v132-home .v132-home-hero-grid'),legacy=$('main .hero > .wrap');
  const hero=modern||legacy;if(!hero)return null;
  const existing=$('#v1353-member-stats');if(existing&&existing.parentElement===hero)return existing;
  if(existing)existing.remove();
  const panel=document.createElement('aside');panel.id='v1353-member-stats';
  panel.className='v1353-member-stats';panel.setAttribute('aria-label','Member statistics');
  panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
  panel.innerHTML='<div class="eyebrow">Our Learning Community</div><h2>Members</h2>'+
    '<div class="v1353-stat-row"><strong data-online>—</strong><span data-online-label>Online members — active in the last 1 hour</span></div>'+
    '<div class="v1353-stat-row"><strong data-registered>—</strong><span data-registered-label>Registered members</span></div>'+
    '<p data-caption class="small">Loading statistics…</p>';
  if(modern){hero.insertBefore(panel,hero.firstElementChild);hero.classList.add('v1358-stats-grid')}
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
   const demo=['custom','range'].includes(d.mode);panel.querySelector('[data-online-label]').textContent=demo?'Example online members':'Online members — active in the last 1 hour';panel.querySelector('[data-registered-label]').textContent=demo?'Example registered members':'Registered members';
   panel.querySelector('[data-caption]').textContent=demo?'Demo':(d.label||'Approximate activity, last 1 hour');
   panel.querySelector('[data-caption]').classList.toggle('v01411-demo-tag',['custom','range'].includes(d.mode));
  }else if(failed){panel.querySelector('[data-caption]').textContent='Member statistics temporarily unavailable.'}
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
    const modern=$('#v132-home .v132-home-hero-grid'),legacy=$('main .hero > .wrap');
    const target=modern||legacy;const panel=$('#v1353-member-stats');
    if(target&&(!panel||panel.parentElement!==target))sync();
  });observer.observe(main,{childList:true,subtree:true})}
  sync();
  let attempts=0;const bootstrap=setInterval(()=>{if(mount()||++attempts>=50){clearInterval(bootstrap);if(!snapshot&&!inflight)update()}},200);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
