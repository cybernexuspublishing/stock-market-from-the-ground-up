/* Nonsecret provider selection; never grants entitlement or enables live checkout. */
const response=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function onRequestGet({env}){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');const key=env.SUPABASE_PUBLISHABLE_KEY;
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(base)||!key)return response({ok:false,provider:'NONE',checkoutEnabled:false},503);
 try{
  const r=await fetch(base+'/rest/v1/rpc/gu_digital_payment_route_get_v01432r2',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:'{}',cache:'no-store'});
  if(!r.ok)return response({ok:false,provider:'NONE',checkoutEnabled:false},503);
  const p=await r.json();const enabled=p?.enabled===true;
  const provider=p?.provider==='LEMON_SQUEEZY'?'LEMON_SQUEEZY':p?.provider==='STRIPE_MANAGED'?'STRIPE_MANAGED':'NONE';
  // Stripe Managed live merchant fulfillment is deliberately unsupported in R2.
  const active=enabled&&provider==='LEMON_SQUEEZY'&&env.ENABLE_PAID_CHECKOUT==='true';
  return response({ok:true,provider,enabled,checkoutEnabled:active,managedPaymentsReadyForLive:false});
 }catch{return response({ok:false,provider:'NONE',checkoutEnabled:false},503)}
}
