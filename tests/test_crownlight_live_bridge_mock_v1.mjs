/* Mock Cloudflare WS protocol acceptance; all observations/credentials fictional. */
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {mintLiveTicket} from '../functions/_lib/crownlight-live-auth-v1.js';
import {onRequest as liveBridge} from '../functions/api/live-market-stream.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const secret='LOCAL_TEST_ONLY_DO_NOT_DEPLOY_very_long_stable_string';
const member='11111111-1111-4111-8111-111111111111';
const env={MARKET_DATA_ENCRYPTION_KEY:secret,SUPABASE_URL:'https://local-test.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));
const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt']);
const iv=crypto.getRandomValues(new Uint8Array(12));
const pair={apiKey:'PK_TEST_MOCK_NEVER_REAL',apiSecret:'SK_TEST_MOCK_NEVER_REAL'};
const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(pair)));
const encoded=x=>Buffer.from(x).toString('base64');
const credential={status:'connected',credential_ciphertext:encoded(bytes),credential_iv:encoded(iv)};
const ticket=await mintLiveTicket(env,{userId:member,symbol:'AAPL'});
const original={fetch:globalThis.fetch,Response:globalThis.Response,WebSocket:globalThis.WebSocket,WebSocketPair:globalThis.WebSocketPair};
let calls=[],upstreams=[],lastPair;
class FakeSocket{
 constructor(){this.events={};this.sent=[];this.readyState=1;this.closed=false}
 addEventListener(name,handler){(this.events[name]||=[]).push(handler)}
 accept(){}
 send(data){this.sent.push(data)}
 close(){if(this.closed)return;this.closed=true;this.readyState=3;this.emit('close',{})}
 emit(type,value){for(const callback of this.events[type]||[])callback(type==='message'?{data:value}:value)}
}
class MockUpstream extends FakeSocket{constructor(url){super();this.url=url;upstreams.push(this)}}
class UpgradedResponse{
 constructor(body,{status,headers,webSocket}={}){this.status=status;this.headers=new Headers(headers);this.webSocket=webSocket;this.body=body}
}
const json=x=>({ok:true,json:async()=>x});
globalThis.fetch=async(url,opt)=>{
 calls.push({url:String(url),headers:opt?.headers});
 const name=new URL(url).pathname;
 if(name==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(name==='/rest/v1/admin_user_flags')return json([]);
 if(name==='/rest/v1/user_secure_credentials')return json([credential]);
 throw Error('Unexpected outbound URL '+url);
};
globalThis.Response=UpgradedResponse;
globalThis.WebSocket=MockUpstream;
globalThis.WebSocketPair=class {constructor(){lastPair={0:new FakeSocket(),1:new FakeSocket()};return lastPair}};
try{
 const request=new Request('https://local-site.test/api/live-market-stream',{headers:{
  Origin:'https://local-site.test',Upgrade:'websocket',
  'Sec-WebSocket-Protocol':'crownlight-v1, ticket.'+ticket
 }});
 const response=await liveBridge({request,env});
 assert.equal(response.status,101);
 assert.equal(response.headers.get('sec-websocket-protocol'),'crownlight-v1');
 assert.equal(response.webSocket,lastPair[0]);
 assert.deepEqual(upstreams.map(x=>x.url),['wss://stream.data.alpaca.markets/v2/iex']);
 assert.equal(calls.length,3,'Member, restrictions and private credential queries');
 assert(calls.every(x=>x.url.startsWith('https://local-test.supabase.co/rest/v1/')));
 assert(calls.every(x=>x.headers.apikey==='sb_secret_fixture'));
 upstreams[0].emit('open',{});
 const auth=JSON.parse(upstreams[0].sent[0]);
 assert.equal(auth.action,'auth');assert.equal(auth.key,pair.apiKey);assert.equal(auth.secret,pair.apiSecret);
 assert.equal(lastPair[1].sent.length,0,'Never forward authentication to member browser');
 upstreams[0].emit('message',JSON.stringify([{T:'success',msg:'authenticated'}]));
 assert.deepEqual(JSON.parse(upstreams[0].sent[1]),{action:'subscribe',trades:['AAPL']});
 upstreams[0].emit('message',JSON.stringify([{T:'subscription',trades:['AAPL']}]));
 upstreams[0].emit('message',JSON.stringify([{T:'t',S:'AAPL',p:123.45,s:50,i:9,t:'2026-10-28T14:02:03Z',secret:'DO_NOT_FORWARD'}]));
 upstreams[0].emit('message',JSON.stringify([{T:'t',S:'MSFT',p:10,s:1,t:'2026-10-28T14:02:04Z'}]));
 const all=lastPair[1].sent.join('\n');
 assert.match(all,/"type":"trade"/);
 assert.match(all,/"p":123.45/);
 assert.doesNotMatch(all,/DO_NOT_FORWARD|PK_TEST_MOCK|SK_TEST_MOCK|MSFT/);
 lastPair[1].close();assert(upstreams[0].closed,'Closing browser must close upstream account stream');
 const wrongOrigin=new Request('https://local-site.test/api/live-market-stream',{headers:{
  Origin:'https://attacker.example',Upgrade:'websocket','Sec-WebSocket-Protocol':'crownlight-v1, ticket.'+ticket
 }});
 const reject=await liveBridge({request:wrongOrigin,env});
 assert.equal(reject.status,403);
 console.log('PASS mocked Cloudflare IEX WebSocket: private authenticated connection, symbol restriction, safe packets, lifecycle close and origin denial');
}finally{
 globalThis.fetch=original.fetch;globalThis.Response=original.Response;
 globalThis.WebSocket=original.WebSocket;globalThis.WebSocketPair=original.WebSocketPair;
}
