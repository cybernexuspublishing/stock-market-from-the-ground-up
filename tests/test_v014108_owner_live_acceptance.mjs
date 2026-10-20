import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownerAcceptanceSnapshot} from '../functions/_lib/owner-acceptance-v014108.js';
import {onRequest} from '../functions/api/owner-roadmap.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock'};
const original=globalThis.fetch,requests=[];
let role='OWNER',broken=false;
const json=(x,status=200,headers={})=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json',...headers}});
globalThis.fetch=async (url,opts={})=>{
 const path=String(url);requests.push({path,opts});
 if(path.endsWith('/auth/v1/user'))return json({id:uid});
 if(path.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(path.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(path.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(path.includes('/gu_member_tutor_exchanges_v014102?'))return json([{id:'hidden'}],200,{'content-range':'0-0/0'});
 if(path.includes('/gu_ai_service_requests_v014103?'))return json([{id:42}],200,{'content-range':'0-0/17'});
 if(path.includes('/gu_lab_competency_knowledge_map_v014105?'))return broken?
  json({message:'missing table'},404):json([{lab_id:'ignored'}],200,{'content-range':'0-0/419'});
 if(path.includes('/gu_tutor_rate_bucket_v014107?'))return json({error:'not installed'},404);
 if(path.includes('/competency_evidence?'))return json([],200,{'content-range':'*/0'});
 throw Error('Unexpected source '+path);
};
const request=()=>new Request('https://example.org/api/owner-roadmap?action=platform-acceptance-v014108',
 {headers:{authorization:'Bearer owner-mock'}});
try{
 let r=await onRequest({env,request:request()}),body=await r.json();
 assert.equal(r.status,200);
 assert.equal(body.acceptance.verified,false,'Absent v107 must not masquerade as installed');
 assert.equal(body.acceptance.labMappingCountVerified,true,'419 source candidates are not automatically approved');
 assert.equal(body.acceptance.v105ReviewAccepted,false);
 assert.equal(body.acceptance.liveAiProviderTestVerified,false);
 assert.equal(body.acceptance.liveCustomerPurchaseTestVerified,false);
 assert.equal(body.acceptance.privacyRetentionPolicyVerified,false);
 assert(body.acceptance.checks.some(x=>x.code==='v103_paid_ai_request_ledger'&&x.rowCount===17));
 assert(!JSON.stringify(body).includes(uid));
 assert(!JSON.stringify(body).includes('sb_secret_mock'));
 assert(requests.every(x=>!x.path.includes('answer_key')&&!x.path.includes('select=*')&&!x.path.includes('journal')));
 for(const x of requests.filter(x=>x.path.includes('/rest/v1/'))){
  assert.equal(x.opts.headers.authorization,undefined,'Opaque secret is not a bearer token');
  assert.equal(x.opts.headers.apikey,env.SUPABASE_SECRET_KEY);
 }
 const count=requests.filter(x=>x.path.includes('gu_member_tutor_exchanges')).length;
 role='ADMIN';r=await onRequest({env,request:request()});assert.equal(r.status,403);
 assert.equal(requests.filter(x=>x.path.includes('gu_member_tutor_exchanges')).length,count,
  'Non-owner cannot request private aggregate diagnostic');
 role='OWNER';broken=true;r=await onRequest({env,request:request()});body=await r.json();
 assert.equal(body.acceptance.labMappingCountVerified,false);
 assert(body.acceptance.checks.find(x=>x.code==='v105_candidate_lab_mappings').rowCount===null);
 const html=readFileSync(new URL('../owner-roadmap.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../assets/js/owner-roadmap-product-readiness-v01491.js',import.meta.url),'utf8');
 assert(html.includes('or-live-acceptance-load')&&js.includes('loadOwnerSiteAcceptance()'));
 console.log('PASS v108: Owner-only live installation audit, no member data, fail-closed absent schema, 419 candidate count without fictitious acceptance.');
}finally{globalThis.fetch=original}
