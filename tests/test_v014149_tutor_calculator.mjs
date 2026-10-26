import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/tutor-calculator.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub',SUPABASE_SECRET_KEY:'secret'};
const old=globalThis.fetch;let allowed=true;
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url)=>{
 const s=String(url);
 if(s.endsWith('/auth/v1/user'))return json({id:uid});
 if(s.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(s.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(s.includes('/admin_user_roles?'))return json([]);
 if(s.includes('/rpc/user_has_tool_access'))return json(allowed);
 throw Error('Unexpected '+s);
};
const req=(data,headers={})=>new Request('https://school.test/api/tutor-calculator',{method:'POST',
 headers:{authorization:'Bearer x','content-type':'application/json',...headers},body:JSON.stringify(data)});
try{
 let r=await onRequest({env,request:req({action:'position',accountEquity:400,riskPercent:1,entry:2,stop:1.9,target:2.2})});
 let data=await r.json();assert.equal(r.status,200);assert.equal(data.shares,40);assert.equal(data.actualRisk,4);
 r=await onRequest({env,request:req({action:'position',accountEquity:400,riskPercent:1,entry:2,stop:2.1})});
 assert.equal(r.status,400);
 r=await onRequest({env,request:req({action:'pnl',entry:2,exit:2.1,shares:40})});
 assert.equal((await r.json()).pnl,4);
 r=await onRequest({env,request:req({action:'position',accountEquity:400,riskPercent:1,entry:2,stop:1.9},{origin:'https://evil.test'})});
 assert.equal(r.status,403);
 allowed=false;r=await onRequest({env,request:req({action:'pnl',entry:2,exit:2.1,shares:40})});
 assert.equal(r.status,403);
 console.log('PASS D09 Tutor deterministic calculator API, authorization, invalid inputs and CSRF');
}finally{globalThis.fetch=old}
