/* Owner/Admin-only Lemon Squeezy readiness: returns flags, NEVER secrets or IDs. */
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export async function onRequestGet({request,env}){
 const auth=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!auth)return response({ok:false,error:'Authentication required'},401);
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(base)||!env.SUPABASE_PUBLISHABLE_KEY)return response({ok:false,error:'Service unavailable'},503);
 try{const r=await fetch(base+'/rest/v1/rpc/gu_staff_lemon_readiness_v01432r1',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+auth,'content-type':'application/json'},body:'{}',cache:'no-store'});
  const staff=await r.json().catch(()=>null);
  if(!r.ok||!staff?.ok||!['OWNER','ADMIN'].includes(staff.role))return response({ok:false,error:'Authorized staff required'},403);
  const configured={apiKey:!!env.LEMON_SQUEEZY_API_KEY,storeId:!!env.LEMON_SQUEEZY_STORE_ID,webhookSecret:!!env.LEMON_SQUEEZY_WEBHOOK_SECRET,supabaseService:!!env.SUPABASE_SECRET_KEY};
  const mode=String(env.LEMON_SQUEEZY_TEST_MODE).toLowerCase()==='false'?'live':'test';
  return response({ok:true,provider:'LEMON_SQUEEZY',mode,checkoutEnvironmentEnabled:env.ENABLE_PAID_CHECKOUT==='true',databaseCheckoutEnabled:staff.databaseCheckoutEnabled===true,configured,
   webhookEndpoint:'/api/lemon-webhook',providerTestPurchaseVerified:false,providerAccountApproved:false,
   explanation:'Configuration flags alone do not verify provider activation, bank details, signed webhook delivery, refunds, or valid product variants.'});
 }catch{return response({ok:false,error:'Unable to verify staff session'},503)}
}
export async function onRequestPost(){return response({ok:false,error:'GET required'},405)}
