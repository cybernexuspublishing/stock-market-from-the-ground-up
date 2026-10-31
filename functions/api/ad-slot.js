/* v0.14.0.229 — advertiser-funded, context-only, fail-closed ad delivery.
 * GET only returns a Sponsor when the Owner has switched on delivery, campaign
 * LIVE invoice evidence is verified, and member plan allows that exact page.
 * POST counts are observational, not invoiceable CPM/CPC records.
 */
const slots=Object.freeze({
 HOME_INLINE:['/','/index.html'],STORE_INLINE:['/store.html'],
 KNOWLEDGE_TRADINGVIEW:['/knowledge-database.html'],
 BOOTCAMP_LEFT:['/bootcamp-academy.html'],BOOTCAMP_RIGHT:['/bootcamp-academy.html'],SKILLS_LEFT:['/skills.html'],SKILLS_RIGHT:['/skills.html'],
 STORE_LEFT:['/store.html'],STORE_RIGHT:['/store.html'],
 ALL_PRODUCTS_LEFT:['/store-all-products.html'],ALL_PRODUCTS_RIGHT:['/store-all-products.html'],ALL_PRODUCTS_BOTTOM:['/store-all-products.html'],

 COMMUNITY_TOP:['/market-commons.html'],
 BOOKS_BOTTOM:['/books.html'],MEMBERSHIP_BOTTOM:['/membership.html'],
 TOOLS_BOTTOM:['/tools.html'],ABOUT_BOTTOM:['/about.html'],
 COMMUNITY_INLINE:['/market-commons.html'],SAMPLE_LABS:['/lab-samples.html'],
 FREE_DASHBOARD:['/dashboard.html'],
 SIGNIN_LEFT:['/signin.html'],SIGNIN_RIGHT:['/signin.html'],SIGNIN_BOTTOM:['/signin.html'],
 SIGNUP_LEFT:['/create-account.html'],SIGNUP_RIGHT:['/create-account.html'],
 SIGNUP_BOTTOM:['/create-account.html']
});
const ok=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const baseConfig=env=>{const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!secret||!pub)throw Error('AD_API_CONFIG_MISSING');
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 return {base,pub,headers};
};
async function query(c,path,body){
 const res=await fetch(c.base+'/rest/v1/'+path,{method:body?'POST':'GET',
  headers:{...c.headers,...(body?{'content-type':'application/json',prefer:'return=representation'}:{})},
  body:body?JSON.stringify(body):undefined,cache:'no-store'});
 if(!res.ok)throw Error('AD_DATA_UNAVAILABLE');
 return res.status===204?[]:res.json();
}
function validHttps(input){
 try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''&&
 u.hostname.includes('.')&&!['localhost','127.0.0.1','0.0.0.0','::1'].includes(u.hostname.toLowerCase())&&
 !u.hostname.endsWith('.local')&&String(input).length<1000}
 catch{return false}
}
async function planCode(c,request){
 const authorization=request.headers.get('authorization')||'';
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(authorization)?.[1];
 if(!jwt)return 'SIGNED_OUT';
 const userResponse=await fetch(c.base+'/auth/v1/user',{
 headers:{apikey:c.pub,authorization:'Bearer '+jwt},cache:'no-store'});
 if(!userResponse.ok)return null; // invalid JWT never gets signed-out ads
 const user=await userResponse.json();if(!/^[a-f0-9-]{36}$/i.test(user?.id||''))return null;
 const roles=await query(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(user.id));
 if(roles?.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now())))return 'OWNER';
 const [membership,grants]=await Promise.all([
  query(c,'site_subscriptions?select=plan_code,status,current_period_end&user_id=eq.'+encodeURIComponent(user.id)+'&status=in.(active,trialing)&order=created_at.desc&limit=30'),
  query(c,'user_plan_grants?select=plan_code,status,ends_at&user_id=eq.'+encodeURIComponent(user.id)+'&status=in.(active,trialing)&limit=40')
 ]);
 const active=new Set([
  ...(membership||[]).filter(x=>!x.current_period_end||Date.parse(x.current_period_end)>Date.now()).map(x=>x.plan_code),
  ...(grants||[]).filter(x=>!x.ends_at||Date.parse(x.ends_at)>Date.now()).map(x=>x.plan_code)
 ]);
 if(active.has('LIFETIME'))return 'LIFETIME';
 // Active Sparks passes suppress sponsor delivery and impressions on all devices.
 const pass=await query(c,'gu_sparks_adfree_passes_v1?select=expires_at&user_id=eq.'+
  encodeURIComponent(user.id)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1');
 if(pass?.length)return 'SPARKS_ADFREE';
 if(active.has('FULL_ANNUAL'))return 'FULL_ANNUAL';
 if(active.has('FULL_MONTHLY'))return 'FULL_MONTHLY';
 if(active.has('A_LA_CARTE')||active.has('PICK_WHAT_YOU_WANT'))return 'A_LA_CARTE';
 return 'FREE';
}
async function placeholderEligibility(c,slot,path,request){
 // Placeholder inventory is independent from the LIVE advertising release switch.
 // Plan / route checks remain server-authoritative, including ad-free memberships.
 if(!Object.hasOwn(slots,slot)||!slots[slot].includes(path))return false;
 const placement=await query(c,'ad_placements?select=placement_code,active&placement_code=eq.'+encodeURIComponent(slot));
 if(placement?.[0]?.active!==true)return false;
 const role=await planCode(c,request);
 if(!role||['OWNER','LIFETIME','SPARKS_ADFREE'].includes(role))return false;
 if(role==='SIGNED_OUT'&&slot==='FREE_DASHBOARD')return false;
 if(/^(SIGNIN|SIGNUP)_/.test(slot)&&role!=='SIGNED_OUT')return false;
 const policies=await query(c,'plan_ad_policies?select=ads_enabled,allowed_slots&access_code=eq.'+encodeURIComponent(role));
 return policies?.[0]?.ads_enabled===true&&(policies[0].allowed_slots||[]).includes(slot);
}
async function eligibility(c,slot,path,request,audienceAlreadyVerified=false){
 const flags=await query(c,'gu_ad_sales_settings_v014226?select=ad_delivery_enabled,accepting_payments&singleton=eq.true');
 if(flags?.[0]?.ad_delivery_enabled!==true||flags?.[0]?.accepting_payments!==true)return false;
 return audienceAlreadyVerified===true||placeholderEligibility(c,slot,path,request);
}
async function underFrequencyLimit(c,request,token){
 if(!/^[a-f0-9-]{36}$/i.test(token||''))return false;
 const code=await planCode(c,request);
 if(!code||['OWNER','LIFETIME','SPARKS_ADFREE'].includes(code))return false;
 const policies=await query(c,'plan_ad_policies?select=max_impressions_per_session,max_impressions_per_24h,minimum_minutes_between_ads&access_code=eq.'+encodeURIComponent(code));
 const p=policies?.[0];if(!p||p.max_impressions_per_session<1||p.max_impressions_per_24h<1)return false;
 const history=await query(c,'ad_events?select=created_at&event_type=eq.impression&session_token=eq.'+
  encodeURIComponent(token)+'&order=created_at.desc&limit=100');
 if(!Array.isArray(history)||history.length>=100||history.length>=p.max_impressions_per_session)return false;
 const now=Date.now();
 const recent=history.filter(x=>now-Date.parse(x.created_at)<86400000&&now>=Date.parse(x.created_at));
 if(recent.length>=p.max_impressions_per_24h)return false;
 if(recent.length&&now-Date.parse(recent[0].created_at)<p.minimum_minutes_between_ads*60000)return false;
 return true;
}
async function eligibleAds(c,slot){
 const now=new Date().toISOString();
 const campaigns=await query(c,'ad_campaigns?select=id,last_verified_invoice,amount_cents,impression_limit,click_limit&status=eq.active&approval_state=eq.approved&payment_state=eq.verified_paid&starts_at=lte.'+
 encodeURIComponent(now)+'&ends_at=gte.'+encodeURIComponent(now)+'&limit=100');
 if(!Array.isArray(campaigns)||!campaigns.length)return [];
 const ids=campaigns.map(x=>x.id).filter(Number.isSafeInteger);
 if(!ids.length)return [];
 const creatives=await query(c,'ad_creatives?select=id,campaign_id,headline,body,destination_url,disclosure_label&status=eq.approved&placement_code=eq.'+
 encodeURIComponent(slot)+'&campaign_id=in.('+ids.join(',')+')&limit=150');
 const proof=await query(c,'gu_ad_order_evidence_v014226?select=campaign_id,invoice_ref,state,payment_mode&campaign_id=in.('+ids.join(',')+')&limit=150');
 const verified=new Set((proof||[]).filter(x=>x.state==='verified_paid'&&x.payment_mode==='live').map(x=>x.campaign_id+':'+x.invoice_ref));
 const counts=await query(c,'rpc/gu_ad_campaign_counts_v014233',{p_campaigns:ids});
 const byId=new Map((counts||[]).map(x=>[Number(x.campaign_id),x]));
 const permitted=new Set(campaigns.filter(x=>{
  if(!verified.has(x.id+':'+x.last_verified_invoice))return false;
  const used=byId.get(x.id);
  if(x.impression_limit!=null&&(Number(used?.impressions)||0)>=x.impression_limit)return false;
  if(x.click_limit!=null&&(Number(used?.clicks)||0)>=x.click_limit)return false;
  return true;
 }).map(x=>x.id));
 return (creatives||[]).filter(x=>permitted.has(x.campaign_id)&&validHttps(x.destination_url)&&
 String(x.headline||'').length>=8&&String(x.body||'').length>=20&&
 ['Advertisement','Sponsored'].includes(x.disclosure_label));
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return ok({ad:null},405);
  const c=baseConfig(env),url=new URL(request.url);
  if(request.method==='GET'){
   const slot=url.searchParams.get('slot')||'',page=url.searchParams.get('page')||'',
    token=url.searchParams.get('sessionToken')||'';
   // Owner preview renders a layout-only house creative for active inventory,
   // independent of paid campaign delivery. It never counts sponsor impressions.
   if(url.searchParams.get('ownerPreview')==='1'){
    if(!Object.hasOwn(slots,slot)||!slots[slot].includes(page))return ok({ad:null,placeholderAvailable:false});
    const previewRole=await planCode(c,request);
    if(previewRole==='OWNER'){
     const placement=await query(c,'ad_placements?select=placement_code,active&placement_code=eq.'+encodeURIComponent(slot));
     return ok({ad:null,placeholderAvailable:placement?.[0]?.active===true,ownerPreview:true});
    }
   }
   const placeholderAvailable=await placeholderEligibility(c,slot,page,request);
   if(!placeholderAvailable)return ok({ad:null,placeholderAvailable:false});
   const placementRows=await query(c,'ad_placements?select=metadata&placement_code=eq.'+encodeURIComponent(slot)+'&active=eq.true');
   const carouselEnabled=placementRows?.[0]?.metadata?.carousel_enabled===true;
   if(!(await eligibility(c,slot,page,request,true))||
      !(await underFrequencyLimit(c,request,token)))return ok({ad:null,placeholderAvailable:true,carouselEnabled});
   const options=await eligibleAds(c,slot);
   if(!options.length)return ok({ad:null,placeholderAvailable:true,carouselEnabled});
   // Each carousel transition is a fresh server-authorized request. Do not cache future creatives.
   const exclude=Number(url.searchParams.get('excludeCreativeId'));
   const alternatives=carouselEnabled&&Number.isSafeInteger(exclude)&&options.length>1
    ?options.filter(x=>x.id!==exclude):options;
   const pool=alternatives.length?alternatives:options;
   const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
   const item=pool[bytes[0]%pool.length];
   return ok({placeholderAvailable:true,carouselEnabled,hasMore:carouselEnabled&&options.length>1,
    ad:{creativeId:item.id,campaignId:item.campaign_id,slot,
    headline:item.headline,body:item.body,destinationUrl:item.destination_url,
    label:item.disclosure_label}});
  }
  const origin=request.headers.get('origin')||'';
  if(origin!==url.origin)return ok({ok:false},403);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=='object')return ok({ok:false},400);
  const slot=String(body.slot||''),page=String(body.page||''),type=String(body.type||''),
  creativeId=Number(body.creativeId),campaignId=Number(body.campaignId);
  if(!['impression','click'].includes(type)||!Number.isSafeInteger(creativeId)||
   !Number.isSafeInteger(campaignId)||(await eligibility(c,slot,page,request))!==true)
   return ok({ok:false},403);
  const eligible=await eligibleAds(c,slot);
  if(!eligible.some(x=>x.id===creativeId&&x.campaign_id===campaignId))return ok({ok:false},403);
  // Per-session dedupe, 24h. Metrics are indicative, never invoiced automatically.
  const token=String(body.sessionToken||'');
  if(!/^[a-f0-9-]{36}$/i.test(token))return ok({ok:false},400);
  if(type==='impression'&&!(await underFrequencyLimit(c,request,token)))
    return ok({ok:false,error:'AD_FREQUENCY_LIMIT'},429);
  const since=new Date(Date.now()-86400000).toISOString();
  const duplicate=await query(c,'ad_events?select=id&creative_id=eq.'+creativeId+
   '&event_type=eq.'+type+'&session_token=eq.'+encodeURIComponent(token)+
   '&created_at=gte.'+encodeURIComponent(since)+'&limit=1');
  if(!duplicate?.length)await query(c,'ad_events',{campaign_id:campaignId,creative_id:creativeId,
   placement_code:slot,event_type:type,session_token:token,page_path:page,
   metadata:{source:'first_party_contextual',billable:false}});
  return ok({ok:true,recorded:!duplicate?.length});
 }catch{return ok({ad:null,ok:false},503)}
}
