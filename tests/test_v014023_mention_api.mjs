import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/community-mention-preferences-v01423.js';
const ENV={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_public'};
const uid='e5972562-c6e7-4591-89ab-241bb502625e';
const calls=[];
globalThis.fetch=async(url,init={})=>{
 calls.push({url:String(url),init});
 if(String(url).endsWith('/auth/v1/user'))return Response.json({id:uid});
 if(String(url).includes('gu_commons_mention_pref_get_v01423'))return Response.json({mentions_enabled:false,updated_at:null});
 if(String(url).includes('gu_commons_mention_pref_save_v01423')){
  const p=JSON.parse(init.body);assert.deepEqual(p,{p_mentions_enabled:true});return Response.json({mentions_enabled:true,updated_at:'2026-10-15T13:00:00Z'});
 }
 throw Error('Unexpected request '+url);
};
const call=(method='GET',body,authorization='Bearer session')=>onRequest({
 request:new Request('https://test.example/api/community-mention-preferences-v01423',{
   method,headers:authorization?{'authorization':authorization,'content-type':'application/json'}:{},
   body:body===undefined?undefined:JSON.stringify(body)}),env:ENV});
assert.equal((await call('GET',undefined,null)).status,401);
assert.equal((await call('POST',{mentionsEnabled:'true'})).status,400);
assert.equal((await call('POST',{mentionsEnabled:true,userId:uid})).status,400);
assert.equal((await call('PUT')).status,405);
let got=await call();assert.equal(got.status,200);assert.equal((await got.json()).preferences.mentionsEnabled,false);
got=await call('POST',{mentionsEnabled:true});assert.equal(got.status,200);
assert.equal((await got.json()).preferences.mentionsEnabled,true);
assert(calls.every(c=>c.init.headers.authorization==='Bearer session'));
assert(calls.every(c=>c.init.headers.apikey==='sb_public'));
assert(!calls.some(c=>c.url.includes('service_role')||c.url.includes('user_id=eq')));
assert(calls.some(c=>c.url.includes('/rpc/gu_commons_mention_pref_save_v01423')));
globalThis.fetch=async(url)=>String(url).endsWith('/auth/v1/user')?new Response('',{status:401}):Response.json({});
assert.equal((await call()).status,401);
globalThis.fetch=async(url)=>String(url).endsWith('/auth/v1/user')?Response.json({id:uid}):new Response('{}',{status:404});
assert.equal((await call()).status,503);
console.log('PASS: mention preference caller JWT binding, strict boolean, RPC mapping and fail-closed status.');
