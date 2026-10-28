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
   card.style.setProperty('width',row.width_pct+'%','important');card.style.setProperty('max-width','100%','important');card.style.setProperty('box-sizing','border-box','important');card.style.setProperty('justify-self','start','important');
  }
  if(Number.isInteger(row.min_height_px)&&row.min_height_px>=80&&row.min_height_px<=1200){card.style.setProperty('height',row.min_height_px+'px','important');card.style.setProperty('min-height','80px','important');card.style.setProperty('overflow','auto','important');}
  const x=Number.isInteger(row.offset_x_px)?Math.max(-280,Math.min(280,row.offset_x_px)):0;
  const y=Number.isInteger(row.offset_y_px)?Math.max(-280,Math.min(280,row.offset_y_px)):0;
  if(x||y)card.style.setProperty('translate',x+'px '+y+'px','important');
  else card.style.removeProperty('translate');
 }
 function status(message){const el=$('#gu-layout-feedback');if(el)el.textContent=message}
 async function save(card,changes={}){
  const key=card.dataset.guLayoutKey;if(!key)return;
  const previous=state.config.get(key)||{};
  const payload={cardKey:key,widthPct:changes.widthPct??previous.width_pct??null,
   minHeightPx:changes.minHeightPx??previous.min_height_px??null,
   sortIndex:changes.sortIndex??previous.sort_index??null,
   offsetXPx:changes.offsetXPx??previous.offset_x_px??0,
   offsetYPx:changes.offsetYPx??previous.offset_y_px??0};
  status('Saving layout…');
  try{await api('POST',payload);state.config.set(key,{width_pct:payload.widthPct,
   min_height_px:payload.minHeightPx,sort_index:payload.sortIndex,
   offset_x_px:payload.offsetXPx,offset_y_px:payload.offsetYPx});
   status('Layout saved.');}
  catch(e){status(e.message+' Changes have not been saved.')}
 }
 function beginResize(event,card){
  if(!state.editing||event.button!==0)return;
  event.preventDefault();event.stopPropagation();
  const handle=event.currentTarget,startX=event.clientX,startY=event.clientY;
  const rect=card.getBoundingClientRect();
  const container=card.parentElement?.getBoundingClientRect().width||rect.width;
  let latestWidth=Math.min(100,Math.max(30,Math.round(rect.width/container*100)));
  let latestHeight=Math.min(1200,Math.max(80,Math.round(rect.height)));
  let changed=false,finished=false;
  handle.classList.add('gu-resizing');
  card.classList.add('gu-layout-resizing');
  document.body.classList.add('gu-layout-pointer-active');
  try{handle.setPointerCapture(event.pointerId)}catch{}
  const move=e=>{
   if(e.pointerId!==event.pointerId||finished)return;
   const nextWidth=Math.min(100,Math.max(30,Math.round((rect.width+e.clientX-startX)/container*100)));
   const nextHeight=Math.min(1200,Math.max(80,Math.round(rect.height+e.clientY-startY)));
   changed=changed||nextWidth!==latestWidth||nextHeight!==latestHeight;
   latestWidth=nextWidth;latestHeight=nextHeight;
   card.style.setProperty('width',nextWidth+'%','important');
   card.style.setProperty('max-width','100%','important');
   card.style.setProperty('height',nextHeight+'px','important');card.style.setProperty('min-height','80px','important');card.style.setProperty('overflow','auto','important');
   card.style.setProperty('box-sizing','border-box','important');
   card.style.setProperty('justify-self','start','important');
   status('Resizing to '+nextWidth+'% × '+nextHeight+'px · release to save');
  };
  const cleanup=()=>{
   window.removeEventListener('pointermove',move,true);
   window.removeEventListener('pointerup',end,true);
   window.removeEventListener('pointercancel',cancel,true);
   window.removeEventListener('blur',cancel,true);
   handle.classList.remove('gu-resizing');card.classList.remove('gu-layout-resizing');
   document.body.classList.remove('gu-layout-pointer-active');
   try{if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId)}catch{}
  };
  const cancel=()=>{if(finished)return;finished=true;cleanup();
   const previous=state.config.get(card.dataset.guLayoutKey);
   card.style.removeProperty('width');card.style.removeProperty('max-width');card.style.removeProperty('height');card.style.removeProperty('min-height');card.style.removeProperty('overflow');card.style.removeProperty('justify-self');
   if(previous)apply(card,previous);status('Resize canceled without saving');
  };
  const end=e=>{if(e.pointerId!==event.pointerId||finished)return;
   finished=true;cleanup();
   if(changed)void save(card,{widthPct:latestWidth,minHeightPx:latestHeight});
   else status('Drag the resize handle diagonally, then release to save');
  };
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',cancel,true);
  window.addEventListener('blur',cancel,true);
 }
 function beginMove(event,card){
  if(!state.editing||event.button!==0||!card.dataset.guLayoutKey)return;
  event.preventDefault();event.stopPropagation();
  const handle=event.currentTarget,initialX=event.clientX,initialY=event.clientY;
  const saved=state.config.get(card.dataset.guLayoutKey)||{};
  const offsetX=Number.isInteger(saved.offset_x_px)?saved.offset_x_px:0;
  const offsetY=Number.isInteger(saved.offset_y_px)?saved.offset_y_px:0;
  const box=card.getBoundingClientRect(),parent=card.parentElement?.getBoundingClientRect();
  // Keep the whole card within its original section to prevent horizontal scrolling.
  const leftLimit=Math.max(-280,Math.ceil(offsetX-(box.left-(parent?.left??box.left))));
  const rightLimit=Math.min(280,Math.floor(offsetX+((parent?.right??box.right)-box.right)));
  let x=offsetX,y=offsetY,changed=false,finished=false;
  document.body.classList.add('gu-layout-dragging');
  card.classList.add('gu-layout-moving');
  handle.setAttribute('aria-grabbed','true');
  try{handle.setPointerCapture(event.pointerId)}catch{}
  const move=e=>{
   if(finished||e.pointerId!==event.pointerId)return;
   x=Math.round(Math.min(Math.max(leftLimit,rightLimit<leftLimit?leftLimit:rightLimit),Math.max(leftLimit,offsetX+e.clientX-initialX)));
   y=Math.max(-280,Math.min(280,Math.round(offsetY+e.clientY-initialY)));
   changed=changed||x!==offsetX||y!==offsetY;
   card.style.setProperty('translate',x+'px '+y+'px','important');
   status('Moving card · horizontal '+x+'px, vertical '+y+'px · release to save');
  };
  const cleanup=()=>{
   window.removeEventListener('pointermove',move,true);
   window.removeEventListener('pointerup',end,true);
   window.removeEventListener('pointercancel',cancel,true);
   window.removeEventListener('blur',cancel,true);
   document.body.classList.remove('gu-layout-dragging');
   card.classList.remove('gu-layout-moving');
   handle.removeAttribute('aria-grabbed');
   try{if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId)}catch{}
  };
  const cancel=()=>{if(finished)return;finished=true;cleanup();
   if(offsetX||offsetY)card.style.setProperty('translate',offsetX+'px '+offsetY+'px','important');
   else card.style.removeProperty('translate');
   status('Move canceled; saved position preserved');
  };
  const end=e=>{if(finished||e.pointerId!==event.pointerId)return;
   finished=true;cleanup();
   if(changed&&(x!==offsetX||y!==offsetY))void save(card,{offsetXPx:x,offsetYPx:y});
   else status('No move saved. Reduce card width first if you need horizontal room.');
  };
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',cancel,true);
  window.addEventListener('blur',cancel,true);
 }
 function applySavedOrder(){
  // Simulator has a fixed pedagogical step order. Presentation drags may move
  // cards visually but must never reorder the data source after the chart.
  if(page==='simulator')return;
  // Never move cards across other non-card page sections. Reordering every
  // child on page load previously moved "1. Load replay data" behind the chart.
  // Only persisted indexes among an already contiguous peer group are safe.
  const parents=new Set([...keyed.values()].map(c=>c.parentElement));
  for(const parent of parents){
   if(!parent)continue;
   const children=[...parent.children];let i=0;
   while(i<children.length){
    if(!children[i].dataset?.guLayoutKey){i++;continue}
    const group=[];while(i<children.length&&children[i].dataset?.guLayoutKey)group.push(children[i++]);
    if(group.length<2||!group.some(c=>Number.isInteger(state.config.get(c.dataset.guLayoutKey)?.sort_index)))continue;
    const ordered=[...group].sort((a,b)=>{
     const aa=state.config.get(a.dataset.guLayoutKey)?.sort_index;
     const bb=state.config.get(b.dataset.guLayoutKey)?.sort_index;
     return (Number.isInteger(aa)?aa:1000+group.indexOf(a))-
      (Number.isInteger(bb)?bb:1000+group.indexOf(b));
    });
    if(ordered.every((c,n)=>c===group[n]))continue;
    const anchor=group.at(-1).nextSibling;
    for(const card of ordered)parent.insertBefore(card,anchor);
   }
  }
 }
 function toggle(){
  state.editing=!state.editing;document.body.classList.toggle('gu-site-layout-editing',state.editing);
  $('#gu-layout-toggle').setAttribute('aria-pressed',String(state.editing));
  $('#gu-layout-toggle').textContent=state.editing?'Finish Layout Editing':'Edit Site Layout';
  for(const card of keyed.values()){
   card.classList.toggle('gu-layout-editable',state.editing);
   card.querySelector(':scope > .gu-layout-controls')?.remove();
   card.querySelector(':scope > .gu-layout-corner')?.remove();
   if(!state.editing)continue;
   const bar=document.createElement('div');bar.className='gu-layout-controls';
   const handle=document.createElement('button');handle.type='button';handle.textContent='Move card';
   handle.className='gu-layout-move';handle.title='Hold and drag to move card left, right, up or down; saved when released';
   handle.setAttribute('aria-label','Hold and drag to reposition this card; save on pointer release');
   handle.addEventListener('pointerdown',e=>beginMove(e,card));
   const resize=document.createElement('button');resize.type='button';resize.className='gu-layout-resize';
   resize.textContent='↘ Resize';resize.title='Drag to resize; automatically saves on mouse release';
   resize.addEventListener('pointerdown',e=>beginResize(e,card));
   const corner=document.createElement('button');corner.type='button';corner.className='gu-layout-corner';
   corner.textContent='↘';corner.title='Drag this corner left/right or up/down to resize the entire card. Save occurs on release.';
   corner.setAttribute('aria-label','Drag to resize whole card; release to save');
   corner.addEventListener('pointerdown',e=>beginResize(e,card));
   const reset=document.createElement('button');reset.type='button';reset.textContent='Reset';reset.className='gu-layout-reset';
   reset.onclick=async()=>{status('Resetting card…');try{await api('DELETE',{cardKey:card.dataset.guLayoutKey});
    state.config.delete(card.dataset.guLayoutKey);card.style.removeProperty('width');card.style.removeProperty('max-width');
    card.style.removeProperty('min-height');card.style.removeProperty('height');card.style.removeProperty('overflow');card.style.removeProperty('justify-self');card.style.removeProperty('translate');status('Card layout reset.')}catch(e){status(e.message)}};
   bar.append(handle,resize,reset);card.prepend(bar);card.append(corner);

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
