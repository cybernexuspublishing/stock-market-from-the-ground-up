import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/signed-book-owner-detail.js';
const order='12345678-1234-4234-8234-123456789012';
const env={SUPABASE_URL:'https://fake.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',STRIPE_SECRET_KEY:'sk_test_123'};
let calls=[];const original=globalThis.fetch;
try{
 globalThis.fetch=async()=>{throw Error('No backend calls for anonymous')};
 let response=await onRequestGet({request:new Request('https://stock.example/api/signed-book-owner-detail?id='+order),env});
 assert.equal(response.status,401);
 calls=[];
 globalThis.fetch=async (url)=>{
  calls.push(String(url));if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'user'});
  if(String(url).includes('/rpc/gu_staff_signed_shipping_session_v01431r1'))return Response.json({message:'forbidden'},{status:403});
  throw Error('Owner negative test must not reach Stripe');
 };
 response=await onRequestGet({request:new Request('https://stock.example/api/signed-book-owner-detail?id='+order,{headers:{authorization:'Bearer normal-user'}}),env});
 assert.equal(response.status,403);
 assert(!calls.some(x=>x.includes('api.stripe.com')));
 calls=[];
 globalThis.fetch=async (url)=>{
  calls.push(String(url));if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'owner'});
  if(String(url).includes('/rpc/gu_staff_signed_shipping_session_v01431r1'))return Response.json('cs_test_owner123');
  if(String(url).includes('api.stripe.com/v1/checkout/sessions/'))return Response.json({id:'cs_test_owner123',payment_status:'paid',client_reference_id:order,shipping_details:{name:'Customer',address:{line1:'PO Box 14',line2:null,city:'City',state:'MO',postal_code:'65000',country:'US'}}});
  throw Error('Unexpected');
 };
 response=await onRequestGet({request:new Request('https://stock.example/api/signed-book-owner-detail?id='+order,{headers:{authorization:'Bearer owner-aal2'}}),env});
 assert.equal(response.status,200);const data=await response.json();assert(data.ok);assert.equal(data.address.country,'US');
 assert.equal(response.headers.get('cache-control'),'no-store, private');
 console.log('PASS: shipping details never returned without authorized OWNER or approved ADMIN DB session, no direct client token to Stripe.');
}finally{globalThis.fetch=original}
