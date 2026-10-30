/* v0.14.0.264 — read-only TEST/LIVE Founding 600 catalog + webhook reconciliation.
 * Never creates, updates, confirms, charges or reveals provider credentials.
 */
const testPrices={
 FOUNDING_14:'price_1UVDQoJY9FI7byHBuiYDnHrX',
 FOUNDING_30:'price_1UUCNbJY9FI7byHBCX2VWdLi',
 FOUNDING_60:'price_1UUCNkJY9FI7byHBuh6pT4xd'
};
const amounts={FOUNDING_14:{cents:2299,days:14},FOUNDING_30:{cents:4999,days:30},FOUNDING_60:{cents:5999,days:60}};
const known=(s,p)=>typeof s==='string'&&new RegExp('^'+p+'_[A-Za-z0-9_]{6,}$').test(s);
const checks={
 sandbox:{endpoint:'https://stock-market-from-the-ground-up.pages.dev/api/gu39-stripe-webhook',
  events:['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created']},
 live:{endpoint:'https://stock-market-from-the-ground-up.pages.dev/api/founding600-webhook',
  events:['invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created']}
};
function response(state,detail){return {state,detail}}
async function getTestOrLive(key,path){
 const r=await fetch('https://api.stripe.com/v1/'+path,{
  method:'GET',headers:{authorization:'Bearer '+key,accept:'application/json'},
  cache:'no-store',signal:AbortSignal.timeout(8000)
 });
 if(!r.ok)throw Error('Provider read unavailable');
 return r.json();
}
async function inspectMode({key,livemode,catalog,mode,siteOrigin}){
 const type=livemode?'LIVE':'TEST';
 if(typeof key!=='string'||!(livemode?key.startsWith('sk_live_'):key.startsWith('sk_test_')))
  return response('action_required',type+' Stripe server credential unavailable or wrong mode.');
 if(!catalog||!Object.values(catalog).every(p=>known(p.priceId,'price')))
  return response('action_required',type+' plan-to-Stripe price mapping missing.');
 try{
  const codes=catalog.FOUNDING_14?['FOUNDING_14','FOUNDING_30','FOUNDING_60']:['FOUNDING_30','FOUNDING_60'];
  if(codes.some(code=>!catalog[code]?.priceId))return response('action_required',type+' Founding catalog incomplete');
  const [ps,webhooks]=await Promise.all([
   Promise.all(codes.map(code=>getTestOrLive(key,'prices/'+encodeURIComponent(catalog[code].priceId)))),
   getTestOrLive(key,'webhook_endpoints?limit=100')
  ]);
  const matches=codes.every((code,i)=>{
   const p=ps[i],expected=amounts[code];
   return p.id===catalog[code].priceId&&p.livemode===livemode&&p.currency==='usd'&&
    p.unit_amount===expected.cents&&p.active===true&&
    p.recurring?.interval==='day'&&p.recurring?.interval_count===expected.days&&
    (!catalog[code].productId||p.product===catalog[code].productId);
  });
  if(!matches)return response('action_required',type+' prices, billing cadences or Stripe account modes disagree with the approved Founding 600 catalog.');
  const [a,b]=await Promise.all(ps.map(p=>getTestOrLive(key,'products/'+encodeURIComponent(p.product))));
  const products=[a,b];
  if(products.some((p,i)=>p.id!==ps[i].product||p.livemode!==livemode||
    (p.metadata?.site_sku&&p.metadata.site_sku!==codes[i])))
    return response('action_required',type+' Founder product identity or SKU mapping mismatch.');
  const required=checks[mode];
  const configured=String(siteOrigin||'https://stock-market-from-the-ground-up.pages.dev');
  let endpoint;
  try{const u=new URL(configured);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.port)throw Error('Invalid origin');endpoint=u.origin+new URL(required.endpoint).pathname}
  catch{return response('action_required','Verified website origin is missing or malformed.');}
  const hook=(webhooks.data||[]).find(w=>w.url===endpoint&&w.livemode===livemode&&
   required.events.every(e=>w.enabled_events?.includes(e)));
  if(!hook)return response('action_required',type+' Founding webhook destination or subscribed lifecycle events do not match.');
  if(livemode){
   if(products.some(p=>p.active!==true)||hook.status!=='enabled'||(catalog.FOUNDING_14&&products[0].metadata?.site_checkout_enabled!=='true'))
    return response('pending','LIVE Founder prices and billing intervals match. The 14-Day product remains QA-only, or a provider release gate is inactive; verify paid-cycle fulfillment before selling.');
   return response('review','LIVE catalog and webhook are configured, but real paid-member fulfillment has not been independently accepted. Do not enable charges from this check.');
  }
  if(products.some(p=>p.active!==true)||hook.status!=='enabled')
   return response('action_required','Stripe TEST Founder products or webhook are inactive; Sandbox checkout cannot be accepted.');
  // A green catalog is meaningless if an older production TEST destination
  // also receives invoice events. Require exactly one active GU39 endpoint
  // for this platform, with no second active signing-secret destination.
  const projectTestHooks=(webhooks.data||[]).filter(w=>{
   if(w.livemode!==false||w.status!=='enabled')return false;
   try{
    const u=new URL(w.url);
    return u.protocol==='https:'&&u.pathname==='/api/gu39-stripe-webhook'&&
     u.hostname.endsWith('.pages.dev')&&
     u.hostname.startsWith('stock-market-from-the-ground-up');
   }catch{return false}
  });
  if(projectTestHooks.length!==1||projectTestHooks[0]!==hook)
   return response('action_required','TEST webhook routing is not exclusive to the configured site; disable legacy or duplicate TEST destinations before declaring Sandbox readiness.');
  return response('verified',codes.length+' Founding 600 TEST products, their approved recurring prices, and the exclusively configured signed-webhook event subscriptions match. A provider-delivered TEST invoice remains a separate acceptance test.');
 }catch{
  return response('review',type+' Stripe provider could not be independently contacted; no false acceptance or payment action was taken.');
 }
}
export async function founderCatalogReadiness(env){
 let liveCatalog;
 try{liveCatalog=JSON.parse(env.GU_F600_LIVE_CATALOG_JSON||'null')}catch{liveCatalog=null}
 const liveOK=liveCatalog?.FOUNDING_30&&liveCatalog?.FOUNDING_60;
 let sandboxCatalog=null;
 try{sandboxCatalog=env.GU_F600_TEST_CATALOG_JSON?JSON.parse(env.GU_F600_TEST_CATALOG_JSON):null}catch{}
 const sandbox=await inspectMode({key:env.GU39_STRIPE_TEST_SECRET_KEY,livemode:false,mode:'sandbox',siteOrigin:env.PUBLIC_SITE_URL,
  catalog:sandboxCatalog||{FOUNDING_30:{priceId:testPrices.FOUNDING_30},FOUNDING_60:{priceId:testPrices.FOUNDING_60}}});
 const live=liveOK?await inspectMode({key:(env.STRIPE_LIVE_SECRET_KEY || env.GU58_STRIPE_LIVE_SECRET_KEY),livemode:true,mode:'live',siteOrigin:env.PUBLIC_SITE_URL,catalog:liveCatalog}):
  response('action_required','LIVE Founder catalog is missing one or both configured plan mappings.');
 return {sandbox,live};
}
