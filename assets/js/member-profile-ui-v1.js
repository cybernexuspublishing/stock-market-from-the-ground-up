/* Nonprivileged member presentation controls: never assigns actual permissions. */
(()=>{'use strict';if(!/^\/dashboard(?:\.html)?$/.test(location.pathname))return;
const $=(s,r=document)=>r.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const route='/api/member-profile';let mounting=false;
const cacheFresh=url=>typeof url==='string'&&/\/assets\/avatars\/av-r(?:0[1-9]|[12][0-9]|30)\.webp$/.test(url)?url+'?v=5':url;

async function session(){const sb=await window.getSupabaseClient();const {data,error}=await sb.auth.getSession();if(error||!data?.session)throw Error('Sign in to edit your profile.');return{sb,token:data.session.access_token,userId:data.session.user.id}}
async function request(action,body){const {token}=await session();const response=await fetch(route,{method:action?'POST':'GET',
 headers:{authorization:'Bearer '+token,...(action?{'content-type':'application/json'}:{})},
 body:action?JSON.stringify({action,...body}):undefined,cache:'no-store'});
 const j=await response.json().catch(()=>({}));if(!response.ok||!j.ok)throw Error(j.error||'Member profile unavailable.');return j}
function setStatus(host,message,error=false){const n=$('[data-profile-status]',host);if(!n)return;n.textContent=message;n.className=error?'v1-profile-status is-error':'v1-profile-status';}
async function imageFile(file,uid,sb){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Use a JPG, PNG or WebP image under 5 MB.');
 const bitmap=await createImageBitmap(file);if(bitmap.width>5000||bitmap.height>5000){bitmap.close();throw Error('Image dimensions are too large.');}
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#10243a';ctx.fillRect(0,0,256,256);
 const scale=Math.max(256/bitmap.width,256/bitmap.height),w=bitmap.width*scale,h=bitmap.height*scale;
 ctx.drawImage(bitmap,(256-w)/2,(256-h)/2,w,h);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
 if(!blob||blob.size>1048576)throw Error('Avatar could not be safely compressed.');
 const arr=new Uint8Array(16);crypto.getRandomValues(arr);const key=[...arr].map(x=>x.toString(16).padStart(2,'0')).join('');
 const path=uid+'/'+key+'.webp',uploaded=await sb.storage.from('gu-member-avatars').upload(path,blob,{contentType:'image/webp',upsert:false});
 if(uploaded.error)throw uploaded.error;
 return sb.storage.from('gu-member-avatars').getPublicUrl(path).data.publicUrl;
}
async function mount(body){
 if(!body||body.querySelector('#member-presentation-v1')||mounting)return;mounting=true;
 try{
  const j=await request();if(!body.isConnected)return;
  const p=j.profile,host=document.createElement('section');host.id='member-presentation-v1';host.className='v13-card member-profile-settings';
  const options=(j.choices||[]).map(x=>'<option value="'+esc(x.code)+'" '+(p.selectedTitle===x.code?'selected':'')+'>'+esc(x.label)+'</option>').join('');

  host.innerHTML='<div class="v1321-section-head"><div><div class="eyebrow">Member identity</div><h2>Public Profile & Display Title</h2></div></div>'+
   '<p class="small">Your public bio, avatar and display title never change your subscription, staff role or actual learning entitlements. Your email and legal name are not shown publicly.</p>'+
   '<form data-profile-form class="v1-profile-form"><div class="v1-avatar-row"><img data-avatar-preview src="'+esc(cacheFresh(p.avatarUrl)||'/assets/avatars/av-f4.webp')+'" alt="Your current avatar"><div><strong>Profile picture</strong><p class="small">Choose a site avatar or upload a picture you own. Your selected avatar is visible to other members.</p>'+
   '<button type="button" class="btn secondary v2-edit-picture" data-edit-picture>Choose from Avatar Library</button>'+
   '<label>Upload your own picture<input data-avatar-upload type="file" accept="image/png,image/jpeg,image/webp"></label></div></div><div data-avatar-inline-host></div>'+
   '<label>Gender (optional profile preference)<select name="gender"><option value="rather_not_say">Rather not say</option><option value="female">Female</option><option value="male">Male</option></select></label>'+
   '<label>Biography (up to 1,000 characters)<textarea name="bio" maxlength="1000" rows="3" placeholder="Tell other learners about your interests and learning goals.">'+esc(p.bio)+'</textarea></label>'+
   '<button class="btn" type="submit">Save Profile</button></form>'+
   '<hr><form data-title-form><label>Displayed title<select data-title-choice>'+options+'</select></label><p class="small">Founding Member is selectable only after the verified Founder ledger confirms enrollment. Display titles are decorative; they do not confer access.</p>'+
   '<button class="btn secondary" type="submit">Use Selected Title</button></form>'+
   '<form data-custom-title-form><label>Create a custom display title — 5 Crownlight Sparks<input type="text" name="title" minlength="3" maxlength="26" placeholder="Example: Patient Chart Reader" required></label><p class="small">Administrative, moderation, official and regulated-professional titles are prohibited. Each new custom title costs 5 Sparks; confirmation is required before charging.</p>'+
   '<button class="btn secondary" type="submit">Spend 5 Sparks & Create Title</button></form>'+
   '<p class="v1-profile-status" data-profile-status role="status" aria-live="polite"></p>';
  body.append(host);$('[name=gender]',host).value=p.gender;
  let avatarUrl=p.avatarUrl;
  $('[data-edit-picture]',host).addEventListener('click',async ev=>{
   const trigger=ev.currentTarget;
   try{
    if(!window.GroundUpAvatarPicker?.mountInline)throw Error('The Dashboard avatar library could not be loaded.');
    await window.GroundUpAvatarPicker.mountInline({host:$('[data-avatar-inline-host]',host),currentUrl:avatarUrl,onApply:async url=>{
     // Preserve existing stored bio and gender; applying an avatar must not
     // silently submit unsaved changes in the adjacent profile form.
     const latest=(await request()).profile;
     const saved=await request('save',{gender:latest.gender,bio:latest.bio,avatarUrl:url});
     avatarUrl=saved.profile.avatarUrl;
     $('[data-avatar-preview]',host).src=cacheFresh(avatarUrl)||'/assets/avatars/av-f4.webp';
     window.dispatchEvent(new CustomEvent('gu:profile-avatar-updated',{detail:{avatarUrl}}));
     setStatus(host,'Avatar updated on your account.');
    }});
   }catch(e){setStatus(host,e.message,true);trigger.focus()}
  });
  $('[data-profile-form]',host).addEventListener('submit',async ev=>{
   ev.preventDefault();const btn=ev.submitter;btn.disabled=true;try{
    const {sb,userId}=await session(),file=$('[data-avatar-upload]',host).files?.[0];
    if(file)avatarUrl=await imageFile(file,userId,sb);
    const res=await request('save',{gender:$('[name=gender]',host).value,bio:$('[name=bio]',host).value,avatarUrl});
    $('[data-avatar-preview]',host).src=cacheFresh(res.profile.avatarUrl)||'/assets/avatars/av-f4.webp';
    $('[data-avatar-upload]',host).value='';window.dispatchEvent(new CustomEvent('gu:profile-avatar-updated',{detail:{avatarUrl:res.profile.avatarUrl}}));setStatus(host,'Profile saved.');
   }catch(e){setStatus(host,e.message,true)}finally{btn.disabled=false}
  });
  $('[data-title-form]',host).addEventListener('submit',async ev=>{
   ev.preventDefault();const btn=ev.submitter;btn.disabled=true;try{
    await request('select_title',{title:$('[data-title-choice]',host).value});
    setStatus(host,'Display title saved. Your access permissions have not changed.');
   }catch(e){setStatus(host,e.message,true)}finally{btn.disabled=false}
  });
  let pendingPurchase=null;
  $('[data-custom-title-form]',host).addEventListener('submit',async ev=>{
   ev.preventDefault();const title=$('[name=title]',host).value.trim();
   if(!confirm('Spend 5 Crownlight Sparks for the display title “'+title+'”? This does not grant any new account permissions.'))return;
   const btn=ev.submitter;btn.disabled=true;try{
    if(!pendingPurchase||pendingPurchase.title!==title)pendingPurchase={title,id:crypto.randomUUID()};
    const j=await request('buy_custom_title',{title,requestId:pendingPurchase.id});pendingPurchase=null;
    const options=$('[data-title-choice]',host),option=options.querySelector('[value="custom"]')||document.createElement('option');
    option.value='custom';option.textContent='Custom Display Title';if(!option.isConnected)options.append(option);options.value='custom';
    setStatus(host,j.alreadyUsed?'Custom title is already recorded.':'Custom title saved. 5 Sparks were deducted from your verified balance.');
   }catch(e){setStatus(host,e.message,true)}finally{btn.disabled=false}
  });
 }catch(e){if(body.isConnected&&!body.querySelector('#member-presentation-v1')){const p=document.createElement('p');p.className='small';p.textContent='Public profile options unavailable: '+e.message;body.append(p)}}finally{mounting=false}
}
let t;function inspect(){
 const host=document.querySelector('[data-v1322-panel="settings"] [data-settings-body]');
 if(host&&host.querySelector('[data-email]')&&!host.querySelector('#member-presentation-v1'))void mount(host);
}
document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{clearTimeout(t);t=setTimeout(inspect,110)}).observe(document.body,{childList:true,subtree:true});inspect()},{once:true});
})();
