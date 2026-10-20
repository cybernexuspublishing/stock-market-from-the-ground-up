// v117 — refuse the original v96 seed rubric until a topic question exists.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/training-editor.js';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const register=src('docs/419_LAB_TOPIC_ALIGNMENT_REVIEW_v014117.csv').trim().split(/\r?\n/);
assert.equal(register.length,420);
assert.equal(new Set(register.slice(1).map(r=>r.split(',')[0])).size,419);
assert(register.some(r=>r.includes('F1-C07-L02')));
assert(src('assets/js/training-editor.js').includes('TOPIC-SPECIFIC QUESTION REQUIRED'));
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SECRET_KEY:'secret'};
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let owner=true,approved=0,questions=[
 {id:'EVIDENCE',kind:'choice',prompt:'First observation evidence question',explanation:'Observed evidence only.',options:['One','Two']},
 {id:'FOCUS',kind:'choice',prompt:'First observation focus question',explanation:'Focus on what is observable.',options:['One','Two']},
 {id:'ORIGINAL_MATH',kind:'number',prompt:'Observed price range arithmetic',explanation:'Price range is high minus low.',tolerance:0},
 {id:'BOUNDARY',kind:'choice',prompt:'Decision boundary question',explanation:'Commit before the next bar.',options:['One','Two']}
];
const baseKeys={EVIDENCE:'One',FOCUS:'One',ORIGINAL_MATH:50,BOUNDARY:'One'};
const original=globalThis.fetch;
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,init={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_roles?'))return json(owner?[{role_code:'OWNER',expires_at:null}]:[]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/lab_training_sets_v014?')&&init.method==='PATCH'){approved++;return json([{lab_id:'F1-C07-L02',version:96}])}
 if(u.includes('/lab_training_sets_v014?'))return json([{
  lab_id:'F1-C07-L02',version:96,review_state:'draft',
  source_status:'original_hypothetical_unreviewed_v01496',questions,
  answer_key:{...baseKeys,...(questions.length===5?{ETF_INDEX_APPLICATION:'One'}:{})}
 }]);
 throw Error('Unexpected API call '+u);
};
const run=()=>onRequest({env,request:new Request('https://site.test/api/training-editor?action=review',{
 method:'POST',headers:{authorization:'Bearer test',origin:'https://site.test','content-type':'application/json'},
 body:JSON.stringify({labId:'F1-C07-L02',title:'ETF Versus Index',version:96,confirmPhrase:'REVIEW BOOK RUBRIC'})
})});
try{
 let r=await run();assert.equal(r.status,409);assert.equal(approved,0);
 questions=[...questions,{id:'ETF_INDEX_APPLICATION',kind:'choice',
 prompt:'An index is a calculated benchmark while a listed ETF is an exchange-traded fund whose shares represent exposure to assets. Which response distinguishes them?',
 explanation:'A benchmark index is calculated using its defined rules; investors cannot directly buy the index. ETFs issue tradable fund shares, hold or replicate asset exposures, and can have expense ratios and tracking differences.',
 options:['One','Two']}];
 r=await run();assert.equal(r.status,200);assert.equal(approved,1);
 owner=false;r=await run();assert.equal(r.status,403);assert.equal(approved,1);
}finally{globalThis.fetch=original}
console.log('PASS v117: 419 canonical candidate register, unamended v96 approval denied, added topic question and Owner ACL required.');
