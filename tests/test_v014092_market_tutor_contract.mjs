// v0.14.0.92: isolated, no real DB, no generative model charges.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/market-tutor-v01492.js';
import {tutorTopicsV01492} from '../functions/_lib/tutor-topics-v01492.js';
const publicTopics=JSON.parse(readFileSync(new URL('../data/tutor-index.json',import.meta.url),'utf8'));
assert.deepEqual(tutorTopicsV01492,publicTopics,'Pinned Tutor explanations must match the public companion index');
const env={SUPABASE_URL:'https://test123.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',
 SUPABASE_SECRET_KEY:'sb_secret_synthetic',AI_TUTOR_API_KEY:'optional-key',AI_TUTOR_MODEL:'test-model'};
let authorized=true,accountKind='member',status='active',calls=[],allowModel=false;
const original=globalThis.fetch;
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,opts={})=>{
 const u=String(url);calls.push({url:u,headers:opts.headers,body:opts.body});
 if(u.endsWith('/auth/v1/user'))return json({id:'00000000-0000-4000-8000-000000000001'});
 if(u.includes('/rest/v1/profiles?'))return json([{account_kind:accountKind}]);
 if(u.includes('/rest/v1/admin_user_flags?'))return json([{status}]);
 if(u.includes('/rest/v1/rpc/user_has_tool_access'))return json(authorized);
 if(u.includes('/rest/v1/rpc/v01492_consume_tutor_quota'))return json(false,404); // not installed: no model charges
 if(u.includes('api.openai.com'))throw Error('Model must never be called with no installed quota');
 throw Error('Unexpected backend '+u);
};
const endpoint='https://site.example/api/market-tutor-v01492';
const req=(b,token=true)=>new Request(endpoint,{method:'POST',
 headers:{'content-type':'application/json',...(token?{authorization:'Bearer member-session'}:{})},body:JSON.stringify(b)});
try {
 const first=await onRequest({request:req({question:'What is MAE?'}),env}),d=await first.json();
 assert.equal(first.status,200);assert.equal(d.ok,true);assert.equal(d.graded,false);
 assert.equal(d.masteryAwarded,false);assert.equal(d.generation,'reviewed-glossary-logic');
 assert(d.answer.includes('Maximum Adverse Excursion'));
 assert(d.sources.length>0&&d.sources.every(x=>x.sourceId));
 assert(d.links.journal.includes('journal'));
 assert.equal(calls.filter(x=>x.url.includes('api.openai.com')).length,0);
 const authHeader=calls.find(x=>x.url.includes('/rest/v1/profiles?'))?.headers;
 assert.equal(authHeader.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(authHeader.authorization,undefined,'Modern sb_secret must not be passed as Bearer');
 let r=await onRequest({request:req({question:'What is MAE?'},false),env});assert.equal(r.status,401);
 authorized=false;r=await onRequest({request:req({question:'What is MAE?'}),env});assert.equal(r.status,403);
 authorized=true;accountKind='showcase';r=await onRequest({request:req({question:'What is MAE?'}),env});assert.equal(r.status,403);
 accountKind='member';status='restricted';r=await onRequest({request:req({question:'What is MAE?'}),env});assert.equal(r.status,403);status='active';
 r=await onRequest({request:req({question:'Should I buy AAPL now?'}),env});const investment=await r.json();
 assert.equal(investment.generation,'reviewed-glossary-logic');assert(investment.answer.includes('cannot select a security'));
 r=await onRequest({request:req({question:'What is MAE?',mode:'question'}),env});const teaching=await r.json();
 assert.equal(teaching.graded,false);assert(teaching.answer.includes('Self-check'));
 r=await onRequest({request:req({question:'a'.repeat(451)}),env});assert.equal(r.status,400);
 r=await onRequest({request:new Request(endpoint,{method:'GET',headers:{authorization:'Bearer x'}}),env});assert.equal(r.status,405);
 assert.equal(calls.filter(x=>x.url.includes('api.openai.com')).length,0);
 console.log('PASS Tutor: 22-topic parity, server-only access, no Showcase, no charge without atomic quota, ungraded modes and financial-advice restraint.');
}finally{globalThis.fetch=original}
