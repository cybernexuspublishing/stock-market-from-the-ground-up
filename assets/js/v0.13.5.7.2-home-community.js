/* v0.13.5.7.2: ONE community counter owner; mounts into the current home hero.
 * The v0.13.2 home redesign replaces <main>, so legacy .hero alone is inadequate. */
(()=>{'use strict';if(!['/','/index.html'].includes(location.pathname.toLowerCase()))return;
const $=s=>document.querySelector(s);let fetching=false,oneTimer=null;
function mount(){const modern=$('#v132-home .v132-home-hero-grid'),legacy=$('main .hero > .wrap');const hero=modern||legacy;if(!hero)return null;
 const existing=$('#v1353-member-stats');if(existing&&existing.parentElement===hero)return existing;
 if(existing)existing.remove();
 const panel=document.createElement('aside');panel.id='v1353-member-stats';panel.className='v1353-member-stats';panel.setAttribute('aria-label','Member statistics');panel.setAttribute('role','status');
 panel.innerHTML='<div class="eyebrow">Our Learning Community</div><h2>Members</h2><div class="v1353-stat-row"><strong data-online>—</strong><span>Members online</span></div><div class="v1353-stat-row"><strong data-registered>—</strong><span>Registered members</span></div><p data-caption class="small">Loading statistics…</p>';
 if(modern){hero.insertBefore(panel,hero.firstElementChild);hero.classList.add('v1358-stats-grid')}else{
  const content=document.createElement('div');content.className='v1353-hero-body';while(hero.firstChild)content.append(hero.firstChild);hero.classList.add('v1353-hero-columns');hero.append(panel,content);
 }
 return panel;
}
async function render(){if(fetching)return;const panel=mount();if(!panel)return;fetching=true;try{
 const r=await fetch('/api/home-member-stats-v01353?action=public',{cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw Error('Member statistics unavailable');
 if(d.show===false){panel.hidden=true;panel.parentElement?.classList.remove('v1358-stat-visible');return}
 panel.hidden=false;panel.parentElement?.classList.add('v1358-stat-visible');
 panel.querySelector('[data-online]').textContent=Number(d.online||0).toLocaleString();panel.querySelector('[data-registered]').textContent=Number(d.registered||0).toLocaleString();
 panel.querySelector('[data-caption]').textContent=d.mode==='custom'?'Owner-configured figures — not live counts.':d.label||'Online estimate: activity in the last five minutes.';
 }catch{panel.querySelector('[data-caption]').textContent='Member statistics currently unavailable.'}finally{fetching=false}
}
function init(){let n=0;const start=setInterval(()=>{if(mount()||++n>=45){clearInterval(start);render()}},200);render();if(!oneTimer)oneTimer=setInterval(()=>{if(!document.hidden)render()},60000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
