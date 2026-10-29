/* Source-verified $10.99 book LIVE Stripe contract. No LIVE charges in QA. */
export const BOOK_CODE='FOUNDATION_BOOK_1';
export const BOOK_PRODUCT='prod_VVF91RJdGeiACx';
export const BOOK_PRICE='price_1UVBsDJL0O4GGVBHdqAaP15z';
export const BOOK_AMOUNT=1099;
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff'};
export const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export const fail=(message,status=503)=>Object.assign(new Error(message),{status});
export const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
export const isBookEventTag=o=>Boolean(o?.metadata&&Object.keys(o.metadata).some(k=>k.startsWith('gu_book_live_')));
export function config(env,{checkout=false}={}){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 const service=String(env.SUPABASE_SECRET_KEY||'');
 const stripe=String(env.GU58_STRIPE_LIVE_SECRET_KEY||'');
 const acct=String(env.GU58_STRIPE_LIVE_ACCOUNT_ID||'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!pub||!service||
  !/^sk_live_[A-Za-z0-9_]{10,}$/.test(stripe)||!/^acct_[A-Za-z0-9_]{6,}$/.test(acct))
  throw fail('Book LIVE provider configuration incomplete.');
 if(checkout && (env.GU_BOOK_LIVE_CHECKOUT_ENABLED!=='true'||env.GU_PAYMENT_LIVE_LAUNCH_APPROVED!=='true'||
  env.GU58_LIVE_WEBHOOK_ENABLED!=='true'||env.GU58_LIVE_FULFILLMENT_APPROVED!=='true'||
  env.GU58_LIVE_DB_CONTRACT_APPROVED!=='true'))
  throw fail('Book LIVE checkout has not received independent launch and fulfillment approval.',503);
 return {base,pub,service,stripe,account:acct};
}
async function read(url,options={}){
 const r=await fetch(url,{...options,cache:'no-store'});
 const j=await r.json().catch(()=>null);
 if(!r.ok||!j||j.error)throw fail('Book LIVE provider or database operation unavailable.',503);
 return j;
}
export const stripe=(c,path,options={})=>read('https://api.stripe.com/v1/'+path,
 {...options,headers:{authorization:'Bearer '+c.stripe,...options.headers}});
