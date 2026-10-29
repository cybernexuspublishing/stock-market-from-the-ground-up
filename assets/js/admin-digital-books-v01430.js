/* v0.14.0.30 Owner-controlled digital editions, private EPUB/PDF upload, rights gates */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;if(cls)n.className=cls;return n};
let busy=false;
let editorCode=null,editorTarget=null;
let loading=null;
let activeEditorControls=null;
const friendlySaveError=value=>{
 const message=String(value||'Unknown publishing error');
 if(message.includes('KDP_EXCLUSIVITY_OR_RIGHTS_NOT_CLEARED'))return 'Sales cannot be enabled until KDP Select is OFF, distribution rights are acknowledged, and a verified KDP Select end date has been recorded in the past.';
 if(message.includes('DIGITAL_PROVIDER_VARIANT_AND_PRICE_REQUIRED'))return 'The selling configuration is missing a validated digital checkout provider variant or price. The book file and rights can be saved as a draft, but paid sales cannot be enabled until checkout mapping is configured.';
 if(message.includes('DIGITAL_SETTINGS_STALE'))return 'The product record changed since this editor opened. Reopen Edit and retry to avoid overwriting a newer update.';
 if(message.includes('DIGITAL_SALE_REQUIRES_DOWNLOAD_FULFILLMENT'))return 'Enable purchased-book downloads before enabling direct digital sales.';
 if(message.includes('OWNER_AAL2_REQUIRED')||message.includes('PASSWORD_RECONFIRM_REQUIRED'))return 'Owner authorization or recent password confirmation is required. Reconfirm your Owner password and retry.';
 return message;
};
function mount(){
 // A CSS <link> has data-gu-digital-v01430 too. It is not a mounted upload panel.
 if(document.querySelector('section.gu-digital-books[data-gu-digital-v01430]'))return true;
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
    const currentState=()=>JSON.stringify({
     kdp:kdp.checked,sales:sales.checked,downloads:downloads.checked,
     rights:rights.checked,until:until.value,asset
    });
    let savedState=currentState();
    const saveControls=async({draft=false,reload=true}={})=>{
     if(busy)throw Error('Another book operation is still running. Finish it before saving.');
     const intendsSales=!draft&&(sales.checked||downloads.checked);
     if(intendsSales&&!rights.checked)throw Error('Confirm distribution rights before enabling sales or downloads.');
     if(intendsSales&&kdp.checked)throw Error('KDP Select must be OFF before direct digital sales or downloads.');
     if(intendsSales&&!asset)throw Error('Select and verify a private EPUB or PDF before enabling sales.');
     if(!draft&&sales.checked&&!downloads.checked)throw Error('Enable purchased-book downloads before direct eBook purchases.');
     if(intendsSales&&(!until.value||!Number.isFinite(new Date(until.value).getTime())||
       new Date(until.value).getTime()>Date.now()))
      throw Error('Enter the actual verified KDP Select term end date, which must already be in the past. Do not enter an invented date.');
     busy=true;upload.disabled=save.disabled=loadButton.disabled=true;
     rowStatus.textContent=draft?'Saving private book setup with sales and downloads OFF…':'Verifying and saving eBook rights and sales settings…';
     try{
      if(!window.GroundUpAdminPasswordConfirm?.ensure)
       throw Error('Owner password confirmation is unavailable; publishing was not attempted.');
      await window.GroundUpAdminPasswordConfirm.ensure();
      await rpc(sb,'gu_owner_digital_books_save_v01430',{
       p_code:product.code,p_kdp_select:kdp.checked,
       p_exclusive_until:until.value?new Date(until.value).toISOString():null,
       p_sales:draft?false:sales.checked,p_downloads:draft?false:downloads.checked,
       p_rights_attested:rights.checked,p_asset_path:asset,
       p_expected_updated_at:product.version
      });
      if(draft){sales.checked=false;downloads.checked=false}
      const parentDigital=document.getElementById('dlg-p-dd');
      const parentKdp=document.getElementById('dlg-p-kdp');
      if(parentDigital)parentDigital.checked=sales.checked;
      if(parentKdp)parentKdp.checked=kdp.checked;
      savedState=currentState();
      rowStatus.textContent=draft?'Private edition setup saved and audited. Sales and downloads remain OFF.':
       'Digital book settings saved and audited. Verify payment-provider readiness before accepting orders.';
      if(reload){busy=false;await load()}
      return true;
     }catch(e){
      rowStatus.textContent='Save refused: '+friendlySaveError(e.message);
      throw Error(friendlySaveError(e.message));
     }finally{busy=false;upload.disabled=save.disabled=loadButton.disabled=false}
    };
    save.onclick=()=>{void saveControls().catch(e=>{rowStatus.textContent='Save refused: '+friendlySaveError(e.message)})};
    const draftSave=el('button','Save book setup (Sales OFF)','btn secondary');
    draftSave.type='button';
    draftSave.onclick=()=>{void saveControls({draft:true}).catch(e=>{rowStatus.textContent='Draft save refused: '+friendlySaveError(e.message)})};


    // Record the current private EPUB through existing password-guarded
    // Owner publishing RPC. Never auto-enable sales or member downloads.
    const prepare=el('button','Assign Current EPUB as Primary (Sales OFF)','btn secondary');
    prepare.type='button';
    prepare.onclick=async()=>{
     if(busy)return;
     busy=true;prepare.disabled=save.disabled=upload.disabled=loadButton.disabled=true;
     rowStatus.textContent='Checking current EPUB and verifying Owner authorization…';
     try{
      if(!window.GroundUpAdminPasswordConfirm?.ensure)throw Error('Owner password confirmation unavailable.');
      await window.GroundUpAdminPasswordConfirm.ensure();
      const history=await rpc(sb,'gu_owner_digital_history_v014304',{p_code:product.code});
      const candidates=(history.versions||[]).filter(v=>v.format==='epub'&&v.current===true&&v.fileExists===true);
      if(candidates.length!==1)throw Error('Exactly one current private EPUB is required.');
      const path=candidates[0].path;
      if(typeof path!=='string'||!new RegExp('^'+product.code+'/[a-f0-9-]{36}[.]epub$').test(path))
       throw Error('Unexpected private EPUB path.');
      await rpc(sb,'gu_owner_digital_books_save_v01430',{
       p_code:product.code,p_kdp_select:kdp.checked,
       p_exclusive_until:until.value?new Date(until.value).toISOString():null,
       p_sales:false,p_downloads:false,p_rights_attested:rights.checked,
       p_asset_path:path,p_expected_updated_at:product.version
      });
      asset=path;sales.checked=false;downloads.checked=false;
      rowStatus.textContent='Primary private EPUB assigned; customer downloads and sales remain OFF.';
      busy=false;await load();
     }catch(e){rowStatus.textContent='Primary EPUB not changed: '+(e.message||'Owner verification unavailable.')}
     finally{busy=false;prepare.disabled=save.disabled=upload.disabled=loadButton.disabled=false;}
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
    // Positive download acceptance for the Owner only. Does not select a
    // primary customer file, issue entitlements, or enable publishing.
    const previewFormat=el('select');previewFormat.setAttribute('aria-label','Private test format');
    for(const ext of ['epub','pdf']){
     const option=el('option',ext.toUpperCase());option.value=ext;previewFormat.append(option);
    }
    const previewButton=el('button','Test Private Download','btn secondary');
    previewButton.type='button';
    const previewResult=el('div',null,'small');
    previewResult.setAttribute('role','status');
    previewResult.setAttribute('aria-live','polite');
    let previewCleanup=null;
    previewButton.onclick=async()=>{
     if(busy)return;
     if(previewCleanup){clearTimeout(previewCleanup);previewCleanup=null}
     previewResult.replaceChildren();
     previewResult.textContent='Checking protected Owner access and the current private edition…';
     previewButton.disabled=true;
     try{
      if(!window.GroundUpAdminPasswordConfirm?.ensure)
       throw Error('Owner password confirmation unavailable.');
      await window.GroundUpAdminPasswordConfirm.ensure();
      const {data:auth,error:authError}=await sb.auth.getSession();
      if(authError||!auth?.session?.access_token)throw Error('Sign in again to test your book.');
      const format=previewFormat.value;
      const response=await fetch('/api/digital-book-owner-preview-v1',{
       method:'POST',cache:'no-store',
       headers:{authorization:'Bearer '+auth.session.access_token,'content-type':'application/json'},
       body:JSON.stringify({code:product.code,format})
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok||!result?.ok||typeof result.url!=='string')
       throw Error(result?.error||'Private download preview unavailable.');
      const u=new URL(result.url);
      if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||
       !u.pathname.startsWith('/storage/v1/object/sign/gu-digital-ebooks/'+product.code+'/'))
       throw Error('Private preview destination failed security validation.');
      const a=el('a','Open private '+format.toUpperCase()+' v'+result.version+' download (60 seconds)','btn secondary');
      a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';
      previewResult.replaceChildren(a);
      previewCleanup=setTimeout(()=>{
       a.remove();previewResult.textContent='Private preview link expired. Select Test Private Download again.';
      },60000);
     }catch(e){
      previewResult.textContent='Private preview unavailable: '+(e.message||'Owner authorization or file validation failed.');
     }finally{previewButton.disabled=false}
    };
    card.append(upload,prepare,historyButton,previewFormat,previewButton,previewResult,save,draftSave,historyList,rowStatus);
    // Reuse the existing guarded uploader inside Products > Books > Edit.
    // The selected book card moves to the editor; other books remain in Commerce.
    if(editorCode===product.code && editorTarget?.isConnected && document.getElementById('admin-dialog')?.open){
     activeEditorControls={code:product.code,hasPending:()=>currentState()!==savedState,save:()=>saveControls({reload:false}),sales:()=>sales.checked};
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
   hasPendingEditorChanges(code){return activeEditorControls?.code===code&&activeEditorControls.hasPending()},
   currentSales(code){return activeEditorControls?.code===code?activeEditorControls.sales():null},
   async saveEditor(code){if(activeEditorControls?.code!==code)throw Error('Protected eBook editor is not loaded. Open Edit again.');return activeEditorControls.save()},
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
   editorCode=null;editorTarget=null;activeEditorControls=null;
   // Return the edition controls to the original Commerce view after editing.
   if(!busy)void load();
  });
  return true;
}
let attempts=0;const t=setInterval(()=>{if(mount()||++attempts>80)clearInterval(t)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
