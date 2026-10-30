/* Stripe TEST-only ebook support: no LIVE credentials, no real entitlements. */
export const BOOK_CODE='FOUNDATION_BOOK_1';
export const TEST_PRODUCT='prod_VVF9MJLGagIs8Q';
export const TEST_PRICE='price_1UV603JY9FI7byHBAcdpKMKb';
export const TEST_ACCOUNT='acct_1URGkDJY9FI7byHB';
export const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
export const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export const fail=(message,status=503)=>Object.assign(Error(message),{status});
export const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
export const token=req=>/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('authorization')||'')?.[1]||'';
export const originOK=req=>req.headers.get('origin')===new URL(req.url).origin;
export function config(env,{requireEnabled=true}={}){
 if(requireEnabled&&env.GU_BOOK_STRIPE_TEST_ENABLED!=='true')throw fail('Book TEST checkout disabled.');
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 const service=String(env.SUPABASE_SECRET_KEY||'');
 const stripe=String((env.STRIPE_TEST_SECRET_KEY || env.GU_BOOK_STRIPE_TEST_SECRET_KEY)||'');
 const webhook=String((env.STRIPE_BOOK_TEST_WEBHOOK_SECRET || env.GU_BOOK_STRIPE_TEST_WEBHOOK_SECRET)||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base)||!pub||!service||
  !/^sk_test_[A-Za-z0-9_]{10,}$/.test(stripe)||!/^whsec_[A-Za-z0-9_]{10,}$/.test(webhook))
  throw fail('Book TEST payment configuration incomplete.');
 return {base,pub,service,stripe,webhook};
}
async function data(url,options={}){
 const r=await fetch(url,{cache:'no-store',...options});
 const payload=await r.json().catch(()=>({}));
 if(!r.ok||payload?.error)throw fail('Book TEST provider or database request failed.',r.status===401?401:r.status===403?403:503);
 return payload;
}
export async function stripe(c,path,options={}){
 const a=await data('https://api.stripe.com/v1/'+path,{...options,headers:{
  authorization:'Bearer '+c.stripe,...options.headers
 }});
 return a;
}
export async function db(c,name,args,authJwt){
 const key=authJwt?c.pub:c.service;
 const h={apikey:key,'content-type':'application/json'};
 if(authJwt)h.authorization='Bearer '+authJwt;
 else if(c.service.startsWith('eyJ'))h.authorization='Bearer '+c.service;
 return data(c.base+'/rest/v1/rpc/'+name,{method:'POST',headers:h,body:JSON.stringify(args||{})});
}
export async function user(c,req){
 const jwt=token(req);if(!jwt)throw fail('Sign in required.',401);
 const u=await data(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+jwt}});
 if(!uuid(u.id))throw fail('Sign in required.',401);
 return {id:u.id,jwt};
}
export async function accountOK(c){
 const a=await stripe(c,'account');
 if(a.id!==TEST_ACCOUNT)throw fail('Incorrect isolated Stripe TEST account.');
}
export async function priceOK(c){
 const p=await stripe(c,'prices/'+encodeURIComponent(TEST_PRICE));
 if(p.id!==TEST_PRICE||p.product!==TEST_PRODUCT||p.unit_amount!==1099||
 p.currency!=='usd'||p.livemode!==false||p.active!==true||p.type!=='one_time')
 throw fail('Book TEST Price mismatch.');
 return p;
}
export function clientError(e){
 const status=[400,401,403,409,413].includes(e?.status)?e.status:503;
 return reply({ok:false,error:status===401?'Sign in required.':status===403?'Not authorized for book TEST.':
  status===409?'A TEST checkout is already active or complete.':
  status===400?'Invalid request.':'Book TEST service unavailable.'},status);
}