export async function db(c,fn,args,token=null){
 const k=token?c.pub:c.service;
 const h={apikey:k,'content-type':'application/json'};
 if(token)h.authorization='Bearer '+token;
 else if(k.startsWith('eyJ'))h.authorization='Bearer '+k;
 return read(c.base+'/rest/v1/rpc/'+fn,{method:'POST',headers:h,body:JSON.stringify(args)});
}
export async function accountAndPrice(c){
 const [account,price,product]=await Promise.all([
  stripe(c,'account'),stripe(c,'prices/'+BOOK_PRICE),stripe(c,'products/'+BOOK_PRODUCT)
 ]);
 if(account.id!==c.account||price.id!==BOOK_PRICE||price.product!==BOOK_PRODUCT||
  price.active!==true||price.livemode!==true||price.type!=='one_time'||
  price.unit_amount!==BOOK_AMOUNT||price.currency!=='usd'||price.recurring!=null||
  product.id!==BOOK_PRODUCT||product.active!==true||product.livemode!==true)
  throw fail('Stripe LIVE Book I product/price/account mismatch.');
 return {account,price,product};
}
export async function bookRights(c){
 const rows=await read(c.base+'/rest/v1/catalog_products?select=product_code,product_type,active,store_visible,sales_status,kdp_select,direct_digital_enabled,website_checkout_enabled,metadata&product_code=eq.'+BOOK_CODE+'&limit=1',
  {headers:{apikey:c.service,...(c.service.startsWith('eyJ')?{authorization:'Bearer '+c.service}:{})}});
 const books=await read(c.base+'/rest/v1/gu_digital_books_v01430?select=sales_enabled,downloads_enabled,exclusive_until,rights_attested_at,asset_path&product_code=eq.'+BOOK_CODE+'&limit=1',
  {headers:{apikey:c.service,...(c.service.startsWith('eyJ')?{authorization:'Bearer '+c.service}:{})}});
 const p=rows[0],d=books[0];
 const r=p?.metadata?.website_price_by_format_cents_v135?.digital;
 const ready=p?.product_type==='book'&&p.active===true&&p.store_visible===true&&p.sales_status==='published'&&
  p.kdp_select===false&&p.direct_digital_enabled===true&&p.website_checkout_enabled===true&&
  Number(r)===BOOK_AMOUNT&&d?.sales_enabled===true&&d?.downloads_enabled===true&&
  !!d.rights_attested_at&&!!d.exclusive_until&&Date.parse(d.exclusive_until)<=Date.now()&&
  new RegExp('^'+BOOK_CODE+'/[a-f0-9-]{36}\\.epub$').test(d.asset_path||'');
 if(!ready)return false;
 const file=await read(c.base+'/rest/v1/storage.objects?select=name&bucket_id=eq.gu-digital-ebooks&name=eq.'+encodeURIComponent(d.asset_path)+'&limit=1',
  {headers:{apikey:c.service,...(c.service.startsWith('eyJ')?{authorization:'Bearer '+c.service}:{})}}).catch(()=>null);
 // storage.objects is generally not exposed by PostgREST; SQL reserve rechecks existence.
 return file===null?true:Array.isArray(file)&&file.length===1;
}
export async function user(c,req){
 const jwt=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!jwt)throw fail('Sign in required.',401);
 const u=await read(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+jwt}});
 if(!uuid(u.id))throw fail('Invalid sign-in session.',401);
 const h={apikey:c.service,...(c.service.startsWith('eyJ')?{authorization:'Bearer '+c.service}:{})};
 const [profile,flags,roles,age]=await Promise.all([
  read(c.base+'/rest/v1/profiles?select=account_kind,deleted_at&id=eq.'+u.id+'&limit=1',{headers:h}),
  read(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+u.id+'&limit=1',{headers:h}),
  read(c.base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+u.id+'&role_code=eq.SHOWCASE_VIEWER&limit=1',{headers:h}),
  read(c.base+'/rest/v1/account_private_identity?select=age_eligible,date_of_birth&user_id=eq.'+u.id+'&limit=1',{headers:h})
 ]);
 if(profile[0]?.account_kind!=='member'||profile[0]?.deleted_at||
  ['suspended','restricted'].includes(String(flags[0]?.status||'').toLowerCase())||
  roles.some(r=>!r.expires_at||Date.parse(r.expires_at)>Date.now())||
  age[0]?.age_eligible!==true||!age[0]?.date_of_birth)
  throw fail('Account ineligible for book checkout.',403);
 return {id:u.id,jwt};
}
function tag(s){
 const m=s?.metadata||{};
 if(!isBookEventTag(s))return null;
 if(!uuid(m.gu_book_live_intent)||!uuid(m.gu_book_live_member)||m.gu_book_live_code!==BOOK_CODE||
   s.client_reference_id!==m.gu_book_live_intent)
  throw Error('BOOK_LIVE_METADATA_MISMATCH');
 return {id:m.gu_book_live_intent,user:m.gu_book_live_member};
}
async function proof(c,id){
 if(!/^cs_live_[A-Za-z0-9_]+$/.test(String(id||'')))throw Error('NOT_LIVE_SESSION');
 const s=await stripe(c,'checkout/sessions/'+encodeURIComponent(id)),m=tag(s);
 if(!m||s.id!==id||s.livemode!==true||s.mode!=='payment'||s.payment_status!=='paid'||
  s.status!=='complete'||s.currency!=='usd'||s.amount_subtotal!==BOOK_AMOUNT||
  !/^pi_[A-Za-z0-9_]+$/.test(s.payment_intent||''))throw Error('BOOK_NOT_VERIFIED_PAID');
 const [items,pi]=await Promise.all([
  stripe(c,'checkout/sessions/'+encodeURIComponent(id)+'/line_items?limit=2'),
  stripe(c,'payment_intents/'+encodeURIComponent(s.payment_intent))
 ]);
 if(items.data?.length!==1||items.has_more===true||items.data[0]?.price?.id!==BOOK_PRICE||
  items.data[0]?.quantity!==1||items.data[0]?.amount_subtotal!==BOOK_AMOUNT||
  pi.id!==s.payment_intent||pi.livemode!==true||pi.status!=='succeeded'||
  pi.currency!=='usd'||Number(pi.amount_received)<BOOK_AMOUNT||
  pi.metadata?.gu_book_live_intent!==m.id||pi.metadata?.gu_book_live_member!==m.user)
  throw Error('BOOK_PROVIDER_PAYMENT_PROOF_MISMATCH');
 return {s,m,pi};
}
/* Only call after existing GU58 LIVE Stripe HMAC/account verification. */
export async function applyVerifiedBookEvent(c,event){
 const accepted=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed','checkout.session.expired','charge.refunded','charge.dispute.created']);
 if(!accepted.has(event?.type))return null;
 const obj=event?.data?.object;
 if(!obj)return null;
 if(event.type.startsWith('checkout.session.')){
  if(!isBookEventTag(obj))return null;
  const s=await stripe(c,'checkout/sessions/'+encodeURIComponent(obj.id));
  const m=tag(s);
  if(!m)throw Error('BOOK_EVENT_TAG_NOT_BOUND');
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   if(s.payment_status!=='paid')return true; // wait for the successful delayed-payment event
   const v=await proof(c,obj.id);
   const d=await db(c,'gu_book_live_apply_v1',{p_event:event.id,p_id:v.m.id,p_kind:'paid',
    p_session:s.id,p_pi:v.pi.id,p_price:BOOK_PRICE,p_amount:BOOK_AMOUNT});
   if(d.ok!==true)throw Error('BOOK_LIVE_GRANT_UNCONFIRMED');
   return true;
  }
  const expired=event.type==='checkout.session.expired';
  if(expired&&s.status!=='expired')return true;
  const d=await db(c,'gu_book_live_apply_v1',{p_event:event.id,p_id:m.id,p_kind:expired?'expired':'failed'});
  if(d.ok!==true)throw Error('BOOK_LIVE_TERMINAL_UNCONFIRMED');
  return true;
 }
 const chargeId=event.type==='charge.refunded'?obj.id:obj.charge;
 if(!/^ch_[A-Za-z0-9_]+$/.test(String(chargeId||'')))return null;
 const charge=await stripe(c,'charges/'+encodeURIComponent(chargeId));
 if(charge.livemode!==true||charge.id!==chargeId||!/^pi_[A-Za-z0-9_]+$/.test(charge.payment_intent||''))return null;
 const pi=await stripe(c,'payment_intents/'+encodeURIComponent(charge.payment_intent));
 const id=pi.metadata?.gu_book_live_intent,userId=pi.metadata?.gu_book_live_member;
 if(!id&&!userId)return null;
 if(!uuid(id)||!uuid(userId)||pi.livemode!==true)throw Error('BOOK_REVERSAL_METADATA_INVALID');
 if(event.type==='charge.refunded'&&Number(charge.amount_refunded||0)<Number(charge.amount||0))
  return true; // partial refunds do not automatically revoke the whole eBook license
 const d=await db(c,'gu_book_live_apply_v1',{p_event:event.id,p_id:id,
  p_kind:event.type==='charge.refunded'?'refunded':'disputed',p_pi:pi.id});
 if(d.ok!==true)throw Error('BOOK_REVERSAL_UNCONFIRMED');
 return true;
}
