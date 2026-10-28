/* Crownlight Site Layout Editor v1.
 * Admin-controlled presentation only; all mutations independently authorized server-side.
 * No editing of navigation/authentication/billing/security form fields.
 */
(()=>{'use strict';
 const page=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'').replace(/[^a-z0-9-]/g,'').slice(0,64)||'index';
 const selector='main .journal-card,main .card,main .dashboard-space,main .academy-program,main .gu-bc-lesson,main .catalog-founder-card,main .catalog-free-member-card,main .v1321-feature-group';
 const excluded='form,dialog,[data-payment],[data-stripe],.v1321-secret-form,[data-auth-form],.crownlight-plot,.cl-live-plot';
 const $=s=>document.querySelector(s);
 let cards=[];
 function candidates(){return [...document.querySelectorAll(selector)].filter(x=>!x.closest(excluded)&&!x.matches(excluded)&&!x.querySelector('form,input[type="password"],input[autocomplete="cc-number"],[data-stripe],iframe')).slice(0,110)}
 const state={editing:false,config:new Map(),role:false,token:'',activeDrag:null};
 const slug=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,62);
 function cardKey(card){
  if(card.id)return 'id:'+card.id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,110);
  const title=card.querySelector('h1,h2,h3,[data-heading]')?.textContent?.trim()||'section';
  const label=slug(title)||'untitled';
  const dupe=cards.filter(x=>x!==card&&slug(x.querySelector('h1,h2,h3,[data-heading]')?.textContent||'')===label);
  const n=dupe.length?cards.filter(x=>slug(x.querySelector('h1,h2,h3,[data-heading]')?.textContent||'')===label).indexOf(card):0;
  return 'card:'+label+(n?'-'+n:'');
 }
 const validKey=/^[a-zA-Z0-9_:.-]{1,128}$/;
 const keyed=new Map();
 function collectCards(){
  const found=candidates();cards=found;let added=0;
  for(const card of found){
   const key=cardKey(card);
   if(validKey.test(key)&&!keyed.has(key)){
    card.dataset.guLayoutKey=key;keyed.set(key,card);added++;
    const row=state.config.get(key);if(row)apply(card,row);
   }
  }
  return added;
 }
 async function session(){
  if(typeof window.getSupabaseClient!=='function'){
   // Keep public page loads lightweight: load auth support only when this browser
   // already holds a Supabase session storage record (never read its contents).
   let hasAccount=false;
   try{hasAccount=Object.keys(localStorage).some(k=>/^sb-[a-z0-9]+-auth-token$/.test(k))}catch{}
   if(!hasAccount)return null;
   const inject=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;
    script.addEventListener('load',resolve,{once:true});script.addEventListener('error',reject,{once:true});document.head.append(script);
   });
   if(!window.SITE_CONFIG)await inject('/config.js');
   if(typeof window.getSupabaseClient!=='function')await inject('/assets/js/supabase-client.js');
  }
  if(typeof window.getSupabaseClient!=='function')return null;
  const sb=await window.getSupabaseClient();if(!sb)return null;
  const {data}=await sb.auth.getSession();return data?.session||null;
 }
 async function api(method='GET',payload=null){
  const url='/api/site-card-layout?page='+encodeURIComponent(page);
  const headers={},auth=state.token?{'authorization':'Bearer '+state.token}:{};
  if(method!=='GET')Object.assign(headers,auth,{'content-type':'application/json'});
  else Object.assign(headers,auth);
  const r=await fetch(url,{method,headers,body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok)throw Error(j.error||'Unable to save site layout.');
  return j;
 }
 function apply(card,row){
  if(!card||!row)return;
  if(Number.isInteger(row.width_pct)&&row.width_pct>=30&&row.width_pct<=100){
   card.style.width=row.width_pct+'%';card.style.maxWidth='100%';card.style.boxSizing='border-box';
  }
  if(Number.isInteger(row.min_height_px)&&row.min_height_px>=80&&row.min_height_px<=1200)card.style.minHeight=row.min_height_px+'px';
 }
 function status(message){const el=$('#gu-layout-feedback');if(el)el.textContent=message}
 async function save(card,changes={}){
  const key=card.dataset.guLayoutKey;if(!key)return;
  const previous=state.config.get(key)||{};
  const payload={cardKey:key,widthPct:changes.widthPct??previous.width_pct??null,
   minHeightPx:changes.minHeightPx??previous.min_height_px??null,
   sortIndex:changes.sortIndex??previous.sort_index??null};
  status('Saving layout…');
  try{await api('POST',payload);state.config.set(key,{width_pct:payload.widthPct,
   min_height_px:payload.minHeightPx,sort_index:payload.sortIndex});
   status('Layout saved.');}
  catch(e){status(e.message+' Changes have not been saved.')}
 }
 function beginResize(event,card){
  if(event.button!==0)return;event.preventDefault();event.stopPropagation();
  const startX=event.clientX,startY=event.clientY,r=card.getBoundingClientRect(),parent=card.parentElement?.getBoundingClientRect();
  const startW=r.width,startH=r.height,container=Math.max(1,parent?.width||startW);
  const handle=event.currentTarget;handle.setPointerCapture(event.pointerId);
  const onMove=e=>{
   const width=Math.max(30,Math.min(100,Math.round(100*(startW+e.clientX-startX)/container)));
   const height=Math.max(80,Math.min(1200,Math.round(startH+e.clientY-startY)));
   card.style.width=width+'%';card.style.maxWidth='100%';card.style.minHeight=height+'px';card.style.boxSizing='border-box';
  };
  const onEnd=e=>{
   handle.removeEventListener('pointermove',onMove);
   handle.removeEventListener('pointerup',onEnd);handle.removeEventListener('pointercancel',onCancel);
   const width=Math.round(100*card.getBoundingClientRect().width/container),height=Math.round(card.getBoundingClientRect().height);
   void save(card,{widthPct:Math.min(100,Math.max(30,width)),minHeightPx:Math.min(1200,Math.max(80,height))});
  };
  const onCancel=()=>{handle.removeEventListener('pointermove',onMove);
   handle.removeEventListener('pointerup',onEnd);handle.removeEventListener('pointercancel',onCancel)};
  handle.addEventListener('pointermove',onMove);
  handle.addEventListener('pointerup',onEnd,{once:true});
  handle.addEventListener('pointercancel',onCancel,{once:true});
 }
 function applySavedOrder(){
  // Only reorder siblings when their DOM parent already contains the same cards.
  const parents=new Set([...keyed.values()].map(c=>c.parentElement));
  for(const parent of parents){
   if(!parent)continue;
   const siblings=[...parent.children].filter(c=>c.dataset?.guLayoutKey);
   const sorted=[...siblings].sort((a,b)=>{
    const aa=state.config.get(a.dataset.guLayoutKey)?.sort_index,bb=state.config.get(b.dataset.guLayoutKey)?.sort_index;
    const ia=Number.isInteger(aa)?aa:1000+siblings.indexOf(a),ib=Number.isInteger(bb)?bb:1000+siblings.indexOf(b);
    return ia-ib;
   });
   const anchor=siblings.at(-1)?.nextSibling||null;
   for(const c of sorted)parent.insertBefore(c,anchor);
  }
 }
 function toggle(){
  state.editing=!state.editing;document.body.classList.toggle('gu-site-layout-editing',state.editing);
  $('#gu-layout-toggle').setAttribute('aria-pressed',String(state.editing));
  $('#gu-layout-toggle').textContent=state.editing?'Finish Layout Editing':'Edit Site Layout';
  for(const card of keyed.values()){
   card.classList.toggle('gu-layout-editable',state.editing);
   card.querySelector(':scope > .gu-layout-controls')?.remove();
   if(!state.editing)continue;
   const bar=document.createElement('div');bar.className='gu-layout-controls';
   const handle=document.createElement('button');handle.type='button';handle.textContent='Move card';
   handle.className='gu-layout-move';handle.draggable=true;handle.title='Drag to reorder within this section';
   handle.addEventListener('dragstart',e=>{state.activeDrag=card;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',card.dataset.guLayoutKey)});
   handle.addEventListener('dragend',()=>{state.activeDrag=null});
   const resize=document.createElement('button');resize.type='button';resize.className='gu-layout-resize';
   resize.textContent='↘ Resize';resize.title='Drag to resize; automatically saves on mouse release';
   resize.addEventListener('pointerdown',e=>beginResize(e,card));
   const reset=document.createElement('button');reset.type='button';reset.textContent='Reset';reset.className='gu-layout-reset';
   reset.onclick=async()=>{status('Resetting card…');try{await api('DELETE',{cardKey:card.dataset.guLayoutKey});
    state.config.delete(card.dataset.guLayoutKey);card.style.removeProperty('width');card.style.removeProperty('max-width');
    card.style.removeProperty('min-height');status('Card layout reset.')}catch(e){status(e.message)}};
   bar.append(handle,resize,reset);card.prepend(bar);
   card.addEventListener('dragover',e=>{if(!state.editing||!state.activeDrag||
    state.activeDrag.parentElement!==card.parentElement||state.activeDrag===card)return;
    e.preventDefault();e.dataTransfer.dropEffect='move'});
   card.addEventListener('drop',e=>{const moving=state.activeDrag;if(!moving||moving===card||moving.parentElement!==card.parentElement)return;
    e.preventDefault();const box=card.getBoundingClientRect();
    card.parentElement.insertBefore(moving,e.clientY>box.top+box.height/2?card.nextSibling:card);
    const siblings=[...card.parentElement.children].filter(x=>x.dataset.guLayoutKey);
    siblings.forEach((c,i)=>void save(c,{sortIndex:i}));
    state.activeDrag=null;
   });
  }
 }
 async function init(){
  collectCards();
  let saved;
  try{saved=await api('GET')}catch{return}
  for(const row of saved.items||[]){const card=keyed.get(row.card_key);
   if(!card)continue;state.config.set(row.card_key,row);apply(card,row)}
  applySavedOrder();
  const main=document.querySelector('main');
  if(main){
   const observer=new MutationObserver(()=>{if(collectCards()>0){applySavedOrder();if(state.editing){toggle();toggle()}}});
   observer.observe(main,{childList:true,subtree:true});
  }
  const identity=await session().catch(()=>null);
  if(!identity?.access_token)return;
  state.token=identity.access_token;
  const check=await api('GET').catch(()=>null);
  if(!check?.canEdit)return;
  const toolbar=document.createElement('aside');toolbar.id='gu-layout-admin-toolbar';
  toolbar.setAttribute('aria-label','Owner and staff layout editor');
  toolbar.innerHTML='<button type="button" id="gu-layout-toggle" aria-pressed="false">Edit Site Layout</button><p id="gu-layout-feedback" role="status" aria-live="polite"></p>';
  document.body.append(toolbar);$('#gu-layout-toggle').addEventListener('click',toggle);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init(),{once:true});
 else void init();
})();
