import assert from 'node:assert/strict';
import {getBookCodeAccess} from '../functions/api/lab-content.js';
import {onRequest as context} from '../functions/api/lab-player-context.js';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const oldFetch=globalThis.fetch, user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const s=String(url);
 if(s.endsWith('/auth/v1/user'))return json({id:user});
 if(s.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(s.includes('/admin_user_flags?'))return json([{status:'active'}]);
 // Authenticated Lab content now verifies effective staff/showcase roles before book access.
 if(s.includes('/admin_user_roles?'))return json([]);
 if(s.includes('/user_library?'))return json([{product_code:'FOUNDATION_BOOK_1',expires_at:null}]);
 if(s.includes('/book_key_redemptions?')||s.includes('/user_plan_grants?')||s.includes('/site_subscriptions?'))return json({code:'MISSING_JOIN'},503);
 if(s.includes('/rpc/user_has_tool_access'))return json({code:'PGRST202'},404);
 if(s.includes('/platform_labs?'))return json([{lab_id:'F1-C02-L02',title:'Market structure',book_code:'FOUNDATION_BOOK_1',chapter_number:3,active:true,registry_visible:true,metadata:{what:'Find the relevant participants',why:'Understand the auction',how:['Define the term','Compare alternatives','Check evidence']}}]);
 throw Error('Unexpected DB request '+s);
};
try{
 const request=new Request('https://site.test/api/lab-player-context?id=F1-C02-L02',{headers:{authorization:'Bearer QA.fake'}});
 assert.equal(await getBookCodeAccess(env,request,'FOUNDATION_BOOK_1'),true,'Unrelated absent subscription joins do not break valid book ownership');
 const response=await context({request,env});assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.guidedAllowed,true);
 assert.equal(body.advancedAllowed,false);
 assert.equal(body.lab.id,'F1-C02-L02');
 console.log('PASS entitled book-owner Guided orientation survives missing premium RPC and unrelated subscription joins');
}finally{globalThis.fetch=oldFetch}
