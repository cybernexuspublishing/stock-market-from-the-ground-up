/* Continuously arranged Simulator preview.
 * The backend decides visibility; ?workspace=continuous is only honored for
 * signed-in OWNER when sitewide rollout is disabled.
 */
(()=>{
 'use strict';
 const modeEndpoint='/api/chart-studio-presentation';
 const content=document.getElementById('sim-content');
 if(!content)return;
 async function init(){
  try{
   const sb=await window.getSupabaseClient();
   const {data}=await sb.auth.getSession();
   if(!data?.session?.access_token)return;
   const requested=new URLSearchParams(location.search).get('workspace');
   const url=modeEndpoint+(requested?'?workspace='+encodeURIComponent(requested):'');
   const r=await fetch(url,{headers:{authorization:'Bearer '+data.session.access_token},cache:'no-store'});
   if(!r.ok)return;
   const j=await r.json();
   if(j.ok!==true||!['classic','continuous'].includes(j.mode))return;
   document.body.dataset.clWorkspace=j.mode;
   if(j.mode==='continuous'){
    const info=document.createElement('div');info.className='cl-workbench-preview-strip';
    info.setAttribute('role','status');
    const label=document.createElement('span');
    label.textContent=j.preview?
     'OWNER PREVIEW · Continuous Trading Workspace · Customer layout remains unchanged':
     'Continuous Trading Workspace · Chart, replay and trade planning in one desk';
    info.append(label);
    if(j.ownerPreview){
     const link=document.createElement('a');
     link.href='simulator.html?workspace=classic';
     link.textContent='Compare classic layout';
     info.append(link);
    }
    // Keep the Owner-preview notice outside the live workbench DOM; the
    // Source > Chart > Trade ordering observer must not reposition it.
    content.before(info);
   }else if(j.ownerPreview){
    const toolbar=document.getElementById('cl-chart-visibility-toolbar');
    if(toolbar&&!toolbar.querySelector('.cl-owner-preview-link')){
     const link=document.createElement('a');
     link.className='cl-owner-preview-link';
     link.href='simulator.html?workspace=continuous';
     link.textContent='Preview continuous workspace';
     link.style.cssText='color:#9bdfff;font-size:.8rem;white-space:nowrap';
     toolbar.append(link);
    }
   }
   requestAnimationFrame(()=>dispatchEvent(new Event('resize')));
  }catch(err){console.warn('Crownlight presentation remains Classic:',err?.message||'configuration unavailable')}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
