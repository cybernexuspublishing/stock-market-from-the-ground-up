/* Owner sitewide background picker. Reuses gu-store-photos Owner-only RLS
 * and existing audited Admin Site Settings API; no new storage or SQL needed. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
 const id='gu-owner-background-v1',bucket='gu-store-photos',key='website_background_v1';
 let currentPath='',ownerId='',saving=false;
 const make=(tag,txt)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;return n};
 const notice=(host,message)=>{host.textContent=message};
 async function client(){
  const sb=await window.getSupabaseClient();
  const {data:auth,error}=await sb.auth.getUser();
  if(error||!auth?.user?.id)throw Error('Sign in to your Owner account.');
  const {data:yes,error:ownerError}=await sb.rpc('gu_store_owner_v014297');
  if(ownerError||yes!==true)throw Error('Owner media-upload permission unavailable.');
  ownerId=auth.user.id;return sb;
 }
 function imagePath(value){
  if(typeof value!=='string')return '';
  try{
   const p=new URL(value).pathname,marker='/storage/v1/object/public/gu-store-photos/';
   const idx=p.indexOf(marker);if(idx<0)return '';
   const path=p.slice(idx+marker.length).split('/').map(decodeURIComponent).join('/');
   return /^[a-f0-9-]{36}\/SITE_BACKGROUND\/[a-z0-9_-]{10,60}\.(?:jpg|jpeg|png|webp)$/.test(path)?path:'';
  }catch{return ''}
 }
 function validSignature(f,bytes){
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  const type=f.type,ext=type==='image/jpeg'?'jpg':type==='image/png'?'png':type==='image/webp'?'webp':'';
  return ((ext==='jpg'&&jpg)||(ext==='png'&&png)||(ext==='webp'&&webp))?ext:'';
 }
 async function saveSettings(sb,value){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Session expired.');
  const r=await fetch('/api/admin?action=setting_save',{method:'POST',cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},
   body:JSON.stringify({setting_key:key,category:'design',public_read:true,
    description:'Owner-approved sitewide background image and overlay',value})});
  const data=await r.json().catch(()=>null);
  if(!r.ok||!data?.ok)throw Error(data?.error||'Site background setting was not saved.');
 }
 async function mount(){
  const panel=document.querySelector('.admin-panel[data-admin-panel="settings"]');
  if(!panel||document.getElementById(id))return !!document.getElementById(id);
  const host=make('section');host.className='admin-card gu-site-bg-editor';host.id=id;
  host.append(make('h2','Website Background & Appearance'),
   make('p','Upload a JPEG, PNG or WebP picture for the website background, or restore the standard design. This does not change chart data, membership benefits or payment settings.'));
  const file=make('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';
  const choose=make('label','Background picture (up to 5 MB)');choose.append(file);
  const opacity=make('input');opacity.type='range';opacity.min='.35';opacity.max='.92';opacity.step='.01';opacity.value='.76';
  const val=make('output','76%');opacity.oninput=()=>{val.textContent=Math.round(Number(opacity.value)*100)+'%'};
  const strength=make('label','Dark overlay strength');strength.append(opacity,val);
  const position=make('select');for(const code of ['center','top','bottom']){const o=make('option',code==='center'?'Center':code==='top'?'Top':'Bottom');o.value=code;position.append(o)}
  const positioning=make('label','Image alignment');positioning.append(position);
  const buttons=make('div');buttons.className='admin-actions';
  const save=make('button','Upload & Apply Background');save.type='button';save.className='btn';
  const restore=make('button','Restore Default Background');restore.type='button';restore.className='btn secondary';
  const preview=make('div');preview.className='gu-site-bg-preview';preview.setAttribute('aria-label','Background image preview');
  const status=make('p','Checking Owner access and current design…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  buttons.append(save,restore);host.append(choose,strength,positioning,preview,buttons,status);
  const settings=panel.querySelector('#admin-settings-list');if(settings)settings.before(host);else panel.append(host);
  let currentUrl='';
  try{
   await client();
   const response=await fetch('/api/website-design',{cache:'no-store'}),data=await response.json();
   const bg=data?.background||{};
   currentUrl=bg.imageUrl||'';currentPath=imagePath(currentUrl);
   if(Number.isFinite(bg.overlay))opacity.value=String(bg.overlay);
   if(['center','top','bottom'].includes(bg.position))position.value=bg.position;
   opacity.oninput();
   if(currentUrl){preview.style.backgroundImage='url("'+currentUrl+'")';notice(status,'Current background loaded. Choose a new picture or adjust the overlay.');}
   else notice(status,'The default website background is active. Choose an image to replace it.');
  }catch(e){save.disabled=restore.disabled=true;notice(status,'Background management unavailable: '+e.message);return true}
  file.onchange=()=>{
   const f=file.files?.[0];if(!f)return;
   if(f.size>5*1024*1024){notice(status,'Image is over 5 MB. Choose a smaller image.');return}
   const url=URL.createObjectURL(f);
   preview.style.backgroundImage='url("'+url+'")';
   preview.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true});
   notice(status,'Preview only. Upload & Apply to publish the image to the website.');
  };
  save.onclick=async()=>{
   if(saving)return;saving=true;save.disabled=restore.disabled=true;
   let uploaded='';
   try{
    const sb=await client(),f=file.files?.[0];
    if(f){
     if(f.size<100||f.size>5*1024*1024)throw Error('Choose a picture between 100 bytes and 5 MB.');
     const bytes=new Uint8Array(await f.slice(0,12).arrayBuffer()),ext=validSignature(f,bytes);
     if(!ext)throw Error('File does not have a matching JPEG, PNG or WebP signature.');
     uploaded=ownerId+'/SITE_BACKGROUND/'+crypto.randomUUID().replaceAll('-','').slice(0,24)+'.'+ext;
     const uploadedResult=await sb.storage.from(bucket).upload(uploaded,f,{upsert:false,contentType:f.type,cacheControl:'3600'});
     if(uploadedResult.error)throw Error(uploadedResult.error.message||'Private Owner upload rejected.');
    }
    const path=uploaded||currentPath;if(!path)throw Error('Choose an image before enabling a background.');
    await saveSettings(sb,{enabled:true,path,overlay:Number(opacity.value),position:position.value});
    currentPath=path;currentUrl=sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    preview.style.backgroundImage='url("'+currentUrl+'")';file.value='';
    window.GroundUpSiteBackground?.reload();
    notice(status,'Website background published and saved. Refresh another page to verify it.');
   }catch(e){
    if(uploaded){try{(await client()).storage.from(bucket).remove([uploaded])}catch{}}
    notice(status,'Background not changed: '+e.message);
   }finally{saving=false;save.disabled=restore.disabled=false}
  };
  restore.onclick=async()=>{
   if(saving)return;if(!confirm('Restore the default website background?'))return;
   saving=true;save.disabled=restore.disabled=true;
   try{const sb=await client();await saveSettings(sb,{enabled:false,path:'',overlay:Number(opacity.value),position:position.value});
    currentPath='';currentUrl='';file.value='';preview.style.backgroundImage='none';
    window.GroundUpSiteBackground?.reload();
    notice(status,'Default background restored. Uploaded images may be managed separately in Supabase Storage.');
   }catch(e){notice(status,'Could not restore background: '+e.message)}
   finally{saving=false;save.disabled=restore.disabled=false}
  };
  return true;
 }
 let tries=0;const handle=setInterval(()=>{if(mount()||++tries>50)clearInterval(handle)},250);
})();
