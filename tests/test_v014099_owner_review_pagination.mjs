import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/training-editor.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const fixture=Array.from({length:741},(_,i)=>({lab_id:'TEST-'+String(i).padStart(3,'0'),version:96,title:'Generated owner-only summary '+i,
 review_state:'draft',source_status:'original_hypothetical_unreviewed_v01496',
 reviewed_at:null,updated_at:'2026-10-19T00:00:00Z'}));
let kind='member',role='OWNER',forceCap=false,pages=[];
const old=globalThis.fetch,send=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (u,o={})=>{
 const url=String(u);
 if(url.endsWith('/auth/v1/user'))return send({id:uid});
 if(url.includes('/profiles?'))return send([{account_kind:kind}]);
 if(url.includes('/admin_user_roles?'))return send([{role_code:role,expires_at:null}]);
 if(url.includes('/lab_training_sets_v014?')){
  assert.equal(o.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(o.headers.authorization,undefined,'Owner editor must never misuse opaque Supabase secret');
  const offset=Number(/offset=(\d+)/.exec(url)?.[1]||'0');
  const limit=Number(/limit=(\d+)/.exec(url)?.[1]||'0');
  pages.push({offset,limit});
  assert.equal(limit,500);
  const result=forceCap?Array.from({length:500},(_,i)=>fixture[(i+offset)%fixture.length]):fixture.slice(offset,offset+limit);
  return send(result);
 }
 throw Error('Unexpected mock route '+url);
};
const call=async()=>{const resp=await onRequest({request:new Request('https://school.example/api/training-editor?action=list',{headers:{authorization:'Bearer owner'}}),env});return [resp.status,await resp.json()]};
try{
 let [status,body]=await call();
 assert.equal(status,200);assert.equal(body.allVersionsIncluded,true);
 assert.equal(body.sets.length,741);
 assert.deepEqual(pages,[{offset:0,limit:500},{offset:500,limit:500}]);
 assert(!JSON.stringify(body).includes('answer_key'));
 role='ADMIN';pages=[];
 [status]=await call();assert.equal(status,403);assert.equal(pages.length,0);
 role='OWNER';kind='showcase';[status]=await call();assert.equal(status,403);
 kind='member';forceCap=true;pages=[];
 [status,body]=await call();assert.equal(status,503,'Fail closed after 5000+ rows, never silently claim complete Owner inventory');
 assert(pages.length>=10);
 const sql=readFileSync(new URL('../supabase/admin/v0.14.0.99_419_LAB_AND_30_SKILLS_ACCEPTANCE_READ_ONLY.sql',import.meta.url),'utf8');
 for(const token of ['BEGIN READ ONLY','419','30','original_synthetic','historical_evidence_verified',
 'invalid_bar_values','nonchronological_observations','missing_indices','lab_training_sets_v014','ROLLBACK'])
 assert(sql.includes(token),'Owner diagnostic is missing invariant '+token);
 assert(!/CREATE TABLE|DROP TABLE|INSERT INTO|DELETE FROM public/i.test(sql),'Owner postflight must stay read-only');
 console.log('PASS v99: all Owner rubric versions through deterministic pagination, no public answers, fail closed on truncation, Owner/Showcase rights, comprehensive private 419/30 acceptance inspection.');
}finally{globalThis.fetch=old}
