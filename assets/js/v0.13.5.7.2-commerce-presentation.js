/* Shared site/admin catalog presentation. Payment services and checkout remain separate APIs. */

/* v0.13.5-admin-books.js preserved module */
/* v0.13.5 controlled UI integration repair.
   Mounts INSIDE the existing catalog tab. No new top-level Admin child, no duplicate UI.
   Data remains read-only unless existing server controls authorize edits. */
(()=>{'use strict';
const $=(s,root=document)=>root.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const legacyCodes=new Set(['FOUNDATIONS_COMPLETE_BUNDLE']);
const area=()=>$('#v135-admin-books');
async function req(url,method='GET',data){
 const sb=await window.getSupabaseClient();
 const {data:{session}}=await sb.auth.getSession();
 if(!session)throw Error('Sign in to access the publishing catalog.');
 const response=await fetch(url,{method,cache:'no-store',headers:{authorization:'Bearer '+session.access_token,...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result.ok)throw Error(result.error||'Catalog unavailable.');
 return result;
}
function editableLine(key,label,value,kind='text'){
 const wrap=document.createElement('label');wrap.textContent=label;
 const input=kind==='multiline'?document.createElement('textarea'):document.createElement('input');
 input.name=key;input.value=value||'';
 if(kind==='url')input.type='url';
 input.required=['title','shortTitle','description'].includes(key);
 wrap.append(input);return wrap;
}
function descriptionCard(row,editable,load){
 const card=document.createElement('article');card.className='v135-card v135-admin-book';
 const title=esc(row.short_title||row.title),code=esc(row.product_code);
 const summary=String(row.description||'No product description has been entered yet.');
 const isBundle=row.product_type==='bundle';
 card.innerHTML=`<header><div><div class="eyebrow">${isBundle?'Bundle':'Book'}</div><h3>${title}</h3><small class="v135-code">${code}</small></div>
 <span class="v135-state ${row.direct_digital_enabled?'warning':''}">${isBundle?'Multi-volume collection':'Catalog record'}</span></header>
 <p class="v135-description-teaser">${esc(summary.slice(0,210))}${summary.length>210?'…':''}</p>
 <p class="v135-catalog-safeguards"><strong>KDP Select:</strong> ${row.kdp_select?'ON':'OFF'} <span aria-hidden="true">·</span> <strong>Direct digital:</strong> ${row.direct_digital_enabled?'ON':'OFF'}</p>
 <button class="btn secondary" type="button" data-expand aria-expanded="false">View details</button><div class="v135-book-details" data-details hidden></div>`;
 const button=$('[data-expand]',card),details=$('[data-details]',card);
 button.addEventListener('click',()=>{
   const open=details.hidden;details.hidden=!open;card.classList.toggle('is-expanded',open);
   button.setAttribute('aria-expanded',String(open));button.textContent=open?'Hide details':'View details';
   if(!open)return;
   details.replaceChildren();
   if(!editable){
     const data=[['Official title',row.title],['Short title',row.short_title],['Description',row.description],
       ['Amazon KDP draft listing (not yet live)',row.metadata?.amazon_listing_url],
       ['Amazon listing status',row.metadata?.amazon_listing_state],
       ['Kindle retailer URL',row.amazon_kindle_url],['Paperback retailer URL',row.amazon_paperback_url],['Hardcover retailer URL',row.amazon_hardcover_url]];
     for(const [name,value] of data){const dl=document.createElement('div');dl.className='v135-catalog-fact';
       const dt=document.createElement('strong');dt.textContent=name;
       const dd=document.createElement('p');dd.textContent=value||'Not configured';
       dl.append(dt,dd);details.append(dl);}
     const note=document.createElement('p');note.className='small';note.textContent='Read-only view. No account/security flags have been enabled, and no book content or publication rights are changed here.';details.append(note);
   }else{
     const form=document.createElement('form');form.className='v135-catalog-edit-form';
     for(const [key,label,value,kind] of [
       ['title','Title',row.title,'text'],['shortTitle','Short title',row.short_title,'text'],
       ['description','Description',row.description,'multiline'],
       ['amazonKindleUrl','Kindle retailer URL',row.amazon_kindle_url,'url'],
       ['amazonPaperbackUrl','Paperback retailer URL',row.amazon_paperback_url,'url'],
       ['amazonHardcoverUrl','Hardcover retailer URL',row.amazon_hardcover_url,'url']
     ])form.append(editableLine(key,label,value,kind));
     const note=document.createElement('p');note.className='small v135-catalog-form-note';
     note.textContent='Editing product metadata only. KDP, checkout, subscription, QR and MFA flags are unchanged.';
     const save=document.createElement('button');save.type='submit';save.className='btn';save.textContent='Save publishing metadata';
     form.append(note,save);
     form.addEventListener('submit',async event=>{
       event.preventDefault();save.disabled=true;
       try{
         const data={...Object.fromEntries(new FormData(form).entries()),productCode:row.product_code};
         const r=await req('/api/book-catalog-v0135?action=update_book','POST',data);
         const status=$('[data-v135-status]',area());status.textContent=r.notice||'Metadata saved.';
         await load();
       }catch(error){$('[data-v135-status]',area()).textContent=error.message;save.disabled=false;}
     });details.append(form);
   }
 });return card;
}
async function load(){const holder=area();if(!holder)return;const message=$('[data-v135-status]',holder);
 try{
   const data=await req('/api/book-catalog-v0135');
   const list=$('[data-v135-list]',holder);list.replaceChildren();
   const records=data.products||[],hasCanonical=records.some(x=>x.product_code==='FOUNDATIONS_COMPLETE_SERIES');
   const hiddenLegacy=hasCanonical?records.filter(x=>legacyCodes.has(x.product_code)):[];
   const visible=records.filter(x=>!hasCanonical||!legacyCodes.has(x.product_code));
   const banner=$('[data-v135-banner]',holder);
   banner.textContent=data.synthetic?'SHOWCASE — synthetic catalog only. No production records or entitlements.':
       data.writesEnabled?'Catalog editing is enabled for this verified staff session. Checkout and KDP flags remain restricted.':
       'Read-only publishing catalog. Editing requires an authorized staff session, a verified MFA factor, and the separate owner-controlled edit flag.';
   if(!visible.length){list.textContent='No published catalog records are available.';}
   else visible.forEach(x=>list.append(descriptionCard(x,data.writesEnabled,load)));
   const n=$('[data-v135-counts]',holder);
   n.textContent=`${records.length} catalog records · ${visible.length} distinct catalog entries displayed · ${(data.editions||[]).length} edition records · ${(data.campaigns||[]).length} QR campaigns.`;
   const legacy=$('[data-v135-legacy]',holder);
   legacy.hidden=!hiddenLegacy.length;
   legacy.textContent=hiddenLegacy.length?`${hiddenLegacy.length} legacy bundle alias retained in the database (not shown as a second product). No records were deleted.`:'';
   const catalogPanel=holder.closest('[data-admin-panel="catalog"]');
   if(catalogPanel){catalogPanel.dataset.v135CatalogReady='true';}
   message.textContent='';
 }catch(error){message.textContent=error.message;
   const panel=holder.closest('[data-admin-panel="catalog"]');
   if(panel)delete panel.dataset.v135CatalogReady;}
}
function mount(){
 const catalog=document.querySelector('.admin-main [data-admin-panel="catalog"]');
 if(!catalog)return false;
 let holder=area();
 if(holder){if(holder.parentElement!==catalog)catalog.append(holder);return true;}
 holder=document.createElement('section');holder.id='v135-admin-books';
 holder.className='v135 v135-admin-catalog-integrated';
 holder.innerHTML=`<div class="v135-catalog-title"><div class="eyebrow">Books & Publishing</div><h2>Catalog and Editions</h2><p>Product descriptions, approved retailer links and edition visibility. This panel never modifies manuscript text.</p></div>
 <p class="small" data-v135-banner></p><p class="small" data-v135-counts></p>
 <p class="small" data-v135-legacy hidden></p><p class="v135-status" data-v135-status role="status" aria-live="polite"></p>
 <div data-v135-list class="v135-card-grid v135-admin-catalog-grid"></div>`;
 catalog.append(holder);
 load();return true;
}
function init(){if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
 if(mount())return;
 const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(()=>observer.disconnect(),10000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* v0.13.5.3-book-sales.js preserved module */
/* v0.13.5.3 owner book sales enhancer; preserves existing Books & Sales advanced controls. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let books=new Map(),fetching=false;
async function api(action,body){const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in as Owner.');const r=await fetch('/api/admin-book-pricing-v01353?action='+action,{method:body?'POST':'GET',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Unable to update book sales.');return j}
const dollar=n=>(Number(n||0)/100).toFixed(2);
const money=s=>{const n=Number(s);return Number.isFinite(n)?Math.round(n*100):NaN};
function enhance(card,row){if(card.dataset.v1353Sales==='1')return;
 const status=$('[data-k="salesStatus"]',card),save=$('[data-save]',card);if(!status||!save)return;
 card.dataset.v1353Sales='1';
 const opt=document.createElement('option');opt.value='selling';opt.textContent='Selling (active listing)';status.options.add(opt,1);
 status.value=['selling','on_sale','paused','retired','coming_soon'].includes(row.sales_status)?row.sales_status:'coming_soon';
 const meta=row.metadata||{},base=meta.list_price_cents??meta.website_price_cents??0;
 const fields=document.createElement('div');fields.className='v1353-book-pricing';
 fields.innerHTML=`<label>Regular website reference price (USD)<input data-v1353-base type="number" min="0" step="0.01" value="${esc(dollar(base))}"></label>
 <fieldset data-v1353-promo hidden><legend>On Sale — website reference discount</legend>
 <label>Discount calculation<select data-v1353-mode><option value="price">Sale price ($)</option><option value="percent">Percent off (%)</option></select></label>
 <label data-v1353-amount-label>Sale price ($)<input data-v1353-amount type="number" min="0.01" step="0.01" value="${esc(dollar(meta.sale_price_cents??0))}"></label>
 <p data-v1353-preview class="small"></p></fieldset>
 <p class="small v1353-book-caution">Website pricing only. Amazon/KDP prices must be changed in KDP and verified separately. This panel does not activate website checkout or digital book sales.</p>`;
 const target=$('.actions',card);target?.before(fields);
 const promo=$('[data-v1353-promo]',fields),mode=$('[data-v1353-mode]',fields),amount=$('[data-v1353-amount]',fields),baseInput=$('[data-v1353-base]',fields),label=$('[data-v1353-amount-label]',fields),preview=$('[data-v1353-preview]',fields);
 if(meta.sale_discount_mode==='percent'){mode.value='percent';amount.value=Number(meta.sale_discount_percent||0).toString()}
 const update=()=>{promo.hidden=status.value!=='on_sale';label.firstChild.textContent=mode.value==='percent'?'Discount off (%)':'Sale price ($)';
 const b=money(baseInput.value),a=Number(amount.value),discount=mode.value==='percent'?Math.round(b*(1-a/100)):money(amount.value);
 preview.textContent=Number.isFinite(discount)&&discount>=0&&b>0?`Website promotional reference: $${dollar(discount)} (regular $${dollar(b)})`:'Enter a regular price and a valid discount.'};
 [status,baseInput,mode,amount].forEach(x=>x.addEventListener('input',update));update();
 save.textContent='Save Selling Status & Pricing';
}
async function refresh(){const h=$('#v13-booksales');if(!h||fetching||!h.querySelector('[data-book]'))return;fetching=true;
 try{const data=await api('list');books=new Map((data.books||[]).map(x=>[x.product_code,x]));$$('[data-book]',h).forEach(card=>{const row=books.get(card.dataset.book);if(row)enhance(card,row)});
 if(!h.querySelector('[data-v1353-main-note]')){const n=document.createElement('p');n.dataset.v1353MainNote='1';n.className='small v1353-books-banner';n.textContent=data.synthetic?'SHOWCASE: synthetic records; read-only.':'Selling means listed for sale; On Sale means discounted. An Amazon listing and its actual price must be verified in KDP. No checkout flags are enabled.';h.prepend(n)}
 }catch(err){const status=h.querySelector('.status-message');if(status)status.textContent=err.message}finally{fetching=false}}
let waiting=false;function schedule(){if(waiting)return;waiting=true;setTimeout(()=>{waiting=false;refresh()},250)}
// Capturing interceptor prevents the legacy Save listener from writing away the
// new Selling status or overwriting the website reference discount.
document.addEventListener('click',async ev=>{const save=ev.target.closest?.('#v13-booksales [data-book] [data-save]');if(!save)return;
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();const card=save.closest('[data-book]');const get=k=>$(`[data-k="${k}"]`,card),msg=$('.status-message',card);const base=money($('[data-v1353-base]',card)?.value),sale=get('salesStatus').value;
 const mode=$('[data-v1353-mode]',card).value,amount=$('[data-v1353-amount]',card).value;
 const body={productCode:card.dataset.book,salesStatus:sale,storeVisible:get('storeVisible').checked,
 amazonKindleEnabled:get('amazonKindleEnabled').checked,amazonPaperbackEnabled:get('amazonPaperbackEnabled').checked,amazonHardcoverEnabled:get('amazonHardcoverEnabled').checked,
 websiteCheckoutEnabled:get('websiteCheckoutEnabled').checked,lemonVariantId:get('lemonVariantId').value,
 listPriceCents:base,discountMode:mode,discountPercent:Number(amount),salePriceCents:money(amount)};
 save.disabled=true;msg.textContent='Saving...';try{const result=await api('save',body);msg.textContent=result.notice||'Saved.';books.get(card.dataset.book).sales_status=sale;save.disabled=false}catch(err){msg.textContent=err.message;save.disabled=false}
},true);
function init(){const el=$('#v13-booksales');if(!el)return setTimeout(init,500);
 const ob=new MutationObserver(()=>schedule());ob.observe(el,{childList:true,subtree:true});schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* v0.13.5.4-replay-price.js preserved module */
/* Accurate $19.99 Historical Replay option; never presents a live checkout. */
(()=>{'use strict';if(!['/store.html','/membership.html','/store','/membership'].includes(location.pathname.toLowerCase()))return;
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function amendMembership(){for(const c of document.querySelectorAll('#membership-plans .v11-plan')){if(!/Historical Replay Learning/i.test(c.textContent))continue;c.dataset.v1354Replay='1';const bullets=c.querySelectorAll('li');if(bullets[1])bullets[1].textContent='Historical Replay Learning using your own authorized thinkorswim OnDemand';if(bullets[2])bullets[2].textContent='No book files, proprietary simulator, or full-platform premium tools';const a=c.querySelector('a.btn');if(a&&!a.getAttribute('href')){a.textContent='Enrollment Opening Soon';a.setAttribute('aria-disabled','true')}}}
async function addStore(){const node=document.querySelector('#store-plans');if(!node||node.querySelector('[data-v1354-replay]'))return;const sb=await window.getSupabaseClient();const {data,error}=await sb.from('platform_plans').select('plan_code,name,description,price_cents,checkout_enabled').eq('plan_code','ONDEMAND_MONTHLY').eq('public_visible',true).eq('active',true).maybeSingle();if(error||!data)return;const el=document.createElement('article');el.className='v11-plan';el.dataset.v1354Replay='1';el.innerHTML=`<div class="eyebrow">${e(data.name)}</div><div class="v11-price">$${(Number(data.price_cents)/100).toFixed(2)} <small>/month</small></div><p>${e(data.description)}</p><ul><li>Guided Historical Replay Training</li><li>Use your own authorized thinkorswim OnDemand</li><li>Excludes book files and proprietary simulator</li></ul><span class="btn disabled-buy" aria-disabled="true">Enrollment Opening Soon</span>`;node.append(el)}
function init(){let n=0;const timer=setInterval(()=>{if(location.pathname.toLowerCase().includes('membership')){amendMembership();if(document.querySelector('#membership-plans .v11-plan'))clearInterval(timer)}else if(document.querySelector('#store-products .product-card')||++n>25){addStore().catch(()=>{});clearInterval(timer)}if(++n>45)clearInterval(timer)},250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();})();

