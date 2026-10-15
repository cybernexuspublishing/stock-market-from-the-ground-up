import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {onRequest}=await import(pathToFileURL(resolve('functions/api/checkout-v0135.js')).href);
const env={SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SECRET_KEY:'secret',ENABLE_PAID_CHECKOUT:'true'};
const calls=[];let select=true;
globalThis.fetch=async (input,opts={})=>{
  const url=String(input);calls.push(url);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'a76b723e-e693-455a-acb0-54e5a454588c',email:'buyer@example.test'});
  if(url.includes('/rest/v1/profiles?'))return Response.json([{account_kind:'member'}]);
  if(url.includes('/rest/v1/admin_user_flags?'))return Response.json([]);
  if(url.includes('/rest/v1/account_private_identity?'))return Response.json([{age_eligible:true,date_of_birth:'1980-01-01'}]);
  if(url.includes('/rest/v1/catalog_products?'))return Response.json([{product_type:'book',product_code:'FOUNDATION_BOOK_1',title:'Foundations Book I',kdp_select:select,direct_digital_enabled:!select,direct_physical_enabled:true,website_checkout_enabled:true,sales_status:'published',metadata:{checkout_variants_v135:{digital:'123'},website_price_by_format_cents_v135:{digital:1099}}}]);
  if(url.includes('/rest/v1/site_settings?'))return Response.json([{value:true}]);
  throw new Error('Unexpected request '+url);
};
function request(action,method,format){return new Request(`https://site.example.test/api/checkout-v0135?action=${action}&type=book&code=FOUNDATION_BOOK_1&format=${format}`,{method,headers:{authorization:'Bearer member-jwt'},...(method==='POST'?{body:JSON.stringify({type:'book',code:'FOUNDATION_BOOK_1',format}),headers:{authorization:'Bearer member-jwt','content-type':'application/json'}}:{})});}
for(const format of ['paperback','hardcover']){
 calls.length=0;
 const quote=await onRequest({request:request('quote','GET',format),env});
 assert.equal(quote.status,403);assert.equal(calls.length,0);
 const create=await onRequest({request:request('create','POST',format),env});
 assert.equal(create.status,403);assert(!calls.some(x=>x.includes('lemonsqueezy.com')||x.includes('checkout_intents')));
}
select=true;calls.length=0;
assert.equal((await onRequest({request:request('quote','GET','digital'),env})).status,403);
assert(!calls.some(x=>x.includes('lemonsqueezy.com')));
select=false;calls.length=0;
const quote=await onRequest({request:request('quote','GET','digital'),env});
assert.equal(quote.status,200);
const payload=await quote.json();assert(payload.checkoutEnabled);assert.equal(payload.item.amount,1099);
assert(!calls.some(x=>x.includes('lemonsqueezy.com')));
console.log('PASS v014028: no physical payment intent/provider calls; KDP Select blocks digital; eligible digital quote remains operational.');
