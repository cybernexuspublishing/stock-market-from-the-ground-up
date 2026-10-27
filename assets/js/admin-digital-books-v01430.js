/* v0.14.0.30 Owner-controlled digital editions, private EPUB/PDF upload, rights gates */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;if(cls)n.className=cls;return n};
let busy=false;
let editorCode=null,editorTarget=null;
let loading=null;
function mount(){
 if(document.querySelector('[data-gu-digital-v01430]'))return true;
 const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 const section=el('section',null,'admin-card gu-digital-books');section.dataset.guDigitalV01430='1';
 section.append(el('h2','Digital eBook Publishing & Downloads'),el('p','Upload an EPUB/PDF now, and independently enable or disable direct digital sales and customer downloads. Both remain blocked during Amazon KDP Select enrollment. Protected changes require an active Owner session and recent password reconfirmation with CAPTCHA; no authenticator app is required.'));
 const status=el('p','Waiting to verify Owner permissions…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const loadButton=el('button','Refresh eBooks','btn secondary');loadButton.type='button';
 const list=el('div',null,'gu-digital-list');section.append(loadButton,status,list);panel.append(section);
 async function rpc(sb,name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw Error(error.message||'Database unavailable.');if(!data?.ok)throw Error('Digital publishing contract unavailable.');return data}
 async function refresh(){if(busy)return;busy=true;loadButton.disabled=true;list.replaceChildren();status.textContent='Reading protected publication settings…';
  try{const sb=await window.getSupabaseClient(),data=await rpc(sb,'gu_owner_digital_books_get_v01430');
   for(const product of data.products||[]){
    const card=el('article',null,'gu-digital-row');card.append(el('h3',product.title||product.code));
    const info=el('p','Code: '+product.code+(product.fileExists?' · Private file verified':' · No verified private file'),'small');card.append(info);
    const kdp=el('input'),sales=el('input'),downloads=el('input'),rights=el('input'),until=el('input'),file=el('input');
    [kdp,sales,downloads,rights].forEach(x=>x.type='checkbox');
    kdp.checked=!!product.kdpSelect;sales.checked=!!product.sales;downloads.checked=!!product.downloads;rights.checked=!!product.rightsAttested;
    until.type='datetime-local';if(product.exclusiveUntil){const d=new Date(product.exclusiveUntil);if(!isNaN(d.getTime()))until.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
    file.type='file';file.accept='.epub,.pdf,application/epub+zip,application/pdf';
    const lbl=(txt,ctrl)=>{const x=el('label',txt);x.append(ctrl);return x};
    card.append(lbl('Currently enrolled in Amazon KDP Select',kdp),lbl('KDP Select current term ends (verified)',until),
      lbl('I verified actual KDP Select exit and digital distribution rights',rights),
      lbl('Enable direct eBook purchases',sales),lbl('Enable purchased-book downloads',downloads),
      lbl('Upload private EPUB/PDF (max 50 MB)',file));
    const fileStatus=el('p',product.asset?'Current private asset: '+product.asset:'No private asset attached.','small');card.append(fileStatus);
    let asset=product.asset||'';const rowStatus=el('p','Changes are saved only after server validation.','small');rowStatus.setAttribute('role','status');
    const upload=el('button','Upload selected file privately','btn secondary');upload.type='button';
    const save=el('button','Save eBook Rights & Controls','btn');save.type='button';
    upload.onclick=async()=>{if(busy)return;const f=file.files?.[0];if(!f){rowStatus.textContent='Select an EPUB or PDF.';return}
     const ext=/\.epub$/i.test(f.name)?'epub':/\.pdf$/i.test(f.name)?'pdf':null;
     if(!ext||f.size<1||f.size>50*1024*1024){rowStatus.textContent='EPUB/PDF required, up to 50 MB.';return}
     busy=true;upload.disabled=save.disabled=loadButton.disabled=true;rowStatus.textContent='Uploading into private Supabase Storage…';
     try{
      // The live Storage policy already enforces Owner role + the password/CAPTCHA
      // confirmation record. Explicitly request it BEFORE the Storage call;
      // a failed Storage upload cannot activate the RPC auto-retry wrapper.
      if(!window.GroundUpAdminPasswordConfirm?.ensure)
       throw Error('Owner password confirmation is unavailable; upload was not attempted.');
      await window.GroundUpAdminPasswordConfirm.ensure();
      // Verify the edition ledger exists before creating a private Storage object.
      await rpc(sb,'gu_owner_digital_history_v014304',{p_code:product.code});
      const signature=new Uint8Array(await f.slice(0,8).arrayBuffer());
      const pdf=signature.length>=5&&[37,80,68,70,45].every((v,i)=>signature[i]===v);
      const zip=signature.length>=4&&signature[0]===80&&signature[1]===75&&
       signature[2]===3&&signature[3]===4;
      if((ext==='pdf'&&!pdf)||(ext==='epub'&&!zip))
       throw Error('File signature does not match a PDF or EPUB. Select the original, unmodified edition.');
      const path=product.code+'/'+crypto.randomUUID()+'.'+ext;
      const {error}=await sb.storage.from('gu-digital-ebooks').upload(path,f,{upsert:false,cacheControl:'0',contentType:ext==='epub'?'application/epub+zip':'application/pdf'});
      if(error)throw error;
      await rpc(sb,'gu_owner_digital_register_v014304',{p_code:product.code,p_path:path,p_expected_version:null});
      asset=path;fileStatus.textContent='Version recorded privately: '+path+'. Save the publication controls to select the primary format.';
      rowStatus.textContent='Upload complete. Not published until you save rights controls.';
     }catch(e){rowStatus.textContent='Upload failed: '+(e.message||'Storage denied request. Confirm your Owner password step-up, upload permissions, and size limits.')}finally{busy=false;upload.disabled=save.disabled=loadButton.disabled=false}
    };
    save.onclick=async()=>{if(busy)return;if((sales.checked||downloads.checked)&&!rights.checked){rowStatus.textContent='Confirm distribution rights before enabling sales or downloads.';return}
     if((sales.checked||downloads.checked)&&!asset){rowStatus.textContent='Upload a private eBook file first.';return}
     busy=true;upload.disabled=save.disabled=loadButton.disabled=true;rowStatus.textContent='Saving rights and availability…';
     try{
      if(!window.GroundUpAdminPasswordConfirm?.ensure)
       throw Error('Owner password confirmation is unavailable; publishing was not attempted.');
      await window.GroundUpAdminPasswordConfirm.ensure();
      await rpc(sb,'gu_owner_digital_books_save_v01430',{
      p_code:product.code,p_kdp_select:kdp.checked,p_exclusive_until:until.value?new Date(until.value).toISOString():null,
      p_sales:sales.checked,p_downloads:downloads.checked,p_rights_attested:rights.checked,
      p_asset_path:asset,p_expected_updated_at:product.version});
      rowStatus.textContent='Saved and audited; reading authoritative state.';busy=false;await load();
     }catch(e){rowStatus.textContent='Save refused: '+(e.message||'Rights check failed.')}finally{busy=false;upload.disabled=save.disabled=loadButton.disabled=false}
    };
    const historyButton=el('button','View PDF/EPUB history','btn secondary');historyButton.type='button';
    const historyList=el('div',null,'small');
    historyButton.onclick=async()=>{
     try{
      await window.GroundUpAdminPasswordConfirm.ensure();
      const data=await rpc(sb,'gu_owner_digital_history_v014304',{p_code:product.code});
      historyList.replaceChildren();
      for(const row of data.versions||[]){
       const p=el('p',String(row.format).toUpperCase()+' v'+row.version+
        (row.current?' · current':' · archived')+(row.fileExists?'':' · file missing'));
       historyList.append(p);
       if(row.fileExists){
        const choose=el('button','Select for primary delivery','btn secondary');
        choose.type='button';
        choose.onclick=()=>{
         asset=row.path;
         fileStatus.textContent='Selected version: '+row.path;
         rowStatus.textContent='Selection is not published. Save eBook Rights & Controls to update the primary edition.';
        };
        historyList.append(choose);
       }
      }
     }catch(e){historyList.textContent='History unavailable: '+String(e.message||e)}
    };
    card.append(upload,historyButton,save,historyList,rowStatus);
    // Reuse the existing guarded uploader inside Products > Books > Edit.
    // The selected book card moves to the editor; other books remain in Commerce.
    if(editorCode===product.code && editorTarget?.isConnected && document.getElementById('admin-dialog')?.open){
     editorTarget.replaceChildren(card);
    }else list.append(card);
   }
   status.textContent=(data.products||[]).length+' eBooks loaded. A checkbox cannot cancel an actual KDP Select contract.';
  }catch(e){status.textContent='Digital eBook administration unavailable: '+(e.message||'Owner session or password confirmation required')}
  finally{busy=false;loadButton.disabled=false}
 }
 // Serialize refreshes so opening Edit while the Commerce prefetch is pending
 // waits for the same authoritative response rather than losing its uploader.
 async function load(){
  if(loading)return loading;
  loading=refresh();
  try{return await loading}finally{loading=null}
 }
 loadButton.onclick=load;
  // One source of truth for uploads, rights checks and signed-version history.
  // Never create a second storage route or a second set of publishing toggles.
  window.GroundUpDigitalBooks={
   async mountEditor(code,host){
    if(!/^[A-Z0-9_]{3,90}$/.test(code)||!host?.isConnected)
     throw Error('Save this book with a valid product code before uploading its edition.');
    editorCode=code;editorTarget=host;
    await load();
    if(!host.isConnected||editorTarget!==host||editorCode!==code)return;
    if(!host.querySelector('.gu-digital-row'))
     throw Error(status.textContent||'This book is not available to the authorized digital publishing service.');
   }
  };
  window.dispatchEvent(new Event('gu-digital-books-ready'));
  document.getElementById('admin-dialog')?.addEventListener('close',()=>{
   if(!editorTarget)return;
   editorCode=null;editorTarget=null;
   // Return the edition controls to the original Commerce view after editing.
   if(!busy)void load();
  });
  return true;
}
let attempts=0;const t=setInterval(()=>{if(mount()||++attempts>80)clearInterval(t)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
