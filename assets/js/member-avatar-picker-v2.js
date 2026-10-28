/* Public avatar picker. Candidate selection is local until Apply succeeds.
 * The member-profile endpoint controls all writes and entitlements. */
(()=>{'use strict';
 const catalogUrl='/assets/avatars/catalog-v2.json?v=5';
 const imageSrc=x=>x.src+(x.id.startsWith('r')?'?v=5':'');
 const verified=id=>/^(?:[fmn](?:[4-9]|1[0-3])|r(?:0[1-9]|[12][0-9]|30))$/.test(String(id||''));
 const valid=x=>verified(x?.id)&&x.src==='/assets/avatars/av-'+x.id+'.webp';
 const domain='https://stock-market-from-the-ground-up-d1r.pages.dev';
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let active=null;
 async function open({currentUrl='',onApply}={}){
  if(active){active.focus();return}
  if(typeof onApply!=='function')throw Error('Avatar save control is not available.');
  const response=await fetch(catalogUrl,{cache:'no-store'});
  if(!response.ok)throw Error('The avatar collection is currently unavailable.');
  const payload=await response.json();
  const choices=Array.isArray(payload.avatars)?payload.avatars.filter(valid):[];
  if(choices.length!==60||new Set(choices.map(x=>x.id)).size!==60)throw Error('The avatar catalog is incomplete.');
  const dialog=document.createElement('dialog');dialog.className='v2-avatar-modal';
  dialog.setAttribute('aria-labelledby','v2-avatar-dialog-title');
  dialog.setAttribute('aria-describedby','v2-avatar-dialog-help');
  let selected=choices.find(x=>currentUrl.endsWith(x.src))?.id||'',busy=false;
  dialog.innerHTML='<div class="v2-avatar-modal-header"><div><h2 id="v2-avatar-dialog-title">Choose Your Avatar</h2>'+
   '<p id="v2-avatar-dialog-help">Select an avatar, then choose Apply to save it to your account.</p></div>'+
   '<button type="button" data-avatar-dismiss aria-label="Close avatar picker">×</button></div>'+
   '<div class="v4-avatar-filters" role="group" aria-label="Filter avatars by illustration style">'+
   '<button type="button" data-avatar-style="all" aria-pressed="true">All 60</button>'+
   '<button type="button" data-avatar-style="illustrated" aria-pressed="false">Illustrated (30)</button>'+
   '<button type="button" data-avatar-style="realistic" aria-pressed="false">More lifelike (30)</button></div>'+
   '<div class="v2-avatar-modal-grid" role="group" aria-label="Available member avatars">'+
   choices.map(x=>'<button type="button" class="v2-avatar-tile" data-avatar-id="'+escape(x.id)+'" aria-pressed="'+(x.id===selected)+'" aria-label="Select '+escape(x.label||'Member avatar')+'">'+
    '<img src="'+escape(imageSrc(x))+'" alt="" loading="lazy" width="88" height="88">'+
    '<span>'+String(choices.indexOf(x)+1)+'</span></button>').join('')+'</div>'+
   '<p class="v2-avatar-modal-status" role="status" aria-live="polite" data-avatar-message></p>'+
   '<div class="v2-avatar-modal-footer"><button type="button" class="btn secondary" data-avatar-cancel>Cancel</button>'+
   '<button type="button" class="btn" data-avatar-apply>Apply Avatar</button></div>';
  const pick=dialog.querySelector('[data-avatar-apply]'),status=dialog.querySelector('[data-avatar-message]'),
    tiles=[...dialog.querySelectorAll('[data-avatar-id]')];
  const refresh=()=>{tiles.forEach(x=>{const flag=x.dataset.avatarId===selected;x.setAttribute('aria-pressed',String(flag))});
   pick.disabled=busy||!selected};
  for(const btn of dialog.querySelectorAll('[data-avatar-style]'))btn.addEventListener('click',()=>{
   const style=btn.dataset.avatarStyle;
   for(const b of dialog.querySelectorAll('[data-avatar-style]'))b.setAttribute('aria-pressed',String(b===btn));
   for(const tile of dialog.querySelectorAll('[data-avatar-id]'))tile.hidden=style!=='all' && (style==='realistic')!==tile.dataset.avatarId.startsWith('r');
  });
  (dialog.querySelector('[data-avatar-style="'+(selected&&!selected.startsWith('r')?'illustrated':'realistic')+'"]'))?.click();
  const close=()=>{if(!busy)dialog.close()};
  dialog.querySelectorAll('[data-avatar-dismiss],[data-avatar-cancel]').forEach(x=>x.addEventListener('click',close));
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
  dialog.addEventListener('close',()=>{dialog.remove();if(active===dialog)active=null});
  dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
  tiles.forEach(button=>button.addEventListener('click',()=>{
   if(busy)return;selected=button.dataset.avatarId;status.textContent='';refresh();
  }));
  pick.addEventListener('click',async()=>{
   if(!selected||busy||!verified(selected))return;
   busy=true;refresh();status.textContent='Applying avatar…';
   try{
    const url=domain+(choices.find(x=>x.id===selected)?.src||'');
    await onApply(url);
    dialog.close();
   }catch(e){status.textContent=e?.message||'Could not apply this avatar.'}
   finally{busy=false;refresh()}
  });
  active=dialog;document.body.append(dialog);refresh();
  if(typeof dialog.showModal==='function')dialog.showModal();
  else{dialog.setAttribute('open','');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true')}
  (tiles.find(x=>x.dataset.avatarId===selected)||tiles[0])?.focus();
 }

 async function mountInline({host,currentUrl='',onApply}={}){
  if(!host||typeof onApply!=='function')throw Error('Avatar selection is not available.');
  if(host.querySelector('[data-avatar-library]')){host.querySelector('[data-avatar-library]').hidden=false;return}
  const response=await fetch(catalogUrl,{cache:'no-store'});
  if(!response.ok)throw Error('Avatar library unavailable.');
  const data=await response.json();
  const candidates=Array.isArray(data.avatars)?data.avatars.filter(valid):[];
  if(candidates.length!==60||new Set(candidates.map(x=>x.id)).size!==60)throw Error('Avatar library is incomplete.');
  // Both approved collections are available; existing legacy SVG profiles remain unchanged.
  const choices=[...candidates];
  const panel=document.createElement('section');panel.className='v2-avatar-inline';panel.setAttribute('data-avatar-library','');
  panel.setAttribute('aria-label','Member Avatar Library');
  panel.innerHTML='<div class="v2-avatar-inline-head"><div><h3>Member Avatar Library</h3>'+
   '<p>Choose an avatar, then Apply. Your public forum picture changes only after it is saved.</p></div>'+
   '<button type="button" class="btn secondary" data-avatar-close>Close</button></div>'+
   '<div class="v4-avatar-filters" role="group" aria-label="Filter avatars by illustration style">'+
   '<button type="button" data-avatar-style="all" aria-pressed="true">All 60</button>'+
   '<button type="button" data-avatar-style="illustrated" aria-pressed="false">Illustrated (30)</button>'+
   '<button type="button" data-avatar-style="realistic" aria-pressed="false">More lifelike (30)</button></div>'+
   '<div class="v2-avatar-modal-grid" role="group" aria-label="Available member avatars">'+
   choices.map(x=>'<button type="button" class="v2-avatar-tile" data-avatar-id="'+escape(x.id)+'" aria-pressed="false" aria-label="Select '+escape(x.label||x.id)+'">'+
   '<img src="'+escape(imageSrc(x))+'" alt="" loading="lazy" width="88" height="88">'+
   '<span>'+String(choices.indexOf(x)+1)+'</span></button>').join('')+'</div>'+
   '<p data-avatar-message role="status" aria-live="polite"></p><div class="v2-avatar-inline-actions">'+
   '<button type="button" class="btn secondary" data-avatar-cancel>Cancel</button>'+
   '<button type="button" class="btn" data-avatar-apply>Apply Avatar</button></div>';
  host.append(panel);
  let selected=choices.find(x=>currentUrl.endsWith(x.src))?.id||'',busy=false;
  const tiles=[...panel.querySelectorAll('[data-avatar-id]')],apply=panel.querySelector('[data-avatar-apply]'),
   message=panel.querySelector('[data-avatar-message]');
  const refresh=()=>{for(const tile of tiles)tile.setAttribute('aria-pressed',String(tile.dataset.avatarId===selected));apply.disabled=busy||!selected};
  for(const btn of panel.querySelectorAll('[data-avatar-style]'))btn.addEventListener('click',()=>{
   const style=btn.dataset.avatarStyle;
   for(const b of panel.querySelectorAll('[data-avatar-style]'))b.setAttribute('aria-pressed',String(b===btn));
   for(const tile of panel.querySelectorAll('[data-avatar-id]'))tile.hidden=style!=='all' && (style==='realistic')!==tile.dataset.avatarId.startsWith('r');
  });
  (panel.querySelector('[data-avatar-style="'+(selected&&!selected.startsWith('r')?'illustrated':'realistic')+'"]'))?.click();
  const close=()=>{if(!busy){panel.hidden=true;message.textContent=''}};
  panel.querySelectorAll('[data-avatar-close],[data-avatar-cancel]').forEach(x=>x.addEventListener('click',close));
  for(const tile of tiles)tile.addEventListener('click',()=>{if(busy)return;selected=tile.dataset.avatarId;message.textContent='';refresh()});
  apply.addEventListener('click',async()=>{
   if(!selected||busy)return;busy=true;refresh();message.textContent='Saving your selected picture…';
   try{await onApply(domain+(choices.find(x=>x.id===selected)?.src||''));message.textContent='Your profile picture was saved.';panel.hidden=true}
   catch(e){message.textContent=e?.message||'Your picture could not be saved.'}
   finally{busy=false;refresh()}
  });
  refresh();tiles.find(x=>x.dataset.avatarId===selected)?.scrollIntoView({block:'nearest'});
 }
 window.GroundUpAvatarPicker=Object.freeze({open,mountInline});
})();
