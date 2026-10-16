/* v0.14.0.37 | Stripe products entered in Dashboard – clear, read-only administrative overview.
 * Real Stripe validation is performed by /api/stripe-product-readiness-v01437 with OWNER/ADMIN authorization.
 * No frontend Price ID editor, secrets, payment activation, entitlements or provider changes.
 */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname)||window.GroundUpStripeCatalogV01437)return;
 const q=(s,r=document)=>r.querySelector(s),el=(t,s,c)=>{const n=document.createElement(t);if(s!==undefined)n.textContent=s;if(c)n.className=c;return n};
 const money=n=>Number(n/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
 const valid=()=>{const b=q('#admin-tabs button[data-panel="commerce"]');return q('#admin-gate')?.hidden===true&&q('#admin-app')?.hidden===false&&!!b&&!b.hidden&&!b.disabled&&!b.closest('[hidden]')&&!b.classList.contains('cc-owner-hidden')&&b.getAttribute('aria-disabled')!=='true'};
 const state={products:[],rendered:false};
 const wrap=el('section',undefined,'gu37-stripe-catalog');wrap.id='gu37-stripe-catalog';wrap.setAttribute('aria-label','Stripe products and prices');
 const heading=el('h2','Stripe Products & Prices');
 const description=el('p','These eight products were entered in your Stripe dashboard. Stripe Product IDs (prod_) are recorded; individual Price IDs (price_) and payment access are not yet verified.');
 const buttons=el('div',undefined,'gu37-actions');
 const refresh=el('button','Check Stripe Connection','btn secondary');refresh.type='button';
 const status=el('p','Stripe products recorded from your screenshot. Verify the sandbox connection before enabling any checkout.','gu37-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const tableContainer=el('div',undefined,'gu37-table-wrap');
 const tax=el('aside','Tax classification review required: the Annual Full Membership currently uses a training-service code while the Monthly Full Membership uses a general digital-service code. Confirm the correct product tax codes for BOTH recurring offers with Stripe or a qualified tax professional before accepting payments.','gu37-tax-warning');
 const note=el('p','Important: Active in Stripe does NOT mean this website can take payments. Live checkout remains disabled pending webhook, subscription, refund, digital-rights and account security testing.','gu37-checkout-warning');
 buttons.append(refresh);wrap.append(heading,description,buttons,status,tax,tableContainer,note);
 function render(items,remote){const table=el('table');const cap=el('caption','Stripe catalog entries — payment activation is not implied');table.append(cap);
  const head=el('thead'),tr=el('tr');for(const k of ['Product','Expected price','Stripe Product ID','Stripe Price ID','Verification']){const th=el('th',k);th.scope='col';tr.append(th)}head.append(tr);table.append(head);
  const body=el('tbody');for(const item of items){const verification=remote?.products?.find(p=>p.sku===item.sku);const row=el('tr');
   row.dataset.guStripeSku=item.sku;
   const details=el('td');details.append(el('strong',item.display_name),el('small',item.sku));row.append(details);
   row.append(el('td',money(item.price_cents)+(item.billing_interval==='one_time'?' · once':' / '+item.billing_interval)));
   const id=el('td');const code=el('code',item.stripe_product_id);id.append(code);row.append(id);
   row.append(el('td',verification?.priceMapped?'Configured in Cloudflare':'Not connected — need price_ ID'));
   const txt=verification?(verification.priceVerified?'Validated in Stripe sandbox':verification.reason||'Verification incomplete'):'Entered in Dashboard; Stripe API not checked';
   const verdict=el('td',txt);verdict.dataset.guStripeVerified=verification?.priceVerified?'yes':'no';row.append(verdict);body.append(row)}
  table.append(body);tableContainer.replaceChildren(table);
 }
 async function load(){try{const r=await fetch('/data/stripe-product-registry-v01437.json',{cache:'no-store'});if(!r.ok)throw Error();const j=await r.json();if(j.version!=='0.14.0.37'||!Array.isArray(j.products)||j.products.length!==8)throw Error();state.products=j.products;render(j.products,null)}catch{status.textContent='Stripe product list unavailable. Please check website release consistency.'}}
 async function verify(){refresh.disabled=true;status.textContent='Checking your authorized Stripe sandbox account and Price ID mappings…';try{
  const sb=await window.getSupabaseClient?.();const session=(await sb?.auth?.getSession?.())?.data?.session;
  if(!session)throw Error('Sign in to Admin first.');
  const r=await fetch('/api/stripe-product-readiness-v01437',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Stripe verification unavailable.');
  render(state.products,j);
  status.textContent=`${j.verifiedProductCount} of 8 products verified in Stripe sandbox; ${j.verifiedPriceCount} of 8 prices verified. Stripe Price IDs configured: ${j.priceMappedCount} of 8. ${j.environment}.`;
 }catch(e){status.textContent=e.message||'Stripe verification unavailable.'}finally{refresh.disabled=false}}
 refresh.addEventListener('click',verify);
 function mount(){if(state.rendered||!valid())return;const parent=q('.gu33-payment-hub')||q('.admin-panel[data-admin-panel="commerce"]');if(!parent)return;
  if(q('#gu37-stripe-catalog')){state.rendered=true;return}state.rendered=true;
  const legacy=q('.gu33-legacy-warning',parent);if(legacy)legacy.before(wrap);else parent.append(wrap);
  load();window.GroundUpStripeCatalogV01437={version:'0.14.0.37',refresh:verify};
 }
 let attempts=0;const timer=setInterval(()=>{if(state.rendered||++attempts>180){clearInterval(timer);return}mount()},250);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
