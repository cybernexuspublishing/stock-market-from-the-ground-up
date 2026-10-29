import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/member-sparks-balance.js';
const nav=readFileSync('assets/js/navigation.js','utf8');
for(const token of ['},5000)','document.visibilityState===\'hidden\'','sparksRefreshInFlight','stopSparksHeartbeat','member-sparks-balance'])assert(nav.includes(token),token);
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-key',SUPABASE_SECRET_KEY:'private-key'};
const orig=globalThis.fetch;
let restricted=false,walletCalls=0;
const response=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async url=>{
 const p=new URL(url).pathname;
 if(p==='/auth/v1/user')return response({id:'11111111-1111-4111-8111-111111111111'});
 if(p==='/rest/v1/profiles')return response([{account_kind:'member',deleted_at:null}]);
 if(p==='/rest/v1/admin_user_flags')return response(restricted?[{status:'restricted'}]:[]);
 if(p==='/rest/v1/rpc/groundup_question_pass_summary'){walletCalls++;return response({available:12,included:5,manual:7,purchased:0})}
 throw Error('Unexpected or mutating request '+p);
};
try{
 const request=()=>new Request('https://site.example/api/member-sparks-balance',{headers:{authorization:'Bearer member-synthetic'}});
 const x=await onRequest({request:request(),env});assert.equal(x.status,200);
 assert.equal((await x.json()).wallet.available,12);
 restricted=true;const y=await onRequest({request:request(),env});assert.equal(y.status,403);
 const guest=await onRequest({request:new Request('https://site.example/api/member-sparks-balance'),env});
 assert.equal(guest.status,401);
 assert.equal(walletCalls,1,'Restricted/guest balance must not be retrieved');
 console.log('PASS five-second read-only nav refresh with restricted and guest denial');
}finally{globalThis.fetch=orig}
