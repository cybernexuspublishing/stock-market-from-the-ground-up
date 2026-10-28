/* Public avatar picker. Candidate selection is local until Apply succeeds.
 * The member-profile endpoint controls all writes and entitlements. */
(()=>{'use strict';
 const catalogUrl='/assets/avatars/catalog-v2.json';
 const verified=id=>/^[fmn](?:[1-9]|1[0-3])$/.test(String(id||''));
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
  if(choices.length!==39||new Set(choices.map(x=>x.id)).size!==39)throw Error('The avatar catalog is incomplete.');
  const dialog=document.createElement('dialog');dialog.className='v2-avatar-modal';
  dialog.setAttribute('aria-labelledby','v2-avatar-dialog-title');
  dialog.setAttribute('aria-describedby','v2-avatar-dialog-help');
  let selected=choices.find(x=>currentUrl.endsWith('/av-'+x.id+'.svg'))?.id||'',busy=false;
  dialog.innerHTML='<div class="v2-avatar-modal-header"><div><h2 id="v2-avatar-dialog-title">Choose Your Avatar</h2>'+
   '<p id="v2-avatar-dialog-help">Select an avatar, then choose Apply to save it to your account.</p></div>'+
   '<button type="button" data-avatar-dismiss aria-label="Close avatar picker">×</button></div>'+
   '<div class="v2-avatar-modal-grid" role="group" aria-label="Available member avatars">'+
   choices.map(x=>'<button type="button" class="v2-avatar-tile" data-avatar-id="'+escape(x.id)+'" aria-pressed="'+(x.id===selected)+'" aria-label="Select '+escape(x.label||'Member avatar')+'">'+
    '<img src="/assets/avatars/av-'+escape(x.id)+'.svg" alt="" loading="lazy" width="88" height="88">'+
    '<span>'+escape(x.label||x.id)+'</span></button>').join('')+'</div>'+
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
    const url=domain+'/assets/avatars/av-'+selected+'.svg';
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
 window.GroundUpAvatarPicker=Object.freeze({open});
})();
