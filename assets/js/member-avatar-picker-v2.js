/* Public avatar picker. Candidate selection is local until Apply succeeds.
 * The member-profile endpoint controls all writes and entitlements. */
(()=>{'use strict';
 const catalogUrl='/assets/avatars/catalog-v2.json';
 const verified=id=>/^[fmn](?:[4-9]|1[0-3])$/.test(String(id||''));
 const domain='https://stock-market-from-the-ground-up-d1r.pages.dev';
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 let active=null;
 async function open({currentUrl='',onApply}={}){
  if(active){active.focus();return}
  if(typeof onApply!=='function')throw Error('Avatar save control is not available.');
  const response=await fetch(catalogUrl,{cache:'no-store'});
  if(!response.ok)throw Error('The avatar collection is currently unavailable.');
  const payload=await response.json();
  const choices=Array.isArray(payload.avatars)?payload.avatars.filter(x=>verified(x?.id)):[];
  if(choices.length!==30||new Set(choices.map(x=>x.id)).size!==30)throw Error('The avatar catalog is incomplete.');
  const dialog=document.createElement('dialog');dialog.className='v2-avatar-modal';
  dialog.setAttribute('aria-labelledby','v2-avatar-dialog-title');
  dialog.setAttribute('aria-describedby','v2-avatar-dialog-help');
  let selected=choices.find(x=>currentUrl.endsWith('/av-'+x.id+'.webp'))?.id||'',busy=false;
  dialog.innerHTML='<div class="v2-avatar-modal-header"><div><h2 id="v2-avatar-dialog-title">Choose Your Avatar</h2>'+
   '<p id="v2-avatar-dialog-help">Select an avatar, then choose Apply to save it to your account.</p></div>'+
   '<button type="button" data-avatar-dismiss aria-label="Close avatar picker">×</button></div>'+
   '<div class="v2-avatar-modal-grid" role="group" aria-label="Available member avatars">'+
   choices.map(x=>'<button type="button" class="v2-avatar-tile" data-avatar-id="'+escape(x.id)+'" aria-pressed="'+(x.id===selected)+'" aria-label="Select '+escape(x.label||'Member avatar')+'">'+
    '<img src="/assets/avatars/av-'+escape(x.id)+'.webp" alt="" loading="lazy" width="88" height="88">'+
    '<span>'+String(choices.indexOf(x)+1)+'</span></button>').join('')+'</div>'+
   '<p class="v2-avatar-modal-status" role="status" aria-live="polite" data-avatar-message></p>'+
   '<div class="v2-avatar-modal-footer"><button type="button" class="btn secondary" data-avatar-cancel>Cancel</button>'+
   '<button type="button" class="btn" data-avatar-apply>Apply Avatar</button></div>';
  const pick=dialog.querySelector('[data-avatar-apply]'),status=dialog.querySelector('[data-avatar-message]'),
    tiles=[...dialog.querySelectorAll('[data-avatar-id]')];
  const refresh=()=>{tiles.forEach(x=>{const flag=x.dataset.avatarId===selected;x.setAttribute('aria-pressed',String(flag))});
   pick.disabled=busy||!selected};
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
    const url=domain+'/assets/avatars/av-'+selected+'.webp';
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
  const candidates=Array.isArray(data.avatars)?data.avatars.filter(x=>verified(x?.id)):[];
  if(candidates.length!==30||new Set(candidates.map(x=>x.id)).size!==30)throw Error('Avatar library is incomplete.');
  // Only the 30 premium images are offered; previously saved SVG selections are retained on old profiles.
  const choices=[...candidates].sort((a,b)=>Number(/[fmn][1-3]$/.test(a.id))-Number(/[fmn][1-3]$/.test(b.id)));
  const panel=document.createElement('section');panel.className='v2-avatar-inline';panel.setAttribute('data-avatar-library','');
  panel.setAttribute('aria-label','Member Avatar Library');
  panel.innerHTML='<div class="v2-avatar-inline-head"><div><h3>Member Avatar Library</h3>'+
   '<p>Choose an avatar, then Apply. Your public forum picture changes only after it is saved.</p></div>'+
   '<button type="button" class="btn secondary" data-avatar-close>Close</button></div>'+
   '<div class="v2-avatar-modal-grid" role="group" aria-label="Available member avatars">'+
   choices.map(x=>'<button type="button" class="v2-avatar-tile" data-avatar-id="'+escape(x.id)+'" aria-pressed="false" aria-label="Select '+escape(x.label||x.id)+'">'+
   '<img src="/assets/avatars/av-'+escape(x.id)+'.webp" alt="" loading="lazy" width="88" height="88">'+
   '<span>'+String(choices.indexOf(x)+1)+'</span></button>').join('')+'</div>'+
   '<p data-avatar-message role="status" aria-live="polite"></p><div class="v2-avatar-inline-actions">'+
   '<button type="button" class="btn secondary" data-avatar-cancel>Cancel</button>'+
   '<button type="button" class="btn" data-avatar-apply>Apply Avatar</button></div>';
  host.append(panel);
  let selected=choices.find(x=>currentUrl.endsWith('/av-'+x.id+'.webp'))?.id||'',busy=false;
  const tiles=[...panel.querySelectorAll('[data-avatar-id]')],apply=panel.querySelector('[data-avatar-apply]'),
   message=panel.querySelector('[data-avatar-message]');
  const refresh=()=>{for(const tile of tiles)tile.setAttribute('aria-pressed',String(tile.dataset.avatarId===selected));apply.disabled=busy||!selected};
  const close=()=>{if(!busy){panel.hidden=true;message.textContent=''}};
  panel.querySelectorAll('[data-avatar-close],[data-avatar-cancel]').forEach(x=>x.addEventListener('click',close));
  for(const tile of tiles)tile.addEventListener('click',()=>{if(busy)return;selected=tile.dataset.avatarId;message.textContent='';refresh()});
  apply.addEventListener('click',async()=>{
   if(!selected||busy)return;busy=true;refresh();message.textContent='Saving your selected picture…';
   try{await onApply(domain+'/assets/avatars/av-'+selected+'.webp');message.textContent='Your profile picture was saved.';panel.hidden=true}
   catch(e){message.textContent=e?.message||'Your picture could not be saved.'}
   finally{busy=false;refresh()}
  });
  refresh();tiles.find(x=>x.dataset.avatarId===selected)?.scrollIntoView({block:'nearest'});
 }
 window.GroundUpAvatarPicker=Object.freeze({open,mountInline});
})();
