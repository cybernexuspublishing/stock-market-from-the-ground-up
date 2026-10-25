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
 const secret=str(c.env.GU58_STRIPE_LIVE_SECRET_KEY),acct=str(c.env.GU58_STRIPE_LIVE_ACCOUNT_ID);
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
 if(allocations.has_more||!Array.isArray(allocations.data)||
 !allocations.data.some(x=>x.status==='paid'&&x.amount_paid>=campaign.amount_cents&&
 /^pi_[A-Za-z0-9_]{6,}$/.test(x.payment?.payment_intent||'')))
 throw bad('Stripe invoice lacks a verifiable completed PaymentIntent.',409);
 return {amount:data.amount_paid,customer:data.customer};
}
async function readOwner(c){
 const [settings,packages,placements,inquiries,advertisers,campaigns,creatives,proof,events]=await Promise.all([
 api(c,'gu_ad_sales_settings_v014226?select=*&singleton=eq.true'),
 api(c,'gu_ad_packages_v014226?select=*&order=code.asc'),
 api(c,'ad_placements?select=placement_code,name,page_pattern,active,free_only&order=sort_order.asc'),
 api(c,'gu_ad_inquiries_v014226?select=*&order=created_at.desc&limit=150'),
 api(c,'advertisers?select=id,name,contact_email,website_url,status,created_at&order=created_at.desc&limit=150'),
 api(c,'ad_campaigns?select=*&order=created_at.desc&limit=150'),
 api(c,'ad_creatives?select=id,campaign_id,placement_code,status,headline,body,image_url,destination_url,alt_text&order=created_at.desc&limit=150'),
 api(c,'gu_ad_order_evidence_v014226?select=campaign_id,invoice_ref,state,payment_mode,paid_amount_cents,verified_at&order=verified_at.desc&limit=100'),
 api(c,'ad_events?select=campaign_id,event_type,created_at&order=created_at.desc&limit=1000')
 ]);
 const metrics={};for(const e of events||[]){const t=metrics[e.campaign_id]??={impressions:0,clicks:0};
 if(e.event_type==='impression')t.impressions++;else if(e.event_type==='click')t.clicks++}
 return {settings:settings?.[0]||null,packages:packages||[],placements:placements||[],
 inquiries:inquiries||[],advertisers:advertisers||[],campaigns:campaigns||[],
 creatives:creatives||[],paymentEvidence:proof||[],recentEventSamples:metrics};
}
async function audit(c,actor,action,type,id,details={}){
 await api(c,'gu_ad_admin_audit_v014226',{method:'POST',
 body:{actor,action,resource_type:type,resource_id:String(id),details}});
}
export async function onRequest({request,env}){
 try{
  const c=config(env),url=new URL(request.url);
  if(request.method==='GET'){
   if(url.searchParams.get('admin')==='1'){
    await owner(c,request);
    return respond({ok:true,...await readOwner(c)});
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
   const rows=await api(c,'ad_creatives?id=eq.'+id+'&status=in.(draft,approved,active,paused)',{
    method:'PATCH',body:{status:state,updated_at:new Date().toISOString()}});
   if(rows?.length!==1)throw bad('Creative not reviewable.',404);
   await audit(c,actor,'review_creative','creative',id,{state});
   return respond({ok:true,id,state});
  }
  if(action==='review_campaign'){
   const id=Number(body.id),verb=str(body.verb);
   if(!Number.isSafeInteger(id)||id<=0||!['approve','reject','pause','publish'].includes(verb))throw bad('Invalid campaign operation.');
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
