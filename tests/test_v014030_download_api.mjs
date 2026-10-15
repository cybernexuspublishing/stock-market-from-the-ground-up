import assert from 'node:assert/strict';
import {onRequestPost, onRequestGet} from '../functions/api/digital-book-download-v01430.js';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub-key',SUPABASE_SECRET_KEY:'secret-key'};
const make=(body,auth='Bearer good-jwt',origin='https://stock.example')=>new Request('https://stock.example/api/digital-book-download-v01430',{method:'POST',headers:{authorization:auth,origin,'content-type':'application/json'},body:JSON.stringify(body)});
let calls=[];
const old=globalThis.fetch;
try{
 globalThis.fetch=async()=>{throw Error('No provider calls on unauthorized requests')};
 assert.equal((await onRequestGet()).status,405);
 assert.equal((await onRequestPost({request:make({code:'FOUNDATION_BOOK_1'},''),env})).status,401);
 assert.equal((await onRequestPost({request:make({code:'../other'}),env})).status,400);
 assert.equal((await onRequestPost({request:make({code:'FOUNDATION_BOOK_1'},'Bearer good-jwt','https://evil.com'),env})).status,403);
 calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push({url:String(url),opts});
  if(String(url).includes('/auth/v1/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'});
  if(String(url).includes('/rest/v1/rpc/'))return Response.json({allowed:false,reason:'no_verified_digital_purchase'});
  throw Error('No signing if purchase absent');
 };
 let denied=await onRequestPost({request:make({code:'FOUNDATION_BOOK_1'}),env});
 assert.equal(denied.status,403);assert.equal(calls.length,2);
 const path='FOUNDATION_BOOK_1/11111111-1111-4111-8111-111111111111.epub';
 calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push({url:String(url),headers:opts.headers});
  if(String(url).includes('/auth/v1/user'))return Response.json({id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});
  if(String(url).includes('/rest/v1/rpc/'))return Response.json({allowed:true,path});
  if(String(url).includes('/storage/v1/object/sign/'))return Response.json({signedURL:'/object/sign/gu-digital-ebooks/'+path+'?token=123'});
  throw Error('Unexpected');
 };
 const ok=await onRequestPost({request:make({code:'FOUNDATION_BOOK_1'}),env});
 assert.equal(ok.status,200);const data=await ok.json();assert.equal(data.ok,true);assert.equal(data.expiresInSeconds,60);
 assert.match(data.url,/^https:\/\/test\.supabase\.co\/storage\/v1\/object\/sign\/gu-digital-ebooks\//);
 assert.equal(calls.length,3);
 assert.equal(calls[2].headers.authorization,'Bearer secret-key');
 // Suspicious storage redirect is never returned to the member.
 globalThis.fetch=async(url,opts)=>String(url).includes('/auth/v1/user')?Response.json({id:'x'}):String(url).includes('/rest/v1/rpc/')?Response.json({allowed:true,path}):Response.json({signedURL:'https://evil.com/book'});
 assert.equal((await onRequestPost({request:make({code:'FOUNDATION_BOOK_1'}),env})).status,503);
 console.log('PASS v014030: no unauthenticated signing, deny ownership gap, signed 60s URL, no untrusted redirect.');
}finally{globalThis.fetch=old}
