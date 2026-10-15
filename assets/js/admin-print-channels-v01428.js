/* v0.14.0.28 — OWNER print-provider channel editor.
 * Edits only Lulu Direct paperback/hardcover checkout links.
 * PostgreSQL RPC enforces live OWNER authority, concurrent updates and atomic audit.
 * NEVER handles card data, order shipping addresses, Kindle manuscripts or KDP credentials.
 */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const text=(tag,content,className)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=content;if(className)n.className=className;return n};
const providerURL=value=>{if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='lulu.com'||u.hostname.endsWith('.lulu.com'))&&!u.username&&!u.password&&(!u.port||u.port==='443')&&u.href.length<=1800}catch{return false}};
async function rpc(name,args){const supabase=await window.getSupabaseClient();const {data,error}=await supabase.rpc(name,args||{});if(error)throw new Error(error.message||'Print catalog database unavailable.');if(!data?.ok)throw new Error('Unexpected print catalog response.');return data}
function mount(){if(document.querySelector('[data-gu-print-owner-v01428]'))return true;
 const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 const box=text('section',undefined,'admin-card gu-print-owner-v01428');box.dataset.guPrintOwnerV01428='1';
 box.append(text('h2','Print Book Sales — Lulu Direct'),text('p','Configure separate paperback and hardcover checkouts for each published title. Lulu securely takes the payment, calculates shipping/taxes, prints, and ships. Kindle eBook distribution is separate.'));
 const note=text('p','Not configured. This panel requires the reviewed v0.14.0.28 database migration and an eligible OWNER account.','small');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
 const actions=text('div',undefined,'gu-print-actions'),refresh=text('button','Load / Refresh Print Titles','btn secondary');refresh.type='button';actions.append(refresh);
 const list=text('div',undefined,'gu-print-owner-list');box.append(actions,note,list);panel.append(box);
 let busy=false;
 async function load(){if(busy)return;busy=true;refresh.disabled=true;note.textContent='Loading the authoritative catalog from Supabase…';list.replaceChildren();
  try{const result=await rpc('gu_owner_print_catalog_get_v01428');
   for(const product of result.products||[]){const card=text('article',undefined,'gu-print-row'),heading=text('h3',product.title||product.productCode),meta=text('p','Code: '+product.productCode+' · '+(product.printEnabled?'Print channel active':'Print channel inactive'),'small');
    const pb=text('input'),hc=text('input');pb.type='url';hc.type='url';pb.autocomplete=hc.autocomplete='off';pb.placeholder='https://…lulu.com/…';hc.placeholder='https://…lulu.com/…';pb.maxLength=hc.maxLength=1800;
    pb.value=product.paperback||'';hc.value=product.hardcover||'';const pbLabel=text('label','Paperback Lulu checkout URL'),hcLabel=text('label','Hardcover Lulu checkout URL');pbLabel.append(pb);hcLabel.append(hc);
    const save=text('button','Save Print Channels','btn');save.type='button';const rowStatus=text('p','Only a verified Lulu Direct checkout link can activate a print format.','small');rowStatus.setAttribute('role','status');rowStatus.setAttribute('aria-live','polite');
    save.addEventListener('click',async()=>{if(busy)return;const paperback=pb.value.trim(),hardcover=hc.value.trim();if(!providerURL(paperback)||!providerURL(hardcover)){rowStatus.textContent='Only secure Lulu Direct URLs are accepted. Fix the link and retry.';return}
     if(!product.updatedAt){rowStatus.textContent='Product has no concurrency version. Refresh to verify.';return}
     busy=true;save.disabled=refresh.disabled=true;rowStatus.textContent='Saving in one audited database transaction…';
     try{await rpc('gu_owner_print_catalog_save_v01428',{
      p_product_code:product.productCode,p_paperback:paperback,p_hardcover:hardcover,p_expected_updated_at:product.updatedAt
     });rowStatus.textContent='Saved and audited. Reloading catalog to confirm server state…';busy=false;await load()}
     catch(e){rowStatus.textContent=e.message||'Save failed. Refresh and retry.'}
     finally{busy=false;save.disabled=false;refresh.disabled=false}
    });
    card.append(heading,meta,pbLabel,hcLabel,save,rowStatus);list.append(card);
   }
   note.textContent=(result.products||[]).length+' book titles loaded. These links are not Amazon KDP author-copy orders and do not grant EPUB downloads.';
  }catch(e){note.textContent='Print-channel management unavailable: '+(e.message||'authorized service required')}
  finally{busy=false;refresh.disabled=false}
 }
 refresh.addEventListener('click',load);return true;
}
let attempts=0;const poll=setInterval(()=>{if(mount()||++attempts>80)clearInterval(poll)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
