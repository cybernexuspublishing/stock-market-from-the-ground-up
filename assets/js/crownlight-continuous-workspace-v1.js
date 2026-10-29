/* Verified page presentation with an instant, Owner-only style comparison bar.
 * Change of select is a local preview only: never changes Supabase, entitlements,
 * trading state, customer settings or another member's page.
 */
(()=>{'use strict';
 const page=location.pathname.split('/').pop()||'index.html';
 const MODES=['classic','continuous','focus','compact','spacious','list','table'];
 const names={classic:'Original',continuous:'Continuous Desk',focus:'Focused',compact:'Compact',spacious:'Spacious',list:'Clean List',table:'Directory'};
 let lastVerified=null;
 const qs=new URLSearchParams(location.search);
 function apply(mode){
  if(!MODES.includes(mode))return;
  document.body.dataset.clWorkspace=mode;
  document.body.dataset.clWorkspacePage=page;
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 }
 function ownerBar(info){
  document.querySelectorAll('.cl-page-style-livebar,.cl-page-workspace-notice').forEach(x=>x.remove());
  const bar=document.createElement('div');bar.className='cl-page-style-livebar';
  bar.dataset.clStylePreview='owner';bar.setAttribute('role','region');
  bar.setAttribute('aria-label','Owner page style preview');
  const title=document.createElement('strong');title.textContent='OWNER · Page Style Preview';
  const label=document.createElement('label');label.textContent='Layout';
  const control=document.createElement('select');control.setAttribute('aria-label','Preview page layout instantly');
  control.dataset.clLiveStyle='';
  for(const id of MODES){
   const opt=document.createElement('option');opt.value=id;opt.textContent=names[id];control.append(opt);
  }
  const detail=document.createElement('span');detail.className='cl-style-live-status';
  detail.setAttribute('role','status');detail.setAttribute('aria-live','polite');
  const back=document.createElement('a');back.href='/admin.html#settings';back.textContent='Save styles in Admin';
  label.append(control);
  bar.append(title,label,detail,back);
  const describe=mode=>{
   const original=lastVerified?.savedStyle||'classic';
   const active=info.published===true?'published':'not published';
   detail.textContent=names[mode]+' · local Owner comparison · saved: '+names[original]+' ('+active+')';
  };
  control.value=document.body.dataset.clWorkspace||'classic';describe(control.value);
  control.addEventListener('change',()=>{
   // Server has already verified active Owner authority before this control exists.
   const mode=control.value;
   apply(mode);
   const next=new URL(location.href);
   next.searchParams.set('workspace',mode);
   history.replaceState(history.state,'',next.pathname+next.search+next.hash);
   describe(mode);
  });
  document.querySelector('main')?.before(bar);
 }
 async function init(){
  try{
   let token=null;
   if(typeof window.getSupabaseClient==='function'){
    try{
     const sb=await window.getSupabaseClient();
     token=(await sb?.auth?.getSession?.())?.data?.session?.access_token||null;
    }catch{}
   }
   const params=new URLSearchParams({page});
   if(qs.has('workspace'))params.set('workspace',qs.get('workspace'));
   const r=await fetch('/api/page-workspace-presentation?'+params.toString(),{
    headers:token?{authorization:'Bearer '+token}:{},cache:'no-store'});
   if(!r.ok)throw Error('Page presentation service unavailable');
   const result=await r.json();
   if(result.ok!==true||!MODES.includes(result.mode))throw Error('Invalid page style');
   lastVerified=result;
   apply(result.mode);
   if(result.ownerPreview===true)ownerBar(result);
   else document.querySelectorAll('.cl-page-style-livebar,.cl-page-workspace-notice').forEach(x=>x.remove());
  }catch(err){
   apply('classic');
   document.querySelectorAll('.cl-page-style-livebar,.cl-page-workspace-notice').forEach(x=>x.remove());
   console.warn('Page style verification unavailable; using Original:',err?.message||'unavailable');
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void init()},{once:true});
 else void init();
})();
