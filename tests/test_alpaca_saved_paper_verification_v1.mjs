/* Real credentials are never loaded. Exercise production credential-route logic with encrypted mock keys. */
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequest} from '../functions/api/credentials.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const raw='fixture_encryption_key_please_never_use_in_production';
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
const k=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt']);
const iv=crypto.getRandomValues(new Uint8Array(12)),keys={apiKey:'PK_PAPER_TEST',apiSecret:'SK_PAPER_TEST'};
const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(keys)));
const b64=b=>Buffer.from(b).toString('base64');
const member='11111111-1111-4111-8111-111111111111';
const env={SUPABASE_URL:'https://fixture-supabase.example',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',MARKET_DATA_ENCRYPTION_KEY:raw};
const stored={status:'connected',credential_ciphertext:b64(cipher),credential_iv:b64(iv),metadata:{marketDataOnly:true,providerVerification:'alpaca_iex_historical_bar'}};
const original=globalThis.fetch;
let patched=null,providerStatus=200,providers=0,orders=0;
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url),method=opts.method||'GET';
 if(u.hostname==='fixture-supabase.example'){
  if(u.pathname==='/auth/v1/user')return Response.json({id:member});
  if(u.pathname==='/rest/v1/profiles')return Response.json([{account_kind:'member'}]);
  if(u.pathname==='/rest/v1/admin_user_flags')return Response.json([]);
  if(u.pathname==='/rest/v1/user_secure_credentials'&&method==='GET')return Response.json([stored]);
  if(u.pathname==='/rest/v1/user_secure_credentials'&&method==='PATCH'){
   patched=JSON.parse(opts.body);return Response.json({});
  }
  throw Error('Unrecognized private endpoint: '+u.pathname);
 }
 assert.equal(u.hostname,'paper-api.alpaca.markets');
 assert.equal(u.pathname,'/v2/account');
 assert.equal(method,'GET','Paper verification must not place orders');
 assert.equal(opts.headers['APCA-API-KEY-ID'],keys.apiKey);
 assert.equal(opts.headers['APCA-API-SECRET-KEY'],keys.apiSecret);
 providers++;
 if(providerStatus===401)return Response.json({error:'Unauthorized'},{status:401});
 return Response.json({id:'alpaca-paper-fixture',status:'ACTIVE',equity:'100000'},{status:providerStatus});
};
try{
 const req=()=>new Request('https://crownlight-fixture.test/api/credentials?action=verify-paper',{
  method:'POST',headers:{origin:'https://crownlight-fixture.test',authorization:'Bearer fixture-session','content-type':'application/json'},
  body:JSON.stringify({serviceCode:'ALPACA_BYO'})});
 let response=await onRequest({request:req(),env});
 let data=await response.json();
 assert.equal(response.status,200);
 assert.equal(data.paperVerified,true);
 assert.equal(data.accountStatus,'ACTIVE');
 assert(!JSON.stringify(data).includes('PK_PAPER_TEST'));
 assert(!JSON.stringify(data).includes('SK_PAPER_TEST'));
 assert.equal(patched.metadata.accountType,'paper');
 assert.equal(patched.metadata.accountTypeSource,'provider_verified_paper');
 assert.equal(patched.metadata.marketDataOnly,false);
 assert.equal(patched.metadata.paperOrdersEnabled,true);
 assert.equal(patched.metadata.providerVerification,'alpaca_iex_historical_bar');
 assert.equal(patched.credential_ciphertext,undefined,'Saved credentials must not be rewritten');
 const before=JSON.stringify(patched);
 providerStatus=401;patched=null;
 response=await onRequest({request:req(),env});data=await response.json();
 assert.equal(response.status,403);
 assert.equal(patched,null,'Unauthorized paper verification must not modify credential state');
 assert.equal(data.paperVerified,undefined);
 assert.equal(orders,0);
 assert.equal(providers,2);
 console.log('PASS Alpaca saved-paper verification: authenticated paper-only GET, encrypted keys, preserved IEX metadata, failed keys unchanged and no orders');
}finally{globalThis.fetch=original}
