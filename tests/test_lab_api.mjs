import assert from 'node:assert/strict';
import {onRequest as site} from '../functions/api/admin-site-v01354.js';
import {onRequest as ops} from '../functions/api/admin-operations-v0135.js';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'service-test',SUPABASE_PUBLISHABLE_KEY:'pub-test'};
let queries=[];const response=(d,headers={})=>new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json',...headers}});
globalThis.fetch=async (path,init={})=>{const u=new URL(path);queries.push(u.href);
 if(u.pathname.endsWith('/auth/v1/user'))return response({id:'11111111-1111-4111-8111-111111111111'});
 if(u.pathname.endsWith('/profiles'))return response([{account_kind:'member'}]);
 if(u.pathname.endsWith('/admin_user_roles'))return response([{role_code:'OWNER',expires_at:null}]);
 if(u.pathname.endsWith('/admin_user_flags'))return response([]);
 if(u.pathname.endsWith('/platform_labs')){
  if(u.searchParams.get('select')==='lab_id'&&!u.searchParams.has('limit'))return response([],{'Content-Range':'0-0/16'});
  const code=u.searchParams.get('book_code');assert(code&&code.includes('DAY_TRADING_BOOK_1'));
  const offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||100),n=107;
  return response(Array.from({length:Math.max(0,Math.min(limit,n-offset))},(_,i)=>({lab_id:'DT-'+String(i+offset).padStart(3,'0'),book_code:'DAY_TRADING_BOOK_1',title:'Lab '+(i+offset),active:true,registry_visible:true})));
 }
 if(u.pathname.includes('competency_definitions')||u.pathname.includes('catalog_products')||u.pathname.includes('operations_events_v135'))return response([]);
 throw Error('Unexpected fetch '+u);
};
async function ask(fn,query){let req=new Request('https://mysite.test/api/x?action=labs'+query,{headers:{authorization:'Bearer fake'}});let r=await fn({request:req,env});return{status:r.status,data:await r.json()}}
let r=await ask(site,'');assert.equal(r.status,400);assert(!queries.some(x=>x.endsWith('/platform_labs')));
r=await ask(ops,'');assert.equal(r.status,400);
r=await ask(site,'&bookCode=FOUNDATION_BOOK_7');assert.equal(r.status,400);
r=await ask(site,'&bookCode=DAY_TRADING_BOOK_1&page=0');assert.equal(r.status,200);assert.equal(r.data.labs.length,50);assert.equal(r.data.hasMore,true);assert.equal(r.data.labs[0].book_code,'DAY_TRADING_BOOK_1');
r=await ask(site,'&bookCode=DAY_TRADING_BOOK_1&page=1');assert.equal(r.data.labs.length,50);
r=await ask(site,'&bookCode=DAY_TRADING_BOOK_1&page=2');assert.equal(r.data.labs.length,7);assert.equal(r.data.hasMore,false);
r=await ask(ops,'&bookCode=DAY_TRADING_BOOK_1&page=0');assert.equal(r.status,200);assert.equal(r.data.labs.length,50);assert.equal(r.data.hasMore,true);
for(const url of queries.filter(x=>x.includes('/platform_labs?'))){const u=new URL(url);assert(u.searchParams.has('book_code'),url);assert(Number(u.searchParams.get('limit')||0)<=51,url)}
console.log('PASS API: missing/invalid book rejected, per-book GET, exact 50-page contract, pagination, no all-site Lab reads');
