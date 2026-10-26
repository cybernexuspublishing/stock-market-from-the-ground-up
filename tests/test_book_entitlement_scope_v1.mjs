/* Entitlement isolation regression for library and book-derived teaching.
 * Executes the production resolver with mocked GoTrue/PostgREST. No member
 * accounts, payment processor, live database, or real book files are accessed.
 */
import assert from 'node:assert/strict';
import {getBookCodeAccess} from '../functions/api/lab-content.js';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const u1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',u2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const state={deleted:false,restricted:false,showcase:false,free:true,direct:false,redeemed:false,plan:false,expired:false,owner:false,queries:[]};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
const old=globalThis.fetch;
globalThis.fetch=async(input,opts={})=>{
 const url=new URL(input),path=url.pathname,q=url.searchParams;
 state.queries.push(path);
 if(path==='/auth/v1/user')return json({id:opts.headers.authorization==='Bearer memberB'?u2:u1});
 if(path==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:state.deleted?'2026-10-01T00:00:00Z':null}]);
 if(path==='/rest/v1/admin_user_flags')return json(state.restricted?[{status:'restricted'}]:[]);
 if(path==='/rest/v1/admin_user_roles')return json(state.showcase?[{role_code:'SHOWCASE_VIEWER',expires_at:null}]:state.owner?[{role_code:'OWNER',expires_at:null}]:[]);
 if(path==='/rest/v1/user_library')return json(state.direct&&q.get('user_id')==='eq.'+u1?[{product_code:'FOUNDATION_BOOK_1',expires_at:null}]:[]);
 if(path==='/rest/v1/book_key_redemptions')return json(state.redeemed?[{book_code:'FOUNDATION_BOOK_1',starts_at:'2026-01-01T00:00:00Z',ends_at:null}]:[]);
 if(path==='/rest/v1/user_plan_grants')return json(state.plan?[{plan_code:'FULL_MONTHLY',status:'active',starts_at:state.expired?'2025-01-01T00:00:00Z':'2026-01-01T00:00:00Z',ends_at:state.expired?'2025-02-01T00:00:00Z':'2030-01-01T00:00:00Z',platform_plans:{includes_all_books:true}}]:[]);
 if(path==='/rest/v1/site_subscriptions')return json([]);
 throw new Error('Unexpected private book entitlement URL '+path);
};
const call=(token='memberA')=>getBookCodeAccess(env,new Request('https://fixture.example/api/lab-content',{headers:{authorization:'Bearer '+token}}),'FOUNDATION_BOOK_1');
function reset(){Object.assign(state,{deleted:false,restricted:false,showcase:false,free:true,direct:false,redeemed:false,plan:false,expired:false,owner:false,queries:[]})}
try{
 reset();assert.equal(await call(),false,'Free account without book purchase cannot open an unrelated paid book');
 reset();state.direct=true;assert.equal(await call(),true,'A separately purchased book remains accessible');
 assert.equal(await call('memberB'),false,'Book owned by another member must not be inherited');
 reset();state.redeemed=true;assert.equal(await call(),true,'Current independent key redemption can grant its matching book');
 reset();state.plan=true;assert.equal(await call(),true,'Valid full paid membership includes its approved books');
 reset();state.plan=true;state.expired=true;assert.equal(await call(),false,'Expired paid plan cannot grant books');
 reset();state.direct=true;state.deleted=true;assert.equal(await call(),false,'Deleted member cannot retain direct premium book access');
 assert(!state.queries.includes('/rest/v1/user_library'),'Deleted account rejected before private book lookup');
 reset();state.direct=true;state.restricted=true;assert.equal(await call(),false,'Restricted account cannot bypass book restrictions');
 reset();state.direct=true;state.showcase=true;assert.equal(await call(),false,'Showcase role cannot inherit even a direct book entitlement');
 assert(!state.queries.includes('/rest/v1/user_library'),'Showcase rejected before private book lookup');
 reset();state.owner=true;assert.equal(await call(),true,'Owner administration exception unchanged');
 console.log('PASS book rights: Free denied; direct purchase, redemption and valid full grants honored; other member, expired, deleted, restricted and Showcase denied.');
}finally{globalThis.fetch=old}
