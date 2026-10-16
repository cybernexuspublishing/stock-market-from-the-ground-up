/* Owner-only signed physical offer editor and manual KDP order queue. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
const E=(tag,value,cls)=>{const x=document.createElement(tag);if(value!=null)x.textContent=value;if(cls)x.className=cls;return x};
async function rpc(name,args={}){const sb=await window.getSupabaseClient(),{data,error}=await sb.rpc(name,args);if(error)throw Error(error.message||'Operation denied');if(!data?.ok)throw Error('Unexpected authorization response');return data}
async function ownerShipping(orderId){const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)throw Error('OWNER password confirmation sign-in required.');let r=await fetch('/api/signed-book-owner-detail?id='+encodeURIComponent(orderId),{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'}),d=await r.json();
 if(r.status===403&&d.error==='PASSWORD_RECONFIRM_REQUIRED'&&window.GroundUpAdminPasswordConfirm){await window.GroundUpAdminPasswordConfirm.ensure();r=await fetch('/api/signed-book-owner-detail?id='+encodeURIComponent(orderId),{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});d=await r.json()}
 if(!r.ok||!d.ok)throw Error(d.error||'Address access denied.');return d}
function attach(){if(document.querySelector('[data-gu-signed-admin-v01431]'))return true;
 const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 const box=E('section',null,'admin-card gu-signed-admin-v01431');box.dataset.guSignedAdminV01431='1';
 const legacy=document.querySelector('[data-gu-signed-print-v01429]');if(legacy){const note=legacy.querySelector('p');if(note)note.textContent='Signed author-copy checkout is controlled by the separate Stripe payment switch and per-edition offer settings below. Lulu Direct can be disabled independently without deleting its URLs.';}box.append(E('h2','Author-Signed Books — Prices & Fulfillment'),E('p','Set your own paperback/hardcover signed prices and shipping. Orders are manually fulfilled: order KDP author copies to your address, sign, pack and separately ship to customers. Stripe payment stays OFF until the Owner enables its backend and server controls.'));
 const status=E('p','OWNER password confirmation required to change prices or reveal shipping details.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const refresh=E('button','Refresh Offers & Paid Orders','btn secondary');refresh.type='button';
 const offers=E('div',null,'gu-signed-offers'),orders=E('div',null,'gu-signed-orders');const switchWrap=E('div',null,'gu-signed-payment-switch');box.append(refresh,status,switchWrap,E('h3','Signed Editions'),offers,E('h3','Paid Orders & KDP Signing Queue'),orders);panel.append(box);
 let busy=false;
 async function update(){if(busy)return;busy=true;refresh.disabled=true;offers.replaceChildren();orders.replaceChildren();status.textContent='Loading OWNER-authorized orders and prices…';
 try{
  const [offersData,ordersData,payStatus]=await Promise.all([rpc('gu_signed_owner_offers_v01431'),rpc('gu_signed_owner_orders_v01431'),rpc('gu_signed_owner_payment_switch_get_v01431')]);
  switchWrap.replaceChildren();const switchLabel=E('label','Enable Stripe signed-book checkout after completing provider tests and publishing customer terms');const master=E('input');master.type='checkbox';master.checked=payStatus.enabled===true;const saveMaster=E('button','Save Checkout Switch','btn secondary');saveMaster.type='button';const switchMsg=E('p','The Cloudflare environment flag ENABLE_SIGNED_BOOK_STRIPE must also be set, and Stripe Tax must be configured.','small');switchLabel.append(master);switchWrap.append(switchLabel,saveMaster,switchMsg);
  saveMaster.onclick=async()=>{saveMaster.disabled=true;try{await rpc('gu_signed_owner_payment_switch_save_v01431',{p_enabled:master.checked});switchMsg.textContent='Saved & audited; runtime environment flag is still separately required.'}catch(e){switchMsg.textContent=e.message}finally{saveMaster.disabled=false}};
  for(const item of offersData.offers||[]){const card=E('article',null,'gu-signed-card');card.append(E('h4',item.title+' — '+item.format));
   const price=E('input'),shipping=E('input'),enabled=E('input');price.type=shipping.type='number';price.min='0';shipping.min='0';price.max='2500';shipping.max='1000';price.step=shipping.step='0.01';price.value=(item.priceCents/100).toFixed(2);shipping.value=(item.shippingCents/100).toFixed(2);enabled.type='checkbox';enabled.checked=!!item.enabled;
   const label=(txt,field)=>{const l=E('label',txt);l.append(field);return l};
   const button=E('button','Save Edition Offer','btn');button.type='button';const msg=E('p',null,'small');msg.setAttribute('role','status');
   button.onclick=async()=>{if(busy)return;const p=Number(price.value),s=Number(shipping.value);if(!Number.isFinite(p)||!Number.isFinite(s)||p<0||s<0){msg.textContent='Enter valid prices.';return}
    busy=true;button.disabled=refresh.disabled=true;try{await rpc('gu_signed_owner_offer_save_v01431',{p_code:item.code,p_edition:item.format,p_price:Math.round(p*100),p_shipping:Math.round(s*100),p_enable:enabled.checked,p_expected_updated_at:item.updatedAt});msg.textContent='Saved. Refreshing…';busy=false;await update()}catch(e){msg.textContent=e.message}finally{busy=false;refresh.disabled=false;button.disabled=false}};
   card.append(label('Signed price (USD)',price),label('US shipping/handling (USD)',shipping),label('Enable this signed edition',enabled),button,msg);offers.append(card);
  }
  for(const order of ordersData.orders||[]){const card=E('article',null,'gu-signed-card'),title=E('h4','@'+(order.username||'Unavailable')+' — '+order.code+' — '+order.edition),info=E('p','Payment: '+order.status+' · Fulfillment: '+order.fulfillment+' · '+((order.paidTotalCents||0)/100).toFixed(2)+' USD');card.append(title,info);
   if(order.trackingCode)card.append(E('p','Tracking: '+order.trackingCarrier+' '+order.trackingCode));
   if(order.status==='paid'||order.status==='on_hold'){const hold=E('button',order.status==='paid'?'Place Order on Hold':'Resume Paid Order','btn secondary');hold.type='button';const hs=E('p',null,'small');hold.onclick=async()=>{hold.disabled=true;try{await rpc('gu_signed_owner_hold_v01431',{p_id:order.id,p_hold:order.status==='paid',p_expected_updated_at:order.updatedAt});hs.textContent='Order state audited; refresh queue.'}catch(e){hs.textContent=e.message}finally{hold.disabled=false}};card.append(hold,hs)}
   const ship=E('button','View Private Shipping Address','btn secondary'),address=E('div',null,'gu-shipping-address');ship.type='button';ship.onclick=async()=>{ship.disabled=true;address.textContent='Loading shipping details securely…';try{const d=await ownerShipping(order.id),a=d.address;address.replaceChildren(E('p',d.recipient),E('p',[a.line1,a.line2,a.city,a.state,a.postalCode,a.country].filter(Boolean).join(', ')),E('p',d.phone||''));}catch(e){address.textContent=e.message}finally{ship.disabled=false}};card.append(ship,address);
   if(order.status==='paid'&&order.fulfillment!=='delivered'){
    const stages=['not_started','ordered_from_kdp','received_by_author','signed','packed','shipped','delivered'],index=stages.indexOf(order.fulfillment),next=stages[index+1];
    if(next){const nextBtn=E('button','Mark '+next.replaceAll('_',' '),'btn'),msg=E('p',null,'small');nextBtn.type='button';nextBtn.onclick=async()=>{nextBtn.disabled=true;let carrier=null,tracking=null;if(next==='shipped'){carrier=window.prompt('Shipping carrier (USPS, UPS, etc.)');tracking=window.prompt('Tracking reference');if(!carrier||!tracking){nextBtn.disabled=false;return}}
      try{await rpc('gu_signed_owner_transition_v01431',{p_id:order.id,p_next:next,p_expected_updated_at:order.updatedAt,p_carrier:carrier,p_tracking:tracking});msg.textContent='Transition audited.';await update()}catch(e){msg.textContent=e.message}finally{nextBtn.disabled=false}};card.append(nextBtn,msg)}
   }
   orders.append(card);
  }
  status.textContent=(offersData.offers||[]).length+' edition offers; '+(ordersData.orders||[]).length+' paid/flagged orders. Buyer addresses are retrieved from Stripe only on demand.';
 }catch(e){status.textContent='Signed-book administration unavailable: '+e.message}
 finally{busy=false;refresh.disabled=false}
 }
 refresh.onclick=update;return true;
}
let tick=0;const timer=setInterval(()=>{if(attach()||++tick>100)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
