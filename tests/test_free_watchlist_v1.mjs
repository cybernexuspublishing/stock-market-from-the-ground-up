import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/free-watchlist.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('free-watchlist.html'),js=read('assets/js/free-watchlist-v1.js');
const sql=read('supabase/migrations/20261026_free_research_watchlist_v1.sql');
for(const x of ['free-watchlist-form','free-watchlist-symbol','free-watchlist-list',
 'free-watchlist-research-note','free-watchlist-save-status'])
 assert.equal((html.match(new RegExp('id="'+x+'"','g'))||[]).length,1,'duplicate or missing '+x);
for(const x of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL','TO service_role',
 'gu_free_watchlist_limit_before_v1','gu_free_watchlist_audit_after_v1',
 'FREE_WATCHLIST_MAX_20_ENTRIES','pg_advisory_xact_lock'])
 assert(sql.includes(x),'missing database limit/security '+x);
assert(js.includes('textContent'), 'research notes must use DOM text, not unsafe raw HTML');
assert(js.includes('Account changed during loading.'),'account switches must invalidate late private responses');
const u1='00000000-0000-4000-8000-000000000123';
const u2='00000000-0000-4000-8000-000000000456';
const rows=new Map(), state={restricted:false,showcase:false,paid:false,writes:0};
const prev=globalThis.fetch;
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
function toEntry(raw){return {user_id:raw.user_id,symbol:raw.symbol,
 status:raw.status,source_kind:raw.source_kind,research_note:raw.research_note,
 source_note:raw.source_note,created_at:'2026-10-26T00:00:00Z',updated_at:'2026-10-26T00:00:00Z'} }
globalThis.fetch=async(raw,opts={})=>{
 const u=new URL(raw),path=u.pathname,verb=opts.method||'GET';
 const header=opts.headers?.authorization||'';
 const member=header==='Bearer A'?u1:header==='Bearer B'?u2:null;
 if(path==='/auth/v1/user')return member?response({id:member}):response({code:'invalid'},401);
 if(path==='/rest/v1/profiles')return response([{account_kind:state.showcase?'showcase':'member'}]);
 if(path==='/rest/v1/admin_user_flags')return response(state.restricted?[{status:'suspended'}]:[]);
 if(path==='/rest/v1/rpc/user_has_tool_access')return response(state.paid);
 if(path==='/rest/v1/gu_free_research_watchlist_v1'){
  const userParam=u.searchParams.get('user_id'),requested=userParam?.slice(3),symbol=u.searchParams.get('symbol')?.slice(3);
  assert([u1,u2].includes(requested),'API must always filter by current authenticated user');
  const key=(sym)=>requested+':'+sym;
  if(verb==='GET')return response([...rows.values()].filter(x=>x.user_id===requested));
  state.writes++;
  assert.equal(opts.headers?.prefer,'return=representation','writes must confirm database row');
  if(verb==='POST'){
   const item=JSON.parse(opts.body);assert.equal(item.user_id,requested,'cannot forge another member ID');
   if(rows.has(key(item.symbol)))return response({code:'23505'},409);
   rows.set(key(item.symbol),toEntry(item));
   return response([rows.get(key(item.symbol))],201);
  }
  if(verb==='PATCH'){
   const item=rows.get(key(symbol));if(!item)return response([]);
   const patch=JSON.parse(opts.body);
   assert(!Object.hasOwn(patch,'user_id'),'cannot reassign ownership');
   Object.assign(item,patch);return response([item]);
  }
  if(verb==='DELETE'){
   const item=rows.get(key(symbol));
   if(!item)return response([]);
   rows.delete(key(symbol));return response([item]);
  }
 }
 throw Error('Unexpected test endpoint '+path);
};
async function call({method='GET',token='A',origin,body}={}){
 const headers={};
 if(token)headers.authorization='Bearer '+token;
 if(origin)headers.origin=origin;
 if(body)headers['content-type']='application/json';
 const req=new Request('https://fixture.example/api/free-watchlist',{
  method,headers,...(body?{body:JSON.stringify(body)}:{})
 });
 const res=await onRequest({request:req,env:{
  SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_fixture',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'
 }});
 return {status:res.status,data:await res.json()};
}
const sample={action:'add',symbol:'GUSIM',status:'NO_TRADE',
 sourceKind:'FICTIONAL',researchNote:'An entirely fictional study case. No verified source or real quote exists; choose NO TRADE.',
 sourceNote:'Original fictional 2040 teaching scenario'};
try{
 let r=await call();assert.equal(r.status,200);assert.deepEqual(r.data.entries,[]);
 r=await call({method:'POST',body:{...sample,user_id:u2}});assert.equal(r.status,201);
 assert.equal(r.data.entry.symbol,'GUSIM');assert.equal(rows.get(u1+':GUSIM').user_id,u1);
 r=await call({token:'B'});assert.equal(r.status,200);assert.deepEqual(r.data.entries,[],'second member must never see first member research');
 r=await call();assert.equal(r.data.entries.length,1);
 r=await call({method:'POST',body:sample});assert.equal(r.status,409,'duplicate symbol denied');
 r=await call({method:'POST',body:{...sample,action:'update',researchNote:'A revised wholly FICTIONAL note, still with no genuine market source and a careful NO TRADE choice.'}});
 assert.equal(r.status,200);assert.match(r.data.entry.researchNote,/revised/);
 r=await call({method:'POST',origin:'https://evil.example',body:sample});assert.equal(r.status,403);
 r=await call({method:'POST',body:{...sample,symbol:'NOT VALID!'}});assert.equal(r.status,400);
 r=await call({method:'POST',body:{...sample,researchNote:'buy'}});assert.equal(r.status,400);
 r=await call({method:'POST',body:{action:'remove',symbol:'GUSIM'}});assert.equal(r.status,200);assert.equal(r.data.removed,'GUSIM');
 r=await call();assert.deepEqual(r.data.entries,[]);
 r=await call({token:''});assert.equal(r.status,401);
 state.restricted=true;r=await call();assert.equal(r.status,403);
 state.restricted=false;state.showcase=true;r=await call();assert.equal(r.status,403);
 state.showcase=false;state.paid=true;r=await call();assert.equal(r.status,200);
 assert.equal(state.writes,3,'only authorized add, update and remove should reach database');
 console.log('PASS Free watchlist: real API handler + mocked provider, account isolation, immutable owner, CRUD, source labeling, invalid input and restricted users.');
}finally{globalThis.fetch=prev}
