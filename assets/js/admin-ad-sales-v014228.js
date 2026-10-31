/* v0.14.0.228 Sponsor & Advertising Center; Owner API is the authorization boundary. */
(()=>{'use strict';
const e=id=>document.getElementById(id);
const n=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=String(txt);if(cls)x.className=cls;return x};
const money=v=>Number.isFinite(Number(v))?'$'+(Number(v)/100).toFixed(2):'Custom quote';
let sb,model,loading=false;
async function request(body){
 const ses=(await sb.auth.getSession()).data?.session;
 if(!ses?.access_token)throw Error('Owner sign-in is required.');
 const opts={method:body?'POST':'GET',cache:'no-store',headers:{authorization:'Bearer '+ses.access_token}};
 if(body){opts.headers['content-type']='application/json';opts.body=JSON.stringify(body)}
 const r=await fetch('/api/ad-sales'+(body?'':'?admin=1'),opts);
 const x=await r.json().catch(()=>({}));
 if(!r.ok||x.ok!==true)throw Error(x.error||'Owner operation could not be verified.');
 return x;
}
function block(host,textValue){host.append(n('p',textValue,'gu-ad-note'))}
function line(host,title,description){
 const box=n('article',undefined,'gu-ad-item');box.append(n('strong',title));if(description)box.append(n('p',description));host.append(box);return box
}
function button(label,fn,disabled=false){
 const b=n('button',label,'btn secondary');b.type='button';b.disabled=disabled;
 b.addEventListener('click',async()=>{
  b.disabled=true;
  try{await fn()}catch(err){e('gu-ad-admin-status').textContent=err.message||'Owner operation failed.'}
  finally{b.disabled=disabled}
 });
 return b;
}
async function act(body,feedback){
 const r=await request(body);
 if(feedback)e('gu-ad-admin-status').textContent=feedback;
 await refresh();return r;
}
function options(select,data,valueOf,labelOf){
 select.replaceChildren();const first=n('option','Select…');first.value='';select.append(first);
 for(const x of data){const o=n('option',labelOf(x));o.value=String(valueOf(x));select.append(o)}
}
function render(){
 renderSandbox();
 const gates=model.settings||{},gate=e('gu-ad-gate-state');
 gate.textContent='New quote inquiries: '+(gates.accepting_inquiries?'Open':'Paused')+
  ' · Online ad payments: '+(gates.accepting_payments?'Enabled':'Disabled')+
  ' · Paid sponsorship display: '+(gates.ad_delivery_enabled?'Enabled':'Disabled')+
  ' · Affiliate placements remain independent; direct sponsorship invoices are Owner-issued, never automatic.';
 e('gu-ad-toggle-inquiries').textContent=gates.accepting_inquiries?'Pause quote inquiries':'Reopen quote inquiries';
 e('gu-ad-toggle-paid-billing').textContent=gates.accepting_payments?'Disable paid sponsorship invoicing':'Enable paid sponsorship invoicing';
 e('gu-ad-toggle-paid-delivery').textContent=gates.ad_delivery_enabled?'Disable paid sponsor delivery':'Enable verified paid sponsor delivery';
 const perPage=e('gu-ad-page-controls');
 if(perPage){
  perPage.replaceChildren();
  const groups=new Map();
  for(const placement of model.placements||[]){
   const pattern=String(placement.page_pattern||'');
   if((!pattern.startsWith('/')||!/^[a-z0-9*.-]{2,90}$/.test(pattern.slice(1))))continue;
   if(!groups.has(pattern))groups.set(pattern,[]);
   groups.get(pattern).push(placement);
  }
  const titles={
   '/index.html':'Home','/store.html':'Store','/store-all-products.html':'All Products',
   '/knowledge-database.html':'SMF Knowledge Database','/bootcamp-academy.html':'Boot Camp Academy',
   '/market-commons.html':'Market Commons','/dashboard.html':'Member Dashboard',
   '/lab-samples.html':'Sample Labs','/books.html':'Books','/membership.html':'Membership',
   '/tools.html':'Tools','/about.html':'About','/skills.html':'Market Skills Record',
   '/signin*':'Sign In','/create-account*':'Create Account'
  };
  for(const [pattern,items] of groups){
   const current=items.filter(x=>x.active===true).length;
   const item=line(perPage,titles[pattern]||pattern,
    current+' of '+items.length+' placement'+(items.length===1?'':'s')+' enabled · '+pattern);
   const label=n('label',undefined,'gu-ad-carousel-control');
   const input=n('input');input.type='checkbox';input.checked=current===items.length;
   input.indeterminate=current>0&&current<items.length;
   input.setAttribute('aria-label','Enable all advertising placements on '+pattern);
   label.append(input,n('span',' Show all placements on this page'));
   const feedback=n('p',undefined,'gu-ad-note');feedback.setAttribute('role','status');
   input.addEventListener('change',async()=>{
    input.disabled=true;
    try{
     const result=await request({action:'set_page_placements_active',pagePattern:pattern,enabled:input.checked});
     if(result.pagePattern!==pattern||result.updatedCount!==items.length)throw Error('Page update was not verified.');
     feedback.textContent='Saved '+result.updatedCount+' placements. Payment and campaign release settings unchanged.';
     await refresh();
    }catch(err){
     input.checked=current===items.length;input.indeterminate=current>0&&current<items.length;
     feedback.textContent='Not saved: '+err.message;
    }finally{input.disabled=false}
   });
   item.append(label,feedback);
  }
  if(!groups.size)block(perPage,'No managed advertising placements are configured.');
 }
 const placements=e('gu-ad-placements');placements.replaceChildren();
 for(const p of model.placements||[]){
  const item=line(placements,p.name,
   p.placement_code+' · '+p.page_pattern+' · '+(p.active?'Inventory enabled':'Inventory disabled')+
   ' · '+(p.free_only?'Public/Free only':'Membership policy enforced'));
  const activeLabel=n('label',undefined,'gu-ad-carousel-control');
  const activeInput=n('input');activeInput.type='checkbox';activeInput.checked=p.active===true;
  activeInput.setAttribute('aria-label','Enable advertising inventory for '+p.name);
  activeLabel.append(activeInput,n('span',' Inventory enabled (applies to this placement only)'));
  const activeState=n('p',undefined,'gu-ad-note');activeState.setAttribute('role','status');
  activeInput.addEventListener('change',async()=>{
   activeInput.disabled=true;
   try{await request({action:'set_placement_active',placementCode:p.placement_code,enabled:activeInput.checked});
    activeState.textContent='Placement setting saved; payment and delivery release gates are unchanged.';
    await refresh();
   }catch(err){activeInput.checked=!activeInput.checked;activeState.textContent='Not saved: '+err.message}
   finally{activeInput.disabled=false}
  });
  item.append(activeLabel,activeState);
  const label=n('label',undefined,'gu-ad-carousel-control');
  const input=n('input');input.type='checkbox';input.checked=p.metadata?.carousel_enabled===true;
  input.setAttribute('aria-label','Enable carousel mode for '+p.name);
  label.append(input,n('span',' Enable carousel mode'));
  const note=n('p','Only cycles among multiple independently approved, paid sponsor creatives. Unsold space stays a single placeholder.','gu-ad-note');
  const result=n('p',undefined,'gu-ad-note');result.setAttribute('role','status');
  input.addEventListener('change',async()=>{
   input.disabled=true;
   try{await request({action:'set_placement_carousel',placementCode:p.placement_code,enabled:input.checked});
    result.textContent='Carousel preference saved. No advertising release or payment was enabled.';
    await refresh();
   }catch(err){input.checked=!input.checked;result.textContent='Not saved: '+err.message}
   finally{input.disabled=false}
  });
  item.append(label,note,result);
 }
 const cards=e('gu-ad-packages');cards.replaceChildren();
 for(const p of model.packages||[]){
  const item=line(cards,p.name,p.description);
  block(item,'Code: '+p.code+' · '+p.availability+' · '+(p.price_cents==null?'Price not established':money(p.price_cents))+
   ' · '+p.pricing_basis);
  const form=n('form');form.className='gu-ad-form';
  const price=n('input');price.type='number';price.min='0.01';price.step='0.01';price.max='1000000';
  price.value=p.price_cents==null?'':(p.price_cents/100).toFixed(2);
  const priceLabel=n('label','Approved price, USD (leave empty for custom quote)');priceLabel.append(price);
  const basis=n('select');
  for(const [v,label] of [['quote','Custom quote'],['flat','Fixed price'],['cpm','Cost per 1,000 impressions'],['cpc','Cost per click']]){
   const o=n('option',label);o.value=v;o.selected=v===p.pricing_basis;basis.append(o)
  }
  const basisLabel=n('label','Billing basis');basisLabel.append(basis);
  const duration=n('input');duration.type='number';duration.min='1';duration.max='365';duration.value=p.duration_days??'';
  const durationLabel=n('label','Duration in days (optional)');durationLabel.append(duration);
  const submit=n('button','Save reviewed rate','btn');submit.type='submit';
  const feedback=n('p');feedback.setAttribute('role','status');
  form.append(priceLabel,basisLabel,durationLabel,submit,feedback);
  form.addEventListener('submit',async ev=>{
   ev.preventDefault();submit.disabled=true;
   try{
    const priceCents=price.value.trim()===''?null:Math.round(Number(price.value)*100);
    await act({action:'update_rate',code:p.code,pricingBasis:basis.value,
      priceCents,durationDays:duration.value?Number(duration.value):null});
    e('gu-ad-admin-status').textContent='Reviewed package rate saved. No Stripe payment was created.';
   }catch(err){feedback.textContent=err.message}
   finally{submit.disabled=false}
  });
  item.append(form);
 }
 const leads=e('gu-ad-inquiries');leads.replaceChildren();
 if(!(model.inquiries||[]).length)block(leads,'No sponsorship inquiries have been submitted.');
 for(const item of model.inquiries||[]){
  const row=line(leads,item.company_name+' · '+item.status,
   'Contact: '+item.contact_name+' · '+item.contact_email+' · '+item.package_code+
   ' · '+new Date(item.created_at).toLocaleDateString());
  block(row,item.message);
  if(item.website_url){const url=n('a','View company website');url.href=item.website_url;url.target='_blank';url.rel='noopener noreferrer';row.append(url)}
  for(const state of ['reviewing','quoted','accepted','rejected','archived']){
   if(item.status===state)continue;
   row.append(button(state,()=>act({action:'review_inquiry',id:item.id,state},
    'Inquiry marked '+state+'. No advertising contract or charge created.')));
  }
 }
 // Affiliate banners are first-party placements, not Stripe-paid sponsorships.
 // Derive their live state from placement inventory, never the invoice gate.
 const affiliateSlots=new Set((model.placements||[]).filter(p=>p.active===true&&p.metadata?.affiliate===true).map(p=>p.placement_code));
 const affiliateCampaigns=new Map((model.campaigns||[]).filter(c=>Number(c.amount_cents)===0).map(c=>[c.id,c]));
 const activeAffiliateCreatives=(model.creatives||[]).filter(cr=>affiliateSlots.has(cr.placement_code)&&affiliateCampaigns.has(cr.campaign_id));
 const activeAffiliateCreativeIds=new Set(activeAffiliateCreatives.map(cr=>cr.id));
 const activeAffiliateCampaignIds=new Set(activeAffiliateCreatives.map(cr=>cr.campaign_id));
 const activeAffiliateAdvertiserIds=new Set(activeAffiliateCreatives.map(cr=>affiliateCampaigns.get(cr.campaign_id).advertiser_id));
 const advertisers=e('gu-ad-advertisers');advertisers.replaceChildren();
 for(const a of model.advertisers||[]){
  const row=line(advertisers,'#'+a.id+' · '+a.name,
   (a.contact_email||'Affiliate partner — no verified business contact')+' · '+a.status);
  if(activeAffiliateAdvertiserIds.has(a.id))block(row,'Affiliate banner enabled for eligible visitors · Controlled by page placement visibility · Not paid sponsorship delivery.');
  if(a.notes)block(row,a.notes);
  if(['prospect','paused'].includes(a.status))row.append(button('Approve advertiser',()=>act({
    action:'review_advertiser',id:a.id,status:'active'
   },'Advertiser qualified. Written quote and creative approval remain required.')));
  if(a.status==='active'&&!activeAffiliateAdvertiserIds.has(a.id))
    row.append(button('Pause advertiser',()=>act({action:'review_advertiser',id:a.id,status:'paused'},
     'Advertiser paused; review existing active campaigns separately.')));
  if(a.website_url){const link=n('a','Visit verified website');link.href=a.website_url;link.target='_blank';link.rel='noopener noreferrer';row.append(link)}
 }
 options(e('gu-ad-campaign-advertiser'),model.advertisers||[],x=>x.id,x=>'#'+x.id+' · '+x.name);
 options(e('gu-ad-campaign-package'),model.packages||[],x=>x.code,x=>x.name);
 options(e('gu-ad-creative-campaign'),(model.campaigns||[]).filter(x=>x.status==='draft'),x=>x.id,x=>'#'+x.id+' · '+x.name);
 options(e('gu-ad-creative-placement'),(model.placements||[]).filter(x=>x.active),x=>x.placement_code,x=>x.name);
 const creatives=e('gu-ad-creatives');creatives.replaceChildren();
 if(!(model.creatives||[]).length)block(creatives,'No creatives have been submitted.');
 for(const cr of model.creatives||[]){
  const item=line(creatives,'Creative #'+cr.id+' · '+cr.headline,
   'Campaign #'+cr.campaign_id+' · '+cr.placement_code+' · '+cr.status+(activeAffiliateCreativeIds.has(cr.id)?' · Affiliate banner enabled on website':''));
  block(item,cr.body||'');
  if(typeof cr.image_url==='string'&&(cr.image_url.startsWith('data:image/webp;base64,')&&/^[A-Za-z0-9+/=]{300,120000}$/.test(cr.image_url.slice(23)))){
   const img=n('img');img.src=cr.image_url;img.alt=cr.alt_text||'Approved partner creative';
   img.className='gu-ad-creative-preview';img.loading='lazy';item.append(img);
  }
  if(cr.destination_url){const l=n('a','Open reviewed destination');l.href=cr.destination_url;l.target='_blank';l.rel='noopener noreferrer';item.append(l)}
  if(activeAffiliateCreativeIds.has(cr.id))block(item,'This supplied partner artwork is enabled in the separate affiliate placement. Paid creative approval and Stripe invoices do not control it.');
  if(!activeAffiliateCreativeIds.has(cr.id)&&(cr.status==='draft'||cr.status==='paused')){
   const label=n('label');const checked=n('input');checked.type='checkbox';
   label.append(checked,n('span',' I verified advertiser identity, HTTPS destination, creative rights, sponsor disclosure, and absence of misleading or prohibited financial-promotion claims.'));
   item.append(label);
   item.append(button('Approve creative',()=>{
    if(!checked.checked)throw Error('Complete the compliance and destination review confirmation.');
    return act({action:'review_creative',id:cr.id,state:'approved',complianceConfirmed:true,destinationReviewed:true},
     'Creative approved for possible future use. Campaign is still unpublished.');
   }));
   item.append(button('Reject creative',()=>act({action:'review_creative',id:cr.id,state:'rejected'},
    'Creative rejected.')));
  }else if(cr.status==='approved'){
   item.append(button('Pause creative',()=>act({action:'review_creative',id:cr.id,state:'paused'},'Creative paused.')));
  }
 }
 const campaigns=e('gu-ad-campaigns');campaigns.replaceChildren();
 if(!(model.campaigns||[]).length)block(campaigns,'No ad campaigns have been created.');
 for(const cp of model.campaigns||[]){
  const item=line(campaigns,'Campaign #'+cp.id+' · '+cp.name,
   cp.status+' · Approval: '+cp.approval_state+' · Payment: '+cp.payment_state+
   ' · Contract: '+(cp.amount_cents===0?'Affiliate / unpaid referral (no fixed-price contract)':money(cp.amount_cents))+
   (activeAffiliateCampaignIds.has(cp.id)?' · Live affiliate placement (eligible viewers; separate from paid campaign workflow)':''));
  block(item,'Run dates: '+(cp.starts_at?new Date(cp.starts_at).toLocaleDateString():'Unset')+
   '–'+(cp.ends_at?new Date(cp.ends_at).toLocaleDateString():'Unset'));
  if(cp.status==='draft'&&cp.approval_state==='pending'&&cp.amount_cents>0){
   item.append(button('Approve campaign',()=>act({action:'review_campaign',id:cp.id,verb:'approve'},
    'Owner approval recorded; ad delivery remains disabled.')));
   item.append(button('Reject campaign',()=>act({action:'review_campaign',id:cp.id,verb:'reject'},'Campaign rejected.')));
  }
  if(['active','scheduled'].includes(cp.status))
   item.append(button('Pause campaign',()=>act({action:'review_campaign',id:cp.id,verb:'pause'},'Campaign paused.')));
  if(cp.status==='draft'&&cp.approval_state==='approved'&&cp.amount_cents>0){
   const advertiser=(model.advertisers||[]).find(a=>a.id===cp.advertiser_id);
   const canInvoice=advertiser?.status==='active'&&Boolean(advertiser?.contact_email)&&gates.accepting_payments===true;
   if(cp.stripe_invoice_id)block(item,'Stripe LIVE invoice: '+cp.stripe_invoice_id+
     (cp.stripe_invoice_sent_at?' · Sent to advertiser':' · Draft or incomplete; verify before retry'));
   if(cp.stripe_invoice_url){
    try{const u=new URL(cp.stripe_invoice_url);
     if(u.protocol==='https:'&&u.hostname==='invoice.stripe.com'){
      const link=n('a','Open advertiser Stripe invoice');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';item.append(link)
     }}catch{}
   }
   if(cp.payment_state==='unpaid'){
    const box=n('div',undefined,'gu-ad-invoice-controls');
    const review=n('label',undefined,'gu-ad-carousel-control'),r=n('input');
    r.type='checkbox';review.append(r,n('span',' I verified the written quote, exact USD amount, placement, campaign flight and advertiser approval.'));
    const contact=n('label',undefined,'gu-ad-carousel-control'),c=n('input');
    c.type='checkbox';contact.append(c,n('span',' I am authorized to email the LIVE Stripe invoice to the advertiser business contact.'));
    const recipient=n('p','Billing email: '+(advertiser?.contact_email||'Not available'),'gu-ad-note');
    const send=button(cp.stripe_invoice_sent_at?'Invoice already emailed':'Create & email LIVE Stripe invoice',async()=>{
     if(!r.checked||!c.checked)throw Error('Confirm the written quote and billing contact first.');
     const result=await request({action:'issue_sponsorship_invoice',campaignId:cp.id,
      confirmedWrittenQuote:true,confirmedAdvertiserEmail:true});
     if(result.livemode!==true||result.amountCents!==cp.amount_cents||result.deliveryEnabled!==false)
      throw Error('LIVE invoice response did not match the campaign.');
     e('gu-ad-admin-status').textContent='Stripe invoice emailed: '+result.invoiceId+
      '. No advertisement has been published.';
     await refresh();
    },!canInvoice||!!cp.stripe_invoice_sent_at);
    box.append(recipient,review,contact,send);item.append(box);
   }
   const proof=n('form');proof.className='gu-ad-form';
   const label=n('label','Paid LIVE Stripe invoice ID (verification only)');
   const input=n('input');input.placeholder='in_…';input.required=true;
   input.value=cp.stripe_invoice_id||'';input.pattern='in_[A-Za-z0-9_]{6,}';label.append(input);
   const send=n('button','Verify existing paid invoice','btn secondary');send.type='submit';
   const message=n('p');message.setAttribute('role','status');proof.append(label,send,message);
   proof.addEventListener('submit',async ev=>{
    ev.preventDefault();send.disabled=true;
    try{await act({action:'verify_invoice',id:cp.id,invoice:input.value.trim()},
     'Stripe LIVE invoice independently verified. Ad campaign remains unpublished.')}
    catch(err){message.textContent=err.message}finally{send.disabled=false}
   });item.append(proof);
   if(cp.payment_state==='verified_paid')item.append(
    button('Publish after separate release approval',
     ()=>act({action:'review_campaign',id:cp.id,verb:'publish'},'Verified campaign released.'),
     !(gates.ad_delivery_enabled&&gates.accepting_payments)));
  }
 }
 const metrics=e('gu-ad-metrics');metrics.replaceChildren();
 for(const cp of model.campaigns||[]){
  const m=model.recentEventSamples?.[cp.id]||{impressions:0,clicks:0};
  line(metrics,'#'+cp.id+' '+cp.name,'Recorded impressions: '+m.impressions+' · Recorded clicks: '+m.clicks);
 }
 if(!(model.campaigns||[]).length)block(metrics,'No billable or recorded activity.');
}
function renderSandbox(){
 const info=model?.sandbox||{},enabled=info.enabled===true&&info.globalTestMode===true;
 const status=e('gu-ad-sandbox-state'),toggle=e('gu-ad-sandbox-toggle'),
 packages=e('gu-ad-sandbox-packages'),orders=e('gu-ad-sandbox-orders');
 if(!status||!toggle||!packages||!orders)return;
 status.textContent=(enabled?'TEST MODE ON':'TEST MODE OFF')+
  ' · Sandbox QA is TEST-only ($1 per category). LIVE sponsor invoices require written authorization; no test payment publishes advertising.';
 toggle.textContent=enabled?'Disable advertising Sandbox and restore site payment mode':
  'Enable advertising Sandbox (blocks LIVE customer checkout)';
 packages.replaceChildren();orders.replaceChildren();
 for(const p of (model.packages||[])){
  const item=line(packages,p.name+' — $1.00 TEST ONLY','No real advertising inventory or paid campaign is created.');
  const btn=button('Open Stripe TEST Checkout',async()=>{
   if(!enabled)throw Error('Enable Sandbox Test Mode first.');
   const result=await request({action:'ad_sandbox_checkout',packageCode:p.code});
   if(result.livemode!==false||result.amountCents!==100||
      !/^https:\/\/checkout\.stripe\.com\//.test(result.checkoutUrl))
    throw Error('Stripe TEST checkout verification failed.');
   const info=e('gu-ad-sandbox-feedback');
   info.replaceChildren(n('span','Verified Stripe TEST checkout created for '+p.name+'. No real charge or advertisement is active. '));
   const link=n('a','Proceed to Stripe TEST Checkout');link.href=result.checkoutUrl;
   link.rel='noopener noreferrer';link.target='_blank';info.append(link);
   await refresh();
  },!enabled);
  item.append(btn);
 }
 if(!(info.orders||[]).length)block(orders,'No advertising QA payments have been attempted.');
 for(const row of info.orders||[]){
  const item=line(orders,row.package_code+' · '+row.status,
   'Test order '+row.id+' · '+new Date(row.created_at).toLocaleString());
  block(item,'Events: '+row.event_count+
   ' · Recorded TEST amount: '+(row.amount_cents!=null?money(row.amount_cents):'Not paid')+
   ' · Never produces a real ad campaign.');
 }
}
async function refresh(){
 if(loading)return;loading=true;
 try{model=await request();render();e('gu-ad-admin-status').textContent='Verified Owner access. Current advertising inventory loaded.';e('gu-ad-admin-main').hidden=false;window.dispatchEvent(new CustomEvent('groundup:ad-admin-ready',{detail:{campaigns:(model.campaigns||[]).length,inquiries:(model.inquiries||[]).length,advertisers:(model.advertisers||[]).length,creatives:(model.creatives||[]).length}}))}
 finally{loading=false}
}
async function submit(id,mapper,message){
 const form=e(id);form.addEventListener('submit',async ev=>{
  ev.preventDefault();const btn=form.querySelector('[type=submit]'),note=form.querySelector('[role=status]');
  btn.disabled=true;note.textContent='Saving verified draft…';
  try{await act(mapper(new FormData(form)),message);form.reset();note.textContent=message}
  catch(err){note.textContent=err.message}finally{btn.disabled=false}
 });
}
async function start(){
 try{
  sb=await window.getSupabaseClient();
  await refresh();
  e('gu-ad-refresh').addEventListener('click',()=>refresh().catch(err=>e('gu-ad-admin-status').textContent=err.message));
  e('gu-ad-verify-owner-browser')?.addEventListener('click',async()=>{
   const btn=e('gu-ad-verify-owner-browser'),note=e('gu-ad-owner-browser-acceptance');
   btn.disabled=true;note.textContent='Checking the signed-in Owner session and visible Advertising Admin controls…';
   try{
    const pathname=location.pathname;
    if(!['/admin-advertising','/admin-advertising.html'].includes(pathname))
     throw Error('This acceptance check must run on the Advertising Admin page.');
    const person=await sb.auth.getUser();
    if(person.error||!person.data?.user?.id)throw Error('Owner user verification failed.');
    const summary=await request();
    if(!summary.settings||!Array.isArray(summary.placements)||!Array.isArray(summary.campaigns))
     throw Error('Owner-only sponsor inventory is not available.');
    const visible=id=>{
     const element=e(id);
     return Boolean(element&&!element.hidden&&element.getClientRects().length>0);
    };
    const checks={
     page:'/admin-advertising.html',
     mainVisible:visible('gu-ad-admin-main'),
     billingControlVisible:visible('gu-ad-toggle-paid-billing'),
     deliveryControlVisible:visible('gu-ad-toggle-paid-delivery')
    };
    if(!Object.values(checks).every(Boolean))throw Error('The required advertising controls are not visible.');
    const result=await request({action:'record_owner_browser_acceptance',
     source:'advertising_owner_page_v1',nonce:crypto.randomUUID(),checks});
    if(result.ownerVerified!==true||result.auditRecorded!==true||
       result.scope!=='OWNER_SESSION_AND_ADVERTISING_UI_ONLY')
     throw Error('Owner identity or acceptance audit could not be verified.');
    note.textContent='PASS — signed-in Owner verified by Supabase and Advertising Admin; '+
     'server-side acceptance audit recorded at '+new Date(result.checkedAt).toLocaleString()+
     '. Paid delivery '+(result.paidDeliveryEnabled?'enabled':'disabled')+
     '; no invoice or charge created. Sponsorship webhook acceptance remains separate.';
   }catch(error){
    note.textContent='NOT ACCEPTED — '+(error?.message||'Owner browser verification failed.');
   }finally{btn.disabled=false}
  });
  e('gu-ad-sandbox-refresh')?.addEventListener('click',()=>refresh().catch(err=>e('gu-ad-sandbox-feedback').textContent=err.message));
  e('gu-ad-sandbox-toggle')?.addEventListener('click',async()=>{
   const btn=e('gu-ad-sandbox-toggle');btn.disabled=true;
   const desired=!(model?.sandbox?.enabled===true&&model?.sandbox?.globalTestMode===true);
   try{
    const result=await request({action:'ad_sandbox_mode',enabled:desired});
    if(!result.ok||result.sandboxEnabled!==desired)throw Error('Sandbox toggle not confirmed.');
    e('gu-ad-sandbox-feedback').textContent=desired?
     'Sandbox TEST enabled. LIVE checkout is blocked until you turn this OFF.':
     'Sandbox TEST disabled. Advertising payments and delivery remain OFF.';
    await refresh();
   }catch(err){e('gu-ad-sandbox-feedback').textContent=err.message}
   finally{btn.disabled=false}
  });
  e('gu-ad-toggle-paid-billing').addEventListener('click',async()=>{
   const enabled=model.settings?.accepting_payments!==true,btn=e('gu-ad-toggle-paid-billing');
   btn.disabled=true;
   try{await act({action:'set_paid_sponsorship_billing',enabled},
    enabled?'LIVE sponsorship invoicing enabled. No invoice created.':'New sponsorship invoicing disabled.');
   }catch(err){e('gu-ad-payment-control-feedback').textContent=err.message}
   finally{btn.disabled=false}
  });
  e('gu-ad-toggle-paid-delivery').addEventListener('click',async()=>{
   const enabled=model.settings?.ad_delivery_enabled!==true,btn=e('gu-ad-toggle-paid-delivery');
   btn.disabled=true;
   try{await act({action:'set_paid_sponsorship_delivery',enabled},
    enabled?'Verified paid advertising delivery enabled; campaign publication remains separate.':
     'Verified paid advertising delivery disabled.');
   }catch(err){e('gu-ad-payment-control-feedback').textContent=err.message}
   finally{btn.disabled=false}
  });
  e('gu-ad-toggle-inquiries').addEventListener('click',()=>act({action:'set_inquiries',enabled:!model.settings?.accepting_inquiries},
   'Advertising inquiry acceptance updated; payment and delivery switches unchanged.')
   .catch(err=>e('gu-ad-admin-status').textContent=err.message));
  submit('gu-ad-advertiser-form',data=>({action:'create_advertiser',name:data.get('name'),
   email:data.get('email'),website:data.get('website')}),'Advertiser prospect created. No charge.');
  submit('gu-ad-campaign-form',data=>({action:'create_campaign',advertiserId:Number(data.get('advertiserId')),
   packageCode:data.get('packageCode'),name:data.get('name'),
   amountCents:Math.round(Number(data.get('amountUsd'))*100),
   startsAt:new Date(String(data.get('startsAt'))).toISOString(),endsAt:new Date(String(data.get('endsAt'))).toISOString()}),
   'Campaign saved as unpaid, unpublished draft.');
  submit('gu-ad-creative-form',data=>({action:'create_creative',campaignId:Number(data.get('campaignId')),
   placementCode:data.get('placementCode'),headline:data.get('headline'),
   destinationUrl:data.get('destinationUrl'),body:data.get('body')}),'Creative saved for review, not published.');
 }catch(err){e('gu-ad-admin-status').textContent='Advertising Center unavailable: '+err.message}
}
start();
})();