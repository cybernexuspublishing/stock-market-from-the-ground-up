import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as credentials} from '../functions/api/credentials.js';
import {alpacaIexBars} from '../functions/api/marketdata.js';

const env={
 SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock_not_a_jwt',
 MARKET_DATA_ENCRYPTION_KEY:'local-test-key-material-not-for-production-2026'
};
const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const pair={apiKey:'PK_TEST_ALPACA_ID',apiSecret:'MOCK_ALPACA_SECRET'};
const oldFetch=globalThis.fetch;
let denied=false,saveCount=0,verifyUpdates=0,stored=null,external=0,apiPaths=[];
const response=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(input,options={})=>{
 const url=String(input),u=new URL(url);apiPaths.push(u.pathname);
 if(u.pathname==='/auth/v1/user')return response({id:member});
 if(u.pathname==='/rest/v1/profiles')return response([{account_kind:'member'}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return response([]);
 if(u.pathname==='/rest/v1/user_secure_credentials'){
  assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(options.headers.authorization,undefined,'Opaque service key is not a bearer JWT');
  if(options.method==='POST'){
   saveCount++;stored=JSON.parse(options.body);
   assert.equal(stored.status,'connected');
   assert(stored.credential_ciphertext&&!JSON.stringify(stored).includes(pair.apiSecret),'Store only encrypted credentials');
   assert.equal(stored.metadata.feed,'iex');assert.equal(stored.metadata.accountType,'paper');return response([]);
  }
  if(options.method==='PATCH'){verifyUpdates++;assert.equal(JSON.parse(options.body).metadata.accountType,'paper');return response([])}
  if(u.searchParams.get('select')?.includes('credential_ciphertext'))return response(stored?[stored]:[]);
  return response([]);
 }
 if(u.hostname==='data.alpaca.markets'){
  external++;assert.equal(u.protocol,'https:');
  assert.equal(options.headers['APCA-API-KEY-ID'],pair.apiKey);
  assert.equal(options.headers['APCA-API-SECRET-KEY'],pair.apiSecret);
  assert.equal(u.searchParams.get('feed'),'iex');
  assert.equal(options.method,undefined,'No trading POST/PUT/DELETE calls permitted');
  if(denied)return response({message:'Unauthorized'},401);
  return response({bars:[{t:'2026-10-22T13:30:00Z',o:12,h:13,l:11,c:12.5,v:400}]});
 }
 throw Error('Unexpected network URL '+url);
};
const request=(action,method='POST',body,origin='https://site.test')=>new Request('https://site.test/api/credentials?action='+action,{
 method,headers:{authorization:'Bearer test-member-session',origin,'content-type':'application/json'},
 body:method==='POST'?JSON.stringify(body||{}):undefined
});
try{
 let res=await credentials({env,request:request('save','POST',{serviceCode:'ALPACA_BYO',accountType:'paper',values:pair},'https://evil.test')});
 assert.equal(res.status,403);assert.equal(external,0);
 denied=true;
 res=await credentials({env,request:request('save','POST',{serviceCode:'ALPACA_BYO',accountType:'paper',values:pair})});
 assert.equal(res.status,403);assert.equal(saveCount,0,'A failed Alpaca test must not save credentials');
 denied=false;
 res=await credentials({env,request:request('save','POST',{serviceCode:'ALPACA_BYO',accountType:'paper',values:pair})});
 assert.equal(res.status,200);assert.equal((await res.json()).verified,true);assert.equal(saveCount,1);
 res=await credentials({env,request:request('verify','POST',{serviceCode:'ALPACA_BYO'})});
 assert.equal(res.status,200);assert.equal((await res.json()).feed,'iex');assert.equal(verifyUpdates,1);
 const bars=await alpacaIexBars(pair,{ticker:'AAPL',start:'2026-10-22',end:'2026-10-22',freq:'1min'});
 assert.equal(bars.length,1);assert.equal(bars[0].timestamp,'2026-10-22T13:30:00.000Z');
 assert.equal(bars[0].volume,400);
 await assert.rejects(alpacaIexBars(pair,{ticker:'AAPL',start:'2026-10-22',end:'2026-10-22',freq:'bad'}),/frequency/);
 assert(external>=4);
 assert(apiPaths.every(p=>!p.includes('/orders')&&!p.includes('/account')),'No broker/order APIs used');
 const activeUi=readFileSync('assets/js/dashboard-ui-legacy.js','utf8');
 assert.match(activeUi,/v1321-provider-dialog/);
 assert.match(activeUi,/Choose which Alpaca account to connect/);
 assert.match(activeUi,/modal.showModal\(\)/);
 assert.match(activeUi,/accountType/);
 assert.match(activeUi,/autocomplete="new-password"/);
 const ui=readFileSync('src/ts/production-completion.ts','utf8');
 assert.match(ui,/Alpaca — Market Data \(IEX\)/);
 assert.match(ui,/Test Market Data/);
 assert.match(ui,/Verify Market Data & Save/);
 console.log('PASS ALPACA BYO: denied auth, successful IEX validation, encrypted private save, retest, OHLCV and no trading calls');
}finally{globalThis.fetch=oldFetch}
