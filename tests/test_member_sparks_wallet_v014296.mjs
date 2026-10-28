import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/member-sparks-wallet.js';
import {readFileSync} from 'node:fs';
const realFetch=globalThis.fetch;
const member='11111111-1111-4111-8111-111111111111',wrong='22222222-2222-4222-8222-222222222222';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'anon-fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const req=(token=true)=>new Request('https://site.example/api/member-sparks-wallet?userId='+wrong,{headers:token?{authorization:'Bearer valid-fixture'}:{}});
let kind='member',flag='active',data={available:18,included:5,purchased:10,manual:3,nextExpiry:null};
let counts={};const response=(value,code=200)=>new Response(JSON.stringify(value),{status:code,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,opts={})=>{
 const u=new URL(url),path=u.pathname;
 counts[path]=(counts[path]||0)+1;
 assert.equal(opts.cache,'no-store');
 if(path==='/auth/v1/user')return response({id:member});
 if(path==='/rest/v1/profiles')return response([{account_kind:kind}]);
 if(path==='/rest/v1/admin_user_flags')return response([{status:flag}]);
 if(path==='/rest/v1/rpc/groundup_free_sparks_ensure')return response({ok:true,issued:0,monthlyAllowance:5,nextGrantAt:null});
 if(path==='/rest/v1/rpc/groundup_question_pass_summary'){
  const args=JSON.parse(opts.body);
  assert.equal(args.p_user_id,member,'wallet cannot read query-selected other member');
  assert.equal(opts.method,'POST');
  assert.equal(opts.headers.apikey,env.SUPABASE_SECRET_KEY);
  return response(data);
 }
 throw Error('Undeclared network access: '+url);
};
try{
 let r=await onRequest({request:req(),env});assert.equal(r.status,200);
 let j=await r.json();assert(j.ok);assert.deepEqual(j.wallet,data);
 assert.equal(j.purchaseEnabled,false);assert.match(j.howToUse,/never award official assessment mastery/);assert.equal(j.freeCredits.allowance,5);
 assert.match(r.headers.get('cache-control'),/no-store/);
 assert(!JSON.stringify(j).includes(member)&&!JSON.stringify(j).includes(wrong));
 assert.equal(counts['/rest/v1/rpc/groundup_question_pass_summary'],1);
 r=await onRequest({request:req(false),env});assert.equal(r.status,401);
 kind='showcase';r=await onRequest({request:req(),env});assert.equal(r.status,403);
 kind='member';flag='suspended';r=await onRequest({request:req(),env});assert.equal(r.status,403);
 flag='active';data={available:30,included:5,purchased:10,manual:3,nextExpiry:null};
 r=await onRequest({request:req(),env});assert.equal(r.status,503,'Ledger mismatch must fail closed');
 const page=readFileSync('dashboard.html','utf8'),nav=readFileSync('assets/js/navigation.js','utf8');
 assert(page.includes('id="member-sparks-wallet"')&&page.includes('id="sparks-wallet-total"'));
 assert(nav.includes('data-sparks-balance')&&nav.includes('/api/member-sparks-wallet'));
 assert(nav.includes('store-sparks.html')&&nav.includes('How to use'));
 const store=readFileSync('store.html','utf8');
 assert(!store.includes('id="store-tab-memberships"'),'Owner-hidden legacy membership selection remains unavailable');
 assert(store.includes('id="store-tab-founders"'));
 const source=readFileSync('assets/js/store.js','utf8');
 assert(source.includes("parts=['founders','books','sparks','tools','current','upcoming']"),'Six public Store categories, with legacy memberships hidden');
 console.log('PASS secure member Sparks wallet + six-category public Store: isolated identity, no-charge, private ledger, no fake balance');
}finally{globalThis.fetch=realFetch}
