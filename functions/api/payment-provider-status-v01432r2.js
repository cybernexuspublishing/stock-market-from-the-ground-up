/* v0.14.0.32-R2: OWNER/ADMIN-only readiness evidence. Never expose keys or IDs. */
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export async function onRequestGet({request,env}){
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!jwt)return respond({ok:false,error:'Sign in required.'},401);
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');const publishable=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(base)||!publishable)return respond({ok:false,error:'Service not configured.'},503);
 const headers={'apikey':publishable,'authorization':'Bearer '+jwt,'content-type':'application/json'};
 try{
  const roleResponse=await fetch(base+'/rest/v1/rpc/gu_owner_digital_payment_route_read_v01432r2',{method:'POST',headers,body:'{}',cache:'no-store'});
  if(!roleResponse.ok)return respond({ok:false,error:roleResponse.status===401||roleResponse.status===403?'Authorized staff required.':'Payment routing database not installed.'},roleResponse.status===401?401:roleResponse.status===403?403:503);
  const state=await roleResponse.json();if(!state?.ok||!['OWNER','ADMIN'].includes(state.role))return respond({ok:false,error:'Authorized staff required.'},403);
  const stripeKey=String(env.STRIPE_MANAGED_SECRET_KEY||'');
  const webhookKey=String(env.STRIPE_MANAGED_WEBHOOK_SECRET||'');
  const stripeTest=env.STRIPE_MANAGED_TEST_CHECKOUT_ENABLED==='true'&&stripeKey.startsWith('sk_test_')&&webhookKey.startsWith('whsec_');
  return respond({ok:true,role:state.role,configuredRoute:{provider:state.provider,enabled:state.enabled,updatedAt:state.updatedAt},
   managed:{secretConfigured:stripeKey.startsWith('sk_test_')||stripeKey.startsWith('sk_live_'),webhookSecretConfigured:webhookKey.startsWith('whsec_'),
      accountApprovalConfirmed:false,priceCatalogConfigured:!!env.STRIPE_MANAGED_PRICE_MAP_JSON,
      sandboxEnabled:stripeTest,productionEnabled:false,webhookEndpoint:'/api/stripe-managed-webhook-v01432r2'},
   lemon:{apiConfigured:!!env.LEMON_SQUEEZY_API_KEY,storeConfigured:!!env.LEMON_SQUEEZY_STORE_ID,
     webhookSecretConfigured:!!env.LEMON_SQUEEZY_WEBHOOK_SECRET,webhookEndpoint:'/api/lemon-webhook'},
   physical:{standardStripeSeparate:true,signedBookCheckoutEnabled:env.ENABLE_SIGNED_BOOK_STRIPE==='true'},
   warning:'Configuration presence is not merchant approval. Stripe Managed Payments live fulfillment is not installed. Do not enable live checkout.'});
 }catch{return respond({ok:false,error:'Unable to read protected payment status.'},503)}
}
export function onRequestPost(){return respond({ok:false,error:'GET required.'},405)}
