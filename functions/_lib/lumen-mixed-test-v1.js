/* Crownlight mixed TEST checkout: noncommercial shadow-only. All secrets stay on server.
 * No real-Lumen bucket, customer entitlements, or LIVE Stripe endpoint is referenced.
 */
export const QA_SKU='tool:MIXED_CHECKOUT_QA';
export const QA_PRICE_CENTS=1999;
export const QA_TEST_ACCOUNT='acct_1URGkDJY9FI7byHB';
export const QA_PRODUCT='prod_VX8wHOixVrXRMd';
export const QA_PRICE='price_1UW4f3JY9FI7byHBWiVEFL8Z';
export const isUuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x);
const fail=(message,status=503)=>Object.assign(new Error(message),{status});
const starts=(s,p)=>typeof s==='string'&&s.startsWith(p);
export function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 if(env.GU39_SANDBOX_SHADOW_GATE!=='true'||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||
   !env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SECRET_KEY||
   !starts(env.GU39_STRIPE_TEST_SECRET_KEY,'sk_test_')||
   !starts(env.GU39_STRIPE_TEST_WEBHOOK_SECRET,'whsec_'))throw fail('TEST_CONFIG_UNAVAILABLE');
 return {base,pub:env.SUPABASE_PUBLISHABLE_KEY,secret:env.SUPABASE_SECRET_KEY,
  stripe:env.GU39_STRIPE_TEST_SECRET_KEY};
}
function svcHeaders(secret){
 if(starts(secret,'sb_secret_'))return {apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  return {apikey:secret,authorization:'Bearer '+secret};
 throw fail('DATABASE_SECRET_UNAVAILABLE');
}
export async function db(c,path,method='GET',body){
 const r=await fetch(c.base+'/rest/v1/'+path,{method,cache:'no-store',
  headers:{...svcHeaders(c.secret),'content-type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw fail('TEST_DATABASE_UNAVAILABLE');
 if(r.status===204)return {};
 const result=await r.json().catch(()=>null);
 if(result===null)throw fail('TEST_DATABASE_RESPONSE_INVALID');
 return result;
}
export async function owner(req,c,{stepup=false}={}){
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw fail('OWNER_SIGN_IN_REQUIRED',401);
 const head={apikey:c.pub,authorization:'Bearer '+token,'content-type':'application/json'};
 const r=await fetch(c.base+'/auth/v1/user',{headers:head,cache:'no-store'});
 if(!r.ok)throw fail('OWNER_SESSION_INVALID',401);
 const u=await r.json().catch(()=>null);
 if(!isUuid(u?.id))throw fail('OWNER_SESSION_INVALID',401);
 const roleR=await fetch(c.base+'/rest/v1/rpc/gu_staff_role_v01432r1',
  {method:'POST',headers:head,body:'{}',cache:'no-store'});
 const role=await roleR.json().catch(()=>null);
 if(!roleR.ok||role?.ok!==true)throw fail('STAFF_ROLE_UNAVAILABLE');
 if(role.role!=='OWNER')throw fail('OWNER_ONLY_TEST',403);
 if(stepup){
  const check=await fetch(c.base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',
   {method:'POST',headers:head,body:'{}',cache:'no-store'});
  const approved=await check.json().catch(()=>null);
  if(!check.ok||approved!==true)throw fail('OWNER_PASSWORD_RECONFIRM_REQUIRED',403);
 }
 return u.id;
}
export async function testMode(c){
 const rows=await db(c,'gu39_sandbox_settings?select=enabled&id=eq.true&limit=1');
 if(!Array.isArray(rows)||rows.length!==1)throw fail('QA_SETTINGS_MISSING');
 return rows[0].enabled===true;
}
export async function stripe(c,path,options={}){
 const headers={authorization:'Bearer '+c.stripe};
 if(options.body!==undefined)headers['content-type']='application/x-www-form-urlencoded';
 // This QA-only session uses standard Stripe TEST Checkout without the
 // unrelated GU39 Merchant-of-Record preview. Existing GU39 APIs retain
 // their own independently configured Stripe API version and behavior.
 if(options.idempotency)headers['Idempotency-Key']=options.idempotency;
 const r=await fetch('https://api.stripe.com/v1/'+path,{
  method:options.body===undefined?'GET':'POST',headers,
  body:options.body,cache:'no-store'});
 const v=await r.json().catch(()=>null);
 // Report only safe Stripe error codes and parameter names to the authenticated
 // Owner TEST console. Never return provider response bodies or credentials.
 if((!r.ok||v?.error)&&path==='checkout/sessions'&&options.body!==undefined&&
    r.status>=400&&r.status<500){
   const code=String(v?.error?.code||v?.error?.type||'checkout_rejected')
    .replace(/[^a-zA-Z0-9_]/g,'').slice(0,48);
   const param=String(v?.error?.param||'').replace(/[^a-zA-Z0-9_\\[\\]]/g,'').slice(0,64);
   const e=new Error('STRIPE_TEST_CHECKOUT_REJECTED: '+code+(param?' ('+param+')':''));
   e.status=409;throw e;
 }
 if(!r.ok||!v||v.error)throw fail('TEST_STRIPE_PROVIDER_UNAVAILABLE');
 return v;
}
export async function verifyFixture(c){
 const [a,p,price]=await Promise.all([stripe(c,'account'),stripe(c,'products/'+QA_PRODUCT),
  stripe(c,'prices/'+QA_PRICE)]);
 if(a.id!==QA_TEST_ACCOUNT||p.id!==QA_PRODUCT||p.livemode!==false||p.active!==true||
    p.metadata?.gu_shadow_only!=='true'||price.id!==QA_PRICE||price.product!==QA_PRODUCT||
    price.livemode!==false||price.active!==true||price.unit_amount!==QA_PRICE_CENTS||
    price.currency!=='usd'||price.type!=='one_time')
   throw fail('TEST_STRIPE_FIXTURE_MISMATCH');
 return true;
}
export function quote(available,selected){
 if(!Number.isSafeInteger(available)||available<0||!Number.isSafeInteger(selected)||
    selected<0||selected>Math.min(available,286))throw fail('INVALID_TEST_SELECTION',400);
 const discount=Math.min(1999,selected*7),cash=1999-discount;
 return {originalCents:1999,unitCents:7,availableLumens:available,
  selectedLumens:selected,discountCents:discount,cashDueCents:cash,
  remainingLumens:available-selected,paymentSupported:cash===0||cash>=50,
  testOnly:true,shadowOnly:true};
}
export function response(data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private,no-store',
 'x-content-type-options':'nosniff'}});
}
export function apiFailure(e){
 const code=[400,401,403,409,423].includes(e?.status)?e.status:503;
 return response({ok:false,error:code===503?'TEST_SERVICE_UNAVAILABLE':e.message},code);
}
export function assertTestSession(v,i,user){
 return v?.livemode===false&&v.mode==='payment'&&v.currency==='usd'&&
 v.amount_subtotal===i.cash_due_cents&&v.amount_total===i.cash_due_cents&&
 v.client_reference_id===i.id&&v.metadata?.gu_mixed_qa_intent===i.id&&
 v.metadata?.gu_mixed_qa_member===user&&v.metadata?.gu_mixed_qa_cash===String(i.cash_due_cents);
}
