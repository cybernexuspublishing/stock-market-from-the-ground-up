'use strict';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const src=readFileSync(new URL('functions/api/admin-accounts-v01353.js',root),'utf8');
const ui=readFileSync(new URL('assets/js/account-management-entitlements-v01478.js',root),'utf8');
const sourceSQL=readFileSync(new URL('supabase/migrations/v0.14.0.78_SOURCE_AWARE_ACCOUNT_REVOKE_REVIEW_REQUIRED.sql',root),'utf8');
const legacyAdmin=readFileSync(new URL('functions/api/admin.js',root),'utf8');
const legacyUI=readFileSync(new URL('assets/js/admin.js',root),'utf8');
const legacyAccess=readFileSync(new URL('functions/api/admin-access-v01355.js',root),'utf8');
const legacyAccessUI=readFileSync(new URL('assets/js/accounts-access.js',root),'utf8');
const html=readFileSync(new URL('admin.html',root),'utf8');
const operations=readFileSync(new URL('assets/js/admin-operations.js',root),'utf8');
const app=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const member='33333333-3333-4333-8333-333333333333',admin='22222222-2222-4222-8222-222222222222';
let role='ADMIN',targetRole='',calls=[],dbGrants=[{id:7,plan_code:'FULL_MONTHLY',status:'active',source:'stripe_zero_monthly_qa_v72',ends_at:'2099-01-01T00:00:00Z'}];
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',GU72_QA_ALLOWED_USER_ID:member};
const J=(x={},code=200)=>new Response(JSON.stringify(x),{status:code,headers:{'content-type':'application/json'}});
const orig=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
 calls.push({u,method,body});
 if(u.includes('/auth/v1/user'))return J({id:admin,confirmed_at:'2026-10-18T11:00:00Z'});
 if(u.includes('/auth/v1/admin/users/'))return J({user:{id:member,email:'test@demo.example',email_confirmed_at:'2026-10-18T11:00:00Z'}});
 if(u.includes('/rest/v1/profiles?'))return J([u.includes('id=eq.'+admin)?{id:admin,account_kind:'member'}:{id:member,account_kind:'member',username:'qa_member',display_name:'qa_member',first_name:'QA',last_name:'Member'}]);
 if(u.includes('/rest/v1/admin_user_roles?'))return J(u.includes('user_id=eq.'+admin)?[{role_code:role,expires_at:null}]:targetRole?[{role_code:targetRole,expires_at:null}]:[]);
 if(u.includes('/rest/v1/test_account_profiles?'))return J([]);
 if(u.includes('/rest/v1/account_private_identity?'))return J([{date_of_birth:'1990-01-01'}]);
 if(u.includes('/rest/v1/admin_user_flags?'))return J([]);
 if(u.includes('/rest/v1/admin_user_notes?'))return J([]);
 if(u.includes('/rest/v1/user_plan_grants?'))return J(dbGrants);
 if(u.includes('/rest/v1/site_subscriptions?'))return J([{id:9,plan_code:'FULL_MONTHLY',provider:'STRIPE_MANAGED',status:'canceled',provider_subscription_id:'sub_123',current_period_end:null}]);
 if(u.includes('/rest/v1/user_library?'))return J([{id:12,product_code:'FOUNDATIONS_I',access_type:'companion',source_channel:'admin',expires_at:null}]);
 if(u.includes('/rest/v1/user_tool_passes?'))return J([{id:16,tool_code:'MARKET_TUTOR',status:'active',provider:null,provider_subscription_id:null,metadata:{admin_manual:true}}]);
 if(u.includes('/rest/v1/book_key_redemptions?'))return J([{id:21,book_code:'FOUNDATIONS_I',starts_at:'2026-01-01',ends_at:'2027-01-01'}]);
 if(u.includes('/rest/v1/entitlements?'))return J([{id:81,product_key:'full_learning_access',status:'active',source:'admin',ends_at:null,external_customer_id:null,external_subscription_id:null}]);
 if(u.includes('/rest/v1/site_orders?'))return J([{id:29,provider:'stripe',status:'paid',total_cents:6999}]);
 if(u.includes('/rest/v1/catalog_products?'))return J([{product_code:'FOUNDATIONS_I',short_title:'Foundations I'}]);
 if(u.includes('/rest/v1/platform_tools?'))return J([{tool_code:'MARKET_TUTOR',name:'Market Tutor'}]);
 if(u.includes('/rest/v1/rpc/my_platform_access_for_user'))return J({planCode:'FULL_MONTHLY'});
 if(u.includes('/rest/v1/rpc/gu78_admin_account_resource_revoke')){
   assert.equal(method,'POST');
   assert.equal(body.p_actor,admin);assert.equal(body.p_target,member);
   return J({ok:true,revoked:true,kind:body.p_kind,recordId:body.p_record_id,targetUser:member,source:'admin_book'});
 }
 if(u.includes('/rest/v1/rpc/gu78_admin_account_resource_grant')){
   assert.equal(method,'POST');
   assert.equal(body.p_actor,admin);assert.equal(body.p_target,member);
   return J({ok:true,granted:true,kind:body.p_kind,recordId:57,targetUser:member,code:body.p_code});
 }
 throw Error('Unexpected mocked backend '+method+' '+u);
};
const request=(action,body=null)=>{
 const url='https://stock-market-from-the-ground-up.pages.dev/api/admin-accounts-v01353?action='+action+
   (action==='detail'?'&id='+member:'');
 return new Request(url,{method:body?'POST':'GET',
 headers:{authorization:'Bearer admin_test',...(body?{'content-type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
};
try{
 let r=await app.onRequest({request:request('detail'),env}),d=await r.json();
 assert.equal(r.status,200,JSON.stringify(d));
 assert.equal(d.permissions.owner,false,'Administrator can review a regular member');
 assert.equal(d.inventory.grants[0].source,'stripe_zero_monthly_qa_v72');
 assert.equal(d.inventory.subscriptions[0].provider,'STRIPE_MANAGED');
 assert.equal(d.inventory.books[0].source_channel,'admin');
 assert.equal(d.inventory.tools[0].metadata.admin_manual,true);
 assert.equal(d.inventory.bookKeys.length,1);assert.equal(d.inventory.legacyLearning[0].product_key,'full_learning_access');assert.equal(d.inventory.orders.length,1);
 assert.equal(d.effectiveAccess.planCode,'FULL_MONTHLY');
 r=await app.onRequest({request:request('revoke_resource',{userId:member,kind:'manual_book',recordId:12,reason:'Owner-approved access cleanup'}),env});
 d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(d.revoked,true);
 assert.equal(d.effectivePlan,'FULL_MONTHLY','Revoking a book does not claim that membership became FREE');
 assert.equal(calls.filter(x=>x.u.includes('gu78_admin_account_resource_revoke')).length,1);
 r=await app.onRequest({request:request('grant_resource',{userId:member,kind:'manual_tool',code:'MARKET_TUTOR',reason:'Owner-approved additional training'}),env});
 d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(d.granted,true);
 targetRole='OWNER';
 r=await app.onRequest({request:request('detail'),env});assert.equal(r.status,403,'ADMIN cannot view/manage OWNER');
 r=await app.onRequest({request:request('revoke_resource',{userId:member,kind:'manual_book',recordId:12,reason:'Owner-approved access cleanup'}),env});
 assert.equal(r.status,403,'ADMIN cannot modify OWNER entitlements');
 assert.equal(calls.filter(x=>x.u.includes('gu78_admin_account_resource_revoke')).length,1);
 targetRole='';role='MEMBER';
 r=await app.onRequest({request:request('detail'),env});assert.equal(r.status,403,'Ordinary member denied');
 assert.ok(html.includes('account-management-entitlements-v01478.js'));
 assert.ok(operations.includes('window.GroundUpAccountItems?.mount'),'Unified inventory mounted into Manage Account editor');
 assert.ok(ui.includes('Book Key redemption history')&&ui.includes('Order and payment audit history'));
 assert.ok(ui.includes('Subscriptions and billing status')&&ui.includes('Membership grants'));
 for(const source of ['admin','owner_manual'])assert.ok(sourceSQL.includes(source));
 assert.ok(src.includes('stripe_zero_monthly_qa_v72'),'Existing QA grants must be separately identified, not treated as manual rights');
 assert.ok(src.includes("['book_key_redemptions','id']")&&src.includes("['user_plan_grants','id']"),'Deletion must not orphan real Stripe QA or Book Key access history');
 assert.ok(sourceSQL.includes('auth.role() IS DISTINCT FROM \'service_role\''));
 assert.ok(sourceSQL.includes('p_actor')&&sourceSQL.includes('p_target'));
 assert.ok(sourceSQL.includes('GU78_NOT_OWNED_ACTIVE_MANUAL_RESOURCE'));
 assert.ok(sourceSQL.includes('provider_subscription_id IS NULL'));
 assert.ok(sourceSQL.includes('source_channel=\'admin\''));
 assert.ok(sourceSQL.includes('admin_audit_log'));
 assert.ok(sourceSQL.includes("manual_learning")&&sourceSQL.includes("status='cancelled'"),'Legacy learning grants must use the exact Postgres status value');
 assert.ok(sourceSQL.includes("e.external_subscription_id IS NULL"),'Provider legacy learning rights never use manual revocation');
 assert.equal((sourceSQL.match(/COMMIT;/g)||[]).length,1,'SQL transaction must contain exactly one commit');
 assert.ok(sourceSQL.includes("p_code !~ ")&&sourceSQL.includes("2,90}")&&sourceSQL.includes("COMMIT;"),"Code validation and transaction present");
 assert.ok(!/DELETE FROM public\.(site_orders|site_subscriptions|book_key_redemptions)/i.test(sourceSQL));
 assert.ok(!/UPDATE public\.site_subscriptions/i.test(sourceSQL));
 assert.ok(legacyAdmin.includes("if(retired.has(action))"),'Legacy API must intercept legacy account mutations before their old handlers');
 for(const unsafe of ['library_revoke','entitlement_revoke','plan_revoke','tool_revoke','library_grant',
   'entitlement_grant','plan_grant','tool_grant','user_delete','set_role'])
   assert.ok(legacyAdmin.includes("'"+unsafe+"'"),'Missing blocked legacy mutation: '+unsafe);
 assert.ok(legacyUI.includes('window.GroundUpAccountEditor?.openById'),'Legacy UI must route to new unified editor');
 assert.ok(legacyAccess.includes('Legacy grant/revoke action moved to Account Management'),'Legacy Access Center cannot bypass canonical mutation');
 assert.ok(legacyAccessUI.includes('Owner-issued manual entitlements only.')===false,'Old Access Center must not offer a competing manual grant editor');
 assert.ok(legacyAccessUI.includes('window.GroundUpAccountEditor?.openById'),'Account Access Hub must route member actions to unified account editor');
 assert.ok(ui.includes('Legacy learning entitlements'));
 console.log('PASS v78: Admin member-only scoping, unified account inventory, source-aware grant/revoke, no false FREE, provider/financial ledger invariants');
}finally{globalThis.fetch=orig}
