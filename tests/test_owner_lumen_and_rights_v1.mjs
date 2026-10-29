import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/owner-lumen-tool-offers.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261029_owner_licensed_digital_books_v1.sql');
assert.match(sql,/rights_or_file_unavailable/);
assert.match(sql,/p\.kdp_select/);
assert.match(sql,/own\.role_code=''OWNER''/);
const auth=read('functions/_lib/advanced-tool-access-v014110.js');
assert.match(auth,/r\.role_code==='OWNER'/);
assert.match(auth,/SHOWCASE_VIEWER/);
const offer=read('supabase/migrations/20261029_owner_lumen_offer_pricing_audit_v1.sql');
assert.match(offer,/ENABLE ROW LEVEL SECURITY/);
assert.match(offer,/AFTER UPDATE ON public\.gu_lumen_tool_offers_v1/);
assert.match(read('admin.html'),/admin-lumen-tool-offers-v1.js/);
const old=globalThis.fetch;
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const config={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_testing',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_testing'};
let role='OWNER';
globalThis.fetch=async(uri,req={})=>{
 const path=new URL(uri).pathname;
 const json=data=>new Response(JSON.stringify(data),{status:200});
 if(path==='/auth/v1/user')return json({id:uid});
 if(path==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(path==='/rest/v1/admin_user_roles')return json([{role_code:role,expires_at:null}]);
 if(path==='/rest/v1/admin_user_flags')return json([]);
 if(path==='/rest/v1/gu_lumen_tool_offers_v1'){
  if(req.method==='PATCH')throw Error('Test must not activate a real priced offer');
  return json([{offer_code:'WATCHLIST_WORKBENCH_30D',tool_code:'WATCHLIST_WORKBENCH',
   duration_days:30,price_cents:null,lumens_cost:null,state:'draft',version:1}]);
 }
 throw Error('Unexpected '+path);
};
const req=(method='GET',data,origin='https://example.com')=>new Request('https://example.com/api/owner-lumen-tool-offers',{
 method,headers:{authorization:'Bearer valid',origin, ...(data?{'content-type':'application/json'}:{})},
 body:data?JSON.stringify(data):undefined});
try{
 let r=await onRequest({env:config,request:req()});assert.equal(r.status,200);
 assert.equal((await r.json()).offers[0].state,'draft');
 role='MEMBER';r=await onRequest({env:config,request:req()});assert.equal(r.status,403);
 role='OWNER';
 r=await onRequest({env:config,request:req('POST',{offerCode:'WATCHLIST_WORKBENCH_30D',version:1,
  priceCents:null,state:'active'})});assert.equal(r.status,400);
 r=await onRequest({env:config,request:req('POST',{offerCode:'WATCHLIST_WORKBENCH_30D',version:1,
  priceCents:2999,state:'active'},'https://wrong.com')});assert.equal(r.status,403);
 console.log('PASS active Owner-only release control, no accidental activation, audit history and book rights');
}finally{globalThis.fetch=old}
