/* OWNER and Owner-authorized ADMIN only; AAL2 and DB toggle enforced per request. */
const result=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export async function onRequestGet({request,env}){
 try{
  const order=new URL(request.url).searchParams.get('id');
  const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!jwt)return result({ok:false,error:'Sign in with staff MFA.'},401);
  if(!/^[a-f0-9-]{36}$/i.test(order||''))return result({ok:false,error:'Invalid order.'},400);
  const db=String(env.SUPABASE_URL||'').replace(/\/$/,'');const pub=env.SUPABASE_PUBLISHABLE_KEY;const stripe=env.STRIPE_SECRET_KEY;
  if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(db)||!pub||!stripe)return result({ok:false,error:'Service not configured.'},503);
  const u=await fetch(db+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+jwt},cache:'no-store'});
  if(!u.ok)return result({ok:false,error:'Session expired.'},401);
  // SECURITY DEFINER checks actual OWNER, active role, and Supabase AAL2; never trust UI display role.
  const r=await fetch(db+'/rest/v1/rpc/gu_staff_signed_shipping_session_v01431r1',{method:'POST',headers:{apikey:pub,authorization:'Bearer '+jwt,'content-type':'application/json'},body:JSON.stringify({p_id:order}),cache:'no-store'});
  if(!r.ok)return result({ok:false,error:'Staff MFA, permissions, or paid order unavailable.'},403);
  const sid=await r.json().catch(()=>null);if(!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sid||''))return result({ok:false,error:'No verified paid order session.'},404);
  const resp=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sid),{headers:{Authorization:'Bearer '+stripe},cache:'no-store'});
  if(!resp.ok)return result({ok:false,error:'Shipping record unavailable at payment provider.'},503);
  const data=await resp.json();if(data?.id!==sid||data.payment_status!=='paid'||data.client_reference_id!==order)return result({ok:false,error:'Shipping identity mismatch.'},409);
  const details=data.collected_information?.shipping_details||data.shipping_details;
  const addr=details?.address||{};
  return result({ok:true,recipient:details?.name||'',phone:details?.phone||'',address:{line1:addr.line1||'',line2:addr.line2||'',city:addr.city||'',state:addr.state||'',postalCode:addr.postal_code||'',country:addr.country||''},shippingMethod:'Use KDP author copy, sign and reship. Buyer address shown only to OWNER or authorized ADMIN.'});
 }catch{return result({ok:false,error:'Unable to retrieve shipping record.'},503)}
}
export async function onRequestPost(){return result({ok:false,error:'GET required.'},405)}
