import {checkMutationOrigin,boundedForumJson} from '../_lib/forum-request-guards-v014105.js';
/* Owner-owned advertising sales + public, Turnstile-verified quote inquiries.
 * No checkout, billing mutation, automatic ad publication or guessed prices.
 */
const respond=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const str=x=>String(x??'').trim();
const bad=(message,status=400)=>Object.assign(new Error(message),{status});
function config(env){
 const base=str(env.SUPABASE_URL).replace(/\/$/,''),secret=str(env.SUPABASE_SECRET_KEY),pub=str(env.SUPABASE_PUBLISHABLE_KEY);
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!secret||!pub)throw bad('Advertising services unavailable.',503);
 const h={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))h.authorization='Bearer '+secret;
 return {base,secret,pub,h,env};
}
async function api(c,path,{method='GET',body}={}){
 const headers={...c.h,prefer:'return=representation'};
 if(body!==undefined)headers['content-type']='application/json';
 const res=await fetch(c.base+'/rest/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(!res.ok)throw bad('Advertising operation could not be verified.',503);
 return res.status===204?null:res.json();
}
async function owner(c,request){
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!jwt)throw bad('Owner sign-in required.',401);
 const res=await fetch(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+jwt},cache:'no-store'});
 if(!res.ok)throw bad('Valid signed-in Owner required.',401);
 const u=await res.json();if(!/^[a-f0-9-]{36}$/i.test(u.id||''))throw bad('Invalid member session.',401);
 const [roles,profiles,flags]=await Promise.all([
 api(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+u.id),
 api(c,'profiles?select=account_kind,deleted_at&id=eq.'+u.id+'&limit=1'),
 api(c,'admin_user_flags?select=status&user_id=eq.'+u.id+'&limit=1')
 ]);
 const liveRole=x=>!x.expires_at||Date.parse(x.expires_at)>Date.now();
 if(profiles?.[0]?.account_kind!=='member'||profiles?.[0]?.deleted_at||
 ['suspended','restricted'].includes(flags?.[0]?.status)||
 roles?.some(x=>x.role_code==='SHOWCASE_VIEWER'&&liveRole(x))||
 !roles?.some(x=>x.role_code==='OWNER'&&liveRole(x)))throw bad('Owner authority required.',403);
 return u;
}
function isSafeUrl(input){
 try{const u=new URL(input);
  return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''&&
   !['localhost','127.0.0.1','0.0.0.0','::1'].includes(u.hostname.toLowerCase())&&
   !/(^|\.)internal$|\.local$/.test(u.hostname)&&u.hostname.includes('.')&&
   String(input).length<=1000&&u.hostname.length<=250;
 }catch{return false}
}
async function human(env,token,ip){
 if(!str(env.TURNSTILE_SECRET_KEY)||!str(token))throw bad('Human verification is required.',503);
 const b=new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token});
 if(ip)b.set('remoteip',ip);
 const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded'},body:b.toString(),cache:'no-store'});
 if(!r.ok)throw bad('Human verification temporarily unavailable.',503);
 const d=await r.json();if(d.success!==true)throw bad('Human verification failed.',403);
}
async function invoice(c,campaign,advertiser,reference){
 if(!/^in_[A-Za-z0-9_]{6,}$/.test(reference))throw bad('A Stripe invoice reference is required.');
 const secret=str((c.env.STRIPE_LIVE_SECRET_KEY || c.env.GU58_STRIPE_LIVE_SECRET_KEY)),acct=str((c.env.STRIPE_LIVE_ACCOUNT_ID || c.env.GU58_STRIPE_LIVE_ACCOUNT_ID));
 if(!/^sk_live_/.test(secret)||!/^acct_/.test(acct))throw bad('LIVE invoice verification is unavailable.',503);
 const h={authorization:'Bearer '+secret};
 const [ir,ar]=await Promise.all([
 fetch('https://api.stripe.com/v1/invoices/'+encodeURIComponent(reference),{headers:h,cache:'no-store'}),
 fetch('https://api.stripe.com/v1/account',{headers:h,cache:'no-store'})
 ]);
 if(!ir.ok||!ar.ok)throw bad('Unable to verify the Stripe invoice.',503);
 const data=await ir.json(),account=await ar.json();
 if(account.id!==acct||data.livemode!==true||data.status!=='paid'||data.paid!==true||
 data.currency!=='usd'||!Number.isInteger(data.amount_paid)||
 data.amount_paid<campaign.amount_cents||data.metadata?.ad_campaign_id!==String(campaign.id)||
 data.metadata?.advertiser_id!==String(advertiser.id)||
 !/^cus_[A-Za-z0-9_]{6,}$/.test(str(data.customer)))
 throw bad('Stripe invoice, advertiser, campaign or amount did not match.',409);
 const payments=await fetch('https://api.stripe.com/v1/invoice_payments?invoice='+encodeURIComponent(reference)+'&limit=10',
  {headers:h,cache:'no-store'});
 if(!payments.ok)throw bad('Unable to verify an allocated payment.',503);
 const allocations=await payments.json();
 if(allocations.has_more||!Array.isArray(allocations.data))throw bad('Invoice allocation could not be verified.',409);
 const allocated=allocations.data.filter(x=>x.status==='paid'&&x.amount_paid>=campaign.amount_cents&&
 /^pi_[A-Za-z0-9_]{6,}$/.test(x.payment?.payment_intent||''));
 if(allocated.length!==1)throw bad('Stripe invoice lacks one verified paid PaymentIntent.',409);
 const intentId=allocated[0].payment.payment_intent;
 const pi=await fetch('https://api.stripe.com/v1/payment_intents/'+encodeURIComponent(intentId),
  {headers:h,cache:'no-store'});
 if(!pi.ok)throw bad('The Stripe payment could not be independently verified.',503);
 const payment=await pi.json();
 if(payment.livemode!==true||payment.status!=='succeeded'||payment.currency!=='usd'||
 payment.customer!==data.customer||payment.amount_received<campaign.amount_cents||
 !/^ch_[A-Za-z0-9_]{6,}$/.test(String(payment.latest_charge||'')))
  throw bad('Payment is not settled for the quoted amount.',409);
 const chargeResult=await fetch('https://api.stripe.com/v1/charges/'+encodeURIComponent(payment.latest_charge),
  {headers:h,cache:'no-store'});
 if(!chargeResult.ok)throw bad('Stripe charge cannot be verified.',503);
 const charge=await chargeResult.json();
 if(charge.livemode!==true||charge.paid!==true||charge.disputed===true||
 charge.amount_refunded!==0||charge.payment_intent!==intentId||
 charge.customer!==data.customer)
  throw bad('Payment is refunded, disputed or not valid.',409);
 return {amount:data.amount_paid,customer:data.customer};
}
async function readOwner(c){
 const [settings,packages,placements,inquiries,advertisers,campaigns,creatives,proof]=await Promise.all([
 api(c,'gu_ad_sales_settings_v014226?select=*&singleton=eq.true'),
 api(c,'gu_ad_packages_v014226?select=*&order=code.asc'),
 api(c,'ad_placements?select=placement_code,name,page_pattern,active,free_only,metadata&order=sort_order.asc'),
 api(c,'gu_ad_inquiries_v014226?select=*&order=created_at.desc&limit=150'),
 api(c,'advertisers?select=id,name,contact_email,website_url,status,notes,created_at&order=created_at.desc&limit=150'),
 api(c,'ad_campaigns?select=*&order=created_at.desc&limit=150'),
 api(c,'ad_creatives?select=id,campaign_id,placement_code,status,headline,body,image_url,destination_url,alt_text&order=created_at.desc&limit=150'),
 api(c,'gu_ad_order_evidence_v014226?select=campaign_id,invoice_ref,state,payment_mode,paid_amount_cents,verified_at&order=verified_at.desc&limit=100')
 ]);
 const stats=await api(c,'rpc/gu_ad_campaign_counts_v014233',{method:'POST',
   body:{p_campaigns:(campaigns||[]).map(x=>Number(x.id)).filter(Number.isSafeInteger)}});
 const metrics={};
 for(const e of stats||[])metrics[e.campaign_id]={impressions:Number(e.impressions)||0,clicks:Number(e.clicks)||0};
 return {settings:settings?.[0]||null,packages:packages||[],placements:placements||[],
 inquiries:inquiries||[],advertisers:advertisers||[],campaigns:campaigns||[],
 creatives:creatives||[],paymentEvidence:proof||[],recentEventSamples:metrics};
}
async function audit(c,actor,action,type,id,details={}){
 await api(c,'gu_ad_admin_audit_v014226',{method:'POST',
 body:{actor,action,resource_type:type,resource_id:String(id),details}});
}
async function stripeTest(c,path,init={}){
 const key=str(c.env.GU39_STRIPE_TEST_SECRET_KEY);
 if(!/^sk_test_[A-Za-z0-9_]+$/.test(key))throw bad('Stripe TEST is not connected.',503);
 const r=await fetch('https://api.stripe.com/v1/'+path,{
  method:init.method||'GET',
  headers:{authorization:'Bearer '+key,
   ...(init.body?{'content-type':'application/x-www-form-urlencoded'}:{})},
  body:init.body,cache:'no-store'
 });
 if(!r.ok)throw bad('Stripe TEST request was not accepted.',503);
 return r.json();
}
async function adSandboxCheckout(c,actor,packageCode,request){
 const origin=new URL(request.url).origin;
 // Match the configured canonical origin across account migrations.
 const configured=str(c.env.PUBLIC_SITE_URL)||'https://stock-market-from-the-ground-up.pages.dev';
 let expected;
 try{
  const u=new URL(configured);
  if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.port)
   throw Error('Invalid origin');
  expected=u.origin;
 }catch{throw bad('Verified website origin is not configured.',503)}
 if(origin!==expected)
  throw bad('This test checkout is limited to the verified production website.',403);
 const [settings,globalMode,pricing,liveSettings,acct]=await Promise.all([
  api(c,'gu_ad_sandbox_settings_v014240?select=testing_enabled&singleton=eq.true'),
  api(c,'gu39_sandbox_settings?select=enabled&id=eq.true'),
  api(c,'gu_ad_sandbox_prices_v014240?select=*&package_code=eq.'+encodeURIComponent(packageCode)+'&limit=1'),
  api(c,'gu_ad_sales_settings_v014226?select=accepting_payments,ad_delivery_enabled&singleton=eq.true'),
  stripeTest(c,'account')
 ]);
 if(settings?.[0]?.testing_enabled!==true||globalMode?.[0]?.enabled!==true)
  throw bad('Owner must enable Stripe Sandbox Test Mode first.',409);
 if(liveSettings?.[0]?.accepting_payments!==false||liveSettings?.[0]?.ad_delivery_enabled!==false)
  throw bad('Advertising LIVE mode must remain disabled for test checkout.',409);
 if(acct.id!=='acct_1URGkDJY9FI7byHB')throw bad('Unexpected TEST Stripe account.',503);
 const p=pricing?.[0];
 if(!p||p.test_amount_cents!==100||p.test_currency!=='usd')
  throw bad('No controlled $1 TEST price is configured.',409);
 const price=await stripeTest(c,'prices/'+encodeURIComponent(p.test_price_id));
 if(price.livemode!==false||price.id!==p.test_price_id||price.product!==p.test_product_id||
  price.active!==true||price.unit_amount!==100||price.currency!=='usd'||price.type!=='one_time'
  ||price.metadata?.ad_sandbox!=='true')
  throw bad('Stripe test product and fixed price mismatch.',503);
 const recorded=await api(c,'gu_ad_sandbox_intents_v014240',{method:'POST',
  body:{owner_user_id:actor,package_code:packageCode}});
 if(!Array.isArray(recorded)||recorded.length!==1)throw bad('Unable to create private test order.',503);
 const intentId=recorded[0].id;
 const success=origin+'/admin-advertising.html?ad_test=complete';
 const cancel=origin+'/admin-advertising.html?ad_test=cancel';
 const fields=new URLSearchParams({
  mode:'payment','line_items[0][price]':p.test_price_id,
  'line_items[0][quantity]':'1',success_url:success,cancel_url:cancel,
  client_reference_id:intentId,
  'metadata[gu_ad_sandbox_intent]':intentId,
  'metadata[gu_ad_sandbox_tag]':'AD_SANDBOX_2026',
  'metadata[gu_ad_sandbox_package]':packageCode,
  'payment_intent_data[metadata][gu_ad_sandbox_intent]':intentId,
  'payment_intent_data[metadata][gu_ad_sandbox_tag]':'AD_SANDBOX_2026',
  'payment_intent_data[metadata][gu_ad_sandbox_package]':packageCode,
  customer_creation:'always'
 });
 const ses=await stripeTest(c,'checkout/sessions',{method:'POST',body:fields});
 let validUrl=false;try{const u=new URL(ses.url);validUrl=u.protocol==='https:'&&
 u.hostname==='checkout.stripe.com'}catch{}
 if(ses.livemode!==false||ses.mode!=='payment'||ses.currency!=='usd'||
 ses.amount_total!==100||ses.client_reference_id!==intentId||
 !/^cs_test_[A-Za-z0-9_]{6,}$/.test(ses.id||'')||!validUrl)
 throw bad('Stripe TEST Checkout session failed validation.',503);
 const binding=await api(c,'rpc/gu_ad_sandbox_bind_v014240',{method:'POST',
  body:{p_intent:intentId,p_owner:actor,p_session:ses.id}});
 if(binding?.ok!==true)throw bad('Stripe test session could not be safely bound. Do not pay it.',503);
 return {intentId,sessionId:ses.id,checkoutUrl:ses.url,amountCents:100,livemode:false,
  adDelivery:false,realAdvertisingContract:false,packageCode};
}
export async function onRequest({request,env}){
 try{
  const c=config(env),url=new URL(request.url);
  if(request.method==='GET'){
   if(url.searchParams.get('admin')==='1'){
    await owner(c,request);
    const [sales,gate,globalMode,tests]=await Promise.all([
     readOwner(c),
     api(c,'gu_ad_sandbox_settings_v014240?select=testing_enabled&singleton=eq.true'),
     api(c,'gu39_sandbox_settings?select=enabled&id=eq.true'),
     api(c,'gu_ad_sandbox_intents_v014240?select=id,package_code,status,checkout_session,payment_intent,amount_cents,event_count,created_at,paid_at&order=created_at.desc&limit=35')
    ]);
    return respond({ok:true,...sales,sandbox:{enabled:gate?.[0]?.testing_enabled===true,
     globalTestMode:globalMode?.[0]?.enabled===true,
     amountCents:100,orders:tests||[]}});
   }
   const [settings,packages]=await Promise.all([
    api(c,'gu_ad_sales_settings_v014226?select=accepting_inquiries,accepting_payments&singleton=eq.true'),
    api(c,'gu_ad_packages_v014226?select=code,name,description,price_cents,pricing_basis,duration_days,availability,public_visible&public_visible=eq.true&order=code.asc')
   ]);
   return respond({ok:true,acceptingInquiries:settings?.[0]?.accepting_inquiries===true,
    onlineCheckoutEnabled:false,turnstileSiteKey:str(env.TURNSTILE_SITE_KEY),packages:packages||[]});
  }
  if(request.method!=='POST')return respond({ok:false,error:'Method not supported'},405);
  checkMutationOrigin(request);
  const body=await boundedForumJson(request,5000),action=str(body.action);
  if(action==='request_quote'){
   const settings=(await api(c,'gu_ad_sales_settings_v014226?select=accepting_inquiries&singleton=eq.true'))?.[0];
   if(settings?.accepting_inquiries!==true)throw bad('Advertising inquiries are currently closed.',503);
   if(str(body.company).length<2||str(body.company).length>160||
    str(body.contact).length<2||str(body.contact).length>120||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(body.email))||str(body.email).length>250||
    str(body.message).length<30||str(body.message).length>2000)
    throw bad('Provide a business name, contact, valid email, and campaign description.');
   if(str(body.website)&&!isSafeUrl(str(body.website)))throw bad('Use a public HTTPS company website.');
   const choices=await api(c,'gu_ad_packages_v014226?select=code&code=eq.'+encodeURIComponent(str(body.packageCode))+'&public_visible=eq.true');
   if(!choices?.length)throw bad('Unknown sponsorship category.');
   if(str(body.honeypot))throw bad('Quote could not be submitted.',403);
   const ip=request.headers.get('CF-Connecting-IP')||null;
   await human(env,body.turnstileToken,ip);
   const rows=await api(c,'gu_ad_inquiries_v014226',{method:'POST',body:{
    company_name:str(body.company),contact_name:str(body.contact),contact_email:str(body.email),
    website_url:str(body.website)||null,package_code:str(body.packageCode),message:str(body.message)
   }});
   if(!Array.isArray(rows)||rows.length!==1)throw bad('Your inquiry could not be confirmed.',503);
   return respond({ok:true,reference:rows[0].id,notice:'Request received for manual review. No payment has been taken.'},201);
  }
  const who=await owner(c,request),actor=who.id;
  if(action==='set_page_placements_active'){
   const pattern=str(body.pagePattern),enabled=body.enabled;
   if(typeof enabled!=='boolean'||(!pattern.startsWith('/')||!/^[a-z0-9*.-]{2,90}$/.test(pattern.slice(1))))
    throw bad('Specify an existing advertising page and an enabled state.');
   // A page-level switch is one server-side, Owner-authorized database operation.
   // It disables both paid creatives and house cards without affecting any other page,
   // changing any payment flag, or modifying campaign approvals.
   const existing=await api(c,'ad_placements?select=placement_code,active,page_pattern&page_pattern=eq.'+encodeURIComponent(pattern));
   if(!Array.isArray(existing)||existing.length<1||existing.length>40||
    !existing.every(p=>p.page_pattern===pattern&&/^[A-Z0-9_]{4,48}$/.test(p.placement_code)))
    throw bad('Advertising page was not found or cannot be updated.',404);
   const codes=existing.map(p=>p.placement_code);
   const selector='ad_placements?placement_code=in.('+codes.join(',')+')';
   const updated=await api(c,selector,{method:'PATCH',body:{active:enabled}});
   if(!Array.isArray(updated)||updated.length!==codes.length||
     updated.some(p=>!codes.includes(p.placement_code)||p.active!==enabled))
    throw bad('Page inventory update could not be verified.',503);
   await audit(c,actor,'set_page_placements_active','ad_page',pattern,{
    enabled,placementCodes:codes,previousStates:existing.map(p=>({code:p.placement_code,active:p.active}))
   });
   return respond({ok:true,pagePattern:pattern,enabled,updatedCount:codes.length,
    paymentStateChanged:false,campaignStateChanged:false});
  }
  if(action==='set_placement_active'){
   const code=str(body.placementCode),enabled=body.enabled;
   if(!/^[A-Z0-9_]{4,48}$/.test(code)||typeof enabled!=='boolean')
    throw bad('Specify a known advertising placement and the enabled state.');
   const existing=await api(c,'ad_placements?select=placement_code,active&placement_code=eq.'+encodeURIComponent(code)+'&limit=1');
   if(existing?.length!==1)throw bad('Placement not found.',404);
   const saved=await api(c,'ad_placements?placement_code=eq.'+encodeURIComponent(code),{
    method:'PATCH',body:{active:enabled}});
   if(saved?.length!==1)throw bad('Placement availability could not be saved.',503);
   await audit(c,actor,'set_placement_active','placement',code,{active:enabled,
     previousActive:existing[0].active});
   return respond({ok:true,placementCode:code,active:enabled,paymentStateChanged:false});
  }
  if(action==='set_placement_carousel'){
   const code=str(body.placementCode),enabled=body.enabled;
   if(!/^[A-Z0-9_]{4,48}$/.test(code)||typeof enabled!=='boolean')
    throw bad('Specify a valid placement and the carousel checkbox state.');
   const existing=await api(c,'ad_placements?select=placement_code,metadata&placement_code=eq.'+encodeURIComponent(code)+'&limit=1');
   if(existing?.length!==1)throw bad('Advertising placement not found.',404);
   const metadata=existing[0].metadata&&typeof existing[0].metadata==='object'&&!Array.isArray(existing[0].metadata)?existing[0].metadata:{};
   const saved=await api(c,'ad_placements?placement_code=eq.'+encodeURIComponent(code),{
    method:'PATCH',body:{metadata:{...metadata,carousel_enabled:enabled}}});
   if(saved?.length!==1)throw bad('Placement preference was not saved.',503);
   await audit(c,actor,'set_placement_carousel','placement',code,{carouselEnabled:enabled});
   return respond({ok:true,placementCode:code,carouselEnabled:enabled,liveDeliveryChanged:false});
  }
  if(action==='update_rate'){
   const code=str(body.code),basis=str(body.pricingBasis),price=body.priceCents==null?null:Number(body.priceCents),
      days=body.durationDays==null?null:Number(body.durationDays);
   if(!/^[A-Z0-9_]{5,48}$/.test(code)||!['quote','flat','cpm','cpc'].includes(basis)||
    (basis==='quote'&&price!==null)||(basis!=='quote'&&(!Number.isSafeInteger(price)||price<=0||price>100000000))||
    (days!==null&&(!Number.isInteger(days)||days<1||days>365)))
    throw bad('Invalid reviewed rate or duration.');
   const updated=await api(c,'gu_ad_packages_v014226?code=eq.'+encodeURIComponent(code),{method:'PATCH',
    body:{price_cents:price,pricing_basis:basis,duration_days:days,
      availability:basis==='quote'?'quote_only':'approved_rate',updated_at:new Date().toISOString()}});
   if(updated?.length!==1)throw bad('Rate card not found.',404);
   await audit(c,actor,'update_rate','package',code,{basis,priceCents:price,days});
   return respond({ok:true,code,priceCents:price});
  }
  if(action==='review_inquiry'){
   const id=str(body.id),stage=str(body.state);
   if(!/^[a-f0-9-]{36}$/i.test(id)||!['reviewing','quoted','accepted','rejected','archived'].includes(stage))throw bad('Invalid inquiry review.');
   const rows=await api(c,'gu_ad_inquiries_v014226?id=eq.'+encodeURIComponent(id),{method:'PATCH',
    body:{status:stage,reviewed_by:actor,reviewed_at:new Date().toISOString(),
     internal_notes:str(body.notes).slice(0,2000)||null}});
   if(rows?.length!==1)throw bad('Inquiry missing.',404);
   await audit(c,actor,'review_inquiry','inquiry',id,{status:stage});
   return respond({ok:true});
  }
  if(action==='create_advertiser'){
   const name=str(body.name),email=str(body.email),site=str(body.website);
   if(name.length<2||name.length>160||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!isSafeUrl(site))
    throw bad('Valid advertiser identity and HTTPS website required.');
   const rows=await api(c,'advertisers',{method:'POST',body:{name,contact_email:email,
    website_url:site,status:'prospect',notes:'Created for manual ad-sales qualification.'}});
   if(rows?.length!==1)throw bad('Advertiser creation failed.',503);
   await audit(c,actor,'create_advertiser','advertiser',rows[0].id);
   return respond({ok:true,id:rows[0].id});
  }
  if(action==='create_campaign'){
   const advertiserId=Number(body.advertiserId),name=str(body.name),price=Number(body.amountCents);
   const start=Date.parse(str(body.startsAt)),end=Date.parse(str(body.endsAt));
   const plan=str(body.packageCode);
   if(!Number.isSafeInteger(advertiserId)||advertiserId<=0||name.length<8||name.length>160||
    !Number.isSafeInteger(price)||price<=0||price>100000000||
    !Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>365*86400000)
    throw bad('A reviewed advertiser, contract price, and valid flight dates are required.');
   const pack=await api(c,'gu_ad_packages_v014226?select=code&code=eq.'+encodeURIComponent(plan));
   if(pack?.length!==1)throw bad('Unknown sales package.');
   const rows=await api(c,'ad_campaigns',{method:'POST',body:{advertiser_id:advertiserId,
    name,billing_model:'flat',amount_cents:price,package_code:plan,
    status:'draft',approval_state:'pending',payment_state:'unpaid',
    starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString()}});
   if(rows?.length!==1)throw bad('Campaign not created.',503);
   await audit(c,actor,'create_campaign','campaign',rows[0].id,{amountCents:price});
   return respond({ok:true,id:rows[0].id});
  }
  if(action==='create_creative'){
   const campaignId=Number(body.campaignId),slot=str(body.placementCode),url=str(body.destinationUrl),
    headline=str(body.headline),copy=str(body.body);
   if(!Number.isSafeInteger(campaignId)||campaignId<=0||!/^[A-Z0-9_]{4,48}$/.test(slot)||
    !isSafeUrl(url)||headline.length<8||headline.length>120||copy.length<20||copy.length>500)
    throw bad('Creative requires a valid campaign, placement, HTTPS destination and reviewed text.');
   const placements=await api(c,'ad_placements?select=placement_code&placement_code=eq.'+encodeURIComponent(slot)+'&active=eq.true');
   if(placements?.length!==1)throw bad('Placement is not approved for inventory.');
   const camp=await api(c,'ad_campaigns?select=id,status&id=eq.'+campaignId);
   if(camp?.length!==1||camp[0].status!=='draft')throw bad('Creative changes require a draft campaign.');
   const rows=await api(c,'ad_creatives',{method:'POST',body:{campaign_id:campaignId,
    placement_code:slot,headline,body:copy,destination_url:url,
    image_url:null,status:'draft',disclosure_label:'Advertisement'}});
   if(rows?.length!==1)throw bad('Creative not created.');
   await audit(c,actor,'create_creative','creative',rows[0].id);
   return respond({ok:true,id:rows[0].id});
  }
  if(action==='review_creative'){
   const id=Number(body.id),state=str(body.state);
   if(!Number.isSafeInteger(id)||id<=0||!['approved','rejected','paused'].includes(state))throw bad('Invalid creative review.');
   if(state==='approved'&&(body.complianceConfirmed!==true||body.destinationReviewed!==true))
    throw bad('Confirm sponsor disclosure, safe destination, rights, and financial-promotion review before creative approval.',409);
   const rows=await api(c,'ad_creatives?id=eq.'+id+'&status=in.(draft,approved,active,paused)',{
    method:'PATCH',body:{status:state,updated_at:new Date().toISOString()}});
   if(rows?.length!==1)throw bad('Creative not reviewable.',404);
   await audit(c,actor,'review_creative','creative',id,{state});
   return respond({ok:true,id,state});
  }
  if(action==='review_campaign'){
   const id=Number(body.id),verb=str(body.verb);
   if(!Number.isSafeInteger(id)||id<=0||!['approve','reject','pause','publish'].includes(verb))throw bad('Invalid campaign operation.');
   if(verb==='publish'){
    const rows=await api(c,'ad_campaigns?select=id,advertiser_id,amount_cents,last_verified_invoice&id=eq.'+id);
    const cpn=rows?.[0],advertisers=cpn?await api(c,'advertisers?select=id&id=eq.'+cpn.advertiser_id):[];
    if(!cpn?.last_verified_invoice||advertisers?.length!==1)throw bad('A verified invoice and advertiser are required.',409);
    // Reconfirm that payment is still settled and unrefunded at publication.
    await invoice(c,cpn,advertisers[0],cpn.last_verified_invoice);
   }
   const result=await api(c,'rpc/gu_ad_review_campaign_v014227',{method:'POST',
     body:{p_actor:actor,p_campaign:id,p_action:verb}});
   if(result?.ok!==true)throw bad(result?.error||'Campaign is not eligible.',409);
   return respond({ok:true,id,action:verb});
  }
  if(action==='verify_invoice'){
   const id=Number(body.id),ref=str(body.invoice);
   if(!Number.isSafeInteger(id)||id<=0)throw bad('Invalid campaign.');
   const campaigns=await api(c,'ad_campaigns?select=id,advertiser_id,amount_cents,status,payment_state&id=eq.'+id);
   const camp=campaigns?.[0];
   if(!camp||camp.status!=='draft'||camp.payment_state!=='unpaid'||camp.amount_cents<=0)
     throw bad('Campaign is not payable.',409);
   const advertisers=await api(c,'advertisers?select=id&id=eq.'+camp.advertiser_id);
   if(advertisers?.length!==1)throw bad('Advertiser not verified.',409);
   const proof=await invoice(c,camp,advertisers[0],ref);
   const recorded=await api(c,'rpc/gu_ad_verify_paid_invoice_v014227',{method:'POST',
    body:{p_actor:actor,p_campaign:id,p_invoice:ref,p_paid_cents:proof.amount,
      p_stripe_livemode:true,p_customer:proof.customer}});
   if(recorded?.ok!==true)throw bad(recorded?.error||'Invoice was not recorded.',409);
   return respond({ok:true,id,invoiceVerified:true,adsPublished:false});
  }
  if(action==='ad_sandbox_mode'){
   if(typeof body.enabled!=='boolean')throw bad('Explicit test-mode selection is required.');
   const r=await api(c,'rpc/gu_ad_sandbox_toggle_v014241',{method:'POST',
    body:{p_actor:actor,p_enabled:body.enabled}});
   if(r?.ok!==true)throw bad(r?.error||'Stripe Sandbox test-mode control unavailable.',409);
   return respond({ok:true,sandboxEnabled:r.sandboxEnabled,
    globalTesting:r.sharedTestModeEnabled,livePayments:false,advertisingDisplay:false});
  }
  if(action==='ad_sandbox_checkout'){
   const code=str(body.packageCode);
   if(!['SITE_SPONSOR','SECTION_SPONSOR','RESOURCE_SPONSOR'].includes(code))
    throw bad('Unknown advertising TEST category.');
   const q=await adSandboxCheckout(c,actor,code,request);
   return respond({ok:true,...q});
  }
  if(action==='set_inquiries'){
   const enabled=body.enabled;
   if(typeof enabled!=='boolean')throw bad('Boolean required.');
   const rows=await api(c,'gu_ad_sales_settings_v014226?singleton=eq.true',{method:'PATCH',
    body:{accepting_inquiries:enabled,updated_at:new Date().toISOString()}});
   if(rows?.length!==1)throw bad('Sales settings not available.',503);
   await audit(c,actor,'set_inquiries','settings','singleton',{accepting:enabled});
   return respond({ok:true,acceptingInquiries:enabled});
  }
  return respond({ok:false,error:'Unknown advertising operation.'},400);
 }catch(e){return respond({ok:false,error:e.status&&e.status<500?e.message:'Advertising operation could not be verified.'},
 [400,401,403,404,409,413].includes(e.status)?e.status:503)}
}
