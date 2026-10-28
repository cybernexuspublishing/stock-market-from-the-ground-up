import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {onRequest as paperEndpoint} from '../functions/api/alpaca-paper.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const keyString='mock_encryption_key_longer_than_32_characters_2026';
const user='11111111-1111-4111-8111-111111111111';
const env={
 SUPABASE_URL:'https://test-supabase.example',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',MARKET_DATA_ENCRYPTION_KEY:keyString
};
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(keyString));
const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt']);
const iv=crypto.getRandomValues(new Uint8Array(12)),pair={apiKey:'PK_PAPER_MOCK',apiSecret:'SK_PAPER_MOCK'};
const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(pair)));
const b64=x=>Buffer.from(x).toString('base64');
const saved={credential_ciphertext:b64(ciphertext),credential_iv:b64(iv),status:'connected',
 metadata:{accountType:'paper'}};
let madeOrders=0,seen={},apiCalls=[],entitled=true;
const original=globalThis.fetch;
const reply=(x,status=200)=>Response.json(x,{status});
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url);apiCalls.push({url:u.toString(),method:opts.method||'GET'});
 if(u.hostname==='test-supabase.example'){
  if(u.pathname==='/auth/v1/user')return reply({id:user});
  if(u.pathname==='/rest/v1/profiles')return reply([{account_kind:'member',deleted_at:null}]);
  if(u.pathname==='/rest/v1/admin_user_flags')return reply([]);
  if(u.pathname==='/rest/v1/admin_user_roles')return reply([]);
  if(u.pathname==='/rest/v1/rpc/user_has_tool_access')return reply(entitled);
  if(u.pathname==='/rest/v1/user_secure_credentials')return reply([saved]);
  throw Error('Unexpected private path '+u.pathname);
 }
 assert.equal(u.hostname,'paper-api.alpaca.markets','Server must never use live brokerage endpoint');
 assert.equal(opts.headers['APCA-API-KEY-ID'],pair.apiKey);
 assert.equal(opts.headers['APCA-API-SECRET-KEY'],pair.apiSecret);
 if(u.pathname==='/v2/account')return reply({id:user,status:'ACTIVE',equity:'100000.00',cash:'95000.00',
  buying_power:'195000.00',currency:'USD',trading_blocked:false,account_blocked:false});
 if(u.pathname==='/v2/positions')return reply([]);
 if(u.pathname==='/v2/orders'&&opts.method!=='POST')return reply(Object.values(seen));
 if(u.pathname==='/v2/orders:by_client_order_id'){
  const current=seen[u.searchParams.get('client_order_id')];
  return current?reply(current):reply({error:'Not found'},404);
 }
 if(u.pathname==='/v2/orders'&&opts.method==='POST'){
  madeOrders++;
  const order=JSON.parse(opts.body);
  assert.equal(order.extended_hours,false);
  assert.equal(order.time_in_force,'day');
  assert.equal(order.symbol,'AAPL');
  assert.equal(order.qty,'2');
  seen[order.client_order_id]={id:'paper-order-mock',client_order_id:order.client_order_id,
   symbol:order.symbol,side:order.side,type:order.type,qty:order.qty,filled_qty:'0',status:'accepted'};
  return reply(seen[order.client_order_id]);
 }
 throw Error('Unexpected provider endpoint '+u.pathname);
};
const auth=(method='GET',origin='https://our-site.example',body)=>new Request('https://our-site.example/api/alpaca-paper'+(method==='POST'?'?action=submit':''),
 {method,headers:{authorization:'Bearer member-session',origin,'content-type':'application/json'},
 body:body?JSON.stringify(body):undefined});
try{
 let r=await paperEndpoint({env,request:auth()});
 assert.equal(r.status,200);let data=await r.json();
 assert.equal(data.mode,'ALPACA_PAPER_ONLY');assert.equal(data.account.equity,'100000.00');
 assert(!JSON.stringify(data).includes(pair.apiSecret));
 const order={symbol:'AAPL',side:'buy',type:'market',qty:2,
  clientOrderId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',confirm:'PAPER ONLY'};
 r=await paperEndpoint({env,request:auth('POST','https://evil.example',order)});
 assert.equal(r.status,403);assert.equal(madeOrders,0);
 r=await paperEndpoint({env,request:auth('POST','https://our-site.example',{...order,confirm:'BUY'})});
 assert.equal(r.status,400);assert.equal(madeOrders,0);
 r=await paperEndpoint({env,request:auth('POST','https://our-site.example',order)});
 assert.equal(r.status,200);data=await r.json();assert.equal(data.order.status,'accepted');assert.equal(madeOrders,1);
 r=await paperEndpoint({env,request:auth('POST','https://our-site.example',order)});
 data=await r.json();assert.equal(data.alreadySubmitted,true);assert.equal(madeOrders,1);
 saved.metadata.accountType='live';
 r=await paperEndpoint({env,request:auth('POST','https://our-site.example',{...order,clientOrderId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'})});
 assert.equal(r.status,403);assert.equal(madeOrders,1);
 saved.metadata.accountType='paper';entitled=false;
 r=await paperEndpoint({env,request:auth()});
 assert.equal(r.status,403);entitled=true;
 assert(apiCalls.every(x=>!x.url.includes('api.alpaca.markets/v2')||x.url.includes('paper-api.alpaca.markets')));
 const workbench=readFileSync('assets/js/crownlight-simulator-layout-v3.js','utf8');
 const tutor=readFileSync('assets/js/crownlight-chart-tutor-v1.js','utf8');
 const chart=readFileSync('assets/js/crownlight-chart-studio-v2.js','utf8');
 const html=readFileSync('simulator.html','utf8');
 const migration=readFileSync('supabase/migrations/20261028_free_two_sparks_monthly_v1.sql','utf8');
 assert.match(workbench,/sim-lab-picker/);assert.match(workbench,/byLab/);assert.match(workbench,/tablist/);
 assert.match(workbench,/cl-panel-paper/);assert.match(workbench,/academy:free5/);
 assert.match(tutor,/Session VWAP estimate/);assert.match(tutor,/no[ -]trade/i);
 assert.match(chart,/minBarSpacing:\.6/);assert.match(chart,/rightOffset:16/);
 assert.match(html,/crownlight-paper-terminal-v1\.js/);
 assert.match(migration,/free_included/);
 console.log('PASS Workbench V3, paper-only authenticated access, explicit order confirmation, idempotency, live-account rejection and Free Sparks migration');
}finally{globalThis.fetch=original}
