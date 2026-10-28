// Public registry: 419 canonical entries may be discoverable but unreleased Labs
// must not show a Start action, grant self-tracked credit or leak grading keys.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/lab-release-availability.js';
const old=globalThis.fetch;
const fixture={
 platform_labs:[
  {lab_id:'F1-C02-L01',active:true,registry_visible:true},
  {lab_id:'F1-C02-L02',active:true,registry_visible:true},
  {lab_id:'F2-C01-L01',active:false,registry_visible:true},
  {lab_id:'F2-C02-L01',active:true,registry_visible:false}
 ],
 lab_instruction_v014:[{lab_id:'F1-C02-L01',source_status:'editorially_reviewed_v1',reviewed_by:'reviewer-fixture',reviewed_at:'2026-10-26T07:00:00Z'},{lab_id:'F2-C01-L01',source_status:'editorially_reviewed_v1'},{lab_id:'F2-C02-L01',source_status:'editorially_reviewed_v1'}],
 lab_training_sets_v014:[
  {lab_id:'F1-C02-L01',review_state:'reviewed',reviewed_by:'owner',reviewed_at:'2026-10-26'},
  {lab_id:'F1-C02-L02',review_state:'reviewed',reviewed_by:'owner',reviewed_at:'2026-10-26'},
  {lab_id:'F2-C01-L01',review_state:'reviewed',reviewed_by:'owner',reviewed_at:'2026-10-26'},
  {lab_id:'F2-C02-L01',review_state:'reviewed',reviewed_by:'owner',reviewed_at:'2026-10-26'}
 ]
};
const q=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const env={SUPABASE_URL:'https://supabase.fixture',SUPABASE_SECRET_KEY:'server-secret'};
try{
 globalThis.fetch=async(url,init)=>{
  const u=new URL(url),table=u.pathname.split('/').at(-1);
  assert.equal(init.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(init.cache,'no-store');
  assert(!u.searchParams.get('select').includes('answer_key'),'Never retrieve protected grading answers');
  if(!fixture[table])throw Error('Unexpected backend table '+table);
  return q(fixture[table]);
 };
 let r=await onRequest({request:new Request('https://site.test/api/lab-release-availability'),env});
 assert.equal(r.status,200);
 const body=await r.json();
 assert.deepEqual(body.publishedIds,['F1-C02-L01'],'Require registry+private lesson+reviewed rubric');
 assert.equal(body.guidedBetaTestingOpen,false,'Without source-qualified teaching there is no Guided candidate in this fixture');
 assert.equal(body.betaReadyCertified,false);
 assert(!JSON.stringify(body).includes('answer_key'));
 r=await onRequest({request:new Request('https://site.test/api/lab-release-availability',{method:'POST'}),env});
 assert.equal(r.status,405);
 globalThis.fetch=async()=>q([],503);
 r=await onRequest({request:new Request('https://site.test/api/lab-release-availability'),env});
 assert.equal(r.status,503,'Unavailable verification must fail closed');
 const client=readFileSync('assets/js/labs.js','utf8');
 for(const term of ['publishedAssessments.has(x.id)','availabilityVerified','Upcoming — no Start action or grade is available.',
  '!publishedAssessments.has(labId)','/api/lab-release-availability','cache:\'no-store\'']){
  assert(client.includes(term),'Client fail-closed control missing: '+term);
 }
 console.log('PASS Canonical Lab registry: published-only Start and progress; private-source exclusion; unavailable fails closed.');
}finally{globalThis.fetch=old}
