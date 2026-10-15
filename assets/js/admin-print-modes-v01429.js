/* v0.14.0.29 — OWNER-controlled signed-author-copy offering and optional Lulu.
 * Signed author-copy payments and an ordering queue are NOT active: no false
 * payment promises, address collection, or Amazon automation.
 */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,content,cls)=>{const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(cls)node.className=cls;return node};
async function call(name,args){const client=await window.getSupabaseClient();const {data,error}=await client.rpc(name,args||{});if(error)throw Error(error.message||'Supabase print settings unavailable');if(!data||data.ok!==true)throw Error('Print settings unavailable');return data}
function attach(){if(document.querySelector('[data-gu-signed-print-v01429]'))return true;
 const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 const box=el('section',undefined,'admin-card');box.dataset.guSignedPrintV01429='1';
 box.append(el('h2','Signed author-copy orders (preferred) / Lulu Direct (optional)'),
  el('p','Author-signed paperback and hardcover orders will be fulfilled manually: customer pays the website after verified checkout, you order an author copy from KDP, sign it and ship it. Payment and shipping-order automation are not active yet. Lulu Direct can be independently enabled or disabled without erasing its stored links.'));
 const note=el('p','Load the current print options. Saving requires current OWNER privileges and MFA (AAL2).','small');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
 const loadButton=el('button','Load / Refresh Signed & Lulu Settings','btn secondary');loadButton.type='button';
 const list=el('div',undefined,'gu-print-modes-list');box.append(loadButton,note,list);panel.append(box);
 let busy=false;
 async function refresh(){if(busy)return;busy=true;loadButton.disabled=true;note.textContent='Loading authoritative book settings…';list.replaceChildren();
  try{const data=await call('gu_owner_print_modes_get_v01429');
   for(const product of data.products||[]){const row=el('article',undefined,'gu-print-row');row.append(el('h3',product.title||product.productCode));
    const signedLabel=el('label');const signed=document.createElement('input');signed.type='checkbox';signed.checked=product.signedAvailable===true;
    signedLabel.append(signed,document.createTextNode(' Show signed author-copy edition availability (no checkout yet)'));
    const luluLabel=el('label');const lulu=document.createElement('input');lulu.type='checkbox';lulu.checked=product.luluEnabled===true;
    luluLabel.append(lulu,document.createTextNode(' Enable Lulu Direct checkout (only for configured formats)'));
    const state=el('p','Lulu paperback link: '+(product.hasPaperbackLulu?'configured':'not configured')+' · hardcover: '+(product.hasHardcoverLulu?'configured':'not configured'),'small');
    const save=el('button','Save Fulfillment Preferences','btn');save.type='button';
    const msg=el('p','Signed orders cannot accept payments until the separate physical-goods processor and verified order queue are live.','small');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
    save.addEventListener('click',async()=>{if(busy)return; if(!product.updatedAt){msg.textContent='Missing concurrency token; refresh first.';return}
      busy=true;save.disabled=true;loadButton.disabled=true;msg.textContent='Saving OWNER preferences and audit record…';
      try{await call('gu_owner_print_modes_save_v01429',{p_product_code:product.productCode,p_signed_available:signed.checked,
        p_lulu_enabled:lulu.checked,p_expected_updated_at:product.updatedAt});
        msg.textContent='Saved. Refreshing values…';busy=false;await refresh();
      }catch(error){msg.textContent=error.message||'Save failed; check OWNER permissions, MFA or links.'}
      finally{busy=false;save.disabled=false;loadButton.disabled=false}
    });
    row.append(signedLabel,luluLabel,state,save,msg);list.append(row);
   }
   note.textContent=(data.products||[]).length+' books loaded. Default signed author-copy fulfillment is manual. Lulu is optional. No signed-book website payments are enabled.';
  }catch(error){note.textContent='Fulfillment options unavailable: '+(error.message||'reviewed migration and OWNER account required');}
  finally{busy=false;loadButton.disabled=false}
 }
 loadButton.addEventListener('click',refresh);return true;
}
let n=0;const timer=setInterval(()=>{if(attach()||++n>100)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
