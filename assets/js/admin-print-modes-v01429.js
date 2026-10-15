/* v31 compatibility: OWNER signed author-copy offering and optional Lulu are separate from new Stripe fulfillment. */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,content,cls)=>{const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(cls)node.className=cls;return node};
async function call(name,args){const client=await window.getSupabaseClient();const {data,error}=await client.rpc(name,args||{});if(error)throw Error(error.message||'Supabase print settings unavailable');if(!data||data.ok!==true)throw Error('Print settings unavailable');return data}
function attach(){if(document.querySelector('[data-gu-signed-print-v01429]'))return true;
 const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 const box=el('section',undefined,'admin-card');box.dataset.guSignedPrintV01429='1';
 box.append(el('h2','Signed author-copy offerings / Lulu Direct (optional)'),
  el('p','Set author-signed edition availability and independent Lulu checkout availability. Signed book prices, payment activation, KDP ordering, signing, and shipping are managed in the separate Signed Books section below. Lulu purchases are not signed by the author.'));
 const note=el('p','Load the current print options. Saving requires current OWNER privileges and MFA (AAL2).','small');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
 const loadButton=el('button','Load / Refresh Signed & Lulu Settings','btn secondary');loadButton.type='button';
 const list=el('div',undefined,'gu-print-modes-list');box.append(loadButton,note,list);panel.append(box);
 let busy=false;
 async function refresh(){if(busy)return;busy=true;loadButton.disabled=true;note.textContent='Loading authoritative book settings…';list.replaceChildren();
  try{const data=await call('gu_owner_print_modes_get_v01429');
   for(const product of data.products||[]){const row=el('article',undefined,'gu-print-row');row.append(el('h3',product.title||product.productCode));
    const signedLabel=el('label');const signed=document.createElement('input');signed.type='checkbox';signed.checked=product.signedAvailable===true;
    signedLabel.append(signed,document.createTextNode(' Offer author-signed editions when payments are configured'));
    const luluLabel=el('label');const lulu=document.createElement('input');lulu.type='checkbox';lulu.checked=product.luluEnabled===true;
    luluLabel.append(lulu,document.createTextNode(' Enable Lulu Direct checkout (configured print formats only)'));
    const state=el('p','Lulu paperback link: '+(product.hasPaperbackLulu?'configured':'not configured')+' · hardcover: '+(product.hasHardcoverLulu?'configured':'not configured'),'small');
    const save=el('button','Save Fulfillment Preferences','btn');save.type='button';const msg=el('p','Signed checkout activation and prices are managed separately below.','small');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
    save.addEventListener('click',async()=>{if(busy)return;if(!product.updatedAt){msg.textContent='Missing concurrency token. Refresh first.';return}
      busy=true;save.disabled=loadButton.disabled=true;msg.textContent='Saving OWNER preferences and audit record…';
      try{await call('gu_owner_print_modes_save_v01429',{p_product_code:product.productCode,p_signed_available:signed.checked,p_lulu_enabled:lulu.checked,p_expected_updated_at:product.updatedAt});msg.textContent='Saved. Refreshing…';busy=false;await refresh()}
      catch(e){msg.textContent=e.message||'Save failed; check OWNER permissions, MFA or links.'}
      finally{busy=false;save.disabled=loadButton.disabled=false}
    });row.append(signedLabel,luluLabel,state,save,msg);list.append(row);
   }
   note.textContent=(data.products||[]).length+' books loaded. Lulu enablement is independent. Use Signed Books for payment activation and manual author-copy fulfillment.';
  }catch(e){note.textContent='Fulfillment preferences unavailable: '+(e.message||'reviewed migration and OWNER account required')}
  finally{busy=false;loadButton.disabled=false}
 }
 loadButton.addEventListener('click',refresh);return true;
}
let n=0;const timer=setInterval(()=>{if(attach()||++n>100)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
